/* Simulated-live badges for public church pages.
   Churches directory: batch GET /api/simulated-live/now-playing?churchIds=a,b (<=50 ids).
   Church profile:     GET /api/churches/:id/now-playing.
   "Now" is the server's clock (serverTime + performance.now() delta), never the
   device clock alone. Any failure (network, 404, missing route) shows no badge. */
(function (root) {
  "use strict";

  var DEFAULT_TZ = "Africa/Kampala";
  var BATCH_MAX = 50;
  var REFRESH_MS = 60000;
  var MAX_TIMER_MS = 60000;

  function parseMs(value) {
    var ms = typeof value === "string" ? Date.parse(value) : NaN;
    return isFinite(ms) ? ms : null;
  }

  function safeZone(timezone) {
    var zone = timezone || DEFAULT_TZ;
    try { new Intl.DateTimeFormat("en-GB", { timeZone: zone }); return zone; }
    catch (e) { return DEFAULT_TZ; }
  }

  // "Sun 10:00" (weekday short + 24h time) in the stream's zone.
  function formatStart(ms, timezone) {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: safeZone(timezone), weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date(ms));
    var get = function (type) { for (var i = 0; i < parts.length; i++) if (parts[i].type === type) return parts[i].value; return ""; };
    return get("weekday") + " " + get("hour") + ":" + get("minute");
  }

  // "Sunday 27 September 2026 at 10:00 EAT" for screen readers.
  function formatFull(ms, timezone) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: safeZone(timezone), weekday: "long", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short"
    }).format(new Date(ms));
  }

  // Pure: decide what to show for one now-playing entry at server time nowMs.
  // Returns {kind:"live"|"upcoming", label, ariaLabel, nextChangeMs} or {kind:"none", nextChangeMs}.
  function computeBadge(entry, nowMs) {
    if (!entry || typeof entry !== "object" || entry.state === "none" || !entry.state) return { kind: "none", nextChangeMs: null };
    var tz = entry.timezone || DEFAULT_TZ;
    var play = entry.play || null, next = entry.nextPlay || null;
    var playStart = play ? parseMs(play.startsAt) : null, playEnd = play ? parseMs(play.endsAt) : null;
    var nextStart = next ? parseMs(next.startsAt) : null;
    var title = (next && next.title) || (entry.stream && entry.stream.title) || "";

    if (playStart !== null && playEnd !== null && playStart <= nowMs && nowMs < playEnd) {
      return {
        kind: "live", label: "Live now",
        ariaLabel: "Live now" + (entry.stream && entry.stream.title ? ": " + entry.stream.title : "") + ", until " + formatFull(playEnd, tz),
        nextChangeMs: playEnd
      };
    }
    // A next play whose end we don't know has started: treat it as live until a refetch.
    if (nextStart !== null && nextStart <= nowMs && (playStart === null || nextStart !== playStart) && entry.state !== "none") {
      if (nowMs - nextStart < REFRESH_MS * 2) return { kind: "live", label: "Live now", ariaLabel: "Live now" + (title ? ": " + title : ""), nextChangeMs: null, needsRefresh: true };
    }
    var candidates = [];
    if (playStart !== null && playStart > nowMs) candidates.push(playStart);
    if (nextStart !== null && nextStart > nowMs) candidates.push(nextStart);
    if (!candidates.length) return { kind: "none", nextChangeMs: null };
    var start = Math.min.apply(Math, candidates);
    return {
      kind: "upcoming", label: "Starts " + formatStart(start, tz),
      ariaLabel: "Starts " + formatFull(start, tz) + (title ? ": " + title : ""),
      nextChangeMs: start
    };
  }

  var api = { computeBadge: computeBadge, formatStart: formatStart, formatFull: formatFull, DEFAULT_TIMEZONE: DEFAULT_TZ, BATCH_MAX: BATCH_MAX };
  root.MWESimulatedLiveBadges = api;

  var doc = root.document;
  if (!doc || typeof root.fetch !== "function" || !root.performance) return;

  // --- Server clock --------------------------------------------------------
  var clock = { serverMs: null, perfAt: 0 };
  function syncClock(serverTime) {
    var ms = parseMs(serverTime);
    if (ms !== null) { clock.serverMs = ms; clock.perfAt = root.performance.now(); }
  }
  function serverNow() {
    return clock.serverMs === null ? null : clock.serverMs + (root.performance.now() - clock.perfAt);
  }

  function getJson(url) {
    return root.fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" }, cache: "no-store" })
      .then(function (res) {
        if (!res.ok) return null;
        var type = res.headers.get("content-type") || "";
        if (type.indexOf("application/json") === -1) return null;
        return res.json();
      })
      .then(function (data) { return data && data.ok ? data : null; })
      .catch(function () { return null; });
  }

  function makeBadge(badge, href) {
    var el = doc.createElement(href ? "a" : "span");
    el.className = "sl-badge sl-badge--" + badge.kind;
    el.setAttribute("data-sl-badge", "");
    el.setAttribute("aria-label", badge.ariaLabel);
    el.title = badge.ariaLabel;
    if (href) el.href = href;
    if (badge.kind === "live") {
      var dot = doc.createElement("span");
      dot.className = "sl-badge-dot";
      dot.setAttribute("aria-hidden", "true");
      el.appendChild(dot);
    }
    el.appendChild(doc.createTextNode(badge.label));
    return el;
  }

  // --- Timers ---------------------------------------------------------------
  var tickTimer = 0;
  function scheduleTick(times, onTick) {
    if (tickTimer) root.clearTimeout(tickTimer);
    var now = serverNow();
    if (now === null) return;
    var soonest = MAX_TIMER_MS;
    times.forEach(function (t) { if (t !== null && t > now) soonest = Math.min(soonest, t - now); });
    tickTimer = root.setTimeout(onTick, Math.max(250, soonest + 50));
  }
  function visible() { return doc.visibilityState !== "hidden"; }

  // --- Churches directory ---------------------------------------------------
  function cardChurchId(card) {
    var link = card.querySelector('a[href*="church-profile.html?id="]');
    if (!link) return null;
    try { return new URL(link.getAttribute("href"), root.location.href).searchParams.get("id"); }
    catch (e) { return null; }
  }

  function initDirectory(grid) {
    var cache = {}; // id -> {entry, fetchedAt (perf ms)}
    var inflight = {};

    function cards() { return Array.prototype.slice.call(grid.querySelectorAll(".church-card-immersive")); }

    function paint() {
      var now = serverNow();
      var times = [], refresh = false;
      cards().forEach(function (card) {
        var id = cardChurchId(card);
        var cached = id && cache[id];
        var old = card.querySelector("[data-sl-badge]");
        var badge = cached && now !== null ? computeBadge(cached.entry, now) : { kind: "none" };
        if (badge.needsRefresh) refresh = true;
        if (badge.nextChangeMs) times.push(badge.nextChangeMs);
        var key = badge.kind === "none" ? "" : badge.kind + "|" + badge.label;
        if (old && old.getAttribute("data-sl-key") === key) return;
        if (old) old.remove();
        if (!key) return;
        var el = makeBadge(badge);
        el.setAttribute("data-sl-key", key);
        var host = card.querySelector(".church-card-top-bar") || card;
        host.appendChild(el);
      });
      if (refresh) expireAll();
      scheduleTick(times, tick);
    }

    function expireAll() { Object.keys(cache).forEach(function (id) { cache[id].fetchedAt = -Infinity; }); }

    function load() {
      if (!visible()) return;
      var perfNow = root.performance.now();
      var ids = [];
      cards().forEach(function (card) {
        var id = cardChurchId(card);
        if (!id || inflight[id] || ids.indexOf(id) !== -1) return;
        var cached = cache[id];
        if (cached && perfNow - cached.fetchedAt < REFRESH_MS) return;
        ids.push(id);
      });
      if (!ids.length) { paint(); return; }
      for (var i = 0; i < ids.length; i += BATCH_MAX) fetchChunk(ids.slice(i, i + BATCH_MAX));
    }

    function fetchChunk(ids) {
      ids.forEach(function (id) { inflight[id] = true; });
      getJson("/api/simulated-live/now-playing?churchIds=" + ids.map(encodeURIComponent).join(",")).then(function (data) {
        var at = root.performance.now();
        ids.forEach(function (id) { delete inflight[id]; });
        if (!data || !data.churches) {
          ids.forEach(function (id) { cache[id] = { entry: null, fetchedAt: at }; });
        } else {
          syncClock(data.serverTime);
          ids.forEach(function (id) { cache[id] = { entry: data.churches[id] || null, fetchedAt: at }; });
        }
        paint();
      });
    }

    function tick() { load(); paint(); }

    new MutationObserver(function () { paint(); load(); }).observe(grid, { childList: true });
    root.setInterval(function () { if (visible()) load(); }, REFRESH_MS);
    doc.addEventListener("visibilitychange", function () { if (visible()) load(); });
    load();
  }

  // --- Church profile ------------------------------------------------------
  function initProfile(churchId, heading) {
    var entry = null, fetchedAt = -Infinity, pending = false;
    var href = "livestream.html?type=church&id=" + encodeURIComponent(churchId);

    function paint() {
      var now = serverNow();
      var badge = entry && now !== null ? computeBadge(entry, now) : { kind: "none" };
      var old = doc.querySelector("[data-sl-profile-badge]");
      var key = badge.kind === "none" ? "" : badge.kind + "|" + badge.label;
      if (!old || old.getAttribute("data-sl-key") !== key) {
        if (old) old.remove();
        if (key) {
          var el = makeBadge(badge, badge.kind === "live" ? href : null);
          el.setAttribute("data-sl-profile-badge", "");
          el.setAttribute("data-sl-key", key);
          el.classList.add("sl-badge--profile");
          heading.insertAdjacentElement("afterend", el);
        }
      }
      if (badge.needsRefresh) fetchedAt = -Infinity;
      scheduleTick([badge.nextChangeMs || null], tick);
    }

    function load() {
      if (pending || !visible() || root.performance.now() - fetchedAt < REFRESH_MS) { paint(); return; }
      pending = true;
      getJson("/api/churches/" + encodeURIComponent(churchId) + "/now-playing").then(function (data) {
        pending = false;
        fetchedAt = root.performance.now();
        if (data) { syncClock(data.serverTime); entry = data; } else entry = null;
        paint();
      });
    }

    function tick() { load(); }
    root.setInterval(function () { if (visible()) load(); }, REFRESH_MS);
    doc.addEventListener("visibilitychange", function () { if (visible()) load(); });
    load();
  }

  function start() {
    var grid = doc.querySelector("[data-church-grid]");
    if (grid) { initDirectory(grid); return; }
    var heading = doc.querySelector("h1.church-hero-name");
    if (!heading) return;
    var id = null;
    try { id = new URLSearchParams(root.location.search).get("id"); } catch (e) { id = null; }
    if (!id && root.MWE && root.MWE.currentProfileChurch) id = root.MWE.currentProfileChurch.id;
    if (id) initProfile(String(id), heading);
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { root.setTimeout(start, 0); });
  else root.setTimeout(start, 0);
})(typeof window !== "undefined" ? window : globalThis);
