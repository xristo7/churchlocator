/* Resource detail + reader. Data comes from GET /api/resources/:idOrSlug (public, D1). Saves go to D1 via signed-in POSTs. */
(function initializeResourcePage() {
  "use strict";
  const page = document.body.dataset.page === "resource-reader" ? "reader" : "detail";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icons = () => window.lucide?.createIcons();
  const money = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);

  // Accept /resources/<key>, /resources/<key>/read, ?id=, ?slug=, ?resource=
  function resourceKey() {
    const m = location.pathname.match(/^\/resources\/([^/]+)/);
    if (m) { try { return decodeURIComponent(m[1]); } catch { return m[1]; } }
    const q = new URLSearchParams(location.search);
    return q.get("id") || q.get("slug") || q.get("resource") || "";
  }

  async function call(path, options = {}) {
    const res = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options, headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...(options.headers || {}) } });
    let data = {}; try { data = await res.json(); } catch {}
    return { status: res.status, ok: res.ok && data.ok !== false, data };
  }

  let state = null;
  const statusEl = () => document.getElementById("rv-status");
  function say(message, signIn = false) {
    const el = statusEl(); if (!el) return;
    el.innerHTML = `<span>${esc(message)}</span>${signIn ? `<button type="button" class="rv-btn rv-btn-primary" data-rv-signin><i data-lucide="log-in"></i> Sign in</button>` : ""}`;
    el.hidden = false; icons();
    el.querySelector("[data-rv-signin]")?.addEventListener("click", () => window.MWE?.openMemberLogin?.(location.pathname + location.search));
  }

  function kindOf(r) {
    const f = String(r.format || "").toUpperCase(), t = String(r.type || "").toLowerCase();
    if (t === "video" || ["MP4", "MOV", "WEBM", "M4V"].includes(f)) return "video";
    if (f === "EPUB") return "epub";
    if (f === "PDF") return "pdf";
    if (t === "audio") return "audio";
    return "file";
  }
  const kindLabel = { video: "Video", epub: "EPUB book", pdf: "PDF document", audio: "Audio", file: "Document" };
  const kindIcon = { video: "video", epub: "book-open", pdf: "file-text", audio: "headphones", file: "file" };
  const detailHref = r => `/resources/${encodeURIComponent(r.id)}`;
  const readerHref = r => `/resources/${encodeURIComponent(r.id)}/read`;

  function primaryButton() {
    const { resource: r, viewer } = state;
    if (viewer.inLibrary) return `<button type="button" class="rv-btn rv-btn-primary is-done" data-rv-library aria-pressed="true"><i data-lucide="check"></i> In your library</button>`;
    return r.access === "Paid"
      ? `<button type="button" class="rv-btn rv-btn-primary" data-rv-library><i data-lucide="shopping-bag"></i> Get resource · ${esc(money(r.price))}</button>`
      : `<button type="button" class="rv-btn rv-btn-primary" data-rv-library><i data-lucide="bookmark-plus"></i> Add to library</button>`;
  }

  function engagementBar() {
    const { counts, viewer } = state;
    return `<div class="rv-engage" role="group" aria-label="Engage with this resource">
      <button type="button" class="rv-chip" data-rv-like aria-pressed="${viewer.liked}"><i data-lucide="heart"></i><span>Like</span><b data-rv-like-count>${counts.likes}</b></button>
      <a class="rv-chip" href="#rv-comments" data-rv-comment-jump><i data-lucide="message-circle"></i><span>Comment</span><b data-rv-comment-count>${counts.comments}</b></a>
      <button type="button" class="rv-chip" data-rv-bookmark aria-pressed="${viewer.bookmarked}"><i data-lucide="bookmark"></i><span>${viewer.bookmarked ? "Bookmarked" : "Bookmark"}</span></button>
      <button type="button" class="rv-chip" data-rv-share><i data-lucide="share-2"></i><span>Share</span></button>
    </div>`;
  }

  function detailHero() {
    const { resource: r, church } = state; const k = kindOf(r);
    const lengthLabel = k === "video" || k === "audio" ? "Duration" : "Length";
    return `<section class="rv-hero">
      <div class="rv-cover">${r.image ? `<img src="${esc(r.image)}" alt="" loading="eager" />` : `<div class="rv-cover-empty"><i data-lucide="${kindIcon[k]}"></i></div>`}
        <span class="rv-badge"><i data-lucide="${kindIcon[k]}"></i>${esc(r.format || kindLabel[k])}</span></div>
      <div class="rv-info">
        <p class="rv-kicker">${esc([r.type, r.topic].filter(Boolean).join(" · "))}</p>
        <h1>${esc(r.title)}</h1>
        <dl class="rv-facts">
          <div><dt>Media type</dt><dd><i data-lucide="${kindIcon[k]}"></i>${esc(kindLabel[k])}${r.format ? ` (${esc(r.format)})` : ""}</dd></div>
          ${r.duration ? `<div><dt>${lengthLabel}</dt><dd><i data-lucide="clock"></i>${esc(r.duration)}</dd></div>` : ""}
          <div><dt>Creator church</dt><dd><i data-lucide="church"></i>${church ? `<a href="/churches/${encodeURIComponent(church.id)}">${esc(church.name)}</a>` : "Not linked to a church"}</dd></div>
          ${r.creator ? `<div><dt>By</dt><dd><i data-lucide="user-round"></i>${esc(r.creator)}</dd></div>` : ""}
          <div><dt>Price</dt><dd class="rv-price">${r.access === "Paid" ? esc(money(r.price)) : "Free"}</dd></div>
        </dl>
        ${r.description ? `<p class="rv-desc">${esc(r.description)}</p>` : ""}
        <div class="rv-actions">${primaryButton()}
          <a class="rv-btn" href="${page === "detail" ? "#rv-reader" : detailHref(r)}"><i data-lucide="${k === "video" ? "play" : "book-open"}"></i> ${page === "detail" ? (k === "video" ? "Watch now" : "Read now") : "Details"}</a>
          ${church ? `<a class="rv-btn" href="/channels/${encodeURIComponent(church.id)}"><i data-lucide="radio-tower"></i> Open Channel</a>` : ""}
        </div>
        ${engagementBar()}
        <p class="rv-status" id="rv-status" role="status" aria-live="polite" hidden></p>
      </div>
    </section>`;
  }

  function unavailable(title, body) {
    return `<div class="rv-unavailable"><i data-lucide="file-x-2"></i><strong>${esc(title)}</strong><p>${esc(body)}</p></div>`;
  }

  function outlineBlock() {
    const o = state.resource.outline;
    return o.length ? `<div class="rv-outline"><h3>Contents</h3><ol>${o.map(x => `<li>${esc(x)}</li>`).join("")}</ol></div>` : "";
  }

  function readerBlock() {
    const { resource: r, material, locked } = state; const k = kindOf(r);
    if (locked) return unavailable("This is a paid resource", `Get access for ${money(r.price)} to open the ${kindLabel[k].toLowerCase()}. Purchasing isn't open for resources yet.`);
    if (k === "video") {
      if (material.fileUrl) return `<div class="rv-player" data-rv-player>
          <video playsinline preload="metadata" ${r.image ? `poster="${esc(r.image)}"` : ""} src="${esc(material.fileUrl)}">${material.captions.map((c, i) => `<track kind="captions" src="${esc(c.src)}" srclang="${esc(c.lang)}" label="${esc(c.label)}" ${i ? "" : "default"}>`).join("")}</video>
          <div class="rv-controls">
            <button type="button" data-v="play" aria-label="Play"><i data-lucide="play"></i></button>
            <input type="range" min="0" max="1000" value="0" data-v="seek" aria-label="Seek" />
            <span data-v="time">0:00</span>
            <button type="button" data-v="cc" aria-pressed="${material.captions.length ? "true" : "false"}" ${material.captions.length ? "" : "disabled title=\"No captions uploaded for this video\""} aria-label="Captions">CC</button>
            <div class="rv-menu-wrap"><button type="button" data-v="settings" aria-haspopup="menu" aria-expanded="false" aria-label="Settings"><i data-lucide="settings"></i></button>
              <div class="rv-menu" role="menu" hidden><p>Playback speed</p>${[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => `<button type="button" role="menuitemradio" data-speed="${s}" aria-checked="${s === 1}">${s === 1 ? "Normal" : s + "×"}</button>`).join("")}<p class="rv-menu-note">Quality: original upload</p></div></div>
            <button type="button" data-v="fs" aria-label="Fullscreen"><i data-lucide="maximize"></i></button>
          </div></div>`;
      if (material.embedUrl) {
        const u = new URL(material.embedUrl); if (/youtube/.test(u.hostname)) { u.searchParams.set("rel", "0"); u.searchParams.set("cc_load_policy", "1"); u.searchParams.set("modestbranding", "1"); }
        return `<div class="rv-player rv-embed"><iframe src="${esc(u.toString())}" title="${esc(r.title)}" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
          <p class="rv-note"><i data-lucide="info"></i>This video is hosted on ${esc(u.hostname.replace(/^www\./, ""))}. Use the player's CC, settings (speed and quality) and fullscreen buttons.</p>`;
      }
      return unavailable("Video not uploaded yet", "The creator hasn't uploaded the video file for this resource.");
    }
    if (k === "pdf") {
      if (material.fileUrl) return `<div class="rv-doc" data-rv-pdf data-src="${esc(material.fileUrl)}">
          <div class="rv-doc-bar"><button type="button" data-p="prev" aria-label="Previous page"><i data-lucide="chevron-left"></i></button><span data-p="page">Loading…</span><button type="button" data-p="next" aria-label="Next page"><i data-lucide="chevron-right"></i></button>
          <button type="button" data-p="out" aria-label="Zoom out"><i data-lucide="zoom-out"></i></button><button type="button" data-p="in" aria-label="Zoom in"><i data-lucide="zoom-in"></i></button><button type="button" data-p="fs" aria-label="Fullscreen"><i data-lucide="maximize"></i></button></div>
          <div class="rv-doc-canvas"><canvas></canvas></div></div>`;
      return unavailable("PDF file not uploaded yet", "The creator hasn't uploaded the PDF for this resource, so there's nothing to open in the reader yet.") + outlineBlock();
    }
    if (k === "epub") {
      if (material.fileUrl) return `<div class="rv-doc" data-rv-epub data-src="${esc(material.fileUrl)}">
          <div class="rv-doc-bar"><button type="button" data-e="prev" aria-label="Previous page"><i data-lucide="chevron-left"></i></button><span data-e="loc">Loading…</span><button type="button" data-e="next" aria-label="Next page"><i data-lucide="chevron-right"></i></button><button type="button" data-e="fs" aria-label="Fullscreen"><i data-lucide="maximize"></i></button></div>
          <div class="rv-epub-view"></div></div>`;
      return unavailable("EPUB file not uploaded yet", "The creator hasn't uploaded the EPUB for this resource yet.") + outlineBlock();
    }
    if (k === "audio" && material.fileUrl) return `<audio controls preload="metadata" src="${esc(material.fileUrl)}" class="rv-audio"></audio>`;
    return unavailable("File not uploaded yet", "There's no file to open for this resource yet.") + outlineBlock();
  }

  function commentsBlock() {
    return `<aside class="rv-comments" id="rv-comments" aria-label="Comments">
      <header><h2>Comments</h2><b data-rv-comment-count>${state.counts.comments}</b></header>
      <div class="rv-comment-list" data-rv-comments aria-live="polite"><p class="rv-muted">Loading comments…</p></div>
      <form class="rv-comment-form" data-rv-comment-form><label for="rv-comment-input">Join the conversation</label>
        <textarea id="rv-comment-input" rows="3" maxlength="1000" placeholder="Share a thoughtful comment…" required></textarea>
        <div><span class="rv-muted" data-rv-comment-status>${state.viewer.signedIn ? "" : "Sign in to post a comment."}</span><button type="submit" class="rv-btn rv-btn-primary">Post</button></div></form></aside>`;
  }

  function render() {
    const root = document.getElementById("resource-detail") || document.getElementById("dedicated-reader");
    const { resource: r } = state; const k = kindOf(r);
    document.title = `${r.title}${page === "reader" ? " · Reader" : ""} | RhemaSphere`;
    const back = document.querySelector(".product-back-link, #reader-back");
    if (back) { back.href = page === "reader" ? detailHref(r) : "/resources"; back.innerHTML = `<i data-lucide="arrow-left"></i> ${page === "reader" ? "Back to resource" : "Back to Resources"}`; }
    const readerSection = `<section class="rv-reader rv-reader-${k}" id="rv-reader" aria-label="${esc(kindLabel[k])} reader">
        <header class="rv-reader-head"><h2><i data-lucide="${kindIcon[k]}"></i>${k === "video" ? "Watch" : "Read"}</h2>${page === "detail" && !state.locked ? `<a class="rv-link" href="${readerHref(r)}">Open full reader <i data-lucide="arrow-up-right"></i></a>` : ""}</header>
        <div class="rv-reader-grid ${k === "video" ? "with-rail" : ""}"><div class="rv-reader-main">${readerBlock()}</div>${k === "video" ? commentsBlock() : ""}</div>
      </section>${k === "video" ? "" : commentsBlock()}`;
    root.className = `rv-page rv-${page}`;
    root.innerHTML = page === "reader" ? `<header class="rv-reader-title"><p class="rv-kicker">${esc(kindLabel[k])}${r.duration ? " · " + esc(r.duration) : ""}</p><h1>${esc(r.title)}</h1>${engagementBar()}<p class="rv-status" id="rv-status" role="status" aria-live="polite" hidden></p></header>${readerSection}` : detailHero() + readerSection;
    icons(); bind(); loadComments(); startReaders();
  }

  async function loadComments() {
    const list = document.querySelector("[data-rv-comments]"); if (!list) return;
    const res = await call(`/api/resource-comments/${encodeURIComponent(state.resource.id)}`);
    if (!res.ok) { list.innerHTML = `<p class="rv-muted">Comments couldn't be loaded.</p>`; return; }
    const comments = res.data.comments || [];
    document.querySelectorAll("[data-rv-comment-count]").forEach(el => { el.textContent = comments.length; });
    list.innerHTML = comments.length ? comments.map(c => `<article><strong>${esc(c.name || "Member")}</strong><time>${esc(new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }))}</time><p>${esc(c.body)}</p></article>`).join("") : `<p class="rv-muted">No comments yet. Be the first to share.</p>`;
  }

  function needSignIn(what) { say(`Sign in to ${what}.`, true); }

  function bind() {
    const r = state.resource;
    document.querySelector("[data-rv-library]")?.addEventListener("click", async () => {
      if (!state.viewer.signedIn) return needSignIn(r.access === "Paid" ? "get this resource" : "add this to your library");
      if (state.viewer.inLibrary) return say("This resource is already in your library.");
      const res = await call(`/api/resources/${encodeURIComponent(r.id)}/library`, { method: "POST", body: JSON.stringify({ on: true }) });
      if (res.status === 401) return needSignIn("add this to your library");
      if (!res.ok) return say(res.data.error || "That didn't save. Please try again.");
      state.viewer.inLibrary = true; document.querySelector("[data-rv-library]").outerHTML = primaryButton(); icons(); say("Saved to your library.");
    });
    document.querySelector("[data-rv-bookmark]")?.addEventListener("click", async event => {
      if (!state.viewer.signedIn) return needSignIn("bookmark this");
      const on = !state.viewer.bookmarked;
      const res = await call(`/api/resources/${encodeURIComponent(r.id)}/bookmark`, { method: "POST", body: JSON.stringify({ on }) });
      if (res.status === 401) return needSignIn("bookmark this");
      if (!res.ok) return say(res.data.error || "That didn't save.");
      state.viewer.bookmarked = on; const b = event.currentTarget; b.setAttribute("aria-pressed", on); b.querySelector("span").textContent = on ? "Bookmarked" : "Bookmark"; say(on ? "Bookmarked." : "Bookmark removed.");
    });
    document.querySelector("[data-rv-like]")?.addEventListener("click", async event => {
      if (!state.viewer.signedIn) return needSignIn("like this");
      const b = event.currentTarget;
      const res = await call("/api/content-engagements", { method: "POST", body: JSON.stringify({ type: "resource", id: r.id }) });
      if (res.status === 401) return needSignIn("like this");
      if (!res.ok) return say("That didn't save.");
      state.viewer.liked = !!res.data.loved; b.setAttribute("aria-pressed", state.viewer.liked); b.querySelector("[data-rv-like-count]").textContent = res.data.count;
    });
    document.querySelector("[data-rv-share]")?.addEventListener("click", async () => {
      const url = new URL(detailHref(r), location.origin).toString();
      try { if (navigator.share) { await navigator.share({ title: r.title, url }); return; } await navigator.clipboard.writeText(url); say("Link copied."); } catch (e) { if (e?.name !== "AbortError") say(url); }
    });
    document.querySelector("[data-rv-comment-form]")?.addEventListener("submit", async event => {
      event.preventDefault();
      const input = document.getElementById("rv-comment-input"), status = document.querySelector("[data-rv-comment-status]");
      if (!state.viewer.signedIn) { status.textContent = "Sign in to post a comment."; return window.MWE?.openMemberLogin?.(location.pathname + location.search); }
      const res = await call(`/api/resource-comments/${encodeURIComponent(r.id)}`, { method: "POST", body: JSON.stringify({ body: input.value.trim() }) });
      if (res.status === 401) { status.textContent = "Sign in to post a comment."; return; }
      if (!res.ok) { status.textContent = res.data.error || "Your comment couldn't be posted."; return; }
      input.value = ""; status.textContent = "Posted."; loadComments();
    });
  }

  function fullscreen(el) { if (document.fullscreenElement) document.exitFullscreen?.(); else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el); }
  function loadScript(src) { return new Promise((ok, fail) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = fail; document.head.append(s); }); }

  function startReaders() {
    const player = document.querySelector("[data-rv-player]");
    if (player && player.querySelector("video")) {
      const v = player.querySelector("video"), $ = n => player.querySelector(`[data-v="${n}"]`), menu = player.querySelector(".rv-menu");
      const fmt = s => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";
      const setIcon = () => { $("play").innerHTML = `<i data-lucide="${v.paused ? "play" : "pause"}"></i>`; $("play").setAttribute("aria-label", v.paused ? "Play" : "Pause"); icons(); };
      $("play").onclick = () => v.paused ? v.play() : v.pause(); v.onplay = v.onpause = setIcon; v.onclick = () => $("play").click();
      v.ontimeupdate = () => { if (v.duration) $("seek").value = String(v.currentTime / v.duration * 1000); $("time").textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`; };
      $("seek").oninput = () => { if (v.duration) v.currentTime = $("seek").value / 1000 * v.duration; };
      $("cc").onclick = () => { const t = v.textTracks[0]; if (!t) return; t.mode = t.mode === "showing" ? "hidden" : "showing"; $("cc").setAttribute("aria-pressed", t.mode === "showing"); };
      const closeMenu = () => { menu.hidden = true; $("settings").setAttribute("aria-expanded", "false"); };
      $("settings").onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; $("settings").setAttribute("aria-expanded", String(!menu.hidden)); };
      menu.querySelectorAll("[data-speed]").forEach(b => b.onclick = () => { v.playbackRate = Number(b.dataset.speed); menu.querySelectorAll("[data-speed]").forEach(x => x.setAttribute("aria-checked", x === b)); closeMenu(); });
      document.addEventListener("click", e => { if (!menu.hidden && !menu.contains(e.target)) closeMenu(); });
      document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
      $("fs").onclick = () => fullscreen(player);
    }
    const pdf = document.querySelector("[data-rv-pdf]");
    if (pdf) (async () => {
      try {
        await loadScript("/vendor/readers/pdf.min.js");
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/readers/pdf.worker.min.js";
        const doc = await window.pdfjsLib.getDocument({ url: pdf.dataset.src }).promise;
        let n = 1, zoom = 1; const canvas = pdf.querySelector("canvas"), $ = k => pdf.querySelector(`[data-p="${k}"]`);
        const draw = async () => { const p = await doc.getPage(n); const width = pdf.querySelector(".rv-doc-canvas").clientWidth || 800; const base = p.getViewport({ scale: 1 }); const vp = p.getViewport({ scale: width / base.width * zoom * (window.devicePixelRatio || 1) }); canvas.width = vp.width; canvas.height = vp.height; canvas.style.width = (vp.width / (window.devicePixelRatio || 1)) + "px"; await p.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise; $("page").textContent = `Page ${n} of ${doc.numPages}`; };
        $("prev").onclick = () => { if (n > 1) { n--; draw(); } }; $("next").onclick = () => { if (n < doc.numPages) { n++; draw(); } };
        $("in").onclick = () => { zoom = Math.min(3, zoom + 0.25); draw(); }; $("out").onclick = () => { zoom = Math.max(0.5, zoom - 0.25); draw(); }; $("fs").onclick = () => fullscreen(pdf);
        draw();
      } catch { pdf.outerHTML = unavailable("This PDF couldn't be opened", "The file may have moved. Please try again later."); icons(); }
    })();
    const epub = document.querySelector("[data-rv-epub]");
    if (epub) (async () => {
      try {
        await loadScript("/vendor/readers/jszip.min.js"); await loadScript("/vendor/readers/epub.min.js");
        const book = window.ePub(epub.dataset.src); const rendition = book.renderTo(epub.querySelector(".rv-epub-view"), { width: "100%", height: "100%", spread: "auto" });
        await rendition.display(); const $ = k => epub.querySelector(`[data-e="${k}"]`);
        rendition.on("relocated", loc => { $("loc").textContent = loc?.start?.displayed ? `Page ${loc.start.displayed.page} of ${loc.start.displayed.total}` : ""; });
        $("prev").onclick = () => rendition.prev(); $("next").onclick = () => rendition.next(); $("fs").onclick = () => fullscreen(epub);
      } catch { epub.outerHTML = unavailable("This EPUB couldn't be opened", "The file may have moved. Please try again later."); icons(); }
    })();
  }

  async function start() {
    const root = document.getElementById("resource-detail") || document.getElementById("dedicated-reader");
    const key = resourceKey();
    root.innerHTML = `<p class="rv-muted rv-loading">Loading resource…</p>`;
    if (!key) { root.innerHTML = `<div class="module-empty"><i data-lucide="book-x"></i><strong>Choose a resource to open.</strong><a href="/resources">Browse Resources</a></div>`; icons(); return; }
    const res = await call(`/api/resources/${encodeURIComponent(key)}`);
    if (!res.ok) {
      root.innerHTML = res.status === 404
        ? `<div class="module-empty"><i data-lucide="book-x"></i><strong>This resource isn't available.</strong><p>It may have been unpublished.</p><a href="/resources">Return to Resources</a></div>`
        : `<div class="module-empty"><i data-lucide="wifi-off"></i><strong>Couldn't load this resource.</strong><button type="button" class="rv-btn" onclick="location.reload()">Try again</button></div>`;
      icons(); return;
    }
    state = res.data; render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
