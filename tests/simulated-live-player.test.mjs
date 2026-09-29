import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('public/simulated-live-player.js', 'utf8');
const sandbox = { URL, URLSearchParams, Date, Math, setTimeout, clearTimeout, console };
sandbox.window = sandbox;
vm.runInNewContext(source, sandbox);
const Sim = sandbox.MWESimLive;
const { logic, parseNowPlaying } = Sim;

const T0 = Date.parse('2026-09-27T18:00:00.000Z');
const iso = ms => new Date(ms).toISOString();
// Shape mirrors computeNowPlaying() in src/simulated-live.js plus the handler's { ok, serverTime }.
const liveLoopJson = (overrides = {}) => ({
  ok: true, serverTime: iso(T0), state: 'live',
  stream: { id: 's1', title: 'Evening Prayer', videoUrl: '/media/church-video/abc.mp4', durationSeconds: 600, playMode: 'loop', timezone: 'Africa/Kampala' },
  timezone: 'Africa/Kampala', poster: null, slotId: 'slot-1',
  play: { startsAt: iso(T0 - 1_300_000), endsAt: iso(T0 + 3_600_000), slotId: 'slot-1' },
  offsetSeconds: 100, loopIteration: 2, nextPlay: { startsAt: iso(T0 + 86_400_000), slotId: 'slot-2', title: 'Sunday Worship' },
  ...overrides
});

test('simlive: global name and CSS prefix do not clash with the church setup panel', () => {
  assert.ok(Sim && typeof Sim.mount === 'function');
  assert.equal(sandbox.MWESimulatedLive, undefined);
  const css = fs.readFileSync('public/simulated-live-player.css', 'utf8');
  assert.doesNotMatch(css, /\.sl-/);
});

test('simlive adapter: converts ISO serverTime and seconds to ms and normalizes optional fields', () => {
  const m = parseNowPlaying(liveLoopJson());
  assert.equal(m.serverNow, T0);
  assert.equal(m.state, 'live');
  assert.equal(m.stream.durationMs, 600_000);
  assert.equal(m.stream.mode, 'loop');
  assert.equal(m.stream.poster, '');
  assert.equal(m.stream.slotId, 'slot-1');
  assert.equal(m.play.slotId, 'slot-1');
  assert.equal(m.timezone, 'Africa/Kampala');
  assert.equal(m.moderationLocked, false);
  assert.equal(m.next.slotId, 'slot-2');
  assert.equal(m.offsetMs, 100_000);
  assert.equal(m.loopIteration, 2);
  assert.equal(m.play.endsAt, T0 + 3_600_000);
  assert.equal(m.next.title, 'Sunday Worship');
  const opt = parseNowPlaying(liveLoopJson({ poster: 'https://cdn.example.org/p.jpg', slotId: 'slot-9', timezone: null, stream: { id: 's1', title: 'x', videoUrl: 'https://cdn.example.org/v.mp4', durationSeconds: 60, playMode: 'once', timezone: 'America/Edmonton' } }));
  assert.equal(opt.timezone, 'America/Edmonton', 'falls back to stream.timezone');
  assert.equal(opt.stream.poster, 'https://cdn.example.org/p.jpg');
  assert.equal(opt.stream.slotId, 'slot-9');
  assert.equal(opt.stream.mode, 'once');
  const ignoredPosterUrl = parseNowPlaying(liveLoopJson({ posterUrl: 'https://cdn.example.org/wrong.jpg' }));
  assert.equal(ignoredPosterUrl.stream.poster, '', 'posterUrl is not a public field');
  const publicPoster = parseNowPlaying(liveLoopJson({ poster: 'https://cdn.example.org/right.jpg', posterUrl: 'https://cdn.example.org/wrong.jpg' }));
  assert.equal(publicPoster.stream.poster, 'https://cdn.example.org/right.jpg');
});

test('simlive adapter: tolerates none/null payloads, unknown states and unsafe video URLs', () => {
  const none = parseNowPlaying({ ok: true, serverTime: iso(T0), state: 'none', stream: null, timezone: null, poster: null, slotId: null, play: null, offsetSeconds: 0, loopIteration: 0, nextPlay: null });
  assert.equal(none.state, 'none');
  assert.equal(none.stream, null);
  assert.equal(none.play, null);
  assert.equal(none.timezone, null);
  const legacy = parseNowPlaying({ state: 'none', offsetSeconds: null, loopIteration: null });
  assert.equal(legacy.offsetMs, null);
  assert.equal(legacy.loopIteration, null);
  const locked = parseNowPlaying(liveLoopJson({ moderationLocked: true }));
  assert.equal(locked.state, 'none', 'moderationLocked forces the neutral offline state');
  assert.equal(logic.nextState(locked, T0).view, 'none');
  assert.equal(parseNowPlaying({ state: 'paused' }).state, 'none');
  assert.equal(logic.safeVideoUrl('javascript:alert(1)'), '');
  assert.equal(logic.safeVideoUrl('http://insecure.example/v.mp4'), '');
  assert.equal(logic.safeVideoUrl('//evil.example/v.mp4'), '');
  assert.equal(logic.safeVideoUrl('/media/church-video/a.mp4'), '/media/church-video/a.mp4');
});

