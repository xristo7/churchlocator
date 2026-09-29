/*
 * Simulated live ("play as live") viewer player.
 *
 * Plays a scheduled, pre-recorded MP4 as if it were live. The server returns the
 * current live offset. The client corrects for clock skew, stops viewers from
 * scrubbing past the live edge, and resyncs when the tab wakes, the network
 * returns, playback stalls, or on a periodic timer.
 *
 * Public API (window.MWESimLive; distinct from the church setup panel's window.MWESimulatedLive):
 *   mount(el, { churchId, fetchImpl?, now?, mock?, onUpdate? }) -> controller
 *   mountLivestreamPage(churchId, options?)   livestream.html wiring helper
 *   resolveChurchId(params, churches)         ?sim= / flagged record detection
 *   parseNowPlaying(json)                     the ONLY place that knows the API shape
 *   logic.*                                   pure timing helpers (unit tested)
 *   fixtures / createMockFetch(scenario)      ?simMock= demo mode
 *
 * QA with no schedule (livestream.html):
 *   ?simMock=upcoming|live-loop|live-once|ended|broken|none
 * Live mocks (live-loop, live-once) need a video. No MP4 is committed.
 * Without ?simMockVideo=<https .mp4 or same-origin path>, those mocks
 * have an empty video URL and show the broken-video screen.
 * A moderation pause is API state "none" (inactive streams are omitted).
 * There is no paused viewer state. State "none" stops playback and shows not-live.
 */
