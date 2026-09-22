(function initializeCheckout() {
  const data = () => window.MWEStore;
  const discountKey = "faithlink.store.discount.v1";
  const PLACEHOLDER = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=82";
  let currentTotals = { subtotal: 0, shipping: 8, tax: 0, discount: 0, total: 0 };
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

  function fulfillment() {
    // A cart with only digital goods should never ask for a delivery choice.
    const needsShipping = resolvedRows.some(({ product }) => product && product.kind !== "digital");
    const deliveryType = needsShipping
      ? (document.querySelector('input[name="deliveryType"]:checked')?.value || "ship")
      : "digital";
    const shippingMethod = document.querySelector('input[name="shipping"]:checked')?.value || "standard";
    return { needsShipping, deliveryType, shippingMethod };
  }

  function setFieldState(container, enabled) {
    container?.querySelectorAll("input, select, textarea").forEach(field => {
      if (field.dataset.initialRequired == null) field.dataset.initialRequired = String(field.required);
      field.disabled = !enabled;
      field.required = enabled && field.dataset.initialRequired === "true";
    });
  }

  function syncFulfillmentUi() {
    const state = fulfillment();
    const pickup = state.deliveryType === "pickup";
    const deliverySection = document.getElementById("checkout-delivery-section");
    const shippingFields = document.getElementById("shipping-fields");
    const pickupFields = document.getElementById("pickup-fields");
    const shippingMethodSection = document.getElementById("shipping-method-section");

    if (deliverySection) {
      deliverySection.hidden = !state.needsShipping;
      deliverySection.setAttribute("aria-hidden", String(!state.needsShipping));
    }
    shippingFields.hidden = pickup || !state.needsShipping;
    shippingFields.setAttribute("aria-hidden", String(pickup || !state.needsShipping));
    pickupFields.hidden = !pickup;
    pickupFields.setAttribute("aria-hidden", String(!pickup));
    shippingMethodSection.hidden = pickup || !state.needsShipping;
    shippingMethodSection.setAttribute("aria-hidden", String(pickup || !state.needsShipping));
    setFieldState(shippingFields, state.needsShipping && !pickup);
    setFieldState(pickupFields, pickup);
    document.querySelectorAll('input[name="deliveryType"]').forEach(input => { input.disabled = !state.needsShipping; });
    document.querySelectorAll('input[name="shipping"]').forEach(input => { input.disabled = pickup || !state.needsShipping; });
    return state;
  }

  function calculate() {
    const rows = resolvedRows;
    const subtotal = rows.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
    const state = fulfillment();
    const shipping = state.deliveryType === "ship" ? (state.shippingMethod === "express" ? 18 : 8) : 0;
    const discount = localStorage.getItem(discountKey) === "FAITH10" ? subtotal * .1 : 0;
    const tax = Math.max(0, subtotal - discount) * .05;
    currentTotals = { subtotal, shipping, discount, tax, total: subtotal - discount + shipping + tax, fulfillment: state.deliveryType };
    return rows;
  }

  function render() {
    const state = syncFulfillmentUi();
    const rows = calculate();
    const count = rows.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById("checkout-header-count").textContent = count;
    document.getElementById("checkout-order-items").innerHTML = rows.map(item => `<article class="checkout-order-item"><div><img src="${data().escapeHtml(productImage(item.product))}" alt="" /><span>${item.quantity}</span></div><p><strong>${data().escapeHtml(item.product.title)}</strong><small>${data().escapeHtml(item.product.seller)}</small></p><b>${data().money(item.product.price * item.quantity)}</b></article>`).join("");
    document.getElementById("checkout-subtotal").textContent = data().money(currentTotals.subtotal);
    const fulfillmentLabel = document.getElementById("checkout-fulfillment-label");
    if (fulfillmentLabel) fulfillmentLabel.textContent = state.deliveryType === "pickup" ? "Pickup" : state.deliveryType === "digital" ? "Digital delivery" : "Shipping";
    document.getElementById("checkout-shipping").textContent = currentTotals.shipping ? data().money(currentTotals.shipping) : "Free";
    document.getElementById("checkout-tax").textContent = data().money(currentTotals.tax);
    document.getElementById("checkout-discount-row").hidden = !currentTotals.discount;
    document.getElementById("checkout-discount-total").textContent = `−${data().money(currentTotals.discount)}`;
    document.getElementById("checkout-total").textContent = data().money(currentTotals.total);
    document.getElementById("checkout-pay-total").textContent = data().money(currentTotals.total);
    document.getElementById("mobile-order-total").textContent = data().money(currentTotals.total);
    const currency = rows[0]?.product?.currency || "USD";
    document.getElementById("checkout-currency").textContent = currency;
  }

  function showGuestNote() {
    const help = document.querySelector(".checkout-help");
    const guest = !window.MWEPlatform?.session;
    if (help) {
      help.textContent = guest
        ? "Guest sandbox checkout: your cart is on this device. Orders are recorded as pending — no real charge. Sign in anytime to sync cart across devices."
        : "Sandbox checkout is enabled until a payment provider is chosen. Orders are recorded as pending — no real charge is captured.";
    }
    let cta = document.getElementById("checkout-signin-cta");
    if (guest) {
      if (!cta) {
        cta = document.createElement("p");
        cta.id = "checkout-signin-cta";
        cta.style.cssText = "margin:0 0 12px;font-size:.95rem;";
        help?.parentElement?.insertBefore(cta, help);
      }
      cta.innerHTML = `Want a synced server cart? <a href="app.html">Sign in</a> first — or continue below with guest sandbox checkout.`;
    } else if (cta) {
      cta.remove();
    }
  }

  async function syncPaymentAvailability() {
    const payButton = document.querySelector(".checkout-pay-button");
    const help = document.querySelector(".checkout-help");
    try {
      const payment = await data()?.getPaymentSettings?.();
      if (payment?.storeSandboxEnabled) return true;
      if (payButton) {
        payButton.disabled = true;
        payButton.innerHTML = '<i data-lucide="ban"></i> Store checkout unavailable';
      }
      if (help) help.textContent = "Store checkout is currently unavailable because sandbox mode is off. No payment details are collected.";
      window.lucide?.createIcons();
      return false;
    } catch (_) {
      if (payButton) payButton.disabled = true;
      if (help) help.textContent = "Store checkout is temporarily unavailable. No payment details are collected.";
      return false;
    }
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
    try { await window.MWEStore?.ready; } catch (_) {}
    await resolveRows();

    if (!resolvedRows.length) {
      const rawCart = data()?.getCart?.() || [];
      if (rawCart.length) {
        const errorHost = document.getElementById("checkout-form-error") || document.querySelector("main");
        if (errorHost && errorHost.id === "checkout-form-error") {
          errorHost.textContent = "We couldn’t load product details for your cart. Return to the cart and try again, or continue shopping.";
        }
        // Stay on page with message + link instead of silent empty $0 redirect
        const main = document.querySelector("main") || document.body;
        const notice = document.createElement("div");
        notice.className = "module-empty";
        notice.innerHTML = `<strong>Cart items need a moment</strong><p>Your guest cart has ${rawCart.length} line(s), but product details didn’t load.</p><p><a class="button primary" href="cart.html">Back to cart</a> <a class="button ghost" href="store.html">Continue shopping</a></p>`;
        main.prepend(notice);
        return;
      }
      location.href = "cart.html";
      return;
    }

    const payButton = document.querySelector(".checkout-pay-button");
    if (payButton) {
      payButton.disabled = false;
      payButton.innerHTML = `<i data-lucide="lock"></i> Place sandbox order <span id="checkout-pay-total"></span>`;
    }
    showGuestNote();
    await syncPaymentAvailability();

    document.querySelectorAll('input[name="shipping"],input[name="deliveryType"]').forEach(input => input.addEventListener("change", () => {
      render();
    }));
    document.getElementById("checkout-apply-discount")?.addEventListener("click", () => {
      const code = document.getElementById("checkout-discount").value.trim().toUpperCase();
      const message = document.getElementById("checkout-discount-message");
      if (code === "FAITH10") { localStorage.setItem(discountKey, code); message.textContent = "FAITH10 applied — 10% off."; message.className = "discount-message success"; }
      else { localStorage.removeItem(discountKey); message.textContent = "Enter a valid discount code."; message.className = "discount-message error"; }
      render();
    });
    document.getElementById("mobile-order-toggle")?.addEventListener("click", () => document.getElementById("checkout-order-content").classList.toggle("open"));
    document.getElementById("checkout-form")?.addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const errorEl = document.getElementById("checkout-form-error");
      errorEl.textContent = "";
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const state = fulfillment();
      const buyerName = String(fd.get("pickupName") || "").trim() || `${fd.get("firstName") || ""} ${fd.get("lastName") || ""}`.trim() || String(fd.get("email") || "");
      const fulfillmentNotes = state.deliveryType === "pickup"
        ? "delivery=pickup; shipping=not_applicable"
        : state.deliveryType === "digital"
          ? "delivery=digital; shipping=not_applicable"
          : `delivery=ship; shipping=${state.shippingMethod}`;
      payButton && (payButton.disabled = true);
      try {
        const result = await data().placeOrder({
          mode: "sandbox",
          buyerName,
          buyerEmail: String(fd.get("email") || "").trim(),
          email: String(fd.get("email") || "").trim(),
          notes: fulfillmentNotes,
          shipping: state.deliveryType === "ship" ? state.shippingMethod : null,
          deliveryType: state.deliveryType,
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
