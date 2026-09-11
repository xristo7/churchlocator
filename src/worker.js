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
    ...apiHeaders
  }
});

const unauthorized = () => json({ ok: false, error: "unauthorized" }, 401);
const storageUnavailable = () => json({
  ok: false,
  error: "storage unavailable",
  message: "The database binding is not configured for this environment."
}, 503);

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

async function readJson(request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 64 * 1024) {
    throw new ApiError(413, "request body too large");
  }

  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "invalid JSON body");
  }
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function registrationCode() {
  return `REG-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

// --- Authentication -------------------------------------------------------

const SESSION_COOKIE = "mwe_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
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

async function hashNewPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = toBase64(saltBytes);
  const hash = await hashPassword(password, salt);
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

function jsonWithCookie(body, status, cookieValue) {
  const res = json(body, status);
  res.headers.append("set-cookie", cookieValue);
  return res;
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    isCreator: Boolean(row.is_creator)
  };
}

async function createSession(env, userId) {
  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  await env.DB.prepare(`
    insert into sessions (token, user_id, created_at, expires_at)
    values (?, ?, ?, ?)
  `).bind(token, userId, now.toISOString(), expires.toISOString()).run();
  return token;
}

async function getSessionUser(request, env) {
  if (!env.DB) return null;
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const row = await env.DB.prepare(`
    select u.id, u.name, u.email, u.is_creator, s.expires_at
    from sessions s
    join users u on u.id = s.user_id
    where s.token = ?
  `).bind(token).first();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare("delete from sessions where token = ?").bind(token).run();
    return null;
  }

  return row;
}

async function registerUser(request, env, { forceCreator = false } = {}) {
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  const name = String(payload?.name || "").trim();
  const email = normalizeEmail(payload?.email);
  const password = String(payload?.password || "");

  if (!name) return json({ ok: false, error: "Enter your full name." }, 400);
  if (!isValidEmail(email)) return json({ ok: false, error: "Enter a valid email address." }, 400);
  if (password.length < 8) return json({ ok: false, error: "Password must be at least 8 characters." }, 400);

  const existing = await env.DB.prepare("select id from users where email = ?").bind(email).first();
  if (existing) {
    return json({ ok: false, error: "An account with that email already exists. Sign in instead." }, 409);
  }

  const id = `local:${email}`;
  const { salt, hash } = await hashNewPassword(password);
  const createdAt = new Date().toISOString();
  const isCreator = forceCreator || Boolean(payload?.isCreator);

  await env.DB.prepare(`
    insert into users (id, email, password_hash, password_salt, name, is_creator, created_at, last_login_at)
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, email, hash, salt, name, Number(isCreator), createdAt, createdAt).run();

  const token = await createSession(env, id);
  return jsonWithCookie(
    { ok: true, user: { id, name, email, isCreator } },
    201,
    sessionCookieHeader(request, token, SESSION_TTL_SECONDS)
  );
}

async function handleAuthRegister(request, env) {
  return registerUser(request, env);
}

async function handleCreatorRegister(request, env) {
  return registerUser(request, env, { forceCreator: true });
}

async function handleAuthLogin(request, env) {
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  const email = normalizeEmail(payload?.email);
  const password = String(payload?.password || "");

  if (!isValidEmail(email) || !password) {
    return json({ ok: false, error: "Invalid email or password." }, 401);
  }

  const row = await env.DB.prepare(`
    select id, name, email, password_hash, password_salt, is_creator
    from users where email = ?
  `).bind(email).first();

  if (!row) return json({ ok: false, error: "Invalid email or password." }, 401);

  const computedHash = await hashPassword(password, row.password_salt);
  if (!constantTimeEqual(computedHash, row.password_hash)) {
    return json({ ok: false, error: "Invalid email or password." }, 401);
  }

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
    if (token) await env.DB.prepare("delete from sessions where token = ?").bind(token).run();
  }
  return jsonWithCookie({ ok: true }, 200, clearSessionCookieHeader(request));
}

async function handleAuthSession(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return json({ ok: true, user: null });
  return json({ ok: true, user: publicUser(user) });
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
      adminAuthorizationConfigured: Boolean(env.ADMIN_API_TOKEN)
    },
    applications: [
      { name: "Public Website", route: "/", authentication: "none" },
      { name: "Church Portal", route: "/church-portal", authentication: "required" },
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
    ["/church-portal", "/church-portal.html"],
    ["/portal", "/church-portal.html"],
    ["/creator-hub", "/church-portal.html"],
    ["/register-church", "/church-portal.html"],
    ["/owner-dashboard", "/owner-dashboard.html"],
    ["/admin", "/owner-dashboard.html"],
    ["/app", "/app.html"],
    ["/member", "/app.html"],
    ["/livestream", "/livestream.html"],
    ["/live", "/livestream.html"],
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
  const qty = Number(payload.ticketQuantity || 1);
  const price = Number(payload.ticketPriceCents || 0);
  const amountPaid = qty * price;

  if (env.DB) {
    await env.DB.batch([
      env.DB.prepare(`
        insert into event_registrations
          (id, event_id, full_name, email, ticket_quantity, amount_paid_cents, registration_code, created_at)
        values (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, payload.eventId, payload.fullName, payload.email, qty, amountPaid, regCode, createdAt),
      env.DB.prepare(`
        update events
        set tickets_sold = tickets_sold + ?
        where id = ?
      `).bind(qty, payload.eventId)
    ]);
  }

  return json({ ok: true, id, registrationCode: regCode, amountPaidCents: amountPaid, status: "registered" }, 201);
}

async function handleApi(request, env) {
  const requestId = crypto.randomUUID();

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    if (request.method === "OPTIONS") return json({ ok: true });
    if (path === "/api/status" && request.method === "GET") return await handleStatus(env);
    if (path === "/api/churches") return await handlePublicChurches(request, env);
    if (path === "/api/admin/churches") return await handleAdminChurches(request, env);
    if (path === "/api/events") return await handleEvents(request, env);
    if (path === "/api/auth/session" && request.method === "GET") return await handleAuthSession(request, env);

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

    return json({ ok: false, error: "not found" }, 404);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : "internal server error";

    console.error(JSON.stringify({
      level: "error",
      requestId,
      method: request.method,
      path: new URL(request.url).pathname,
      error: error instanceof Error ? error.message : String(error)
    }));

    return json({ ok: false, error: message, requestId }, status);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }

    const assetRes = await env.ASSETS.fetch(assetRequest(request));
    const newHeaders = new Headers(assetRes.headers);
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

export { constantTimeEqual, readJson, registrationCode };
