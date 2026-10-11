import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import worker from "../src/worker.js";
import { emailProvider, resetEmailContent } from "../src/password-email.js";

const assets = { fetch() { return new Response("asset", { status: 200 }); } };

function createDb() {
  const users = new Map();
  const tokens = new Map();
  const sessions = new Map();
  const db = {
    users, tokens, sessions,
    prepare(sql) {
      const q = sql.trim().replace(/\s+/g, " ");
      const exec = (args) => ({
        async first() {
          if (q.startsWith("select id, email, password_hash from users where email = ?")) return [...users.values()].find(u => u.email === args[0]) || null;
          if (q.startsWith("select count(*) as n from password_reset_tokens")) return { n: [...tokens.values()].filter(t => t.user_id === args[0] && t.created_at > args[1]).length };
          if (q.startsWith("select digest, user_id, expires_at, used_at from password_reset_tokens")) return tokens.get(args[0]) || null;
          throw new Error("unexpected first(): " + q);
        },
        async run() {
          if (q.startsWith("update password_reset_tokens set used_at = ? where user_id = ? and used_at is null")) {
            for (const t of tokens.values()) if (t.user_id === args[1] && !t.used_at) t.used_at = args[0];
            return { meta: { changes: 1 } };
          }
          if (q.startsWith("insert into password_reset_tokens")) {
            const [digest, user_id, expires_at, created_at] = args;
            tokens.set(digest, { digest, user_id, expires_at, used_at: null, created_at });
            return { meta: { changes: 1 } };
          }
          if (q.startsWith("update password_reset_tokens set used_at = ?")) {
            const t = tokens.get(args[1]);
            if (!t || t.used_at) return { meta: { changes: 0 } };
            t.used_at = args[0];
            return { meta: { changes: 1 } };
          }
          if (q.startsWith("update users set password_hash = ?")) {
            const u = users.get(args[3]); u.password_hash = args[0]; u.password_salt = args[1];
            return { meta: { changes: 1 } };
          }
          if (q.startsWith("update users set email_verified_at = coalesce")) {
            const u = users.get(args[1]); if (!u.email_verified_at) u.email_verified_at = args[0];
            return { meta: { changes: 1 } };
          }
          if (q.startsWith("delete from sessions where user_id = ?")) {
            for (const [k, s] of sessions) if (s.user_id === args[0]) sessions.delete(k);
            return { meta: { changes: 1 } };
          }
          throw new Error("unexpected run(): " + q);
        }
      });
      return { bind: (...args) => exec(args) };
    }
  };
  return db;
}

function setup(extraEnv = {}) {
  const DB = createDb();
  DB.users.set("u1", { id: "u1", email: "member@church.test", password_hash: "pbkdf2-sha256$100000$old", password_salt: "c2FsdA==" });
  DB.users.set("g1", { id: "g1", email: "google@church.test", password_hash: "authentication-disabled", password_salt: "" });
  DB.sessions.set("s1", { user_id: "u1" });
  const sent = [];
  const env = { ASSETS: assets, DB, ENVIRONMENT: "test", PUBLIC_ORIGIN: "https://example.test",
    EMAIL_FROM: "My Way <no-reply@example.test>", EMAIL: { async send(msg) { sent.push(msg); } }, ...extraEnv };
  return { env, DB, sent };
}

const post = (env, path, body) => worker.fetch(new Request("https://example.test" + path, {
  method: "POST", headers: { "content-type": "application/json", origin: "https://example.test" }, body: JSON.stringify(body)
}), env, { waitUntil() {} });

