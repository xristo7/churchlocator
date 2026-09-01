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
    if (!container) return;
    const channels = data().getChannels().slice(0, 3);
    container.innerHTML = channels.map(c => {
      return '<article class="channel-card">' +
        '<div class="channel-card-cover"><img src="' + c.cover + '" alt="' + c.name + '" /></div>' +
        '<div class="channel-card-avatar"><img src="' + c.avatar + '" alt="' + c.owner + '" /></div>' +
        '<div class="channel-card-body">' +
          '<h3><a href="channel-detail.html?id=' + c.id + '">' + c.name + '</a></h3>' +
          '<p class="channel-handle">' + c.handle + ' · ' + c.topic + '</p>' +
          '<p class="channel-desc">' + c.description + '</p>' +
          '<div class="channel-stats-row"><span>' + c.followers.toLocaleString() + ' followers</span><span>' + c.items + ' episodes</span></div>' +
          '<a class="channel-view-btn" href="channel-detail.html?id=' + c.id + '">View Channel</a>' +
        '</div>' +
      '</article>';
    }).join("");
  }

  function renderResources() {
    const container = document.getElementById("member-resources-grid");
    if (!container) return;
    const resources = data().getResources().slice(0, 3);
    container.innerHTML = resources.map(r => {
      return '<article class="resource-card">' +
        '<div class="resource-cover"><img src="' + r.image + '" alt="' + r.title + '" /></div>' +
        '<div class="resource-card-body">' +
          '<span class="resource-format">' + r.topic + ' · ' + r.format + '</span>' +
          '<h3><a href="resource-detail.html?id=' + r.id + '">' + r.title + '</a></h3>' +
          '<p>' + r.description + '</p>' +
          '<div class="resource-meta"><span>' + r.duration + '</span> · <strong>' + (r.access === "Free" ? "Free" : data().money(r.price)) + '</strong></div>' +
        '</div>' +
      '</article>';
    }).join("");
  }

  function renderStore() {
    const container = document.getElementById("member-store-grid");
    if (!container) return;
    const products = data().getProducts().slice(0, 3);
    container.innerHTML = products.map(p => {
      return '<div class="store-card">' +
        '<div class="store-card-image"><img src="' + p.image + '" alt="' + p.title + '" /></div>' +
        '<div class="store-card-body">' +
          '<span class="store-card-category">' + p.category + '</span>' +
          '<h3><a href="product-detail.html?id=' + p.id + '">' + p.title + '</a></h3>' +
          '<div class="store-card-price"><strong>' + data().money(p.price) + '</strong></div>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
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
