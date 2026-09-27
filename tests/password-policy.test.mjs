import assert from "node:assert/strict";
import test from "node:test";

import { validateNewPassword, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "../src/password-policy.js";
import { validateNewPassword as reexported } from "../src/identity-security.js";

test("new-password policy accepts a password meeting every requirement", () => {
  assert.equal(PASSWORD_MIN_LENGTH, 8);
  assert.equal(PASSWORD_MAX_LENGTH, 128);
  assert.deepEqual(validateNewPassword("Valid-pass1"), { ok: true, missing: [] });
  assert.equal(validateNewPassword("Aa1!aaaa").ok, true);
  assert.equal(validateNewPassword("Aa1 " + "x".repeat(124)).ok, true);
  assert.equal(reexported, validateNewPassword);
});

test("new-password policy reports each missing requirement", () => {
  const cases = [
    ["Aa1!aaa", ["length"], "at least 8 characters"],
    ["valid-pass1", ["uppercase"], "an uppercase letter"],
    ["VALID-PASS1", ["lowercase"], "a lowercase letter"],
    ["Valid-pass", ["number"], "a number"],
    ["Validpass1", ["symbol"], "a symbol"]
  ];
  for (const [pw, missing, label] of cases) {
    const result = validateNewPassword(pw);
    assert.equal(result.ok, false, pw);
    assert.deepEqual(result.missing, missing, pw);
    assert.equal(result.error, `Password must include: ${label}.`);
  }
  const empty = validateNewPassword("");
  assert.deepEqual(empty.missing, ["length", "uppercase", "lowercase", "number", "symbol"]);
  assert.equal(empty.error, "Password must include: at least 8 characters, an uppercase letter, a lowercase letter, a number, a symbol.");
  assert.equal(validateNewPassword(undefined).ok, false);
  assert.equal(validateNewPassword(12345678).ok, false);
});

test("new-password policy rejects passwords longer than 128 characters", () => {
  const result = validateNewPassword("Aa1!" + "x".repeat(125));
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ["max_length"]);
  assert.equal(result.error, "Password must be 128 characters or fewer.");
});
