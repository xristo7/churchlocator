import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/worker.js";

const assets = {
  fetch() {
    return new Response("asset", { status: 200 });
  }
};

// Minimal in-memory D1 stand-in covering exactly the queries the auth
// handlers in src/worker.js issue against the `users` and `sessions` tables.
function createMockDb() {
  const usersById = new Map();
  const usersByEmail = new Map();
  const sessions = new Map();

  function prepare(sql) {
    const normalized = sql.trim();
    return {
      bind(...args) {
        return {
          async run() {
            if (normalized.startsWith("insert into users")) {
              const googleAccount = normalized.includes("'authentication-disabled'");
              const [id, email, password_hash, password_salt, name, is_creator, created_at, last_login_at] = googleAccount
                ? [args[0], args[1], "authentication-disabled", "", args[2], 0, args[3], args[4]]
                : args;
              const row = { id, email, password_hash, password_salt, name, is_creator, created_at, last_login_at, email_verified_at: googleAccount ? args[5] : null };
              usersById.set(id, row);
              usersByEmail.set(email, id);
              return { success: true };
            }
            if (normalized.startsWith("update users set last_login_at")) {
              const [lastLoginAt, id] = args;
              const googleVerificationUpdate = normalized.includes("email_verified_at");
              const row = usersById.get(googleVerificationUpdate ? args[2] : id);
              if (row) {
                row.last_login_at = lastLoginAt;
                if (googleVerificationUpdate) row.email_verified_at ||= args[1];
              }
              return { success: true };
            }
            if (normalized.startsWith("update users set is_creator")) {
              const [id] = args;
              const row = usersById.get(id);
              if (row) row.is_creator = 1;
              return { success: true };
            }
            if (normalized.startsWith("insert into sessions")) {
              const [token, userId, createdAt, expiresAt] = args;
              sessions.set(token, { user_id: userId, created_at: createdAt, expires_at: expiresAt });
              return { success: true };
            }
            if (normalized.startsWith("delete from sessions where token")) {
              sessions.delete(args[0]);
              return { success: true };
            }
            throw new Error(`Unhandled mock SQL (run): ${normalized}`);
          },
          async first() {
            if (normalized.startsWith("select id from users where email")) {
              const id = usersByEmail.get(args[0]);
              return id ? { id } : null;
            }
            if (normalized.startsWith("select id, name, email, password_hash, password_salt, is_creator")) {
              const id = usersByEmail.get(args[0]);
              return id ? usersById.get(id) : null;
            }
            if (normalized.includes("from sessions s") && normalized.includes("join users u")) {
              const session = sessions.get(args[0]);
              if (!session) return null;
              const user = usersById.get(session.user_id);
              if (!user) return null;
              return { ...user, expires_at: session.expires_at };
            }
            throw new Error(`Unhandled mock SQL (first): ${normalized}`);
          },
          async all() {
            throw new Error(`Unhandled mock SQL (all): ${normalized}`);
          }
        };
      }
    };
  }

  return { prepare, _debug: { usersById, usersByEmail, sessions } };
}

function baseEnv() {
  return { ASSETS: assets, DB: createMockDb(), ENVIRONMENT: "test" };
}

function extractSessionCookie(response) {
  const header = response.headers.get("set-cookie") || "";
  const match = header.match(/mwe_session_v2=([^;]*)/);
  return match ? match[1] : null;
}

function postJson(path, body, cookie) {
  const headers = { "content-type": "application/json" };
  if (cookie) headers.cookie = `mwe_session_v2=${cookie}`;
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
}

function getWithCookie(path, cookie) {
  const headers = {};
  if (cookie) headers.cookie = `mwe_session_v2=${cookie}`;
  return new Request(`https://example.test${path}`, { headers });
}

