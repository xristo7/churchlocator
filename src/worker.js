import { ApiError, readJson, validateMutationOrigin, enforceRateLimit, securityHeaders } from "./security.js";
import { handleIdentityApi, modernPassword, environmentPassword, PASSWORD_PREFIX, mfaChallenge, throttleAccount } from './identity-security.js';
import { handlePlatformApi, isOwner } from './trusted-platform.js';
import { handleSpotlightApi } from './spotlight.js';

const apiHeaders = {
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    ...apiHeaders,
    ...securityHeaders
  }
});

const unauthorized = () => json({ ok: false, error: "unauthorized" }, 401);
const storageUnavailable = () => json({
  ok: false,
  error: "storage unavailable",
  message: "The database binding is not configured for this environment."
}, 503);
const mediaUnavailable = () => json({
  ok: false,
  error: "media storage unavailable",
  message: "Image uploads are not configured for this environment."
}, 503);

const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
const imageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

function detectedImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) return "image/gif";
  return null;
}

async function handleImageUpload(request, env) {
  if (!env.MEDIA) return mediaUnavailable();
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const contentType = request.headers.get("content-type") || "";
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (!contentType.startsWith("multipart/form-data")) throw new ApiError(415, "Choose an image from your device.");
  if (Number.isFinite(declaredSize) && declaredSize > MAX_IMAGE_UPLOAD_BYTES + 128 * 1024) throw new ApiError(413, "Choose an image smaller than 5 MB.");

  const form = await request.formData();
  const purpose = String(form.get("purpose") || "");
  const profileUpload = purpose === "profile";
  if (!profileUpload && !user.is_creator && !await isOwner(env, user)) return json({ ok: false, error: "Creator account required." }, 403);
  const image = form.get("image");
  if (!image || typeof image !== "object" || typeof image.arrayBuffer !== "function") throw new ApiError(400, "Choose an image from your device.");
  if (image.size < 1 || image.size > MAX_IMAGE_UPLOAD_BYTES) throw new ApiError(413, "Choose an image smaller than 5 MB.");

  const bytes = new Uint8Array(await image.arrayBuffer());
  const type = detectedImageType(bytes);
  if (!type || !imageTypes[type]) throw new ApiError(400, "Use a JPG, PNG, WebP, or GIF image.");

  const key = `${profileUpload ? "member-avatars" : "creator-media"}/${crypto.randomUUID()}.${imageTypes[type]}`;
  await env.MEDIA.put(key, bytes, {
    httpMetadata: {
      contentType: type,
      cacheControl: "public, max-age=31536000, immutable"
    }
  });
  return json({ ok: true, url: `/media/${key}` }, 201);
}

async function handleMediaRequest(request, env) {
  if (!env.MEDIA) return new Response("Media storage unavailable", { status: 503, headers: securityHeaders });
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD", ...securityHeaders } });
  const key = new URL(request.url).pathname.slice("/media/".length);
  if (!/^(creator-media|member-avatars)\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(key)) return new Response("Not found", { status: 404, headers: securityHeaders });
  const object = request.method === "HEAD" ? await env.MEDIA.head(key) : await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404, headers: securityHeaders });
  const headers = new Headers({
    "content-type": object.httpMetadata?.contentType || "application/octet-stream",
    "cache-control": object.httpMetadata?.cacheControl || "public, max-age=31536000, immutable",
    "etag": object.httpEtag,
    ...securityHeaders
  });
  if (object.size !== undefined) headers.set("content-length", String(object.size));
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}

function constantTimeEqual(left, right) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(String(left || ""));
  const rightBytes = encoder.encode(String(right || ""));
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }

  return difference === 0;
}

function isAuthorized(request, env) {
  if (!env.ADMIN_API_TOKEN) return false;
  return constantTimeEqual(
    request.headers.get("authorization"),
    `Bearer ${env.ADMIN_API_TOKEN}`
  );
}

function slugify(text) {
  return String(text || "church")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function registrationCode() {
  return `REG-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

// --- Authentication -------------------------------------------------------

const SESSION_COOKIE = "mwe_session_v2";
const GOOGLE_OAUTH_STATE_COOKIE = "mwe_google_oauth_state";
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours; old bypass-era cookies are never accepted
const GOOGLE_OAUTH_STATE_TTL_SECONDS = 10 * 60;
const PBKDF2_ITERATIONS = 100000;

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function randomToken(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return toBase64(bytes).replace(/[+/=]/g, char => ({ "+": "-", "/": "_", "=": "" }[char]));
}

async function hashPassword(password, saltBase64) {
  const encoder = new TextEncoder();
  const salt = fromBase64(saltBase64);
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toBase64(new Uint8Array(bits));
}

async function hashNewPassword(password,env) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = toBase64(saltBytes);
  const hash = await environmentPassword(password, salt,env);
  return { salt, hash };
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  const cookies = {};
  header.split(";").forEach(part => {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 0) return;
    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (!key) return;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  });
  return cookies;
}

function isSecureRequest(request) {
  // Only mark the cookie Secure when actually served over https, so it still
  // works with `wrangler dev`'s plain-http local server.
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return true;
  }
}

function sessionCookieHeader(request, token, maxAgeSeconds) {
  const attrs = [`${SESSION_COOKIE}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAgeSeconds}`];
  if (isSecureRequest(request)) attrs.push("Secure");
  return attrs.join("; ");
}

function clearSessionCookieHeader(request) {
  const attrs = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (isSecureRequest(request)) attrs.push("Secure");
  return attrs.join("; ");
}

function oauthStateCookieHeader(request, value, maxAgeSeconds) {
  const attrs = [`${GOOGLE_OAUTH_STATE_COOKIE}=${encodeURIComponent(value)}`, "Path=/api/auth/google", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAgeSeconds}`];
  if (isSecureRequest(request)) attrs.push("Secure");
  return attrs.join("; ");
}

