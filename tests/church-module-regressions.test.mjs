import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

test("church records reject unsafe media, normalize schedules, and do not substitute an invalid profile id", async () => {
  const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  const local = new Map();
  const document = {
    documentElement: { dataset: {} },
    body: { dataset: {}, style: {}, appendChild() {} },
    createElement: () => ({ addEventListener() {}, classList: { add() {}, remove() {}, contains() { return false; } } }),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  };
  const location = { href: "https://example.test/churches.html", origin: "https://example.test", search: "" };
  const context = vm.createContext({
    window: { document, location, addEventListener() {}, removeEventListener() {}, localStorage: null },
    document,
    location,
    localStorage: {
      getItem: key => local.get(key) ?? null,
      setItem: (key, value) => local.set(key, String(value)),
      removeItem: key => local.delete(key)
    },
    navigator: { clipboard: { writeText: async () => {} } },
    URL,
    URLSearchParams,
    console,
    setTimeout,
    clearTimeout
  });
  context.window.localStorage = context.localStorage;
  vm.runInContext(source.slice(source.indexOf("const MWE = (() => {"), source.indexOf("/* My Way member experience")), context);
  const MWE = context.window.MWE;

  assert.equal(MWE.getChurch("does-not-exist"), undefined);
  const normalized = MWE.normalizeChurch({
    id: "safe",
    name: "Safe Church",
    schedule: [["Sunday", "10:00"], null, ["Incomplete"]]
  });
  assert.deepEqual(Array.from(normalized.schedule, entry => Array.from(entry)), [["Sunday", "10:00"]]);
  assert.equal(MWE.safeImageUrl("javascript:alert(1)", "/assets/fallback.png"), "https://example.test/assets/fallback.png");
  assert.equal(MWE.safeImageUrl("https://user:pass@example.test/private.png", ""), "");
});

test("church profile avoids blocking third-party icon CSS and polling personal form fields", async () => {
  const [html, source] = await Promise.all([
    readFile(new URL("../public/church-profile.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8")
  ]);
  assert.doesNotMatch(html, /cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/);
  assert.match(html, /<script defer src="vendor\/lucide\.js">/);
  const profileStart = source.indexOf("function initProfilePage()");
  const profileEnd = source.indexOf("MWE.switchProfileTab", profileStart);
  const profileSource = source.slice(profileStart, profileEnd);
  assert.match(profileSource, /requestAnimationFrame\(renderProfileScrollEffects\)/);
  assert.doesNotMatch(profileSource, /setInterval\(/);
});
