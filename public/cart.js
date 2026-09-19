(function initializeCartPage() {
  const data = () => window.MWEStore;
  const discountKey = "faithlink.store.discount.v1";
  const PLACEHOLDER = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=82";
  let resolvedRows = [];

  function productImage(product) {
    return product?.image || product?.imageUrl || PLACEHOLDER;
  }

  async function resolveRows() {
    if (!data()) return [];
    if (data().resolveCartRows) {
      resolvedRows = await data().resolveCartRows();
      return resolvedRows;
    }
    await data().refreshProducts?.({ includeDrafts: false });
    await data().refreshCart?.();
    const products = data().getProducts?.() || [];
    const cart = data().getCart?.() || [];
    const rows = [];
    for (const item of cart) {
      let product = products.find(p => p.id === item.id);
      if (!product && data().getProduct) product = await data().getProduct(item.id);
      if (product) rows.push({ ...item, product });
    }
    resolvedRows = rows;
    return rows;
  }

  function isGuest() {
    return !window.MWEPlatform?.session;
  }

  function renderGuestBanner() {
    let banner = document.getElementById("cart-guest-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "cart-guest-banner";
      banner.setAttribute("role", "status");
      banner.style.cssText = "margin:12px 0 18px;padding:12px 16px;border-radius:12px;background:rgba(91,75,219,.08);border:1px solid rgba(91,75,219,.25);font-size:.95rem;";
      const host = document.querySelector(".cart-page-items, .module-shell, main") || document.body;
      host.prepend(banner);
    }
    if (isGuest()) {
      banner.hidden = false;
      banner.innerHTML = `<strong>Guest cart</strong> — saved on this device only. <a href="app.html">Sign in</a> to sync your cart across devices and use the server checkout. Sandbox checkout still works as a guest.`;
    } else {
      banner.hidden = true;
      banner.textContent = "";
    }
  }

  function render() {
    const items = resolvedRows;
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
    const discount = localStorage.getItem(discountKey) === "FAITH10" ? subtotal * .1 : 0;
    const cur = data()?.currency || "USD";
    document.getElementById("cart-page-count").textContent = `${count} item${count === 1 ? "" : "s"}`;
    document.getElementById("cart-subtotal").textContent = data().money(subtotal);
    document.getElementById("cart-estimated-total").textContent = `${data().money(subtotal - discount)} ${cur}`;
    document.getElementById("proceed-checkout")?.classList.toggle("disabled", !items.length);
    const list = document.getElementById("cart-page-items");
    if (!list) return;
    list.innerHTML = items.length ? items.map(item => `
      <article class="cart-page-item">
        <a href="product-detail.html?id=${encodeURIComponent(item.product.id)}"><img src="${data().escapeHtml(productImage(item.product))}" alt="${data().escapeHtml(item.product.title)}" /></a>
        <div class="cart-page-product"><span>${data().escapeHtml(item.product.seller)}</span><h3><a href="product-detail.html?id=${encodeURIComponent(item.product.id)}">${data().escapeHtml(item.product.title)}</a></h3><small>${data().escapeHtml(item.product.category || item.product.kind || "")}</small><button type="button" data-cart-remove="${data().escapeHtml(item.product.id)}">Remove</button></div>
        <label class="cart-quantity"><span class="sr-only">Quantity for ${data().escapeHtml(item.product.title)}</span><button type="button" data-cart-decrease="${data().escapeHtml(item.product.id)}">−</button><input type="number" min="1" max="99" value="${item.quantity}" data-cart-quantity="${data().escapeHtml(item.product.id)}" /><button type="button" data-cart-increase="${data().escapeHtml(item.product.id)}">+</button></label>
        <strong>${data().money(item.product.price * item.quantity)}</strong><button class="cart-page-delete" type="button" data-cart-remove="${data().escapeHtml(item.product.id)}" aria-label="Delete ${data().escapeHtml(item.product.title)} from cart"><i data-lucide="trash-2"></i></button>
      </article>`).join("") : `<div class="cart-page-empty"><i data-lucide="shopping-bag"></i><h2>Your cart is empty</h2><p>Explore products from churches and Christian creators.</p><a href="store.html">Continue shopping</a></div>`;
    renderGuestBanner();
    window.lucide?.createIcons();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try { await window.MWEStore?.ready; } catch (_) {}
    await resolveRows();
    document.addEventListener("click", event => {
      const remove = event.target.closest("[data-cart-remove]");
      const increase = event.target.closest("[data-cart-increase]");
      const decrease = event.target.closest("[data-cart-decrease]");
      const run = (promise) => Promise.resolve(promise).then(() => resolveRows()).then(() => render()).catch(err => window.MWE?.showMemberToast?.(err.message || "Could not update cart"));
      if (remove) run(data().setCartQuantity(remove.dataset.cartRemove, 0));
      if (increase) { const item = data().getCart().find(row => row.id === increase.dataset.cartIncrease); if (item) run(data().setCartQuantity(item.id, item.quantity + 1)); }
      if (decrease) { const item = data().getCart().find(row => row.id === decrease.dataset.cartDecrease); if (item) run(data().setCartQuantity(item.id, item.quantity - 1)); }
    });
    document.addEventListener("change", event => {
      if (!event.target.matches("[data-cart-quantity]")) return;
      Promise.resolve(data().setCartQuantity(event.target.dataset.cartQuantity, event.target.value)).then(() => resolveRows()).then(() => render())
        .catch(err => window.MWE?.showMemberToast?.(err.message || "Could not update cart"));
    });
    document.getElementById("apply-discount")?.addEventListener("click", () => {
      const code = document.getElementById("cart-discount").value.trim().toUpperCase();
      const message = document.getElementById("discount-message");
      if (code === "FAITH10") { localStorage.setItem(discountKey, code); message.textContent = "FAITH10 applied — 10% off."; message.className = "discount-message success"; }
      else { localStorage.removeItem(discountKey); message.textContent = "Enter a valid discount code."; message.className = "discount-message error"; }
      render();
    });
    document.getElementById("proceed-checkout")?.addEventListener("click", event => {
      if (!resolvedRows.length) event.preventDefault();
    });
    render();
  });
})();
