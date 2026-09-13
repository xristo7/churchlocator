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
              const [id, email, password_hash, password_salt, name, is_creator, created_at, last_login_at] = args;
              const row = { id, email, password_hash, password_salt, name, is_creator, created_at, last_login_at };
              usersById.set(id, row);
              usersByEmail.set(email, id);
              return { success: true };
            }
            if (normalized.startsWith("update users set last_login_at")) {
              const [lastLoginAt, id] = args;
              const row = usersById.get(id);
              if (row) row.last_login_at = lastLoginAt;
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
  const match = header.match(/mwe_session=([^;]*)/);
  return match ? match[1] : null;
}

function postJson(path, body, cookie) {
  const headers = { "content-type": "application/json" };
  if (cookie) headers.cookie = `mwe_session=${cookie}`;
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
}

function getWithCookie(path, cookie) {
  const headers = {};
  if (cookie) headers.cookie = `mwe_session=${cookie}`;
  return new Request(`https://example.test${path}`, { headers });
}

test("register creates a real account, hashes the password, and issues a session", async () => {
  const env = baseEnv();
  const response = await worker.fetch(
    postJson("/api/auth/register", { name: "Ada Lovelace", email: "Ada@Example.com ", password: "correct-horse" }),
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
  assert.notEqual(row.password_hash, "correct-horse");
  assert.ok(row.password_salt);

  const cookie = extractSessionCookie(response);
  assert.ok(cookie, "a session cookie should be set");
});

test("register rejects a duplicate email, a weak password, and a malformed email", async () => {
  const env = baseEnv();
  await worker.fetch(postJson("/api/auth/register", { name: "Ada", email: "dup@example.com", password: "correct-horse" }), env);

  const dup = await worker.fetch(postJson("/api/auth/register", { name: "Someone Else", email: "dup@example.com", password: "correct-horse" }), env);
  assert.equal(dup.status, 409);

  const weakPassword = await worker.fetch(postJson("/api/auth/register", { name: "Bob", email: "bob@example.com", password: "short" }), env);
  assert.equal(weakPassword.status, 400);

  const badEmail = await worker.fetch(postJson("/api/auth/register", { name: "Bob", email: "not-an-email", password: "correct-horse" }), env);
  assert.equal(badEmail.status, 400);
});

test("login rejects wrong passwords and unknown emails without leaking which", async () => {
  const env = baseEnv();
  await worker.fetch(postJson("/api/auth/register", { name: "Ada", email: "ada@example.com", password: "correct-horse" }), env);

  const wrongPassword = await worker.fetch(postJson("/api/auth/login", { email: "ada@example.com", password: "wrong-password" }), env);
  assert.equal(wrongPassword.status, 401);

  const unknownEmail = await worker.fetch(postJson("/api/auth/login", { email: "nobody@example.com", password: "correct-horse" }), env);
  assert.equal(unknownEmail.status, 401);
  assert.equal((await wrongPassword.json()).error, (await unknownEmail.json()).error);
});

test("temporary auth bypass accepts arbitrary credentials and issues a creator session", async () => {
  const bypassEnv = { ...baseEnv(), AUTH_BYPASS: "true" };
  const response = await worker.fetch(
    postJson("/api/auth/login", { email: "anyone@example.com", password: "anything" }),
    bypassEnv
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.authenticationBypassed, true);
  assert.equal(payload.user.isCreator, true);
  assert.match(response.headers.get("set-cookie") || "", /mwe_session=/);
});

test("a valid session cookie round-trips through /api/auth/session and clears on logout", async () => {
  const env = baseEnv();
  const registerResponse = await worker.fetch(
    postJson("/api/auth/register", { name: "Ada", email: "ada@example.com", password: "correct-horse" }),
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

test("creator registration marks the account as a creator immediately", async () => {
  const env = baseEnv();
  const response = await worker.fetch(
    postJson("/api/creator/register", { name: "Cee Creator", email: "creator@example.com", password: "correct-horse" }),
    env
  );
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.user.isCreator, true);
});

test("creator upgrade requires a valid session and flips an existing member account", async () => {
  const env = baseEnv();
  const noSession = await worker.fetch(postJson("/api/creator/upgrade", {}), env);
  assert.equal(noSession.status, 401);

  const registerResponse = await worker.fetch(
    postJson("/api/auth/register", { name: "Member Mary", email: "mary@example.com", password: "correct-horse" }),
    env
  );
  const cookie = extractSessionCookie(registerResponse);

  const upgrade = await worker.fetch(postJson("/api/creator/upgrade", {}, cookie), env);
  const upgradeBody = await upgrade.json();
  assert.equal(upgrade.status, 200);
  assert.equal(upgradeBody.user.isCreator, true);
});