test('simlive: clock skew uses the request midpoint', () => {
  assert.equal(logic.computeSkew(10_500, 1_000, 2_000), 9_000);
  assert.equal(logic.computeSkew(1_500, 1_000, 2_000), 0);
  assert.equal(logic.computeSkew(500, 1_000, 2_000), -1_000);
  assert.equal(logic.computeSkew(NaN, 1_000, 2_000), 0);
});

test('simlive: loop offset wraps modulo duration and advances with corrected time', () => {
  const m = parseNowPlaying(liveLoopJson());
  assert.equal(logic.liveOffset(m, T0).offsetMs, 100_000);
  assert.equal(logic.liveOffset(m, T0 + 30_000).offsetMs, 130_000);
  const wrapped = logic.liveOffset(m, T0 + 520_000);
  assert.equal(wrapped.offsetMs, 20_000);
  assert.equal(wrapped.ended, false);
  assert.equal(wrapped.iteration, 3);
});

test('simlive: once offset grows until duration, then reports ended', () => {
  const m = parseNowPlaying(liveLoopJson({ stream: { id: 'o', title: 'Sermon', videoUrl: '/media/church-video/o.mp4', durationSeconds: 120, playMode: 'once' }, offsetSeconds: 100, loopIteration: 0 }));
  const a = logic.liveOffset(m, T0 + 10_000);
  assert.equal(a.offsetMs, 110_000);
  assert.equal(a.ended, false);
  assert.equal(logic.liveOffset(m, T0 + 20_000).ended, true);
  assert.equal(logic.liveOffset(m, T0 + 25_000).offsetMs, 120_000);
});

test('simlive: offset falls back to serverTime - play.startsAt when offsetSeconds is missing', () => {
  const m = parseNowPlaying(liveLoopJson({ offsetSeconds: null, loopIteration: null, stream: { id: 'o', title: 'x', videoUrl: '/v.mp4', durationSeconds: 3000, playMode: 'once' } }));
  assert.equal(logic.liveOffset(m, T0).offsetMs, 1_300_000);
});

test('simlive: max-seek clamp blocks scrubbing past the live edge but allows going back', () => {
  assert.equal(logic.clampSeek(50, 40), 40);
  assert.equal(logic.clampSeek(40.8, 40), 40.8);
  assert.equal(logic.clampSeek(10, 40), 10);
  assert.equal(logic.clampSeek(-3, 40), 0);
  assert.equal(logic.clampSeek(NaN, 40), 40);
});

test('simlive: drift is measured circularly for loops', () => {
  assert.equal(logic.driftMs(1_000, 599_000, 600_000, true), 2_000);
  assert.equal(logic.driftMs(1_000, 599_000, 600_000, false), 598_000);
});

test('simlive: countdown formatting covers d/h/m/s plus a screen-reader phrase', () => {
  const long = logic.formatCountdown(93_784_000);
  assert.equal(long.text, '1d 02h 03m 04s');
  assert.equal(long.spoken, '1 day, 2 hours, 3 minutes');
  assert.equal(logic.formatCountdown(3_723_000).text, '1h 02m 03s');
  assert.equal(logic.formatCountdown(65_000).text, '1m 05s');
  assert.equal(logic.formatCountdown(45_000).spoken, 'Less than a minute');
  assert.equal(logic.formatCountdown(-5).text, '0m 00s');
  assert.equal(logic.formatCountdown(-5).spoken, 'Starting now');
});

