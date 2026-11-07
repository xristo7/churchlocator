/* RhemaSphere archive cards for Home. room() is the meditation.html renderer itself; product/resource/live mirror store.js, resources.js and creator-public.js markup verbatim (those stay inline because the source tests assert their markup) — keep them in sync. */
(function (root) {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = name => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const money = v => (root.FaithLinkModules?.money ? root.FaithLinkModules.money(v) : '$' + Number(v || 0).toFixed(2));

  /* Store archive (store.html) product card. */
  function product(product, opts = {}) {
    const isService = product.itemType === 'service';
    const href = `product-detail.html?id=${encodeURIComponent(product.id)}`;
    const sale = product.compareAt > product.price;
    const add = opts.linkActions
      ? `<a class="sf-circle-btn" href="${href}" aria-label="${isService ? 'Book' : 'View'} ${esc(product.title)}"><i data-lucide="${isService ? 'calendar-check' : 'plus'}"></i></a>`
      : isService ? `<a class="sf-circle-btn" href="${href}" aria-label="Book ${esc(product.title)}"><i data-lucide="calendar-check"></i></a>` : `<button class="sf-circle-btn" type="button" data-add-product="${esc(product.id)}" aria-label="Add ${esc(product.title)} to cart"><i data-lucide="plus"></i></button>`;
    return `<article class="sf-card">
        <a class="sf-card-media" href="${href}" aria-label="${esc(product.title)}"><img src="${esc(product.image)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('is-broken')" />${sale ? `<span class="sf-badge sf-badge-sale">Sale</span>` : isService ? `<span class="sf-badge">Service</span>` : ""}</a>
        <button class="content-love-button sf-card-like" type="button" data-love-type="product" data-love-id="${esc(product.id)}" aria-pressed="false" aria-label="Save ${esc(product.title)}"><i data-lucide="heart"></i><span data-love-count hidden>0</span></button>
        <div class="sf-card-body">
          <span class="sf-vendor">${esc(product.seller)}</span>
          <h3 class="sf-card-title"><a href="${href}">${esc(product.title)}</a></h3>
          <div class="sf-card-foot">
            <div class="sf-card-price"><span class="sf-price">${isService ? "From " : ""}${money(product.price)}</span>${sale ? `<s class="sf-compare">${money(product.compareAt)}</s>` : ""}</div>
            ${add}
          </div>
        </div>
      </article>`;
  }

  /* Resources archive (resources.html) card. */
  function resource(resource, opts = {}) {
    const iconFor = type => type === "Video" ? "video" : type === "Audio" ? "headphones" : "file-text";
    const creatorName = String(resource.creator || "RhemaSphere").trim();
    const creatorKey = creatorName.toLocaleLowerCase();
    const channel = (opts.channels || []).find(item => [item.name, item.owner, item.handle].some(value => String(value || "").trim().toLocaleLowerCase() === creatorKey));
    const channelHref = channel ? `channel-detail.html?id=${encodeURIComponent(channel.id)}` : "channels.html";
    const channelAction = channel ? "Open Channel" : "Explore Channels";
    const format = resource.format || resource.type;
    const price = resource.access === "Free" ? "Free" : money(resource.price);
    const detail = `resource-detail.html?id=${encodeURIComponent(resource.id)}`;
    const label = resource.access === "Free" ? "Add to library" : "Get resource";
    const action = opts.linkActions ? `<a class="resource-action" href="${detail}">${label}</a>` : `<button class="resource-action" type="button" data-resource-action="${esc(resource.id)}">${label}</button>`;
    return `
      <article class="resource-card editorial-card rv-list-card">
        <a class="resource-cover" href="${detail}" aria-label="View ${esc(resource.title)}">
          <img class="resource-image" src="${esc(resource.image)}" alt="" loading="lazy" />
          <span class="rv-type-chip"><i data-lucide="${iconFor(resource.type)}"></i>${esc(resource.type === "Text" && resource.format === "Article" ? "Article" : format)}</span>
        </a>
        <div class="resource-card-body">
          <h3><a href="${detail}">${esc(resource.title)}</a></h3>
          <a class="rv-card-church resource-channel-link" href="${channelHref}" aria-label="${channelAction}: ${esc(creatorName)}"><span class="rv-mini-avatar" aria-hidden="true">${esc(initials(creatorName))}</span><span>${esc(creatorName)}</span></a>
          <div class="rv-card-meta resource-card-footer"><span class="resource-subtitle resource-duration">${esc([resource.topic, resource.duration].filter(Boolean).join(" · "))}</span><strong class="rv-card-price resource-price-badge ${resource.access === "Paid" ? "paid" : ""}">${price}</strong></div>
          <div class="rv-card-actions">
            ${action}
            <button class="content-love-button" type="button" data-love-type="resource" data-love-id="${esc(resource.id)}" aria-pressed="false" aria-label="Like"><i data-lucide="heart"></i><span data-love-count>0</span></button>
          </div>
        </div>
      </article>
    `;
  }

  /* Meditation archive (meditation.html) room card. */
  function room(room, opts = {}) {
    const safe = { ...room, ...Object.fromEntries(["id", "cover", "title", "subtitle", "categoryLabel", "icon"].map(key => [key, esc(room[key])])) };
    const creatorName = esc(room.ownerName || "RhemaSphere");
    const audioName = ({ bible: "Audio Bible", instrumental: "Soaking Instrumental", worship: "Worship Stream", sermon: "Sermon", silence: "Silence / Ambient" })[room.selectedAudio] || "Curated Audio";
    const open = opts.href ? '<a class="sanctuary-room-card" href="' + esc(opts.href) + '" data-enter-room="' + safe.id + '">' : '<div class="sanctuary-room-card" data-enter-room="' + safe.id + '">';
    return open +
      '<div class="room-card-cover">' +
        (safe.cover ? '<img src="' + safe.cover + '" alt="' + safe.title + '" />' : '') +
        '<span class="room-card-tag">' + safe.categoryLabel + '</span>' +
        '<span class="room-enter-pill"><i data-lucide="door-open"></i> Enter Room</span>' +
      '</div>' +
      '<div class="room-card-body">' +
        '<h3>' + safe.title + '</h3>' +
        '<p>' + safe.subtitle + '</p>' +
        '<div class="room-card-footer">' +
          '<span><i data-lucide="user"></i> ' + creatorName + '</span>' +
          '<span class="room-audio-count"><i data-lucide="music"></i> ' + esc(audioName) + '</span>' +
        '</div>' +
      '</div>' +
    (opts.href ? '</a>' : '</div>');
  }

  /* Livestream archive (livestream.html) card. */
  function live(stream, opts = {}) {
    return '<a class="mwe-yt-card" href="' + esc(opts.href) + '" aria-label="Watch ' + esc(stream.name) + '">' +
      '<span class="mwe-yt-thumb"><img src="' + esc(opts.thumb) + '" alt="" loading="lazy"><span class="mwe-live-badge"><span></span>LIVE</span><span class="mwe-yt-play"><i data-lucide="play"></i></span></span>' +
      '<span class="mwe-yt-meta">' + (opts.avatar || '<span class="mwe-live-avatar">' + esc(initials(stream.name) || '?') + '</span>') + '<span><b class="mwe-yt-title">' + esc(stream.name) + '</b><small>Live service</small><small>' + esc(stream.description || (stream.type + " broadcast")) + '</small></span></span></a>';
  }

  root.RSCards = { product, resource, room, live, esc };
})(window);
