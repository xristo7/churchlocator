import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const studio = await fs.readFile(new URL("../public/creator-studio.js", import.meta.url), "utf8");
const grab = name => { const m = studio.match(new RegExp(`  function ${name}\\(.*`)); assert.ok(m, `${name} missing`); return m[0]; };
const helpers = new Function(`${grab("fieldControl")}\n${grab("isFieldComplete")}\n${grab("syncDuplicateFields")}\nreturn {fieldControl,isFieldComplete,syncDuplicateFields};`)();

const control = (name, value, extra = {}) => ({ name, value, type: "number", closest: () => null, checkValidity: () => true, ...extra });
const nodeList = items => Object.assign(Object.create({ [Symbol.iterator]: function* () { yield* items; }, length: items.length }), { length: items.length, ...items, [Symbol.iterator]: items[Symbol.iterator].bind(items) });

test("readiness resolves duplicated meditation fields (RadioNodeList) instead of crashing", () => {
  const step2 = control("durationMinutes", "10"), step3 = control("durationMinutes", "15");
  const form = { elements: { durationMinutes: nodeList([step2, step3]) } };
  assert.equal(helpers.fieldControl(form, "durationMinutes"), step3);
  assert.equal(helpers.isFieldComplete(step3), true);
  assert.equal(helpers.isFieldComplete(control("x", "  ")), false);
  assert.equal(helpers.fieldControl(form, "missing"), null);
});

test("editing one duplicated field keeps its twin in sync", () => {
  const a = control("selectedAudio", "bible"), b = control("selectedAudio", "worship");
  const form = { elements: { selectedAudio: nodeList([a, b]) } };
  helpers.syncDuplicateFields(form, b);
  assert.equal(a.value, "worship");
});

test("readiness tolerates required fields without a check mark (e.g. theme colour)", () => {
  assert.match(studio, /const mark=field\.querySelector\("\.cs-field-mark"\); if\(mark\) mark\.innerHTML/);
  assert.doesNotMatch(studio, /field\.querySelector\("\.cs-field-mark"\)\.innerHTML/);
});

test("audio upload cannot get stuck on 'Uploading your audio...'", () => {
  const upload = studio.slice(studio.indexOf("async function uploadAudio"), studio.indexOf("function bindImagePickers"));
  assert.match(upload, /try \{ updateReadiness\(\);/, "readiness refresh must be inside try so the request always runs");
  assert.match(upload, /new AbortController\(\)/);
  assert.match(upload, /signal:controller\.signal/);
  assert.match(upload, /finally \{ clearTimeout\(timer\); pendingUploads\.delete\(input\)/);
});

test("server accepts a meditation room without optional scripture or tone, as the studio describes them", async () => {
  const { validateEntity } = await import("../src/trusted-platform.js");
  const room = validateEntity("meditation", { title: "Be still", durationMinutes: 20, selectedAudio: "bible" });
  assert.deepEqual(room.verses, []);
  assert.equal(room.toneFreq, 432);
  const withAudio = validateEntity("meditation", { title: "Be still", toneFreq: 528, verses: [{ text: "Be still", ref: "Ps 46:10" }], audioSrc: "/media/creator-media/x.mp3" });
  assert.equal(withAudio.toneFreq, 528);
  assert.equal(withAudio.verses.length, 1);
  assert.throws(() => validateEntity("meditation", { title: "Bad", toneFreq: 5 }), /tone between 20 and 2000/);
});

test("server keeps the uploaded room MP3 and studio style settings", async () => {
  const { validateEntity } = await import("../src/trusted-platform.js");
  const room = validateEntity("meditation", { title: "Be still", audioSrc: "/media/creator-media/a.mp3", durationMinutes: 15, themeColor: "#4a5d3f", purpose: "prayer" });
  assert.equal(room.audioSrc, "/media/creator-media/a.mp3");
  assert.equal(room.durationMinutes, 15);
  assert.throws(() => validateEntity("meditation", { title: "x", audioSrc: "http://evil.example/a.mp3" }), /safe HTTPS/);
});
