/* Brief 05.3: chat for the people in one shared meditation session, pause requests and bookmarked moments.
   meditation.js calls attach() once the shared session connects and detach() when the room closes. */
(function (root) {
  "use strict";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const clock = seconds => { const s = Math.max(0, Math.floor(Number(seconds) || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  let session = null, timer = null, panel = null, toggle = null, seen = new Set(), unread = 0, firstLoad = true;
  let last = { path: "", open: false }; // remembered across a reconnect (detach followed by attach for the same session)

  function toast(message) { (root.showToast || console.log)(message); }

  function build() {
    toggle = document.createElement("button");
    toggle.type = "button"; toggle.className = "mwe-session-toggle"; toggle.dataset.sessionToggle = "";
    // A pressed toggle, not a popover: the app shell closes aria-expanded popovers on any outside click,
    // but this panel must stay open while people use the room controls.
    toggle.setAttribute("aria-pressed", "false");
    toggle.innerHTML = '<span>Session</span><b data-session-unread hidden>0</b>';
    panel = document.createElement("aside");
    panel.id = "mwe-session-panel"; panel.className = "mwe-session-panel"; panel.hidden = true;
    panel.setAttribute("aria-label", "Session chat and bookmarks");
    panel.innerHTML = `
      <header><div><strong>This session</strong><small data-session-role></small></div><button type="button" data-session-close aria-label="Close session panel">×</button></header>
      <div class="mwe-session-actions">
        <button type="button" data-session-pause-request hidden>Request a pause</button>
        <button type="button" data-session-bookmark>Bookmark this moment</button>
      </div>
      <p class="mwe-session-alert" data-session-alert role="status" hidden></p>
      <section><h4>Bookmarks</h4><ol class="mwe-session-bookmarks" data-session-bookmarks><li class="empty">No bookmarks yet.</li></ol></section>
      <section class="mwe-session-chat"><h4>Chat with this session</h4><ol data-session-messages role="log" aria-live="polite"><li class="empty">Only people in this session can read these messages.</li></ol>
        <form data-session-chat-form><input name="body" maxlength="300" autocomplete="off" placeholder="Message the group" aria-label="Message the session" /><button type="submit">Send</button></form></section>`;
    const host = document.getElementById("meditation-room-view") || document.body;
    host.append(toggle, panel);
    toggle.onclick = () => setOpen(panel.hidden);
    panel.querySelector("[data-session-close]").onclick = () => setOpen(false);
    panel.querySelector("[data-session-pause-request]").onclick = requestPause;
    panel.querySelector("[data-session-bookmark]").onclick = addBookmark;
    panel.querySelector("[data-session-chat-form]").onsubmit = sendChat;
    panel.addEventListener("click", onPanelClick);
  }

  function setOpen(open) {
    if (!panel) return;
    panel.hidden = !open; toggle.setAttribute("aria-pressed", String(open));
    if (open) { unread = 0; drawUnread(); panel.querySelector("[name=body]")?.focus(); }
  }
  function drawUnread() { const badge = toggle?.querySelector("[data-session-unread]"); if (badge) { badge.hidden = !unread; badge.textContent = String(unread); } }

  async function call(path, body, method) { return session.api(session.path + path, body, method); }

  function drawRole() {
    const host = session.isHost();
    panel.querySelector("[data-session-role]").textContent = host ? "You are the host" : "Following the host";
    panel.querySelector("[data-session-pause-request]").hidden = host;
  }

  function messageMarkup(m) {
    const who = esc(m.own ? "You" : m.name || "Participant") + (m.fromHost ? ' <em>host</em>' : "");
    if (m.kind === "pause-request") return `<li class="pause"><b>${who}</b> ${esc(m.body)} at ${clock(m.position)}${session.isHost() && !m.own ? ' <button type="button" data-session-do-pause>Pause now</button>' : ""}</li>`;
    if (m.kind === "bookmark") return `<li class="mark"><b>${who}</b> shared a moment: <span>${clock(m.position)}</span> ${esc(m.body)}${session.isHost() ? ` <button type="button" data-session-go="${esc(m.position)}">Go to ${clock(m.position)}</button>` : ""}</li>`;
    return `<li><b>${who}</b> ${esc(m.body)}</li>`;
  }

  async function loadMessages() {
    if (!session) return;
    try {
      const data = await call("/chat");
      if (!session) return;
      const list = panel.querySelector("[data-session-messages]");
      const fresh = data.messages.filter(m => !seen.has(m.id));
      data.messages.forEach(m => seen.add(m.id));
      list.innerHTML = data.messages.length ? data.messages.map(messageMarkup).join("") : '<li class="empty">Only people in this session can read these messages.</li>';
      list.scrollTop = list.scrollHeight;
      if (!firstLoad) {
        const others = fresh.filter(m => !m.own);
        if (panel.hidden && others.length) { unread += others.length; drawUnread(); }
        const pause = others.find(m => m.kind === "pause-request");
        if (pause && session.isHost()) showAlert(`${pause.name || "A participant"} asked to pause.`, true);
      }
      firstLoad = false;
    } catch (error) { /* polling retries quietly; actions report their own errors */ }
  }

  function showAlert(text, withPause) {
    const node = panel.querySelector("[data-session-alert]");
    node.hidden = false;
    node.innerHTML = esc(text) + (withPause ? ' <button type="button" data-session-do-pause>Pause now</button>' : "");
    toast(text);
  }

  async function loadBookmarks() {
    if (!session) return;
    try {
      const data = await call("/bookmarks");
      const list = panel.querySelector("[data-session-bookmarks]");
      list.innerHTML = data.bookmarks.length ? data.bookmarks.map(b => `<li data-bookmark="${esc(b.id)}"><button type="button" class="time" data-session-go="${esc(b.position)}" data-verse="${esc(b.verse)}">${clock(b.position)}</button> <span>${esc(b.label || "Bookmarked moment")}</span>
        <button type="button" data-session-share="${esc(b.position)}" data-label="${esc(b.label)}">Share</button><button type="button" data-session-remove="${esc(b.id)}" aria-label="Remove bookmark">×</button></li>`).join("") : '<li class="empty">No bookmarks yet.</li>';
    } catch (error) { toast("Bookmarks unavailable: " + error.message); }
  }

  async function requestPause() {
    const button = panel.querySelector("[data-session-pause-request]"); button.disabled = true;
    try { await call("/chat", { kind: "pause-request", position: session.moment().position }); toast("Pause request sent to the host."); await loadMessages(); }
    catch (error) { toast(error.message); }
    finally { setTimeout(() => { button.disabled = false; }, 3000); }
  }

  async function addBookmark() {
    const { position, verse, label } = session.moment();
    try { await call("/bookmarks", { position, verse, label }); toast("Moment bookmarked at " + clock(position) + "."); await loadBookmarks(); }
    catch (error) { toast(error.message); }
  }

  async function sendChat(event) {
    event.preventDefault();
    const input = event.currentTarget.elements.body, body = input.value.trim();
    if (!body) return;
    input.disabled = true;
    try { await call("/chat", { body }); input.value = ""; await loadMessages(); }
    catch (error) { toast(error.message); }
    finally { input.disabled = false; input.focus(); }
  }

  async function onPanelClick(event) {
    const go = event.target.closest("[data-session-go]");
    if (go) {
      const position = Number(go.dataset.sessionGo), verse = go.dataset.verse === undefined ? undefined : Number(go.dataset.verse);
      if (session.isHost()) { if (session.seek(position, verse)) toast("Session moved to " + clock(position) + "."); }
      else { try { await call("/chat", { kind: "bookmark", position, body: "Can we go back here?" }); toast("Shared with the host, who can take everyone there."); await loadMessages(); } catch (error) { toast(error.message); } }
      return;
    }
    if (event.target.closest("[data-session-do-pause]")) { session.pause(); panel.querySelector("[data-session-alert]").hidden = true; return; }
    const share = event.target.closest("[data-session-share]");
    if (share) { try { await call("/chat", { kind: "bookmark", position: Number(share.dataset.sessionShare), body: share.dataset.label || "" }); await loadMessages(); toast("Moment shared with the session."); } catch (error) { toast(error.message); } return; }
    const remove = event.target.closest("[data-session-remove]");
    if (remove) { try { await call("/bookmarks/" + encodeURIComponent(remove.dataset.sessionRemove), null, "DELETE"); await loadBookmarks(); } catch (error) { toast(error.message); } }
  }

  root.MWEMeditationSessionPanel = {
    attach(options) {
      // Re-attaching to the same session (e.g. after a verse change reconnects) keeps the panel as the user left it.
      const current = session ? { path: session.path, open: !!panel && !panel.hidden } : last;
      const sameSession = current.path === options.path, wasOpen = sameSession && current.open;
      const keepSeen = sameSession ? seen : new Set(), keepUnread = sameSession ? unread : 0;
      this.detach();
      session = options; seen = keepSeen; unread = keepUnread; firstLoad = !sameSession;
      if (!panel) build();
      toggle.hidden = false; drawRole(); drawUnread();
      if (wasOpen) setOpen(true);
      loadMessages(); loadBookmarks();
      timer = setInterval(() => { if (!document.hidden) { drawRole(); loadMessages(); } }, 2500);
    },
    detach() {
      if (session) last = { path: session.path, open: !!panel && !panel.hidden };
      clearInterval(timer); timer = null; session = null;
      if (panel) { panel.hidden = true; toggle.hidden = true; panel.querySelector("[data-session-alert]").hidden = true; }
    }
  };
})(window);
