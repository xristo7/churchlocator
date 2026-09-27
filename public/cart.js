(function initializeCartPage() {
  const data = () => window.MWEStore || window.FaithLinkModules;
  const discountKey = "faithlink.store.discount.v1";
  let visibleRows = [];

  async function rows() {
    await data().refreshProducts?.({ includeDrafts: false });
    await data().refreshCart?.();
    const products = data().getProducts();
    const resolved = [];
    for (const item of data().getCart()) {
      const product = products.find(row => row.id === item.id) || await data().getProduct?.(item.id);
      if (product) resolved.push({ ...item, product });
    }
    return resolved;
  }

  async function render() {
    const items = await rows();
    visibleRows = items;
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
    const discount = localStorage.getItem(discountKey) === "FAITH10" ? subtotal * .1 : 0;
    document.getElementById("cart-page-count").textContent = `${count} item${count === 1 ? "" : "s"}`;
    document.getElementById("cart-subtotal").textContent = data().money(subtotal);
    document.getElementById("cart-estimated-total").textContent = `${data().money(subtotal - discount)} CAD`;
    document.getElementById("proceed-checkout").classList.toggle("disabled", !items.length);
    document.getElementById("cart-page-items").innerHTML = items.length ? items.map(item => `
      <article class="cart-page-item">
        <a href="product-detail.html?id=${encodeURIComponent(item.product.id)}"><img src="${data().escapeHtml(item.product.image)}" alt="${data().escapeHtml(item.product.title)}" /></a>
        <div class="cart-page-product"><span>${data().escapeHtml(item.product.seller)}</span><h3><a href="product-detail.html?id=${encodeURIComponent(item.product.id)}">${data().escapeHtml(item.product.title)}</a></h3><small>${data().escapeHtml(item.product.category)}</small><button type="button" data-cart-remove="${data().escapeHtml(item.product.id)}">Remove</button></div>
        <label class="cart-quantity"><span class="sr-only">Quantity for ${data().escapeHtml(item.product.title)}</span><button type="button" data-cart-decrease="${data().escapeHtml(item.product.id)}">−</button><input type="number" min="1" max="99" value="${item.quantity}" data-cart-quantity="${data().escapeHtml(item.product.id)}" /><button type="button" data-cart-increase="${data().escapeHtml(item.product.id)}">+</button></label>
        <strong>${data().money(item.product.price * item.quantity)}</strong><button class="cart-page-delete" type="button" data-cart-remove="${data().escapeHtml(item.product.id)}" aria-label="Delete ${data().escapeHtml(item.product.title)} from cart"><i data-lucide="trash-2"></i></button>
      </article>`).join("") : `<div class="cart-page-empty"><i data-lucide="shopping-bag"></i><h2>Your cart is empty</h2><p>Explore products from churches and Christian creators.</p><a href="store.html">Continue shopping</a></div>`;
    window.lucide?.createIcons();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await window.MWEPlatform?.ready;
    try { await window.MWEStore?.ready; } catch (_) {}
    document.addEventListener("click", async event => {
      const remove = event.target.closest("[data-cart-remove]");
      const increase = event.target.closest("[data-cart-increase]");
      const decrease = event.target.closest("[data-cart-decrease]");
      try {
        if (remove) await data().setCartQuantity(remove.dataset.cartRemove, 0);
        if (increase) { const item = data().getCart().find(row => row.id === increase.dataset.cartIncrease); if (item) await data().setCartQuantity(item.id, item.quantity + 1); }
        if (decrease) { const item = data().getCart().find(row => row.id === decrease.dataset.cartDecrease); if (item) await data().setCartQuantity(item.id, item.quantity - 1); }
        if (remove || increase || decrease) await render();
      } catch (error) { window.MWE?.showMemberToast?.(error.message || "Unable to update your cart"); }
    });
    document.addEventListener("change", async event => {
      if (!event.target.matches("[data-cart-quantity]")) return;
      try { await data().setCartQuantity(event.target.dataset.cartQuantity, event.target.value); await render(); } catch (error) { window.MWE?.showMemberToast?.(error.message || "Unable to update your cart"); }
    });
    document.getElementById("apply-discount").addEventListener("click", () => {
      const code = document.getElementById("cart-discount").value.trim().toUpperCase();
      const message = document.getElementById("discount-message");
      if (code === "FAITH10") { localStorage.setItem(discountKey, code); message.textContent = "FAITH10 applied — 10% off."; message.className = "discount-message success"; }
      else { localStorage.removeItem(discountKey); message.textContent = "Enter a valid discount code."; message.className = "discount-message error"; }
      void render();
    });
    document.getElementById("proceed-checkout").addEventListener("click", event => { if (!visibleRows.length) event.preventDefault(); });
    await render();
  });
})();
