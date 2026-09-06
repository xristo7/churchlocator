(function initializeCheckout() {
  const data = () => window.FaithLinkModules;
  const discountKey = "faithlink.store.discount.v1";
  const ordersKey = "faithlink.store.orders.v1";
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

  document.addEventListener("DOMContentLoaded", () => {
    if (!cartRows().length) { location.href = "cart.html"; return; }
    document.querySelectorAll(".accelerated-checkout .accelerated").forEach(button => button.addEventListener("click", () => {
      const usePayPal = button.classList.contains("paypal");
      const payment = document.querySelector(`input[name="payment"][value="${usePayPal ? "paypal" : "card"}"]`);
      if (payment) {
        payment.checked = true;
        payment.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const message = document.getElementById("checkout-form-error");
      message.textContent = `${usePayPal ? "PayPal" : button.classList.contains("google") ? "Google Pay" : "Shop Pay"} selected. Complete your contact and delivery details to continue in this local preview.`;
      document.querySelector('#checkout-form input[name="email"]')?.focus();
    }));
    document.querySelectorAll('input[name="shipping"],input[name="deliveryType"]').forEach(input => input.addEventListener("change", () => {
      const pickup = document.querySelector('input[name="deliveryType"]:checked')?.value === "pickup";
      document.getElementById("shipping-fields").classList.toggle("checkout-fields-disabled", pickup);
      document.getElementById("shipping-fields").querySelectorAll("[required]").forEach(field => field.required = !pickup);
      render();
    }));
    document.querySelectorAll('input[name="payment"]').forEach(input => input.addEventListener("change", () => {
      const useCard = document.querySelector('input[name="payment"]:checked')?.value === "card";
      document.querySelector(".payment-fields").classList.toggle("checkout-fields-disabled", !useCard);
      document.querySelectorAll(".payment-fields input").forEach(field => field.required = useCard);
    }));
    document.getElementById("checkout-apply-discount").addEventListener("click", () => {
      const code = document.getElementById("checkout-discount").value.trim().toUpperCase();
      const message = document.getElementById("checkout-discount-message");
      if (code === "FAITH10") { localStorage.setItem(discountKey, code); message.textContent = "FAITH10 applied — 10% off."; message.className = "discount-message success"; }
      else { localStorage.removeItem(discountKey); message.textContent = "Enter a valid discount code."; message.className = "discount-message error"; }
      render();
    });
    document.getElementById("mobile-order-toggle").addEventListener("click", () => document.getElementById("checkout-order-content").classList.toggle("open"));
    document.getElementById("checkout-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = event.currentTarget;
      const error = document.getElementById("checkout-form-error");
      if (!form.checkValidity()) { form.reportValidity(); error.textContent = "Please complete the required checkout information."; return; }
      const fields = Object.fromEntries(new FormData(form));
      if (fields.payment === "card" && !/^\d[\d ]{14,18}\d$/.test(fields.cardNumber || "")) { error.textContent = "Enter a valid test card number."; form.elements.cardNumber.focus(); return; }
      const order = { id: `FL-${Date.now().toString().slice(-7)}`, createdAt: new Date().toISOString(), email: fields.email, items: cartRows(), totals: currentTotals, status: "Paid", fulfillment: "Unfulfilled" };
      const orders = JSON.parse(localStorage.getItem(ordersKey) || "[]"); orders.unshift(order); localStorage.setItem(ordersKey, JSON.stringify(orders));
      data().saveCart([]); localStorage.removeItem(discountKey);
      document.getElementById("success-order-number").textContent = `#${order.id}`;
      document.getElementById("success-email").textContent = order.email;
      document.getElementById("checkout-success").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.lucide?.createIcons();
    });
    render(); window.lucide?.createIcons();
  });
})();
