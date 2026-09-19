(function initializeCheckout() {
  const data = () => window.MWEStore;
  const discountKey = "faithlink.store.discount.v1";
  let currentTotals = { subtotal: 0, shipping: 8, tax: 0, discount: 0, total: 0 };

  function cartRows() {
    const products = data().getProducts();
    return data().getCart().map(item => ({ ...item, product: products.find(product => product.id === item.id) })).filter(item => item.product);
  }

  function calculate() {
    const rows = cartRows();
    const subtotal = rows.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
    const shippingMethod = document.querySelector('input[name="shipping"]:checked')?.value || "standard";
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value || "ship";
    const shipping = deliveryType === "pickup" ? 0 : shippingMethod === "express" ? 18 : 8;
    const discount = localStorage.getItem(discountKey) === "FAITH10" ? subtotal * .1 : 0;
    const tax = Math.max(0, subtotal - discount) * .05;
    currentTotals = { subtotal, shipping, discount, tax, total: subtotal - discount + shipping + tax };
    return rows;
  }

  function render() {
    const rows = calculate();
    const count = rows.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById("checkout-header-count").textContent = count;
    document.getElementById("checkout-order-items").innerHTML = rows.map(item => `<article class="checkout-order-item"><div><img src="${data().escapeHtml(item.product.image)}" alt="" /><span>${item.quantity}</span></div><p><strong>${data().escapeHtml(item.product.title)}</strong><small>${data().escapeHtml(item.product.seller)}</small></p><b>${data().money(item.product.price * item.quantity)}</b></article>`).join("");
    document.getElementById("checkout-subtotal").textContent = data().money(currentTotals.subtotal);
    document.getElementById("checkout-shipping").textContent = currentTotals.shipping ? data().money(currentTotals.shipping) : "Free";
    document.getElementById("checkout-tax").textContent = data().money(currentTotals.tax);
    document.getElementById("checkout-discount-row").hidden = !currentTotals.discount;
    document.getElementById("checkout-discount-total").textContent = `−${data().money(currentTotals.discount)}`;
    document.getElementById("checkout-total").textContent = data().money(currentTotals.total);
    document.getElementById("checkout-pay-total").textContent = data().money(currentTotals.total);
    document.getElementById("mobile-order-total").textContent = data().money(currentTotals.total);
  }

  function showSuccess(result) {
    const order = result.order || {};
    const orderId = order.orderRef || order.id || "SANDBOX";
    document.getElementById("checkout-form")?.closest(".checkout-form-column")?.setAttribute("hidden", "");
    document.querySelector(".checkout-summary-column")?.setAttribute("hidden", "");
    const panel = document.getElementById("checkout-success");
    if (!panel) return;
    panel.hidden = false;
    document.getElementById("success-order-number").textContent = orderId;
    document.getElementById("success-email").textContent = order.buyerEmail || order.email || "";
    const note = panel.querySelector("[data-sandbox-note]") || document.createElement("p");
    note.setAttribute("data-sandbox-note", "");
    note.innerHTML = result.sandbox
      ? `<strong>Sandbox / pending:</strong> ${data().escapeHtml(result.message || "No payment was captured. A payment provider has not been configured yet.")}`
      : data().escapeHtml(result.message || "");
    if (!note.parentElement) panel.querySelector("div")?.appendChild(note);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await window.MWEStore?.ready;
    if (!cartRows().length) { location.href = "cart.html"; return; }

    const payButton = document.querySelector(".checkout-pay-button");
    if (payButton) {
      payButton.disabled = false;
      payButton.innerHTML = `<i data-lucide="lock"></i> Place sandbox order <span id="checkout-pay-total"></span>`;
    }
    const help = document.querySelector(".checkout-help");
    if (help) {
      help.textContent = "Sandbox checkout is enabled until a payment provider is chosen. Orders are recorded as pending — no real charge is captured.";
    }

    document.querySelectorAll(".accelerated-checkout .accelerated").forEach(button => button.addEventListener("click", () => {
      const message = document.getElementById("checkout-form-error");
      message.textContent = "Express wallets need a payment provider. Use Place sandbox order below for a pending demo order.";
      document.querySelector('#checkout-form input[name="email"]')?.focus();
    }));
    document.querySelectorAll('input[name="shipping"],input[name="deliveryType"]').forEach(input => input.addEventListener("change", () => {
      const pickup = document.querySelector('input[name="deliveryType"]:checked')?.value === "pickup";
      document.getElementById("shipping-fields").classList.toggle("checkout-fields-disabled", pickup);
      document.getElementById("shipping-fields").querySelectorAll("[required]").forEach(field => field.required = !pickup);
      render();
    }));
    document.getElementById("checkout-apply-discount").addEventListener("click", () => {
      const code = document.getElementById("checkout-discount").value.trim().toUpperCase();
      const message = document.getElementById("checkout-discount-message");
      if (code === "FAITH10") { localStorage.setItem(discountKey, code); message.textContent = "FAITH10 applied — 10% off."; message.className = "discount-message success"; }
      else { localStorage.removeItem(discountKey); message.textContent = "Enter a valid discount code."; message.className = "discount-message error"; }
      render();
    });
    document.getElementById("mobile-order-toggle").addEventListener("click", () => document.getElementById("checkout-order-content").classList.toggle("open"));
    document.getElementById("checkout-form").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const errorEl = document.getElementById("checkout-form-error");
      errorEl.textContent = "";
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const buyerName = `${fd.get("firstName") || ""} ${fd.get("lastName") || ""}`.trim() || String(fd.get("email") || "");
      payButton && (payButton.disabled = true);
      try {
        const result = await data().placeOrder({
          mode: "sandbox",
          buyerName,
          buyerEmail: String(fd.get("email") || "").trim(),
          email: String(fd.get("email") || "").trim(),
          notes: `delivery=${fd.get("deliveryType") || "ship"}; shipping=${fd.get("shipping") || "standard"}`,
          shipping: fd.get("shipping"),
          deliveryType: fd.get("deliveryType"),
          totals: { ...currentTotals }
        });
        showSuccess(result);
        window.MWE?.showMemberToast?.(result.message || "Sandbox order recorded");
      } catch (error) {
        errorEl.textContent = error.message || "Checkout failed.";
        if (payButton) payButton.disabled = false;
      }
    });
    render(); window.lucide?.createIcons();
  });
})();
