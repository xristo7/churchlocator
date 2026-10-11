import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import worker from "../src/worker.js";
import { verificationEmailContent, resetEmailContent } from "../src/password-email.js";

const assets = { fetch() { return new Response("asset", { status: 200 }); } };

function createDb() {
  const users = new Map(), codes = new Map(), sessions = new Map();
  const byEmail = e => [...users.values()].find(u => u.email === e) || null;
  return {
    users, codes, sessions,
    prepare(sql) {
      const q = sql.trim().replace(/\s+/g, " ");
      const exec = args => ({
        async first() {
          if (q.startsWith("select id from users where email = ?")) return byEmail(args[0]);
          if (q.startsWith("select id, name, email, password_hash, password_salt, is_creator, email_verified_at, totp_secret_encrypted from users where email = ?")) return byEmail(args[0]);
          if (q.startsWith("select id, name, email, password_hash, is_creator, email_verified_at from users where email = ?")) return byEmail(args[0]);
          if (q.startsWith("select id, email, password_hash, email_verified_at from users where email = ?")) return byEmail(args[0]);
          if (q.startsWith("select last_sent_at, expires_at from email_verification_codes")) return codes.get(args[0]) || null;
          if (q.startsWith("select code_digest, expires_at, attempts from email_verification_codes")) return codes.get(args[0]) || null;
          throw new Error("unexpected first(): " + q);
        },
        async run() {
          if (q.startsWith("insert into users")) {
            const [id, email, password_hash, password_salt, name, is_creator, created_at, last_login_at] = args;
            users.set(id, { id, email, password_hash, password_salt, name, is_creator, created_at, last_login_at, email_verified_at: null });
            return {};
          }
          if (q.startsWith("insert into email_verification_codes")) {
            const [user_id, code_digest, expires_at, last_sent_at, created_at] = args;
            codes.set(user_id, { user_id, code_digest, expires_at, attempts: 0, last_sent_at, created_at });
            return {};
          }
          if (q.startsWith("update email_verification_codes set attempts = attempts + 1")) { codes.get(args[0]).attempts += 1; return {}; }
          if (q.startsWith("update users set email_verified_at = ?, last_login_at = ?")) { users.get(args[2]).email_verified_at = args[0]; return {}; }
          if (q.startsWith("delete from email_verification_codes")) { codes.delete(args[0]); return {}; }
          if (q.startsWith("insert into sessions")) { sessions.set(args[0], { user_id: args[1] }); return {}; }
          if (q.startsWith("update users set last_login_at")) return {};
          throw new Error("unexpected run(): " + q);
        }
      });
      return { bind: (...a) => exec(a) };
    }
  };
}

function setup(extra = {}) {
  const DB = createDb(); const sent = [];
  const env = { ASSETS: assets, DB, ENVIRONMENT: "test", REQUIRE_EMAIL_VERIFICATION: "true", PUBLIC_ORIGIN: "https://example.test",
    EMAIL_FROM: "My Way <no-reply@example.test>", EMAIL: { async send(m) { sent.push(m); } }, ...extra };
  return { env, DB, sent };
}
const post = (env, path, body) => worker.fetch(new Request("https://example.test" + path, {
  method: "POST", headers: { "content-type": "application/json", origin: "https://example.test" }, body: JSON.stringify(body)
}), env, { waitUntil() {} });
const codeFrom = m => /\b(\d{6})\b/.exec(m.subject)[1];
const PW = "a very long test passphrase";

test("signup sends a 6-digit code and creates no session until verified", async () => {
  const { env, DB, sent } = setup();
  const res = await post(env, "/api/auth/register", { name: "Grace", email: "grace@church.test", password: PW });
  assert.equal(res.status, 202);
  const body = await res.json();
  assert.equal(body.verificationRequired, true);
  assert.equal(res.headers.get("set-cookie"), null);
  assert.equal(DB.sessions.size, 0);
  assert.equal(sent.length, 1);
  assert.match(codeFrom(sent[0]), /^\d{6}$/);
  const stored = DB.codes.get("local:grace@church.test");
  assert.ok(!stored.code_digest.includes(codeFrom(sent[0])));
  assert.equal(Math.round((Date.parse(stored.expires_at) - Date.parse(stored.created_at)) / 60000), 15);
});

