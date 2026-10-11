import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { MINISTRIES, ministrySlugs, normalizeMinistry, ministryLabel } from "../src/ministries.js";
import { validateEntity } from "../src/trusted-platform.js";

test("canonical ministry list has 26 unique slugs with labels and descriptions", () => {
  assert.equal(MINISTRIES.length, 26);
  assert.equal(new Set(MINISTRIES.map(m => m.slug)).size, 26);
  for (const m of MINISTRIES) assert.ok(m.label && m.description);
});

test("legacy filter values map to canonical slugs", () => {
  assert.deepEqual(ministrySlugs(["Kids & Children", "Youth & Students", "Prayer Groups", "Worship Team", "Free Sunday Transportation"]),
    ["children", "youth", "prayer", "worship-music", "transportation"]);
  assert.equal(normalizeMinistry("kids"), "children");
  assert.equal(normalizeMinistry("worship"), "worship-music");
  assert.equal(normalizeMinistry("Rhapsody"), null);
  assert.equal(ministryLabel("youth"), "Youth Ministry");
});

test("browser and server ministry lists stay in sync", async () => {
  const src = await readFile(new URL("../public/ministries.js", import.meta.url), "utf8");
  const ctx = {}; ctx.window = ctx; vm.runInNewContext(src, ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.MWEMinistries.list)), MINISTRIES);
});

test("church records store canonical slugs and keep unknown legacy text", () => {
  const data = validateEntity("churches", { name: "Grace", city: "Kampala", country: "UG", ministries: ["Kids", "prayer", "Rhapsody", "Kids & Children"] });
  assert.deepEqual(data.ministries, ["children", "prayer", "Rhapsody"]);
});