test('simlive: state transitions (upcoming, live, once end, ended, none)', () => {
  const upcoming = parseNowPlaying({ ok: true, serverTime: iso(T0), state: 'upcoming', stream: { id: 'u', title: 'Worship', videoUrl: '/v.mp4', durationSeconds: 60, playMode: 'loop' }, play: { startsAt: iso(T0 + 60_000), endsAt: iso(T0 + 120_000) }, nextPlay: { startsAt: iso(T0 + 60_000) } });
  const u1 = logic.nextState(upcoming, T0 + 1_000);
  assert.equal(u1.view, 'upcoming');
  assert.equal(u1.refetch, false);
  assert.equal(u1.target, T0 + 60_000);
  assert.equal(logic.nextState(upcoming, T0 + 60_000).refetch, true);

  const loop = parseNowPlaying(liveLoopJson());
  assert.equal(logic.nextState(loop, T0 + 1_000).view, 'live');
  const past = logic.nextState(loop, T0 + 3_600_000);
  assert.equal(past.view, 'live');
  assert.equal(past.refetch, true, 'loop plays until play.endsAt, then refetches');

  const once = parseNowPlaying(liveLoopJson({ stream: { id: 'o', title: 'x', videoUrl: '/v.mp4', durationSeconds: 120, playMode: 'once' }, play: { startsAt: iso(T0 - 100_000), endsAt: iso(T0 + 20_000) }, offsetSeconds: 100, loopIteration: 0 }));
  assert.equal(logic.nextState(once, T0).view, 'live');
  assert.equal(logic.nextState(once, T0, { videoEnded: true }).view, 'ended');
  assert.equal(logic.nextState(once, T0 + 20_000).view, 'ended');
  assert.equal(logic.nextState(once, T0 + 20_000).refetch, true);
  assert.equal(logic.nextState(once, T0, { mediaError: true }).view, 'error');

  const ended = parseNowPlaying({ ok: true, serverTime: iso(T0), state: 'ended', stream: null, play: null, nextPlay: { startsAt: iso(T0 + 5_000), title: 'Next' } });
  assert.equal(logic.nextState(ended, T0).view, 'ended');
  assert.equal(logic.nextState(ended, T0).refetch, false);
  assert.equal(logic.nextState(ended, T0 + 5_000).refetch, true);

  const none = parseNowPlaying({ state: 'none', serverTime: iso(T0) });
  assert.equal(logic.nextState(none, T0).view, 'none');
  assert.equal(logic.nextState(none, T0, { mediaError: true }).view, 'none', 'a moderation pause wins over a stale media error');
  assert.equal(logic.nextState(null, T0).view, 'loading');
  const noVideo = parseNowPlaying(liveLoopJson({ stream: { id: 'x', title: 'x', videoUrl: '', durationSeconds: 10, playMode: 'loop' } }));
  assert.equal(logic.nextState(noVideo, T0).view, 'error');
});

