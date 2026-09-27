import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../public/simulated-live-badges.js", import.meta.url), "utf8");
const sandbox = { Intl, Date, Math, URL, URLSearchParams };
sandbox.window = sandbox;
vm.runInNewContext(source, sandbox);
const { computeBadge, formatStart } = sandbox.MWESimulatedLiveBadges;
const at = iso => Date.parse(iso);

test("simulated-live badge formats start as weekday + 24h time in the stream zone", () => {
  assert.equal(formatStart(at("2026-09-27T07:00:00Z"), "Africa/Kampala"), "Sun 10:00");
  assert.equal(formatStart(at("2026-09-27T07:00:00Z"), "America/Edmonton"), "Sun 01:00");
  assert.equal(formatStart(at("2026-09-27T07:00:00Z"), null), "Sun 10:00");
  assert.equal(formatStart(at("2026-09-27T07:00:00Z"), "Not/AZone"), "Sun 10:00");
});

test("simulated-live badge follows server time across upcoming, live and ended", () => {
  const entry = {
    state: "upcoming", timezone: "Africa/Kampala",
    play: { startsAt: "2026-09-27T07:00:00.000Z", endsAt: "2026-09-27T08:30:00.000Z" },
    nextPlay: { startsAt: "2026-09-27T07:00:00.000Z", title: "Sunday Service" }
  };
  const before = computeBadge(entry, at("2026-09-27T06:59:59Z"));
  assert.equal(before.kind, "upcoming");
  assert.equal(before.label, "Starts Sun 10:00");
  assert.match(before.ariaLabel, /^Starts Sunday, 27 September 2026 at 10:00/);
  assert.equal(before.nextChangeMs, at("2026-09-27T07:00:00Z"));

  const live = computeBadge(entry, at("2026-09-27T07:00:00Z"));
  assert.equal(live.kind, "live");
  assert.equal(live.label, "Live now");
  assert.equal(live.nextChangeMs, at("2026-09-27T08:30:00Z"));

  assert.equal(computeBadge(entry, at("2026-09-27T08:30:00Z")).kind, "none");

  const liveWithNext = { ...entry, state: "live", nextPlay: { startsAt: "2026-10-04T07:00:00.000Z", title: "Sunday Service" } };
  const after = computeBadge(liveWithNext, at("2026-09-27T08:31:00Z"));
  assert.equal(after.kind, "upcoming");
  assert.equal(after.label, "Starts Sun 10:00");
});

test("simulated-live badge shows nothing for none or malformed entries", () => {
  assert.equal(computeBadge({ state: "none", timezone: null, play: null, nextPlay: null }, Date.now()).kind, "none");
  assert.equal(computeBadge(null, Date.now()).kind, "none");
  assert.equal(computeBadge({ state: "upcoming", play: { startsAt: "bad" } }, Date.now()).kind, "none");
});
