import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(".");

test("account form matches the server password policy and requires a name for registration", async () => {
  const [app, index] = await Promise.all([
    fs.readFile(path.join(root, "public", "app.js"), "utf8"),
    fs.readFile(path.join(root, "public", "index.html"), "utf8")
  ]);

  // Sign-in keeps an 8-character floor so existing users are not blocked client-side;
  // register mode raises it to the server's 15-character policy.
  assert.match(app, /id="nav-auth-password"[^>]*minlength="8" maxlength="128"/);
  assert.match(index, /id="nav-auth-password"[^>]*minlength="8" maxlength="128"/);
  assert.match(app, /passwordInput\.minLength = 15/);
  assert.match(app, /passwordInput\.minLength = 8/);
  assert.match(app, /nameInput\.required = true/);
  assert.match(app, /if \(!form\.reportValidity\(\)\) return/);
  assert.match(app, /finally \{\s*if \(submitBtn\) submitBtn\.disabled = false;/);
});
