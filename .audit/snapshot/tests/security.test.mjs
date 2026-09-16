import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import worker, { readJson } from "../src/worker.js";
import { onRequest as pagesAdmin } from "../functions/api/admin/churches.js";

const assets = { fetch: async () => new Response("asset") };
const post = (path, body, headers = {}) => new Request("https://example.test" + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

test("body limit counts actual streamed bytes without Content-Length", async () => {
  const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(JSON.stringify({ request: "x".repeat(70000) }))); c.close(); } });
  await assert.rejects(readJson(new Request("https://example.test", { method: "POST", headers: { "content-type": "application/json" }, body, duplex: "half" })), error => error.status === 413);
});

test("JSON parsing rejects primitive bodies, unsafe keys, deep nesting, oversized fields and executable URLs", async () => {
  const values = [null, [], "text", { constructor: {} }, { email: "x".repeat(255) }, { password: "x".repeat(129) }, { livestreamUrl: "javascript:alert(1)" }, { image: "data:text/html,<script>alert(1)</script>" }, { request: "\u0000" }];
  let deep = {};
  for (let i = 0; i < 10; i++) deep = { child: deep };
  values.push(deep);
  for (const value of values) await assert.rejects(readJson(post("/api/prayer", value)), error => error.status === 400);
  await assert.rejects(readJson(new Request("https://example.test", { method: "POST", body: "{}" })), error => error.status === 415);
  assert.deepEqual(await readJson(post("/api/prayer", { request: "Please pray", livestreamUrl: "https://example.com/live" })), { request: "Please pray", livestreamUrl: "https://example.com/live" });
});

test("cross-origin mutations are rejected before database access", async () => {
  for (const path of ["/api/auth/login", "/api/auth/logout", "/api/creator/upgrade", "/api/prayer", "/api/event-register", "/api/admin/churches"]) {
    const response = await worker.fetch(post(path, {}, { origin: "https://attacker.test" }), { ASSETS: assets, DB: {} });
    assert.equal(response.status, 403, path);
  }
  assert.equal((await worker.fetch(post("/api/prayer", {}, { "sec-fetch-site": "cross-site" }), { ASSETS: assets, DB: {} })).status, 403);
});

test("production writes fail closed when rate-limit bindings are missing or exhausted", async () => {
  assert.equal((await worker.fetch(post("/api/auth/login", {}), { ASSETS: assets, DB: {}, ENVIRONMENT: "production" })).status, 503);
  const keys = [];
  const limiter = { async limit({ key }) { keys.push(key); return { success: false }; } };
  const response = await worker.fetch(post("/api/auth/login", {}, { "cf-connecting-ip": "192.0.2.3" }), { ASSETS: assets, DB: {}, AUTH_RATE_LIMITER: limiter });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(keys[0].includes("192.0.2.3"), false);
});

test("an email query never grants unauthenticated access to private bookings", async () => {
  let read = false;
  const DB = { prepare() { read = true; throw new Error("must not query"); } };
  const response = await worker.fetch(new Request("https://example.test/api/services/bookings?email=victim@example.com"), { ASSETS: assets, DB });
  assert.equal(response.status, 401);
  assert.equal(read, false);
});

test("legacy Pages admin route also fails closed without credentials", async () => {
  const response = await pagesAdmin({ request: new Request("https://example.test/api/admin/churches"), env: { ASSETS: assets, DB: {} } });
  assert.equal(response.status, 401);
});

test("livestream activation cannot impersonate another church anonymously", async () => {
  assert.equal((await worker.fetch(post("/api/livestream-activation", { churchId: "victim", livestreamUrl: "https://example.test/live" }), { ASSETS: assets, DB: {} })).status, 401);
});

test("registrations reject forged payments, negative quantities, fractions and nonexistent events", async () => {
  let writes = 0;
  const DB = { prepare() { return { bind() { return { first: async () => ({ id: "event", ticket_price_cents: 2500 }), run: async () => { writes++; return {}; } }; } }; } };
  const payload = { eventId: "event", fullName: "Visitor", email: "user@example.com", ticketQuantity: 1, ticketPriceCents: 0, amountPaidCents: 2500 };
  assert.equal((await worker.fetch(post("/api/event-register", payload), { ASSETS: assets, DB })).status, 409);
  for (const qty of [-1, 0, 1.5, 21, 1e30]) assert.equal((await worker.fetch(post("/api/event-register", { ...payload, ticketQuantity: qty }), { ASSETS: assets, DB })).status, 400);
  assert.equal(writes, 0);
  const missingDb = { prepare() { return { bind() { return { first: async () => null }; } }; } };
  assert.equal((await worker.fetch(post("/api/event-register", payload), { ASSETS: assets, DB: missingDb })).status, 404);
});

test("D1 trigger write counts are accepted while a guarded no-op is rejected", async () => {
  const payload = { eventId: "free", fullName: "Visitor", email: "user@example.com", ticketQuantity: 1 };
  for (const [changes, expected] of [[2, 201], [0, 409]]) {
    const DB = { prepare() { return { bind() { return { first: async () => ({ id: "free", ticket_price_cents: 0 }), run: async () => ({ meta: { changes } }) }; } }; } };
    assert.equal((await worker.fetch(post("/api/event-register", payload), { ASSETS: assets, DB })).status, expected);
  }
});

