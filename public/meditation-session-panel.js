/* Brief 05.3: chat for the people in one shared meditation session, pause requests and bookmarked moments.
   meditation.js calls attach() once the shared session connects and detach() when the room closes. */
(function (root) {
  "use strict";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const clock = seconds => { const s = Math.max(0, Math.floor(Number(seconds) || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  let session = null, timer = null, panel = null, toggle = null, seen = new Set(), unread = 0, firstLoad = true;
  let last = { path: "", open: false }; // remembered across a reconnect (detach followed by attach for the same session)

  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  function refreshIcons() { root.lucide?.createIcons(); }
  function messageTime(value) { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : ''; }
  function composerState() {
    if (!panel) return;
    const input = panel.querySelector('[name=body]');
    panel.querySelector('[data-session-send]').disabled = input.disabled || !input.value.trim();
    panel.querySelector('[data-session-length]').textContent = `${input.value.length}/300`;
    input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight,96) + 'px';
  }
  function toast(message) { (root.showToast || console.log)(message); }

  function build() {
    toggle = document.createElement("button");
    toggle.type = "button"; toggle.className = "mwe-session-toggle"; toggle.dataset.sessionToggle = "";
    // A pressed toggle, not a popover: the app shell closes aria-expanded popovers on any outside click,
    // but this panel must stay open while people use the room controls.
    toggle.setAttribute("aria-pressed", "false");
    toggle.innerHTML = `${icon('messages-square')}<span>Session</span><b data-session-unread hidden>0</b>`;
    panel = document.createElement("aside");
    panel.id = "mwe-session-panel"; panel.className = "mwe-session-panel"; panel.hidden = true;
    panel.setAttribute("aria-label", "Session chat and bookmarks");
    panel.innerHTML = `
      <header class="session-panel-header"><div class="session-heading-icon">${icon('messages-square')}</div><div class="session-heading-copy"><strong>This session</strong><small data-session-role></small></div><span class="session-connection" data-session-connection><span></span>Live</span><button type="button" class="session-icon-button" data-session-close aria-label="Close session panel">${icon('x')}</button></header>
      <div class="mwe-session-actions">
        <button type="button" data-session-bookmark>${icon('bookmark-plus')}<span>Bookmark this moment</span></button>
        <button type="button" data-session-pause-request hidden>${icon('pause')}<span>Request a pause</span></button>
      </div>
      <p class="mwe-session-alert" data-session-alert role="status" hidden></p>
      <section class="session-bookmark-section"><div class="session-section-heading"><h4>${icon('bookmark')}Saved moments</h4><span data-bookmark-count>0</span></div><ol class="mwe-session-bookmarks" data-session-bookmarks></ol></section>
      <section class="mwe-session-chat"><div class="session-section-heading"><h4>${icon('message-circle')}Live conversation</h4><span class="session-private">Session only</span></div><ol data-session-messages role="log" aria-live="polite" aria-label="Session messages"></ol>
        <form data-session-chat-form><label class="sr-only" for="session-message-body">Message the session</label><div class="session-composer"><textarea id="session-message-body" name="body" maxlength="300" rows="1" placeholder="Share a thought with the group…" aria-label="Message the session"></textarea><button type="submit" data-session-send aria-label="Send message" disabled>${icon('send-horizontal')}</button></div><div class="session-composer-meta"><span>Enter to send · Shift + Enter for a new line</span><span data-session-length>0/300</span></div><p data-session-send-status role="status" class="session-send-status"></p></form></section>`;
    const host = document.getElementById("meditation-room-view") || document.body;
    host.append(toggle, panel);
    toggle.onclick = () => setOpen(panel.hidden);
    panel.querySelector("[data-session-close]").onclick = () => setOpen(false);
    panel.querySelector("[data-session-pause-request]").onclick = requestPause;
    panel.querySelector("[data-session-bookmark]").onclick = addBookmark;
    panel.querySelector("[data-session-chat-form]").onsubmit = sendChat;
    panel.addEventListener("click", onPanelClick);
    const input = panel.querySelector('[name=body]');
    input.addEventListener('input', composerState);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); if (!input.disabled && input.value.trim()) input.form.requestSubmit(); }
    });
    composerState(); refreshIcons();
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
    const name = m.own ? 'You' : m.name || 'Participant';
    const who = esc(name) + (m.fromHost ? ' <em>Host</em>' : '');
    if (m.kind === 'pause-request') return `<li class="pause session-event">${icon('pause')}<div><b>${who}</b><p>${esc(m.body)} at ${clock(m.position)}</p>${session.isHost() && !m.own ? '<button type="button" data-session-do-pause>Pause now</button>' : ''}</div></li>`;
    if (m.kind === 'bookmark') return `<li class="mark session-event">${icon('bookmark')}<div><b>${who}</b><p>Shared a moment <span>${clock(m.position)}</span></p><p>${esc(m.body)}</p>${session.isHost() ? `<button type="button" data-session-go="${esc(m.position)}">${icon('play')}Go to ${clock(m.position)}</button>` : ''}</div></li>`;
    return `<li class="session-message ${m.own?'is-own':''}"><span class="session-message-avatar" aria-hidden="true">${esc((m.name||'You').slice(0,1).toUpperCase())}</span><div class="session-message-content"><div class="session-message-meta"><b>${who}</b><time datetime="${esc(m.createdAt||'')}">${esc(messageTime(m.createdAt))}</time></div><p>${esc(m.body)}</p></div></li>`;
  }

  async function loadMessages() {
    if (!session) return;
    try {
      const owner = session;
      const data = await call("/chat");
      if (session !== owner) return;
      const list = panel.querySelector("[data-session-messages]");
      const fresh = data.messages.filter(m => !seen.has(m.id));
      data.messages.forEach(m => seen.add(m.id));
      const following = list.scrollHeight-list.scrollTop-list.clientHeight < 48;
      const signature = JSON.stringify(data.messages);
      if (list.dataset.signature !== signature) {
        list.dataset.signature = signature;
        list.innerHTML = data.messages.length ? data.messages.map(messageMarkup).join('') : `<li class="empty">${icon('messages-square')}<strong>A little fellowship, in real time</strong><span>Only people in this session can read these messages.</span></li>`;
        if (firstLoad || following || fresh.some(m=>m.own)) list.scrollTop=list.scrollHeight;
        refreshIcons();
      }
      const connection = panel.querySelector('[data-session-connection]'); connection.classList.remove('is-reconnecting'); connection.lastChild.textContent='Live';
      if (!firstLoad) {
        const others = fresh.filter(m => !m.own);
        if (panel.hidden && others.length) { unread += others.length; drawUnread(); }
        const pause = others.find(m => m.kind === "pause-request");
        if (pause && session.isHost()) showAlert(`${pause.name || "A participant"} asked to pause.`, true);
      }
      firstLoad = false;
    } catch (error) {
      if (panel && session) { const connection=panel.querySelector('[data-session-connection]'); connection.classList.add('is-reconnecting'); connection.lastChild.textContent='Reconnecting'; }
    }
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
      const owner = session;
      const data = await call('/bookmarks');
      if (session !== owner) return;
      const list = panel.querySelector('[data-session-bookmarks]');
      panel.querySelector('[data-bookmark-count]').textContent = String(data.bookmarks.length);
      list.innerHTML = data.bookmarks.length ? data.bookmarks.map(b => `<li data-bookmark="${esc(b.id)}"><button type="button" class="time" data-session-go="${esc(b.position)}" data-verse="${esc(b.verse)}" aria-label="${session.isHost()?'Jump':'Request to jump'} to ${clock(b.position)}">${icon('play')}${clock(b.position)}</button><span class="session-bookmark-label" title="${esc(b.label||'Bookmarked moment')}">${esc(b.label||'Bookmarked moment')}</span><button type="button" class="session-icon-button" data-session-share="${esc(b.position)}" data-label="${esc(b.label)}" aria-label="Share bookmark">${icon('share-2')}</button><button type="button" class="session-icon-button" data-session-remove="${esc(b.id)}" aria-label="Remove bookmark">${icon('trash-2')}</button></li>`).join('') : `<li class="empty">${icon('bookmark')}<div><strong>Keep a meaningful moment</strong><span>Your saved moments will appear here.</span></div></li>`;
      refreshIcons();
    } catch (error) { toast("Bookmarks unavailable: " + error.message); }
  }

  async function requestPause() {
    const button = panel.querySelector("[data-session-pause-request]"); button.disabled = true;
    try { await call("/chat", { kind: "pause-request", position: session.moment().position }); toast("Pause request sent to the host."); await loadMessages(); }
    catch (error) { toast(error.message); }
    finally { setTimeout(() => { button.disabled = false; }, 3000); }
  }

  async function addBookmark() {
    if (!session) return;
    const button = panel.querySelector('[data-session-bookmark]'); if (button.disabled) return;
    button.disabled = true;
    const { position, verse, label } = session.moment();
    try { await call('/bookmarks', {position,verse,label}); toast('Moment bookmarked at '+clock(position)+'.'); await loadBookmarks(); }
    catch (error) { toast(error.message); }
    finally { button.disabled=false; }
  }

  async function sendChat(event) {
    event.preventDefault();
    const input=event.currentTarget.elements.body, body=input.value.trim();
    if (!session || input.disabled || !body) return;
    const owner=session, status=panel.querySelector('[data-session-send-status]');
    input.disabled=true; composerState(); status.textContent='Sending…'; status.classList.remove('is-error');
    try {
      await call('/chat',{body}); if (session!==owner) return;
      input.value=''; status.textContent='Message sent'; await loadMessages();
    } catch (error) { if(session===owner){ status.textContent='Not sent: '+error.message+' Your message is kept here to retry.'; status.classList.add('is-error'); } }
    finally { if(session===owner){input.disabled=false;composerState();input.focus();} }
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
    if (share) { try { await call("/chat", { kind: "bookmark", position: Number(share.dataset.sessionShare), body: share.dataset.label || "Bookmarked moment" }); await loadMessages(); toast("Moment shared with the session."); } catch (error) { toast(error.message); } return; }
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
      if (!sameSession) {
        panel.querySelector('[data-session-chat-form]').reset();
        panel.querySelector('[name=body]').disabled=false;
        panel.querySelector('[data-session-messages]').dataset.signature='';
        panel.querySelector('[data-session-send-status]').textContent='';
        composerState();
      }
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
