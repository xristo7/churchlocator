import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("member avatar menu opens a protected profile and account view", async () => {
  const [app, shell, profile, client] = await Promise.all([
    read("public/app.html"),
    read("public/app-shell.js"),
    read("public/account-profile.html"),
    read("public/auth-client.js")
  ]);

  assert.match(app, /data-shell-view="profile"/);
  assert.match(app, /Profile &amp; account/);
  assert.match(shell, /profile:\s*\{\s*source:\s*"account-profile\.html"/);
  assert.match(shell, /\["messages", "profile",/);
  assert.match(profile, /id="profile-avatar-input"/);
  assert.match(profile, /id="profile-details-form"/);
  assert.match(profile, /id="profile-password-form"/);
  assert.match(profile, /Security &amp; privacy/);
  assert.match(client, /async function updateProfile/);
  assert.match(client, /async function changePassword/);
  assert.match(client, /Authentication already succeeded/);
  assert.doesNotMatch(client, /catch\s*\{\s*clearSession\(\);\s*return \{ ok: false, user: null \}/);
});
