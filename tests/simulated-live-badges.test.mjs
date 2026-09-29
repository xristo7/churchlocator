import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../public/simulated-live-badges.js", import.meta.url), "utf8");
const sandbox = { Intl, Date, Math, URL, URLSearchParams };
sandbox.window = sandbox;
vm.runInNewContext(source, sandbox);
const { computeBadge, formatStart } = sandbox.MWESimulatedLiveBadges;
const at = (iso) => Date.parse(iso);

test("play-as-live labels use a short weekday and 24h time in the stream zone", () => {
  assert.equal(formatStart(at("2026-09-27T07:00:00Z"), "Africa/Kampala"), "Sun 10:00");
  assert.equal(formatStart(at("2026-09-27T07:00:00Z"), "America/Edmonton"), "Sun 01:00");
  assert.equal(formatStart(at("2026-09-27T07:00:00Z"), null), "Sun 10:00");
  assert.equal(formatStart(at("2026-09-27T07:00:00Z"), "Not/AZone"), "Sun 10:00");
  assert.equal(formatStart(at("2026-09-27T21:00:00Z"), "Africa/Kampala"), "Mon 00:00");
});

test("play-as-live badges follow server time through upcoming, live, and ended", () => {
  const entry = {
    state: "upcoming",
    timezone: "Africa/Kampala",
    play: { startsAt: "2026-09-27T07:00:00.000Z", endsAt: "2026-09-27T08:30:00.000Z", slotId: "slot-1" },
    nextPlay: { startsAt: "2026-09-27T07:00:00.000Z", slotId: "slot-1", title: "Sunday Service" }
  };
  const before = computeBadge(entry, at("2026-09-27T06:59:59Z"));
  assert.equal(before.kind, "upcoming");
  assert.equal(before.label, "Starts Sun 10:00");
  assert.match(before.ariaLabel, /^Starts Sunday, 27 September 2026 at 10:00/);
  assert.match(before.title, /27 September 2026/);
  assert.equal(before.nextChangeMs, at("2026-09-27T07:00:00Z"));

  const live = computeBadge(entry, at("2026-09-27T07:00:00Z"));
  assert.equal(live.kind, "live");
  assert.equal(live.label, "Live now");
  assert.match(live.ariaLabel, /Sunday, 27 September 2026 at 10:00/);
  assert.equal(live.nextChangeMs, at("2026-09-27T08:30:00Z"));

  assert.equal(computeBadge(entry, at("2026-09-27T08:30:00Z")).kind, "none");

  const liveWithNext = {
    ...entry,
    state: "live",
    nextPlay: { startsAt: "2026-10-04T07:00:00.000Z", slotId: "slot-2", title: "Sunday Service" }
  };
  const ended = computeBadge(liveWithNext, at("2026-09-27T08:31:00Z"));
  assert.equal(ended.kind, "upcoming");
  assert.equal(ended.label, "Starts Sun 10:00");

  const startedNext = computeBadge(liveWithNext, at("2026-10-04T07:00:00Z"));
  assert.equal(startedNext.kind, "live");
  assert.equal(startedNext.needsRefresh, true);

  const tooFar = {
    state: "upcoming",
    timezone: "Africa/Kampala",
    play: { startsAt: "2026-10-05T07:00:00.000Z", endsAt: "2026-10-05T08:00:00.000Z", slotId: "far" },
    nextPlay: null
  };
  assert.equal(computeBadge(tooFar, at("2026-09-28T07:00:00Z")).kind, "none");
});

test("play-as-live badges stay hidden for none or unusable entries", () => {
  assert.equal(computeBadge({ state: "none", timezone: null, play: null, nextPlay: null }, at("2026-09-27T07:00:00Z")).kind, "none");
  assert.equal(computeBadge(null, at("2026-09-27T07:00:00Z")).kind, "none");
  assert.equal(computeBadge({ state: "upcoming", play: { startsAt: "bad" } }, at("2026-09-27T07:00:00Z")).kind, "none");
  assert.equal(computeBadge({
    state: "ended",
    timezone: "Africa/Kampala",
    play: { startsAt: "2026-09-27T07:00:00.000Z", endsAt: "2026-09-27T08:30:00.000Z", slotId: "slot-1" },
    nextPlay: null
  }, at("2026-09-27T08:40:00Z")).kind, "none");
});

test("seeker pages load the play-as-live badge assets with the cache key", async () => {
  const churches = await readFile(new URL("../public/churches.html", import.meta.url), "utf8");
  const profile = await readFile(new URL("../public/church-profile.html", import.meta.url), "utf8");
  for (const html of [churches, profile]) {
    assert.match(html, /simulated-live-badges\.css\?v=20260930simlive1/);
    assert.match(html, /simulated-live-badges\.js\?v=20260930simlive1/);
  }
  assert.match(churches, /data-church-grid/);
  assert.match(profile, /h1 class="church-hero-name"/);
});