test('simlive: mock fixtures match the contract; none is offline, not a paused state', () => {
  const parse = (name, at) => parseNowPlaying(Sim.mockResponse(Sim.fixtures[name], T0, at, { scenario: name }));
  const realKeys = ['ok', 'serverTime', 'state', 'stream', 'timezone', 'poster', 'slotId', 'play', 'offsetSeconds', 'loopIteration', 'nextPlay'].sort();
  assert.deepEqual(Object.keys(Sim.fixtures).sort(), ['broken', 'ended', 'live-loop', 'live-once', 'none', 'upcoming']);
  for (const name of Object.keys(Sim.fixtures)) {
    assert.deepEqual(Object.keys(Sim.mockResponse(Sim.fixtures[name], T0, T0, { scenario: name })).sort(), realKeys, name + ' uses the real response keys');
  }
  assert.equal(parse('upcoming', T0).state, 'upcoming');
  const loop = parse('live-loop', T0);
  assert.equal(loop.state, 'live');
  assert.equal(loop.offsetMs, 7_000);
  assert.equal(loop.loopIteration, 2);
  assert.equal(parse('live-once', T0).state, 'live');
  assert.equal(parse('live-once', T0 + 9_000).state, 'ended');
  assert.equal(parse('ended', T0).state, 'ended');
  assert.ok(parse('ended', T0).next);
  assert.equal(loop.stream.videoUrl, '', 'live mocks without simMockVideo have no video');
  assert.equal(logic.nextState(loop, T0).view, 'error');
  const withVideo = parseNowPlaying(Sim.mockResponse(Sim.fixtures['live-loop'], T0, T0, { scenario: 'live-loop', videoUrl: 'https://cdn.example.org/service.mp4' }));
  assert.equal(withVideo.stream.videoUrl, 'https://cdn.example.org/service.mp4');
  assert.equal(logic.nextState(withVideo, T0).view, 'live');
  assert.match(parse('broken', T0).stream.videoUrl, /^\/media\/church-video\//);
  const offline = parse('none', T0);
  assert.equal(offline.state, 'none');
  assert.equal(offline.stream, null);
  assert.equal(offline.play, null);
  assert.equal(offline.next, null);
  assert.equal(logic.nextState(offline, T0).view, 'none');
  assert.equal(logic.nextState(parseNowPlaying(liveLoopJson()), T0).view, 'live');
  assert.equal(logic.nextState(offline, T0, { mediaError: true }).view, 'none', 'state none stops a live view, including a moderation pause');
  for (const name of Object.keys(Sim.fixtures)) {
    const raw = Sim.mockResponse(Sim.fixtures[name], T0, T0, { scenario: name });
    assert.equal(typeof raw.serverTime, 'string');
    assert.ok(['none', 'upcoming', 'live', 'ended'].includes(raw.state));
    assert.ok(!('error' in raw), 'contract has no error field');
  }
});

test('simlive: mock fetch honours simMockIn and simMockSkew', async () => {
  let clock = T0;
  const fetchMock = Sim.createMockFetch('upcoming', { now: () => clock, skewMs: 90_000, startInSec: 30, latencyMs: 0 });
  const first = parseNowPlaying(await (await fetchMock()).json());
  assert.equal(first.state, 'upcoming');
  assert.equal(first.serverNow, T0 + 90_000);
  assert.equal(first.play.startsAt, T0 + 90_000 + 30_000);
  clock = T0 + 31_000;
  assert.equal(parseNowPlaying(await (await fetchMock()).json()).state, 'live');
});

test('simlive: church time zone shown next to viewer local time', () => {
  const at = Date.parse('2026-09-28T07:00:00.000Z');
  const t = logic.formatChurchAndLocal(at, 'Africa/Kampala', 'America/Edmonton', 'en-US');
  assert.match(t.local, /Mon, Sep 28, 1:00\sAM/);
  assert.match(t.church, /Mon,? 10:00\sAM (EAT|GMT\+3)/);
  assert.equal(t.zone, 'Africa/Kampala');
  assert.equal(t.sameZone, false);
  assert.equal(logic.formatChurchAndLocal(at, 'Africa/Kampala', 'Africa/Kampala', 'en-US').sameZone, true);
  const bad = logic.formatChurchAndLocal(at, 'Not/AZone', 'UTC', 'en-US');
  assert.equal(bad.church, '');
  assert.ok(bad.local);
  assert.equal(logic.validTimeZone('Africa/Kampala'), true);
});

test('simlive: church resolution (?sim, ?simMock, flagged record)', () => {
  const churches = [{ id: 'a', livestream: { type: 'simulated' } }, { id: 'b', livestream: { url: 'https://youtube.com/x' } }];
  assert.equal(Sim.resolveChurchId(new URLSearchParams('sim=grace'), churches), 'grace');
  assert.equal(Sim.resolveChurchId(new URLSearchParams('simMock=live-loop'), churches), 'demo-church');
  assert.equal(Sim.resolveChurchId(new URLSearchParams('id=a&type=simulated'), churches), 'a');
  assert.equal(Sim.resolveChurchId(new URLSearchParams('id=b'), churches), null);
  assert.equal(Sim.resolveChurchId(new URLSearchParams(''), churches), null);
});

test('simlive: livestream.html wiring keeps the external embed and uses the new cache-bust', () => {
  const html = fs.readFileSync('public/livestream.html', 'utf8');
  const app = fs.readFileSync('public/app.js', 'utf8');
  const canonical = fs.readFileSync('public/livestream-canonical.js', 'utf8');
  const css = fs.readFileSync('public/simulated-live-player.css', 'utf8');
  assert.match(html, /simulated-live-player\.js\?v=20260930simlive1/);
  assert.match(html, /simulated-live-player\.css\?v=20260930simlive1/);
  assert.match(html, /livestream-canonical\.js\?v=20260930simlive1/);
  assert.match(html, /id="main-player-iframe"/);
  assert.doesNotMatch(app, /MWESimLive/, 'the player self-bootstraps; app.js stays untouched');
  assert.match(source, /function autoMountLivestreamPage\(\)/);
  assert.match(source, /MWEPlatform\?\.ready/);
  assert.match(css, /body\.simlive-active #streams-landing-view \{ display: none !important; \}/);
  assert.match(app, /broadcast\.html\?type=church&id=/, 'external livestream redirect still present');
  assert.match(canonical, /params\.get\("sim"\)/);
  assert.match(canonical, /broadcast\.html\?type=/);
  assert.match(css, /prefers-reduced-motion: reduce\)\s*\{\s*\.simlive-live-dot\s*\{\s*animation: none/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /"\/api\/churches\/" \+ encodeURIComponent\(options\.churchId\) \+ "\/now-playing"/);
  assert.match(source, /cache: "no-store"/);
  assert.match(source, /LOAD_TIMEOUT_MS = 15000/);
  assert.match(source, /simMock=upcoming\|live-loop\|live-once\|ended\|broken\|none/);
  assert.doesNotMatch(source, /This stream is paused/);
  assert.equal(source.includes("posterUrl"), false);
});
