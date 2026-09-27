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

  assert.match(app, /minlength="15" maxlength="128"/);
  assert.match(index, /minlength="15" maxlength="128"/);
  assert.match(app, /nameInput\.required = true/);
  assert.match(app, /if \(!form\.reportValidity\(\)\) return/);
  assert.match(app, /finally \{\s*if \(submitBtn\) submitBtn\.disabled = false;/);
});