function safeReturnPath(value) {
  const path = String(value || "/");
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

function redirectWithCookies(location, cookies = []) {
  const headers = new Headers({ location, ...securityHeaders, "cache-control": "no-store" });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function jsonWithCookie(body, status, cookieValue) {
  const res = json(body, status);
  res.headers.append("set-cookie", cookieValue);
  return res;
}

async function digestToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return "v2:" + toBase64(new Uint8Array(digest));
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url || "",
    isCreator: Boolean(row.is_creator),
    emailVerified: Boolean(row.email_verified_at),
    mfaEnabled: Boolean(row.totp_secret_encrypted),
    hasPassword: Boolean(row.password_hash && row.password_hash !== "authentication-disabled")
  };
}

async function createSession(env, userId, mfaVerified = false) {
  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  await env.DB.prepare(`
    insert into sessions (token, user_id, created_at, expires_at, mfa_verified_at)
    values (?, ?, ?, ?, ?)
  `).bind(await digestToken(token), userId, now.toISOString(), expires.toISOString(), mfaVerified ? now.toISOString() : null).run();
  return token;
}

async function getSessionUser(request, env) {
  if (!env.DB) return null;
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;

  const row = await env.DB.prepare(`
    select u.id, u.name, u.email, u.avatar_url, u.password_hash, u.password_salt, u.is_creator, s.expires_at, s.created_at as session_created_at,
      s.mfa_verified_at, u.email_verified_at, u.totp_secret_encrypted, u.totp_pending_encrypted, u.totp_last_step
    from sessions s
    join users u on u.id = s.user_id
    where s.token = ?
  `).bind(await digestToken(token)).first();

  if (!row) return null;
  if (!Number.isFinite(Date.parse(row.expires_at)) || Date.parse(row.expires_at) <= Date.now() || row.id.startsWith("temporary:")) {
    await env.DB.prepare("delete from sessions where token = ?").bind(await digestToken(token)).run();
    return null;
  }

  return row;
}

