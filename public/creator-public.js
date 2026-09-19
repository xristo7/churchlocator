(function () {
  const esc = value => window.MWE.escapeHtml(value);
  const safe = value => window.MWECreator.safeLiveUrl(value);
  const broadcastLink = (type, id) => "broadcast.html?type=" + encodeURIComponent(type || "church") + "&id=" + encodeURIComponent(id);
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
  function liveDirectory() {
    const target = document.getElementById("active-streams-list");
    if (!target || new URLSearchParams(location.search).has("id")) return;
    const streams = window.MWECreator.broadcasts();
    target.innerHTML = "";
    target.style.display = streams.length ? "grid" : "none";
    streams.forEach(stream => {
      const card = document.createElement("a");
      card.className = "livestream-showcase-card";
      card.href = broadcastLink(stream.type, stream.id);
      card.style.backgroundImage = 'url("' + esc(thumbnail(stream)) + '")';
      card.setAttribute("aria-label", "Play " + stream.name);
      card.innerHTML = '<span class="livestream-showcase-shade" aria-hidden="true"></span>' +
        '<span class="livestream-showcase-badge"><span class="livestream-showcase-badge-dot"></span> LIVE</span>' +
        '<div class="livestream-showcase-copy"><h3>' + esc(stream.name) + '</h3><p><i data-lucide="map-pin"></i> ' + esc(stream.description || "Live broadcast") + '</p></div>' +
        '<span class="livestream-showcase-play"><i data-lucide="play"></i><b>Play</b></span>';
      card.querySelectorAll?.(".content-love-button, .content-love-overlay, [data-love-type]")?.forEach(el => el.remove());
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
  function publicPage() {
    const target = document.getElementById("creator-public");
    if (!target) return;
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if (document.body.dataset.page === "storefront") {
      const store = window.MWECreator.getStores().find(s => s.id === id);
      if (!store) { target.innerHTML = '<h1>Store not found</h1><a href="store.html">Return to store directory</a>'; return; }
      document.title = store.name + " | My Way Store";
      const products = window.FaithLinkModules.getProducts().filter(p => p.storeId === id && p.status === "Active");
      target.innerHTML = '<a href="store.html">← All stores</a><h1>' + esc(store.name) + '</h1><p>' + esc(store.description) + '</p><div class="creator-store-actions">' + (store.live && safe(store.liveUrl) ? '<a class="button primary" href="' + broadcastLink("store", store.id) + '">Watch live shopping</a>' : "") + '</div><h2>Products</h2>' + (products.length ? '<div class="creator-store-cards">' + products.map(p => '<a class="creator-store-card" href="product-detail.html?id=' + encodeURIComponent(p.id) + '">' + image(p.image, p.title) + '<div><h3>' + esc(p.title) + '</h3><p>' + esc(window.FaithLinkModules.money(p.price)) + '</p></div></a>').join("") + '</div>' : '<p>No published products yet.</p>');
      return;
    }
    const requestedType = params.get("type");
    const stream = window.MWECreator.broadcasts().find(s => s.id === id && (!requestedType || s.type === requestedType));
    if (!stream) { target.innerHTML = '<h1>This broadcast is offline</h1><p>The creator may have ended their broadcast.</p><a href="livestream.html">Explore live broadcasts</a>'; return; }
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
    target.innerHTML = '<a class="broadcast-back-link" href="livestream.html"><i data-lucide="arrow-left"></i> All live broadcasts</a>' +
      '<div class="broadcast-watch-layout"><section class="broadcast-main-column"><div class="broadcast-player-shell">' + player + '<button class="broadcast-share-overlay" type="button" id="broadcast-share" aria-label="Share this livestream"><i data-lucide="share-2"></i><span>Share</span></button></div>' +
      '<div class="broadcast-details"><div><span class="broadcast-live-label"><i data-lucide="radio"></i> Live now</span><h1>' + esc(stream.name) + '</h1><p>' + esc(description) + '</p></div><button class="content-love-button content-love-detail" type="button" data-love-type="livestream" data-love-id="' + esc(stream.type + ':' + stream.id) + '" aria-pressed="false"><i data-lucide="heart"></i><span data-love-count>0</span></button>' +
      (embed ? '<div class="creator-store-actions">' + profileAction + '</div>' : '') + '</div></section>' +
      '<aside class="broadcast-chat" aria-label="Livestream chat"><header><div><span class="broadcast-live-dot"></span><strong>Live chat</strong></div><small>Live community conversation</small></header>' +
      '<div class="broadcast-chat-messages" id="broadcast-chat-messages" aria-live="polite"><p class="broadcast-chat-status" data-chat-status>Loading live conversation…</p></div>' +
      '<form class="broadcast-chat-form" id="broadcast-chat-form"><label class="sr-only" for="broadcast-chat-input">Chat message</label><input id="broadcast-chat-input" maxlength="300" required placeholder="Write a message…"><button type="submit" aria-label="Send message"><i data-lucide="send"></i></button></form></aside></div>';
    const chatForm = target.querySelector("#broadcast-chat-form");
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
