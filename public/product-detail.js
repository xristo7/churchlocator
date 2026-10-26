(function initializeProductDetail() {
  const data = () => window.FaithLinkModules;
  const productId = new URLSearchParams(location.search).get("id");
  let selectedTierIndex = 0;
  let audioPlaying = false;
  let audioTimer = null;
  let audioProgress = 0;

  function setCartOpen(open) {
    const drawer = document.getElementById("store-cart-drawer");
    const backdrop = document.getElementById("cart-drawer-backdrop");
    drawer?.classList.toggle("open", open);
    drawer?.setAttribute("aria-hidden", String(!open));
    if (backdrop) backdrop.hidden = !open;
  }

  function renderCart() {
    if (!data()) return;
    const items = data().getProducts();
    const rows = data().getCart().map(item => ({ ...item, product: items.find(p => p.id === item.id) })).filter(item => item.product);
    const total = rows.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
    const cartTotalEl = document.getElementById("cart-total");
    if (cartTotalEl) cartTotalEl.textContent = data().money(total);
    const cartItemsEl = document.getElementById("cart-items");
    if (cartItemsEl) {
      cartItemsEl.innerHTML = rows.length ? rows.map(item => `
        <div class="cart-item">
          <img src="${data().escapeHtml(item.product.image)}" alt="" />
          <div>
            <strong>${data().escapeHtml(item.product.title)}</strong>
            <small>${item.quantity} × ${data().money(item.product.price)}</small>
          </div>
          <button class="cart-remove" type="button" data-remove-cart="${data().escapeHtml(item.product.id)}" aria-label="Remove ${data().escapeHtml(item.product.title)} from cart">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `).join("") : `<div class="cart-empty"><i data-lucide="shopping-basket"></i><p>Your cart is empty.</p></div>`;
    }
    window.lucide?.createIcons();
  }

  function openBookingModal(item, tier) {
    const modal = document.getElementById("service-booking-modal");
    const backdrop = document.getElementById("service-modal-backdrop");
    if (!modal) return;

    const chosenTier = tier || (item.tiers && item.tiers[selectedTierIndex]) || { name: "Standard Package", price: item.price };

    document.getElementById("booking-service-id").value = item.id;
    document.getElementById("booking-service-title").value = item.title;
    document.getElementById("booking-service-type").value = item.serviceType || "service";
    document.getElementById("booking-provider-name").value = item.seller;
    document.getElementById("booking-provider-type").value = item.sellerType;
    document.getElementById("booking-package-tier").value = chosenTier.name;
    document.getElementById("booking-estimated-amount").value = data().money(chosenTier.price);

    const summaryEl = document.getElementById("booking-service-summary");
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="service-modal-summary-card">
          <img src="${data().escapeHtml(item.image)}" alt="" class="service-summary-thumb" />
          <div class="service-summary-info">
            <span class="service-summary-tag"><i data-lucide="sparkles"></i> ${data().escapeHtml(item.category)}</span>
            <strong>${data().escapeHtml(item.title)}</strong>
            <div class="service-summary-meta">
              <span><i data-lucide="layers"></i> ${data().escapeHtml(chosenTier.name)}</span>
              <span class="service-summary-price">${data().money(chosenTier.price)}</span>
            </div>
          </div>
        </div>
      `;
    }

    // Reset form and confirmation state
    document.getElementById("service-booking-form")?.removeAttribute("hidden");
    document.getElementById("service-booking-confirmation")?.setAttribute("hidden", "true");
    document.getElementById("service-modal-title").textContent = "Book Service";

    // Pre-fill user details if logged in
    const currentUser = window.FaithLinkAuth?.getCurrentUser?.();
    if (currentUser) {
      const nameInput = document.getElementById("booking-name");
      const emailInput = document.getElementById("booking-email");
      if (nameInput && !nameInput.value) nameInput.value = currentUser.displayName || currentUser.name || "";
      if (emailInput && !emailInput.value) emailInput.value = currentUser.email || "";
    }

    modal.hidden = false;
    modal.setAttribute("open", "true");
    if (backdrop) backdrop.hidden = false;
    document.body.classList.add("modal-open");
    window.lucide?.createIcons();
  }

  function closeBookingModal() {
    const modal = document.getElementById("service-booking-modal");
    const backdrop = document.getElementById("service-modal-backdrop");
    if (modal) {
      modal.hidden = true;
      modal.removeAttribute("open");
    }
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove("modal-open");
    document.getElementById("service-booking-form")?.removeAttribute("aria-busy");
  }

  function relatedHtml(item) {
    const all = data().getProducts().filter(p => p.id !== item.id && p.status === "Active");
    const pick = [...all.filter(p => p.category === item.category || p.seller === item.seller), ...all].filter((p, i, a) => a.indexOf(p) === i).slice(0, 4);
    if (!pick.length) return "";
    return `<section class="sf-related" aria-labelledby="sf-related-title"><h2 id="sf-related-title">You may also like</h2><div class="sf-grid">${pick.map(p => sfCard(p)).join("")}</div></section>`;
  }

  function sfCard(p) {
    const esc = data().escapeHtml, isService = p.itemType === "service";
    const href = `product-detail.html?id=${encodeURIComponent(p.id)}`;
    return `<article class="sf-card"><a class="sf-card-media" href="${href}" aria-label="${esc(p.title)}"><img src="${esc(p.image)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('is-broken')" />${p.compareAt > p.price ? `<span class="sf-badge sf-badge-sale">Sale</span>` : isService ? `<span class="sf-badge">Service</span>` : ""}</a><div class="sf-card-body"><span class="sf-vendor">${esc(p.seller)}</span><h3 class="sf-card-title"><a href="${href}">${esc(p.title)}</a></h3><div class="sf-card-price"><span class="sf-price">${isService ? "From " : ""}${data().money(p.price)}</span>${p.compareAt > p.price ? `<s class="sf-compare">${data().money(p.compareAt)}</s>` : ""}</div></div></article>`;
  }

  function renderProductUI(product, container) {
    const esc = data().escapeHtml;
    const discountPct = product.compareAt && product.compareAt > product.price ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100) : null;
    const imgs = [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
    const stock = Number(product.inventory) || 0;
    container.innerHTML = `
      <div class="sf-pdp">
        <div class="sf-pdp-main">
          <div class="sf-media">
            <div class="sf-media-main"><img id="product-main-image" src="${esc(imgs[0] || "")}" alt="${esc(product.title)}" />${discountPct ? `<span class="sf-badge sf-badge-sale">Save ${discountPct}%</span>` : ""}</div>
            ${imgs.length > 1 ? `<div class="sf-thumbs" role="tablist" aria-label="Product images">${imgs.map((src, i) => `<button class="sf-thumb ${i === 0 ? "is-active" : ""}" type="button" data-src="${esc(src)}" aria-label="Image ${i + 1}"><img src="${esc(src)}" alt="" /></button>`).join("")}</div>` : ""}
          </div>
          <div class="sf-info">
            <span class="sf-vendor">${esc(product.seller)}</span>
            <h1 class="sf-title">${esc(product.title)}</h1>
            <div class="sf-price-row"><span class="sf-price sf-price-lg">${data().money(product.price)}</span>${product.compareAt > product.price ? `<s class="sf-compare">${data().money(product.compareAt)}</s>` : ""}${discountPct ? `<span class="sf-pill-sale">Sale</span>` : ""}</div>
            <p class="sf-note">Taxes included. Shipping calculated at checkout.</p>
            <div class="sf-meta-row"><span class="sf-rating"><i data-lucide="star"></i>${Number(product.rating || 4.9).toFixed(1)}</span><span class="sf-stock ${stock > 5 ? "" : "is-low"}"><span class="sf-dot"></span>${stock > 5 ? "In stock" : stock > 0 ? `Only ${stock} left` : "Sold out"}</span></div>
            <div class="sf-field"><label for="product-qty">Quantity</label>
              <div class="sf-qty"><button type="button" id="qty-minus" aria-label="Decrease quantity"><i data-lucide="minus"></i></button><input type="number" id="product-qty" value="1" min="1" max="${stock || 99}" readonly /><button type="button" id="qty-plus" aria-label="Increase quantity"><i data-lucide="plus"></i></button></div>
            </div>
            <button class="sf-btn sf-btn-outline" id="product-detail-add" type="button">Add to cart</button>
            <button class="sf-btn sf-btn-primary" id="product-detail-buynow" type="button">Buy it now</button>
            <p class="sf-desc">${esc(product.description)}</p>
            <div class="sf-actions-row">
              <button class="content-love-button sf-like" type="button" data-love-type="product" data-love-id="${esc(product.id)}" aria-pressed="false"><i data-lucide="heart"></i><span data-love-count>0</span></button>
              <button class="sf-share" type="button" id="sf-share"><i data-lucide="share-2"></i><span>Share</span></button>
            </div>
            <ul class="sf-trust">
              <li><span class="sf-ico"><i data-lucide="shield-check"></i></span><span><strong>Verified ${esc(product.sellerType || "seller")}</strong> Sold by ${esc(product.seller)}</span></li>
              <li><span class="sf-ico"><i data-lucide="truck"></i></span><span><strong>Tracked delivery</strong> Ships in 24–48 hours</span></li>
              <li><span class="sf-ico"><i data-lucide="rotate-ccw"></i></span><span><strong>30-day returns</strong> On physical items</span></li>
            </ul>
          </div>
        </div>
        <section class="sf-below">
          <details class="sf-acc" open><summary>Description</summary><div><p>${esc(product.description)}</p><p>Proceeds support the ministry of ${esc(product.seller)}.</p></div></details>
          <details class="sf-acc"><summary>Details</summary><div><dl class="sf-dl"><dt>Category</dt><dd>${esc(product.category)}</dd><dt>SKU</dt><dd>${esc(String(product.id).toUpperCase())}</dd><dt>Seller</dt><dd>${esc(product.seller)} · ${esc(product.sellerType)}</dd><dt>Availability</dt><dd>${stock > 0 ? "Ready to ship" : "Backorder"}</dd></dl></div></details>
          <details class="sf-acc"><summary>Shipping &amp; returns</summary><div><p>Dispatched within 24–48 hours. Returns accepted within 30 days on unused physical items.</p></div></details>
        </section>
        ${relatedHtml(product)}
      </div>
      <div class="sf-sticky-buy"><div class="sf-sticky-price"><strong>${data().money(product.price)}</strong><span>${esc(product.title)}</span></div><button type="button" id="sf-sticky-add">Add to cart</button></div>`;

    const qtyInput = document.getElementById("product-qty");
    document.getElementById("qty-minus")?.addEventListener("click", () => { const v = parseInt(qtyInput.value, 10) || 1; if (v > 1) qtyInput.value = v - 1; });
    document.getElementById("qty-plus")?.addEventListener("click", () => { const v = parseInt(qtyInput.value, 10) || 1; if (v < (stock || 99)) qtyInput.value = v + 1; });
    const add = () => { const q = parseInt(qtyInput?.value, 10) || 1; for (let i = 0; i < q; i++) data().addToCart(product.id); renderCart(); setCartOpen(true); window.MWE?.showMemberToast?.(`Added ${q} × "${product.title}" to cart`); };
    document.getElementById("product-detail-add")?.addEventListener("click", add);
    document.getElementById("sf-sticky-add")?.addEventListener("click", add);
    document.getElementById("product-detail-buynow")?.addEventListener("click", () => { const q = parseInt(qtyInput?.value, 10) || 1; for (let i = 0; i < q; i++) data().addToCart(product.id); location.href = "checkout.html"; });
    document.getElementById("sf-share")?.addEventListener("click", () => { if (navigator.share) navigator.share({ title: product.title, url: location.href }).catch(() => {}); else navigator.clipboard?.writeText(location.href).then(() => window.MWE?.showMemberToast?.("Link copied")); });
    document.querySelectorAll(".sf-thumb").forEach(b => b.addEventListener("click", () => { document.querySelectorAll(".sf-thumb").forEach(x => x.classList.remove("is-active")); b.classList.add("is-active"); document.getElementById("product-main-image").src = b.dataset.src; }));
  }

  function renderServiceUI(service, container) {
    const tiers = service.tiers || [
      { id: "tier-1", name: "Standard Engagement", price: service.price, duration: "Flexible", highlights: ["Dedicated service consultation", "Full coordination and support", "Satisfaction guarantee"] }
    ];

    let specializedContentHtml = "";

    // 1. SINGING / WORSHIP LEADING
    if (service.serviceType === "singing") {
      specializedContentHtml = `
        <div class="service-unique-section service-singing-section">
          <div class="service-section-header">
            <span class="service-kicker"><i data-lucide="music"></i> Repertoire & Audio Preview</span>
            <h3>Listen to Vocal Sample & Acoustic Praise</h3>
            <p>Experience the heart of worship before you book. Listen to authentic acoustic recordings from recent ministry gatherings.</p>
          </div>

          <div class="service-audio-player-card">
            <div class="audio-player-controls">
              <button type="button" class="audio-play-toggle" id="audio-play-btn" aria-label="Play or pause audio sample">
                <i data-lucide="play" id="audio-play-icon"></i>
              </button>
              <div class="audio-player-track-info">
                <div class="track-header">
                  <strong>Way Maker / Goodness of God (Live Acoustic Set)</strong>
                  <span class="track-badge">44.1 kHz Studio Master</span>
                </div>
                <div class="audio-waveform-bars" id="audio-waveform">
                  <span style="height: 40%"></span>
                  <span style="height: 65%"></span>
                  <span style="height: 90%"></span>
                  <span style="height: 50%"></span>
                  <span style="height: 80%"></span>
                  <span style="height: 100%"></span>
                  <span style="height: 70%"></span>
                  <span style="height: 45%"></span>
                  <span style="height: 85%"></span>
                  <span style="height: 60%"></span>
                  <span style="height: 75%"></span>
                  <span style="height: 95%"></span>
                  <span style="height: 50%"></span>
                  <span style="height: 35%"></span>
                  <span style="height: 70%"></span>
                  <span style="height: 85%"></span>
                  <span style="height: 60%"></span>
                  <span style="height: 40%"></span>
                </div>
                <div class="track-timeline">
                  <span id="audio-current-time">0:00</span>
                  <div class="timeline-bar"><div class="timeline-progress" id="audio-progress" style="width: 0%"></div></div>
                  <span>3:45</span>
                </div>
              </div>
            </div>

            <div class="audio-specs-grid">
              <div class="spec-pill"><i data-lucide="mic-2"></i> <strong>Vocal Range:</strong> Soprano / Alto & Contemporary Praise</div>
              <div class="spec-pill"><i data-lucide="guitar"></i> <strong>Accompaniment:</strong> Acoustic Guitar & Grand Piano</div>
              <div class="spec-pill"><i data-lucide="users"></i> <strong>Ensemble Options:</strong> Soloist, Duo, or Full Praise Team</div>
              <div class="spec-pill"><i data-lucide="sparkles"></i> <strong>Repertoire:</strong> 120+ Modern Worship & Gospel Anthems</div>
            </div>
          </div>
        </div>
      `;
    }

    // 2. VENUE / HALL RENTAL
    else if (service.serviceType === "venue") {
      specializedContentHtml = `
        <div class="service-unique-section service-venue-section">
          <div class="service-section-header">
            <span class="service-kicker"><i data-lucide="building"></i> Venue Specifications</span>
            <h3>Sanctuary Capacity, Audio-Visual & Amenities</h3>
            <p>A sacred, welcoming space equipped with broadcast-grade production technology and warm hospitality areas.</p>
          </div>

          <div class="venue-stats-row">
            <div class="venue-stat-card">
              <i data-lucide="users"></i>
              <strong>500+ Seats</strong>
              <span>Padded sanctuary auditorium</span>
            </div>
            <div class="venue-stat-card">
              <i data-lucide="maximize-2"></i>
              <strong>2,800 sq ft</strong>
              <span>Total main hall floor area</span>
            </div>
            <div class="venue-stat-card">
              <i data-lucide="tv"></i>
              <strong>4K Laser Screens</strong>
              <span>Dual high-lumen sanctuary displays</span>
            </div>
            <div class="venue-stat-card">
              <i data-lucide="car"></i>
              <strong>120+ Parking</strong>
              <span>Free on-site parking spaces</span>
            </div>
          </div>

          <div class="venue-amenities-card">
            <h4><i data-lucide="check-check"></i> Included Facilities & Tech Equipment</h4>
            <div class="amenities-checklist">
              <div class="amenity-item"><i data-lucide="sliders"></i><span>Behringer X32 32-Channel Digital Sound Console</span></div>
              <div class="amenity-item"><i data-lucide="mic"></i><span>Shure Wireless Handheld & Lapel Microphones</span></div>
              <div class="amenity-item"><i data-lucide="sparkles"></i><span>DMX Stage Lighting with Programmable Presets</span></div>
              <div class="amenity-item"><i data-lucide="heart-handshake"></i><span>Dedicated Church Sound Engineer on Duty</span></div>
              <div class="amenity-item"><i data-lucide="coffee"></i><span>Fellowship Kitchenette with Fridge & Prep Area</span></div>
              <div class="amenity-item"><i data-lucide="door-open"></i><span>Private Green Room / Bridal Suite</span></div>
              <div class="amenity-item"><i data-lucide="accessibility"></i><span>Step-Free Wheelchair Access & Reserved Seating</span></div>
              <div class="amenity-item"><i data-lucide="wifi"></i><span>High-Speed 500Mbps Guest Wi-Fi for Attendees</span></div>
            </div>
          </div>
        </div>
      `;
    }

    // 3. CHURCH VAN / TRANSPORT
    else if (service.serviceType === "van") {
      specializedContentHtml = `
        <div class="service-unique-section service-van-section">
          <div class="service-section-header">
            <span class="service-kicker"><i data-lucide="bus"></i> Vehicle Specifications & Safety</span>
            <h3>15-Passenger High-Roof Sprinter Van</h3>
            <p>Reliable, comfortable, and fully insured church van transport for retreats, conferences, youth missions, and outreach.</p>
          </div>

          <div class="van-specs-grid">
            <div class="van-spec-card">
              <div class="spec-icon"><i data-lucide="armchair"></i></div>
              <div>
                <strong>15 Reclining Passenger Seats</strong>
                <span>High-roof headroom allows standing and easy movement</span>
              </div>
            </div>
            <div class="van-spec-card">
              <div class="spec-icon"><i data-lucide="luggage"></i></div>
              <div>
                <strong>Deep Rear Cargo Bay</strong>
                <span>Generous luggage room for instruments, camping gear, and baggage</span>
              </div>
            </div>
            <div class="van-spec-card">
              <div class="spec-icon"><i data-lucide="thermometer-snowflake"></i></div>
              <div>
                <strong>Dual-Zone Climate Control</strong>
                <span>Independent front and rear heating and air conditioning</span>
              </div>
            </div>
            <div class="van-spec-card">
              <div class="spec-icon"><i data-lucide="shield-check"></i></div>
              <div>
                <strong>Commercial Ministry Insurance</strong>
                <span>Comprehensive liability coverage and 24/7 roadside assistance</span>
              </div>
            </div>
          </div>

          <div class="driver-options-notice">
            <div class="driver-badge"><i data-lucide="award"></i> Certified Options</div>
            <div class="driver-details">
              <strong>Self-Drive or Vetted Church Driver Available</strong>
              <p>You can designate a ministry driver with a standard valid driver's license (25+ years old with clean record), or request a church-certified professional driver for complete peace of mind.</p>
            </div>
          </div>
        </div>
      `;
    }

    // 4. MEDIA / PHOTO / VIDEO
    else if (service.serviceType === "media") {
      specializedContentHtml = `
        <div class="service-unique-section service-media-section">
          <div class="service-section-header">
            <span class="service-kicker"><i data-lucide="video"></i> Production Equipment & Deliverables</span>
            <h3>Cinematic 4K Capture with Kingdom Excellence</h3>
            <p>High-end cinema cameras, wireless audio recording, and licensed drone cinematography tailored for ministry storytelling.</p>
          </div>

          <div class="media-specs-grid">
            <div class="media-spec-item">
              <i data-lucide="camera"></i>
              <strong>Dual Sony Cinema 4K Cameras</strong>
              <span>Crystal-clear 10-bit color for low-light sanctuary settings</span>
            </div>
            <div class="media-spec-item">
              <i data-lucide="mic"></i>
              <strong>Wireless Sennheiser Audio</strong>
              <span>Dedicated pulpit and baptistery wireless microphones</span>
            </div>
            <div class="media-spec-item">
              <i data-lucide="plane"></i>
              <strong>Licensed Drone Aerial 4K</strong>
              <span>Stunning church campus and outdoor rally overview shots</span>
            </div>
            <div class="media-spec-item">
              <i data-lucide="clock"></i>
              <strong>48-Hour Preview Reel</strong>
              <span>Fast vertical clips ready for Sunday night social media</span>
            </div>
          </div>

          <div class="turnaround-guarantee-card">
            <i data-lucide="sparkles"></i>
            <div>
              <strong>Turnaround & Asset Delivery Guarantee</strong>
              <span>${data().escapeHtml(service.turnaround || "Highlights within 48 hours; final mastered deliverables within 7 business days via private cloud link.")}</span>
            </div>
          </div>
        </div>
      `;
    }

    // 5. GRAPHIC DESIGN & BRANDING
    else if (service.serviceType === "design") {
      specializedContentHtml = `
        <div class="service-unique-section service-design-section">
          <div class="service-section-header">
            <span class="service-kicker"><i data-lucide="palette"></i> Design Deliverables Kit</span>
            <h3>Sermon Series Branding & Visual Identity Kit</h3>
            <p>Complete graphic design package crafted to communicate biblical truth clearly across screens, social channels, and print.</p>
          </div>

          <div class="design-deliverables-grid">
            <div class="deliverable-card">
              <div class="deliverable-icon"><i data-lucide="monitor"></i></div>
              <strong>4K Title & Scripture Slides</strong>
              <span>16:9 widescreen presentation slides, transparent lower thirds, and scripture point layouts.</span>
            </div>
            <div class="deliverable-card">
              <div class="deliverable-icon"><i data-lucide="smartphone"></i></div>
              <strong>Social Media Promo Kit</strong>
              <span>Square (1:1) and Story (9:16) graphics ready for Instagram, Facebook, and church apps.</span>
            </div>
            <div class="deliverable-card">
              <div class="deliverable-icon"><i data-lucide="printer"></i></div>
              <strong>Print-Ready Bulletin / Flyer</strong>
              <span>High-resolution 300 DPI CMYK PDF with crop marks for commercial or church printing.</span>
            </div>
            <div class="deliverable-card">
              <div class="deliverable-icon"><i data-lucide="layers"></i></div>
              <strong>Editable Canva & Figma Files</strong>
              <span>Full source files allowing your media team to customize text each Sunday.</span>
            </div>
          </div>

          <div class="design-process-stepper">
            <h4><i data-lucide="git-commit"></i> How the Design Process Works</h4>
            <div class="stepper-track">
              <div class="step-card">
                <span class="step-num">01</span>
                <strong>Scripture & Theme Intake</strong>
                <span>Share your sermon title, scriptures, and style preferences.</span>
              </div>
              <div class="step-card">
                <span class="step-num">02</span>
                <strong>48h Concept Proof</strong>
                <span>Receive initial creative direction and slide draft for review.</span>
              </div>
              <div class="step-card">
                <span class="step-num">03</span>
                <strong>Refinement & Revisions</strong>
                <span>We polish typography, contrast, and layout until perfect.</span>
              </div>
              <div class="step-card">
                <span class="step-num">04</span>
                <strong>Final Asset Handover</strong>
                <span>Download full 4K PNGs, vector SVGs, and Canva project templates.</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    const esc = data().escapeHtml;
    container.innerHTML = `
      <div class="sf-pdp">
        <div class="sf-pdp-main">
          <div class="sf-media"><div class="sf-media-main"><img src="${esc(service.image)}" alt="${esc(service.title)}" /><span class="sf-badge">Service</span></div></div>
          <div class="sf-info">
            <span class="sf-vendor">${esc(service.seller)}</span>
            <h1 class="sf-title">${esc(service.title)}</h1>
            <div class="sf-price-row"><span class="sf-price sf-price-lg" id="selected-tier-price-display">${data().money(tiers[selectedTierIndex]?.price || service.price)}</span><span class="sf-unit" id="sf-tier-unit">${esc(tiers[selectedTierIndex]?.duration || service.pricingUnit || "")}</span></div>
            <div class="sf-meta-row"><span class="sf-rating"><i data-lucide="star"></i>${Number(service.rating || 4.9).toFixed(1)}</span><span class="sf-stock"><span class="sf-dot"></span>Replies within 24h</span></div>
            <fieldset class="sf-variants"><legend>Package</legend>
              ${tiers.map((t, i) => `<label class="sf-variant"><input type="radio" name="sf-tier" value="${i}" ${i === selectedTierIndex ? "checked" : ""} /><span class="sf-variant-box"><span class="sf-variant-name">${esc(t.name)}</span><span class="sf-variant-price">${data().money(t.price)}</span></span></label>`).join("")}
            </fieldset>
            <button class="sf-btn sf-btn-primary" id="service-book-now-btn" type="button">Request booking</button>
            <p class="sf-desc">${esc(service.description)}</p>
            <div class="sf-actions-row">
              <button class="content-love-button sf-like" type="button" data-love-type="product" data-love-id="${esc(service.id)}" aria-pressed="false"><i data-lucide="heart"></i><span data-love-count>0</span></button>
            </div>
            <div class="sf-included" id="sf-included"></div>
          </div>
        </div>
        <section class="sf-below">${specializedContentHtml}</section>
        ${relatedHtml(service)}
      </div>
      <div class="sf-sticky-buy"><div class="sf-sticky-price"><strong id="sf-sticky-service-price">${data().money(tiers[selectedTierIndex]?.price || service.price)}</strong><span>${esc(service.title)}</span></div><button type="button" id="sf-sticky-book">Book now</button></div>`;
    const syncTier = () => {
      const t = tiers[selectedTierIndex] || {};
      document.getElementById("selected-tier-price-display").textContent = data().money(t.price ?? service.price);
      document.getElementById("sf-sticky-service-price").textContent = data().money(t.price ?? service.price);
      document.getElementById("sf-tier-unit").textContent = t.duration || service.pricingUnit || "";
      document.getElementById("sf-included").innerHTML = (t.highlights || []).length ? `<strong>Included</strong><ul>${t.highlights.map(h => `<li><span class="sf-ico sf-ico-sm"><i data-lucide="check"></i></span><span>${esc(h)}</span></li>`).join("")}</ul>` : "";
      window.lucide?.createIcons();
    };
    document.querySelectorAll('input[name="sf-tier"]').forEach(r => r.addEventListener("change", () => { selectedTierIndex = Number(r.value); syncTier(); }));
    syncTier();
    document.getElementById("service-book-now-btn")?.addEventListener("click", () => openBookingModal(service, tiers[selectedTierIndex]));
    document.getElementById("sf-sticky-book")?.addEventListener("click", () => openBookingModal(service, tiers[selectedTierIndex]));

    // Audio preview player logic (if singing service)
    const playBtn = document.getElementById("audio-play-btn");
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        audioPlaying = !audioPlaying;
        const icon = document.getElementById("audio-play-icon");
        const waveform = document.getElementById("audio-waveform");
        if (audioPlaying) {
          playBtn.classList.add("playing");
          waveform?.classList.add("animating");
          icon?.setAttribute("data-lucide", "pause");
          audioTimer = setInterval(() => {
            audioProgress += 2;
            if (audioProgress > 100) audioProgress = 0;
            const progBar = document.getElementById("audio-progress");
            if (progBar) progBar.style.width = audioProgress + "%";
            const totalSecs = Math.round((audioProgress / 100) * 225);
            const m = Math.floor(totalSecs / 60);
            const s = totalSecs % 60;
            const timeEl = document.getElementById("audio-current-time");
            if (timeEl) timeEl.textContent = `${m}:${s < 10 ? "0" : ""}${s}`;
          }, 300);
        } else {
          playBtn.classList.remove("playing");
          waveform?.classList.remove("animating");
          icon?.setAttribute("data-lucide", "play");
          clearInterval(audioTimer);
        }
        window.lucide?.createIcons();
      });
    }
  }

  function updateSelectedTierUI(tiers) {
    document.querySelectorAll(".service-tier-card").forEach((c, idx) => {
      const isSelected = idx === selectedTierIndex;
      c.classList.toggle("selected", isSelected);
      const btn = c.querySelector(".tier-select-btn");
      if (btn) {
        btn.className = `button ${isSelected ? "primary" : "secondary"} tier-select-btn`;
        btn.innerHTML = `<i data-lucide="${isSelected ? "check-circle" : "arrow-right"}"></i> ${isSelected ? "Selected Tier" : "Select Tier"}`;
      }
    });
    const priceDisplay = document.getElementById("selected-tier-price-display");
    if (priceDisplay && tiers[selectedTierIndex]) {
      priceDisplay.textContent = data().money(tiers[selectedTierIndex].price);
    }
    window.lucide?.createIcons();
  }

  function setupBookingFormSubmission() {
    const form = document.getElementById("service-booking-form");
    if (!form) return;

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const submitBtn = document.getElementById("service-submit-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Submitting...`;
        window.lucide?.createIcons();
      }
      form.setAttribute("aria-busy", "true");

      const formData = new FormData(form);
      const payload = {
        serviceId: formData.get("serviceId"),
        serviceTitle: formData.get("serviceTitle"),
        serviceType: formData.get("serviceType"),
        providerName: formData.get("providerName"),
        providerType: formData.get("providerType"),
        packageTier: formData.get("packageTier"),
        estimatedAmount: formData.get("estimatedAmount"),
        customerName: formData.get("customerName"),
        customerEmail: formData.get("customerEmail"),
        customerPhone: formData.get("customerPhone"),
        requestedDate: formData.get("requestedDate"),
        requestedTime: formData.get("requestedTime"),
        eventLocation: formData.get("eventLocation"),
        notes: formData.get("notes")
      };

      try {
        const result = await data().bookService(payload);
        const refCode = result?.bookingRef || result?.id || `SRV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

        // Switch to confirmation view
        form.setAttribute("hidden", "true");
        const confirmBox = document.getElementById("service-booking-confirmation");
        const refCodeEl = document.getElementById("confirmation-ref-code");
        if (refCodeEl) refCodeEl.textContent = refCode;
        if (confirmBox) confirmBox.removeAttribute("hidden");
        document.getElementById("service-modal-title").textContent = "Request received";
        document.getElementById("confirmation-done-btn")?.focus();

        window.MWE?.showMemberToast?.(`Booking inquiry received! Ref: ${refCode}`);
      } catch {
        window.MWE?.showMemberToast?.("Could not submit booking inquiry. Please try again.");
      } finally {
        form.removeAttribute("aria-busy");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i data-lucide="send"></i> Submit Booking Request`;
          window.lucide?.createIcons();
        }
      }
    });

    // Modal Close & Cancel hooks
    document.getElementById("service-modal-close")?.addEventListener("click", closeBookingModal);
    document.getElementById("service-modal-cancel")?.addEventListener("click", closeBookingModal);
    document.getElementById("service-modal-backdrop")?.addEventListener("click", closeBookingModal);
    document.getElementById("confirmation-done-btn")?.addEventListener("click", closeBookingModal);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeBookingModal();
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
  await window.MWEPlatform?.ready;
    // Wire cart drawer removal (required by member-shell test)
    document.getElementById("cart-items")?.addEventListener("click", event => {
      const remove = event.target.closest("[data-remove-cart]");
      if (!remove) return;
      data().setCartQuantity(remove.dataset.removeCart, 0);
      renderCart();
    });
    document.getElementById("cart-close")?.addEventListener("click", () => setCartOpen(false));
    document.getElementById("cart-drawer-backdrop")?.addEventListener("click", () => setCartOpen(false));

    if (!data()) return;

    // Fetch product or service
    const item = (data().getItemById && data().getItemById(productId)) ||
                 data().getProducts().find(p => p.id === productId);

    const container = document.getElementById("product-detail");
    if (!container) return;

    if (!item) {
      container.innerHTML = `
        <div class="module-empty">
          <i data-lucide="package-x"></i>
          <strong>Item not found.</strong>
          <p>The product or service you are looking for is unavailable or has been moved.</p>
          <a href="store.html" class="button primary"><i data-lucide="arrow-left"></i> Return to Marketplace</a>
        </div>`;
      window.lucide?.createIcons();
      return;
    }

    document.title = `${item.title} | RhemaSphere`;

    if (item.itemType === "service") {
      container.classList.add("service-detail-host");
      renderServiceUI(item, container);
    } else {
      container.classList.remove("service-detail-host");
      renderProductUI(item, container);
    }

    setupBookingFormSubmission();
    renderCart();
    window.lucide?.createIcons();
  });
})();
