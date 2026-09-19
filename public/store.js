(function initializeStoreModule() {
  const data = () => window.MWEStore;
  const PLACEHOLDER = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=82";
  const productImage = (p) => p?.image || p?.imageUrl || PLACEHOLDER;

  function filteredProducts() {
    const query = document.getElementById("store-search")?.value.trim().toLowerCase() || "";
    const type = document.getElementById("store-type")?.value || "all";
    const category = document.getElementById("store-category")?.value || "all";
    const sellerType = document.getElementById("store-seller")?.value || "all";
    const sort = document.getElementById("store-sort")?.value || "featured";
    const all = data().getProducts();
    const hasCategories = all.some(p => p.category);
    const hasSellerTypes = all.some(p => p.sellerType);
    const hasRatings = all.some(p => Number(p.rating) > 0);
    const hasFeatured = all.some(p => p.featured);
    const products = all.filter(product => {
      if (type === "products" && product.itemType === "service") return false;
      if (type === "services" && product.itemType !== "service") return false;
      const searchable = `${product.title} ${product.seller} ${product.category || ""} ${product.description}`.toLowerCase();
      if (product.status !== "Active") return false;
      if (query && !searchable.includes(query)) return false;
      if (hasCategories && category !== "all" && product.category !== category) return false;
      if (hasSellerTypes && sellerType !== "all" && product.sellerType !== sellerType) return false;
      return true;
    });
    return products.sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "rating" && hasRatings) return b.rating - a.rating;
      if (hasFeatured) return Number(b.featured) - Number(a.featured);
      return String(a.title || "").localeCompare(String(b.title || ""));
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
      const emptyCatalog = !(data().getProducts() || []).length;
      grid.innerHTML = emptyCatalog
        ? `<div class="module-empty"><i data-lucide="store"></i><strong>No published products yet.</strong><p>When sellers publish through the workspace or store API, offerings will appear here.</p></div>`
        : `<div class="module-empty"><i data-lucide="package-search"></i><strong>No items match your search.</strong><p>Try another category, seller type, or keyword.</p></div>`;
      window.lucide?.createIcons();
      return;
    }
    grid.innerHTML = products.map(product => {
      const isService = product.itemType === "service";
      return `
      <article class="product-card ${isService ? "service-card-item" : ""}">
        <a class="product-image-wrap" href="product-detail.html?id=${encodeURIComponent(product.id)}" aria-label="View ${data().escapeHtml(product.title)}">
          <img class="product-image" src="${data().escapeHtml(productImage(product))}" alt="${data().escapeHtml(product.title)}" />
          <span class="product-badge ${isService ? "service-badge-pill" : ""}">${isService ? `<i data-lucide="sparkles"></i> Service · ` : ""}${data().escapeHtml(product.sellerType)} · ${data().escapeHtml(product.category)}</span>
        </a>
        <button class="content-love-button content-love-overlay" type="button" data-love-type="product" data-love-id="${data().escapeHtml(product.id)}" aria-pressed="false"><i data-lucide="heart"></i><span data-love-count>0</span></button>
        <div class="product-card-body">
          <span class="product-seller">${data().escapeHtml(product.sellerType)}: <strong>${data().escapeHtml(product.seller)}</strong></span>
          <h3><a href="product-detail.html?id=${encodeURIComponent(product.id)}">${data().escapeHtml(product.title)}</a></h3>
          <span class="product-rating">
            <i data-lucide="star"></i>${Number(product.rating).toFixed(1)} · ${isService ? "Verified Service" : `${Number(product.inventory)} in stock`}
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
        <img src="${data().escapeHtml(productImage(item.product))}" alt="" />
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
  await window.MWEStore?.ready;
    const category = document.getElementById("store-category");
    [...new Set(data().getProducts().map(product => product.category).filter(Boolean))].sort().forEach(value => category.insertAdjacentHTML("beforeend", `<option>${data().escapeHtml(value)}</option>`));
    ["store-search", "store-type", "store-category", "store-seller", "store-sort"].forEach(id => document.getElementById(id)?.addEventListener(id === "store-search" ? "input" : "change", renderProducts));
    document.addEventListener("click", event => {
      const add = event.target.closest("[data-add-product]");
      if (add) {
        Promise.resolve(data().addToCart(add.dataset.addProduct)).then(() => {
          renderCart();
          setCartOpen(true);
          window.MWE?.showMemberToast?.("Added to your cart");
        }).catch(err => window.MWE?.showMemberToast?.(err.message || "Could not update cart"));
      }
      const remove = event.target.closest("[data-remove-cart]");
      if (remove) {
        Promise.resolve(data().setCartQuantity(remove.dataset.removeCart, 0)).then(() => renderCart())
          .catch(err => window.MWE?.showMemberToast?.(err.message || "Could not update cart"));
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