async function registerUser(request, env) {
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  const name = String(payload?.name || "").trim();
  const email = normalizeEmail(payload?.email);
  const password = String(payload?.password || "");

  if (!name || name.length > 200) return json({ ok: false, error: "Enter your full name." }, 400);
  if (!isValidEmail(email)) return json({ ok: false, error: "Enter a valid email address." }, 400);
  if (password.length < 15 || password.length > 128) return json({ ok: false, error: "Password must be between 15 and 128 characters." }, 400);

  const existing = await env.DB.prepare("select id from users where email = ?").bind(email).first();
  if (existing) {
    return json({ ok: false, error: "An account with that email already exists. Sign in instead." }, 409);
  }

  const id = `local:${email}`;
  const { salt, hash } = await hashNewPassword(password,env);
  const createdAt = new Date().toISOString();
  // Registration creates a normal member account. Creator capability is a
  // deliberate, authenticated upgrade and must never come from request data.
  const isCreator = false;

  await env.DB.prepare(`
    insert into users (id, email, password_hash, password_salt, name, is_creator, created_at, last_login_at)
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, email, hash, salt, name, Number(isCreator), createdAt, createdAt).run();

  const token = await createSession(env, id);
  return jsonWithCookie(
    { ok: true, user: publicUser({ id, name, email, is_creator: Number(isCreator), password_hash: hash }) },
    201,
    sessionCookieHeader(request, token, SESSION_TTL_SECONDS)
  );
}

async function handleAuthRegister(request, env) {
  return registerUser(request, env);
}

async function handleCreatorRegister(request, env) {
  // Legacy endpoint kept only as a safe compatibility alias. New accounts are
  // always members first; a signed-in member explicitly activates creator
  // tools through the upgrade endpoint.
  return registerUser(request, env);
}

async function handleAuthLogin(request, env) {
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  const email = normalizeEmail(payload?.email);
  const password = String(payload?.password || "");

  if (!isValidEmail(email) || !password) {
    return json({ ok: false, error: "Invalid email or password." }, 401);
  }

  await throttleAccount(env, email);

  const row = await env.DB.prepare(`
    select id, name, email, avatar_url, password_hash, password_salt, is_creator, email_verified_at, totp_secret_encrypted
    from users where email = ?
  `).bind(email).first();

  if (!row) {
    await environmentPassword(password, "AAAAAAAAAAAAAAAAAAAAAA==",env);
    return json({ ok: false, error: "Invalid email or password." }, 401);
  }

  if (row.password_hash === "authentication-disabled" || row.id.startsWith("temporary:")) return unauthorized();
  const modern = row.password_hash.startsWith(PASSWORD_PREFIX);
  const versioned = row.password_hash.startsWith('pbkdf2-sha256$100000$');
  const computedHash = modern ? await modernPassword(password, row.password_salt) : (versioned?'pbkdf2-sha256$100000$':'')+await hashPassword(password, row.password_salt);
  if (!constantTimeEqual(computedHash, row.password_hash)) {
    return json({ ok: false, error: "Invalid email or password." }, 401);
  }
  if (!modern && !versioned) {
    const upgraded = await hashNewPassword(password,env);
    await env.DB.prepare('update users set password_hash=?,password_salt=? where id=? and password_hash=?').bind(upgraded.hash, upgraded.salt, row.id, row.password_hash).run();
  }
  if (row.totp_secret_encrypted) return json({ok:true,mfaRequired:true,challenge:await mfaChallenge(env,row.id)},202);

  await env.DB.prepare("update users set last_login_at = ? where id = ?")
    .bind(new Date().toISOString(), row.id)
    .run();

  const token = await createSession(env, row.id);
  return jsonWithCookie(
    { ok: true, user: publicUser(row) },
    200,
    sessionCookieHeader(request, token, SESSION_TTL_SECONDS)
  );
}

async function handleAuthLogout(request, env) {
  if (env.DB) {
    const cookies = parseCookies(request);
    const token = cookies[SESSION_COOKIE];
    if (token) await env.DB.prepare("delete from sessions where token = ?").bind(await digestToken(token)).run();
  }
  return jsonWithCookie({ ok: true }, 200, clearSessionCookieHeader(request));
}

async function handleAuthSession(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return json({ ok: true, user: null });
  return json({ ok: true, user: publicUser(user) });
}

function validAvatarUrl(value) {
  if (!value) return true;
  return /^\/media\/member-avatars\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(value);
}

async function verifyUserPassword(user, password, env) {
  if (!user?.password_hash || user.password_hash === "authentication-disabled") return false;
  const modern = user.password_hash.startsWith(PASSWORD_PREFIX);
  const versioned = user.password_hash.startsWith("pbkdf2-sha256$100000$");
  const computed = modern
    ? await modernPassword(password, user.password_salt)
    : (versioned ? "pbkdf2-sha256$100000$" : "") + await hashPassword(password, user.password_salt);
  return constantTimeEqual(computed, user.password_hash);
}

async function handleAuthProfileUpdate(request, env) {
  if (!env.DB) return storageUnavailable();
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  const payload = await readJson(request);
  const name = String(payload?.name || "").trim();
  const email = normalizeEmail(payload?.email);
  const avatarUrl = String(payload?.avatarUrl || "");
  if (!name || name.length > 200) return json({ ok: false, error: "Enter your full name." }, 400);
  if (!isValidEmail(email)) return json({ ok: false, error: "Enter a valid email address." }, 400);
  if (!validAvatarUrl(avatarUrl)) return json({ ok: false, error: "Choose a profile picture from your device." }, 400);

  const emailChanged = email !== normalizeEmail(user.email);
  if (emailChanged) {
    if (user.password_hash === "authentication-disabled") return json({ ok: false, error: "Your email is managed by Google and cannot be changed here." }, 400);
    const currentPassword = String(payload?.currentPassword || "");
    if (!currentPassword || !(await verifyUserPassword(user, currentPassword, env))) return json({ ok: false, error: "Enter your current password to change your email." }, 401);
    const existing = await env.DB.prepare("select id from users where email = ?").bind(email).first();
    if (existing && existing.id !== user.id) return json({ ok: false, error: "That email is already in use." }, 409);
  }

  await env.DB.prepare("update users set name = ?, email = ?, avatar_url = ?, email_verified_at = case when email <> ? then null else email_verified_at end, updated_at = ? where id = ?")
    .bind(name, email, avatarUrl || null, email, new Date().toISOString(), user.id).run();
  return json({ ok: true, user: publicUser({ ...user, name, email, avatar_url: avatarUrl, email_verified_at: emailChanged ? null : user.email_verified_at }) });
}

async function handleAuthPasswordUpdate(request, env) {
  if (!env.DB) return storageUnavailable();
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  if (user.password_hash === "authentication-disabled") return json({ ok: false, error: "This account signs in with Google, so its password is managed there." }, 400);
  const payload = await readJson(request);
  const currentPassword = String(payload?.currentPassword || "");
  const newPassword = String(payload?.newPassword || "");
  if (!(await verifyUserPassword(user, currentPassword, env))) return json({ ok: false, error: "Your current password is incorrect." }, 401);
  if (newPassword.length < 15 || newPassword.length > 128) return json({ ok: false, error: "Your new password must be between 15 and 128 characters." }, 400);
  if (constantTimeEqual(currentPassword, newPassword)) return json({ ok: false, error: "Choose a new password that is different from your current password." }, 400);
  const next = await hashNewPassword(newPassword, env);
  await env.DB.prepare("update users set password_hash = ?, password_salt = ?, updated_at = ? where id = ?").bind(next.hash, next.salt, new Date().toISOString(), user.id).run();
  return json({ ok: true, message: "Password updated." });
}

async function handleGoogleAuthStart(request, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return json({ ok: false, error: "Google sign-in is not configured." }, 503);
  }

  const requestUrl = new URL(request.url);
  const state = randomToken();
  const returnPath = safeReturnPath(requestUrl.searchParams.get("next"));
  const stateCookie = `${state}.${toBase64(new TextEncoder().encode(returnPath)).replace(/[+/=]/g, char => ({ "+": "-", "/": "_", "=": "" }[char]))}`;
  const redirectUri = `${requestUrl.origin}/api/auth/google/callback`;
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account"
  }).toString();

  return redirectWithCookies(authorizationUrl.toString(), [
    oauthStateCookieHeader(request, stateCookie, GOOGLE_OAUTH_STATE_TTL_SECONDS)
  ]);
}

function parseGoogleOauthState(request) {
  const raw = parseCookies(request)[GOOGLE_OAUTH_STATE_COOKIE] || "";
  const separator = raw.indexOf(".");
  if (separator < 1) return null;
  const state = raw.slice(0, separator);
  const encodedPath = raw.slice(separator + 1).replace(/-/g, "+").replace(/_/g, "/");
  try {
    const returnPath = new TextDecoder().decode(fromBase64(encodedPath.padEnd(Math.ceil(encodedPath.length / 4) * 4, "=")));
    return { state, returnPath: safeReturnPath(returnPath) };
  } catch {
    return null;
  }
}

async function handleGoogleAuthCallback(request, env) {
  if (!env.DB) return storageUnavailable();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return json({ ok: false, error: "Google sign-in is not configured." }, 503);
  }

  const requestUrl = new URL(request.url);
  const savedState = parseGoogleOauthState(request);
  const receivedState = requestUrl.searchParams.get("state") || "";
  const clearStateCookie = oauthStateCookieHeader(request, "", 0);
  if (!savedState || !receivedState || !constantTimeEqual(savedState.state, receivedState)) {
    return redirectWithCookies("/?auth_error=google_state", [clearStateCookie]);
  }
  if (requestUrl.searchParams.get("error")) {
    return redirectWithCookies(`${savedState.returnPath}${savedState.returnPath.includes("?") ? "&" : "?"}auth_error=google_denied`, [clearStateCookie]);
  }

  const code = requestUrl.searchParams.get("code");
  if (!code) return redirectWithCookies("/?auth_error=google_code", [clearStateCookie]);

  const redirectUri = `${requestUrl.origin}/api/auth/google/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });
  if (!tokenResponse.ok) return redirectWithCookies("/?auth_error=google_token", [clearStateCookie]);
  const tokenPayload = await tokenResponse.json();
  if (!tokenPayload?.access_token) return redirectWithCookies("/?auth_error=google_token", [clearStateCookie]);

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${tokenPayload.access_token}` }
  });
  if (!profileResponse.ok) return redirectWithCookies("/?auth_error=google_profile", [clearStateCookie]);
  const profile = await profileResponse.json();
  const email = normalizeEmail(profile?.email);
  if (!profile?.sub || !profile?.email_verified || !isValidEmail(email)) {
    return redirectWithCookies("/?auth_error=google_unverified", [clearStateCookie]);
  }

  let user = await env.DB.prepare(`
    select id, name, email, avatar_url, password_hash, password_salt, is_creator, email_verified_at, totp_secret_encrypted
    from users where email = ?
  `).bind(email).first();
  const now = new Date().toISOString();
  if (!user) {
    user = {
      id: `google:${profile.sub}`,
      name: String(profile.name || email.split("@")[0]).slice(0, 200),
      email,
      is_creator: 0,
      email_verified_at: now,
      totp_secret_encrypted: null
    };
    await env.DB.prepare(`
      insert into users (id, email, password_hash, password_salt, name, is_creator, created_at, last_login_at, email_verified_at)
      values (?, ?, 'authentication-disabled', '', ?, 0, ?, ?, ?)
    `).bind(user.id, email, user.name, now, now, now).run();
  } else {
    await env.DB.prepare("update users set last_login_at = ?, email_verified_at = coalesce(email_verified_at, ?) where id = ?")
      .bind(now, now, user.id)
      .run();
    user.email_verified_at ||= now;
  }

  const token = await createSession(env, user.id);
  return redirectWithCookies(savedState.returnPath, [
    clearStateCookie,
    sessionCookieHeader(request, token, SESSION_TTL_SECONDS)
  ]);
}

async function handleCreatorUpgrade(request, env) {
  if (!env.DB) return storageUnavailable();
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  await env.DB.prepare("update users set is_creator = 1 where id = ?").bind(user.id).run();
  return json({ ok: true, user: { ...publicUser(user), isCreator: true } });
}

async function handleStatus(env) {
  return json({
    ok: true,
    app: "my-way-of-evangelism-api",
    role: "Shared synchronization API for public website, church portal, and owner dashboard",
    environment: env.ENVIRONMENT || "unknown",
    storage: {
      d1Bound: Boolean(env.DB),
      binding: "DB"
    },
    security: {
      adminAuthorizationConfigured: Boolean(env.ADMIN_API_TOKEN),
      authenticationBypassed: false
    },
    applications: [
      { name: "Public Website", route: "/", authentication: "none" },
      { name: "Creation Studio", route: "/app?view=create", authentication: "member sign-in, then optional creator upgrade" },
      { name: "Owner Dashboard", route: "/owner-dashboard", authentication: "required" },
      { name: "API Application", route: "/api/*", authentication: "token/session by endpoint" }
    ]
  });
}

async function handlePublicChurches(request, env) {
  if (!env.DB) return storageUnavailable();

  if (request.method === "GET") {
    const { results } = await env.DB.prepare(`
      select
        c.id, c.name, c.city, c.country, c.postal_code, c.denomination,
        c.language, c.website, c.phone, c.email, c.cover_image_url,
        c.livestream_enabled, c.livestream_paid, c.livestream_url,
        p.pastor_name, p.pastor_title, p.pastor_bio, p.about
      from churches c
      left join church_profiles p on p.church_id = c.id
      where c.is_verified = 1
      order by c.name
    `).all();

    return json({ ok: true, churches: results });
  }

  if (request.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  const payload = await readJson(request);
  if (!payload?.name || !payload?.city || !payload?.pastor || !payload?.phone || !payload?.email) {
    return json({ ok: false, error: "name, city, pastor, phone, and email are required" }, 400);
  }

  const id = payload.id || slugify(payload.name);
  const createdAt = new Date().toISOString();

  if (env.DB) {
    await env.DB.prepare(`
      insert into churches
        (id, name, city, country, website, phone, email, cover_image_url, livestream_enabled, livestream_paid, livestream_url, is_verified, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      payload.name,
      payload.city,
      payload.country || "",
      payload.website || "",
      payload.phone,
      payload.email,
      payload.coverImageUrl || "",
      Number(Boolean(payload.livestreamEnabled)),
      Number(Boolean(payload.livestreamPaid)),
      payload.livestreamUrl || "",
      0,
      createdAt
    ).run();

    await env.DB.prepare(`
      insert into church_profiles
        (church_id, about, pastor_name, pastor_title, pastor_bio)
      values (?, ?, ?, ?, ?)
    `).bind(
      id,
      payload.about || "",
      payload.pastor,
      payload.pastorTitle || "Lead Pastor",
      payload.pastorBio || ""
    ).run();
  }

  return json({ ok: true, id, status: "pending-verification", createdAt }, 201);
}

