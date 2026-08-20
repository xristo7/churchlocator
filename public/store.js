(function initializeStoreModule() {
  const data = () => window.FaithLinkModules;

  function filteredProducts() {
    const query = document.getElementById("store-search")?.value.trim().toLowerCase() || "";
    const category = document.getElementById("store-category")?.value || "all";
    const sellerType = document.getElementById("store-seller")?.value || "all";
    const sort = document.getElementById("store-sort")?.value || "featured";
    const products = data().getProducts().filter(product => {
      const searchable = `${product.title} ${product.seller} ${product.category} ${product.description}`.toLowerCase();
      return product.status === "Active" && (!query || searchable.includes(query)) && (category === "all" || product.category === category) && (sellerType === "all" || product.sellerType === sellerType);
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
    document.getElementById("store-result-count").textContent = `${products.length} product${products.length === 1 ? "" : "s"}`;
    if (!products.length) {
      grid.innerHTML = `<div class="module-empty"><i data-lucide="package-search"></i><strong>No products match your search.</strong><p>Try another category, seller, or keyword.</p></div>`;
      window.lucide?.createIcons();
      return;
    }
    grid.innerHTML = products.map(product => `
      <article class="product-card">
        <div class="product-image-wrap">
          <img class="product-image" src="${data().escapeHtml(product.image)}" alt="${data().escapeHtml(product.title)}" />
          <span class="product-badge">${data().escapeHtml(product.sellerType)} · ${data().escapeHtml(product.category)}</span>
        </div>
        <div class="product-card-body">
          <span class="product-seller">Sold by ${data().escapeHtml(product.seller)}</span>
          <h3>${data().escapeHtml(product.title)}</h3>
          <span class="product-rating"><i data-lucide="star"></i>${Number(product.rating).toFixed(1)} · ${Number(product.inventory)} in stock</span>
          <div class="product-price-row">
            <div><span class="product-price">${data().money(product.price)}</span>${product.compareAt ? `<span class="product-compare">${data().money(product.compareAt)}</span>` : ""}</div>
            <button class="product-add" type="button" data-add-product="${data().escapeHtml(product.id)}" aria-label="Add ${data().escapeHtml(product.title)} to cart"><i data-lucide="plus"></i></button>
          </div>
        </div>
      </article>
    `).join("");
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

  document.addEventListener("DOMContentLoaded", () => {
    const category = document.getElementById("store-category");
    [...new Set(data().getProducts().map(product => product.category))].sort().forEach(value => category.insertAdjacentHTML("beforeend", `<option>${data().escapeHtml(value)}</option>`));
    ["store-search", "store-category", "store-seller", "store-sort"].forEach(id => document.getElementById(id)?.addEventListener(id === "store-search" ? "input" : "change", renderProducts));
    document.addEventListener("click", event => {
      const add = event.target.closest("[data-add-product]");
      if (add) {
        data().addToCart(add.dataset.addProduct);
        renderCart();
        window.MWE?.showMemberToast?.("Added to your cart");
      }
      const remove = event.target.closest("[data-remove-cart]");
      if (remove) {
        data().setCartQuantity(remove.dataset.removeCart, 0);
        renderCart();
      }
    });
    document.getElementById("checkout-button")?.addEventListener("click", () => {
      if (!data().getCart().length) {
        window.MWE?.showMemberToast?.("Your cart is empty");
        return;
      }
      data().saveCart([]);
      renderCart();
      window.MWE?.showMemberToast?.("Order placed successfully");
    });
    renderProducts();
    renderCart();
  });
})();
