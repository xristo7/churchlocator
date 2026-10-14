(function () {
  const esc = value => window.MWE.escapeHtml(value);
  const safe = value => window.MWECreator.safeLiveUrl(value);
  const broadcastLink = (type, id) => type==='channel'?'channel-live.html?id='+encodeURIComponent(id):"broadcast.html?type=" + encodeURIComponent(type || "church") + "&id=" + encodeURIComponent(id);
  function image(url, alt) { return safe(url) ? '<img src="' + esc(url) + '" alt="' + esc(alt) + '" loading="lazy">' : ""; }
  function thumbnail(stream) {
    const liveUrl = safe(stream.url);
    if (liveUrl) {
      const url = new URL(liveUrl);
      const host = url.hostname.replace(/^www\./, "");
      const youtubeId = host === "youtu.be"
        ? url.pathname.slice(1)
        : ["youtube.com", "youtube-nocookie.com"].includes(host)
          ? (url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|live)\/([^/]+)/)?.[1])
          : "";
      if (/^[\w-]{11}$/.test(youtubeId || "")) return "https://i.ytimg.com/vi/" + youtubeId + "/hqdefault.jpg";
    }
    return safe(stream.image) || window.MWE.defaultImage;
  }
  function liveAvatar(stream, cls) {
    const church = stream.type === "church" ? (window.MWE.getChurches?.() || []).find(c => c.id === stream.id) : null;
    const img = safe(church?.logo || church?.logo_url || church?.avatar || "");
    const initials = String(stream.name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
    return '<span class="mwe-live-avatar ' + (cls || "") + '">' + (img ? '<img src="' + esc(img) + '" alt="">' : esc(initials)) + '</span>';
  }
  function offlineFrame() {
    return '<div class="mwe-offline-frame" role="status"><i data-lucide="video-off"></i><span>Offline</span></div>';
  }
  window.MWELiveUI = Object.assign(window.MWELiveUI || {}, { offlineFrame });
  function liveDirectory() {
    const target = document.getElementById("active-streams-list");
    if (!target || new URLSearchParams(location.search).has("id")) return;
    const streams = window.MWECreator.broadcasts();
    target.innerHTML = "";
    target.style.display = streams.length ? "grid" : "none";
    streams.forEach(stream => {
      const card = document.createElement("a");
      card.className = "mwe-yt-card";
      card.href = broadcastLink(stream.type, stream.id);
      card.setAttribute("aria-label", "Watch " + stream.name);
      card.innerHTML = '<span class="mwe-yt-thumb"><img src="' + esc(thumbnail(stream)) + '" alt="" loading="lazy"><span class="mwe-live-badge"><span></span>LIVE</span><span class="mwe-yt-play"><i data-lucide="play"></i></span></span>' +
        '<span class="mwe-yt-meta">' + liveAvatar(stream) + '<span><b class="mwe-yt-title">' + esc(stream.name) + '</b><small>Live service</small><small>' + esc(stream.description || (stream.type + " broadcast")) + '</small></span></span>';
      target.append(card);
    });
    const empty = document.getElementById("streams-empty-state");
    if (empty) {
      empty.style.display = streams.length ? "none" : "block";
      empty.querySelector("p").textContent = "No churches, channels or stores have an active broadcast link right now.";
    }
    window.lucide?.createIcons();
  }
  function renderStores() {
    const stores = window.MWECreator.getStores();
    const grid = '<div class="creator-store-cards">' + stores.map(store => '<a class="creator-store-card" href="storefront.html?id=' + encodeURIComponent(store.id) + '">' + image(store.image, store.name) + '<div><h3>' + esc(store.name) + '</h3><p>' + esc(store.category) + '</p><small>' + (store.live ? "● Live shopping" : "Visit store →") + '</small></div></a>').join("") + '</div>';
    return grid;
  }
  async function publicPage() {
    const target = document.getElementById("creator-public");
    if (!target) return;
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if (document.body.dataset.page === "storefront") {
      const store = window.MWECreator.getStores().find(s => s.id === id);
      if (!store) { target.innerHTML = '<h1>Store not found</h1><a href="store.html">Return to store directory</a>'; return; }
      document.title = store.name + " | My Way Store";
      const products = window.FaithLinkModules.getProducts().filter(p => p.storeId === id && p.status === "Active");
      target.classList.add("sf-storefront");
      const cartCount = (window.FaithLinkModules.getCart?.() || []).reduce((n, i) => n + (Number(i.quantity) || 0), 0);
      const card = p => '<a class="sf-store-card" href="product-detail.html?id=' + encodeURIComponent(p.id) + '"><div class="sf-store-card-media">' + image(p.image, p.title) + '</div><div class="sf-store-card-body"><h3>' + esc(p.title) + '</h3><p>' + esc(window.FaithLinkModules.money(p.price)) + (p.compareAt > p.price ? ' <del style="color:var(--sf-muted);font-weight:600;font-size:.85em">' + esc(window.FaithLinkModules.money(p.compareAt)) + '</del>' : '') + '</p></div></a>';
      const goods = products.filter(p => p.itemType !== "service"), services = products.filter(p => p.itemType === "service");
      target.innerHTML = '<header class="sf-store-header"><div class="sf-store-banner">' + image(store.image, "") + '</div><div class="sf-store-header-inner"><div class="sf-store-brand">' + image(store.image, store.name).replace("<img", '<img class="sf-store-logo"') + '<div><h1>' + esc(store.name) + '</h1><p>' + esc(store.description || store.category || "") + '</p></div></div><nav class="sf-store-nav" aria-label="Store"><a href="store.html"><i data-lucide="layout-grid"></i> All stores</a>' + (store.live && safe(store.liveUrl) ? '<a href="' + broadcastLink("store", store.id) + '"><i data-lucide="radio"></i> Live shopping</a>' : "") + '<a class="primary" href="cart.html"><i data-lucide="shopping-bag"></i> Cart (' + cartCount + ')</a></nav></div></header><div class="sf-store-body">' + (goods.length ? '<h2>Products</h2><div class="sf-store-grid">' + goods.map(card).join("") + '</div>' : "") + (services.length ? '<h2 style="margin-top:32px">Services</h2><div class="sf-store-grid">' + services.map(card).join("") + '</div>' : "") + (!products.length ? '<div class="sf-store-empty">No published products yet.</div>' : "") + '</div>';
      window.lucide?.createIcons();
      return;
    }
    const requestedType = params.get("type");
    if(requestedType==='channel'){location.replace('channel-live.html?id='+encodeURIComponent(id||''));return;}
    const stream = window.MWECreator.broadcasts().find(s => s.id === id && (!requestedType || s.type === requestedType));
    if (!stream) { target.classList.add("mwe-watch-page"); target.innerHTML = '<a class="broadcast-back-link" href="livestream.html"><i data-lucide="arrow-left"></i> All live broadcasts</a><div class="mwe-watch"><div class="mwe-watch-main"><div class="mwe-player-frame">' + offlineFrame() + '</div></div></div>'; window.lucide?.createIcons(); return; }
    if(stream.type==='channel'){location.replace('channel-live.html?id='+encodeURIComponent(stream.id));return;}
    document.title = stream.name + " · Live | My Way";
    const url = new URL(safe(stream.url));
    let embed = "";
    const host = url.hostname.replace(/^www\./, "");
    const youtubeId = host === "youtu.be" ? url.pathname.slice(1) : ["youtube.com", "youtube-nocookie.com"].includes(host) ? (url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|live)\/([^/]+)/)?.[1]) : "";
    if (/^[\w-]{11}$/.test(youtubeId || "")) embed = "https://www.youtube-nocookie.com/embed/" + youtubeId;
    if (["vimeo.com", "player.vimeo.com"].includes(host)) {
      const vimeoId = url.pathname.match(/(?:\/video)?\/(\d+)$/)?.[1];
      if (vimeoId) embed = "https://player.vimeo.com/video/" + vimeoId;
    }
    const description = stream.description || ("Live " + stream.type + " broadcast");
    const profile = stream.type === "church"
      ? { url: "church-profile.html?id=" + encodeURIComponent(stream.id), icon: "church", label: "Visit church" }
      : stream.type === "store"
        ? { url: "storefront.html?id=" + encodeURIComponent(stream.id), icon: "shopping-bag", label: "Shop this store" }
        : { url: "channel-detail.html?id=" + encodeURIComponent(stream.id), icon: "radio", label: "Visit channel" };
    const profileAction = '<a class="button primary" href="' + profile.url + '"><i data-lucide="' + profile.icon + '"></i> ' + profile.label + '</a>';
    const player = embed
      ? '<iframe class="creator-live-player" title="' + esc(stream.name) + ' broadcast" src="' + esc(embed) + '" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>'
      : '<div class="broadcast-player-fallback" style="background-image:url(&quot;' + esc(thumbnail(stream)) + '&quot;)"><span aria-hidden="true"></span><a href="' + profile.url + '"><i data-lucide="' + profile.icon + '"></i><b>' + profile.label + '</b></a></div>';
    const church = stream.type === "church" ? (window.MWE.getChurches?.() || []).find(c => c.id === stream.id) : null;
    const verified = church && (church.verified || church.is_verified || church.claimed);
    // Previous streams of THIS church only. No archive of past broadcasts exists yet, so show a clean empty state.
    const previous = Array.isArray(stream.previousStreams) ? stream.previousStreams : [];
    const upNext = previous.length ? previous.map(r => '<button type="button" class="mwe-upnext-item" data-replay="' + esc(r.url) + '"><span class="mwe-upnext-thumb"><img src="' + esc(r.poster || thumbnail(stream)) + '" alt="" loading="lazy">' + (r.duration ? '<span class="mwe-dur">' + esc(r.duration) + '</span>' : '') + '</span><span class="mwe-upnext-copy"><b>' + esc(r.title) + '</b><small>' + esc(r.date || "") + '</small></span></button>').join("") : '<div class="mwe-prev-empty"><i data-lucide="history"></i><b>No previous streams yet</b></div>';
    target.classList.add("mwe-watch-page");
    target.innerHTML = '<a class="broadcast-back-link" href="livestream.html"><i data-lucide="arrow-left"></i> All live broadcasts</a>' +
      '<div class="mwe-watch broadcast-watch-layout"><section class="mwe-watch-main broadcast-main-column"><div class="mwe-player-frame broadcast-player-shell">' + player + '<button class="broadcast-share-overlay" type="button" id="broadcast-share-hidden" hidden aria-hidden="true"></button></div>' +
      '<div class="mwe-watch-info"><h1 class="mwe-watch-title">' + esc(stream.name) + ' · Live service</h1>' +
      '<div class="mwe-watch-stats"><span class="mwe-live-badge"><span></span>LIVE</span>' + (stream.viewers ? '<span>' + esc(stream.viewers) + ' watching</span>' : '<span>Streaming now</span>') + '</div>' +
      '<div class="mwe-channel-row">' + liveAvatar(stream, "lg") + '<div class="mwe-channel-name"><b>' + esc(stream.name) + (verified ? ' <i data-lucide="badge-check" class="mwe-verified" aria-label="Verified"></i>' : '') + '</b><small>' + esc(stream.description || "") + '</small></div>' +
      '<a class="mwe-follow-btn" href="' + profile.url + '"><i data-lucide="' + profile.icon + '"></i> ' + profile.label + '</a></div>' +
      '<div class="mwe-chip-row"><button class="mwe-chip" type="button" id="broadcast-share"><i data-lucide="share-2"></i> Share</button>' +
      '<button class="mwe-chip content-love-button content-love-detail" type="button" data-love-type="livestream" data-love-id="' + esc(stream.type + ':' + stream.id) + '" aria-pressed="false"><i data-lucide="heart"></i> Save <span data-love-count>0</span></button>' +
      '</div>' +
      '<details class="mwe-desc-card"><summary><b>About this broadcast</b><span class="mwe-desc-more">Show more</span></summary><p>' + esc(church?.about || description) + '</p>' + (church?.pastor_name || church?.pastorName ? '<p><small>' + esc(church.pastor_name || church.pastorName) + '</small></p>' : '') + '</details></div></section>' +
      '<div class="mwe-watch-side"><div class="mwe-side-tabs" role="tablist"><button type="button" role="tab" aria-selected="true" data-side-tab="chat">Chat</button><button type="button" role="tab" aria-selected="false" data-side-tab="next">Previous</button></div>' +
      '<aside class="mwe-chat broadcast-chat" data-side-panel="chat" aria-label="Livestream chat"><header><div><span class="broadcast-live-dot"></span><strong>Live chat</strong></div><small>Top messages</small></header>' +
      '<div class="broadcast-chat-messages" id="broadcast-chat-messages" aria-live="polite"><p class="broadcast-chat-status" data-chat-status>Loading live conversation…</p></div>' +
      '<form class="broadcast-chat-form" id="broadcast-chat-form"><label class="sr-only" for="broadcast-chat-input">Chat message</label><input id="broadcast-chat-input" maxlength="300" required placeholder="Chat…"><button type="submit" aria-label="Send message"><i data-lucide="send"></i></button></form></aside>' +
      '<section class="mwe-upnext" data-side-panel="next" aria-label="Previous streams"><h2>Previous streams</h2>' + upNext + '</section></div></div>';
    target.querySelectorAll("[data-side-tab]").forEach(tab => tab.addEventListener("click", () => {
      target.querySelectorAll("[data-side-tab]").forEach(t => t.setAttribute("aria-selected", String(t === tab)));
      target.querySelector(".mwe-watch-side").dataset.active = tab.dataset.sideTab;
    }));
    target.querySelectorAll("[data-replay]").forEach(btn => btn.addEventListener("click", async () => { const surface = target.querySelector(".broadcast-video-surface"); if (surface && window.MWELivePlayer) { await window.MWELivePlayer.mount(surface, btn.dataset.replay, stream.name); surface.scrollIntoView({ behavior: "smooth", block: "start" }); } }));
    target.querySelector(".mwe-desc-card")?.addEventListener("toggle", e => { const m = e.currentTarget.querySelector(".mwe-desc-more"); if (m) m.textContent = e.currentTarget.open ? "Show less" : "Show more"; });
    const chatForm = target.querySelector("#broadcast-chat-form");
    if(window.MWELivePlayer){const shell=target.querySelector('.broadcast-player-shell');const overlay=shell.querySelector('button');const surface=document.createElement('div');surface.className='broadcast-video-surface';shell.replaceChildren(surface,overlay);const cleanup=await window.MWELivePlayer.mount(surface,stream.url,stream.name);window.addEventListener('pagehide',cleanup,{once:true});}
    window.MWELivestreamChat?.mount({
      streamType: stream.type,
      entityId: stream.id,
      messages: target.querySelector("#broadcast-chat-messages"),
      form: chatForm,
      input: target.querySelector("#broadcast-chat-input")
    });
    target.querySelector("#broadcast-share")?.addEventListener("click", async () => {
      try {
        if (navigator.share) await navigator.share({ title: document.title, url: location.href });
        else {
          await navigator.clipboard.writeText(location.href);
          window.MWE.showToast?.("Livestream link copied");
        }
      } catch (error) {
        if (error?.name !== "AbortError") window.MWE.showToast?.("Unable to share this livestream");
      }
    });
    window.lucide?.createIcons();
  }
  document.addEventListener("DOMContentLoaded", async () => {
  await window.MWEPlatform?.ready;
    liveDirectory();
    publicPage();
    if (document.body.dataset.page === "store") {
      const destination = document.querySelector(".module-content");
      if (destination) {
        const section = document.createElement("section");
        section.className = "creator-stores-section";
        section.innerHTML = '<h2>Community stores</h2><p>Explore independent stores and live shopping.</p>' + renderStores();
        destination.querySelector(".module-results-head")?.before(section);
      }
    }
    if (document.body.dataset.page === "channel-detail") {
      const id = new URLSearchParams(location.search).get("id");
      const channel = window.FaithLinkModules.getChannels().find(c => c.id === id);
      if (channel?.live && safe(channel.liveUrl)) {
        const a = document.createElement("a");
        a.className = "button primary";
        a.href = broadcastLink("channel", id);
        a.textContent = "Watch live";
        document.getElementById("channel-detail")?.prepend(a);
      }
    }
  });
  window.addEventListener("storage", () => { liveDirectory(); publicPage(); });
})();
