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
  }

  function renderProductUI(product, container) {
    const discountPct = product.compareAt && product.compareAt > product.price
      ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
      : null;

    container.innerHTML = `
      <div class="product-sleek-layout">
        <!-- Left: Image Gallery -->
        <div class="product-gallery-column">
          <div class="product-main-card">
            <div class="product-badge-float">
              <span class="product-pill category-pill">${data().escapeHtml(product.category)}</span>
              ${product.inventory > 5 
                ? `<span class="product-pill in-stock-pill"><span class="pulse-dot"></span> In Stock</span>`
                : `<span class="product-pill low-stock-pill"><span class="pulse-dot warning"></span> Low Stock (${product.inventory} left)</span>`}
            </div>
            <div class="product-main-image-wrap">
              <img id="product-main-image" src="${data().escapeHtml(product.image)}" alt="${data().escapeHtml(product.title)}" />
            </div>
          </div>

          <div class="product-thumbnails-sleek" role="tablist" aria-label="Product image gallery">
            <button class="thumb-btn active" type="button" aria-label="Primary view" data-src="${data().escapeHtml(product.image)}">
              <img src="${data().escapeHtml(product.image)}" alt="Thumbnail 1" />
            </button>
            <button class="thumb-btn" type="button" aria-label="Detail view" data-src="${data().escapeHtml(product.image)}">
              <img src="${data().escapeHtml(product.image)}" alt="Thumbnail 2" />
            </button>
            <button class="thumb-btn" type="button" aria-label="Packaging view" data-src="${data().escapeHtml(product.image)}">
              <img src="${data().escapeHtml(product.image)}" alt="Thumbnail 3" />
            </button>
          </div>

          <div class="product-guarantee-strip">
            <div class="guarantee-item">
              <i data-lucide="shield-check"></i>
              <div>
                <strong>Verified Ministry Seller</strong>
                <span>Vetted ${data().escapeHtml(product.sellerType.toLowerCase())} storefront</span>
              </div>
            </div>
            <div class="guarantee-item">
              <i data-lucide="truck"></i>
              <div>
                <strong>Tracked Delivery</strong>
                <span>Dispatched within 24-48 hours</span>
              </div>
            </div>
            <div class="guarantee-item">
              <i data-lucide="rotate-ccw"></i>
              <div>
                <strong>30-Day Returns</strong>
                <span>Hassle-free guarantee on physical items</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Details & Purchase -->
        <div class="product-info-column">
          <div class="product-header-group">
            <div class="product-seller-badge">
              <i data-lucide="${product.sellerType === "Church" ? "church" : "sparkles"}"></i>
              <span>Sold by <strong>${data().escapeHtml(product.seller)}</strong></span>
              <span class="seller-type-tag">${data().escapeHtml(product.sellerType)}</span>
            </div>
            <h1 class="product-title-sleek">${data().escapeHtml(product.title)}</h1>
            <div class="product-social-proof">
              <div class="rating-stars">
                <i data-lucide="star" class="star-filled"></i>
                <strong>${Number(product.rating || 4.9).toFixed(1)}</strong>
              </div>
              <span class="proof-divider">·</span>
              <span class="verified-reviews-count"><i data-lucide="check-check"></i> Verified Ministry Purchase</span>
              <span class="proof-divider">·</span>
              <span class="stock-count">${Number(product.inventory)} units available</span>
            </div>
          </div>

          <div class="product-pricing-card">
            <div class="price-headline">
              <span class="current-price">${data().money(product.price)}</span>
              ${product.compareAt ? `<del class="compare-price">${data().money(product.compareAt)}</del>` : ""}
              ${discountPct ? `<span class="discount-badge">Save ${discountPct}%</span>` : ""}
            </div>
            <p class="pricing-subtext"><i data-lucide="badge-percent"></i> Tax calculated at checkout. Free shipping on qualifying ministry orders.</p>
          </div>

          <p class="product-lead-description">${data().escapeHtml(product.description)}</p>

          <div class="product-action-box">
            <div class="quantity-control-group">
              <label for="product-qty" class="qty-label">Quantity</label>
              <div class="qty-stepper">
                <button type="button" id="qty-minus" aria-label="Decrease quantity" class="qty-btn"><i data-lucide="minus"></i></button>
                <input type="number" id="product-qty" value="1" min="1" max="${product.inventory || 99}" readonly />
                <button type="button" id="qty-plus" aria-label="Increase quantity" class="qty-btn"><i data-lucide="plus"></i></button>
              </div>
            </div>

            <div class="purchase-buttons-stack">
              <button class="product-detail-add" id="product-detail-add" type="button">
                <i data-lucide="shopping-bag"></i> Add to Cart
              </button>
              <button class="product-detail-buynow" id="product-detail-buynow" type="button">
                <i data-lucide="zap"></i> Buy Now
              </button>
            </div>
          </div>

          <!-- Tabs: Description, Specs, Seller -->
          <div class="product-tabs-container">
            <div class="product-tabs-header" role="tablist">
              <button class="tab-btn active" role="tab" id="tab-btn-desc" aria-selected="true" data-target="tab-panel-desc">
                <i data-lucide="file-text"></i> Highlights
              </button>
              <button class="tab-btn" role="tab" id="tab-btn-specs" aria-selected="false" data-target="tab-panel-specs">
                <i data-lucide="list-checks"></i> Specifications
              </button>
              <button class="tab-btn" role="tab" id="tab-btn-seller" aria-selected="false" data-target="tab-panel-seller">
                <i data-lucide="store"></i> Ministry Store
              </button>
            </div>

            <div class="tab-panel active" id="tab-panel-desc" role="tabpanel">
              <ul class="sleek-feature-list">
                <li><i data-lucide="check-circle-2"></i> High-quality ministry resource curated for church and personal faith growth</li>
                <li><i data-lucide="check-circle-2"></i> Backed by verified ${data().escapeHtml(product.sellerType.toLowerCase())} publisher</li>
                <li><i data-lucide="check-circle-2"></i> Carefully packed with protective packaging to prevent transit damage</li>
                <li><i data-lucide="check-circle-2"></i> Direct proceeds support Kingdom outreach and local gospel initiatives</li>
              </ul>
            </div>

            <div class="tab-panel" id="tab-panel-specs" role="tabpanel" hidden>
              <table class="product-specs-table">
                <tbody>
                  <tr><th>Category</th><td>${data().escapeHtml(product.category)}</td></tr>
                  <tr><th>Item Type</th><td>Physical / Digital Media</td></tr>
                  <tr><th>SKU Reference</th><td>${data().escapeHtml(product.id.toUpperCase())}</td></tr>
                  <tr><th>Seller Type</th><td>${data().escapeHtml(product.sellerType)}</td></tr>
                  <tr><th>Availability</th><td>${product.inventory > 0 ? "Ready to ship" : "Backorder"}</td></tr>
                  <tr><th>Return Policy</th><td>30-Day Guarantee</td></tr>
                </tbody>
              </table>
            </div>

            <div class="tab-panel" id="tab-panel-seller" role="tabpanel" hidden>
              <div class="seller-profile-card">
                <div class="seller-profile-avatar"><i data-lucide="${product.sellerType === "Church" ? "church" : "user"}"></i></div>
                <div class="seller-profile-meta">
                  <strong>${data().escapeHtml(product.seller)}</strong>
                  <span>Verified ${data().escapeHtml(product.sellerType)} on My Way of Evangelism</span>
                  <p>Committed to uplifting the body of Christ with inspiring resources, gospel materials, and community care.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook quantity buttons
    const qtyInput = document.getElementById("product-qty");
    document.getElementById("qty-minus")?.addEventListener("click", () => {
      const val = parseInt(qtyInput.value, 10) || 1;
      if (val > 1) qtyInput.value = val - 1;
    });
    document.getElementById("qty-plus")?.addEventListener("click", () => {
      const val = parseInt(qtyInput.value, 10) || 1;
      if (val < (product.inventory || 99)) qtyInput.value = val + 1;
    });

    // Add to Cart handler
    document.getElementById("product-detail-add")?.addEventListener("click", () => {
      const qty = parseInt(qtyInput?.value, 10) || 1;
      for (let i = 0; i < qty; i++) {
        data().addToCart(product.id);
      }
      renderCart();
      setCartOpen(true);
      window.MWE?.showMemberToast?.(`Added ${qty} × "${product.title}" to cart`);
    });

    // Buy Now handler
    document.getElementById("product-detail-buynow")?.addEventListener("click", () => {
      const qty = parseInt(qtyInput?.value, 10) || 1;
      for (let i = 0; i < qty; i++) {
        data().addToCart(product.id);
      }
      location.href = "checkout.html";
    });

    // Thumbnails
    document.querySelectorAll(".thumb-btn").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".thumb-btn").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        const mainImg = document.getElementById("product-main-image");
        if (mainImg) mainImg.src = button.dataset.src || button.querySelector("img").src;
      });
    });

    // Tab switcher
    document.querySelectorAll(".product-tabs-header .tab-btn").forEach(tabBtn => {
      tabBtn.addEventListener("click", () => {
        document.querySelectorAll(".product-tabs-header .tab-btn").forEach(b => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        document.querySelectorAll(".tab-panel").forEach(p => {
          p.classList.remove("active");
          p.hidden = true;
        });

        tabBtn.classList.add("active");
        tabBtn.setAttribute("aria-selected", "true");
        const targetId = tabBtn.dataset.target;
        const panel = document.getElementById(targetId);
        if (panel) {
          panel.classList.add("active");
          panel.hidden = false;
        }
      });
    });
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

    container.innerHTML = `
      <div class="service-detail-shell">
        <!-- Service Hero Banner -->
        <div class="service-hero-card">
          <div class="service-hero-media">
            <img src="${data().escapeHtml(service.image)}" alt="${data().escapeHtml(service.title)}" />
            <div class="service-hero-overlay"></div>
            <div class="service-type-badge-pill">
              <i data-lucide="sparkles"></i>
              <span>Church & Channel Service</span>
            </div>
          </div>

          <div class="service-hero-content">
            <div class="service-provider-strip">
              <div class="provider-avatar">
                <i data-lucide="${service.sellerType === "Church" ? "church" : "users"}"></i>
              </div>
              <div>
                <span class="provider-type-label">${data().escapeHtml(service.sellerType)} Offering</span>
                <strong class="provider-name-text">${data().escapeHtml(service.seller)}</strong>
              </div>
              <span class="verified-partner-tag"><i data-lucide="check-circle-2"></i> Verified</span>
            </div>

            <h1 class="service-main-title">${data().escapeHtml(service.title)}</h1>
            <p class="service-main-desc">${data().escapeHtml(service.description)}</p>

            <div class="service-highlights-row">
              <div class="highlight-stat">
                <span class="stat-label">Starting From</span>
                <strong class="stat-value">${data().money(service.price)} <small>${data().escapeHtml(service.pricingUnit || "")}</small></strong>
              </div>
              <div class="highlight-stat">
                <span class="stat-label">Rating</span>
                <strong class="stat-value rating-gold"><i data-lucide="star"></i> ${Number(service.rating || 4.9).toFixed(1)}</strong>
              </div>
              <div class="highlight-stat">
                <span class="stat-label">Response Time</span>
                <strong class="stat-value"><i data-lucide="clock"></i> Within 24h</strong>
              </div>
            </div>

            <div class="service-hero-cta-row">
              <button type="button" class="button primary service-book-direct-btn" id="service-book-hero-btn">
                <i data-lucide="calendar-check"></i> Book This Service
              </button>
              <a href="#service-tiers-anchor" class="button ghost service-view-tiers-btn">
                <i data-lucide="layers"></i> View Package Tiers
              </a>
            </div>
          </div>
        </div>

        <!-- Specialized Template Component -->
        ${specializedContentHtml}

        <!-- Package Tiers Section -->
        <section class="service-tiers-section" id="service-tiers-anchor">
          <div class="section-title-wrap">
            <span class="service-kicker"><i data-lucide="tag"></i> Transparent Ministry Pricing</span>
            <h2>Select a Service Package Tier</h2>
            <p>Choose the tier that best matches your church schedule, gathering size, or production scope.</p>
          </div>

          <div class="service-tiers-grid">
            ${tiers.map((tier, idx) => `
              <div class="service-tier-card ${idx === selectedTierIndex ? "selected" : ""}" data-tier-index="${idx}">
                ${idx === 1 ? `<div class="tier-popular-ribbon"><i data-lucide="star"></i> Most Requested</div>` : ""}
                <div class="tier-card-head">
                  <span class="tier-name">${data().escapeHtml(tier.name)}</span>
                  <div class="tier-price-row">
                    <span class="tier-price">${data().money(tier.price)}</span>
                    <span class="tier-duration">${data().escapeHtml(tier.duration || service.pricingUnit || "")}</span>
                  </div>
                </div>

                <div class="tier-card-body">
                  <ul class="tier-highlights-list">
                    ${(tier.highlights || []).map(h => `
                      <li><i data-lucide="check"></i> <span>${data().escapeHtml(h)}</span></li>
                    `).join("")}
                  </ul>
                </div>

                <div class="tier-card-footer">
                  <button type="button" class="button ${idx === selectedTierIndex ? "primary" : "secondary"} tier-select-btn" data-tier-index="${idx}">
                    <i data-lucide="${idx === selectedTierIndex ? "check-circle" : "arrow-right"}"></i>
                    ${idx === selectedTierIndex ? "Selected Tier" : "Select Tier"}
                  </button>
                </div>
              </div>
            `).join("")}
          </div>

          <!-- Bottom Action Bar -->
          <div class="service-bottom-cta-banner">
            <div>
              <strong>Ready to reserve with ${data().escapeHtml(service.seller)}?</strong>
              <p>Submit your preferred date and requirements. No upfront obligation—the ministry will confirm availability.</p>
            </div>
            <button type="button" class="button primary service-book-now-btn" id="service-book-now-btn">
              <i data-lucide="calendar-plus"></i> Inquire & Book Selected Tier (<span id="selected-tier-price-display">${data().money(tiers[selectedTierIndex]?.price || service.price)}</span>)
            </button>
          </div>
        </section>

        <!-- Provider Trust Card -->
        <div class="service-provider-full-card">
          <div class="provider-avatar-lg"><i data-lucide="${service.sellerType === "Church" ? "church" : "users"}"></i></div>
          <div class="provider-info-lg">
            <span class="provider-subhead">Provided by verified Kingdom Partner</span>
            <h3>${data().escapeHtml(service.seller)}</h3>
            <p>Dedicated to serving other churches, ministries, and disciples with excellence, integrity, and biblical stewardship.</p>
            <div class="provider-meta-tags">
              <span><i data-lucide="map-pin"></i> Verified Partner Location</span>
              <span><i data-lucide="shield-check"></i> Identity & Background Verified</span>
              <span><i data-lucide="message-circle"></i> Direct Messaging Available</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook Tier Card Selection
    document.querySelectorAll(".service-tier-card").forEach(card => {
      card.addEventListener("click", () => {
        const idx = parseInt(card.dataset.tierIndex, 10);
        if (isNaN(idx)) return;
        selectedTierIndex = idx;
        updateSelectedTierUI(tiers);
      });
    });

    // Direct booking buttons
    document.getElementById("service-book-hero-btn")?.addEventListener("click", () => {
      openBookingModal(service, tiers[selectedTierIndex]);
    });
    document.getElementById("service-book-now-btn")?.addEventListener("click", () => {
      openBookingModal(service, tiers[selectedTierIndex]);
    });

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

        window.MWE?.showMemberToast?.(`Booking inquiry received! Ref: ${refCode}`);
      } catch {
        window.MWE?.showMemberToast?.("Could not submit booking inquiry. Please try again.");
      } finally {
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

    document.title = `${item.title} | My Way of Evangelism`;

    if (item.itemType === "service") {
      renderServiceUI(item, container);
    } else {
      renderProductUI(item, container);
    }

    setupBookingFormSubmission();
    renderCart();
    window.lucide?.createIcons();
  });
})();
