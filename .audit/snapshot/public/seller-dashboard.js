(function initializeSellerDashboard() {
  const data = () => window.FaithLinkModules;
  const fallbackImage = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=82";

  function render() {
    if (!data()) return;
    const query = document.getElementById("seller-product-search")?.value.trim().toLowerCase() || "";
    const allProducts = data().getProducts();
    const products = allProducts.filter(product => !query || `${product.title} ${product.seller} ${product.category}`.toLowerCase().includes(query));
    const savedOrders = JSON.parse(localStorage.getItem("faithlink.store.orders.v1") || "[]");
    document.getElementById("seller-active-products").textContent = allProducts.filter(product => product.status === "Active").length;
    document.getElementById("seller-low-stock").textContent = allProducts.filter(product => Number(product.inventory) < 20).length;
    document.getElementById("seller-sales").textContent = data().money(allProducts.reduce((sum, product) => sum + Number(product.price) * Math.min(Number(product.inventory), 6), 0));
    document.getElementById("seller-order-count").textContent = 38 + savedOrders.length;
    const recentOrders = savedOrders.slice(0, 5).map(order => ({ id: order.id, customer: order.email, items: order.items.reduce((sum, item) => sum + item.quantity, 0), total: order.totals.total, fulfillment: `${order.status} · ${order.fulfillment}` }));
    recentOrders.push({ id: "FL-1048", customer: "Sarah Johnson", items: 2, total: 70, fulfillment: "Paid · Unfulfilled" }, { id: "FL-1047", customer: "Michael T.", items: 1, total: 32, fulfillment: "Shipped" }, { id: "FL-1046", customer: "Amanda Rose", items: 3, total: 94, fulfillment: "Delivered" });
    document.getElementById("seller-orders-body").innerHTML = recentOrders.slice(0, 8).map(order => `<tr><td><strong>#${data().escapeHtml(order.id)}</strong></td><td>${data().escapeHtml(order.customer)}</td><td>${order.items} product${order.items === 1 ? "" : "s"}</td><td>${data().money(order.total)}</td><td><span class="status-pill">${data().escapeHtml(order.fulfillment)}</span></td></tr>`).join("");
    document.getElementById("seller-products-body").innerHTML = products.length ? products.map(product => `
      <tr>
        <td><div class="seller-product"><img src="${data().escapeHtml(product.image)}" alt="" /><div><strong>${data().escapeHtml(product.title)}</strong><br /><small>${data().escapeHtml(product.category)}</small></div></div></td>
        <td>${data().escapeHtml(product.seller)}<br /><small>${data().escapeHtml(product.sellerType)}</small></td>
        <td><span class="status-pill ${product.status === "Draft" ? "draft" : ""}">${data().escapeHtml(product.status)}</span></td>
        <td><strong>${data().money(product.price)}</strong></td>
        <td>${Number(product.inventory)} units</td>
        <td><div class="seller-row-actions"><button type="button" data-edit-product="${data().escapeHtml(product.id)}" aria-label="Edit"><i data-lucide="pencil"></i></button><button class="danger" type="button" data-delete-product="${data().escapeHtml(product.id)}" aria-label="Delete"><i data-lucide="trash-2"></i></button></div></td>
      </tr>
    `).join("") : `<tr><td colspan="6"><div class="module-empty">No products match your search.</div></td></tr>`;
    window.lucide?.createIcons();
  }

  function openEditor(product = null) {
    const modal = document.getElementById("product-editor-modal");
    const form = document.getElementById("product-editor-form");
    form.reset();
    document.getElementById("product-editor-title").textContent = product ? "Edit product" : "Add product";
    if (product) {
      Object.entries(product).forEach(([key, value]) => {
        const input = form.elements.namedItem(key);
        if (input) input.value = value ?? "";
      });
    }
    modal.classList.add("is-open");
    window.setTimeout(() => form.elements.namedItem("title")?.focus(), 50);
  }

  function closeEditor() {
    document.getElementById("product-editor-modal")?.classList.remove("is-open");
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("seller-product-search")?.addEventListener("input", render);
    document.getElementById("add-product-button")?.addEventListener("click", () => openEditor());
    document.querySelector("#product-editor-modal .module-modal-close")?.addEventListener("click", closeEditor);
    document.getElementById("product-editor-modal")?.addEventListener("click", event => { if (event.target.id === "product-editor-modal") closeEditor(); });
    document.addEventListener("click", event => {
      const edit = event.target.closest("[data-edit-product]");
      if (edit) openEditor(data().getProducts().find(product => product.id === edit.dataset.editProduct));
      const remove = event.target.closest("[data-delete-product]");
      if (remove && window.confirm("Remove this product from your catalog?")) {
        data().removeProduct(remove.dataset.deleteProduct);
        render();
        window.MWE?.showMemberToast?.("Product removed");
      }
    });
    document.getElementById("product-editor-form")?.addEventListener("submit", event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const existing = data().getProducts().find(product => product.id === values.id);
      data().upsertProduct({
        ...existing,
        ...values,
        price: Number(values.price),
        inventory: Number(values.inventory),
        compareAt: Number(existing?.compareAt || 0),
        rating: Number(existing?.rating || 0),
        featured: Boolean(existing?.featured),
        image: values.image || fallbackImage
      });
      closeEditor();
      render();
      window.MWE?.showMemberToast?.("Product saved to your catalog");
    });
    render();
  });
})();
