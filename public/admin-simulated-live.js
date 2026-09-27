/* Owner dashboard: "Livestream schedules" moderation view (#livestreams).
   Self-contained: injects its own nav entry and view at runtime; admin-workspace.js is not modified.
   API (src/simulated-live.js):
   GET   /api/admin/simulated-live?status=&churchId=&q=&limit=&cursor=  -> {ok, streams, nextCursor}   (platform owner only)
   PATCH /api/churches/:churchId/simulated-live/:streamId {status:"paused", moderationNote} | {status:"active"} -> {ok, stream}
   Errors: {ok:false, error, code}. */
(function () {
  "use strict";
  const KEY = "livestreams";
  const LABEL = "Livestream schedules";
  const PAGE_SIZE = 25;
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const notice = message => (window.showToast ? window.showToast(message) : console.info(message));
  const isOwnerWorkspace = () => document.body.hasAttribute("data-admin-workspace") && !document.body.hasAttribute("data-creator-workspace") && window.MWEPlatform?.role === "owner" && document.body.classList.contains("is-authenticated");
  const isActive = () => location.hash.slice(1) === KEY;
  const state = { status: "", q: "", churchId: "", streams: [], nextCursor: null, loading: false, error: null, openPause: null, pauseNote: "", rowErrors: {}, busy: {}, stale: true };
  let root = null;
  let requestToken = 0;

  async function api(path, body, method) {
    const response = await fetch("/api/" + path, { method: method || (body ? "POST" : "GET"), credentials: "same-origin", cache: "no-store", headers: body ? { "content-type": "application/json" } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
    let data = null;
    try { data = await response.json(); } catch (_) { data = null; }
    if (!response.ok || !data || data.ok === false) {
      const error = new Error(data?.error || "The server could not complete this request (HTTP " + response.status + ").");
      error.status = response.status;
      error.code = data?.code || "";
      throw error;
    }
    return data;
  }
  const errorText = error => (error?.message || "Something went wrong.") + (error?.code ? " [" + error.code + "]" : error?.status ? " [HTTP " + error.status + "]" : "");
  function validZone(zone) { try { new Intl.DateTimeFormat("en-US", { timeZone: zone }); return true; } catch (_) { return false; } }
  function inZone(isoValue, zone) {
    if (!isoValue) return "";
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return String(isoValue);
    const timeZone = zone && validZone(zone) ? zone : "UTC";
    return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(date);
  }
  const safeUrl = value => { const text = String(value || ""); return /^(https:\/\/|\/media\/)/i.test(text) ? text : ""; };
  function slotSummary(slot, zone) {
    if (slot.kind === "once") return "Once · " + inZone(slot.startsAt, zone);
    if (slot.kind === "weekly") {
      const range = slot.activeFrom || slot.activeUntil ? " (" + (slot.activeFrom || "…") + " to " + (slot.activeUntil || "…") + ")" : "";
      return "Weekly · " + (WEEKDAYS[Number(slot.weekday)] || "Day " + slot.weekday) + " " + (slot.localTime || "") + " " + (zone || "") + range;
    }
    return "Unknown slot";
  }
  const statusBadge = status => '<span class="aw-badge' + (status === "active" ? " good" : status === "paused" ? " warn" : "") + '">' + esc(status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown") + '</span>';
  const duration = seconds => { const s = Number(seconds) || 0; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? h + "h " : "") + m + "m" + (s % 60 && !h ? " " + (s % 60) + "s" : ""); };

  function rowHtml(stream) {
    const zone = stream.timezone || "UTC";
    const poster = safeUrl(stream.posterUrl ?? stream.poster);
    const video = safeUrl(stream.videoUrl);
    const media = poster ? '<img class="asl-poster" src="' + esc(poster) + '" alt="" loading="lazy" />' : '<span class="asl-poster asl-poster-empty" aria-hidden="true">▶</span>';
    const slots = (stream.slots || []).map(slot => '<li>' + esc(slotSummary(slot, zone)) + '</li>').join("") || "<li>No time slots</li>";
    const next = stream.nextPlay?.startsAt ? esc(inZone(stream.nextPlay.startsAt, zone)) : stream.status === "active" ? "No upcoming play in the next 12 weeks" : "Not scheduled while " + esc(stream.status || "inactive");
    const history = stream.moderationNote || stream.pausedBy || stream.pausedAt
      ? '<div class="asl-history"><strong>Last moderation</strong><p>' + esc(stream.moderationNote || "No note recorded") + '</p><small>' + esc([stream.pausedBy ? "Paused by " + stream.pausedBy : "", stream.pausedAt ? inZone(stream.pausedAt, zone) : ""].filter(Boolean).join(" · ")) + '</small></div>' : "";
    const busy = state.busy[stream.id];
    let actions = "";
    if (stream.status === "active") actions = '<button type="button" class="aw-button" data-asl-open-pause="' + esc(stream.id) + '"' + (busy ? " disabled" : "") + '>Pause</button>';
    if (stream.status === "paused") actions = '<button type="button" class="aw-button aw-primary" data-asl-resume="' + esc(stream.id) + '"' + (busy ? " disabled" : "") + '>Resume</button>';
    const pauseForm = state.openPause === stream.id ? '<form class="asl-pause-form" data-asl-pause-form="' + esc(stream.id) + '"><label>Moderation note (required, shown to the church)<textarea name="note" required maxlength="1000" rows="3">' + esc(state.pauseNote) + '</textarea></label><div class="asl-actions"><button type="submit" class="aw-button aw-primary"' + (busy ? " disabled" : "") + '>Pause and lock</button><button type="button" class="aw-button" data-asl-cancel-pause>Cancel</button></div></form>' : "";
    const rowError = state.rowErrors[stream.id] ? '<p class="asl-error" role="alert">' + esc(state.rowErrors[stream.id]) + '</p>' : "";
    return '<article class="asl-row" data-asl-row="' + esc(stream.id) + '"><div class="asl-media">' + media + (video ? '<a class="aw-text-link" href="' + esc(video) + '" target="_blank" rel="noopener noreferrer">Open video</a>' : "") + '</div>' +
      '<div class="asl-main"><div class="asl-head"><div><small class="asl-church">' + esc(stream.churchName || "Unknown church") + ' · ' + esc(stream.churchId) + '</small><h3>' + esc(stream.title || "Untitled stream") + '</h3></div><div class="asl-badges">' + statusBadge(stream.status) + (stream.moderationLocked ? '<span class="aw-badge asl-lock">Moderation lock</span>' : "") + '</div></div>' +
      '<dl class="asl-meta"><div><dt>Next play</dt><dd>' + next + '</dd></div><div><dt>Time zone</dt><dd>' + esc(zone) + '</dd></div><div><dt>Mode</dt><dd>' + esc(stream.playMode === "loop" ? "Loop" : "Play once") + ' · ' + esc(duration(stream.durationSeconds)) + '</dd></div><div><dt>Created by</dt><dd>' + esc(stream.createdBy || "Unknown") + '</dd></div></dl>' +
      '<div class="asl-slots"><strong>Slots</strong><ul>' + slots + '</ul></div>' + history + rowError + pauseForm + '</div>' +
      '<div class="asl-actions asl-row-actions">' + actions + '</div></article>';
  }
  function draw() {
    if (!root || !root.isConnected) return;
    const statusOptions = [["", "All statuses"], ["active", "Active"], ["paused", "Paused"], ["archived", "Archived"]].map(([value, label]) => '<option value="' + value + '"' + (state.status === value ? " selected" : "") + '>' + label + '</option>').join("");
    const filters = '<form class="aw-filters" data-asl-filters><label>Search<input type="search" name="q" maxlength="200" placeholder="Title, church or video URL" value="' + esc(state.q) + '" /></label><label>Status<select name="status">' + statusOptions + '</select></label><label>Church ID<input name="churchId" maxlength="128" placeholder="Optional" value="' + esc(state.churchId) + '" /></label><button type="submit" class="aw-button">Apply</button></form>';
    const list = state.streams.length ? state.streams.map(rowHtml).join("") : state.loading ? "" : '<div class="aw-empty"><h3>No livestream schedules match</h3><p>Try a different search or status.</p></div>';
    const error = state.error ? '<p class="asl-error asl-list-error" role="alert">' + esc(state.error) + '</p>' : "";
    const more = state.loading ? '<p class="asl-loading" role="status">Loading…</p>' : state.nextCursor ? '<button type="button" class="aw-button" data-asl-more>Load more</button>' : state.streams.length ? '<small>End of list · ' + state.streams.length + ' shown</small>' : "";
    root.innerHTML = '<section class="aw-panel asl-panel"><div class="aw-panel-heading"><div><h2>Scheduled "play as live" streams</h2><p>Pausing as platform owner locks the stream: the church cannot put it back on air until you resume it. Times show in each stream\'s own time zone.</p></div></div>' + filters + error + '<div class="asl-list">' + list + '</div><div class="aw-pagination asl-more">' + more + '</div></section>';
  }
  async function load(reset) {
    const token = ++requestToken;
    if (reset) Object.assign(state, { streams: [], nextCursor: null, openPause: null, rowErrors: {} });
    state.loading = true; state.error = null; draw();
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (state.status) params.set("status", state.status);
    if (state.q) params.set("q", state.q);
    if (state.churchId) params.set("churchId", state.churchId);
    if (!reset && state.nextCursor) params.set("cursor", state.nextCursor);
    try {
      const data = await api("admin/simulated-live?" + params.toString());
      if (token !== requestToken) return;
      const seen = new Set(state.streams.map(s => s.id));
      state.streams = state.streams.concat((data.streams || []).filter(s => !seen.has(s.id)));
      state.nextCursor = data.nextCursor || null;
    } catch (error) {
      if (token !== requestToken) return;
      state.error = "Could not load livestream schedules: " + errorText(error);
    }
    state.loading = false;
    draw();
  }
  async function patchStream(stream, body) {
    state.busy[stream.id] = true; delete state.rowErrors[stream.id]; draw();
    try {
      const data = await api("churches/" + encodeURIComponent(stream.churchId) + "/simulated-live/" + encodeURIComponent(stream.id), body, "PATCH");
      const updated = { ...stream, ...(data.stream || {}), churchName: stream.churchName, churchId: stream.churchId };
      const plays = Array.isArray(updated.nextPlays) ? updated.nextPlays : [];
      delete updated.nextPlays;
      const upcoming = plays.find(p => Date.parse(p.startsAt) > Date.now());
      updated.nextPlay = updated.status === "active" && upcoming ? { startsAt: upcoming.startsAt, slotId: upcoming.slotId, title: updated.title } : null;
      state.streams = state.streams.map(s => (s.id === stream.id ? updated : s));
      state.openPause = null;
      state.pauseNote = "";
      notice(body.status === "paused" ? "Stream paused and locked." : "Stream resumed.");
    } catch (error) {
      state.rowErrors[stream.id] = errorText(error);
    }
    delete state.busy[stream.id];
    draw();
  }
  function bind(target) {
    target.addEventListener("submit", event => {
      const filterForm = event.target.closest("[data-asl-filters]");
      if (filterForm) {
        event.preventDefault();
        const values = new FormData(filterForm);
        Object.assign(state, { q: String(values.get("q") || "").trim(), status: String(values.get("status") || ""), churchId: String(values.get("churchId") || "").trim() });
        load(true);
        return;
      }
      const pauseForm = event.target.closest("[data-asl-pause-form]");
      if (pauseForm) {
        event.preventDefault();
        const note = String(new FormData(pauseForm).get("note") || "").trim();
        state.pauseNote = note;
        const stream = state.streams.find(s => s.id === pauseForm.dataset.aslPauseForm);
        if (!stream) return;
        if (!note) { state.rowErrors[stream.id] = "A moderation note is required to pause a stream."; draw(); return; }
        patchStream(stream, { status: "paused", moderationNote: note });
      }
    });
    target.addEventListener("input", event => { if (event.target.closest("[data-asl-pause-form]") && event.target.name === "note") state.pauseNote = event.target.value; });
    target.addEventListener("click", event => {
      if (event.target.closest("[data-asl-more]")) { load(false); return; }
      const open = event.target.closest("[data-asl-open-pause]");
      if (open) { state.openPause = open.dataset.aslOpenPause; state.pauseNote = ""; draw(); root.querySelector("[data-asl-pause-form] textarea")?.focus(); return; }
      if (event.target.closest("[data-asl-cancel-pause]")) { state.openPause = null; draw(); return; }
      const resume = event.target.closest("[data-asl-resume]");
      if (resume) {
        const stream = state.streams.find(s => s.id === resume.dataset.aslResume);
        if (stream && window.confirm("Resume \"" + (stream.title || "this stream") + "\"? This lifts the moderation lock and puts it back on its schedule.")) patchStream(stream, { status: "active" });
      }
    });
  }

  function syncNav() {
    const nav = $("aw-nav");
    if (!nav || !nav.firstElementChild || !isOwnerWorkspace()) return;
    let link = nav.querySelector("[data-simlive-nav]");
    if (!link) {
      link = document.createElement("a");
      link.className = "aw-nav-link";
      link.href = "#" + KEY;
      link.dataset.simliveNav = "";
      link.innerHTML = '<i data-lucide="calendar-clock"></i><span>' + esc(LABEL) + '</span>';
      const section = [...nav.querySelectorAll(".aw-nav-label")].find(label => label.textContent.trim().toUpperCase() === "OPERATIONS");
      if (section) {
        let ref = section;
        while (ref.nextElementSibling && ref.nextElementSibling.matches("[data-owner-view],[data-simlive-nav]")) ref = ref.nextElementSibling;
        ref.after(link);
      } else nav.append(link);
      window.lucide?.createIcons();
    }
    if (isActive()) {
      nav.querySelectorAll('[aria-current="page"]').forEach(el => { if (el !== link) el.removeAttribute("aria-current"); });
      link.setAttribute("aria-current", "page");
    } else link.removeAttribute("aria-current");
  }
  function syncContent() {
    const content = $("aw-content");
    if (!isActive() || !content || !isOwnerWorkspace()) return;
    if (content.firstElementChild?.dataset.simliveRoot === KEY) return;
    $("aw-title").textContent = LABEL;
    $("aw-breadcrumb").textContent = LABEL;
    $("aw-subtitle").textContent = "Review church \"play as live\" schedules, pause streams that need attention and lift moderation locks.";
    $("aw-eyebrow").textContent = "OPERATIONS / " + LABEL.toUpperCase();
    $("aw-heading-actions").innerHTML = '<a class="aw-button" href="#overview">Back to overview</a>';
    document.title = LABEL + " · Admin | My Way";
    root = document.createElement("div");
    root.dataset.simliveRoot = KEY;
    content.replaceChildren(root);
    bind(root);
    if (state.stale) { state.stale = false; load(true); } else draw();
  }
  const sync = () => { if (!isActive()) state.stale = true; syncNav(); syncContent(); };
  document.addEventListener("DOMContentLoaded", async () => {
    await window.MWEPlatform?.ready;
    if (!document.body.hasAttribute("data-admin-workspace") || document.body.hasAttribute("data-creator-workspace")) return;
    const nav = $("aw-nav");
    const content = $("aw-content");
    if (nav) new MutationObserver(syncNav).observe(nav, { childList: true });
    if (content) new MutationObserver(syncContent).observe(content, { childList: true });
    window.addEventListener("hashchange", sync);
    sync();
  });
})();
