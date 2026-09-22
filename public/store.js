(function initializeStoreModule() {
  const data = () => window.FaithLinkModules;

  function filteredProducts() {
    const query = document.getElementById("store-search")?.value.trim().toLowerCase() || "";
    const type = document.getElementById("store-type")?.value || "all";
    const category = document.getElementById("store-category")?.value || "all";
    const sellerType = document.getElementById("store-seller")?.value || "all";
    const sort = document.getElementById("store-sort")?.value || "featured";
    const products = data().getProducts().filter(product => {
      if (type === "products" && product.itemType === "service") return false;
      if (type === "services" && product.itemType !== "service") return false;
      const searchable = `${product.title} ${product.seller} ${product.category} ${product.description}`.toLowerCase();
      // The public catalog already returns only published records.  Older
      // product records may still carry the legacy "Draft" product status,
      // so use the authoritative publication state as well as that label.
      const isPublished = product.status === "Active" || product.publicationState === "published" || product.state === "published";
      return isPublished && (!query || searchable.includes(query)) && (category === "all" || product.category === category) && (sellerType === "all" || product.sellerType === sellerType);
    });
    return products.sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "rating") return b.rating - a.rating;
      return Number(b.featured) - Number(a.featured);
    });
  }

  function renderProducts() {
    const grid = document.getElementById("store-products-grid");
    if (!grid || !data()) return;
    const products = filteredProducts();
    const resultCountEl = document.getElementById("store-result-count");
    if (resultCountEl) {
      resultCountEl.textContent = `${products.length} offering${products.length === 1 ? "" : "s"}`;
    }
    if (!products.length) {
      grid.innerHTML = `<div class="module-empty"><i data-lucide="package-search"></i><strong>No items match your search.</strong><p>Try another category, seller type, or keyword.</p></div>`;
      window.lucide?.createIcons();
      return;
    }
    grid.innerHTML = products.map(product => {
      const isService = product.itemType === "service";
      const rating = Number(product.rating);
      const ratingLabel = Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : "New";
      const fallbackImage = isService ? "assets/community-outreach.png" : "assets/hero-global-church.png";
      return `
      <article class="product-card ${isService ? "service-card-item" : ""}">
        <a class="product-image-wrap" href="product-detail.html?id=${encodeURIComponent(product.id)}" aria-label="View ${data().escapeHtml(product.title)}">
          <img class="product-image" src="${data().escapeHtml(product.image)}" data-fallback-src="${fallbackImage}" alt="${data().escapeHtml(product.title)}" />
          <span class="product-badge ${isService ? "service-badge-pill" : ""}">${isService ? `<i data-lucide="sparkles"></i> Service · ` : ""}${data().escapeHtml(product.sellerType)} · ${data().escapeHtml(product.category)}</span>
        </a>
        <div class="product-card-body">
          <span class="product-seller">${data().escapeHtml(product.sellerType)}: <strong>${data().escapeHtml(product.seller)}</strong></span>
          <h3><a href="product-detail.html?id=${encodeURIComponent(product.id)}">${data().escapeHtml(product.title)}</a></h3>
          <span class="product-rating">
            <i data-lucide="star"></i>${ratingLabel} · ${isService ? "Verified Service" : `${Number(product.inventory)} in stock`}
          </span>
          <div class="product-price-row">
            <div>
              <span class="product-price">${data().money(product.price)}</span>
              ${product.pricingUnit ? `<small class="product-unit"> ${data().escapeHtml(product.pricingUnit)}</small>` : ""}
              ${product.compareAt ? `<span class="product-compare">${data().money(product.compareAt)}</span>` : ""}
            </div>
            ${isService ? `
              <a class="service-book-mini-btn" href="product-detail.html?id=${encodeURIComponent(product.id)}" aria-label="Book ${data().escapeHtml(product.title)}">
                <i data-lucide="calendar-check"></i> Book
              </a>
            ` : `
              <button class="product-add" type="button" data-add-product="${data().escapeHtml(product.id)}" aria-label="Add ${data().escapeHtml(product.title)} to cart">
                <i data-lucide="plus"></i>
              </button>
            `}
          </div>
        </div>
      </article>
      `;
    }).join("");
    grid.querySelectorAll("img[data-fallback-src]").forEach(image => {
      image.addEventListener("error", () => {
        if (image.dataset.fallbackApplied) return;
        image.dataset.fallbackApplied = "true";
        image.src = image.dataset.fallbackSrc;
      }, { once: true });
    });
    window.lucide?.createIcons();
  }

  function renderCart() {
    const cart = data().getCart();
    const products = data().getProducts();
    const rows = cart.map(item => ({ ...item, product: products.find(product => product.id === item.id) })).filter(item => item.product);
    const count = rows.reduce((sum, item) => sum + item.quantity, 0);
    const total = rows.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
    document.getElementById("cart-count").textContent = count;
    document.getElementById("cart-total").textContent = data().money(total);
    document.getElementById("cart-items").innerHTML = rows.length ? rows.map(item => `
      <div class="cart-item">
        <img src="${data().escapeHtml(item.product.image)}" alt="" />
        <div><strong>${data().escapeHtml(item.product.title)}</strong><small>${item.quantity} × ${data().money(item.product.price)}</small></div>
        <button class="cart-remove" type="button" data-remove-cart="${data().escapeHtml(item.product.id)}" aria-label="Remove item"><i data-lucide="x"></i></button>
      </div>
    `).join("") : `<div class="cart-empty"><i data-lucide="shopping-basket"></i><p>Your cart is empty.</p></div>`;
    window.lucide?.createIcons();
  }

  function setCartOpen(open) {
    const drawer = document.getElementById("store-cart-drawer");
    const backdrop = document.getElementById("cart-drawer-backdrop");
    const trigger = document.getElementById("cart-trigger");
    drawer?.classList.toggle("open", open);
    drawer?.setAttribute("aria-hidden", String(!open));
    trigger?.setAttribute("aria-expanded", String(open));
    if (backdrop) backdrop.hidden = !open;
    document.body.classList.toggle("cart-drawer-open", open);
  }

  document.addEventListener("DOMContentLoaded", async () => {
  await window.MWEPlatform?.ready;
    const category = document.getElementById("store-category");
    [...new Set(data().getProducts().map(product => product.category))].sort().forEach(value => category.insertAdjacentHTML("beforeend", `<option>${data().escapeHtml(value)}</option>`));
    ["store-search", "store-type", "store-category", "store-seller", "store-sort"].forEach(id => document.getElementById(id)?.addEventListener(id === "store-search" ? "input" : "change", renderProducts));
    document.addEventListener("click", event => {
      const add = event.target.closest("[data-add-product]");
      if (add) {
        data().addToCart(add.dataset.addProduct);
        renderCart();
        setCartOpen(true);
        window.MWE?.showMemberToast?.("Added to your cart");
      }
      const remove = event.target.closest("[data-remove-cart]");
      if (remove) {
        data().setCartQuantity(remove.dataset.removeCart, 0);
        renderCart();
      }
    });
    document.getElementById("cart-trigger")?.addEventListener("click", () => setCartOpen(true));
    document.getElementById("cart-close")?.addEventListener("click", () => setCartOpen(false));
    document.getElementById("cart-drawer-backdrop")?.addEventListener("click", () => setCartOpen(false));
    document.addEventListener("keydown", event => { if (event.key === "Escape") setCartOpen(false); });
    document.getElementById("checkout-button")?.addEventListener("click", event => {
      if (data().getCart().length) return;
      event.preventDefault();
      window.MWE?.showMemberToast?.("Your cart is empty");
    });
    renderProducts();
    renderCart();
  });
})();
