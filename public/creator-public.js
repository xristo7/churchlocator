(function () {
  const esc = value => window.MWE.escapeHtml(value);
  const safe = value => window.MWECreator.safeLiveUrl(value);
  const broadcastLink = (type, id) => "broadcast.html?type=" + encodeURIComponent(type) + "&id=" + encodeURIComponent(id);
  function image(url, alt) { return safe(url) ? '<img src="' + esc(url) + '" alt="' + esc(alt) + '" loading="lazy">' : ""; }
  function liveDirectory() {
    const target = document.getElementById("active-streams-list");
    if (!target || new URLSearchParams(location.search).has("id")) return;
    const streams = window.MWECreator.broadcasts();
    target.innerHTML = "";
    target.style.display = streams.length ? "grid" : "none";
    streams.forEach(stream => {
      const card = document.createElement("a");
      card.className = "creator-store-card";
      card.href = broadcastLink(stream.type, stream.id);
      card.innerHTML = image(stream.image, stream.name) + '<div><span class="badge live">LIVE · ' + esc(stream.type) + '</span><h3>' + esc(stream.name) + '</h3><p>' + esc(stream.description || "") + '</p><small>Watch broadcast →</small></div>';
      target.append(card);
    });
    const empty = document.getElementById("streams-empty-state");
    if (empty) {
      empty.style.display = streams.length ? "none" : "block";
      empty.querySelector("p").textContent = "No churches, channels or stores have an active broadcast link right now.";
    }
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
    const stream = window.MWECreator.broadcasts().find(s => s.id === id && s.type === params.get("type"));
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
    target.innerHTML = '<a href="livestream.html">← All live broadcasts</a><h1>' + esc(stream.name) + '</h1><p>Live ' + esc(stream.type) + ' broadcast · Hosted by an external provider</p>' +
      (embed ? '<iframe class="creator-live-player" title="' + esc(stream.name) + ' broadcast" src="' + esc(embed) + '" allow="encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>' : '<p>This provider opens in a separate tab.</p>') +
      '<div class="creator-store-actions"><a class="button primary" target="_blank" rel="noopener noreferrer" href="' + esc(url.href) + '">Open broadcast provider</a>' + (stream.type === "store" ? '<a class="button ghost" href="storefront.html?id=' + encodeURIComponent(stream.id) + '">Shop this store</a>' : "") + '</div>';
  }
  document.addEventListener("DOMContentLoaded", () => {
    liveDirectory();
    publicPage();
    if (document.body.dataset.page === "store") {
      const destination = document.querySelector(".module-shell");
      if (destination) {
        const section = document.createElement("section");
        section.className = "creator-stores-section";
        section.innerHTML = '<h2>Community stores</h2><p>Explore independent stores and live shopping.</p>' + renderStores() + '<a href="creator-workspace.html#store" target="_top">Create your own store →</a>';
        destination.append(section);
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
