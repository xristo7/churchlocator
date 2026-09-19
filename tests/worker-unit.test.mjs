import assert from "node:assert/strict";
import test from "node:test";

import worker, {
  constantTimeEqual,
  readJson,
  registrationCode
} from "../src/worker.js";

const assets = {
  fetch() {
    return new Response("asset", { status: 200 });
  }
};

test("constantTimeEqual compares complete values", () => {
  assert.equal(constantTimeEqual("Bearer secret", "Bearer secret"), true);
  assert.equal(constantTimeEqual("Bearer secret", "Bearer other"), false);
  assert.equal(constantTimeEqual("short", "longer"), false);
});

test("registrationCode uses a stable, non-sequential format", () => {
  const first = registrationCode();
  const second = registrationCode();

  assert.match(first, /^REG-[A-F0-9]{12}$/);
  assert.match(second, /^REG-[A-F0-9]{12}$/);
  assert.notEqual(first, second);
});

test("readJson rejects malformed and oversized request bodies", async () => {
  await assert.rejects(
    readJson(new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bad"
    })),
    error => error.status === 400
  );

  await assert.rejects(
    readJson(new Request("https://example.test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(65 * 1024)
      },
      body: "{}"
    })),
    error => error.status === 413
  );
});

test("status is available while storage-backed routes fail honestly", async () => {
  const env = { ASSETS: assets, ENVIRONMENT: "test" };
  const statusResponse = await worker.fetch(
    new Request("https://example.test/api/status"),
    env
  );
  const status = await statusResponse.json();

  assert.equal(statusResponse.status, 200);
  assert.equal(status.storage.d1Bound, false);
  assert.equal(status.security.adminAuthorizationConfigured, false);

  const churchesResponse = await worker.fetch(
    new Request("https://example.test/api/churches"),
    env
  );
  assert.equal(churchesResponse.status, 503);
});

test("admin APIs fail closed when no secret is configured", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/admin/churches"),
    { ASSETS: assets, DB: {}, ENVIRONMENT: "test" }
  );

  assert.equal(response.status, 401);
});

test("public church catalog is read-only and cannot bypass the application workflow", async () => {
  let queried = false;
  const DB = { prepare() { queried = true; throw new Error("must not query"); } };
  const response = await worker.fetch(new Request("https://example.test/api/churches", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Unreviewed church" })
  }), { ASSETS: assets, DB, ENVIRONMENT: "test" });
  assert.equal(response.status, 405);
  assert.equal(queried, false);
});

test("API error boundary converts malformed JSON into a 400 response", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/prayer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bad"
    }),
    { ASSETS: assets, DB: {}, ENVIRONMENT: "test" }
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "invalid JSON body");
  assert.match(body.requestId, /^[0-9a-f-]{36}$/);
});