test("register creates a real account, hashes the password, and issues a session", async () => {
  const env = baseEnv();
  const response = await worker.fetch(
    postJson("/api/auth/register", { name: "Ada Lovelace", email: "Ada@Example.com ", password: "correct-horse-battery" }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.ok, true);
  assert.equal(body.user.email, "ada@example.com");
  assert.equal(body.user.isCreator, false);

  const stored = env.DB._debug.usersByEmail.get("ada@example.com");
  assert.ok(stored, "user should be persisted");
  const row = env.DB._debug.usersById.get(stored);
  assert.notEqual(row.password_hash, "correct-horse-battery");
  assert.ok(row.password_salt);

  const cookie = extractSessionCookie(response);
  assert.ok(cookie, "a session cookie should be set");
});

test("registration ignores a forged creator flag", async () => {
  const env = baseEnv();
  const response = await worker.fetch(
    postJson("/api/auth/register", { name: "Member", email: "member@example.com", password: "correct-horse-battery", isCreator: true }),
    env
  );
  assert.equal((await response.json()).user.isCreator, false);
});

test("register rejects a duplicate email, a weak password, and a malformed email", async () => {
  const env = baseEnv();
  await worker.fetch(postJson("/api/auth/register", { name: "Ada", email: "dup@example.com", password: "correct-horse-battery" }), env);

  const dup = await worker.fetch(postJson("/api/auth/register", { name: "Someone Else", email: "dup@example.com", password: "correct-horse-battery" }), env);
  assert.equal(dup.status, 409);

  const weakPassword = await worker.fetch(postJson("/api/auth/register", { name: "Bob", email: "bob@example.com", password: "short" }), env);
  assert.equal(weakPassword.status, 400);

  const badEmail = await worker.fetch(postJson("/api/auth/register", { name: "Bob", email: "not-an-email", password: "correct-horse-battery" }), env);
  assert.equal(badEmail.status, 400);
});

test("login rejects wrong passwords and unknown emails without leaking which", async () => {
  const env = baseEnv();
  await worker.fetch(postJson("/api/auth/register", { name: "Ada", email: "ada@example.com", password: "correct-horse-battery" }), env);

  const wrongPassword = await worker.fetch(postJson("/api/auth/login", { email: "ada@example.com", password: "wrong-password" }), env);
  assert.equal(wrongPassword.status, 401);

  const unknownEmail = await worker.fetch(postJson("/api/auth/login", { email: "nobody@example.com", password: "correct-horse-battery" }), env);
  assert.equal(unknownEmail.status, 401);
  assert.equal((await wrongPassword.json()).error, (await unknownEmail.json()).error);
});

test("stale auth bypass settings never accept arbitrary credentials", async () => {
  const env = { ...baseEnv(), AUTH_BYPASS: "true" };
  const response = await worker.fetch(postJson("/api/auth/login", { email: "anyone@example.com", password: "anything" }), env);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("a valid session cookie round-trips through /api/auth/session and clears on logout", async () => {
  const env = baseEnv();
  const registerResponse = await worker.fetch(
    postJson("/api/auth/register", { name: "Ada", email: "ada@example.com", password: "correct-horse-battery" }),
    env
  );
  const cookie = extractSessionCookie(registerResponse);

  const sessionResponse = await worker.fetch(getWithCookie("/api/auth/session", cookie), env);
  const sessionBody = await sessionResponse.json();
  assert.equal(sessionBody.user.email, "ada@example.com");

  await worker.fetch(postJson("/api/auth/logout", {}, cookie), env);

  const afterLogout = await worker.fetch(getWithCookie("/api/auth/session", cookie), env);
  const afterLogoutBody = await afterLogout.json();
  assert.equal(afterLogoutBody.user, null);
});

test("legacy creator registration is a member registration and cannot self-upgrade", async () => {
  const env = baseEnv();
  const response = await worker.fetch(
    postJson("/api/creator/register", { name: "Cee Creator", email: "creator@example.com", password: "correct-horse-battery" }),
    env
  );
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.user.isCreator, false);
});

test("creator upgrade requires a valid session and flips an existing member account", async () => {
  const env = baseEnv();
  const noSession = await worker.fetch(postJson("/api/creator/upgrade", {}), env);
  assert.equal(noSession.status, 401);

  const registerResponse = await worker.fetch(
    postJson("/api/auth/register", { name: "Member Mary", email: "mary@example.com", password: "correct-horse-battery" }),
    env
  );
  const cookie = extractSessionCookie(registerResponse);

  const upgrade = await worker.fetch(postJson("/api/creator/upgrade", {}, cookie), env);
  const upgradeBody = await upgrade.json();
  assert.equal(upgrade.status, 200);
  assert.equal(upgradeBody.user.isCreator, true);
});

test("session cookies are hardened and stored only as hashes", async () => {
  const env = baseEnv();
  const response = await worker.fetch(postJson("/api/auth/register", { name: "Member", email: "member@example.com", password: "correct-horse-battery" }), env);
  const cookie = extractSessionCookie(response);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  assert.match(response.headers.get("set-cookie"), /Secure/);
  assert.match(response.headers.get("set-cookie"), /SameSite=Lax/);
  assert.match(response.headers.get("set-cookie"), /Max-Age=86400/);
  assert.equal(env.DB._debug.sessions.has(cookie), false);
  assert.match([...env.DB._debug.sessions.keys()][0], /^v2:/);
  const oldCookie = new Request("https://example.test/api/auth/session", { headers: { cookie: "mwe_session=" + cookie } });
  assert.equal((await (await worker.fetch(oldCookie, env)).json()).user, null);
});

test("expired or malformed session expiries never authenticate", async () => {
  for (const expiry of ["invalid", "2000-01-01T00:00:00Z"]) {
    const env = baseEnv();
    const response = await worker.fetch(postJson("/api/auth/register", { name: "Member", email: "member@example.com", password: "correct-horse-battery" }), env);
    const cookie = extractSessionCookie(response);
    [...env.DB._debug.sessions.values()][0].expires_at = expiry;
    assert.equal((await (await worker.fetch(getWithCookie("/api/auth/session", cookie), env)).json()).user, null);
  }
});

test("Google sign-in starts an authorization-code flow with a protected return path", async () => {
  const env = { ...baseEnv(), GOOGLE_CLIENT_ID: "client.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "secret" };
  const response = await worker.fetch(new Request("https://example.test/api/auth/google/start?next=%2Fmember"), env);

  assert.equal(response.status, 302);
  const location = new URL(response.headers.get("location"));
  assert.equal(location.origin, "https://accounts.google.com");
  assert.equal(location.searchParams.get("response_type"), "code");
  assert.equal(location.searchParams.get("redirect_uri"), "https://example.test/api/auth/google/callback");
  assert.match(response.headers.get("set-cookie"), /mwe_google_oauth_state=/);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  assert.match(response.headers.get("set-cookie"), /SameSite=Lax/);
});

test("Google callback creates a verified account and issues an app session", async () => {
  const env = { ...baseEnv(), GOOGLE_CLIENT_ID: "client.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "secret" };
  const start = await worker.fetch(new Request("https://example.test/api/auth/google/start?next=%2Fmember"), env);
  const authorizationUrl = new URL(start.headers.get("location"));
  const state = authorizationUrl.searchParams.get("state");
  const stateCookie = start.headers.get("set-cookie").split(";")[0];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    if (String(url) === "https://oauth2.googleapis.com/token") {
      assert.match(String(init.body), /grant_type=authorization_code/);
      return Response.json({ access_token: "google-access-token" });
    }
    if (String(url) === "https://openidconnect.googleapis.com/v1/userinfo") {
      assert.equal(init.headers.authorization, "Bearer google-access-token");
      return Response.json({ sub: "google-user-123", name: "Grace Hopper", email: "Grace@Example.com", email_verified: true });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const callback = new Request(`https://example.test/api/auth/google/callback?code=auth-code&state=${encodeURIComponent(state)}`, {
      headers: { cookie: stateCookie }
    });
    const response = await worker.fetch(callback, env);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/member");
    assert.ok(extractSessionCookie(response));
    const id = env.DB._debug.usersByEmail.get("grace@example.com");
    assert.equal(id, "google:google-user-123");
    assert.equal(env.DB._debug.usersById.get(id).password_hash, "authentication-disabled");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Google callback rejects a mismatched OAuth state before contacting Google", async () => {
  const env = { ...baseEnv(), GOOGLE_CLIENT_ID: "client.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "secret" };
  const request = new Request("https://example.test/api/auth/google/callback?code=auth-code&state=attacker", {
    headers: { cookie: "mwe_google_oauth_state=expected.Lw" }
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/?auth_error=google_state");
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
});