async function handleAdminChurches(request, env) {
  if (!isAuthorized(request, env)) return unauthorized();
  if (!env.DB) return storageUnavailable();

  if (request.method === "GET") {
    const { results } = await env.DB.prepare(`
      select
        c.id, c.name, c.city, c.country, c.website, c.phone, c.email,
        c.cover_image_url, c.livestream_enabled, c.livestream_paid,
        c.livestream_url, c.description, c.is_verified, c.created_at,
        p.pastor_name, p.pastor_title, p.pastor_bio, p.about
      from churches c
      left join church_profiles p on p.church_id = c.id
      order by c.created_at desc
    `).all();

    return json({ ok: true, churches: results });
  }

  if (request.method === "POST" || request.method === "PUT") {
    return upsertChurch(request, env);
  }

  if (request.method === "DELETE") {
    const payload = await readJson(request) || {};
    const id = payload.id || new URL(request.url).searchParams.get("id");
    if (!id) return json({ ok: false, error: "id is required" }, 400);

    if (env.DB) {
      await env.DB.batch([
        env.DB.prepare("delete from event_registrations where event_id in (select id from events where church_id = ?)").bind(id),
        env.DB.prepare("delete from ride_followups where ride_request_id in (select id from ride_requests where church_id = ?)").bind(id),
        env.DB.prepare("delete from service_schedules where church_id = ?").bind(id),
        env.DB.prepare("delete from ministries where church_id = ?").bind(id),
        env.DB.prepare("delete from events where church_id = ?").bind(id),
        env.DB.prepare("delete from visitor_connections where church_id = ?").bind(id),
        env.DB.prepare("delete from prayer_requests where church_id = ?").bind(id),
        env.DB.prepare("delete from ride_requests where church_id = ?").bind(id),
        env.DB.prepare("delete from salvation_decisions where church_id = ?").bind(id),
        env.DB.prepare("delete from church_staff_roles where church_id = ?").bind(id),
        env.DB.prepare("delete from church_profiles where church_id = ?").bind(id),
        env.DB.prepare("delete from livestream_activations where church_id = ?").bind(id),
        env.DB.prepare("delete from churches where id = ?").bind(id)
      ]);
    }

    return json({ ok: true, id, status: "deleted" });
  }

  return json({ ok: false, error: "method not allowed" }, 405);
}