const tokenFrom = (msg) => decodeURIComponent(/token=([^\s"&<]+)/.exec(msg.text)[1]);

test("forgot-password returns the same generic response for known, unknown and Google-only emails", async () => {
  const { env, sent } = setup();
  const responses = [];
  for (const email of ["member@church.test", "nobody@church.test", "google@church.test", "not-an-email"]) {
    const res = await post(env, "/api/auth/forgot-password", { email });
    assert.equal(res.status, 200);
    responses.push(await res.json());
  }
  assert.ok(responses.every(r => JSON.stringify(r) === JSON.stringify(responses[0])));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "member@church.test");
  assert.match(sent[0].text, /https:\/\/example\.test\/reset-password\?token=/);
});

test("only a digest of the token is stored, with a 45 minute expiry", async () => {
  const { env, DB, sent } = setup();
  await post(env, "/api/auth/forgot-password", { email: "member@church.test" });
  const token = tokenFrom(sent[0]);
  const stored = [...DB.tokens.values()].find(t => !t.used_at);
  assert.notEqual(stored.digest, token);
  assert.match(stored.digest, /^v2:/);
  const minutes = (Date.parse(stored.expires_at) - Date.parse(stored.created_at)) / 60000;
  assert.equal(Math.round(minutes), 45);
});

test("reset-password updates the hash, is single use, and signs out all sessions", async () => {
  const { env, DB, sent } = setup();
  await post(env, "/api/auth/forgot-password", { email: "member@church.test" });
  const token = tokenFrom(sent[0]);
  const ok = await post(env, "/api/auth/reset-password", { token, newPassword: "a brand new long passphrase" });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).ok, true);
  assert.notEqual(DB.users.get("u1").password_hash, "pbkdf2-sha256$100000$old");
  assert.match(DB.users.get("u1").password_hash, /^pbkdf2-sha256\$100000\$/);
  assert.equal(DB.sessions.size, 0);
  const again = await post(env, "/api/auth/reset-password", { token, newPassword: "another long passphrase here" });
  assert.equal(again.status, 400);
});

test("reset-password rejects expired, unknown and short-password requests", async () => {
  const { env, DB, sent } = setup();
  await post(env, "/api/auth/forgot-password", { email: "member@church.test" });
  const token = tokenFrom(sent[0]);
  const short = await post(env, "/api/auth/reset-password", { token, newPassword: "short" });
  assert.equal(short.status, 400);
  assert.equal((await post(env, "/api/auth/reset-password", { token: "nope", newPassword: "a brand new long passphrase" })).status, 400);
  for (const t of DB.tokens.values()) t.expires_at = new Date(Date.now() - 1000).toISOString();
  assert.equal((await post(env, "/api/auth/reset-password", { token, newPassword: "a brand new long passphrase" })).status, 400);
  assert.equal(DB.users.get("u1").password_hash, "pbkdf2-sha256$100000$old");
});

test("per-account throttle caps reset emails at 3 per 15 minutes", async () => {
  const { env, sent } = setup();
  for (let i = 0; i < 5; i++) await post(env, "/api/auth/forgot-password", { email: "member@church.test" });
  assert.ok(sent.length <= 3);
});

test("no provider: link is logged outside production and never returned in the API response", async () => {
  const { env } = setup({ EMAIL: undefined, EMAIL_FROM: undefined });
  const logs = []; const orig = console.log; console.log = (...a) => logs.push(a.join(" "));
  try {
    const res = await post(env, "/api/auth/forgot-password", { email: "member@church.test" });
    assert.doesNotMatch(await res.text(), /token/);
  } finally { console.log = orig; }
  assert.ok(logs.some(l => /reset-password\?token=/.test(l)));
  assert.equal(emailProvider({}), "none");
  assert.equal(emailProvider({ RESEND_API_KEY: "x", EMAIL_FROM: "a@b.c" }), "resend");
  assert.match(resetEmailContent("https://x/reset").text, /45 minutes/);
});

test("reset page and in-sheet forgot step are wired up", async () => {
  const page = await readFile(new URL("../public/reset-password.html", import.meta.url), "utf8");
  const shell = await readFile(new URL("../public/app-shell.js", import.meta.url), "utf8");
  const migration = await readFile(new URL("../migrations/0025_password_reset_tokens.sql", import.meta.url), "utf8");
  assert.match(page, /autocomplete="new-password"/);
  assert.match(page, /reset-confirm-password/);
  assert.match(shell, /\/api\/auth\/forgot-password/);
  assert.match(migration, /create table if not exists password_reset_tokens/);
});