(function (root) {
  "use strict";

  const LIVE_TOLERANCE_SEC = 1;       // allowed slack past the live edge before snapping back
  const BEHIND_THRESHOLD_SEC = 3;     // show "Back to live" when further behind than this
  const DRIFT_THRESHOLD_MS = 2000;    // resync correction threshold
  const RESYNC_INTERVAL_MS = 60000;
  const STALL_RESYNC_MS = 5000;
  const LOAD_TIMEOUT_MS = 15000;
  const MAX_STALL_RESYNCS = 3;
  const MIN_REFETCH_GAP_MS = 2000;

  /* ------------------------------------------------------------------ */
  /* Adapter: the only function that knows the API contract shape.       */
  /* GET /api/churches/:churchId/now-playing                              */
  /* ------------------------------------------------------------------ */
  const STATES = ["none", "upcoming", "live", "ended"];

  function toMs(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function safeVideoUrl(value) {
    const url = String(value || "").trim();
    if (!url) return "";
    if (url.startsWith("/") && !url.startsWith("//")) return url;          // same-origin upload, e.g. /media/church-video/...
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" ? parsed.href : "";
    } catch (error) {
      return "";
    }
  }

  function parseNowPlaying(json) {
    const data = json && typeof json === "object" ? json : {};
    const serverNow = toMs(data.serverTime);
    const state = STATES.includes(data.state) ? data.state : "none";
    const s = data.stream && typeof data.stream === "object" ? data.stream : null;
    const p = data.play && typeof data.play === "object" ? data.play : null;
    const n = data.nextPlay && typeof data.nextPlay === "object" ? data.nextPlay : null;
    const durationSeconds = Number(s?.durationSeconds);
    const offsetSeconds = data.offsetSeconds === null || data.offsetSeconds === undefined ? NaN : Number(data.offsetSeconds);
    const loopIteration = data.loopIteration === null || data.loopIteration === undefined ? NaN : Number(data.loopIteration);
    const slotId = data.slotId ?? p?.slotId ?? s?.slotId ?? null;
    const timezone = typeof data.timezone === "string" && data.timezone ? data.timezone
      : (typeof s?.timezone === "string" && s.timezone ? s.timezone : null);
    const poster = data.poster || s?.poster || null;
    const stream = s ? {
      id: String(s.id ?? ""),
      slotId: slotId != null ? String(slotId) : null,
      title: String(s.title || "Livestream"),
      videoUrl: safeVideoUrl(s.videoUrl),
      rawVideoUrl: s.videoUrl || "",
      poster: poster ? safeVideoUrl(poster) : "",
      durationMs: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds * 1000 : 0,
      mode: s.playMode === "loop" ? "loop" : "once"
    } : null;
    // A platform-owner moderation pause means "none" even if a payload were ever to carry stale play data.
    const moderationLocked = data.moderationLocked === true;
    return {
      ok: data.ok !== false,
      serverNow,
      state: moderationLocked ? "none" : state,
      moderationLocked,
      timezone,
      stream,
      play: p ? { startsAt: toMs(p.startsAt), endsAt: toMs(p.endsAt), slotId: p.slotId != null ? String(p.slotId) : null } : null,
      offsetMs: Number.isFinite(offsetSeconds) ? offsetSeconds * 1000 : null,
      loopIteration: Number.isFinite(loopIteration) ? loopIteration : null,
      next: n && toMs(n.startsAt) !== null ? { startsAt: toMs(n.startsAt), title: n.title ? String(n.title) : "", slotId: n.slotId != null ? String(n.slotId) : null } : null
    };
  }

  /* ------------------------------------------------------------------ */
  /* Pure timing logic                                                    */
  /* ------------------------------------------------------------------ */
  // skew = serverNow - client time at the request midpoint. Corrected clock = clientNow + skew.
  function computeSkew(serverNowMs, requestStartMs, responseEndMs) {
    if (!Number.isFinite(serverNowMs) || !Number.isFinite(requestStartMs) || !Number.isFinite(responseEndMs)) return 0;
    return serverNowMs - (requestStartMs + (responseEndMs - requestStartMs) / 2);
  }

  function mod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  // Unwrapped playback position (ms since play start) at corrected time `now`.
  function rawOffsetMs(model, now) {
    if (!model) return 0;
    const base = Number.isFinite(model.offsetMs)
      ? model.offsetMs
      : (Number.isFinite(model.play?.startsAt) && Number.isFinite(model.serverNow) ? model.serverNow - model.play.startsAt : 0);
    const loopBase = model.stream?.mode === "loop" && Number.isFinite(model.offsetMs) && Number.isFinite(model.loopIteration) && model.stream.durationMs
      ? base + model.loopIteration * model.stream.durationMs
      : base;
    const elapsed = Number.isFinite(model.serverNow) ? now - model.serverNow : 0;
    return Math.max(0, loopBase + elapsed);
  }

  // Position within the video (ms) where a live viewer should be, plus whether a "once" play has run out.
  function liveOffset(model, now) {
    const duration = model?.stream?.durationMs || 0;
    const raw = rawOffsetMs(model, now);
    if (model?.stream?.mode === "loop") {
      return { offsetMs: duration ? mod(raw, duration) : raw, ended: false, iteration: duration ? Math.floor(raw / duration) : 0 };
    }
    if (duration && raw >= duration) return { offsetMs: duration, ended: true, iteration: 0 };
    return { offsetMs: raw, ended: false, iteration: 0 };
  }

  // Clamp a requested playback position (seconds) so it never passes the live edge.
  function clampSeek(requestedSec, liveSec, toleranceSec = LIVE_TOLERANCE_SEC) {
    if (!Number.isFinite(requestedSec)) return liveSec;
    if (requestedSec < 0) return 0;
    return requestedSec > liveSec + toleranceSec ? liveSec : requestedSec;
  }

  // Shortest distance between two positions (ms); wraps for loop mode.
  function driftMs(actualMs, expectedMs, durationMs, loop) {
    const diff = Math.abs(actualMs - expectedMs);
    return loop && durationMs ? Math.min(diff, durationMs - diff) : diff;
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function formatCountdown(ms) {
    const total = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const text = d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`
      : h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s`
      : `${m}m ${pad(s)}s`;
    const parts = [];
    if (d) parts.push(d + (d === 1 ? " day" : " days"));
    if (h) parts.push(h + (h === 1 ? " hour" : " hours"));
    if (m || (!d && !h)) parts.push(m + (m === 1 ? " minute" : " minutes"));
    // Screen readers get minute precision to avoid a per-second announcement flood.
    const spoken = total <= 0 ? "Starting now" : total < 60 ? "Less than a minute" : parts.join(", ");
    return { d, h, m, s, total, text, spoken };
  }

  // Decide the view for a model at corrected time `now`.
  // Views: loading | upcoming | live | ended | none | error. `refetch` asks the controller to call the API again.
  function nextState(model, now, flags = {}) {
    if (!model) return { view: "loading", refetch: false };
    if (flags.mediaError && model.state === "live") return { view: "error", refetch: false, reason: "video_broken" };
    const next = model.next;
    switch (model.state) {
      case "upcoming": {
        const target = model.play?.startsAt ?? next?.startsAt ?? null;
        if (target !== null && now >= target) return { view: "upcoming", refetch: true, target };
        return { view: "upcoming", refetch: false, target };
      }
      case "live": {
        if (!model.stream || !model.stream.videoUrl) return { view: "error", refetch: false, reason: "video_missing" };
        if (Number.isFinite(model.play?.endsAt) && now >= model.play.endsAt) return { view: model.stream.mode === "once" ? "ended" : "live", refetch: true };
        if (flags.videoEnded && model.stream.mode === "once") return { view: "ended", refetch: false, target: next?.startsAt ?? null };
        const live = liveOffset(model, now);
        if (live.ended) return { view: "ended", refetch: false, target: next?.startsAt ?? null };
        return { view: "live", refetch: false };
      }
      case "ended": {
        const target = next?.startsAt ?? null;
        return { view: "ended", refetch: target !== null && now >= target, target };
      }
      default:
        return { view: "none", refetch: false };
    }
  }

  function validTimeZone(timeZone) {
    if (!timeZone) return false;
    try { new Intl.DateTimeFormat("en-US", { timeZone }).format(0); return true; } catch (error) { return false; }
  }

  // Viewer-local time plus the church's own time zone, e.g.
  // { local: "Sun, Sep 27, 9:00 PM", church: "9:00 PM EAT", zone: "Africa/Kampala", sameZone: false }
  function formatChurchAndLocal(ms, churchTimeZone, viewerTimeZone, locale) {
    if (!Number.isFinite(ms)) return { local: "", church: "", zone: churchTimeZone || "", sameZone: true };
    const viewerZone = viewerTimeZone || (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (error) { return undefined; } })();
    const localOpts = { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
    const local = new Intl.DateTimeFormat(locale, viewerZone ? { ...localOpts, timeZone: viewerZone } : localOpts).format(new Date(ms));
    if (!validTimeZone(churchTimeZone)) return { local, church: "", zone: "", sameZone: true };
    const church = new Intl.DateTimeFormat(locale, { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: churchTimeZone, timeZoneName: "short" }).format(new Date(ms));
    return { local, church, zone: churchTimeZone, sameZone: viewerZone === churchTimeZone };
  }

  const logic = { formatChurchAndLocal, validTimeZone, computeSkew, rawOffsetMs, liveOffset, clampSeek, driftMs, formatCountdown, nextState, toMs, safeVideoUrl, mod };

  /* ------------------------------------------------------------------ */
  /* Fixtures (?simMock=upcoming|live-loop|live-once|ended|broken|none)     */
  /* The mock server computes contract-shaped responses from a timeline    */
  /* relative to when it was created, so countdowns and transitions work.  */
  /* ------------------------------------------------------------------ */
  // No demo MP4 is shipped. Pass ?simMockVideo=<https .mp4 or /same-origin path>.
  // Without it, live-loop and live-once use an empty video URL and show the broken screen.
  const DEMO_POSTER = "/assets/meditation-sunrise.png";
  const fixtures = {
    "upcoming": { title: "Sunday Worship Service", startIn: 93784, windowSec: 3600, durationSeconds: 20, playMode: "loop", nextIn: null },
    "live-loop": { title: "Evening Prayer Loop", startIn: -47, windowSec: 3600, durationSeconds: 20, playMode: "loop", nextTitle: "Midweek Bible Study", nextIn: 2 * 86400 },
    "live-once": { title: "Sunday Sermon Replay", startIn: -12, durationSeconds: 20, playMode: "once", nextTitle: "Sunday Worship Service", nextIn: 3 * 86400 + 3600 },
    "ended": { title: "Morning Devotion", startIn: -600, durationSeconds: 20, playMode: "once", nextTitle: "Sunday Worship Service", nextIn: 2 * 86400 + 5400 },
    "broken": { title: "Youth Night Replay", startIn: -5, durationSeconds: 20, playMode: "once", videoUrl: "/media/church-video/missing-demo-video.mp4", nextTitle: "Youth Night (next week)", nextIn: 7 * 86400 - 3600 },
    // Real now-playing: a moderation pause or no schedule is state "none" with no play payload.
    "none": { forceNone: true }
  };

  // Mirrors computeNowPlaying() in src/simulated-live.js (priority live > ended <30 min > upcoming <7 days > none).
  function mockResponse(fixture, createdAt, serverNow, options = {}) {
    const iso = ms => new Date(ms).toISOString();
    const none = { ok: true, serverTime: iso(serverNow), state: "none", stream: null, timezone: null, poster: null, slotId: null, play: null, offsetSeconds: 0, loopIteration: 0, nextPlay: null };
    if (fixture.forceNone) return none;
    const startsAt = createdAt + fixture.startIn * 1000;
    const durationMs = fixture.durationSeconds * 1000;
    const endsAt = startsAt + (fixture.playMode === "loop" ? fixture.windowSec * 1000 : durationMs);
    const slotId = "demo-slot-" + (options.scenario || "mock");
    const timezone = fixture.timezone || "Africa/Kampala";
    const stream = {
      id: "demo-stream-" + (options.scenario || "mock"),
      title: fixture.title,
      videoUrl: fixture.videoUrl || options.videoUrl || "",
      durationSeconds: fixture.durationSeconds,
      playMode: fixture.playMode,
      timezone
    };
    const later = fixture.nextIn != null ? { startsAt: iso(createdAt + fixture.nextIn * 1000), slotId: "demo-slot-next", title: fixture.nextTitle } : null;
    const play = { startsAt: iso(startsAt), endsAt: iso(endsAt), slotId };
    const withStream = extra => ({ ...none, stream, timezone, poster: DEMO_POSTER, ...extra });
    if (serverNow < startsAt) {
      if (startsAt - serverNow > 7 * 86400000) return none;
      return withStream({ state: "upcoming", play, nextPlay: { startsAt: play.startsAt, slotId, title: fixture.title } });
    }
    if (serverNow < endsAt) {
      const elapsed = (serverNow - startsAt) / 1000;
      const loop = fixture.playMode === "loop";
      const loopIteration = loop ? Math.floor(elapsed / fixture.durationSeconds) : 0;
      return withStream({ state: "live", slotId, play, offsetSeconds: loop ? elapsed - loopIteration * fixture.durationSeconds : elapsed, loopIteration, nextPlay: later });
    }
    if (serverNow < endsAt + 30 * 60000) return withStream({ state: "ended", slotId, play, nextPlay: later });
    return none;
  }

  function createMockFetch(scenario, options = {}) {
    const base = fixtures[scenario];
    if (!base) return null;
    const startOverride = options.startInSec;
    const fixture = startOverride !== null && startOverride !== undefined && startOverride !== "" && Number.isFinite(Number(startOverride))
      ? { ...base, startIn: Number(startOverride) } : base;
    const clock = options.now || (() => Date.now());
    const skewMs = Number(options.skewMs) || 0;       // simulate a server clock that differs from the client
    const createdAt = clock() + skewMs;
    const latencyMs = Number(options.latencyMs ?? 60);
    return function mockFetch() {
      const serverNow = clock() + skewMs + latencyMs / 2;
      const body = mockResponse(fixture, createdAt, serverNow, { scenario, videoUrl: options.videoUrl });
      return new Promise(resolve => setTimeout(() => resolve({
        ok: true, status: 200, json: async () => body
      }), latencyMs));
    };
  }

  /* ------------------------------------------------------------------ */
  /* DOM controller                                                       */
  /* ------------------------------------------------------------------ */
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  function whenHtml(ms, churchTimeZone) {
    const t = formatChurchAndLocal(ms, churchTimeZone);
    if (!t.local) return "";
    const iso = new Date(ms).toISOString();
    return '<time datetime="' + esc(iso) + '">' + esc(t.local) + '</time> <span class="simlive-tz-label">your time</span>' +
      (t.church ? ' <span class="simlive-tz-sep" aria-hidden="true">·</span> <span class="simlive-tz-church">' + esc(t.church) + ' <span class="simlive-tz-label">church time (' + esc(t.zone) + ')</span></span>' : "");
  }

  function whenText(ms, churchTimeZone) {
    const t = formatChurchAndLocal(ms, churchTimeZone);
    return t.local + " your time" + (t.church ? ", " + t.church + " church time" : "");
  }

  function icon(name) { return '<i data-lucide="' + name + '" aria-hidden="true"></i>'; }

  function mount(el, options = {}) {
    if (!el || !options.churchId) throw new Error("MWESimLive.mount requires an element and churchId.");
    if (el.__simLive) el.__simLive.destroy();

    const clientNow = typeof options.now === "function" ? options.now : () => Date.now();
    const fetchImpl = options.fetchImpl
      || (options.mock && createMockFetch(options.mock, { now: clientNow, skewMs: options.mockSkewMs, startInSec: options.mockStartInSec, videoUrl: options.mockVideoUrl }))
      || ((...args) => root.fetch(...args));
    const endpoint = options.endpoint || ("/api/churches/" + encodeURIComponent(options.churchId) + "/now-playing");

    const state = {
      model: null, skew: 0, view: "loading", lastFetchAt: 0, fetchFailures: 0,
      mediaError: false, videoEnded: false, userPaused: false, userBehind: false,
      internalSeek: false, internalPause: false, stallTimer: null, stallCount: 0, loadTimer: null,
      pendingSeek: false, destroyed: false, retryTimer: null, fetching: null
    };
    const now = () => clientNow() + state.skew;

    el.classList.add("simlive");
    el.innerHTML =
      '<div class="simlive-stage" data-view="loading" tabindex="0" aria-label="Simulated live player. Space pauses, M toggles sound, Right arrow jumps to live.">' +
        '<video class="simlive-video" playsinline muted preload="auto" disablepictureinpicture controlslist="nodownload noplaybackrate" tabindex="-1"></video>' +
        '<div class="simlive-poster" aria-hidden="true" hidden></div>' +
        '<div class="simlive-topbar">' +
          '<span class="simlive-live-badge" data-simlive-badge hidden><span class="simlive-live-dot" aria-hidden="true"></span>LIVE</span>' +
          '<span class="simlive-behind-badge" data-simlive-behind hidden>Behind live</span>' +
        '</div>' +
        '<div class="simlive-panel" data-simlive-panel></div>' +
        '<div class="simlive-spinner" data-simlive-spinner hidden role="presentation"><span></span></div>' +
        '<div class="simlive-controls" data-simlive-controls hidden>' +
          '<button type="button" class="simlive-btn" data-simlive-toggle aria-label="Pause">' + icon("pause") + '<span>Pause</span></button>' +
          '<button type="button" class="simlive-btn simlive-btn-primary" data-simlive-unmute aria-pressed="false">' + icon("volume-x") + '<span>Tap to unmute</span></button>' +
          '<button type="button" class="simlive-btn simlive-btn-live" data-simlive-golive hidden>' + icon("radio") + '<span>Back to live</span></button>' +
          '<button type="button" class="simlive-btn" data-simlive-fullscreen aria-label="Full screen">' + icon("maximize") + '</button>' +
        '</div>' +
      '</div>' +
      '<p class="simlive-status sr-only" role="status" aria-live="polite" aria-atomic="true" data-simlive-status></p>';

    const $ = sel => el.querySelector(sel);
    const stage = $(".simlive-stage");
    const video = $(".simlive-video");
    const posterEl = $(".simlive-poster");
    const panel = $("[data-simlive-panel]");
    const badge = $("[data-simlive-badge]");
    const behindBadge = $("[data-simlive-behind]");
    const spinner = $("[data-simlive-spinner]");
    const controls = $("[data-simlive-controls]");
    const toggleBtn = $("[data-simlive-toggle]");
    const unmuteBtn = $("[data-simlive-unmute]");
    const goLiveBtn = $("[data-simlive-golive]");
    const fullscreenBtn = $("[data-simlive-fullscreen]");
    const statusEl = $("[data-simlive-status]");

    const refreshIcons = () => root.lucide?.createIcons?.();
    const announce = text => { if (statusEl.textContent !== text) statusEl.textContent = text; };
    const liveSec = () => state.model ? liveOffset(state.model, now()).offsetMs / 1000 : 0;
    const isLoop = () => state.model?.stream?.mode === "loop";

    /* ---------- networking ---------- */
    async function refetch(reason) {
      if (state.destroyed) return null;
      if (state.fetching) return state.fetching;
      const since = clientNow() - state.lastFetchAt;
      if (reason !== "force" && reason !== "initial" && since < MIN_REFETCH_GAP_MS) {
        clearTimeout(state.retryTimer);
        state.retryTimer = setTimeout(() => refetch(reason), MIN_REFETCH_GAP_MS - since);
        return null;
      }
      state.fetching = (async () => {
        const t0 = clientNow();
        state.lastFetchAt = t0;
        try {
          const response = await fetchImpl(endpoint, { method: "GET", cache: "no-store", credentials: "same-origin", headers: { accept: "application/json" } });
          const json = await response.json();
          const t1 = clientNow();
          if (!response.ok || json?.ok === false) throw new Error(json?.error || "Now playing is unavailable.");
          const model = parseNowPlaying(json);
          if (Number.isFinite(model.serverNow)) state.skew = computeSkew(model.serverNow, t0, t1);
          state.fetchFailures = 0;
          if (!state.destroyed) applyModel(model, reason);
          return model;
        } catch (error) {
          if (state.destroyed) return null;
          state.fetchFailures += 1;
          const delay = Math.min(60000, 5000 * 2 ** (state.fetchFailures - 1));
          clearTimeout(state.retryTimer);
          state.retryTimer = setTimeout(() => refetch("retry"), delay);
          if (!state.model) render("error", { reason: "network" });
          return null;
        } finally {
          state.fetching = null;
        }
      })();
      return state.fetching;
    }

    function applyModel(model, reason) {
      const previous = state.model;
      const sameStream = Boolean(previous && model.stream && previous.stream &&
        previous.stream.id === model.stream.id && previous.stream.videoUrl === model.stream.videoUrl &&
        previous.play?.startsAt === model.play?.startsAt);
      state.model = model;
      if (!sameStream) {
        state.mediaError = false;
        state.videoEnded = false;
        state.stallCount = 0;
      }
      const decision = nextState(model, now(), { mediaError: state.mediaError, videoEnded: state.videoEnded });
      render(decision.view, decision);
      if (decision.view === "live" && sameStream && reason !== "initial") correctDrift();
      options.onUpdate?.({ model, view: decision.view });
    }

    /* ---------- media ---------- */
    function stopVideo() {
      clearTimeout(state.loadTimer);
      clearTimeout(state.stallTimer);
      state.stallTimer = null;
      state.internalPause = true;
      try { video.pause(); } catch (error) { /* ignore */ }
      state.internalPause = false;
      if (video.getAttribute("src")) {
        video.removeAttribute("src");
        try { video.load(); } catch (error) { /* ignore */ }
      }
      delete video.dataset.src;
    }

    function seekTo(sec) {
      const duration = Number.isFinite(video.duration) ? video.duration : Infinity;
      const target = Math.max(0, Math.min(sec, duration - 0.05));
      if (Math.abs(video.currentTime - target) < 0.05) return;
      state.internalSeek = true;
      try { video.currentTime = target; } catch (error) { state.internalSeek = false; }
    }

    function goLive(play) {
      state.userBehind = false;
      state.userPaused = false;
      seekTo(liveSec());
      if (play !== false) attemptPlay();
      updateBehind();
    }

    function attemptPlay() {
      const result = video.play();
      if (result && typeof result.catch === "function") {
        result.catch(() => showTapToPlay());   // autoplay blocked even while muted
      }
    }

    function showTapToPlay() {
      if (state.view !== "live" || !video.paused) return;
      panel.innerHTML = '<button type="button" class="simlive-tap-play" data-simlive-tapplay>' + icon("play") + '<span>Tap to watch live</span></button>';
      panel.hidden = false;
      panel.querySelector("[data-simlive-tapplay]").addEventListener("click", () => { panel.hidden = true; panel.innerHTML = ""; goLive(true); });
      refreshIcons();
    }

    function startVideo(stream) {
      if (video.dataset.src === stream.videoUrl) {
        if (video.paused && !state.userPaused && video.readyState >= 1) goLive(true);
        return;
      }
      stopVideo();
      video.dataset.src = stream.videoUrl;
      video.muted = true;
      video.loop = false;          // loop wrap is handled manually so the position follows the schedule
      if (stream.poster) video.poster = stream.poster; else video.removeAttribute("poster");
      state.pendingSeek = true;
      video.src = stream.videoUrl;
      try { video.load(); } catch (error) { /* ignore */ }
      spinner.hidden = false;
      clearTimeout(state.loadTimer);
      state.loadTimer = setTimeout(() => {
        if (video.readyState < 2) onMediaFailure("timeout");
      }, LOAD_TIMEOUT_MS);
      updateUnmute();
    }

    function onMediaFailure(kind) {
      if (state.view !== "live") return;
      state.mediaError = true;
      stopVideo();
      render("error", { reason: kind === "timeout" ? "video_timeout" : "video_broken" });
    }

    function correctDrift() {
      if (state.view !== "live" || video.paused || state.userBehind || video.readyState < 1) return;
      const drift = driftMs(video.currentTime * 1000, liveOffset(state.model, now()).offsetMs, state.model.stream.durationMs, isLoop());
      if (drift > DRIFT_THRESHOLD_MS) seekTo(liveSec());
    }

    function updateBehind() {
      const behind = state.view === "live" && video.readyState >= 1 && (video.paused || liveSec() - video.currentTime > BEHIND_THRESHOLD_SEC);
      goLiveBtn.hidden = !behind;
      behindBadge.hidden = !behind;
      badge.classList.toggle("is-behind", behind);
    }

    function updateUnmute() {
      const muted = video.muted;
      unmuteBtn.setAttribute("aria-pressed", String(!muted));
      unmuteBtn.innerHTML = muted ? icon("volume-x") + "<span>Tap to unmute</span>" : icon("volume-2") + "<span>Mute</span>";
      unmuteBtn.classList.toggle("simlive-btn-primary", muted);
      refreshIcons();
    }

    function updateToggle() {
      const paused = video.paused;
      toggleBtn.setAttribute("aria-label", paused ? "Play" : "Pause");
      toggleBtn.innerHTML = paused ? icon("play") + "<span>Play</span>" : icon("pause") + "<span>Pause</span>";
      refreshIcons();
    }

    function armStallTimer() {
      if (state.view !== "live" || state.stallTimer || video.paused) return;
      spinner.hidden = false;
      state.stallTimer = setTimeout(async () => {
        state.stallTimer = null;
        if (state.view !== "live" || video.paused || video.readyState >= 3) { spinner.hidden = true; return; }
        state.stallCount += 1;
        if (state.stallCount > MAX_STALL_RESYNCS) { onMediaFailure("timeout"); return; }
        await refetch("stall");
        if (state.view === "live") { seekTo(liveSec()); attemptPlay(); armStallTimer(); }
      }, STALL_RESYNC_MS);
    }

    const mediaHandlers = {
      loadedmetadata() {
        if (state.pendingSeek) { state.pendingSeek = false; seekTo(liveSec()); }
        if (state.view === "live") attemptPlay();
      },
      canplay() { clearTimeout(state.loadTimer); spinner.hidden = true; },
      playing() {
        clearTimeout(state.loadTimer);
        clearTimeout(state.stallTimer);
        state.stallTimer = null;
        state.stallCount = 0;
        spinner.hidden = true;
        if (panel.querySelector("[data-simlive-tapplay]")) { panel.innerHTML = ""; panel.hidden = true; }
        updateToggle();
        updateBehind();
      },
      play() {
        // Resuming after a viewer pause jumps back to the live position.
        if (state.userPaused) goLive(false);
        updateToggle();
      },
      pause() {
        if (!state.internalPause && !video.ended && state.view === "live") state.userPaused = true;
        updateToggle();
        updateBehind();
      },
      seeking() {
        if (state.internalSeek || state.view !== "live") return;
        const live = liveSec();
        const clamped = clampSeek(video.currentTime, live);
        if (clamped !== video.currentTime) { seekTo(clamped); announce("You can't skip ahead of the live broadcast."); return; }
        state.userBehind = live - video.currentTime > BEHIND_THRESHOLD_SEC;
      },
      seeked() { state.internalSeek = false; updateBehind(); },
      timeupdate() {
        if (state.view !== "live" || state.internalSeek) return;
        const live = liveSec();
        // Near the loop wrap the live edge resets to 0 before the element fires "ended"; don't fight that.
        if (video.currentTime > live + LIVE_TOLERANCE_SEC && !(isLoop() && live < LIVE_TOLERANCE_SEC * 2)) seekTo(live);
        if (state.userBehind && live - video.currentTime <= BEHIND_THRESHOLD_SEC) state.userBehind = false;
        updateBehind();
      },
      ratechange() { if (video.playbackRate > 1) video.playbackRate = 1; },
      ended() {
        if (state.view !== "live") return;
        if (isLoop()) {
          state.userBehind = false;
          seekTo(liveSec());
          attemptPlay();
        } else {
          state.videoEnded = true;
          const decision = nextState(state.model, now(), { videoEnded: true });
          render(decision.view, decision);
        }
      },
      waiting() { armStallTimer(); },
      stalled() { armStallTimer(); },
      error() { if (video.getAttribute("src")) onMediaFailure("error"); },
      volumechange() { updateUnmute(); }
    };
    Object.entries(mediaHandlers).forEach(([name, handler]) => video.addEventListener(name, handler));

    toggleBtn.addEventListener("click", () => {
      if (video.paused) goLive(true);
      else { state.userPaused = true; video.pause(); }
    });
    unmuteBtn.addEventListener("click", () => {
      video.muted = !video.muted;
      if (!video.muted && video.volume === 0) video.volume = 1;
      if (video.paused && state.view === "live") goLive(true);
      announce(video.muted ? "Sound off" : "Sound on");
    });
    goLiveBtn.addEventListener("click", () => { goLive(true); announce("Back to live"); });
    fullscreenBtn.addEventListener("click", () => {
      const doc = root.document;
      if (doc.fullscreenElement) doc.exitFullscreen?.();
      else (stage.requestFullscreen || stage.webkitRequestFullscreen)?.call(stage);
    });
    stage.addEventListener("keydown", event => {
      if (event.target.closest("button") || state.view !== "live") return;
      if (event.key === " " || event.key === "k") { event.preventDefault(); toggleBtn.click(); }
      if (event.key === "m") { event.preventDefault(); unmuteBtn.click(); }
      if (event.key === "ArrowRight" || event.key === "End") { event.preventDefault(); goLive(true); }
    });

    /* ---------- rendering ---------- */
    function nextPlayHtml(next, label) {
      if (!next) return '<p class="simlive-next">No upcoming plays are scheduled yet.</p>';
      return '<p class="simlive-next"><span>' + esc(label || "Next play") + ':</span> <strong>' + esc(next.title || "Scheduled broadcast") + '</strong><br />' + whenHtml(next.startsAt, state.model?.timezone) + '</p>';
    }

    function countdownDigits(c) {
      const unit = (value, label) => '<span class="simlive-unit"><b>' + pad(value) + '</b><small>' + label + '</small></span>';
      return (c.d ? unit(c.d, "days") : "") + unit(c.h, "hrs") + unit(c.m, "min") + unit(c.s, "sec");
    }

    function countdownHtml(target) {
      if (!Number.isFinite(target)) return "";
      const c = formatCountdown(target - now());
      return '<div class="simlive-countdown" role="timer" aria-live="polite" aria-atomic="true" data-simlive-countdown data-target="' + target + '">' +
        '<span class="simlive-countdown-digits" aria-hidden="true">' + countdownDigits(c) + '</span>' +
        '<span class="sr-only" data-simlive-countdown-spoken>' + esc(c.spoken) + '</span></div>';
    }

    function setPoster(url) {
      posterEl.style.backgroundImage = url ? 'url("' + url.replace(/"/g, "%22") + '")' : "";
      posterEl.hidden = !url;
    }

    function render(view, info = {}) {
      const previousView = state.view;
      state.view = view;
      stage.dataset.view = view;
      const model = state.model;
      const stream = model?.stream;
      const live = view === "live";
      badge.hidden = !live;
      controls.hidden = !live;
      if (!live) { goLiveBtn.hidden = true; behindBadge.hidden = true; spinner.hidden = true; }
      if (!live && view !== "loading") stopVideo();
      video.hidden = !live;
      setPoster(live ? "" : (stream?.poster || ""));
      panel.hidden = live;

      if (view === "loading") {
        spinner.hidden = false;
        panel.innerHTML = "";
        announce("Loading livestream");
      } else if (view === "live") {
        if (!panel.querySelector("[data-simlive-tapplay]")) panel.innerHTML = "";
        startVideo(stream);
        if (previousView !== "live") announce("Live now: " + stream.title + (video.muted ? ". Sound is off; use Tap to unmute." : ""));
        updateBehind();
      } else if (view === "upcoming") {
        const target = info.target ?? model.play?.startsAt ?? model.next?.startsAt;
        const title = stream?.title || model.next?.title || "Scheduled broadcast";
        panel.innerHTML = '<div class="simlive-card"><p class="simlive-kicker">' + icon("calendar-clock") + ' Starts in</p>' +
          '<h3>' + esc(title) + '</h3>' + countdownHtml(target) +
          '<p class="simlive-when">' + whenHtml(target, model.timezone) + '</p>' +
          (model.next && model.next.startsAt !== target ? nextPlayHtml(model.next, "Then") : "") + '</div>';
        announce(title + " starts in " + formatCountdown(target - now()).spoken);
      } else if (view === "ended") {
        const target = model.next?.startsAt ?? null;
        panel.innerHTML = '<div class="simlive-card"><p class="simlive-kicker">' + icon("check-circle-2") + ' Broadcast ended</p>' +
          '<h3>' + esc(stream?.title || "Thanks for watching") + '</h3>' +
          '<p class="simlive-copy">This play has finished. Thanks for worshipping with us.</p>' +
          nextPlayHtml(model.next, "Next play") + (Number.isFinite(target) ? countdownHtml(target) : "") + '</div>';
        announce("Broadcast ended." + (model.next ? " Next play: " + (model.next.title || "scheduled broadcast") + ", " + whenText(model.next.startsAt, model.timezone) : ""));
      } else if (view === "none") {
        panel.innerHTML = '<div class="simlive-card simlive-card-neutral"><p class="simlive-kicker">' + icon("radio-tower") + ' Offline</p>' +
          '<h3>Not live</h3>' +
          '<p class="simlive-copy">This church is not live right now. The player starts automatically when the next broadcast begins.</p>' +
          (model?.next ? nextPlayHtml(model.next, "Next play") : "") + '</div>';
        announce("This church is offline right now.");
      } else if (view === "error") {
        const network = info.reason === "network";
        const heading = network ? "We can't reach the broadcast schedule" : "This video can't be played right now";
        const copy = network
          ? "Check your connection. We'll keep trying automatically."
          : "The recording is missing or couldn't load. Please try again shortly.";
        panel.innerHTML = '<div class="simlive-card simlive-card-error"><p class="simlive-kicker">' + icon("alert-triangle") + ' Playback problem</p>' +
          '<h3>' + heading + '</h3><p class="simlive-copy">' + copy + '</p>' +
          (model?.next ? nextPlayHtml(model.next, "Next play") : "") +
          '<button type="button" class="simlive-btn simlive-btn-primary" data-simlive-retry>' + icon("refresh-cw") + '<span>Try again</span></button></div>';
        panel.querySelector("[data-simlive-retry]").addEventListener("click", () => {
          state.mediaError = false;
          state.stallCount = 0;
          refetch("force");
        });
        announce(heading);
      }
      refreshIcons();
    }

    function tick() {
      if (state.destroyed || !state.model) return;
      el.querySelectorAll("[data-simlive-countdown]").forEach(node => {
        const c = formatCountdown(Number(node.dataset.target) - now());
        const digits = node.querySelector(".simlive-countdown-digits");
        const html = countdownDigits(c);
        if (digits.innerHTML !== html) digits.innerHTML = html;
        const spoken = node.querySelector("[data-simlive-countdown-spoken]");
        if (spoken.textContent !== c.spoken) spoken.textContent = c.spoken;
      });
      const decision = nextState(state.model, now(), { mediaError: state.mediaError, videoEnded: state.videoEnded });
      if (decision.view !== state.view && state.view !== "error") render(decision.view, decision);
      if (decision.refetch) refetch("transition");
      if (state.view === "live") updateBehind();
    }

    /* ---------- lifecycle ---------- */
    const onVisibility = () => { if (root.document.visibilityState === "visible") refetch("visible"); };
    const onOnline = () => refetch("online");
    root.document?.addEventListener("visibilitychange", onVisibility);
    root.addEventListener?.("online", onOnline);
    const tickTimer = setInterval(tick, 1000);
    const resyncTimer = setInterval(() => refetch("interval"), RESYNC_INTERVAL_MS);

    render("loading");
    refetch("initial");

    const controller = {
      refresh: () => refetch("force"),
      getState: () => ({ view: state.view, skewMs: state.skew, model: state.model, liveSec: liveSec(), currentTime: video.currentTime, userBehind: state.userBehind }),
      destroy() {
        state.destroyed = true;
        clearInterval(tickTimer);
        clearInterval(resyncTimer);
        clearTimeout(state.retryTimer);
        stopVideo();
        Object.entries(mediaHandlers).forEach(([name, handler]) => video.removeEventListener(name, handler));
        root.document?.removeEventListener("visibilitychange", onVisibility);
        root.removeEventListener?.("online", onOnline);
        el.innerHTML = "";
        el.classList.remove("simlive");
        delete el.__simLive;
      }
    };
    el.__simLive = controller;
    return controller;
  }

  /* ------------------------------------------------------------------ */
  /* livestream.html wiring                                               */
  /* ------------------------------------------------------------------ */
  function isSimulatedChurch(church) {
    if (!church) return false;
    const type = church.livestream?.type || church.livestreamType || church.streamType;
    return type === "simulated" || church.livestream?.simulated === true || church.simulated === true;
  }

  // ?sim=<churchId> wins. ?simMock alone uses a demo church. ?id=<churchId> is used only when that church record is flagged simulated.
  function resolveChurchId(params, churches) {
    const sim = params.get("sim");
    if (sim) return sim;
    if (params.get("simMock")) return "demo-church";
    const id = params.get("id");
    if (id && Array.isArray(churches)) {
      const church = churches.find(item => String(item.id) === String(id));
      if (isSimulatedChurch(church)) return String(church.id);
    }
    return null;
  }

  function mountLivestreamPage(churchId, options = {}) {
    const doc = root.document;
    const params = new URLSearchParams(root.location.search);
    const landing = doc.getElementById("streams-landing-view");
    const playerView = doc.getElementById("streams-player-view");
    const wrapper = playerView?.querySelector(".modern-video-wrapper");
    if (!wrapper) return null;
    if (landing) landing.style.display = "none";
    playerView.style.display = "block";
    playerView.classList.add("is-simulated-live");
    const iframe = doc.getElementById("main-player-iframe");
    if (iframe) { iframe.removeAttribute("src"); iframe.hidden = true; iframe.style.display = "none"; }
    wrapper.querySelectorAll(".player-overlay-badge, #stage-guest-container").forEach(node => { node.hidden = true; node.style.display = "none"; });
    let host = wrapper.querySelector("[data-simlive-host]");
    if (!host) {
      host = doc.createElement("div");
      host.dataset.simliveHost = "";
      host.className = "simlive-host";
      wrapper.append(host);
    }
    const church = (root.MWE?.getChurches?.() || []).find(item => String(item.id) === String(churchId));
    const setText = (id, text) => { const node = doc.getElementById(id); if (node && text) node.textContent = text; };
    if (church) {
      setText("player-church-name", church.name);
      const link = doc.getElementById("player-church-link");
      if (link) link.href = "church-profile.html?id=" + encodeURIComponent(church.id);
    }
    const mock = params.get("simMock");
    return mount(host, {
      churchId,
      mock: mock && fixtures[mock] ? mock : undefined,
      mockSkewMs: Number(params.get("simMockSkew")) || 0,
      mockStartInSec: params.get("simMockIn"),
      mockVideoUrl: safeVideoUrl(params.get("simMockVideo")) || undefined,
      ...options,
      onUpdate(update) {
        const stream = update.model?.stream;
        if (stream?.title) {
          setText("player-stream-title", stream.title);
          doc.title = stream.title + " | My Way of Evangelism";
        }
        options.onUpdate?.(update);
      }
    });
  }

  // Self-bootstrap on livestream.html. app.js's initLivestreamPage() awaits MWEPlatform.ready and then shows the
  // directory, so wait for the same promise and a macrotask to make sure the player view wins.
  function autoMountLivestreamPage() {
    const doc = root.document;
    if (!doc || doc.body?.dataset.page !== "livestream") return;
    const params = new URLSearchParams(root.location.search);
    if (!params.get("sim") && !params.get("simMock")) return;
    doc.body.classList.add("simlive-active");
    Promise.resolve(root.MWEPlatform?.ready).catch(() => {}).then(() => new Promise(resolve => setTimeout(resolve, 0))).then(() => {
      const churchId = resolveChurchId(params, root.MWE?.getChurches?.() || []);
      if (churchId) mountLivestreamPage(churchId);
    });
  }

  if (root.document) {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", autoMountLivestreamPage, { once: true });
    else autoMountLivestreamPage();
  }

  root.MWESimLive = { mount, mountLivestreamPage, resolveChurchId, isSimulatedChurch, parseNowPlaying, logic, fixtures, mockResponse, createMockFetch };
})(typeof window !== "undefined" ? window : globalThis);