async function upsertChurch(request, env) {
  const payload = await readJson(request);
  if (!payload?.name || !payload?.city || !payload?.pastor || !payload?.phone || !payload?.email) {
    return json({ ok: false, error: "name, city, pastor, phone, and email are required" }, 400);
  }

  const id = payload.id || slugify(payload.name);
  const createdAt = payload.createdAt || new Date().toISOString();

  if (env.DB) {
    await env.DB.batch([
      env.DB.prepare(`
        insert into churches
          (id, name, city, country, website, phone, email, cover_image_url, livestream_enabled, livestream_paid, livestream_url, description, is_verified, created_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          name = excluded.name,
          city = excluded.city,
          country = excluded.country,
          website = excluded.website,
          phone = excluded.phone,
          email = excluded.email,
          cover_image_url = excluded.cover_image_url,
          livestream_enabled = excluded.livestream_enabled,
          livestream_paid = excluded.livestream_paid,
          livestream_url = excluded.livestream_url,
          description = excluded.description,
          is_verified = excluded.is_verified
      `).bind(
        id,
        payload.name,
        payload.city,
        payload.country || "",
        payload.website || "",
        payload.phone,
        payload.email,
        payload.image || payload.coverImageUrl || "",
        Number(Boolean(payload.streamEnabled || payload.livestreamEnabled)),
        Number(Boolean(payload.streamPaid || payload.livestreamPaid)),
        payload.streamUrl || payload.livestreamUrl || "",
        payload.about || "",
        payload.verified === false ? 0 : 1,
        createdAt
      ),
      env.DB.prepare(`
        insert into church_profiles
          (church_id, about, pastor_name, pastor_title, pastor_bio)
        values (?, ?, ?, ?, ?)
        on conflict(church_id) do update set
          about = excluded.about,
          pastor_name = excluded.pastor_name,
          pastor_title = excluded.pastor_title,
          pastor_bio = excluded.pastor_bio
      `).bind(
        id,
        payload.about || "",
        payload.pastor,
        payload.pastorTitle || "Lead Pastor",
        payload.pastorBio || ""
      )
    ]);
  }

  return json({ ok: true, id, status: "saved", createdAt });
}

