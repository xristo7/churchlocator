/*
 * Scheduled "play as live" streams — church setup panel.
 *
 * Mount: <section id="simulated-live-settings" data-church-id="..." hidden></section>
 * The host page decides visibility (it unhides the section for authorised users);
 * this script only renders into it. No frameworks, no build step, no globals
 * except window.MWESimulatedLive (small testing/debug surface).
 *
 * The server is authoritative for everything: validation, conflicts, next plays.
 * The device clock is only used for a non-blocking "looks like it's in the past" hint.
 */
(function () {
  "use strict";

  var MOUNT_ID = "simulated-live-settings";
  var SINGLE_MAX = 95 * 1024 * 1024;          // 95 MB single-request upload
  var CHUNK_MAX = 2 * 1024 * 1024 * 1024;     // 2 GB chunked upload
  var MAX_SLOTS = 50;
  var MAX_DURATION = 12 * 60 * 60;            // 12 h
  var MAX_LOOP_MINUTES = 1440;
  var PREVIEW_DEBOUNCE = 500;
  var DEFAULT_TZ = "Africa/Kampala";
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var TIMEZONES = [
    "Africa/Kampala", "Africa/Nairobi", "Africa/Dar_es_Salaam", "Africa/Kigali", "Africa/Addis_Ababa",
    "Africa/Lagos", "Africa/Accra", "Africa/Johannesburg", "Africa/Cairo", "Africa/Kinshasa", "Africa/Lusaka",
    "Africa/Harare", "Africa/Casablanca", "Europe/London", "Europe/Dublin", "Europe/Paris", "Europe/Berlin",
    "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam", "Europe/Stockholm", "Europe/Athens", "Europe/Istanbul",
    "Europe/Moscow", "Asia/Dubai", "Asia/Riyadh", "Asia/Jerusalem", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka",
    "Asia/Bangkok", "Asia/Jakarta", "Asia/Singapore", "Asia/Manila", "Asia/Hong_Kong", "Asia/Shanghai",
    "Asia/Seoul", "Asia/Tokyo", "Australia/Perth", "Australia/Sydney", "Pacific/Auckland",
    "America/St_Johns", "America/Halifax", "America/Toronto", "America/New_York", "America/Chicago",
    "America/Winnipeg", "America/Denver", "America/Edmonton", "America/Phoenix", "America/Vancouver",
    "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu", "America/Mexico_City", "America/Bogota",
    "America/Lima", "America/Sao_Paulo", "America/Argentina/Buenos_Aires", "America/Santiago",
    "America/Jamaica", "America/Port_of_Spain", "UTC"
  ];

  /* ------------------------------------------------------------------ utils */

  var uidCounter = 0;
  function uid(prefix) { uidCounter += 1; return (prefix || "sl") + "-" + Date.now().toString(36) + "-" + uidCounter; }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c];
    });
  }
  function icon(name) { return '<i data-lucide="' + name + '" aria-hidden="true"></i>'; }
  function renderIcons() { try { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); } catch (e) { /* icons are decorative */ } }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function debounce(fn, wait) {
    var t = null;
    var wrapped = function () { clearTimeout(t); t = setTimeout(fn, wait); };
    wrapped.cancel = function () { clearTimeout(t); };
    return wrapped;
  }
  function abortError() { var e = new Error("Cancelled"); e.name = "AbortError"; return e; }
  function sleep(ms, signal) {
    return new Promise(function (resolve, reject) {
      if (signal && signal.aborted) return reject(abortError());
      var t = setTimeout(resolve, ms);
      if (signal) signal.addEventListener("abort", function () { clearTimeout(t); reject(abortError()); }, { once: true });
    });
  }
  function formatBytes(n) {
    if (n >= 1024 * 1024 * 1024) return (n / 1024 / 1024 / 1024).toFixed(2) + " GB";
    if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + " MB";
    return Math.max(1, Math.round(n / 1024)) + " KB";
  }
  function formatDuration(sec) {
    sec = Math.round(Number(sec) || 0);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var out = [];
    if (h) out.push(h + "h");
    if (m || h) out.push(m + "m");
    out.push(s + "s");
    return out.join(" ");
  }
  function isValidTimeZone(tz) {
    if (!tz) return false;
    try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch (e) { return false; }
  }
  function browserTimeZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { return ""; }
  }

  /* --------------------------------------------------------- time zones */
  // Pure Intl-based conversion (no libraries). Offsets are looked up per instant,
  // so DST transitions are handled.

  var dtfCache = {};
  function partsFormatter(tz) {
    if (!dtfCache[tz]) {
      dtfCache[tz] = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      });
    }
    return dtfCache[tz];
  }
  function zonedParts(ms, tz) {
    var out = {};
    partsFormatter(tz).formatToParts(new Date(ms)).forEach(function (p) {
      if (p.type !== "literal") out[p.type] = parseInt(p.value, 10);
    });
    if (out.hour === 24) out.hour = 0;
    return out;
  }
  /** Offset (ms) of `tz` from UTC at instant `ms` (positive east of Greenwich). */
  function tzOffsetMs(ms, tz) {
    var floored = Math.floor(ms / 1000) * 1000;
    var p = zonedParts(floored, tz);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - floored;
  }
  /** 'YYYY-MM-DDTHH:MM' wall-clock time in `tz` -> UTC ISO string ('...Z'), or null. */
  function zonedLocalToUtcIso(local, tz) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local || "");
    if (!m || !isValidTimeZone(tz)) return null;
    var guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0);
    // Same resolution as src/simulated-live.js zonedTimeToUtc: fall-back keeps the first
    // occurrence; a spring-forward gap shifts forward only when that instant is valid.
    var first = tzOffsetMs(guess, tz);
    var result = guess - first;
    var second = tzOffsetMs(result, tz);
    if (second !== first) {
      var alternative = guess - second;
      if (tzOffsetMs(alternative, tz) === second) result = alternative;
    }
    return new Date(result).toISOString();
  }
  /** UTC ISO -> 'YYYY-MM-DDTHH:MM' wall-clock in `tz` (for datetime-local inputs). */
  function utcIsoToZonedLocal(iso, tz) {
    var ms = Date.parse(iso);
    if (isNaN(ms) || !isValidTimeZone(tz)) return "";
    var p = zonedParts(ms, tz);
    return p.year + "-" + pad(p.month) + "-" + pad(p.day) + "T" + pad(p.hour) + ":" + pad(p.minute);
  }
  var labelCache = {};
  function labelParts(ms, tz) {
    if (!labelCache[tz]) {
      labelCache[tz] = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
      });
    }
    var o = {};
    labelCache[tz].formatToParts(new Date(ms)).forEach(function (p) { if (p.type !== "literal") o[p.type] = p.value; });
    if (o.hour === "24") o.hour = "00";
    if (o.month) o.month = o.month.replace(/\.$/, "").slice(0, 3); // "Sept" -> "Sep" (newer ICU)
    return o;
  }
  /** 'Sun 5 Oct, 10:00' in tz. */
  function formatInstant(iso, tz) {
    var ms = Date.parse(iso);
    if (isNaN(ms)) return String(iso || "");
    tz = isValidTimeZone(tz) ? tz : "UTC";
    var p = labelParts(ms, tz);
    return p.weekday + " " + p.day + " " + p.month + ", " + p.hour + ":" + p.minute;
  }
  /** 'Sun 5 Oct, 10:00 – 11:12' (end date repeated only when it falls on another day). */
  function formatPlay(startIso, endIso, tz) {
    tz = isValidTimeZone(tz) ? tz : "UTC";
    var s = Date.parse(startIso), e = Date.parse(endIso);
    if (isNaN(s)) return String(startIso || "");
    var start = formatInstant(startIso, tz);
    if (isNaN(e)) return start;
    var ps = labelParts(s, tz), pe = labelParts(e, tz);
    var sameDay = ps.day === pe.day && ps.month === pe.month && (e - s) < 86400000;
    return start + " \u2013 " + (sameDay ? pe.hour + ":" + pe.minute : formatInstant(endIso, tz));
  }

  /* -------------------------------------------------------------- network */

  function ApiError(message, status, data) {
    var e = new Error(message);
    e.name = "ApiError";
    e.status = status;
    e.data = data || {};
    e.code = e.data.code || null;
    return e;
  }
  var MEDIA_UNAVAILABLE = "Video storage isn't available on this environment.";
  function isMediaUnavailable(status, data) {
    return status === 503 && /media|video/i.test(String((data && data.error) || ""));
  }
  function friendlyError(status, data, fallback) {
    data = data || {};
    if (data.code === "moderation_locked") {
      return "This stream was paused by platform moderation, so it can't be resumed from here. Please contact the My Way team if you think this is a mistake.";
    }
    if (isMediaUnavailable(status, data)) return MEDIA_UNAVAILABLE;
    if (status === 403) return data.error || "You don't have permission to manage scheduled streams for this church.";
    if (status === 401) return "Your session has ended. Please sign in again.";
    if (status === 413) return "That file is too large for this upload method.";
    if (status === 429) return "Too many changes in a short time. Please wait a moment and try again.";
    return data.error || fallback || "The server could not complete this request.";
  }
  function retryAfterMs(headerValue, fallbackSeconds) {
    if (headerValue) {
      var n = Number(headerValue);
      if (!isNaN(n)) return Math.min(120, Math.max(1, n)) * 1000;
      var d = Date.parse(headerValue);
      if (!isNaN(d)) return Math.min(120000, Math.max(1000, d - Date.now()));
    }
    return (fallbackSeconds || 2) * 1000;
  }

  // JSON calls mirror platform-client.js / auth-client.js: same-origin cookies, JSON body, no CSRF header.
  function apiFetch(base, path, options) {
    options = options || {};
    var method = options.method || (options.body ? "POST" : "GET");
    var init = { method: method, credentials: "same-origin", cache: "no-store", headers: {} };
    if (options.body !== undefined) { init.headers["content-type"] = "application/json"; init.body = JSON.stringify(options.body); }
    if (options.signal) init.signal = options.signal;
    var attempts = 0;
    function run() {
      attempts += 1;
      return fetch(base + path, init).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (response.status === 429 && options.retry429 && attempts < 4) {
            return sleep(retryAfterMs(response.headers.get("retry-after")), options.signal).then(run);
          }
          if (!response.ok || data.ok === false) {
            var err = ApiError(friendlyError(response.status, data), response.status, data);
            err.retryAfter = response.headers.get("retry-after");
            throw err;
          }
          return data;
        });
      }, function (error) {
        if (error && error.name === "AbortError") throw error;
        throw ApiError("Could not reach the server. Check your connection and try again.", 0, {});
      });
    }
    return run();
  }

  // XHR is used for upload traffic so we can report byte-level progress (same-origin cookies are sent by default).
  function xhrRequest(opts) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open(opts.method, opts.url, true);
      Object.keys(opts.headers || {}).forEach(function (k) { x.setRequestHeader(k, opts.headers[k]); });
      if (opts.onProgress && x.upload) {
        x.upload.onprogress = function (e) { if (e.lengthComputable) opts.onProgress(e.loaded, e.total); };
      }
      x.onload = function () {
        var data = null;
        try { data = JSON.parse(x.responseText); } catch (e) { data = null; }
        resolve({ status: x.status, data: data || {}, header: function (n) { return x.getResponseHeader(n); } });
      };
      x.onerror = function () { var e = new Error("Network error"); e.network = true; reject(e); };
      x.ontimeout = x.onerror;
      x.onabort = function () { reject(abortError()); };
      if (opts.signal) {
        if (opts.signal.aborted) { reject(abortError()); return; }
        opts.signal.addEventListener("abort", function () { x.abort(); }, { once: true });
      }
      x.send(opts.body == null ? null : opts.body);
    });
  }
  /** Retries 429 (honouring retry-after seconds) and transient network/5xx errors with exponential backoff. */
  function withRetry(makeRequest, signal, onWait) {
    var rateTries = 0, netTries = 0;
    function attempt() {
      return makeRequest().then(function (res) {
        if (res.status === 429 && rateTries < 10) {
          rateTries += 1;
          var wait = retryAfterMs(res.header("retry-after"), 5);
          if (onWait) onWait("Upload rate limit reached \u2014 resuming in " + Math.ceil(wait / 1000) + "s\u2026");
          return sleep(wait, signal).then(attempt);
        }
        if (isMediaUnavailable(res.status, res.data)) return res;
        if ([502, 504].indexOf(res.status) >= 0 && netTries < 4) {
          netTries += 1;
          return sleep(1000 * Math.pow(2, netTries - 1), signal).then(attempt);
        }
        return res;
      }, function (err) {
        if (err && err.name === "AbortError") throw err;
        if (netTries < 4) {
          netTries += 1;
          if (onWait) onWait("Connection problem \u2014 retrying (" + netTries + "/4)\u2026");
          return sleep(1000 * Math.pow(2, netTries - 1), signal).then(attempt);
        }
        throw ApiError("The upload lost its connection. Check your network and try again.", 0, {});
      });
    }
    return attempt();
  }
  function ensureOk(res, fallback) {
    if (res.status < 200 || res.status >= 300 || res.data.ok === false) {
      throw ApiError(friendlyError(res.status, res.data, fallback), res.status, res.data);
    }
    return res.data;
  }

  /* --------------------------------------------------------- video helpers */

  function readVideoDuration(src) {
    return new Promise(function (resolve, reject) {
      var video = document.createElement("video");
      var done = false, timer = null;
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.hidden = true;
      video.setAttribute("aria-hidden", "true");
      function finish(fn, value) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        video.removeAttribute("src");
        try { video.load(); } catch (e) { /* ignore */ }
        if (video.parentNode) video.parentNode.removeChild(video);
        fn(value);
      }
      timer = setTimeout(function () {
        finish(reject, new Error("Timed out reading the video. Check that the link is public and points to an MP4 file."));
      }, 25000);
      video.addEventListener("loadedmetadata", function () {
        var d = video.duration;
        if (!isFinite(d) || d <= 0) finish(reject, new Error("We couldn't read the length of this video."));
        else finish(resolve, d);
      });
      video.addEventListener("error", function () {
        finish(reject, new Error("We couldn't load this video. Check that it exists, is publicly reachable and is an MP4 file."));
      });
      document.body.appendChild(video);
      video.src = src;
    });
  }
  function wholeSeconds(value) {
    var n = Math.round(Number(value));
    return Number.isFinite(n) ? n : 0;
  }
  function durationReady(ed) {
    return ed.durationState !== "reading" && Number.isInteger(ed.durationSeconds) && ed.durationSeconds >= 1 && ed.durationSeconds <= MAX_DURATION;
  }
  function normalizeHm(value) {
    var m = /^(\d{2}:\d{2})/.exec(String(value || ""));
    return m && /^([01]\d|2[0-3]):[0-5]\d$/.test(m[1]) ? m[1] : "";
  }
  function checkPoster(value) {
    var url = String(value || "").trim();
    if (!url) return "";
    if (/^\/media\/(creator-media|church-video)\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$/i.test(url)) return "";
    try {
      var parsed = new URL(url);
      if (parsed.protocol === "https:" && !parsed.username && !parsed.password) return "";
    } catch (e) { /* invalid */ }
    return "Use an https:// image link for the poster.";
  }
  function checkVideoLink(url) {
    var value = String(url || "").trim();
    if (!value) return "Paste a link to an MP4 file.";
    if (/^\/media\/church-video\//.test(value)) return "";
    var parsed;
    try { parsed = new URL(value); } catch (e) { return "That doesn't look like a valid link."; }
    if (parsed.protocol !== "https:") return "The link must start with https://.";
    if (/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i.test(parsed.hostname)) return "YouTube links aren't supported. Use a direct link to an .mp4 file or upload the video.";
    if (!/\.mp4$/i.test(parsed.pathname)) return "The link must point directly to an .mp4 file.";
    return "";
  }
  function isMp4File(file) {
    return !!file && (file.type === "video/mp4" || /\.mp4$/i.test(file.name || ""));
  }

  /* ------------------------------------------------------------------ app */

  function createPanel(root, churchId) {
    var base = "/api/churches/" + encodeURIComponent(churchId) + "/simulated-live";
    var api = function (path, options) { return apiFetch(base, path, options); };
    var prefix = uid("sl");
    var state = {
      view: "list",
      streams: [],
      loading: true,
      listError: "",
      flash: "",
      flashError: false,
      clockSkewMs: 0,       // serverTime - device time, when the server reports serverTime
      editor: null,
      upload: null,
      preview: { seq: 0, controller: null, result: null, key: "", pending: false, error: "" },
      serverErrors: null,
      touchedTitle: false,
      saving: false
    };
    var schedulePreview = debounce(runPreview, PREVIEW_DEBOUNCE);
    var destroyed = false;
    var listeners = [];
    var timers = [];
    function on(target, type, fn) { target.addEventListener(type, fn); listeners.push([target, type, fn]); }
    function later(fn, ms) {
      var t = setTimeout(function () { timers = timers.filter(function (x) { return x !== t; }); if (!destroyed) fn(); }, ms);
      timers.push(t);
      return t;
    }

    function id(name) { return prefix + "-" + name; }
    function $(sel) { return root.querySelector(sel); }
    function $$(sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
    function byId(name) { return document.getElementById(id(name)); }
    function now() { return Date.now() + state.clockSkewMs; }
    function noteServerTime(data) {
      if (data && data.serverTime) {
        var t = Date.parse(data.serverTime);
        if (!isNaN(t)) state.clockSkewMs = t - Date.now();
      }
    }

    /* ---------------- list view ---------------- */

    function loadStreams(message, isError) {
      if (destroyed) return Promise.resolve();
      state.loading = true;
      state.listError = "";
      if (message !== undefined) { state.flash = message; state.flashError = !!isError; }
      if (state.view === "list") renderList();
      return api("").then(function (data) {
        noteServerTime(data);
        state.streams = Array.isArray(data.streams) ? data.streams : [];
      }, function (err) {
        state.listError = err.message;
      }).then(function () {
        state.loading = false;
        if (state.view === "list") renderList();
      });
    }

    function isLocked(stream) { return !!(stream && stream.moderationLocked); }
    function statusBadge(stream) {
      var s = stream.status || "active";
      if (s === "paused" && isLocked(stream)) return '<span class="sl-badge sl-badge-locked">' + icon("shield-alert") + "Paused by moderation</span>";
      var label = { active: "Active", paused: "Paused", archived: "Archived" }[s] || s;
      return '<span class="sl-badge sl-badge-' + esc(s) + '">' + esc(label) + "</span>";
    }
    function modeText(stream) {
      var d = stream.durationSeconds ? formatDuration(stream.durationSeconds) : "unknown length";
      if (stream.playMode === "loop") return "Loop \u00b7 " + (stream.loopWindowMinutes || "?") + " min window \u00b7 video " + d;
      return "Play once \u00b7 " + d;
    }
    function moderationNotice(stream, tz, extra) {
      return '<div class="sl-moderation" role="note">' + icon("shield-alert") +
        "<div><strong>Paused by platform moderation</strong>" +
        (stream.pausedAt ? '<span class="sl-small"> \u00b7 since ' + esc(formatInstant(stream.pausedAt, tz)) + "</span>" : "") +
        (stream.moderationNote ? '<p class="sl-moderation-note">\u201c' + esc(stream.moderationNote) + "\u201d</p>" : "") +
        '<p class="sl-muted sl-small">' + extra + "</p></div></div>";
    }
    function streamItem(stream) {
      var tz = stream.timezone || DEFAULT_TZ;
      var next = (stream.nextPlays || [])[0];
      var archived = stream.status === "archived";
      var locked = isLocked(stream);
      var notice = "";
      if (stream.status === "paused" && locked) {
        notice = moderationNotice(stream, tz, "This stream won't play and can't be resumed from here. Contact the My Way team if you have questions.");
      } else if (stream.status === "paused") {
        notice = '<p class="sl-muted sl-small">Paused' + (stream.pausedAt ? " since " + esc(formatInstant(stream.pausedAt, tz)) : "") + ". Resume to play on schedule again.</p>";
      }
      var actions = "";
      if (!archived) {
        actions += '<button type="button" class="button small ghost" data-sl-edit="' + esc(stream.id) + '" aria-label="Edit ' + esc(stream.title) + '">' + icon("pencil") + "Edit</button>";
        if (stream.status === "active") {
          actions += '<button type="button" class="button small ghost" data-sl-status="paused" data-sl-id="' + esc(stream.id) + '" aria-label="Pause ' + esc(stream.title) + '">' + icon("pause") + "Pause</button>";
        } else if (stream.status === "paused" && !locked) {
          actions += '<button type="button" class="button small ghost" data-sl-status="active" data-sl-id="' + esc(stream.id) + '" aria-label="Resume ' + esc(stream.title) + '">' + icon("play") + "Resume</button>";
        }
        actions += '<button type="button" class="button small danger" data-sl-archive="' + esc(stream.id) + '" aria-label="Archive ' + esc(stream.title) + '">' + icon("archive") + "Archive</button>";
      }
      var nextText = "";
      if (!archived) {
        if (stream.status === "paused") nextText = "Not playing while paused";
        else nextText = next ? "Next: " + formatPlay(next.startsAt, next.endsAt, tz) : "No upcoming plays";
      }
      return '<li class="sl-stream' + (archived ? " sl-stream-archived" : "") + '">' +
        '<div class="sl-stream-main">' +
          (stream.posterUrl ? '<img class="sl-stream-poster" src="' + esc(stream.posterUrl) + '" alt="" loading="lazy">' : '<span class="sl-stream-poster sl-stream-poster-empty">' + icon("clapperboard") + "</span>") +
          '<div class="sl-stream-text"><div class="sl-stream-title"><h3>' + esc(stream.title || "Untitled stream") + "</h3>" + statusBadge(stream) + "</div>" +
          '<p class="sl-muted sl-small">' + esc(modeText(stream)) + " \u00b7 " + esc(tz.replace(/_/g, " ")) + "</p>" +
          (nextText ? '<p class="sl-next">' + icon("calendar-clock") + esc(nextText) + "</p>" : "") +
          notice + "</div></div>" +
        (actions ? '<div class="sl-stream-actions">' + actions + "</div>" : "") +
        "</li>";
    }

    function renderList() {
      if (destroyed) return;
      state.view = "list";
      var active = state.streams.filter(function (s) { return s.status !== "archived"; });
      var archived = state.streams.filter(function (s) { return s.status === "archived"; });
      var body;
      if (state.loading && !state.streams.length) body = '<p class="sl-muted sl-loading" role="status">Loading scheduled streams\u2026</p>';
      else if (state.listError) body = '<div class="sl-error" role="alert">' + esc(state.listError) + ' <button type="button" class="button small ghost" data-sl-reload>Try again</button></div>';
      else if (!active.length) body = '<div class="sl-empty">' + icon("radio") + "<p>No scheduled streams yet. Pick a recorded service and choose when it should play as if it were live.</p></div>";
      else body = '<ul class="sl-stream-list" aria-busy="' + state.loading + '">' + active.map(streamItem).join("") + "</ul>";
      if (!state.listError && archived.length) {
        body += '<details class="sl-archived"><summary>Archived (' + archived.length + ')</summary><ul class="sl-stream-list">' + archived.map(streamItem).join("") + "</ul></details>";
      }
      root.innerHTML = '<div class="sl-panel">' +
        '<header class="sl-head"><div><h2>' + icon("radio-tower") + "Scheduled live streams</h2>" +
        '<p class="sl-muted">Play a pre-recorded video as a live stream at set times \u2014 once or every week.</p></div>' +
        '<button type="button" class="button primary" data-sl-new>' + icon("plus") + "New scheduled stream</button></header>" +
        '<div class="sl-flash' + (state.flashError ? " sl-flash-error" : "") + '" role="status" aria-live="polite">' + esc(state.flash) + "</div>" +
        body + "</div>";
      renderIcons();
    }

    function upsertStream(stream) {
      for (var i = 0; i < state.streams.length; i++) {
        if (String(state.streams[i].id) === String(stream.id)) { state.streams[i] = stream; return; }
      }
      state.streams.unshift(stream);
    }
    function findStream(streamId) {
      for (var i = 0; i < state.streams.length; i++) if (String(state.streams[i].id) === String(streamId)) return state.streams[i];
      return null;
    }
    function setFlash(text, isError) {
      state.flash = text; state.flashError = !!isError;
      var el = $(".sl-flash");
      if (el) { el.textContent = text; el.classList.toggle("sl-flash-error", !!isError); }
    }
    function changeStatus(streamId, status, button) {
      if (button) button.disabled = true;
      api("/" + encodeURIComponent(streamId), { method: "PATCH", body: { status: status }, retry429: true }).then(function (data) {
        if (data && data.stream && data.stream.id != null) upsertStream(data.stream);
        loadStreams(status === "paused" ? "Stream paused. It won't play until you resume it." : "Stream resumed.");
      }, function (err) {
        if (button) button.disabled = false;
        // moderation_locked: refresh so the list shows the lock notice and hides Resume.
        if (err.code === "moderation_locked") loadStreams(err.message, true);
        else setFlash(err.message, true);
      });
    }
    function archiveStream(streamId, button) {
      var stream = findStream(streamId);
      var name = stream ? stream.title : "this stream";
      if (!window.confirm("Archive \u201c" + name + "\u201d? It will stop playing and its upcoming plays will be removed.")) return;
      if (button) button.disabled = true;
      api("/" + encodeURIComponent(streamId), { method: "DELETE", retry429: true }).then(function () {
        loadStreams("\u201c" + name + "\u201d was archived.");
      }, function (err) {
        if (button) button.disabled = false;
        setFlash(err.message, true);
      });
    }

    /* ---------------- editor state ---------------- */

    function newSlotRow(kind, source) {
      source = source || {};
      return {
        uid: uid("slot"),
        id: source.id != null ? source.id : null,
        kind: kind || source.kind || "weekly",
        startsLocal: source.startsLocal || "",
        // Saved one-off slots remember the exact server string + what it was derived from, so an
        // unchanged (possibly already past) slot is sent back verbatim (server compares strings).
        originalStartsAt: source.originalStartsAt || null,
        originalLocal: source.originalLocal || null,
        originalTz: source.originalTz || null,
        weekday: source.weekday != null ? Number(source.weekday) : 0,
        localTime: normalizeHm(source.localTime) || "10:00",
        activeFrom: source.activeFrom ? String(source.activeFrom).slice(0, 10) : "",
        activeUntil: source.activeUntil ? String(source.activeUntil).slice(0, 10) : ""
      };
    }
    function editorFromStream(stream) {
      var tz = isValidTimeZone(stream && stream.timezone) ? stream.timezone : DEFAULT_TZ;
      var ed = {
        id: stream ? stream.id : null,
        original: stream || null,
        title: stream ? stream.title || "" : "",
        description: stream ? stream.description || "" : "",
        videoUrl: stream ? stream.videoUrl || "" : "",
        videoSource: stream ? stream.videoSource || "" : "",
        videoTab: stream && stream.videoSource === "mp4_url" ? "link" : "upload",
        linkDraft: stream && stream.videoSource === "mp4_url" ? stream.videoUrl || "" : "",
        localPreviewUrl: "",
        durationSeconds: stream ? wholeSeconds(stream.durationSeconds) : 0,
        durationState: stream && wholeSeconds(stream.durationSeconds) >= 1 ? "ok" : "none",
        durationManual: false,
        durationMessage: "",
        mediaUnavailable: false,
        playMode: stream && stream.playMode === "loop" ? "loop" : "once",
        loopWindowMinutes: stream && stream.loopWindowMinutes ? String(stream.loopWindowMinutes) : "",
        timezone: tz,
        posterUrl: stream ? stream.posterUrl || "" : "",
        slots: []
      };
      ((stream && stream.slots) || []).forEach(function (s) {
        if (s.kind === "once") {
          var local = utcIsoToZonedLocal(s.startsAt, tz);
          ed.slots.push(newSlotRow("once", { id: s.id, startsLocal: local, originalStartsAt: s.startsAt, originalLocal: local, originalTz: tz }));
        }
        else ed.slots.push(newSlotRow("weekly", s));
      });
      if (!stream) ed.slots.push(newSlotRow("weekly"));
      return ed;
    }

    /** Editor rows -> API slots, remembering which row each sent slot came from (map[sentIndex] = rowIndex). */
    function collectSlots() {
      var ed = state.editor, slots = [], map = [], rowErrors = {}, pastHints = {};
      ed.slots.forEach(function (row, i) {
        if (row.kind === "once") {
          if (!row.startsLocal) { rowErrors[row.uid] = "Choose a date and time."; return; }
          if (isUnchangedSaved(row, ed)) {
            if (Date.parse(row.originalStartsAt) < now()) pastHints[row.uid] = { type: "note", text: "Already played \u2014 kept in the schedule as saved." };
            slots.push({ kind: "once", startsAt: row.originalStartsAt });
          } else {
            var iso = zonedLocalToUtcIso(row.startsLocal, ed.timezone);
            if (!iso) { rowErrors[row.uid] = "That date and time isn't valid."; return; }
            if (Date.parse(iso) < now()) pastHints[row.uid] = { type: "hint", text: "This time looks like it's already in the past." };
            slots.push({ kind: "once", startsAt: iso });
          }
        } else {
          if (!/^\d{2}:\d{2}$/.test(row.localTime || "")) { rowErrors[row.uid] = "Choose a time."; return; }
          if (row.activeFrom && row.activeUntil && row.activeFrom > row.activeUntil) { rowErrors[row.uid] = "The last date must be on or after the first date."; return; }
          var slot = { kind: "weekly", weekday: Number(row.weekday), localTime: row.localTime };
          if (row.activeFrom) slot.activeFrom = row.activeFrom;
          if (row.activeUntil) slot.activeUntil = row.activeUntil;
          slots.push(slot);
        }
        map.push(i);
      });
      return { slots: slots, map: map, rowErrors: rowErrors, pastHints: pastHints };
    }
    function isUnchangedSaved(row, ed) {
      return !!row.originalStartsAt && row.startsLocal === row.originalLocal && ed.timezone === row.originalTz;
    }
    function minLoopMinutes() {
      var d = state.editor.durationSeconds;
      return d ? Math.max(1, Math.ceil(d / 60)) : 1;
    }
    function fieldProblems() {
      var ed = state.editor, p = {};
      if (!ed.title.trim()) p.title = "Give the stream a title.";
      if (!ed.videoUrl) p.video = "Upload a video or add an MP4 link.";
      else if (!durationReady(ed)) p.duration = ed.durationState === "manual"
        ? "Enter the video length as a whole number of seconds (1 to " + MAX_DURATION + ")."
        : (ed.durationMessage || "We need the video's length before saving.");
      if (ed.playMode === "loop") {
        var n = Number(ed.loopWindowMinutes);
        if (!ed.loopWindowMinutes || !isFinite(n) || Math.floor(n) !== n) p.loop = "Enter the loop window in whole minutes.";
        else if (n < minLoopMinutes()) p.loop = "The loop window must be at least one full play (" + minLoopMinutes() + " min).";
        else if (n > MAX_LOOP_MINUTES) p.loop = "The loop window can be at most 1440 minutes (24 hours).";
      }
      if (!isValidTimeZone(ed.timezone)) p.timezone = "Choose a valid time zone.";
      var posterProblem = checkPoster(ed.posterUrl);
      if (posterProblem) p.poster = posterProblem;
      if (ed.slots.length > MAX_SLOTS) p.slots = "You can add at most " + MAX_SLOTS + " slots.";
      return p;
    }
    function buildBody(collected) {
      var ed = state.editor;
      var body = {
        title: ed.title.trim(),
        description: ed.description.trim(),
        videoUrl: ed.videoUrl,
        durationSeconds: wholeSeconds(ed.durationSeconds),
        playMode: ed.playMode,
        timezone: ed.timezone,
        slots: collected.slots
      };
      if (ed.playMode === "loop") body.loopWindowMinutes = Number(ed.loopWindowMinutes);
      // Manager routes read posterUrl (public now-playing uses poster). videoSource is derived server-side from videoUrl.
      var poster = ed.posterUrl.trim();
      if (poster) body.posterUrl = poster;
      else if (ed.original && ed.original.posterUrl) body.posterUrl = null;
      return body;
    }
    function currentKey() { return state.editor ? JSON.stringify(buildBody(collectSlots())) : ""; }
    /** Latest save error or preview result, but only if it still matches the form contents. */
    function currentServerResult() {
      var key = currentKey();
      if (state.serverErrors && state.serverErrors.key === key) return state.serverErrors;
      if (state.preview.result && state.preview.key === key) return state.preview.result;
      return null;
    }

    /* ---------------- editor rendering ---------------- */

    function openEditor(stream) {
      state.view = "editor";
      state.editor = editorFromStream(stream);
      if (state.preview.controller) state.preview.controller.abort();
      state.preview = { seq: state.preview.seq + 1, controller: null, result: null, key: "", pending: false, error: "" };
      state.serverErrors = null;
      state.touchedTitle = false;
      state.saving = false;
      renderEditor();
      var title = byId("title");
      if (title) title.focus();
      schedulePreview();
    }

    function tzOptions(selected) {
      var list = TIMEZONES.slice();
      var browser = browserTimeZone();
      if (browser && list.indexOf(browser) < 0 && isValidTimeZone(browser)) list.unshift(browser);
      if (selected && list.indexOf(selected) < 0) list.unshift(selected);
      return list.filter(isValidTimeZone).map(function (tz) {
        var label = tz.replace(/_/g, " ") + (tz === DEFAULT_TZ ? " (default)" : "") + (tz === browser ? " (this device)" : "");
        return '<option value="' + esc(tz) + '"' + (tz === selected ? " selected" : "") + ">" + esc(label) + "</option>";
      }).join("");
    }
    function tabButton(key, label, ico) {
      var selected = state.editor.videoTab === key;
      return '<button type="button" role="tab" class="sl-tab" id="' + id("tab-" + key) + '" data-sl-tab="' + key + '" aria-controls="' + id("panel-" + key) + '" aria-selected="' + selected + '" tabindex="' + (selected ? "0" : "-1") + '">' + icon(ico) + label + "</button>";
    }

    function renderEditor() {
      if (destroyed) return;
      var ed = state.editor;
      var isEdit = !!ed.id;
      var locked = ed.original && isLocked(ed.original) && ed.original.status === "paused";
      root.innerHTML = '<form class="sl-panel sl-editor" novalidate aria-labelledby="' + id("heading") + '">' +
        '<div class="sl-editor-head"><button type="button" class="sl-back" data-sl-cancel>' + icon("arrow-left") + "Back to streams</button>" +
        '<h2 id="' + id("heading") + '">' + (isEdit ? "Edit scheduled stream" : "New scheduled stream") + "</h2>" +
        (locked ? moderationNotice(ed.original, ed.timezone, "You can still update details, but the stream stays paused until the platform team lifts the pause.") : "") +
        "</div>" +
        '<div class="sl-editor-grid"><div class="sl-editor-main">' +

        '<section class="sl-card" aria-labelledby="' + id("h-details") + '"><h3 id="' + id("h-details") + '">Details</h3>' +
        '<label class="form-field"><span>Title <em aria-hidden="true">*</em></span><input id="' + id("title") + '" name="title" maxlength="200" required autocomplete="off" value="' + esc(ed.title) + '" aria-describedby="' + id("title-msg") + '"></label>' +
        '<p class="sl-field-msg" id="' + id("title-msg") + '"></p>' +
        '<label class="form-field"><span>Description (optional)</span><textarea name="description" maxlength="5000" rows="3">' + esc(ed.description) + "</textarea></label></section>" +

        '<section class="sl-card" aria-labelledby="' + id("h-video") + '"><h3 id="' + id("h-video") + '">Video</h3>' +
        '<div class="sl-tabs" role="tablist" aria-label="Video source">' + tabButton("upload", "Upload file", "upload") + tabButton("link", "MP4 link", "link") + "</div>" +
        '<div class="sl-tabpanel" role="tabpanel" id="' + id("panel-upload") + '" aria-labelledby="' + id("tab-upload") + '"' + (ed.videoTab === "upload" ? "" : " hidden") + ">" +
          '<input class="sl-visually-hidden sl-file" type="file" id="' + id("file") + '" accept="video/mp4,.mp4" aria-describedby="' + id("file-help") + '">' +
          '<label class="sl-drop" for="' + id("file") + '">' + icon("film") + "<span><strong>Choose an MP4 file</strong> or drop it here" +
          '<small class="sl-muted" id="' + id("file-help") + '">Files up to 95 MB upload in one go; larger files (up to 2 GB) upload in parts automatically.</small></span></label>' +
          '<div class="sl-upload" id="' + id("upload") + '" hidden><div class="sl-upload-row"><span id="' + id("upload-label") + '">Uploading\u2026</span>' +
          '<button type="button" class="button small ghost" data-sl-upload-cancel>' + icon("x") + "Cancel upload</button></div>" +
          '<progress id="' + id("progress") + '" max="100" value="0" aria-labelledby="' + id("upload-label") + '"></progress>' +
          '<p class="sl-small sl-muted" id="' + id("upload-detail") + '" aria-live="polite"></p></div></div>' +
        '<div class="sl-tabpanel" role="tabpanel" id="' + id("panel-link") + '" aria-labelledby="' + id("tab-link") + '"' + (ed.videoTab === "link" ? "" : " hidden") + ">" +
          '<div class="sl-inline"><label class="form-field sl-grow"><span>Direct link to an .mp4 file</span>' +
          '<input type="url" inputmode="url" id="' + id("link") + '" placeholder="https://example.org/sunday-service.mp4" value="' + esc(ed.linkDraft) + '" aria-describedby="' + id("link-help") + '"></label>' +
          '<button type="button" class="button ghost" data-sl-link-check>' + icon("check") + "Use link</button></div>" +
          '<p class="sl-small sl-muted" id="' + id("link-help") + '">Must be https and end in .mp4. YouTube links aren\u2019t supported.</p></div>' +
        '<div class="sl-video-status" id="' + id("video-status") + '" aria-live="polite"></div>' +
        '<div class="sl-player" id="' + id("player") + '"></div></section>' +

        '<section class="sl-card" aria-labelledby="' + id("h-playback") + '"><h3 id="' + id("h-playback") + '">Playback</h3>' +
        '<fieldset class="sl-radios"><legend>Play mode</legend>' +
          '<label class="sl-radio"><input type="radio" name="playMode" value="once"' + (ed.playMode === "once" ? " checked" : "") + '><span><strong>Play once</strong><small class="sl-muted">Each slot plays the video one time.</small></span></label>' +
          '<label class="sl-radio"><input type="radio" name="playMode" value="loop"' + (ed.playMode === "loop" ? " checked" : "") + '><span><strong>Loop</strong><small class="sl-muted">Repeat the video for a set window.</small></span></label></fieldset>' +
        '<div class="sl-loop" id="' + id("loop-wrap") + '"' + (ed.playMode === "loop" ? "" : " hidden") + '><label class="form-field"><span>Loop window (minutes)</span>' +
          '<input type="number" inputmode="numeric" name="loopWindowMinutes" min="1" max="1440" step="1" value="' + esc(ed.loopWindowMinutes) + '" aria-describedby="' + id("loop-msg") + '"></label>' +
          '<p class="sl-field-msg" id="' + id("loop-msg") + '"></p></div>' +
        '<div class="sl-two"><div><label class="form-field"><span>Time zone</span><select name="timezone" id="' + id("tz") + '" aria-describedby="' + id("tz-help") + '">' + tzOptions(ed.timezone) + "</select></label>" +
          '<p class="sl-small sl-muted" id="' + id("tz-help") + '">Slot times are interpreted in this time zone.</p></div>' +
        '<div><label class="form-field"><span>Poster image URL (optional)</span><input type="url" inputmode="url" name="posterUrl" placeholder="https://\u2026" value="' + esc(ed.posterUrl) + '" aria-describedby="' + id("poster-msg") + '"></label>' +
          '<p class="sl-small sl-muted">An https:// image link. This API does not accept a poster file upload.</p>' +
          '<p class="sl-field-msg" id="' + id("poster-msg") + '"></p></div></div></section>' +

        '<section class="sl-card" aria-labelledby="' + id("h-slots") + '"><div class="sl-card-head"><h3 id="' + id("h-slots") + '">Play schedule</h3>' +
          '<span class="sl-small sl-muted" id="' + id("slot-count") + '"></span></div>' +
        '<ol class="sl-slots" id="' + id("slots") + '"></ol>' +
        '<div class="sl-slot-add"><button type="button" class="button small ghost" data-sl-add="weekly">' + icon("repeat") + "Add weekly slot</button>" +
          '<button type="button" class="button small ghost" data-sl-add="once">' + icon("calendar-plus") + "Add one-off slot</button></div>" +
        '<p class="sl-small sl-muted" id="' + id("dates-help") + '"></p>' +
        '<p class="sl-field-msg" id="' + id("slots-msg") + '"></p></section>' +
        "</div>" +

        '<aside class="sl-editor-side"><section class="sl-card sl-preview" aria-labelledby="' + id("h-preview") + '">' +
          '<h3 id="' + id("h-preview") + '">' + icon("calendar-clock") + "Next 5 plays</h3>" +
          '<div id="' + id("preview") + '" aria-live="polite" aria-atomic="true"></div></section>' +
        '<div class="sl-form-errors" id="' + id("errors") + '" role="alert" aria-live="assertive"></div>' +
        '<div class="sl-actions"><button type="button" class="button ghost" data-sl-cancel>Cancel</button>' +
          '<button type="submit" class="button primary" id="' + id("save") + '" aria-describedby="' + id("save-hint") + '">' + icon("save") + (isEdit ? "Save changes" : "Create stream") + "</button></div>" +
        '<p class="sl-small sl-muted" id="' + id("save-hint") + '"></p></aside>' +
        "</div></form>";
      renderSlots();
      renderVideo();
      renderPreview();
      refreshValidity();
      renderIcons();
    }

    function weekdayOptions(sel) {
      return WEEKDAYS.map(function (d, i) { return '<option value="' + i + '"' + (Number(sel) === i ? " selected" : "") + ">" + d + "</option>"; }).join("");
    }
    function slotRowHtml(row, index) {
      var n = index + 1;
      var kindSelect = '<label class="form-field sl-kind"><span>Type</span><select data-sl-field="kind">' +
        '<option value="weekly"' + (row.kind === "weekly" ? " selected" : "") + ">Weekly</option>" +
        '<option value="once"' + (row.kind === "once" ? " selected" : "") + ">One-off</option></select></label>";
      var fields;
      if (row.kind === "once") {
        fields = '<label class="form-field sl-grow"><span>Date &amp; time</span><input type="datetime-local" data-sl-field="startsLocal" value="' + esc(row.startsLocal) + '" required></label>';
      } else {
        fields = '<label class="form-field"><span>Day</span><select data-sl-field="weekday">' + weekdayOptions(row.weekday) + "</select></label>" +
          '<label class="form-field"><span>Time</span><input type="time" data-sl-field="localTime" value="' + esc(row.localTime) + '" required></label>' +
          '<label class="form-field"><span>First date (optional)</span><input type="date" data-sl-field="activeFrom" value="' + esc(row.activeFrom) + '" aria-describedby="' + id("dates-help") + '"></label>' +
          '<label class="form-field"><span>Last date (optional)</span><input type="date" data-sl-field="activeUntil" value="' + esc(row.activeUntil) + '" aria-describedby="' + id("dates-help") + '"></label>';
      }
      return '<li class="sl-slot" data-sl-row="' + row.uid + '"><fieldset><legend>Slot ' + n + (row.kind === "once" ? " \u00b7 one-off" : " \u00b7 weekly") + "</legend>" +
        '<div class="sl-slot-fields">' + kindSelect + fields +
        '<button type="button" class="sl-icon-button" data-sl-remove="' + row.uid + '" aria-label="Remove slot ' + n + '" title="Remove slot">' + icon("trash-2") + "</button></div>" +
        '<div class="sl-row-msg" id="' + id("row-" + row.uid) + '"></div></fieldset></li>';
    }
    function renderSlots() {
      var ed = state.editor;
      var list = byId("slots");
      if (!list) return;
      list.innerHTML = ed.slots.length ? ed.slots.map(slotRowHtml).join("") : '<li class="sl-empty sl-small">No play slots yet \u2014 add a weekly or one-off slot.</li>';
      var count = byId("slot-count");
      if (count) count.textContent = ed.slots.length + " / " + MAX_SLOTS + " slots";
      $$("[data-sl-add]").forEach(function (b) { b.disabled = ed.slots.length >= MAX_SLOTS; });
      renderIcons();
    }

    function renderVideo() {
      var ed = state.editor;
      var status = byId("video-status"), player = byId("player");
      if (!ed || !status || !player) return;
      var html = "";
      if (ed.durationState === "reading") html = '<p class="sl-muted">' + icon("loader") + "Reading video length\u2026</p>";
      else if (ed.durationState === "error" || ed.durationState === "manual") html = '<p class="sl-error">' + esc(ed.durationMessage || "Enter the video length in whole seconds.") + "</p>";
      else if (ed.durationState === "ok" && ed.durationSeconds) {
        html = '<p class="sl-ok">' + icon("clock") + (ed.durationManual ? "Length: " : "Detected duration: ") + "<strong>" + esc(formatDuration(ed.durationSeconds)) + "</strong></p>";
      }
      if (ed.mediaUnavailable) html += '<p class="sl-error">' + esc(MEDIA_UNAVAILABLE) + "</p>";
      if (ed.durationManual || ed.durationState === "manual") {
        html += '<label class="form-field"><span>Length (whole seconds)</span><input type="number" inputmode="numeric" name="durationSeconds" min="1" max="' + MAX_DURATION + '" step="1" value="' + (ed.durationSeconds ? esc(String(ed.durationSeconds)) : "") + '" aria-describedby="' + id("video-status") + '"></label>';
      }
      if (ed.videoUrl) html += '<p class="sl-small sl-muted sl-url">' + (/^\/media\//.test(ed.videoUrl) || ed.videoSource === "upload" ? "Uploaded video" : "Linked video") + ": " + esc(ed.videoUrl) + "</p>";
      else if (ed.localPreviewUrl && state.upload) html += '<p class="sl-small sl-muted">Previewing your file while it uploads.</p>';
      if (state.serverErrors && state.serverErrors.video) html += '<p class="sl-error">' + esc(state.serverErrors.video) + "</p>";
      status.innerHTML = html;
      var src = ed.localPreviewUrl || ed.videoUrl;
      var current = player.querySelector("video");
      if (!src) player.innerHTML = "";
      else if (!current || current.getAttribute("src") !== src) {
        player.innerHTML = '<video controls preload="metadata" playsinline src="' + esc(src) + '"' + (ed.posterUrl.trim() ? ' poster="' + esc(ed.posterUrl.trim()) + '"' : "") + ' aria-label="Video preview"></video>';
        var vid = player.querySelector("video");
        if (vid) vid.addEventListener("error", function () {
          var srcNow = vid.getAttribute("src") || "";
          if (!/^\/media\//.test(srcNow)) return;
          fetch(srcNow, { method: "HEAD", credentials: "same-origin", cache: "no-store" }).then(function (res) {
            if (res.status === 503 && state.editor === ed) { ed.mediaUnavailable = true; renderVideo(); }
          }, function () { /* leave the generic player error */ });
        });
      }
      renderIcons();
    }

    /* ---------------- validity + messages ---------------- */

    /** Paints per-row messages (client checks, server errors, clashes); returns messages with no row. */
    function renderRowMessages(collected, result) {
      var ed = state.editor;
      var perRow = {}, general = [];
      function push(uidKey, type, text) { (perRow[uidKey] = perRow[uidKey] || []).push({ type: type, text: text }); }
      function pushIndex(rowIndex, type, text) {
        var row = rowIndex != null ? ed.slots[rowIndex] : null;
        if (!row) return false;
        push(row.uid, type, text);
        return true;
      }
      Object.keys(collected.rowErrors).forEach(function (u) { push(u, "error", collected.rowErrors[u]); });
      Object.keys(collected.pastHints).forEach(function (u) { push(u, collected.pastHints[u].type, collected.pastHints[u].text); });
      if (result) {
        var map = result.map || collected.map;
        (result.errors || []).forEach(function (err) {
          var text = err.error || err.code || "This slot isn't valid.";
          if (err.slotIndex != null && pushIndex(map[err.slotIndex], "error", text)) return;
          if (general.indexOf(text) < 0) general.push(text);
        });
        var byRow = {}, unplaced = [];
        (result.conflicts || []).forEach(function (c) {
          var rowIndex = null;
          if (c.slotIndex != null) rowIndex = map[c.slotIndex];
          else if (c.slotId != null) ed.slots.forEach(function (r, i) { if (r.id != null && String(r.id) === String(c.slotId)) rowIndex = i; });
          var w = c.conflictsWith || {};
          var other = w.streamTitle || (w.streamId ? "another stream" : "another slot in this stream");
          var text = "Clashes with " + other + " at " + formatInstant(w.startsAt || c.startsAt, ed.timezone);
          if (rowIndex != null && ed.slots[rowIndex]) (byRow[rowIndex] = byRow[rowIndex] || []).push(text);
          else unplaced.push(text);
        });
        Object.keys(byRow).forEach(function (ri) {
          var uniq = byRow[ri].filter(function (t, i, a) { return a.indexOf(t) === i; });
          uniq.slice(0, 3).forEach(function (t) { pushIndex(Number(ri), "conflict", t); });
          if (uniq.length > 3) pushIndex(Number(ri), "conflict", "\u2026and " + (uniq.length - 3) + " more clashes.");
        });
        unplaced.filter(function (t, i, a) { return a.indexOf(t) === i; }).slice(0, 5).forEach(function (t) { general.push(t); });
      }
      ed.slots.forEach(function (row) {
        var li = root.querySelector('[data-sl-row="' + row.uid + '"]');
        var box = byId("row-" + row.uid);
        if (!li || !box) return;
        var msgs = perRow[row.uid] || [];
        var bad = msgs.some(function (m) { return m.type === "error" || m.type === "conflict"; });
        li.classList.toggle("sl-slot-error", msgs.some(function (m) { return m.type === "error"; }));
        li.classList.toggle("sl-slot-conflict", msgs.some(function (m) { return m.type === "conflict"; }));
        var html = msgs.map(function (m) { return '<p class="sl-row-' + m.type + '">' + icon(m.type === "note" ? "history" : m.type === "hint" ? "info" : "alert-triangle") + "<span>" + esc(m.text) + "</span></p>"; }).join("");
        if (box.getAttribute("data-html") !== html) { box.innerHTML = html; box.setAttribute("data-html", html); }
        Array.prototype.forEach.call(li.querySelectorAll("input, select"), function (el) {
          var f = el.getAttribute("data-sl-field");
          var ids = [];
          if (msgs.length) ids.push(box.id);
          if (f === "activeFrom" || f === "activeUntil") ids.push(id("dates-help"));
          if (ids.length) el.setAttribute("aria-describedby", ids.join(" ")); else el.removeAttribute("aria-describedby");
          if (bad) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
        });
      });
      return general;
    }
    function setFieldMsg(name, text, neutral) {
      var el = byId(name);
      if (!el) return;
      el.textContent = text || "";
      el.classList.toggle("sl-field-error", !!text && !neutral);
    }
    function refreshValidity() {
      var ed = state.editor;
      if (!ed || state.view !== "editor") return;
      var problems = fieldProblems();
      var collected = collectSlots();
      var key = JSON.stringify(buildBody(collected));
      var server = null;
      if (state.serverErrors && state.serverErrors.key === key) server = state.serverErrors;
      else if (state.preview.result && state.preview.key === key) server = state.preview.result;
      var general = renderRowMessages(collected, server);
      setFieldMsg("title-msg", state.touchedTitle ? problems.title : "");
      setFieldMsg("loop-msg", problems.loop || (ed.playMode === "loop" && ed.durationSeconds ? "At least " + minLoopMinutes() + " min (one full play), at most 1440." : ""), !problems.loop);
      setFieldMsg("poster-msg", problems.poster || (state.serverErrors && state.serverErrors.poster) || "");
      setFieldMsg("slots-msg", problems.slots || "");
      var datesHelp = byId("dates-help");
      if (datesHelp) datesHelp.textContent = "Weekly first/last dates are calendar dates in the stream\u2019s time zone (" + ed.timezone.replace(/_/g, " ") + ") and both are included. Leave them empty to repeat indefinitely.";
      var titleInput = byId("title");
      if (titleInput) { if (state.touchedTitle && problems.title) titleInput.setAttribute("aria-invalid", "true"); else titleInput.removeAttribute("aria-invalid"); }

      var lines = [];
      if (state.serverErrors && state.serverErrors.message && state.serverErrors.key === key) lines.push(state.serverErrors.message);
      general.forEach(function (g) { if (lines.indexOf(g) < 0) lines.push(g); });
      var errorsBox = byId("errors");
      var errorsHtml = lines.length ? "<ul>" + lines.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul>" : "";
      if (errorsBox && errorsBox.getAttribute("data-html") !== errorsHtml) { errorsBox.innerHTML = errorsHtml; errorsBox.setAttribute("data-html", errorsHtml); }

      var reasons = [];
      if (state.upload) reasons.push("Wait for the upload to finish.");
      if (state.saving) reasons.push("Saving\u2026");
      Object.keys(problems).forEach(function (k) { reasons.push(problems[k]); });
      if (Object.keys(collected.rowErrors).length) reasons.push("Complete or remove the highlighted slots.");
      if (server && server.valid === false) reasons.push("Fix the schedule problems shown next to the slots.");
      var save = byId("save");
      if (save) save.disabled = reasons.length > 0;
      var hint = byId("save-hint");
      if (hint) hint.textContent = reasons.length ? reasons[0] : (collected.slots.length ? "" : "Tip: this stream has no play slots yet.");
    }

    /* ---------------- preview ---------------- */

    function renderPreview() {
      var box = byId("preview");
      if (!box || !state.editor) return;
      var ed = state.editor, p = state.preview;
      var collected = collectSlots();
      var html;
      if (!ed.videoUrl || !ed.durationSeconds || ed.durationState !== "ok") html = '<p class="sl-muted sl-small">Add a video to see upcoming plays.</p>';
      else if (!collected.slots.length) html = '<p class="sl-muted sl-small">Add a play slot to see upcoming plays.</p>';
      else if (p.error) html = '<p class="sl-error">' + esc(p.error) + "</p>";
      else if (p.result && p.key === JSON.stringify(buildBody(collected))) {
        var plays = p.result.nextPlays || [];
        html = plays.length
          ? '<ol class="sl-plays">' + plays.slice(0, 5).map(function (pl) { return "<li>" + icon("play-circle") + "<span>" + esc(formatPlay(pl.startsAt, pl.endsAt, ed.timezone)) + "</span></li>"; }).join("") + "</ol>"
          : '<p class="sl-muted sl-small">No upcoming plays for this schedule.</p>';
        if (p.result.valid === false) html += '<p class="sl-error sl-small">' + icon("alert-triangle") + "This schedule has problems \u2014 see the highlighted slots.</p>";
        else html += '<p class="sl-ok sl-small">' + icon("check-circle") + "No clashes found.</p>";
        html += '<p class="sl-small sl-muted">Times shown in ' + esc(ed.timezone.replace(/_/g, " ")) + ".</p>";
      } else html = '<p class="sl-muted sl-small">' + icon("loader") + "Checking schedule\u2026</p>";
      box.setAttribute("aria-busy", p.pending ? "true" : "false");
      if (box.getAttribute("data-html") !== html) { box.innerHTML = html; box.setAttribute("data-html", html); renderIcons(); }
    }

    function runPreview() {
      var ed = state.editor;
      if (destroyed || !ed || state.view !== "editor") return;
      var collected = collectSlots();
      if (!ed.videoUrl || !ed.durationSeconds || ed.durationState !== "ok" || !collected.slots.length) { renderPreview(); refreshValidity(); return; }
      var body = buildBody(collected);
      var key = JSON.stringify(body);
      if (state.preview.key === key && (state.preview.result || state.preview.pending)) return;
      if (ed.id) body.streamId = ed.id;
      if (body.posterUrl == null) delete body.posterUrl;
      if (state.preview.controller) state.preview.controller.abort();
      var controller = typeof AbortController === "function" ? new AbortController() : null;
      var seq = ++state.preview.seq;
      state.preview.controller = controller;
      state.preview.pending = true;
      state.preview.key = key;
      state.preview.result = null;
      state.preview.error = "";
      renderPreview();
      api("/preview", { method: "POST", body: body, signal: controller ? controller.signal : undefined }).then(function (data) {
        if (seq !== state.preview.seq) return;
        noteServerTime(data);
        data.map = collected.map;
        state.preview.result = data;
      }, function (err) {
        if (seq !== state.preview.seq || (err && err.name === "AbortError")) return;
        if (err.status === 429) {
          state.preview.key = "";
          state.preview.error = "Checking again shortly\u2026";
          later(schedulePreview, retryAfterMs(err.retryAfter, 3));
          return;
        }
        var d = err.data || {};
        if (err.status === 400) {
          // e.g. non-http(s) videoUrl: the server rejects the dry run outright.
          state.preview.result = { valid: false, nextPlays: d.nextPlays || [], map: collected.map, conflicts: d.conflicts || [],
            errors: d.errors || [{ code: d.code, error: d.error || err.message, slotIndex: d.slotIndex }] };
          if (d.code === "invalid_video") state.preview.error = d.error || err.message;
        } else {
          state.preview.error = err.message;
        }
      }).then(function () {
        if (seq !== state.preview.seq) return;
        state.preview.pending = false;
        renderPreview();
        refreshValidity();
      });
    }

    function changed(options) {
      options = options || {};
      if (state.preview.error && !state.preview.pending) state.preview.error = "";
      if (options.slots) renderSlots();
      refreshValidity();
      renderPreview();
      schedulePreview();
    }

    /* ---------------- video selection + upload ---------------- */

    function revokeLocal() {
      var ed = state.editor;
      if (ed && ed.localPreviewUrl) { try { URL.revokeObjectURL(ed.localPreviewUrl); } catch (e) { /* ignore */ } ed.localPreviewUrl = ""; }
    }
    function setVideoFromLink() {
      var ed = state.editor;
      var input = byId("link");
      var url = input ? input.value.trim() : "";
      if (state.upload) { ed.durationState = "error"; ed.durationMessage = "Cancel the current upload before switching to a link."; renderVideo(); return; }
      ed.linkDraft = url;
      var problem = checkVideoLink(url);
      if (problem) {
        ed.durationState = "error"; ed.durationMessage = problem;
        if (input) { input.setAttribute("aria-invalid", "true"); input.focus(); }
        renderVideo(); refreshValidity();
        return;
      }
      if (input) input.removeAttribute("aria-invalid");
      if (url === ed.videoUrl && ed.durationState === "ok") return;
      revokeLocal();
      ed.videoUrl = ""; ed.videoSource = "mp4_url"; ed.durationSeconds = 0; ed.durationState = "reading";
      if (state.serverErrors) state.serverErrors.video = "";
      renderVideo(); changed();
      readVideoDuration(url).then(function (d) {
        if (state.editor !== ed || ed.linkDraft !== url) return;
        var whole = wholeSeconds(d);
        ed.videoUrl = url;
        if (whole < 1 || whole > MAX_DURATION) {
          ed.durationSeconds = whole > 0 ? whole : 0;
          ed.durationState = "manual"; ed.durationManual = true;
          ed.durationMessage = whole > MAX_DURATION
            ? "This video is " + formatDuration(whole) + " long. The maximum is 12 hours."
            : "Enter the video length in whole seconds.";
          return;
        }
        ed.durationSeconds = whole; ed.durationState = "ok"; ed.durationManual = false;
      }, function (err) {
        if (state.editor !== ed || ed.linkDraft !== url) return;
        ed.videoUrl = url; ed.durationSeconds = 0; ed.durationManual = true; ed.durationState = "manual";
        ed.durationMessage = /couldn't load|Timed out|storage/i.test(err.message || "")
          ? err.message + " Enter the length in whole seconds."
          : (err.message || "Enter the video length in whole seconds.");
      }).then(function () {
        if (state.editor !== ed) return;
        renderVideo(); changed();
      });
    }

    function videoError(message) {
      var ed = state.editor;
      ed.durationState = "error"; ed.durationMessage = message;
      renderVideo(); refreshValidity();
    }
    function handleFile(file) {
      var ed = state.editor;
      if (!file || !ed) return;
      if (state.upload) { videoError("An upload is already in progress. Cancel it first to choose another file."); return; }
      if (!isMp4File(file)) { videoError("Please choose an MP4 video file."); return; }
      if (!file.size) { videoError("That file is empty."); return; }
      if (file.size > CHUNK_MAX) { videoError("That file is " + formatBytes(file.size) + ". The maximum is 2 GB."); return; }
      revokeLocal();
      ed.localPreviewUrl = URL.createObjectURL(file);
      ed.videoUrl = ""; ed.videoSource = "upload"; ed.durationSeconds = 0; ed.durationState = "reading";
      renderVideo(); changed();
      var local = ed.localPreviewUrl;
      readVideoDuration(local).then(function (d) {
        if (state.editor !== ed || ed.localPreviewUrl !== local) return;
        var whole = wholeSeconds(d);
        if (whole > MAX_DURATION) { videoError("This video is " + formatDuration(whole) + " long. The maximum is 12 hours."); return; }
        if (whole >= 1) { ed.durationSeconds = whole; ed.durationState = "ok"; ed.durationManual = false; }
        else { ed.durationSeconds = 0; ed.durationState = "manual"; ed.durationManual = true; ed.durationMessage = "Enter the video length in whole seconds."; }
        renderVideo();
        startUpload(file);
      }, function () {
        if (state.editor !== ed || ed.localPreviewUrl !== local) return;
        ed.durationSeconds = 0; ed.durationState = "manual"; ed.durationManual = true;
        ed.durationMessage = "Couldn't read the length from this file. Enter it in whole seconds. The upload will still continue.";
        renderVideo();
        startUpload(file);
      });
    }

    function showUpload(label, percent, detail) {
      var wrap = byId("upload");
      if (!wrap) return;
      wrap.hidden = false;
      byId("upload-label").textContent = label;
      var bar = byId("progress");
      bar.value = Math.max(0, Math.min(100, percent));
      bar.setAttribute("aria-valuetext", Math.round(bar.value) + "%");
      if (detail !== undefined) byId("upload-detail").textContent = detail;
      var cancel = wrap.querySelector("[data-sl-upload-cancel]");
      if (cancel) cancel.hidden = !state.upload;
    }
    function hideUpload() { var wrap = byId("upload"); if (wrap) wrap.hidden = true; }

    function startUpload(file) {
      var ed = state.editor;
      var up = state.upload = { controller: new AbortController(), file: file, uploadId: null, key: null, chunked: file.size > SINGLE_MAX };
      refreshValidity();
      var total = file.size;
      var announce = function (msg) { if (state.upload === up) { var el = byId("upload-detail"); if (el) el.textContent = msg; } };
      showUpload((up.chunked ? "Uploading in parts: " : "Uploading ") + file.name, 0, "0 of " + formatBytes(total));
      (up.chunked ? chunkedUpload(file, up, announce) : singleUpload(file, up)).then(function (url) {
        if (state.upload !== up) return;
        state.upload = null;
        if (state.editor !== ed) return;
        ed.videoUrl = url; ed.videoSource = "upload";
        showUpload("Upload complete", 100, file.name + " \u00b7 " + formatBytes(total));
        later(function () { if (!state.upload) hideUpload(); }, 3000);
        renderVideo(); changed();
      }, function (err) {
        if (state.upload !== up) return;
        state.upload = null;
        if (state.editor !== ed) return;
        if (err && err.name === "AbortError") {
          hideUpload(); revokeLocal();
          ed.durationState = "none"; ed.durationSeconds = 0;
          var st = byId("upload-detail"); if (st) st.textContent = "";
          renderVideo(); changed();
          var status = byId("video-status"); if (status) status.innerHTML = '<p class="sl-muted">Upload cancelled.</p>';
          return;
        }
        showUpload("Upload failed", 0, "");
        videoError((err && err.message) || "The upload failed.");
        renderPreview();
      });
    }

    function singleUpload(file, up) {
      return withRetry(function () {
        var form = new FormData();
        form.append("video", file, file.name);
        return xhrRequest({ method: "POST", url: base + "/video", body: form, signal: up.controller.signal, onProgress: function (loaded, total) {
          showUpload("Uploading " + file.name, loaded / total * 100, formatBytes(loaded) + " of " + formatBytes(total));
        } });
      }, up.controller.signal, function (msg) { var el = byId("upload-detail"); if (el) el.textContent = msg; }).then(function (res) {
        var data = ensureOk(res, "We could not upload that video.");
        if (!data.url) throw ApiError("The server didn't return a video address.", res.status, data);
        return data.url;
      });
    }

    function chunkedUpload(file, up, announce) {
      var signal = up.controller.signal;
      var total = file.size;
      var json = { "content-type": "application/json" };
      return withRetry(function () {
        return xhrRequest({ method: "POST", url: base + "/video/uploads", headers: json, signal: signal,
          body: JSON.stringify({ filename: file.name, size: total, contentType: "video/mp4" }) });
      }, signal, announce).then(function (res) {
        var init = ensureOk(res, "We could not start the upload.");
        up.uploadId = init.uploadId; up.key = init.key;
        var partSize = Number(init.partSize);
        if (!up.uploadId || !partSize) throw ApiError("The server returned an invalid upload plan.", res.status, init);
        var partCount = Number(init.partCount) || Math.ceil(total / partSize);
        var parts = [], done = 0;
        function sendPart(n) {
          if (n > partCount) return Promise.resolve();
          // Every part except the last is exactly partSize bytes; part numbers start at 1.
          var start = (n - 1) * partSize, end = n === partCount ? total : Math.min(total, start + partSize);
          var blob = file.slice(start, end);
          return withRetry(function () {
            return xhrRequest({
              method: "PUT", signal: signal, body: blob, headers: { "content-type": "application/octet-stream" },
              url: base + "/video/uploads/" + encodeURIComponent(up.uploadId) + "/parts/" + n + "?key=" + encodeURIComponent(up.key || ""),
              onProgress: function (loaded) {
                var sent = done + loaded;
                showUpload("Uploading " + file.name + " (part " + n + " of " + partCount + ")", sent / total * 100, formatBytes(sent) + " of " + formatBytes(total));
              }
            });
          }, signal, announce).then(function (partRes) {
            var data = ensureOk(partRes, "Part " + n + " of the upload failed.");
            parts.push({ partNumber: Number(data.partNumber) || n, etag: data.etag });
            done += blob.size;
            showUpload("Uploading " + file.name + " (part " + n + " of " + partCount + ")", done / total * 100, formatBytes(done) + " of " + formatBytes(total));
            return sendPart(n + 1);
          });
        }
        return sendPart(1).then(function () {
          showUpload("Finishing upload\u2026", 100, "Putting the video together");
          return withRetry(function () {
            return xhrRequest({ method: "POST", url: base + "/video/uploads/" + encodeURIComponent(up.uploadId) + "/complete", headers: json, signal: signal,
              body: JSON.stringify({ key: up.key, parts: parts }) });
          }, signal, announce);
        }).then(function (doneRes) {
          var data = ensureOk(doneRes, "We could not finish the upload.");
          if (!data.url) throw ApiError("The server didn't return a video address.", doneRes.status, data);
          return data.url;
        });
      }).catch(function (err) {
        if (up.uploadId && !up.skipDelete) abortMultipart(up);
        throw err;
      });
    }
    function abortMultipart(up) {
      if (!up.uploadId || up.aborted) return;
      up.aborted = true;
      var url = base + "/video/uploads/" + encodeURIComponent(up.uploadId) + "?key=" + encodeURIComponent(up.key || "");
      withRetry(function () { return xhrRequest({ method: "DELETE", url: url }); }, null, null).catch(function () { /* ignore */ });
    }
    function cancelUpload(skipDelete) {
      var up = state.upload;
      if (!up) return;
      if (skipDelete) up.skipDelete = true;
      showUpload("Cancelling\u2026", 0, "");
      if (up.uploadId && !up.skipDelete) abortMultipart(up);
      up.controller.abort();
    }

    /* ---------------- save ---------------- */

    function save() {
      var ed = state.editor;
      refreshValidity();
      var saveBtn = byId("save");
      if (!saveBtn || saveBtn.disabled) return;
      var collected = collectSlots();
      var body = buildBody(collected);
      var key = JSON.stringify(body);
      if (!ed.id && body.posterUrl == null) delete body.posterUrl;
      state.saving = true;
      state.serverErrors = null;
      refreshValidity();
      saveBtn.classList.add("sl-busy");
      saveBtn.setAttribute("aria-busy", "true");
      // PATCH with `slots` replaces the whole slot list atomically.
      var request = ed.id
        ? api("/" + encodeURIComponent(ed.id), { method: "PATCH", body: body, retry429: true })
        : api("", { method: "POST", body: body, retry429: true });
      request.then(function (data) {
        schedulePreview.cancel();
        if (state.preview.controller) state.preview.controller.abort();
        revokeLocal();
        var saved = data.stream || null;
        var title = (saved && saved.title) || body.title;
        var msg = ed.id ? "Saved changes to \u201c" + title + "\u201d." : "Created \u201c" + title + "\u201d.";
        // The server is authoritative and assigns fresh slot ids on PATCH: drop every cached
        // editor/preview/save-error value (old slotIds are stale) and adopt the response stream.
        state.editor = null;
        state.serverErrors = null;
        state.preview = { seq: state.preview.seq + 1, controller: null, result: null, key: "", pending: false, error: "" };
        state.saving = false;
        state.view = "list";
        if (saved && saved.id != null) {
          upsertStream(saved);
          state.flash = msg; state.flashError = false;
          state.loading = false;
          renderList();
          // Refresh the rest of the list quietly (e.g. nextPlays for the other streams).
          api("").then(function (d) {
            if (destroyed) return;
            noteServerTime(d);
            if (Array.isArray(d.streams)) { state.streams = d.streams; if (state.view === "list") renderList(); }
          }, function () { /* keep the response copy */ });
        } else {
          loadStreams(msg);
        }
        var btn = $("[data-sl-new]");
        if (btn) btn.focus();
      }, function (err) {
        state.saving = false;
        if (state.editor !== ed) return;
        var d = err.data || {};
        var se = { key: key, message: err.message, map: collected.map, valid: false, errors: [], conflicts: d.conflicts || [] };
        if (d.slotIndex != null) { se.errors.push({ code: d.code, error: d.error, slotIndex: d.slotIndex }); se.message = "Please fix the highlighted slot."; }
        if (Array.isArray(d.errors)) se.errors = se.errors.concat(d.errors);
        if (d.code === "invalid_video" || d.code === "invalid_duration") se.video = d.error || err.message;
        if (d.code === "invalid_poster") se.poster = d.error || err.message;
        if (d.code === "overlap" && se.conflicts.length) se.message = (d.error || "This schedule overlaps with other plays.") + " See the highlighted slots.";
        state.serverErrors = se;
        saveBtn.classList.remove("sl-busy");
        saveBtn.removeAttribute("aria-busy");
        renderVideo();
        refreshValidity();
        var box = byId("errors");
        if (box && box.scrollIntoView) box.scrollIntoView({ block: "nearest" });
      });
    }

    function leaveEditor() {
      if (state.upload && !window.confirm("A video is still uploading. Cancel the upload and leave?")) return;
      if (state.upload) cancelUpload();
      schedulePreview.cancel();
      if (state.preview.controller) state.preview.controller.abort();
      revokeLocal();
      state.editor = null;
      state.serverErrors = null;
      state.flash = "";
      renderList();
      var btn = $("[data-sl-new]");
      if (btn) btn.focus();
    }

    /* ---------------- events (delegated on the mount element) ---------------- */

    function selectTab(key, focus) {
      var ed = state.editor;
      if (!ed) return;
      ed.videoTab = key;
      ["upload", "link"].forEach(function (k) {
        var tab = byId("tab-" + k), panel = byId("panel-" + k);
        if (!tab || !panel) return;
        tab.setAttribute("aria-selected", String(k === key));
        tab.tabIndex = k === key ? 0 : -1;
        panel.hidden = k !== key;
      });
      if (focus) byId("tab-" + key).focus();
    }

    on(root, "click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("button") : null;
      if (!t || !root.contains(t) || t.disabled) return;
      if (t.hasAttribute("data-sl-new")) { state.flash = ""; return openEditor(null); }
      if (t.hasAttribute("data-sl-reload")) return loadStreams();
      if (t.hasAttribute("data-sl-edit")) {
        var s = findStream(t.getAttribute("data-sl-edit"));
        if (!s) return;
        t.disabled = true;
        // Load the latest copy (server is authoritative); fall back to the list copy.
        api("/" + encodeURIComponent(s.id)).then(function (d) { noteServerTime(d); openEditor(d.stream || s); }, function () { openEditor(s); });
        return;
      }
      if (t.hasAttribute("data-sl-status")) return changeStatus(t.getAttribute("data-sl-id"), t.getAttribute("data-sl-status"), t);
      if (t.hasAttribute("data-sl-archive")) return archiveStream(t.getAttribute("data-sl-archive"), t);
      if (!state.editor) return;
      if (t.hasAttribute("data-sl-cancel")) return leaveEditor();
      if (t.hasAttribute("data-sl-tab")) return selectTab(t.getAttribute("data-sl-tab"), false);
      if (t.hasAttribute("data-sl-link-check")) return setVideoFromLink();
      if (t.hasAttribute("data-sl-upload-cancel")) return cancelUpload();
      if (t.hasAttribute("data-sl-add")) {
        if (state.editor.slots.length >= MAX_SLOTS) return;
        state.editor.slots.push(newSlotRow(t.getAttribute("data-sl-add")));
        changed({ slots: true });
        var rows = $$(".sl-slot");
        var last = rows[rows.length - 1];
        var first = last && last.querySelector("input, select:not([data-sl-field=kind])");
        if (first) first.focus();
        return;
      }
      if (t.hasAttribute("data-sl-remove")) {
        var u = t.getAttribute("data-sl-remove");
        var idx = -1;
        state.editor.slots.forEach(function (r, i) { if (r.uid === u) idx = i; });
        if (idx < 0) return;
        state.editor.slots.splice(idx, 1);
        changed({ slots: true });
        var after = $$(".sl-slot");
        var next = after[Math.min(idx, after.length - 1)];
        var target = next ? next.querySelector("[data-sl-remove]") : $('[data-sl-add="weekly"]');
        if (target) target.focus();
      }
    });

    on(root, "keydown", function (e) {
      var tab = e.target && e.target.closest ? e.target.closest("[data-sl-tab]") : null;
      if (tab && ["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(e.key) >= 0) {
        e.preventDefault();
        var order = ["upload", "link"], cur = order.indexOf(tab.getAttribute("data-sl-tab"));
        var next = e.key === "Home" ? 0 : e.key === "End" ? order.length - 1 : (cur + (e.key === "ArrowRight" ? 1 : -1) + order.length) % order.length;
        selectTab(order[next], true);
        return;
      }
      if (e.key === "Enter" && e.target.id === id("link")) { e.preventDefault(); setVideoFromLink(); }
    });

    function onFieldInput(e) {
      var ed = state.editor;
      if (!ed) return;
      var t = e.target;
      if (t.type === "file") {
        if (e.type === "change") { var f = t.files && t.files[0]; t.value = ""; handleFile(f); }
        return;
      }
      var rowEl = t.closest("[data-sl-row]");
      if (rowEl) {
        var field = t.getAttribute("data-sl-field");
        var row = null;
        ed.slots.forEach(function (r) { if (r.uid === rowEl.getAttribute("data-sl-row")) row = r; });
        if (!row || !field) return;
        if (field === "kind") {
          if (e.type !== "change" || row.kind === t.value) return;
          row.kind = t.value;
          changed({ slots: true });
          var sel = root.querySelector('[data-sl-row="' + row.uid + '"] [data-sl-field="kind"]');
          if (sel) sel.focus();
          return;
        }
        var value = field === "weekday" ? Number(t.value) : t.value;
        if (row[field] === value) return;
        row[field] = value;
        return changed();
      }
      switch (t.name) {
        case "title":
          if (e.type === "change") state.touchedTitle = true;
          if (ed.title === t.value && e.type !== "change") return;
          ed.title = t.value; return changed();
        case "description":
          if (ed.description === t.value) return;
          ed.description = t.value; return changed();
        case "playMode":
          ed.playMode = t.value;
          byId("loop-wrap").hidden = ed.playMode !== "loop";
          if (ed.playMode === "loop" && !ed.loopWindowMinutes && ed.durationSeconds) {
            ed.loopWindowMinutes = String(minLoopMinutes());
            root.querySelector('[name="loopWindowMinutes"]').value = ed.loopWindowMinutes;
          }
          return changed();
        case "loopWindowMinutes":
          if (ed.loopWindowMinutes === t.value.trim()) return;
          ed.loopWindowMinutes = t.value.trim(); return changed();
        case "timezone":
          // One-off slots keep their wall-clock time; the UTC instant is recomputed in the new zone.
          ed.timezone = t.value; return changed();
        case "posterUrl":
          if (e.type === "change") updatePosterPreview();
          if (ed.posterUrl === t.value) return;
          ed.posterUrl = t.value; return changed();
        case "durationSeconds":
          var typed = t.value.trim() === "" ? NaN : Number(t.value);
          if (Number.isInteger(typed) && typed >= 1 && typed <= MAX_DURATION) {
            ed.durationSeconds = typed; ed.durationState = "ok"; ed.durationManual = true; ed.durationMessage = "";
          } else {
            ed.durationSeconds = 0; ed.durationState = "manual"; ed.durationManual = true;
            ed.durationMessage = "Enter the video length as a whole number of seconds (1 to " + MAX_DURATION + ").";
          }
          return changed();
      }
      if (t.id === id("link")) {
        ed.linkDraft = t.value;
        t.removeAttribute("aria-invalid");
        if (e.type === "change" && t.value.trim()) setVideoFromLink();
      }
    }
    function updatePosterPreview() {
      var v = root.querySelector(".sl-player video");
      if (!v || !state.editor) return;
      var p = state.editor.posterUrl.trim();
      if (p && !checkPoster(p)) v.setAttribute("poster", p); else v.removeAttribute("poster");
    }
    on(root, "input", onFieldInput);
    on(root, "change", onFieldInput);
    on(root, "submit", function (e) { e.preventDefault(); save(); });
    on(root, "dragover", function (e) {
      var d = e.target && e.target.closest ? e.target.closest(".sl-drop") : null;
      if (d) { e.preventDefault(); d.classList.add("sl-drop-active"); }
    });
    on(root, "dragleave", function (e) {
      var d = e.target && e.target.closest ? e.target.closest(".sl-drop") : null;
      if (d) d.classList.remove("sl-drop-active");
    });
    on(root, "drop", function (e) {
      var d = e.target && e.target.closest ? e.target.closest(".sl-drop") : null;
      if (!d) return;
      e.preventDefault();
      d.classList.remove("sl-drop-active");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    on(window, "beforeunload", function (e) {
      if (state.upload) { e.preventDefault(); e.returnValue = ""; }
    });

    /** Abandon this instance (host replaced/removed the node or changed its church). */
    function destroy(options) {
      if (destroyed) return;
      options = options || {};
      // Replacing the section deletes an in-progress upload. An empty church id is not destructive.
      if (state.upload) cancelUpload(!!options.skipDelete);
      destroyed = true;
      schedulePreview.cancel();
      if (state.preview.controller) state.preview.controller.abort();
      timers.forEach(clearTimeout); timers = [];
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2]); }); listeners = [];
      revokeLocal();
      state.editor = null;
      state.view = "destroyed";
    }

    loadStreams();
    return {
      root: root,
      churchId: churchId,
      destroy: destroy,
      get destroyed() { return destroyed; },
      state: state,
      reload: function () { return loadStreams(); },
      openEditor: openEditor,
      runPreview: runPreview,
      cancelUpload: cancelUpload
    };
  }

  /* ---------------------------------------------------------------- mount */

  var instance = null;
  var instances = [];            // live instances (normally one)
  var mountedNodes = typeof WeakSet === "function" ? new WeakSet() : null;
  var scriptEl = document.currentScript;

  function ensureStylesheet() {
    if (document.querySelector('link[href*="simulated-live-settings.css"]')) return;
    var src = scriptEl && scriptEl.src;
    if (!src || !/simulated-live-settings\.js/.test(src)) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = src.replace(/simulated-live-settings\.js/, "simulated-live-settings.css");
    document.head.appendChild(link);
  }
  function isMounted(el) {
    if (mountedNodes) return mountedNodes.has(el);
    return instances.some(function (i) { return i.root === el; });
  }
  function mount(el) {
    el = el || document.getElementById(MOUNT_ID);
    if (!el || isMounted(el)) return null;           // never double-mount a node
    var churchId = (el.getAttribute("data-church-id") || "").trim();
    if (!churchId) return null;
    ensureStylesheet();
    // A fresh node cloned from a mounted one would carry our marker and old markup: start clean.
    if (el.getAttribute("data-sl-mounted") === "true") el.innerHTML = "";
    if (mountedNodes) mountedNodes.add(el);
    el.setAttribute("data-sl-mounted", "true");
    el.classList.add("sl-root");
    instance = createPanel(el, churchId);
    instances.push(instance);
    return instance;
  }
  function unmount(inst, options) {
    inst.destroy(options);
    instances = instances.filter(function (i) { return i !== inst; });
    if (mountedNodes) mountedNodes.delete(inst.root);
    if (instance === inst) instance = instances[instances.length - 1] || null;
  }
  /** Tear down instances whose node left the document or whose church changed; mount the current node. */
  function reconcile() {
    instances.slice().forEach(function (inst) {
      var el = inst.root;
      var gone = !document.documentElement.contains(el);
      var churchNow = (el.getAttribute("data-church-id") || "").trim();
      var changedChurch = churchNow !== inst.churchId;
      if (gone || changedChurch) {
        unmount(inst, { skipDelete: !gone && !churchNow });
        if (!gone) { el.removeAttribute("data-sl-mounted"); el.innerHTML = ""; }
      }
    });
    var current = document.getElementById(MOUNT_ID);
    if (current && !isMounted(current)) mount(current);
  }
  function start() {
    mount();
    // The host renders asynchronously and, when the church changes, replaces the section with a
    // fresh node (or may change data-church-id in place). Keep watching for the page lifetime.
    if (typeof MutationObserver !== "function" || !document.body) return;
    var queued = false;
    new MutationObserver(function () {
      if (queued) return;
      queued = true;
      setTimeout(function () { queued = false; reconcile(); }, 30);
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-church-id"] });
  }

  window.MWESimulatedLive = {
    mount: mount,
    reconcile: reconcile,
    get instance() { return instance; },
    get instances() { return instances.slice(); },
    tz: { offsetMs: tzOffsetMs, localToUtcIso: zonedLocalToUtcIso, utcIsoToLocal: utcIsoToZonedLocal, formatPlay: formatPlay, formatInstant: formatInstant },
    checkVideoLink: checkVideoLink
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
