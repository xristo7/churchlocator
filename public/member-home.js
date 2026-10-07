(function initMemberHome() {
  const data = () => window.MyWayModules || window.FaithLinkModules;

  function renderStreams() {
    const container = document.getElementById("member-streams-grid");
    if (!container) return;
    const streams = [
      { id: "stream-1", church: "Christ Embassy Edmonton", title: "Sunday Live Communion & Word Service", viewers: 1420, live: true, image: "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=700&q=80" },
      { id: "stream-2", church: "The Worship Room", title: "Global Acoustic Praise & Intercession", viewers: 890, live: true, image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=700&q=80" },
      { id: "stream-3", church: "River City Church", title: "Kingdom Faith & Family Morning Broadcast", viewers: 640, live: false, time: "Starts Sunday 10:00 AM", image: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=700&q=80" }
    ];

    container.innerHTML = streams.map(s => {
      const badge = s.live ? '<span class="live-pill"><span class="pulse-dot"></span> LIVE</span>' : '<span class="upcoming-pill">' + s.time + '</span>';
      return '<div class="stream-card-v2">' +
        '<div class="stream-card-thumb">' +
          '<img src="' + s.image + '" alt="' + s.church + '" />' +
          badge +
          '<span class="viewer-count"><i data-lucide="eye"></i> ' + s.viewers + ' watching</span>' +
        '</div>' +
        '<div class="stream-card-body">' +
          '<strong>' + s.title + '</strong>' +
          '<span>' + s.church + '</span>' +
          '<a href="livestream.html" class="stream-join-btn" data-navigate-view="livestream"><i data-lucide="radio"></i> Watch Stream</a>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  function renderChannels() {
    const container = document.getElementById("member-channels-grid");
    if (!container || !data()) return;
    const channels = data().getChannels().slice(0, 3);
    container.innerHTML = channels.map(c => {
      const icon = c.format === "Podcast" ? "mic-2" : c.format === "Livestream" ? "radio" : "play-square";
      const followers = Number(c.followers) >= 1000 ? (Number(c.followers) / 1000).toFixed(1) + 'K' : Number(c.followers);
      const itemsLabel = c.format === "Podcast" ? "Episodes" : "Posts";

      return '<article class="channel-profile-card">' +
        '<a class="channel-profile-cover" href="channel-detail.html?id=' + encodeURIComponent(c.id) + '" aria-label="Open ' + data().escapeHtml(c.name) + '">' +
          '<img src="' + data().escapeHtml(c.cover) + '" alt="' + data().escapeHtml(c.name) + ' cover" />' +
          '<span class="channel-format"><i data-lucide="' + icon + '"></i>' + data().escapeHtml(c.format) + '</span>' +
          (c.live ? '<span class="channel-live"><i data-lucide="radio"></i> Live</span>' : '') +
          '<img class="channel-profile-avatar" src="' + data().escapeHtml(c.avatar) + '" alt="' + data().escapeHtml(c.owner) + '" />' +
        '</a>' +
        '<div class="channel-profile-body">' +
          '<div class="channel-profile-identity">' +
            '<div>' +
              '<h3><a href="channel-detail.html?id=' + encodeURIComponent(c.id) + '">' + data().escapeHtml(c.name) + '</a>' + (c.verified ? '<i data-lucide="badge-check" aria-label="Verified"></i>' : '') + '</h3>' +
              '<span>' + data().escapeHtml(c.owner) + ' · ' + data().escapeHtml(c.topic) + '</span>' +
            '</div>' +
            '<span class="channel-online"><i></i>' + (c.live ? "Live now" : "Active") + '</span>' +
          '</div>' +
          '<p>' + data().escapeHtml(c.description) + '</p>' +
          '<div class="channel-platform-stats">' +
            '<span><strong>' + followers + '</strong><small>Followers</small></span>' +
            '<span><strong>' + Number(c.items).toLocaleString() + '</strong><small>' + itemsLabel + '</small></span>' +
            '<span><strong>' + (c.verified ? "4.9" : "4.7") + '</strong><small>Rating</small></span>' +
          '</div>' +
          '<a class="channel-contact-button" href="messages.html?compose=channel&id=' + encodeURIComponent(c.id) + '"><i data-lucide="message-circle"></i> Connect with ' + data().escapeHtml(c.owner.split(' ')[0]) + '</a>' +
        '</div>' +
      '</article>';
    }).join("");
  }

  function renderResources() {
    const container = document.getElementById("member-resources-grid");
    if (!container || !data()) return;
    const resources = data().getResources().slice(0, 3);
    container.innerHTML = resources.map((r, index) => {
      const icon = r.type === "Video" ? "video" : r.type === "Audio" ? "headphones" : "file-text";
      const priceTag = r.access === "Free" ? "Free" : data().money(r.price);

      return '<article class="resource-card editorial-card tone-' + (index % 6) + '">' +
        '<a class="resource-cover" href="resource-detail.html?id=' + encodeURIComponent(r.id) + '" aria-label="View ' + data().escapeHtml(r.title) + '">' +
          '<img class="resource-image" src="' + data().escapeHtml(r.image) + '" alt="" />' +
          '<span class="resource-cover-icon"><i data-lucide="' + icon + '"></i></span>' +
          '<span class="resource-type-label">' + data().escapeHtml(r.format) + '</span>' +
        '</a>' +
        '<div class="resource-card-body">' +
          '<div class="resource-identity">' +
            '<span class="resource-topic">' + data().escapeHtml(r.topic) + '</span>' +
            '<h3><a href="resource-detail.html?id=' + encodeURIComponent(r.id) + '">' + data().escapeHtml(r.title) + '</a></h3>' +
            '<span class="resource-creator">By ' + data().escapeHtml(r.creator) + '</span>' +
          '</div>' +
          '<p class="resource-desc">' + data().escapeHtml(r.description) + '</p>' +
          '<div class="resource-card-footer">' +
            '<span class="resource-duration"><i data-lucide="clock"></i> ' + data().escapeHtml(r.duration) + '</span>' +
            '<strong class="resource-price-badge">' + priceTag + '</strong>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join("");
  }

  function renderStore() {
    const container = document.getElementById("member-store-grid");
    if (!container || !data()) return;
    const products = data().getProducts().slice(0, 3);
    container.innerHTML = products.map(p => {
      return '<article class="store-product-card product-card">' +
        '<a class="product-image-wrap" href="product-detail.html?id=' + encodeURIComponent(p.id) + '" aria-label="View ' + data().escapeHtml(p.title) + '">' +
          '<img class="product-image" src="' + data().escapeHtml(p.image) + '" alt="' + data().escapeHtml(p.title) + '" />' +
          '<span class="product-badge">' + data().escapeHtml(p.sellerType) + ' · ' + data().escapeHtml(p.category) + '</span>' +
        '</a>' +
        '<div class="product-card-body">' +
          '<span class="product-seller">Sold by ' + data().escapeHtml(p.seller) + '</span>' +
          '<h3><a href="product-detail.html?id=' + encodeURIComponent(p.id) + '">' + data().escapeHtml(p.title) + '</a></h3>' +
          '<span class="product-rating"><i data-lucide="star"></i>' + Number(p.rating).toFixed(1) + ' · ' + Number(p.inventory) + ' in stock</span>' +
          '<div class="product-price-row">' +
            '<div><span class="product-price">' + data().money(p.price) + '</span>' + (p.compareAt ? '<span class="product-compare">' + data().money(p.compareAt) + '</span>' : '') + '</div>' +
            '<a class="button ghost sm" href="product-detail.html?id=' + encodeURIComponent(p.id) + '">Details</a>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", async () => {
  await window.MWEPlatform?.ready;
    renderStreams();
    renderChannels();
    renderResources();
    renderStore();
    window.lucide?.createIcons();

    document.addEventListener("click", e => {
      const link = e.target.closest("[data-navigate-view]");
      if (!link) return;
      e.preventDefault();
      const view = link.dataset.navigateView;
      window.parent?.postMessage({ type: "faithlink:navigate", view: view }, window.location.origin);
      window.parent?.postMessage({ type: "myway:navigate", view: view }, window.location.origin);
    });
  });
})();