async function handleChurchApplication(request, env) {
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  if (!payload?.churchName || !payload?.pastorName || !payload?.adminEmail) {
    return json({ ok: false, error: "churchName, pastorName, and adminEmail are required" }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  if (env.DB) {
    await env.DB.prepare(`
      insert into church_applications
        (id, church_name, pastor_name, website, social, admin_email, statement_of_faith, phone, email, cover_image_url, livestream_url, livestream_paid, status, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      payload.churchName,
      payload.pastorName,
      payload.website || "",
      payload.social || "",
      payload.adminEmail,
      payload.faith || "",
      payload.phone || "",
      payload.email || "",
      payload.coverImageUrl || "",
      payload.livestreamUrl || "",
      Number(Boolean(payload.livestreamPaid)),
      "pending",
      createdAt
    ).run();
  }

  return json({ ok: true, id, status: "pending-review", createdAt }, 201);
}

async function handleLivestreamActivation(request, env) {
  if (!isAuthorized(request, env)) return unauthorized();
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  if (!payload?.churchId || !payload?.livestreamUrl) {
    return json({ ok: false, error: "churchId and livestreamUrl are required" }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  if (env.DB) {
    await env.DB.prepare(`
      insert into livestream_activations
        (id, church_id, livestream_url, status, payment_status, created_at)
      values (?, ?, ?, ?, ?, ?)
    `).bind(id, payload.churchId, payload.livestreamUrl, "requested", "pending", createdAt).run();
  }

  return json({ ok: true, id, status: "requested", paymentStatus: "pending", createdAt }, 201);
}

async function handleVisitor(request, env) {
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  if (!payload?.fullName || !payload?.email || !payload?.churchId) {
    return json({ ok: false, error: "fullName, email, and churchId are required" }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  if (env.DB) {
    await env.DB.prepare(`
      insert into visitor_connections
        (id, church_id, full_name, phone, email, city, message, needs, status, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      payload.churchId,
      payload.fullName,
      payload.phone || "",
      payload.email,
      payload.city || "",
      payload.message || "",
      JSON.stringify(payload.needs || []),
      "new",
      createdAt
    ).run();
  }

  return json({ ok: true, id, status: "received", message: "Visitor connection request received.", createdAt }, 201);
}

async function handlePrayer(request, env) {
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  if (!payload?.request) return json({ ok: false, error: "request is required" }, 400);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  if (env.DB) {
    await env.DB.prepare(`
      insert into prayer_requests (id, church_id, request_text, is_anonymous, status, created_at)
      values (?, ?, ?, ?, ?, ?)
    `).bind(id, payload.churchId || null, payload.request, Number(Boolean(payload.isAnonymous)), "new", createdAt).run();
  }

  return json({ ok: true, id, status: "received", createdAt }, 201);
}

function assetRequest(request) {
  const url = new URL(request.url);
  const routes = new Map([
    ["/", "/index.html"],
    ["/church-portal", "/creator-studio.html"],
    ["/portal", "/creator-studio.html"],
    ["/creator-hub", "/creator-studio.html"],
    ["/register-church", "/creator-studio.html"],
    ["/owner-dashboard", "/owner-dashboard.html"],
    ["/admin", "/owner-dashboard.html"],
    ["/app", "/app.html"],
    ["/member", "/app.html"],
    ["/spotlight", "/spotlight.html"],
    ["/livestream", "/livestream.html"],
    ["/live", "/livestream.html"],
    ["/broadcast", "/broadcast.html"],
    ["/watch", "/broadcast.html"],
    ["/church-profile", "/church-profile.html"],
    ["/church", "/church-profile.html"],
    ["/churches", "/churches.html"],
    ["/channels", "/channels.html"],
    ["/channel", "/channel-detail.html"],
    ["/channel-content", "/channel-content.html"],
    ["/messages", "/messages.html"],
    ["/events", "/events.html"],
    ["/event-profile", "/event-profile.html"],
    ["/event", "/event-profile.html"],
    ["/foundation", "/foundation.html"],
    ["/store", "/store.html"],
    ["/product", "/product-detail.html"],
    ["/cart", "/cart.html"],
    ["/checkout", "/checkout.html"],
    ["/store-manager", "/seller-dashboard.html"],
    ["/resources", "/resources.html"],
    ["/resource", "/resource-detail.html"],
    ["/resource-reader", "/resource-reader.html"],
    ["/donate", "/donate.html"],
    ["/privacy", "/privacy.html"],
    ["/terms", "/privacy.html"],
    ["/safeguarding", "/privacy.html"],
    ["/about", "/index.html"],
    ["/volunteer", "/index.html"],
    ["/prayer", "/index.html"]
  ]);

  if (routes.has(url.pathname)) {
    url.pathname = routes.get(url.pathname);
    return new Request(url.toString(), request);
  }

  return request;
}

async function handleEvents(request, env) {
  if (!env.DB) return storageUnavailable();

  if (request.method === "GET") {
    const url = new URL(request.url);
    const city = url.searchParams.get("city");
    const churchId = url.searchParams.get("churchId");
    const type = url.searchParams.get("type");
    const upcoming = url.searchParams.get("upcoming") === "true";

    let query = `
      select e.*, c.name as church_name, c.city as church_city, c.country as church_country
      from events e
      left join churches c on c.id = e.church_id
      where 1=1
    `;
    const params = [];

    if (city) {
      query += ` and (e.city = ? or c.city = ?)`;
      params.push(city, city);
    }
    if (churchId) {
      query += ` and e.church_id = ?`;
      params.push(churchId);
    }
    if (type) {
      query += ` and e.event_type = ?`;
      params.push(type);
    }
    if (upcoming) {
      const nowStr = new Date().toISOString();
      query += ` and e.starts_at >= ?`;
      params.push(nowStr);
    }

    query += ` order by e.starts_at asc`;

    const { results } = await env.DB.prepare(query).bind(...params).all();
    return json({ ok: true, events: results });
  }

  if (request.method === "POST" || request.method === "PUT") {
    if (!isAuthorized(request, env)) return unauthorized();
    const payload = await readJson(request);
    if (!payload?.title || !payload?.startsAt) {
      return json({ ok: false, error: "title and startsAt are required" }, 400);
    }

    const id = payload.id || crypto.randomUUID();
    if (env.DB) {
      await env.DB.prepare(`
        insert into events
          (id, church_id, title, event_type, starts_at, ends_at, venue_name, city, country, cover_image_url,
           registration_required, ticket_price_cents, currency, total_tickets, tickets_sold, is_featured, is_promoted,
           registration_url, livestream_url, directions_url, description)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          church_id = excluded.church_id,
          title = excluded.title,
          event_type = excluded.event_type,
          starts_at = excluded.starts_at,
          ends_at = excluded.ends_at,
          venue_name = excluded.venue_name,
          city = excluded.city,
          country = excluded.country,
          cover_image_url = excluded.cover_image_url,
          registration_required = excluded.registration_required,
          ticket_price_cents = excluded.ticket_price_cents,
          currency = excluded.currency,
          total_tickets = excluded.total_tickets,
          tickets_sold = excluded.tickets_sold,
          is_featured = excluded.is_featured,
          is_promoted = excluded.is_promoted,
          registration_url = excluded.registration_url,
          livestream_url = excluded.livestream_url,
          directions_url = excluded.directions_url,
          description = excluded.description
      `).bind(
        id,
        payload.churchId || null,
        payload.title,
        payload.eventType || "in-person",
        payload.startsAt,
        payload.endsAt || null,
        payload.venueName || "",
        payload.city || "",
        payload.country || "",
        payload.coverImageUrl || "",
        Number(Boolean(payload.registrationRequired)),
        Number(payload.ticketPriceCents || 0),
        payload.currency || "USD",
        payload.totalTickets !== undefined ? Number(payload.totalTickets) : null,
        Number(payload.ticketsSold || 0),
        Number(Boolean(payload.isFeatured)),
        Number(Boolean(payload.isPromoted)),
        payload.registrationUrl || "",
        payload.livestreamUrl || "",
        payload.directionsUrl || "",
        payload.description || ""
      ).run();
    }
    return json({ ok: true, id, status: "saved" });
  }

  return json({ ok: false, error: "method not allowed" }, 405);
}

async function handleEventRegister(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  if (!env.DB) return storageUnavailable();

  const payload = await readJson(request);
  if (!payload?.eventId || !payload?.fullName || !payload?.email) {
    return json({ ok: false, error: "eventId, fullName, and email are required" }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const regCode = registrationCode();
  const qty = Number(payload.ticketQuantity ?? 1);
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > 20) return json({ ok: false, error: "ticketQuantity must be a whole number from 1 to 20" }, 400);
  if (!isValidEmail(normalizeEmail(payload.email))) return json({ ok: false, error: "valid email required" }, 400);
  const event = await env.DB.prepare("select id, ticket_price_cents, total_tickets, tickets_sold from events where id = ?").bind(payload.eventId).first();
  if (!event) return json({ ok: false, error: "event not found" }, 404);
  // Payment must be verified by a trusted provider webhook. Never accept a client claim of payment.
  if (event.ticket_price_cents > 0) return json({ ok: false, error: "Paid registration requires a verified payment provider." }, 409);
  const amountPaid = 0;
  // Single guarded insert + trigger is atomic, including competing requests.
  const result = await env.DB.prepare(`
    insert into event_registrations
      (id, event_id, full_name, email, ticket_quantity, amount_paid_cents, registration_code, created_at)
    select ?, id, ?, ?, ?, 0, ?, ? from events
    where id = ? and ticket_price_cents = 0
      and (total_tickets is null or total_tickets = 0 or coalesce(tickets_sold, 0) + ? <= total_tickets)
  `).bind(id, payload.fullName, normalizeEmail(payload.email), qty, regCode, createdAt, payload.eventId, qty).run();
  // D1 includes writes performed by reservation triggers in the changes count.
  if (!(result.meta?.changes > 0)) return json({ ok: false, error: "Registration unavailable or event full." }, 409);
  return json({ ok: true, id, registrationCode: regCode, amountPaidCents: amountPaid, status: "registered" }, 201);
}

function serviceBookingRef() {
  return `SRV-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

async function handleServiceBooking(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);

  const serviceId = String(payload?.serviceId || "").trim();
  const serviceTitle = String(payload?.serviceTitle || "").trim();
  const serviceType = String(payload?.serviceType || "service").trim();
  const providerName = String(payload?.providerName || "").trim();
  const providerType = String(payload?.providerType || "Provider").trim();
  const packageTier = String(payload?.packageTier || "Standard").trim();
  const estimatedAmount = String(payload?.estimatedAmount || "").trim();
  const requestedDate = String(payload?.requestedDate || "").trim();
  const requestedTime = String(payload?.requestedTime || "").trim();
  const customerName = String(payload?.customerName || "").trim();
  const customerEmail = normalizeEmail(payload?.customerEmail);
  const customerPhone = String(payload?.customerPhone || "").trim();
  const eventLocation = String(payload?.eventLocation || "").trim();
  const notes = String(payload?.notes || "").trim();

  if (!serviceId || !serviceTitle) {
    return json({ ok: false, error: "Service information is missing." }, 400);
  }
  if (!customerName) {
    return json({ ok: false, error: "Please enter your name." }, 400);
  }
  if (!isValidEmail(customerEmail)) {
    return json({ ok: false, error: "Please provide a valid email address." }, 400);
  }
  if (!requestedDate) {
    return json({ ok: false, error: "Please select a preferred date for the service." }, 400);
  }

  const id = `bk_${crypto.randomUUID()}`;
  const bookingRef = serviceBookingRef();
  const createdAt = new Date().toISOString();

  let userId = null;
  if (env.DB) {
    const sessionUser = await getSessionUser(request, env);
    if (sessionUser) userId = sessionUser.id;

    await env.DB.prepare(`
      insert into service_bookings (
        id, booking_ref, service_id, service_title, service_type,
        provider_name, provider_type, package_tier, estimated_amount,
        requested_date, requested_time, customer_name, customer_email,
        customer_phone, event_location, notes, status, user_id, created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'inquiry_received', ?, ?)
    `).bind(
      id, bookingRef, serviceId, serviceTitle, serviceType,
      providerName, providerType, packageTier, estimatedAmount,
      requestedDate, requestedTime, customerName, customerEmail,
      customerPhone, eventLocation, notes, userId, createdAt
    ).run();
  }

  return json({
    ok: true,
    id,
    bookingRef,
    status: "inquiry_received",
    message: "Your service booking request has been received. The church or ministry team will contact you shortly to confirm arrangements.",
    booking: {
      id,
      bookingRef,
      serviceTitle,
      providerName,
      packageTier,
      requestedDate,
      requestedTime,
      customerName,
      customerEmail
    }
  }, 201);
}

async function handleGetServiceBookings(request, env) {
  if (!env.DB) return storageUnavailable();
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const { results } = await env.DB.prepare(`
    select id, booking_ref, service_id, service_title, service_type,
           provider_name, provider_type, package_tier, estimated_amount,
           requested_date, requested_time, customer_name, customer_email,
           status, created_at
    from service_bookings
    where user_id = ?
    order by created_at desc
  `).bind(user.id).all();

  return json({ ok: true, bookings: results || [] });
}

async function handleApi(request, env) {
  const requestId = crypto.randomUUID();

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    validateMutationOrigin(request);
    await enforceRateLimit(request, env, path);
    if (request.method === "OPTIONS") return json({ ok: true });
    const context = {json,getSessionUser,createSession,sessionCookieHeader,jsonWithCookie,isAuthorized,publicUser,clearSessionCookieHeader,parseCookies,digestToken};
    const identityResponse = await handleIdentityApi(request, env, context);
    if (identityResponse) return identityResponse;
    const platformResponse = await handlePlatformApi(request, env, context);
    if (platformResponse) return platformResponse;
    const spotlightResponse = await handleSpotlightApi(request, env, context);
    if (spotlightResponse) return spotlightResponse;
    if (path === "/api/status" && request.method === "GET") return await handleStatus(env);
    if (path === "/api/auth/google/start" && request.method === "GET") return await handleGoogleAuthStart(request, env);
    if (path === "/api/auth/google/callback" && request.method === "GET") return await handleGoogleAuthCallback(request, env);
    if (path === "/api/location" && request.method === "GET") {
      // Return only the requesting visitor's coarse edge location; never forward IPs.
      return json({ city: String(request.cf?.city || "Edmonton"), countryCode: String(request.cf?.country || "CA") });
    }
    if (path === "/api/churches") return await handlePublicChurches(request, env);
    if (path === "/api/admin/churches") return await handleAdminChurches(request, env);
    if (path === "/api/events") return await handleEvents(request, env);
    if (path === "/api/auth/session" && request.method === "GET") return await handleAuthSession(request, env);
    if (path === "/api/auth/profile" && request.method === "PUT") return await handleAuthProfileUpdate(request, env);
    if (path === "/api/auth/password" && request.method === "PUT") return await handleAuthPasswordUpdate(request, env);
    if (path === "/api/services/bookings" && request.method === "GET") return await handleGetServiceBookings(request, env);
    if (path === "/api/media/upload" && request.method === "POST") return await handleImageUpload(request, env);

    if (request.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
    if (path === "/api/church-application") return await handleChurchApplication(request, env);
    if (path === "/api/livestream-activation") return await handleLivestreamActivation(request, env);
    if (path === "/api/visitor") return await handleVisitor(request, env);
    if (path === "/api/prayer") return await handlePrayer(request, env);
    if (path === "/api/event-register") return await handleEventRegister(request, env);
    if (path === "/api/auth/register") return await handleAuthRegister(request, env);
    if (path === "/api/auth/login") return await handleAuthLogin(request, env);
    if (path === "/api/auth/logout") return await handleAuthLogout(request, env);
    if (path === "/api/creator/register") return await handleCreatorRegister(request, env);
    if (path === "/api/creator/upgrade") return await handleCreatorUpgrade(request, env);
    if (path === "/api/services/book") return await handleServiceBooking(request, env);

    return json({ ok: false, error: "not found" }, 404);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : "internal server error";

    console.error(JSON.stringify({
      level: "error",
      requestId,
      method: request.method,
      path: new URL(request.url).pathname,
      errorType: error instanceof Error ? error.name : "UnknownError"
    }));

    const response = json({ ok: false, error: message, requestId }, status);
    if (status === 429) response.headers.set("retry-after", "60");
    return response;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    if (url.pathname.startsWith("/media/")) {
      return handleMediaRequest(request, env);
    }

    const assetRes = await env.ASSETS.fetch(assetRequest(request));
    const newHeaders = new Headers(assetRes.headers);
    for (const [key, value] of Object.entries(securityHeaders)) newHeaders.set(key, value);
    newHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    newHeaders.set("Pragma", "no-cache");
    newHeaders.set("Expires", "0");

    return new Response(assetRes.body, {
      status: assetRes.status,
      statusText: assetRes.statusText,
      headers: newHeaders
    });
  }
};

export { constantTimeEqual, readJson, registrationCode, handleServiceBooking, handleGetServiceBookings, serviceBookingRef };
