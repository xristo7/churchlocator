(function () {
  "use strict";

  var VIEW = "livestream-schedules";
  var DEFAULT_TZ = "Africa/Kampala";
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var state = {
    status: "",
    q: "",
    churchId: "",
    items: [],
    nextCursor: null,
    loading: false,
    acting: false,
    error: "",
    errorCode: "",
    actionError: "",
    pauseFor: null,
    generation: 0
  };
  var reloadTimer = 0;

  function isOwner() {
    return window.MWEPlatform && window.MWEPlatform.role === "owner";
  }

  function isMyView() {
    return location.hash.replace(/^#/, "") === VIEW;
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function zoneOf(stream) {
    var tz = stream && typeof stream.timezone === "string" ? stream.timezone.trim() : "";
    return tz || DEFAULT_TZ;
  }

  function formatWhen(iso, timeZone) {
    if (!iso) return "";
    var ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return "";
    var zone = timeZone || DEFAULT_TZ;
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: zone,
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(ms));
    } catch (error) {
      return String(iso);
    }
  }

  function safeUrl(value) {
    var url = String(value || "").trim();
    if (!url || /[\u0000-\u0020"'<>\\]/.test(url)) return "";
    if (url.indexOf("https://") === 0 || url.indexOf("/media/") === 0) return url;
    return "";
  }

  function posterOf(stream) {
    return safeUrl(stream && stream.posterUrl) || safeUrl(stream && stream.poster);
  }

  function slotLine(slot, zone) {
    if (!slot || typeof slot !== "object") return "Slot";
    if (slot.kind === "weekly") {
      var day = WEEKDAYS[Number(slot.weekday)] || ("Weekday " + slot.weekday);
      var line = "Weekly · " + day + " " + (slot.localTime || "");
      if (slot.activeFrom || slot.activeUntil) {
        line += " · " + (slot.activeFrom || "open") + " to " + (slot.activeUntil || "open");
      }
      return line;
    }
    if (slot.kind === "once") {
      return "Once · " + (slot.startsAt ? formatWhen(slot.startsAt, zone) : "time not set");
    }
    return String(slot.kind || "Slot");
  }

  function statusBadge(status) {
    var cls = status === "active" ? " good" : status === "paused" ? " warn" : "";
    return '<span class="aw-badge' + cls + '">' + esc(status || "unknown") + "</span>";
  }

  async function readBody(response) {
    try {
      return await response.json();
    } catch (error) {
      return { ok: false, error: "Unexpected server response.", code: "" };
    }
  }

  function failData(data, fallback) {
    var error = new Error((data && data.error) || fallback);
    error.code = (data && data.code) || "";
    return error;
  }

  async function fetchPage(offset) {
    var params = new URLSearchParams();
    if (state.status) params.set("status", state.status);
    if (state.q) params.set("q", state.q);
    if (state.churchId) params.set("churchId", state.churchId);
    params.set("limit", "50");
    if (offset) params.set("offset", String(offset));
    var response = await fetch("/api/admin/simulated-live?" + params.toString(), {
      credentials: "same-origin",
      cache: "no-store"
    });
    var data = await readBody(response);
    if (!response.ok || data.ok === false) throw failData(data, "Could not load livestream schedules.");
    return data;
  }

  async function patchStream(stream, body) {
    var response = await fetch(
      "/api/churches/" + encodeURIComponent(stream.churchId) + "/simulated-live/" + encodeURIComponent(stream.id),
      {
        method: "PATCH",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      }
    );
    var data = await readBody(response);
    if (!response.ok || data.ok === false) throw failData(data, "Could not update this schedule.");
    return data;
  }

  function rowHtml(stream) {
    var zone = zoneOf(stream);
    var poster = posterOf(stream);
    var video = safeUrl(stream.videoUrl);
    var slots = Array.isArray(stream.slots) ? stream.slots : [];
    var next = stream.nextPlay && stream.nextPlay.startsAt
      ? formatWhen(stream.nextPlay.startsAt, zone) + " (" + zone + ")"
      : "No upcoming play";
    var church = stream.churchName || "Unknown church";
    var posterHtml = poster
      ? '<img class="simlive-poster" alt="" src="' + esc(poster) + '" />'
      : '<div class="simlive-poster-fallback">No poster</div>';
    var videoHtml = video
      ? '<a href="' + esc(video) + '" target="_blank" rel="noopener noreferrer">Open video</a>'
      : "<span>Video link unavailable</span>";
    var slotsHtml = slots.length
      ? "<ul class=\"simlive-slots\">" + slots.map(function (slot) {
        return "<li>" + esc(slotLine(slot, zone)) + "</li>";
      }).join("") + "</ul>"
      : "<p class=\"simlive-slots\">No time slots</p>";
    var history = "";
    if (stream.moderationNote || stream.pausedBy || stream.pausedAt) {
      var when = stream.pausedAt ? formatWhen(stream.pausedAt, zone) : "";
      history = "<p class=\"simlive-note\"><strong>Last moderation</strong> "
        + esc(stream.moderationNote || "No note recorded")
        + "<br><small>Paused by " + esc(stream.pausedBy || "unknown")
        + (when ? " · " + esc(when) + " (" + esc(zone) + ")" : "")
        + "</small></p>";
    }
    var actions = "";
    if (stream.status === "active") {
      if (state.pauseFor === stream.id) {
        actions = '<form class="simlive-pause-form" data-simlive-pause-form="' + esc(stream.id) + '">'
          + '<label>Moderation note<textarea required maxlength="1000" placeholder="Why this stream is paused"></textarea></label>'
          + '<button class="aw-button aw-primary" type="submit"' + (state.acting ? " disabled" : "") + ">Confirm pause</button>"
          + '<button class="aw-button" type="button" data-simlive-cancel>Cancel</button></form>';
      } else {
        actions = '<div class="simlive-actions"><button class="aw-button" type="button" data-simlive-pause="' + esc(stream.id) + '"'
          + (state.acting ? " disabled" : "") + ">Pause</button></div>";
      }
    } else if (stream.status === "paused") {
      actions = '<div class="simlive-actions"><button class="aw-button aw-primary" type="button" data-simlive-resume="' + esc(stream.id) + '"'
        + (state.acting ? " disabled" : "") + ">Resume</button></div>";
    }
    return '<article class="simlive-row">' + posterHtml + "<div>"
      + '<div class="simlive-kicker"><span class="simlive-church">' + esc(church) + "</span>" + statusBadge(stream.status)
      + (stream.moderationLocked ? '<span class="aw-badge simlive-lock">Moderation lock</span>' : "")
      + "</div>"
      + '<p class="simlive-id">' + esc(stream.churchId || "") + "</p>"
      + '<h3 class="simlive-title">' + esc(stream.title || "Untitled") + "</h3>"
      + "<p>Next play: " + esc(next) + "</p>"
      + "<p><small>" + esc(stream.playMode || "once") + " · " + esc(stream.durationSeconds == null ? "" : stream.durationSeconds + "s")
      + " · " + esc(zone) + (stream.createdBy ? " · created by " + esc(stream.createdBy) : "") + "</small></p>"
      + slotsHtml + "<p>" + videoHtml + "</p>" + history + actions + "</div></article>";
  }

  function renderList() {
    var list = document.getElementById("simlive-list");
    if (!list) return;
    var error = state.actionError || state.error;
    var code = state.actionError ? "" : state.errorCode;
    var html = error
      ? '<p class="simlive-error" role="alert">' + esc(code ? code + ": " + error : error) + "</p>"
      : "";
    if (!state.items.length && state.loading) {
      html += "<p>Loading schedules…</p>";
    } else if (!state.items.length) {
      html += '<div class="aw-empty"><h3>No livestream schedules</h3><p>Nothing matches these filters.</p></div>';
    } else {
      html += state.items.map(rowHtml).join("");
      if (state.nextCursor) {
        html += '<button class="aw-button simlive-more" type="button" data-simlive-more'
          + (state.loading || state.acting ? " disabled" : "") + ">"
          + (state.loading ? "Loading…" : "Load more") + "</button>";
      }
    }
    list.innerHTML = html;
    var more = list.querySelector("[data-simlive-more]");
    if (more) more.addEventListener("click", function () { load(false); });
    list.querySelectorAll("[data-simlive-pause]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.pauseFor = button.getAttribute("data-simlive-pause");
        state.actionError = "";
        renderList();
        var area = list.querySelector("textarea");
        if (area) area.focus();
      });
    });
    list.querySelectorAll("[data-simlive-cancel]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.pauseFor = null;
        state.actionError = "";
        renderList();
      });
    });
    list.querySelectorAll("[data-simlive-pause-form]").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var id = form.getAttribute("data-simlive-pause-form");
        var stream = state.items.find(function (item) { return item.id === id; });
        var note = form.querySelector("textarea").value.trim();
        if (!note) {
          state.actionError = "A moderation note is required to pause.";
          renderList();
          return;
        }
        runAction(stream, { status: "paused", moderationNote: note });
      });
    });
    list.querySelectorAll("[data-simlive-resume]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-simlive-resume");
        var stream = state.items.find(function (item) { return item.id === id; });
        if (!stream) return;
        if (!window.confirm("Resume this livestream schedule? The last pause note stays as history.")) return;
        runAction(stream, { status: "active" });
      });
    });
  }

  async function load(reset) {
    if (state.loading && !reset) return;
    var gen = reset ? ++state.generation : state.generation;
    if (reset) {
      state.items = [];
      state.nextCursor = null;
      state.error = "";
      state.errorCode = "";
      state.pauseFor = null;
    }
    state.loading = true;
    renderList();
    try {
      var offset = reset ? 0 : Number(state.nextCursor || 0);
      var data = await fetchPage(Number.isFinite(offset) ? offset : 0);
      if (gen !== state.generation) return;
      var incoming = Array.isArray(data.streams) ? data.streams : [];
      var seen = new Set(state.items.map(function (item) { return item.id; }));
      incoming.forEach(function (row) {
        if (row && row.id && !seen.has(row.id)) state.items.push(row);
      });
      state.nextCursor = data.nextCursor || null;
    } catch (error) {
      if (gen !== state.generation) return;
      state.error = error.message || "Could not load livestream schedules.";
      state.errorCode = error.code || "";
    } finally {
      if (gen === state.generation) {
        state.loading = false;
        renderList();
      }
    }
  }

  function reload() {
    load(true);
  }

  function scheduleReload() {
    window.clearTimeout(reloadTimer);
    reloadTimer = window.setTimeout(reload, 300);
  }

  async function runAction(stream, body) {
    if (!stream || state.acting) return;
    state.acting = true;
    state.actionError = "";
    renderList();
    try {
      await patchStream(stream, body);
      state.acting = false;
      state.pauseFor = null;
      await load(true);
    } catch (error) {
      state.acting = false;
      state.actionError = (error.code ? error.code + ": " : "") + (error.message || "Could not update this schedule.");
      renderList();
    }
  }

  function showHeadings() {
    var title = document.getElementById("aw-title");
    var crumb = document.getElementById("aw-breadcrumb");
    var sub = document.getElementById("aw-subtitle");
    var eye = document.getElementById("aw-eyebrow");
    var actions = document.getElementById("aw-heading-actions");
    if (title) title.textContent = "Livestream schedules";
    if (crumb) crumb.textContent = "Livestream schedules";
    if (sub) sub.textContent = "Pause or resume church play-as-live schedules. A platform-owner pause stays locked until an owner resumes it.";
    if (eye) eye.textContent = "MODERATION / LIVESTREAM SCHEDULES";
    if (actions) actions.textContent = "";
    document.title = "Livestream schedules · Admin | My Way";
  }

  function removeNav() {
    var link = document.querySelector("[data-simlive-nav]");
    var label = document.querySelector("[data-simlive-label]");
    if (link) link.remove();
    if (label) label.remove();
  }

  function ensureNav() {
    var nav = document.getElementById("aw-nav");
    if (!nav || !isOwner()) {
      removeNav();
      return;
    }
    var link = nav.querySelector("[data-simlive-nav]");
    if (!link) {
      var label = document.createElement("p");
      label.className = "aw-nav-label";
      label.setAttribute("data-simlive-label", "");
      label.textContent = "MODERATION";
      link = document.createElement("a");
      link.className = "aw-nav-link";
      link.href = "#" + VIEW;
      link.setAttribute("data-simlive-nav", "");
      link.innerHTML = '<i data-lucide="radio"></i><span>Livestream schedules</span>';
      nav.append(label, link);
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    }
    if (isMyView()) {
      nav.querySelectorAll(".aw-nav-link[aria-current='page']").forEach(function (anchor) {
        if (anchor !== link) anchor.removeAttribute("aria-current");
      });
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }

  function paintShell() {
    var content = document.getElementById("aw-content");
    if (!content || document.getElementById("simlive-root")) return;
    showHeadings();
    content.innerHTML = '<section class="aw-panel" id="simlive-root">'
      + '<div class="aw-panel-heading"><div><h2>Livestream schedules</h2><p>Platform-owner moderation for play-as-live church streams.</p></div></div>'
      + '<form class="simlive-filters" id="simlive-filters">'
      + '<label>Status<select id="simlive-status" aria-label="Status"><option value="">All statuses</option><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label>'
      + '<label>Search<input id="simlive-q" type="search" maxlength="200" placeholder="Church, title, or video" /></label>'
      + '<label>Church id<input id="simlive-church" type="text" maxlength="128" placeholder="Optional" autocomplete="off" /></label>'
      + "</form><div id=\"simlive-list\"></div></section>";
    var status = document.getElementById("simlive-status");
    var query = document.getElementById("simlive-q");
    var church = document.getElementById("simlive-church");
    status.value = state.status;
    query.value = state.q;
    church.value = state.churchId;
    status.addEventListener("change", function () { state.status = status.value; reload(); });
    query.addEventListener("input", function () { state.q = query.value.trim(); scheduleReload(); });
    church.addEventListener("input", function () { state.churchId = church.value.trim(); scheduleReload(); });
    document.getElementById("simlive-filters").addEventListener("submit", function (event) {
      event.preventDefault();
      reload();
    });
    reload();
  }

  function sync() {
    if (!document.body || document.body.hasAttribute("data-creator-workspace")) return;
    if (!isOwner()) {
      removeNav();
      return;
    }
    ensureNav();
    if (!isMyView()) return;
    showHeadings();
    if (!document.getElementById("simlive-root")) paintShell();
  }

  function boot() {
    var nav = document.getElementById("aw-nav");
    var content = document.getElementById("aw-content");
    if (!nav || !content || !document.body.hasAttribute("data-admin-workspace")) return;
    var observer = new MutationObserver(sync);
    observer.observe(nav, { childList: true });
    observer.observe(content, { childList: true });
    window.addEventListener("hashchange", sync);
    window.addEventListener("mwe-platform-ready", sync);
    sync();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
