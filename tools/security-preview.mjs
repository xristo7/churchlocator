import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { writeFile, readdir } from "node:fs/promises";

const base = "https://my-way-of-evangelism-preview.doxalight-inc.workers.dev";
const checks = [];
async function request(path, { body, cookie, headers = {} } = {}) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual"
  });
  let json;
  try { json = await response.clone().json(); } catch {}
  return { response, json };
}
function check(name, actual, expected) {
  checks.push({ name, actual, expected });
  assert.deepEqual(actual, expected, name);
}
const cookie = result => result.response.headers.get("set-cookie")?.split(";")[0];
try {
  const status = await request("/api/status");
  check("preview environment", status.json.environment, "preview");
  check("auth bypass disabled", status.json.security.authenticationBypassed, false);
  check("anonymous bookings rejected even with email query", (await request("/api/services/bookings?email=security-audit-alice@example.invalid")).response.status, 401);
  check("anonymous admin request rejected", (await request("/api/admin/churches")).response.status, 401);
  check("cross-origin write rejected", (await request("/api/prayer", { body: { request: "Synthetic audit request" }, headers: { origin: "https://attacker.invalid" } })).response.status, 403);
  const password = randomBytes(24).toString("hex");
  const alice = await request("/api/auth/register", { body: { name: "Synthetic audit Alice", email: "security-audit-alice@example.invalid", password } });
  check("real account registration", alice.response.status, 201);
  check("hardened cookie", /HttpOnly.*SameSite=Lax.*Max-Age=86400.*Secure/.test(alice.response.headers.get("set-cookie")), true);
  const bob = await request("/api/auth/register", { body: { name: "Synthetic audit Bob", email: "security-audit-bob@example.invalid", password } });
  check("second account registration", bob.response.status, 201);
  check("wrong password rejected", (await request("/api/auth/login", { body: { email: "security-audit-alice@example.invalid", password: "incorrect-password" } })).response.status, 401);
  const booking = await request("/api/services/book", { cookie: cookie(alice), body: { serviceId: "security-audit-service", serviceTitle: "Synthetic audit inquiry", customerName: "Synthetic Alice", customerEmail: "security-audit-bob@example.invalid", requestedDate: "2099-01-01", userId: bob.json.user.id } });
  check("authenticated service inquiry", booking.response.status, 201);
  const bobBookings = await request("/api/services/bookings?email=security-audit-alice@example.invalid", { cookie: cookie(bob) });
  check("other account cannot read inquiry, even when listed as contact email", bobBookings.json.bookings.length, 0);
  const aliceBookings = await request("/api/services/bookings?email=security-audit-bob@example.invalid", { cookie: cookie(alice) });
  check("trusted user ID owns inquiry", aliceBookings.json.bookings.length, 1);
  const registration = { eventId: "security-audit-20260915-free", fullName: "Synthetic Visitor", email: "security-audit-alice@example.invalid", ticketQuantity: 1 };
  const concurrent = await Promise.all([1, 2, 3].map(() => request("/api/event-register", { body: registration })));
  check("concurrent capacity protection", concurrent.filter(item => item.response.status === 201).length, 2);
  check("full event denied", concurrent.filter(item => item.response.status === 409).length, 1);
  check("forged paid admission rejected", (await request("/api/event-register", { body: { ...registration, eventId: "security-audit-20260915-paid", ticketPriceCents: 0, amountPaidCents: 2500 } })).response.status, 409);
  check("logout succeeds", (await request("/api/auth/logout", { body: {}, cookie: cookie(alice) })).response.status, 200);
  check("logged-out cookie cannot replay", (await request("/api/auth/session", { cookie: cookie(alice) })).json.user, null);
  await request("/api/auth/logout", { body: {}, cookie: cookie(bob) });
  for (const file of (await readdir(new URL("../public/", import.meta.url))).filter(file => file.endsWith(".html"))) {
    const result = await request("/" + file);
    check("page returns without redirect loop: " + file, result.response.status, 200);
    check("page security policy: " + file, result.response.headers.get("content-security-policy")?.includes("object-src 'none'"), true);
  }
  check("root returns without redirect loop", (await request("/")).response.status, 200);
} finally {
  await writeFile(new URL("../docs/security/preview-verification.json", import.meta.url), JSON.stringify({ date: new Date().toISOString(), environment: base, checks }, null, 2) + "\n");
  console.log(JSON.stringify({ checks: checks.length, failures: checks.filter(item => JSON.stringify(item.actual) !== JSON.stringify(item.expected)) }, null, 2));
}