test("unverified accounts cannot sign in and resume verification", async () => {
  const { env, sent } = setup();
  await post(env, "/api/auth/register", { name: "Grace", email: "grace@church.test", password: PW });
  const login = await post(env, "/api/auth/login", { email: "grace@church.test", password: PW });
  assert.equal(login.status, 403);
  assert.equal((await login.json()).verificationRequired, true);
  assert.equal(sent.length, 1, "login within cooldown reuses the active code");
});

test("correct code verifies the email and signs in; codes are single use", async () => {
  const { env, DB, sent } = setup();
  await post(env, "/api/auth/register", { name: "Grace", email: "grace@church.test", password: PW });
  const ok = await post(env, "/api/auth/verify-email", { email: "grace@church.test", code: codeFrom(sent[0]) });
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get("set-cookie") || "", /mwe_session_v2=/);
  assert.ok(DB.users.get("local:grace@church.test").email_verified_at);
  assert.equal(DB.codes.size, 0);
  const again = await post(env, "/api/auth/verify-email", { email: "grace@church.test", code: codeFrom(sent[0]) });
  assert.equal(again.status, 409);
});

test("wrong codes are limited to 5 attempts", async () => {
  const { env, sent } = setup();
  await post(env, "/api/auth/register", { name: "Grace", email: "grace@church.test", password: PW });
  const real = codeFrom(sent[0]);
  const wrong = real === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++) assert.equal((await post(env, "/api/auth/verify-email", { email: "grace@church.test", code: wrong })).status, 400);
  const locked = await post(env, "/api/auth/verify-email", { email: "grace@church.test", code: real });
  assert.equal(locked.status, 429);
});

test("expired codes are rejected", async () => {
  const { env, DB, sent } = setup();
  await post(env, "/api/auth/register", { name: "Grace", email: "grace@church.test", password: PW });
  DB.codes.get("local:grace@church.test").expires_at = new Date(Date.now() - 1000).toISOString();
  assert.equal((await post(env, "/api/auth/verify-email", { email: "grace@church.test", code: codeFrom(sent[0]) })).status, 400);
});

test("resend honours the cooldown and is generic for unknown emails", async () => {
  const { env, DB, sent } = setup();
  await post(env, "/api/auth/register", { name: "Grace", email: "grace@church.test", password: PW });
  const r1 = await (await post(env, "/api/auth/resend-verification", { email: "grace@church.test" })).json();
  assert.equal(sent.length, 1);
  assert.ok(r1.cooldown > 0);
  DB.codes.get("local:grace@church.test").last_sent_at = new Date(Date.now() - 61000).toISOString();
  await post(env, "/api/auth/resend-verification", { email: "grace@church.test" });
  assert.equal(sent.length, 2);
  const unknown = await post(env, "/api/auth/resend-verification", { email: "nobody@church.test" });
  assert.equal(unknown.status, 200);
});

test("verification is off unless REQUIRE_EMAIL_VERIFICATION is true (existing behaviour)", async () => {
  const { env, DB } = setup({ REQUIRE_EMAIL_VERIFICATION: undefined });
  const res = await post(env, "/api/auth/register", { name: "Grace", email: "grace@church.test", password: PW });
  assert.equal(res.status, 201);
  assert.equal(DB.sessions.size, 1);
});

test("branded templates: table layout, inline CSS, dark mode, plain-text fallback", async () => {
  const v = verificationEmailContent("123456", "My Way of Evangelism", "https://example.test");
  const r = resetEmailContent("https://example.test/reset-password?token=abc", "My Way of Evangelism", "https://example.test");
  for (const m of [v, r]) {
    assert.match(m.html, /role="presentation"/);
    assert.match(m.html, /prefers-color-scheme: dark/);
    assert.match(m.html, /assets\/email-logo\.png/);
    assert.ok(m.text.length > 40 && !/</.test(m.text));
  }
  assert.match(v.html, /123456/);
  assert.match(r.html, /Choose a new password/);
  const migration = await readFile(new URL("../migrations/0026_email_verification_codes.sql", import.meta.url), "utf8");
  assert.match(migration, /email_verification_codes/);
  assert.match(migration, /update users\s+set email_verified_at/);
});
