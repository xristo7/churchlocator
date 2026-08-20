(function initializeProductDetail() {
  const data = () => window.FaithLinkModules;
  const productId = new URLSearchParams(location.search).get("id");

  function setCartOpen(open) {
    const drawer = document.getElementById("store-cart-drawer");
    const backdrop = document.getElementById("cart-drawer-backdrop");
    drawer?.classList.toggle("open", open);
    drawer?.setAttribute("aria-hidden", String(!open));
    if (backdrop) backdrop.hidden = !open;
  }

  function renderCart() {
    const products = data().getProducts();
    const rows = data().getCart().map(item => ({ ...item, product: products.find(product => product.id === item.id) })).filter(item => item.product);
    const total = rows.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
    document.getElementById("cart-total").textContent = data().money(total);
    document.getElementById("cart-items").innerHTML = rows.map(item => `<div class="cart-item"><img src="${data().escapeHtml(item.product.image)}" alt="" /><div><strong>${data().escapeHtml(item.product.title)}</strong><small>${item.quantity} × ${data().money(item.product.price)}</small></div><button class="cart-remove" type="button" data-remove-cart="${data().escapeHtml(item.product.id)}" aria-label="Remove ${data().escapeHtml(item.product.title)} from cart"><i data-lucide="trash-2"></i></button></div>`).join("");
    window.lucide?.createIcons();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("cart-items")?.addEventListener("click", event => { const remove = event.target.closest("[data-remove-cart]"); if (!remove) return; data().setCartQuantity(remove.dataset.removeCart, 0); renderCart(); });
    const product = data().getProducts().find(item => item.id === productId);
    const container = document.getElementById("product-detail");
    if (!product) {
      container.innerHTML = `<div class="module-empty"><i data-lucide="package-x"></i><strong>Product not found.</strong><a href="store.html">Return to Store</a></div>`;
      window.lucide?.createIcons();
      return;
    }
    document.title = `${product.title} | FaithLink Store`;
    container.innerHTML = `
      <div class="product-gallery">
        <div class="product-main-image"><img id="product-main-image" src="${data().escapeHtml(product.image)}" alt="${data().escapeHtml(product.title)}" /></div>
        <div class="product-thumbnails">
          <button class="active" type="button"><img src="${data().escapeHtml(product.image)}" alt="Front view" /></button>
          <button type="button"><img src="${data().escapeHtml(product.image)}" alt="Detail view" /></button>
          <button type="button"><img src="${data().escapeHtml(product.image)}" alt="Lifestyle view" /></button>
        </div>
      </div>
      <div class="product-detail-copy">
        <span class="product-detail-category">${data().escapeHtml(product.category)} · ${data().escapeHtml(product.sellerType)} seller</span>
        <h1>${data().escapeHtml(product.title)}</h1>
        <div class="product-detail-rating"><span><i data-lucide="star"></i> ${Number(product.rating).toFixed(1)}</span><span>${Number(product.inventory)} available</span></div>
        <div class="product-detail-price"><strong>${data().money(product.price)}</strong>${product.compareAt ? `<del>${data().money(product.compareAt)}</del>` : ""}</div>
        <p class="product-detail-description">${data().escapeHtml(product.description)}</p>
        <ul class="product-detail-features"><li><i data-lucide="badge-check"></i> Sold by verified ${data().escapeHtml(product.sellerType.toLowerCase())}: ${data().escapeHtml(product.seller)}</li><li><i data-lucide="truck"></i> Tracked shipping and secure checkout</li><li><i data-lucide="rotate-ccw"></i> 30-day returns on eligible physical products</li></ul>
        <button class="product-detail-add" id="product-detail-add" type="button"><i data-lucide="shopping-cart"></i> Add to cart</button>
        <div class="product-seller-panel"><div><span>Sold and fulfilled by</span><strong>${data().escapeHtml(product.seller)}</strong></div><button type="button">View seller</button></div>
      </div>`;
    document.getElementById("product-detail-add").addEventListener("click", () => {
      data().addToCart(product.id);
      renderCart();
      setCartOpen(true);
    });
    document.querySelectorAll(".product-thumbnails button").forEach(button => button.addEventListener("click", () => {
      document.querySelectorAll(".product-thumbnails button").forEach(option => option.classList.toggle("active", option === button));
      document.getElementById("product-main-image").src = button.querySelector("img").src;
    }));
    document.getElementById("cart-close")?.addEventListener("click", () => setCartOpen(false));
    document.getElementById("cart-drawer-backdrop")?.addEventListener("click", () => setCartOpen(false));
    renderCart();
    window.lucide?.createIcons();
  });
})();