test("coarse location uses the requesting edge metadata and never returns IPs", async () => {
  const request = new Request("https://example.test/api/location");
  Object.defineProperty(request, "cf", { value: { city: "Nairobi", country: "KE", clientTcpRtt: 10 } });
  const response = await worker.fetch(request, { ASSETS: assets });
  assert.deepEqual(await response.json(), { city: "Nairobi", countryCode: "KE" });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("security headers apply to APIs and assets, and database errors do not leak to responses", async () => {
  for (const path of ["/", "/broadcast.html", "/api/status"]) {
    const response = await worker.fetch(new Request("https://example.test" + path), { ASSETS: assets });
    assert.match(response.headers.get("content-security-policy"), /object-src 'none'/);
    assert.match(response.headers.get("strict-transport-security"), /max-age=31536000/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
  const response = await worker.fetch(post("/api/auth/login", { email: "user@example.com", password: "a-long-password" }), { ASSETS: assets, DB: { prepare() { throw new Error("secret-database-error"); } } });
  assert.equal(response.status, 500);
  assert.equal((await response.text()).includes("secret-database-error"), false);
});

test("nested JavaScript attribute strings keep hostile quotes, backslashes and tags inert", async () => {
  const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  const start = source.indexOf("  function escapeHtml(value");
  const end = source.indexOf("  function slugify(text)", start);
  const context = vm.createContext({ URL, location: { href: "https://example.test/" } });
  vm.runInContext(source.slice(start, end), context);
  for (const url of ["javascript:alert(1)", "https://player.vimeo.com.attacker.invalid/video/1", "https://user:pass@www.youtube.com/embed/1", "http://www.youtube.com/embed/1", "https://attacker.invalid/"]) assert.equal(context.safeEmbedUrl(url), "about:blank");
  assert.equal(context.safeEmbedUrl("https://www.youtube.com/embed/1"), "https://www.youtube.com/embed/1");
  assert.equal(context.safeLinkUrl("javascript:alert(1)"), "#");
  assert.equal(context.safeLinkUrl("https://user:pass@example.test/"), "#");
  for (const value of ["');globalThis.attacked=true;//", "\\');globalThis.attacked=true;//", '<img src=x onerror="globalThis.attacked=true">', "O'Brien", "line\u2028break"]) {
    const encoded = context.escapeJsAttribute(value);
    const decoded = encoded.replaceAll("&quot;", '"').replaceAll("&#039;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
    const sandbox = vm.createContext({});
    vm.runInContext("globalThis.received='" + decoded + "'", sandbox);
    assert.equal(sandbox.received, value);
    assert.equal(sandbox.attacked, undefined);
  }
});

test("resource downloads reject executable destinations and preserve supported base64 files", async () => {
  const source = await readFile(new URL("../public/platform-modules.js", import.meta.url), "utf8");
  const context = vm.createContext({});
  vm.runInContext(source.slice(source.indexOf("  function safeAttachmentData("), source.indexOf("  const api = {")), context);
  for (const value of ["javascript:alert(1)", "data:text/html;base64,PHNjcmlwdD4=", "data:image/svg+xml;base64,PHN2Zz4=", "https://attacker.invalid/file", "data:application/pdf;base64,invalid!"]) assert.equal(context.safeAttachmentData(value), "");
  assert.equal(context.safeAttachmentData("data:application/pdf;base64,JVBERg=="), "data:application/pdf;base64,JVBERg==");
  assert.equal(context.safeAttachmentData("data:text/plain;base64,SGVsbG8="), "data:text/plain;base64,SGVsbG8=");
});

test("browser event registration only succeeds after server persistence and never writes local PII", async () => {
  const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  const calls = [];
  let accepted = false;
  const context = vm.createContext({ fetch: async (path, options) => { calls.push({ path, body: JSON.parse(options.body) }); return { ok: accepted, json: async () => accepted ? { ok: true, id: "trusted-id", registrationCode: "trusted-code", amountPaidCents: 0 } : { ok: false, error: "Paid registration requires a verified payment provider." } }; }, localStorage: { setItem() { throw new Error("PII must not be stored"); } } });
  vm.runInContext(source.slice(source.indexOf("  async function registerForEvent("), source.indexOf("  function getRegistrationsForEvent(")), context);
  const payload = { eventId: "event", fullName: "Visitor", email: "user@example.com", ticketQuantity: 1, amountPaidCents: 9999, ticketPriceCents: 9999 };
  await assert.rejects(context.registerForEvent(payload), /verified payment provider/);
  accepted = true;
  const result = await context.registerForEvent(payload);
  assert.equal(result.registrationCode, "trusted-code");
  assert.equal(result.amountPaidCents, 0);
  assert.deepEqual(calls[0], { path: "/api/event-register", body: { eventId: "event", fullName: "Visitor", email: "user@example.com", ticketQuantity: 1 } });
});
