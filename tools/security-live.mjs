// Deliberately read-only: do not create accounts or exercise mutations on production.
import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const base = "https://my-way-of-evangelism.doxalight-inc.workers.dev";
const checks = [];
function check(name, actual, expected) {
  checks.push({ name, actual, expected });
  assert.deepEqual(actual, expected, name);
}
async function get(path) { return fetch(base + path, { method: "GET", redirect: "manual" }); }
try {
  const status = await (await get("/api/status")).json();
  check("production environment", status.environment, "production");
  check("authentication bypass disabled", status.security.authenticationBypassed, false);
  check("anonymous booking read denied", (await get("/api/services/bookings?email=security-audit-alice@example.invalid")).status, 401);
  check("anonymous administrator read denied", (await get("/api/admin/churches")).status, 401);
  check("no anonymous session", (await (await get("/api/auth/session")).json()).user, null);
  for (const file of (await readdir(new URL("../public/", import.meta.url))).filter(file => file.endsWith(".html"))) {
    const response = await get("/" + file);
    check("page returns without redirect loop: " + file, response.status, 200);
    check("page has CSP: " + file, response.headers.get("content-security-policy")?.includes("object-src 'none'"), true);
    check("page has HSTS: " + file, response.headers.get("strict-transport-security"), "max-age=31536000");
  }
  check("root returns without redirect loop", (await get("/")).status, 200);
  const checkout = await (await get("/checkout.html")).text();
  check("no card number/CVV inputs", /<input[^>]*(?:card-number|card-cvv|card-expiry)/i.test(checkout), false);
  const app = await (await get("/app.js")).text();
  check("browser registrations require server", app.includes('async function registerForEvent(reg)'), true);
  check("no third-party IP lookup", /ipapi\.co\/json|ip-api\.com\/json/.test(app), false);
  for (const record of JSON.parse(await readFile(new URL("../docs/security/vendor-provenance.json", import.meta.url), "utf8"))) {
    const response = await get("/" + record.file.replace(/^public\//, ""));
    check("vendor available: " + record.file, response.status, 200);
    const digest = createHash("sha256").update(new Uint8Array(await response.arrayBuffer())).digest("hex");
    check("vendor digest: " + record.file, digest, record.sha256);
  }
} finally {
  await writeFile(new URL("../docs/security/production-verification.json", import.meta.url), JSON.stringify({ date: new Date().toISOString(), environment: base, readOnly: true, version: process.argv[2] || null, migration: "0004_security.sql", checks }, null, 2) + "\n");
  console.log(JSON.stringify({ checks: checks.length, failures: checks.filter(item => JSON.stringify(item.actual) !== JSON.stringify(item.expected)) }, null, 2));
}
