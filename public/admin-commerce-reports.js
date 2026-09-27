/* Owner dashboard: "Payments & reports" view (#commerce) plus a tiny runtime view registry.
   admin-workspace.js has no extension points, so owner-only views are injected at runtime:
   the nav entry is re-added whenever the workspace re-renders its nav, and the view replaces
   the workspace's fallback content whenever the hash names a registered view. */
(function () {
  "use strict";
  const views = new Map();
  const $ = id => document.getElementById(id);
  const esc = value => window.MWE?.escapeHtml ? window.MWE.escapeHtml(String(value ?? "")) : String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const icon = name => '<i data-lucide="' + esc(name) + '"></i>';
  const drawIcons = () => window.lucide?.createIcons();
  const notice = message => (window.showToast ? window.showToast(message) : console.info(message));
  const isOwnerWorkspace = () => document.body.hasAttribute("data-admin-workspace") && !document.body.hasAttribute("data-creator-workspace") && window.MWEPlatform?.role === "owner" && document.body.classList.contains("is-authenticated");
  const activeView = () => views.get(location.hash.slice(1));
  async function api(path, body, method) {
    const response = await fetch("/api/" + path, { method: method || (body ? "POST" : "GET"), credentials: "same-origin", cache: "no-store", headers: body ? { "content-type": "application/json" } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
    let data = null;
    try { data = await response.json(); } catch (_) { data = null; }
    if (!response.ok || !data || data.ok === false) {
      const error = new Error(data?.error || "The server could not complete this request (HTTP " + response.status + ").");
      error.status = response.status;
      error.code = data?.code || "";
      throw error;
    }
    return data;
  }
  const money = (cents, currency = "USD") => {
    try { return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format((Number(cents) || 0) / 100); }
    catch (_) { return (currency || "USD") + " " + ((Number(cents) || 0) / 100).toFixed(2); }
  };
  const cap = value => { const text = String(value || ""); return text.charAt(0).toUpperCase() + text.slice(1); };
  const badge = status => {
    const text = cap(status);
    const tone = ["Active", "Published", "Paid", "Fulfilled", "Confirmed"].includes(text) ? " good" : ["Pending", "Draft", "Recorded"].includes(text) ? " warn" : "";
    return '<span class="aw-badge' + tone + '">' + esc(text || "Unknown") + '</span>';
  };
  const panel = (title, subtitle, body, action = "") => '<section class="aw-panel"><div class="aw-panel-heading"><div><h2>' + esc(title) + '</h2><p>' + esc(subtitle) + '</p></div>' + action + '</div>' + body + '</section>';
  const errorPanel = (title, error) => '<section class="aw-panel aw-empty"><h3>' + esc(title) + '</h3><p>' + esc(error?.message || "Reload and try again.") + (error?.code ? " (" + esc(error.code) + ")" : "") + '</p></section>';
  const ctx = { api, esc, icon, drawIcons, notice, money, cap, badge, panel, errorPanel };

  function syncNav() {
    const nav = $("aw-nav");
    if (!nav || !nav.firstElementChild || !isOwnerWorkspace()) return;
    let added = false;
    views.forEach(def => {
      if (nav.querySelector('[data-owner-view="' + def.key + '"]')) return;
      const link = document.createElement("a");
      link.className = "aw-nav-link";
      link.href = "#" + def.key;
      link.dataset.ownerView = def.key;
      link.innerHTML = icon(def.icon) + "<span>" + esc(def.label) + "</span>";
      const section = [...nav.querySelectorAll(".aw-nav-label")].find(label => label.textContent.trim().toUpperCase() === (def.section || "OPERATIONS"));
      if (section) {
        let ref = section;
        while (ref.nextElementSibling && ref.nextElementSibling.matches("[data-owner-view]")) ref = ref.nextElementSibling;
        ref.after(link);
      } else nav.append(link);
      added = true;
    });
    const active = activeView();
    if (active) nav.querySelectorAll('[aria-current="page"]').forEach(el => { if (el.dataset.ownerView !== active.key) el.removeAttribute("aria-current"); });
    nav.querySelectorAll("[data-owner-view]").forEach(el => { if (active && el.dataset.ownerView === active.key) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current"); });
    if (added) drawIcons();
  }
  function syncContent() {
    const def = activeView();
    const content = $("aw-content");
    if (!def || !content || !isOwnerWorkspace()) return;
    if (content.firstElementChild?.dataset.ownerViewRoot === def.key) return;
    $("aw-title").textContent = def.label;
    $("aw-breadcrumb").textContent = def.label;
    $("aw-subtitle").textContent = def.subtitle || "";
    $("aw-eyebrow").textContent = (def.section || "OPERATIONS") + " / " + def.label.toUpperCase();
    $("aw-heading-actions").innerHTML = '<a class="aw-button" href="#overview">Back to overview</a>';
    document.title = def.label + " · Admin | My Way";
    const root = document.createElement("div");
    root.dataset.ownerViewRoot = def.key;
    content.replaceChildren(root);
    try { def.render(root, ctx); } catch (error) { root.innerHTML = errorPanel("This view could not load", error); console.error("Owner view:", error); }
    drawIcons();
  }
  const sync = () => { syncNav(); syncContent(); };
  window.MWEOwnerViews = { register(def) { views.set(def.key, def); if (document.readyState !== "loading") sync(); }, ctx };

  document.addEventListener("DOMContentLoaded", async () => {
    await window.MWEPlatform?.ready;
    if (!document.body.hasAttribute("data-admin-workspace") || document.body.hasAttribute("data-creator-workspace")) return;
    const nav = $("aw-nav");
    const content = $("aw-content");
    if (nav) new MutationObserver(syncNav).observe(nav, { childList: true });
    if (content) new MutationObserver(syncContent).observe(content, { childList: true });
    window.addEventListener("hashchange", sync);
    sync();
  });

  const filters = { type: "all", status: "", query: "", from: "", to: "" };
  async function renderCommerce(root) {
    root.innerHTML = '<section class="aw-panel"><div class="aw-panel-heading"><div><h2>Loading payment controls and reports…</h2><p>Only verified owners can view commerce records.</p></div></div></section>';
    try {
      const params = new URLSearchParams({ type: filters.type });
      if (filters.status) params.set("status", filters.status);
      if (filters.query) params.set("q", filters.query);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      const [paymentResult, report] = await Promise.all([api("store/admin/payment-settings"), api("store/admin/reports?" + params.toString())]);
      if (!root.isConnected) return;
      const payment = paymentResult.payment || {};
      const analytics = report.analytics || {};
      const records = [
        ...(report.orders || []).map(row => ({ type: "Store order", ref: row.orderRef, person: row.buyerName, email: row.buyerEmail, amount: row.totalCents, currency: row.currency, status: row.status, createdAt: row.createdAt })),
        ...(report.donations || []).map(row => ({ type: "Giving", ref: row.donationRef, person: row.donorName, email: row.donorEmail, amount: row.amountCents, currency: row.currency, status: row.status, createdAt: row.createdAt }))
      ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      const metric = (label, value, note, symbol) => '<div class="aw-metric"><div class="aw-metric-label">' + esc(label) + icon(symbol) + '</div><strong>' + esc(String(value ?? 0)) + '</strong><small>' + esc(note) + '</small></div>';
      const rows = records.length ? records.map(row => '<tr><td><strong>' + esc(row.ref) + '</strong><small>' + esc(row.type) + '</small></td><td>' + esc(row.person) + '<small>' + esc(row.email) + '</small></td><td>' + esc(money(row.amount, row.currency)) + '</td><td>' + badge(row.status) + '</td><td>' + esc(row.createdAt ? new Date(row.createdAt).toLocaleString() : "") + '</td></tr>').join("") : '<tr><td colspan="5"><div class="aw-empty"><h3>No matching payment records</h3><p>Adjust the report filters or enable sandbox mode to begin safely recording activity.</p></div></td></tr>';
      const controls = '<form data-commerce-payment class="aw-panel"><div class="aw-panel-heading"><div><h2>Sandbox payment controls</h2><p>Off blocks the flow before any order or giving record is created. On records pending sandbox activity only; it never captures a payment.</p></div><span class="aw-badge warn">No live provider</span></div><div class="owc-checks"><label class="owc-check"><input type="checkbox" name="storeSandboxEnabled"' + (payment.storeSandboxEnabled ? " checked" : "") + ' /> Enable store sandbox checkout</label><label class="owc-check"><input type="checkbox" name="givingSandboxEnabled"' + (payment.givingSandboxEnabled ? " checked" : "") + ' /> Enable giving sandbox records</label>' + (payment.updatedAt ? '<small>Last changed ' + esc(new Date(payment.updatedAt).toLocaleString()) + '</small>' : "") + '</div><div class="aw-taxonomy-actions"><button class="aw-button aw-primary" type="submit">Save payment controls</button></div></form>';
      const statusOptions = ["pending", "paid", "fulfilled", "cancelled", "refunded", "recorded", "confirmed"].map(value => '<option value="' + value + '"' + (filters.status === value ? " selected" : "") + '>' + cap(value) + '</option>').join("");
      const typeOptions = [["all", "Orders and giving"], ["orders", "Store orders"], ["donations", "Giving records"]].map(([value, label]) => '<option value="' + value + '"' + (filters.type === value ? " selected" : "") + '>' + label + '</option>').join("");
      const filtersHtml = '<form data-commerce-filters class="aw-filters"><label>Search<input type="search" name="query" placeholder="Reference, name, or email" value="' + esc(filters.query) + '" /></label><label>Type<select name="type">' + typeOptions + '</select></label><label>Status<select name="status"><option value="">All statuses</option>' + statusOptions + '</select></label><label>From<input name="from" type="date" value="' + esc(filters.from) + '" /></label><label>To<input name="to" type="date" value="' + esc(filters.to) + '" /></label><button class="aw-button" type="submit">Apply filters</button></form>';
      const analyticsHtml = '<div class="aw-metrics">' + [
        metric("Pending store records", analytics.pendingOrders, money(analytics.pendingOrderCents) + " awaiting payment", "shopping-bag"),
        metric("Completed store orders", analytics.completedOrders, "Provider-confirmed only", "circle-check"),
        metric("Giving records", analytics.givingRecords, money(analytics.recordedGivingCents) + " recorded in sandbox", "heart"),
        metric("Confirmed giving", money(analytics.confirmedGivingCents), "Provider-confirmed only", "badge-check")
      ].join("") + '</div>';
      root.innerHTML = controls + analyticsHtml + panel("Filterable commerce report", "Search and filter stored store and giving records. Amounts marked pending or recorded are not recognized revenue.", filtersHtml + '<div class="aw-table-scroll"><table><thead><tr><th>Reference</th><th>Customer / donor</th><th>Amount</th><th>Status</th><th>Created</th></tr></thead><tbody>' + rows + '</tbody></table></div>');
      root.querySelector("[data-commerce-payment]").addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        try {
          await api("store/admin/payment-settings", { storeSandboxEnabled: form.elements.storeSandboxEnabled.checked, givingSandboxEnabled: form.elements.givingSandboxEnabled.checked }, "PATCH");
          notice("Sandbox payment controls saved.");
          renderCommerce(root);
        } catch (error) { notice(error.message || "Unable to save payment controls."); }
        finally { if (submit.isConnected) submit.disabled = false; }
      });
      root.querySelector("[data-commerce-filters]").addEventListener("submit", event => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        Object.assign(filters, { type: String(values.get("type") || "all"), status: String(values.get("status") || ""), query: String(values.get("query") || "").trim(), from: String(values.get("from") || ""), to: String(values.get("to") || "") });
        renderCommerce(root);
      });
      drawIcons();
    } catch (error) {
      if (root.isConnected) root.innerHTML = errorPanel("Commerce reports are unavailable", error);
    }
  }
  window.MWEOwnerViews.register({ key: "commerce", label: "Payments & reports", icon: "chart-column", section: "OPERATIONS", subtitle: "Control sandbox collection and review recorded store and giving activity.", render: renderCommerce });
})();
