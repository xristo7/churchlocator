/* Public play-as-live badges.
   Directory cards batch GET /api/simulated-live/now-playing?churchIds=
   (at most 50 ids). A church profile GETs /api/churches/:id/now-playing.
   The clock is serverTime plus performance.now() since that response. */
(function (root) {
  "use strict";

  var DEFAULT_TZ = "Africa/Kampala";
  var BATCH_MAX = 50;
  var REFRESH_MS = 60000;
  var UPCOMING_MS = 7 * 24 * 60 * 60 * 1000;

  function parseMs(value) {
    var ms = typeof value === "string" ? Date.parse(value) : NaN;
    return isFinite(ms) ? ms : null;
  }

  function safeZone(timezone) {
    var zone = typeof timezone === "string" && timezone ? timezone : DEFAULT_TZ;
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: zone }).format(0);
      return zone;
    } catch (error) {
      return DEFAULT_TZ;
    }
  }

  function part(parts, type) {
    for (var i = 0; i < parts.length; i++) if (parts[i].type === type) return parts[i].value;
    return "";
  }

  function formatStart(ms, timezone) {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: safeZone(timezone),
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date(ms));
    var hour = part(parts, "hour");
    if (hour === "24") hour = "00";
    return part(parts, "weekday") + " " + hour + ":" + part(parts, "minute");
  }

  function formatFull(ms, timezone) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: safeZone(timezone),
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short"
    }).format(new Date(ms));
  }

  // Badge for one now-playing entry at server-aligned nowMs.
  // {kind:"live"|"upcoming", label, ariaLabel, title, nextChangeMs, needsRefresh?}
  // or {kind:"none"}.
  function computeBadge(entry, nowMs) {
    if (!entry || typeof entry !== "object" || !entry.state || entry.state === "none") {
      return { kind: "none", nextChangeMs: null };
    }
    var zone = entry.timezone;
    var play = entry.play || null;
    var next = entry.nextPlay || null;
    var playStart = play ? parseMs(play.startsAt) : null;
    var playEnd = play ? parseMs(play.endsAt) : null;
    var nextStart = next ? parseMs(next.startsAt) : null;
    var upcoming = [];

    if (playStart !== null && playEnd !== null && playStart <= nowMs && nowMs < playEnd) {
      var until = formatFull(playStart, zone);
      return {
        kind: "live",
        label: "Live now",
        ariaLabel: "Live now, " + until,
        title: until,
        nextChangeMs: playEnd
      };
    }

    // nextPlay has no end. Once it starts, show Live now until a refetch fills the window.
    if (nextStart !== null && nextStart <= nowMs && nextStart !== playStart && nowMs - nextStart < REFRESH_MS * 2) {
      var started = formatFull(nextStart, zone);
      return {
        kind: "live",
        label: "Live now",
        ariaLabel: "Live now, " + started + (next.title ? ", " + next.title : ""),
        title: started,
        nextChangeMs: null,
        needsRefresh: true
      };
    }

    if (playStart !== null && playStart > nowMs) upcoming.push(playStart);
    if (nextStart !== null && nextStart > nowMs && nextStart !== playStart) upcoming.push(nextStart);
    if (!upcoming.length) return { kind: "none", nextChangeMs: null };
    var start = Math.min.apply(Math, upcoming);
    if (!(start < nowMs + UPCOMING_MS)) return { kind: "none", nextChangeMs: start };
    var full = formatFull(start, zone);
    return {
      kind: "upcoming",
      label: "Starts " + formatStart(start, zone),
      ariaLabel: "Starts " + full,
      title: full,
      nextChangeMs: start
    };
  }

  root.MWESimulatedLiveBadges = {
    computeBadge: computeBadge,
    formatStart: formatStart,
    formatFull: formatFull,
    DEFAULT_TIMEZONE: DEFAULT_TZ,
    BATCH_MAX: BATCH_MAX,
    REFRESH_MS: REFRESH_MS,
    UPCOMING_MS: UPCOMING_MS
  };

  var doc = root.document;
  if (!doc || typeof root.fetch !== "function" || !root.performance) return;

  var clock = { serverMs: null, perfAt: 0 };

  function noteServerTime(serverTime) {
    var ms = parseMs(serverTime);
    if (ms === null) return false;
    clock.serverMs = ms;
    clock.perfAt = root.performance.now();
    return true;
  }

  function serverNow() {
    if (clock.serverMs === null) return null;
    return clock.serverMs + (root.performance.now() - clock.perfAt);
  }

  function pageVisible() {
    return doc.visibilityState !== "hidden";
  }

  function getJson(url) {
    return root.fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" }
    }).then(function (res) {
      if (!res.ok) return null;
      return res.text().then(function (text) {
        try {
          var data = JSON.parse(text);
          return data && data.ok === true ? data : null;
        } catch (error) {
          return null;
        }
      });
    }).catch(function () { return null; });
  }

  function boundaryTimes(entry) {
    var times = [];
    if (!entry) return times;
    var play = entry.play || null;
    var next = entry.nextPlay || null;
    [play && play.startsAt, play && play.endsAt, next && next.startsAt].forEach(function (value) {
      var ms = parseMs(value);
      if (ms !== null) times.push(ms);
    });
    return times;
  }

  function makeBadge(badge, href) {
    var el = doc.createElement(href ? "a" : "span");
    el.className = "simlive-badge simlive-badge--" + badge.kind;
    el.setAttribute("data-simlive-badge", "");
    el.setAttribute("aria-label", badge.ariaLabel);
    el.title = badge.title || badge.ariaLabel;
    if (href) el.href = href;
    if (badge.kind === "live") {
      var dot = doc.createElement("span");
      dot.className = "simlive-badge-dot";
      dot.setAttribute("aria-hidden", "true");
      el.appendChild(dot);
    }
    el.appendChild(doc.createTextNode(badge.label));
    return el;
  }

  function initDirectory(grid) {
    var cache = Object.create(null);
    var inflight = Object.create(null);
    var timer = 0;

    function cards() {
      return Array.prototype.slice.call(grid.querySelectorAll(".church-card-immersive"));
    }

    function churchId(card) {
      var link = card.querySelector('a[href*="church-profile.html?id="]');
      if (!link) return null;
      try {
        return new URL(link.getAttribute("href"), root.location.href).searchParams.get("id");
      } catch (error) {
        return null;
      }
    }

    function arm(times) {
      if (timer) root.clearTimeout(timer);
      var now = serverNow();
      if (now === null) return;
      var soonest = null;
      times.forEach(function (t) {
        if (t > now && (soonest === null || t < soonest)) soonest = t;
      });
      if (soonest === null) return;
      var delay = Math.min(Math.max(0, soonest - now + 40), 2147483647);
      timer = root.setTimeout(tick, delay);
    }

    function paint() {
      var now = serverNow();
      var times = [];
      var refresh = false;
      cards().forEach(function (card) {
        var id = churchId(card);
        var cached = id ? cache[id] : null;
        var badge = cached && cached.entry && now !== null ? computeBadge(cached.entry, now) : { kind: "none" };
        if (cached && cached.entry) boundaryTimes(cached.entry).forEach(function (t) { times.push(t); });
        if (badge.needsRefresh && cached) {
          cached.fetchedAt = -Infinity;
          refresh = true;
        }
        var key = badge.kind === "none" ? "" : badge.kind + "|" + badge.label;
        var old = card.querySelector("[data-simlive-badge]");
        if (old && old.getAttribute("data-simlive-key") === key) return;
        if (old) old.remove();
        if (!key) return;
        var el = makeBadge(badge, null);
        el.setAttribute("data-simlive-key", key);
        (card.querySelector(".church-card-top-bar") || card).appendChild(el);
      });
      arm(times);
      if (refresh) load();
    }

    function remember(ids, data) {
      var at = root.performance.now();
      var timed = data && noteServerTime(data.serverTime) && data.churches;
      ids.forEach(function (id) {
        cache[id] = { entry: timed ? (data.churches[id] || null) : null, fetchedAt: at };
      });
    }

    function fetchChunk(ids) {
      ids.forEach(function (id) { inflight[id] = true; });
      var query = ids.map(function (id) { return encodeURIComponent(id); }).join(",");
      getJson("/api/simulated-live/now-playing?churchIds=" + query).then(function (data) {
        ids.forEach(function (id) { delete inflight[id]; });
        remember(ids, data);
        paint();
      });
    }

    function load() {
      if (!pageVisible()) return;
      var nowPerf = root.performance.now();
      var ids = [];
      cards().forEach(function (card) {
        var id = churchId(card);
        if (!id || inflight[id] || ids.indexOf(id) !== -1) return;
        var cached = cache[id];
        if (cached && nowPerf - cached.fetchedAt < REFRESH_MS) return;
        ids.push(id);
      });
      if (!ids.length) {
        paint();
        return;
      }
      for (var i = 0; i < ids.length; i += BATCH_MAX) fetchChunk(ids.slice(i, i + BATCH_MAX));
    }

    function tick() {
      load();
    }

    new MutationObserver(function () { load(); }).observe(grid, { childList: true });
    root.setInterval(function () { if (pageVisible()) load(); }, REFRESH_MS);
    doc.addEventListener("visibilitychange", function () { if (pageVisible()) load(); });
    load();
  }

  function initProfile(churchId, heading) {
    var entry = null;
    var fetchedAt = -Infinity;
    var pending = false;
    var timer = 0;
    var liveHref = "livestream.html?type=church&id=" + encodeURIComponent(churchId);

    function arm(times) {
      if (timer) root.clearTimeout(timer);
      var now = serverNow();
      if (now === null) return;
      var soonest = null;
      times.forEach(function (t) {
        if (t > now && (soonest === null || t < soonest)) soonest = t;
      });
      if (soonest === null) return;
      timer = root.setTimeout(load, Math.min(Math.max(0, soonest - now + 40), 2147483647));
    }

    function paint() {
      var now = serverNow();
      var badge = entry && now !== null ? computeBadge(entry, now) : { kind: "none" };
      var key = badge.kind === "none" ? "" : badge.kind + "|" + badge.label;
      var old = doc.querySelector("[data-simlive-profile]");
      if (!old || old.getAttribute("data-simlive-key") !== key) {
        if (old) old.remove();
        if (key && heading.isConnected) {
          var el = makeBadge(badge, badge.kind === "live" ? liveHref : null);
          el.classList.add("simlive-badge--profile");
          el.setAttribute("data-simlive-profile", "");
          el.setAttribute("data-simlive-key", key);
          heading.insertAdjacentElement("afterend", el);
        }
      }
      arm(boundaryTimes(entry));
      if (badge.needsRefresh) {
        fetchedAt = -Infinity;
        if (!pending) load();
      }
    }

    function load() {
      if (!pageVisible()) return;
      if (pending || root.performance.now() - fetchedAt < REFRESH_MS) {
        paint();
        return;
      }
      pending = true;
      getJson("/api/churches/" + encodeURIComponent(churchId) + "/now-playing").then(function (data) {
        pending = false;
        fetchedAt = root.performance.now();
        if (data && noteServerTime(data.serverTime)) entry = data;
        else entry = null;
        paint();
      });
    }

    root.setInterval(function () { if (pageVisible()) load(); }, REFRESH_MS);
    doc.addEventListener("visibilitychange", function () { if (pageVisible()) load(); });
    load();
  }

  function boot() {
    var grid = doc.querySelector("[data-church-grid]");
    if (grid) {
      initDirectory(grid);
      return;
    }
    var heading = doc.querySelector("h1.church-hero-name");
    if (!heading) return;
    var id = null;
    try { id = new URLSearchParams(root.location.search).get("id"); } catch (error) { id = null; }
    if (!id && root.MWE && root.MWE.currentProfileChurch) id = root.MWE.currentProfileChurch.id;
    if (id) initProfile(String(id), heading);
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
