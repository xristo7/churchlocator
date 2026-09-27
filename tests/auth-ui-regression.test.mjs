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

  // Sign-in enforces no length or complexity so legacy passwords keep working;
  // register mode switches on the shared new-password policy (8+ chars, upper, lower, number, symbol).
  assert.match(app, /id="nav-auth-password"[^>]*maxlength="128"/);
  assert.match(index, /id="nav-auth-password"[^>]*maxlength="128"/);
  assert.doesNotMatch(app, /id="nav-auth-password"[^>]*minlength=/);
  assert.doesNotMatch(index, /id="nav-auth-password"[^>]*minlength=/);
  assert.doesNotMatch(app, /minLength = 15|15 to 128/);
  assert.match(app, /passwordInput\.minLength = 8;/);
  assert.match(app, /passwordInput\.setAttribute\("data-password-policy", ""\)/);
  assert.match(app, /passwordInput\.removeAttribute\("minlength"\)/);
  assert.match(app, /nameInput\.required = true/);
  assert.match(app, /if \(!form\.reportValidity\(\)\) return/);
  assert.match(app, /finally \{\s*if \(submitBtn\) submitBtn\.disabled = false;/);
});

test("every new-password field uses the shared policy and sign-in fields stay unchecked", async () => {
  const read = file => fs.readFile(path.join(root, "public", file), "utf8");
  const [profile, security, portal, livestream, workspace, app, owner, index, appHtml] = await Promise.all(
    ["account-profile.html", "account-security.html", "church-portal.html", "livestream.html", "creator-workspace.html", "app.js", "owner-dashboard.html", "index.html", "app.html"].map(read)
  );
  const policyInput = /<input[^>]*data-password-policy[^>]*>/g;
  for (const [name, html, count] of [["account-profile", profile, 1], ["account-security", security, 1], ["church-portal", portal, 1], ["livestream", livestream, 1], ["creator-workspace", workspace, 1], ["app.js", app, 1]]) {
    const inputs = html.match(policyInput) || [];
    assert.equal(inputs.length, count, name);
    for (const input of inputs) {
      assert.match(input, /minlength="8"/, name);
      assert.match(input, /maxlength="128"/, name);
      assert.doesNotMatch(input, /current-password/, name);
    }
  }
  for (const html of [profile, security, portal, livestream, workspace, index, appHtml]) {
    assert.match(html, /<script defer src="password-policy\.js\?v=[^"]+"><\/script>/);
  }
  for (const html of [profile, security, portal, owner, app, livestream]) {
    for (const input of html.match(/<input[^>]*current-password[^>]*>/g) || []) assert.doesNotMatch(input, /data-password-policy|minlength/);
  }
  assert.doesNotMatch(owner, /data-password-policy/);
  assert.doesNotMatch(profile + security, /minlength="15"|at least 15/i);
});

test("client password policy mirrors the server validator", async () => {
  const { validateNewPassword } = await import("../src/password-policy.js");
  const source = await fs.readFile(path.join(root, "public", "password-policy.js"), "utf8");
  const window = {};
  const document = { readyState: "complete", documentElement: {}, querySelectorAll: () => [] };
  class MutationObserver { observe() {} }
  new Function("window", "document", "MutationObserver", source)(window, document, MutationObserver);
  const pattern = new RegExp("^(?:" + window.MWEPasswordPolicy.PATTERN + ")$", "v");
  for (const pw of ["", "short", "Sh0rt!", "alllowercase1!", "ALLUPPER1!", "NoDigits!!", "NoSymbol123", "Valid-pass1", "Aa1!" + "x".repeat(124), "Aa1!" + "x".repeat(125)]) {
    const client = window.MWEPasswordPolicy.check(pw), server = validateNewPassword(pw);
    assert.equal(client.ok, server.ok, pw);
    assert.deepEqual(client.missing, server.missing, pw);
    assert.equal(pattern.test(pw), server.ok, pw);
  }
});
