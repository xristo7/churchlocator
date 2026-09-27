/* Owner dashboard: "Store management" view (#store-admin). Uses the runtime registry from
   admin-commerce-reports.js. Routes (src/store.js, owner only):
   GET /api/store/admin/overview, GET /api/store/admin/products?status=, PATCH /api/store/admin/products/:id {status},
   GET /api/store/admin/sellers, PATCH /api/store/admin/sellers/:id {status},
   GET /api/store/admin/orders, PATCH /api/store/admin/orders/:id {status}, GET /api/store/admin/donations */
(function () {
  "use strict";
  const registry = window.MWEOwnerViews;
  if (!registry) return;
  const state = { tab: "products", productStatus: "" };
  const tabs = [["products", "Products"], ["sellers", "Sellers"], ["orders", "Orders"], ["donations", "Donations"]];
  const actionsFor = {
    products: row => [row.status !== "published" && ["published", "Publish"], row.status !== "archived" && ["archived", "Archive"]],
    sellers: row => [row.status !== "active" && ["active", "Activate"], row.status !== "suspended" && ["suspended", "Suspend"]],
    orders: row => [["pending", "paid"].includes(row.status) && ["fulfilled", "Fulfill"], ["pending", "paid"].includes(row.status) && ["cancelled", "Cancel"]],
    donations: () => []
  };
  const confirmText = {
    "products:archived": "Archive this product? It will be removed from the storefront.",
    "sellers:suspended": "Suspend this seller?",
    "orders:cancelled": "Cancel this order?",
    "orders:fulfilled": "Mark this order as fulfilled?"
  };

  async function render(root, ctx) {
    const { api, esc, icon, money, badge, panel, errorPanel, drawIcons, notice } = ctx;
    const view = root;
    root = document.createElement("div");
    view.replaceChildren(root);
    root.innerHTML = '<section class="aw-panel"><div class="aw-panel-heading"><div><h2>Loading store management…</h2><p>Products, sellers, orders and donations.</p></div></div></section>';
    try {
      const productPath = "store/admin/products" + (state.productStatus ? "?status=" + encodeURIComponent(state.productStatus) : "");
      const [overview, products, sellers, orders, donations] = await Promise.all([
        api("store/admin/overview"), api(productPath), api("store/admin/sellers"), api("store/admin/orders"), api("store/admin/donations")
      ]);
      if (!root.isConnected) return;
      const m = overview.metrics || {};
      const metric = (label, value, note, symbol) => '<div class="aw-metric"><div class="aw-metric-label">' + esc(label) + icon(symbol) + '</div><strong>' + esc(String(value ?? 0)) + '</strong><small>' + esc(note) + '</small></div>';
      const metrics = '<div class="aw-metrics">' + [
        metric("Published products", m.publishedProducts, "Visible in the storefront", "package"),
        metric("Active sellers", m.activeSellers, "Approved storefronts", "store"),
        metric("Paid orders", m.paidOrders, money(m.orderRevenueCents) + " paid or fulfilled", "shopping-cart"),
        metric("Donations", m.donations, money(m.donationTotalCents) + " all records", "heart")
      ].join("") + '</div>';
      const actions = (kind, row) => '<div class="owc-actions">' + actionsFor[kind](row).filter(Boolean).map(([status, label]) => '<button type="button" class="aw-button" data-owc-kind="' + kind + '" data-owc-id="' + esc(row.id) + '" data-owc-status="' + status + '" data-owc-pending="' + (row.status === "pending" ? "1" : "") + '">' + esc(label) + '</button>').join("") + '</div>';
      const date = value => esc(value ? new Date(value).toLocaleString() : "");
      const table = (kind, heads, rows, empty, before = "") => '<div class="aw-tab-panel' + (state.tab === kind ? " is-active" : "") + '" data-owc-panel="' + kind + '">' + before + '<div class="aw-table-scroll"><table><thead><tr>' + heads.map(h => '<th>' + h + '</th>').join("") + '</tr></thead><tbody>' + (rows || '<tr><td colspan="' + heads.length + '"><div class="aw-empty compact"><h3>' + esc(empty) + '</h3></div></td></tr>') + '</tbody></table></div></div>';
      const productFilter = '<div class="aw-filters"><label>Product status<select data-owc-product-status><option value="">All statuses</option>' + ["draft", "pending", "published", "archived"].map(s => '<option value="' + s + '"' + (state.productStatus === s ? " selected" : "") + '>' + ctx.cap(s) + '</option>').join("") + '</select></label></div>';
      const productRows = (products.products || []).map(p => '<tr><td><strong>' + esc(p.title) + '</strong><small>' + esc(p.kind || "product") + ' · ' + esc(p.slug) + '</small></td><td>' + esc(p.sellerName || p.sellerId) + '</td><td>' + esc(money(Math.round(Number(p.price || 0) * 100), p.currency)) + (p.compareAt != null ? '<small>Was ' + esc(money(Math.round(Number(p.compareAt) * 100), p.currency)) + '</small>' : "") + '</td><td>' + badge(p.status) + (p.inventoryTracked ? '<small>' + esc(String(p.stockQty ?? 0)) + ' in stock</small>' : "") + '</td><td>' + actions("products", p) + '</td></tr>').join("");
      const sellerRows = (sellers.sellers || []).map(s => '<tr><td><strong>' + esc(s.displayName) + '</strong><small>' + esc(s.slug) + '</small></td><td>' + esc(s.churchId || "Independent") + '</td><td>' + badge(s.status) + '</td><td>' + date(s.updatedAt) + '</td><td>' + actions("sellers", s) + '</td></tr>').join("");
      const orderRows = (orders.orders || []).map(o => '<tr><td><strong>' + esc(o.orderRef) + '</strong><small>' + date(o.createdAt) + '</small></td><td>' + esc(o.buyerName) + '<small>' + esc(o.buyerEmail) + '</small></td><td>' + esc(money(o.totalCents, o.currency)) + '</td><td>' + badge(o.status) + '</td><td>' + actions("orders", o) + '</td></tr>').join("");
      const donationRows = (donations.donations || []).map(d => '<tr><td><strong>' + esc(d.donationRef) + '</strong><small>' + date(d.createdAt) + '</small></td><td>' + esc(d.donorName) + '<small>' + esc(d.donorEmail) + '</small></td><td>' + esc(money(d.amountCents, d.currency)) + '</td><td>' + badge(d.status) + '</td><td>' + esc(d.message || "") + '</td></tr>').join("");
      const tabBar = '<div class="aw-tabs owc-tabs" role="tablist">' + tabs.map(([key, label]) => '<button type="button" role="tab" aria-selected="' + (state.tab === key) + '" class="aw-tab-button' + (state.tab === key ? " is-active" : "") + '" data-owc-tab="' + key + '">' + label + '</button>').join("") + '</div>';
      const body = tabBar +
        table("products", ["Product", "Seller", "Price", "Status", "Actions"], productRows, "No products match", productFilter) +
        table("sellers", ["Seller", "Church", "Status", "Updated", "Actions"], sellerRows, "No sellers yet") +
        table("orders", ["Order", "Buyer", "Total", "Status", "Actions"], orderRows, "No orders yet") +
        table("donations", ["Donation", "Donor", "Amount", "Status", "Message"], donationRows, "No donations yet");
      root.innerHTML = metrics + panel("Store management", "Publish or archive products, activate or suspend sellers, and fulfill or cancel orders. No payment is captured or refunded here.", body);
      root.querySelectorAll("[data-owc-tab]").forEach(tab => tab.addEventListener("click", () => {
        state.tab = tab.dataset.owcTab;
        root.querySelectorAll("[data-owc-tab]").forEach(t => { t.classList.toggle("is-active", t === tab); t.setAttribute("aria-selected", String(t === tab)); });
        root.querySelectorAll(".aw-tab-panel[data-owc-panel]").forEach(p => p.classList.toggle("is-active", p.dataset.owcPanel === state.tab));
      }));
      root.querySelector("[data-owc-product-status]").addEventListener("change", event => { state.productStatus = event.target.value; render(view, ctx); });
      root.addEventListener("click", async event => {
        const button = event.target.closest("[data-owc-kind]");
        if (!button || button.disabled) return;
        const { owcKind: kind, owcId: id, owcStatus: status, owcPending: pending } = button.dataset;
        let question = confirmText[kind + ":" + status];
        if (kind === "orders" && status === "fulfilled" && pending) question = "This order is still pending payment. Mark it as fulfilled anyway?";
        if (question && !window.confirm(question)) return;
        button.disabled = true;
        try {
          await api("store/admin/" + kind + "/" + encodeURIComponent(id), { status }, "PATCH");
          notice("Saved: " + button.textContent.trim() + ".");
          render(view, ctx);
        } catch (error) {
          notice(error.message || "Unable to update this record.");
          if (button.isConnected) button.disabled = false;
        }
      });
      drawIcons();
    } catch (error) {
      if (root.isConnected) root.innerHTML = errorPanel("Store management is unavailable", error);
    }
  }
  registry.register({ key: "store-admin", label: "Store management", icon: "store", section: "OPERATIONS", subtitle: "Owner actions for marketplace products, sellers, orders and donations.", render });
})();
