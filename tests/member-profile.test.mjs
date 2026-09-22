import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("member profile restores initials, device-picture selection, and account controls", async () => {
  const [app, shell, profile, profileJs, worker, client] = await Promise.all([
    read("public/app.html"), read("public/app-shell.js"), read("public/account-profile.html"), read("public/account-profile.js"), read("src/worker.js"), read("public/auth-client.js")
  ]);
  assert.match(app, /data-shell-view="profile"/);
  assert.match(app, /data-member-avatar-initials/);
  assert.match(shell, /profile:\s*\{\s*source:\s*"account-profile\.html"/);
  assert.match(profile, /id="profile-avatar-input"/);
  assert.match(profile, /id="profile-details-form"/);
  assert.match(profile, /id="profile-password-form"/);
  assert.match(profileJs, /purpose","profile/);
  assert.match(profileJs, /initials/);
  assert.match(worker, /member-avatars/);
  assert.match(worker, /\/api\/auth\/profile/);
  assert.match(worker, /\/api\/auth\/password/);
  assert.match(client, /async function updateProfile/);
  assert.match(client, /async function changePassword/);
});
