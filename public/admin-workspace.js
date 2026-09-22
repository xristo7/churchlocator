(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", async () => {
  await window.MWEPlatform?.ready;
    if (!document.body.hasAttribute("data-admin-workspace")) return;
    const { modules, filterRows, valuesFromEntries } = window.MWEAdmin;
    const creator = document.body.hasAttribute("data-creator-workspace");
    const mainModules = () => Object.entries(modules).filter(([, mod]) => !mod.auxiliary);
    const $ = id => document.getElementById(id);
    const esc = window.MWE.escapeHtml;
    const icon = name => '<i data-lucide="' + esc(name) + '"></i>';
    const state = { view: "overview", query: "", status: "", category: "", sort: "name", page: 1, commerce: { type: "all", status: "", query: "", from: "", to: "" } };
    const pageSize = 8;
    let editing = null;
    let dirty = false;
    let busy = false;
    let returnFocus = null;
    const drawIcons = () => window.lucide?.createIcons();
    const badge = status => '<span class="aw-badge ' + (["Verified", "Active", "Available", "Free", "Scheduled"].includes(status) ? "good" : ["Pending", "Draft", "Needs date"].includes(status) ? "warn" : "") + '">' + esc(status) + '</span>';
    const button = (action, text, primary = false) => '<button type="button" class="aw-button' + (primary ? " aw-primary" : "") + '" data-aw-action="' + action + '">' + text + '</button>';
    const link = (href, label, className = "aw-text-link") => '<a class="' + className + '" href="' + esc(href) + '">' + label + '</a>';
    const count = key => modules[key].get().length;
    function notice(message) { window.showToast(message); }
    function panel(title, subtitle, body, action = "") {
      return '<section class="aw-panel"><div class="aw-panel-heading"><div><h2>' + title + '</h2><p>' + subtitle + '</p></div>' + action + '</div>' + body + '</section>';
    }
    function nav() {
      const entry = (key, label, symbol, number) => '<a class="aw-nav-link" href="#' + key + '"' + (state.view === key ? ' aria-current="page"' : "") + '>' + icon(symbol) + '<span>' + label + '</span>' + (number === undefined ? "" : '<small>' + number + '</small>') + '</a>';
      $("aw-nav").innerHTML = entry("overview", "Overview", "layout-dashboard") + '<p class="aw-nav-label">MANAGE PLATFORM</p>' +
        mainModules().map(([key, mod]) => entry(key, mod.label, mod.icon, count(key))).join("") +
        entry("spotlight", "Spotlight", "play-square", window.MWESpotlightWorkspace?.count() || 0) +
        (creator ? "" : '<p class="aw-nav-label">PLATFORM CONTROL</p>' + entry("platform-options", "Platform options", "list-tree") + '<p class="aw-nav-label">OPERATIONS</p>' + entry("commerce", "Payments & reports", "chart-column") + entry("locations", "Location coverage", "map-pin") + entry("review", "Needs attention", "list-checks", pending().length));
    }
    function pending() {
      return ["churches", "channels"].flatMap(key => modules[key].get().filter(r => !r.verified).map(r => ({ key, record: r, reason: key === "churches" ? "Church verification" : "Creator verification" })));
    }
    function overview() {
      if (creator) {
        const total = mainModules().reduce((sum, [key]) => sum + count(key), 0);
        const live = modules.churches.get().filter(r => r.livestream?.enabled).length + modules.channels.get().filter(r => r.live).length + modules.store.get().filter(r => r.live).length;
        const scheduled = modules.events.get().filter(r => modules.events.status(r) === "Scheduled").length;
        const metrics = '<div class="aw-metrics">' + [["Your creations", total, "layers", "Across all six modules"], ["Live destinations", live, "radio", "Churches, channels and stores"], ["Upcoming events", scheduled, "calendar-days", "Scheduled in your workspace"], ["Your products", count("products"), "package", "Manage inventory and pricing"]].map(([label, value, symbol, note]) => '<div class="aw-metric"><div class="aw-metric-label">' + label + icon(symbol) + '</div><strong>' + value + '</strong><small>' + note + '</small></div>').join("") + '</div>';
        const descriptions = { churches: "Add a church profile", meditation: "Create a meditation room", channels: "Create a channel", events: "Create an event", store: "Create a store", resources: "Add resource material" };
        const cards = '<div class="aw-module-grid">' + mainModules().map(([key, mod]) => '<button type="button" class="aw-module-card aw-create-card" data-create-module="' + key + '"><div class="aw-module-top"><span class="aw-module-icon">' + icon(mod.icon) + '</span>' + icon("plus") + '</div><h3>' + descriptions[key] + '</h3><p>' + mod.description + '</p><div class="aw-module-count">' + (["churches", "channels", "store"].includes(key) ? badge("Live capable") : "Create and manage") + '<span>' + count(key) + ' created</span></div></button>').join("") + '</div>';
        const recent = mainModules().flatMap(([key, mod]) => mod.get().map(record => ({ key, mod, record }))).sort((a, b) => String(b.record.updatedAt || "").localeCompare(String(a.record.updatedAt || ""))).slice(0, 5);
        const recentHtml = recent.map(({ key, mod, record }) => '<div class="aw-queue-row"><span class="aw-record-icon">' + icon(mod.icon) + '</span><div><strong>' + esc(mod.title(record)) + '</strong><small>' + mod.label + ' · ' + esc(mod.status(record)) + '</small></div><button class="aw-button" data-edit-module="' + key + '" data-edit-id="' + esc(record.id) + '">Manage</button></div>').join("");
        $("aw-content").innerHTML = metrics + panel(total ? "Create something new" : "What would you like to create?", "Start with one. You can add all six from the same account, at any time.", cards) + (recent.length ? panel("Recently updated", "Pick up where you left off.", recentHtml) : "") + panel("Churches, channels and stores can go live", "Add your external broadcast URL, then turn on Live in the record editor. My Way displays the broadcast; video hosting remains with your provider.", '<div class="aw-queue-row">' + link("livestream.html", "Explore Live " + icon("arrow-up-right")) + '</div>');
        return;
      }
      const churches = modules.churches.get();
      const locations = new Set(churches.map(r => [r.city?.trim().toLowerCase(), r.country?.trim().toLowerCase()].join("|")));
      const contentCount = ["meditation", "channels", "resources"].reduce((sum, key) => sum + count(key), 0);
      const metrics = [
        ["Church network", churches.length, "church", churches.filter(c => c.verified).length + " verified profiles"],
        ["Locations served", locations.size, "map-pin", "City and country combinations"],
        ["Content library", contentCount, "library", "Rooms, channels and resources"],
        ["Awaiting verification", pending().length, "shield-check", "Church and creator profiles"]
      ];
      const metricsHtml = '<div class="aw-metrics">' + metrics.map(([label, number, symbol, caption]) => '<div class="aw-metric"><div class="aw-metric-label">' + label + icon(symbol) + '</div><strong>' + number + '</strong><small>' + caption + '</small></div>').join("") + '</div>';
      const cards = '<div class="aw-module-grid">' + mainModules().map(([key, mod]) => '<a class="aw-module-card" href="#' + key + '"><div class="aw-module-top"><span class="aw-module-icon">' + icon(mod.icon) + '</span>' + icon("arrow-up-right") + '</div><h3>' + mod.label + '</h3><p>' + mod.description + '</p><div class="aw-module-count"><strong>' + count(key) + '</strong>' + mod.noun + '</div></a>').join("") + '</div>';
      const queue = pending().slice(0, 3).map(({ key, record, reason }) => '<div class="aw-queue-row"><span class="aw-record-icon">' + icon(modules[key].icon) + '</span><div><strong>' + esc(modules[key].title(record)) + '</strong><small>' + reason + '</small></div><button class="aw-icon-button" type="button" data-edit-module="' + key + '" data-edit-id="' + esc(record.id) + '" aria-label="Review ' + esc(modules[key].title(record)) + '">' + icon("arrow-right") + '</button></div>').join("") || '<div class="aw-empty"><h3>You’re all caught up</h3><p>No church or creator profiles are awaiting verification.</p></div>';
      const steps = '<div class="aw-steps">' + [
        ["Find the right module", "Open a collection, then search or filter its records."],
        ["Review the essentials", "Check ownership, content, location and access details."],
        ["Save, then preview", "Review the result in the member experience. Approved publications appear across the platform."]
      ].map(([title, detail], i) => '<div class="aw-step"><span>' + (i + 1) + '</span><div><strong>' + title + '</strong><p>' + detail + '</p></div></div>').join("") + '</div>';
      $("aw-content").innerHTML = metricsHtml + panel("Your platform modules", "A dedicated space for every part of the community.", cards, '<span class="aw-badge">6 connected modules</span>') +
        '<div class="aw-bottom-grid">' + panel("Needs attention", "Profiles waiting for a verification decision.", queue, link("#review", "View queue " + icon("arrow-right"))) + panel("One consistent workflow", "Less searching. More focused administration.", steps) + '</div>';
    }
    function options(values, selected, allLabel) {
      return '<option value="">' + allLabel + '</option>' + values.map(v => '<option value="' + esc(v) + '"' + (selected === v ? " selected" : "") + '>' + esc(v) + '</option>').join("");
    }
    function list() {
      const mod = modules[state.view];
      const categories = [...new Set(mod.get().map(mod.category).filter(Boolean))].sort();
      const controls = '<div class="aw-filters module-toolbar module-directory-toolbar"><label class="module-search"><i data-lucide="search"></i><span class="sr-only">Search ' + mod.noun + '</span><input id="aw-search" type="search" placeholder="Search name, owner or location…" value="' + esc(state.query) + '" /></label>' +
        '<div class="module-filter-group"><select class="module-select" id="aw-status" aria-label="' + (state.view === "resources" ? "Access" : "Status") + '">' + options(mod.statuses, state.status, "All " + (state.view === "resources" ? "access" : "statuses")) + '</select>' +
        '<select class="module-select" id="aw-category" aria-label="' + (state.view === "churches" ? "City" : "Category") + '">' + options(categories, state.category, "All categories") + '</select>' +
        '<select class="module-select" id="aw-sort" aria-label="Sort by"><option value="name"' + (state.sort === "name" ? " selected" : "") + '>Name A–Z</option><option value="recent"' + (state.sort === "recent" ? " selected" : "") + '>Recently updated</option></select></div></div>';
      $("aw-content").innerHTML = '<section class="aw-panel">' + controls + '<div id="aw-results"></div></section>';
      window.MWE.initCustomDropdowns();
      window.MWE.initModuleDirectoryToolbars();
      $("aw-search").addEventListener("input", e => { state.query = e.target.value; state.page = 1; results(); });
      [["aw-status", "status"], ["aw-category", "category"], ["aw-sort", "sort"]].forEach(([id, prop]) => $(id).addEventListener("change", e => { state[prop] = e.target.value; state.page = 1; results(); }));
      results();
    }
    function results() {
      const mod = modules[state.view];
      const rows = filterRows(state.view, state);
      const pages = Math.max(1, Math.ceil(rows.length / pageSize));
      state.page = Math.min(state.page, pages);
      const visible = rows.slice((state.page - 1) * pageSize, state.page * pageSize);
      const table = '<div class="aw-table-scroll"><table><thead><tr><th scope="col">' + mod.singular + '</th><th scope="col">Owner / host</th><th scope="col">' + (state.view === "churches" ? "City" : "Category") + '</th><th scope="col">' + (state.view === "resources" ? "Access" : "Status") + '</th><th scope="col">Actions</th></tr></thead><tbody>' +
        visible.map(r => '<tr><td><div class="aw-record"><span class="aw-record-icon">' + icon(mod.icon) + '</span><div><strong>' + esc(mod.title(r)) + '</strong><small>' + esc(mod.detail(r)) + '</small></div></div></td><td>' + esc(mod.owner(r) || "Not set") + '</td><td>' + esc(mod.category(r) || "Not set") + '</td><td>' + badge(mod.status(r)) + '</td><td><div style="display:flex;gap:5px"><button type="button" class="aw-button" data-edit-module="' + state.view + '" data-edit-id="' + esc(r.id) + '">Edit<span class="sr-only"> ' + esc(mod.title(r)) + '</span></button><a class="aw-icon-button" target="_blank" rel="noopener" href="' + esc(mod.preview(r)) + '" aria-label="Preview ' + esc(mod.title(r)) + ' (new tab)">' + icon("external-link") + '</a></div></td></tr>').join("") + '</tbody></table></div>';
      const emptyCollection = mod.get().length === 0;
      const empty = emptyCollection
        ? '<div class="aw-empty"><h3>No ' + mod.noun + ' yet</h3><p>' + (state.view === "store" ? 'Store profiles are separate from products. Create a store, then connect its products using Manage products.' : 'Create your first ' + mod.singular + ' to get started.') + '</p>' + button("new", "Add " + mod.singular, true) + '</div>'
        : '<div class="aw-empty"><h3>No matching ' + mod.noun + '</h3><p>Try a different search or clear your filters.</p>' + button("clear", "Clear filters") + '</div>';
      $("aw-results").innerHTML = (rows.length ? table : empty) +
        '<div class="aw-pagination"><span>' + rows.length + ' ' + mod.noun + (rows.length ? ' · Showing ' + ((state.page - 1) * pageSize + 1) + '–' + Math.min(state.page * pageSize, rows.length) : "") + '</span><div><button class="aw-icon-button" type="button" data-aw-action="prev" aria-label="Previous page"' + (state.page <= 1 ? " disabled" : "") + '>' + icon("chevron-left") + '</button><span>Page ' + state.page + ' of ' + pages + '</span><button class="aw-icon-button" type="button" data-aw-action="next" aria-label="Next page"' + (state.page >= pages ? " disabled" : "") + '>' + icon("chevron-right") + '</button></div></div>';
      drawIcons();
    }
    function coverage() {
      const groups = new Map();
      modules.churches.get().forEach(church => {
        const key = [church.city, church.country].map(x => (x || "").trim().toLowerCase()).join("|");
        if (!groups.has(key)) groups.set(key, { city: church.city, country: church.country, rows: [] });
        groups.get(key).rows.push(church);
      });
      const rows = [...groups.values()].sort((a, b) => (a.city || "").localeCompare(b.city || ""));
      const table = '<div class="aw-table-scroll"><table><thead><tr><th>Location</th><th>Churches</th><th>Verified</th><th>Address completeness</th><th>Action</th></tr></thead><tbody>' + rows.map(g => '<tr><td><strong>' + esc(g.city || "Unassigned") + '</strong><small>' + esc(g.country || "Country missing") + '</small></td><td>' + g.rows.length + '</td><td>' + g.rows.filter(r => r.verified).length + '</td><td>' + g.rows.filter(r => r.location && r.city && r.country).length + ' / ' + g.rows.length + ' complete</td><td><button class="aw-button" data-location="' + esc(g.city || "Unassigned") + '">View churches</button></td></tr>').join("") + '</tbody></table></div>';
      $("aw-content").innerHTML = panel("Location coverage", "Derived from church profiles. Update a church record to correct its location.", table);
    }
    function review() {
      const rows = pending();
      $("aw-content").innerHTML = panel("Verification queue", rows.length + " profiles to review · verify only after checking ownership and contact details.", rows.length ? rows.map(({ key, record, reason }) => '<div class="aw-queue-row"><span class="aw-record-icon">' + icon(modules[key].icon) + '</span><div><strong>' + esc(modules[key].title(record)) + '</strong><small>' + reason + ' · ' + esc(modules[key].owner(record) || "Owner missing") + '</small></div>' + badge("Pending") + '<button type="button" class="aw-button" data-edit-module="' + key + '" data-edit-id="' + esc(record.id) + '">Review</button></div>').join("") : '<div class="aw-empty"><h3>All profiles reviewed</h3><p>No pending church or channel verification.</p></div>');
    }
    const taxonomyMeta = [
      ["denominations", "Denominations", "Used by church profiles and the public church filter."],
      ["languages", "Languages", "Primary languages available on church profiles."],
      ["worship_styles", "Worship styles", "Standard worship-style labels for church profiles."],
      ["store_categories", "Store categories", "Categories used to organize creator storefronts."],
      ["product_categories", "Product categories", "Categories used to organize marketplace products."],
      ["channel_topics", "Channel topics", "Topics creators can assign to channels."],
      ["resource_topics", "Resource topics", "Topics used to organize learning resources."]
    ];
    function platformOptions() {
      const cards = taxonomyMeta.map(([key, title, description]) => {
        const taxonomy = window.MWEPlatform.taxonomies[key];
        const rows = (taxonomy?.items || []).map(item => '<div class="aw-taxonomy-row"><input name="item" value="' + esc(item) + '" aria-label="' + esc(title) + ' option" maxlength="80" required /><button class="aw-icon-button" type="button" data-taxonomy-remove aria-label="Remove ' + esc(item) + '">' + icon("trash-2") + '</button></div>').join("");
        return '<form class="aw-panel aw-taxonomy-card" data-taxonomy-form="' + key + '"><div class="aw-panel-heading"><div><h2>' + title + '</h2><p>' + description + '</p></div><span class="aw-badge">' + (taxonomy?.items.length || 0) + ' options</span></div><div class="aw-taxonomy-list">' + rows + '</div><div class="aw-taxonomy-actions"><button class="aw-button" type="button" data-taxonomy-add>' + icon("plus") + ' Add option</button><button class="aw-button aw-primary" type="submit">Save ' + title.toLowerCase() + '</button></div></form>';
      }).join("");
      $("aw-content").innerHTML = '<div class="aw-notice"><strong>One source of truth</strong><p>Changes apply to public filters and new content forms. Existing records keep their saved value until edited.</p></div><div class="aw-taxonomy-grid">' + cards + '</div>';
    }
    function commerceMoney(cents, currency = "USD") {
      try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((Number(cents) || 0) / 100); }
      catch (_) { return currency + " " + ((Number(cents) || 0) / 100).toFixed(2); }
    }
    async function commerce() {
      const target = $("aw-content");
      target.innerHTML = '<section class="aw-panel"><h2>Loading payment controls and reports…</h2><p>Only verified owners can view commerce records.</p></section>';
      try {
        const paymentResult = await window.MWEPlatform.api("store/admin/payment-settings");
        const payment = paymentResult.payment;
        const filters = state.commerce;
        const params = new URLSearchParams({ type: filters.type });
        if (filters.status) params.set("status", filters.status);
        if (filters.query) params.set("q", filters.query);
        if (filters.from) params.set("from", filters.from);
        if (filters.to) params.set("to", filters.to);
        const report = await window.MWEPlatform.api("store/admin/reports?" + params.toString());
        const analytics = report.analytics;
        const records = [
          ...(report.orders || []).map(row => ({ type: "Store order", ref: row.orderRef, person: row.buyerName, email: row.buyerEmail, amount: row.totalCents, currency: row.currency, status: row.status, createdAt: row.createdAt })),
          ...(report.donations || []).map(row => ({ type: "Giving", ref: row.donationRef, person: row.donorName, email: row.donorEmail, amount: row.amountCents, currency: row.currency, status: row.status, createdAt: row.createdAt }))
        ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        const metric = (label, value, note, symbol) => '<div class="aw-metric"><div class="aw-metric-label">' + esc(label) + icon(symbol) + '</div><strong>' + esc(String(value)) + '</strong><small>' + esc(note) + '</small></div>';
        const reportRows = records.length ? records.map(row => '<tr><td><strong>' + esc(row.ref) + '</strong><small>' + esc(row.type) + '</small></td><td>' + esc(row.person) + '<small>' + esc(row.email) + '</small></td><td>' + esc(commerceMoney(row.amount, row.currency)) + '</td><td>' + badge(row.status.charAt(0).toUpperCase() + row.status.slice(1)) + '</td><td>' + esc(new Date(row.createdAt).toLocaleString()) + '</td></tr>').join("") : '<tr><td colspan="5"><div class="aw-empty"><h3>No matching payment records</h3><p>Adjust the report filters or enable sandbox mode to begin safely recording activity.</p></div></td></tr>';
        const controls = '<form id="commerce-payment-form" class="aw-panel"><div class="aw-panel-heading"><div><h2>Sandbox payment controls</h2><p>Off blocks the flow before any order or giving record is created. On records pending sandbox activity only; it never captures a payment.</p></div><span class="aw-badge warn">No live provider</span></div><label class="checkout-check"><input type="checkbox" name="storeSandboxEnabled"' + (payment.storeSandboxEnabled ? " checked" : "") + ' /> Enable store sandbox checkout</label><label class="checkout-check"><input type="checkbox" name="givingSandboxEnabled"' + (payment.givingSandboxEnabled ? " checked" : "") + ' /> Enable giving sandbox records</label><div class="aw-taxonomy-actions"><button class="aw-button aw-primary" type="submit">Save payment controls</button></div></form>';
        const filtersHtml = '<form id="commerce-report-filters" class="aw-filters module-toolbar module-directory-toolbar"><label class="module-search"><i data-lucide="search"></i><span class="sr-only">Search records</span><input type="search" name="query" placeholder="Search reference, name, or email" value="' + esc(filters.query) + '" /></label><div class="module-filter-group"><select class="module-select" name="type" aria-label="Record type"><option value="all"' + (filters.type === "all" ? " selected" : "") + '>Orders and giving</option><option value="orders"' + (filters.type === "orders" ? " selected" : "") + '>Store orders</option><option value="donations"' + (filters.type === "donations" ? " selected" : "") + '>Giving records</option></select><select class="module-select" name="status" aria-label="Record status"><option value="">All statuses</option>' + ["pending", "paid", "fulfilled", "cancelled", "refunded", "recorded", "confirmed"].map(value => '<option value="' + value + '"' + (filters.status === value ? " selected" : "") + '>' + value.charAt(0).toUpperCase() + value.slice(1) + '</option>').join("") + '</select><input class="module-select" name="from" type="date" value="' + esc(filters.from) + '" aria-label="From date" /><input class="module-select" name="to" type="date" value="' + esc(filters.to) + '" aria-label="To date" /><button class="aw-button" type="submit">Apply filters</button></div></form>';
        const analyticsHtml = '<div class="aw-metrics">' + [
          metric("Pending store records", analytics.pendingOrders, commerceMoney(analytics.pendingOrderCents) + " awaiting payment", "shopping-bag"),
          metric("Completed store orders", analytics.completedOrders, "Provider-confirmed only", "circle-check"),
          metric("Giving records", analytics.givingRecords, commerceMoney(analytics.recordedGivingCents) + " recorded in sandbox", "heart"),
          metric("Confirmed giving", commerceMoney(analytics.confirmedGivingCents), "Provider-confirmed only", "badge-check")
        ].join("") + '</div>';
        target.innerHTML = controls + analyticsHtml + panel("Filterable commerce report", "Search and filter securely stored store and giving records. Amounts marked pending or recorded are not recognized revenue.", filtersHtml + '<div class="aw-table-scroll"><table><thead><tr><th>Reference</th><th>Customer / donor</th><th>Amount</th><th>Status</th><th>Created</th></tr></thead><tbody>' + reportRows + '</tbody></table></div>');
        target.querySelector("#commerce-payment-form").addEventListener("submit", async event => {
          event.preventDefault();
          const submit = event.currentTarget.querySelector('[type="submit"]');
          submit.disabled = true;
          try {
            await window.MWEPlatform.api("store/admin/payment-settings", {
              storeSandboxEnabled: event.currentTarget.elements.storeSandboxEnabled.checked,
              givingSandboxEnabled: event.currentTarget.elements.givingSandboxEnabled.checked
            }, "PATCH");
            notice("Sandbox payment controls saved.");
            commerce();
          } catch (error) { notice(error.message || "Unable to save payment controls."); }
          finally { if (submit.isConnected) submit.disabled = false; }
        });
        target.querySelector("#commerce-report-filters").addEventListener("submit", event => {
          event.preventDefault();
          const values = new FormData(event.currentTarget);
          state.commerce = { type: String(values.get("type") || "all"), status: String(values.get("status") || ""), query: String(values.get("query") || "").trim(), from: String(values.get("from") || ""), to: String(values.get("to") || "") };
          commerce();
        });
        drawIcons();
      } catch (error) {
        target.innerHTML = '<section class="aw-panel aw-empty"><h3>Commerce reports are unavailable</h3><p>' + esc(error.message || "Reload and try again.") + '</p></section>';
      }
    }
    function render() {
      try {
        nav();
        const mod = modules[state.view];
        const labels = { overview: ["Overview", "A clear view of your community and the content that connects it."], spotlight: ["Spotlight", creator ? "Submit channel content and track every moderation decision." : "Curate, review, schedule and publish the stories shown in Spotlight."], "platform-options": ["Platform options", "Manage the standard choices used across public filters and content forms."], commerce: ["Payments & reports", "Control sandbox collection and review recorded store and giving activity."], locations: ["Location coverage", "Keep the church directory accurate, connected and easy to discover."], review: ["Needs attention", "A focused queue for church and creator verification."] };
        $("aw-title").textContent = mod?.label || labels[state.view][0];
        if (creator && state.view === "overview") $("aw-title").textContent = "Your creator workspace";
        $("aw-breadcrumb").textContent = $("aw-title").textContent;
        $("aw-subtitle").textContent = mod ? mod.description + " Search, review, edit and preview in one place." : labels[state.view][1];
        if (creator && state.view === "overview") $("aw-subtitle").textContent = "One account. Six ways to connect with your community.";
        $("aw-eyebrow").textContent = mod ? (creator ? "YOUR WORKSPACE / " : "MANAGE PLATFORM / ") + mod.label.toUpperCase() : creator ? "CREATE. CONNECT. GROW." : "YOUR PLATFORM, AT A GLANCE";
        if (creator) {
          const profile = window.MWECreator.account();
          const name = profile?.name || "Your workspace";
          document.querySelector(".aw-workspace-name strong").textContent = name;
          document.querySelector(".aw-top-actions>div strong").textContent = name;
          document.querySelector(".aw-avatar").textContent = name.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();
          document.querySelector(".aw-nav-label").textContent = "YOUR MODULES";
        }
        $("aw-heading-actions").innerHTML = mod ? button("new", icon("plus") + " Add " + mod.singular, true) : link(state.view === "overview" ? "#churches" : "#overview", state.view === "overview" ? "Manage churches " + icon("arrow-right") : "Back to overview", "aw-button");
        if (state.view === "spotlight") $("aw-heading-actions").innerHTML = link("app.html?view=spotlight", "Open Spotlight " + icon("arrow-up-right"), "aw-button");
        document.title = $("aw-title").textContent + " · Admin | My Way";
        if (creator) document.title = $("aw-title").textContent + " | My Way";
        if (creator && state.view === "overview") $("aw-heading-actions").innerHTML = link("app.html?view=home", "Open member app " + icon("arrow-up-right"), "aw-button");
        if (state.view === "store") $("aw-heading-actions").insertAdjacentHTML("afterbegin", link("#products", "Manage products", "aw-button") + " ");
        if (state.view === "products") $("aw-heading-actions").insertAdjacentHTML("afterbegin", link("#store", "Store profiles", "aw-button") + " ");
        if (mod) list(); else if (state.view === "overview") overview(); else if (state.view === "spotlight") window.MWESpotlightWorkspace?.render({ target: $("aw-content"), creator }); else if (state.view === "platform-options") platformOptions(); else if (state.view === "commerce") commerce(); else if (state.view === "locations") coverage(); else review();
        drawIcons();
      } catch (error) {
        $("aw-content").innerHTML = '<section class="aw-panel aw-empty"><h3>We couldn’t load the workspace</h3><p>Your existing records have not been reset. Check browser storage availability and reload.</p>' + button("retry", "Try again") + '</section>';
        console.error("Admin workspace:", error);
      }
    }
    function navigate() {
      const requested = location.hash.slice(1) || "overview";
      const aliases = { directory: "churches", editor: "churches", moderation: "review", analytics: "overview" };
      state.view = modules[requested] || ["overview", "spotlight", "platform-options", "commerce", "locations", "review"].includes(requested) ? requested : aliases[requested] || "overview";
      if (creator && ["platform-options", "commerce", "locations", "review"].includes(state.view)) state.view = "overview";
      Object.assign(state, { query: "", status: "", category: "", sort: "name", page: 1 });
      document.body.classList.remove("aw-nav-open");
      $("aw-menu").setAttribute("aria-expanded", "false");
      render();
    }
    function editorField(f, data) {
      let value = data[f.key] ?? "";
      if (f.type === "url" && value === "#") value = "";
      const common = ' name="' + f.key + '" id="aw-field-' + f.key + '"' + (f.required ? " required" : "") + (f.hint ? ' aria-describedby="aw-hint-' + f.key + '"' : "");
      let control;
      if (f.type === "select") {
        const entries = (f.options || []).map(o => Array.isArray(o) ? o : [o, o]);
        // Preserve valid existing taxonomy values even if not in the standard list.
        if (String(value) && !entries.some(o => String(o[0]) === String(value))) entries.unshift([String(value), String(value)]);
        control = '<select' + common + '>' + (f.required ? '<option value="">Choose…</option>' : "") + entries.map(([v, label]) => '<option value="' + esc(v) + '"' + (String(v) === String(value) ? " selected" : "") + '>' + esc(label) + '</option>').join("") + '</select>';
      } else if (f.type === "textarea") control = '<textarea' + common + ' rows="4">' + esc(value) + '</textarea>';
      else control = '<input' + common + ' type="' + (f.type === "url" && String(value).startsWith("assets/") ? "text" : f.type) + '" value="' + esc(value) + '"' + (f.type === "number" ? ' min="0" step="' + (["inventory", "totalTickets", "ticketPriceCents", "toneFreq"].includes(f.key) ? "1" : "0.01") + '"' : "") + ' />';
      return '<label class="aw-field' + (f.type === "textarea" ? " wide" : "") + '" for="aw-field-' + f.key + '"><span>' + esc(f.label) + (f.required ? ' <span aria-hidden="true">*</span>' : "") + '</span>' + control + (f.hint ? '<small id="aw-hint-' + f.key + '">' + esc(f.hint) + '</small>' : "") + '</label>';
    }
    function openEditor(key, id) {
      if (!document.body.classList.contains("is-authenticated")) return;
      const mod = modules[key];
      const record = id ? mod.get().find(r => r.id === id) : null;
      if (id && !record) { notice("This record is no longer available."); return; }
      editing = { key, record: record ? JSON.parse(JSON.stringify(record)) : null };
      const data = record ? (mod.flatten ? mod.flatten(record) : record) : mod.defaults();
      data.publicationState = creator && record?.publicationState === "published" ? "pending" : record?.publicationState || "draft";
      if (creator && !record) {
        const profile = window.MWECreator.account();
        Object.assign(data, { ownerName: profile?.name || "", owner: profile?.name || "", creator: profile?.name || "", email: profile?.email || "" });
      }
      $("aw-editor-module").textContent = mod.label;
      $("aw-editor-title").textContent = (record ? "Edit " : "Add ") + mod.singular;
      $("aw-editor-fields").innerHTML = mod.groups().map(g => '<fieldset><legend>' + esc(g.title) + '</legend>' + g.fields.map(f => editorField(f, data)).join("") + '</fieldset>').join("");
      $("aw-editor-error").hidden = true;
      $("aw-save").textContent = "Save " + mod.singular;
      returnFocus = document.activeElement;
      dirty = false;
      $("aw-editor").showModal();
      drawIcons();
    }
    function closeEditor() {
      if (busy) return;
      if (dirty && !confirm("Discard your unsaved changes?")) return;
      $("aw-editor").close();
      editing = null;
      dirty = false;
      if (returnFocus?.isConnected) returnFocus.focus(); else $("aw-main").focus();
    }
    $("aw-editor-form").addEventListener("input", () => { dirty = true; });
    $("aw-editor").addEventListener("cancel", e => { e.preventDefault(); closeEditor(); });
    document.querySelectorAll("[data-editor-close]").forEach(el => el.addEventListener("click", closeEditor));
    $("aw-editor-form").addEventListener("submit", async event => {
      event.preventDefault();
      if (!editing || busy || !document.body.classList.contains("is-authenticated")) return;
      $("aw-editor-error").hidden = true;
      try {
        const mod = modules[editing.key];
        const values = valuesFromEntries(editing.key, Object.fromEntries(new FormData(event.currentTarget)));
        const current = editing.record ? mod.get().find(r => r.id === editing.record.id) : null;
        if (editing.record && !window.MWEAdmin.sameRecord(current, editing.record)) throw new Error("This record changed elsewhere. Close and reopen it to review the latest version.");
        const record = { ...current, id: current?.id || editing.key + "-" + crypto.randomUUID(), updatedAt: new Date().toISOString() };
        busy = true;
        $("aw-save").disabled = true;
        const saved = await mod.save(record, values);
        const message = saved.publicationState === 'published' ? 'Saved and published.' : 'Saved to the server. Publication: ' + saved.publicationState + '.';
        dirty = false;
        busy = false;
        closeEditor();
        render();
        notice(message);
      } catch (error) {
        $("aw-editor-error").textContent = error.message || "Unable to save. Check browser storage and try again.";
        $("aw-editor-error").hidden = false;
        $("aw-editor-error").scrollIntoView({ block: "nearest" });
      } finally {
        busy = false;
        $("aw-save").disabled = false;
        if (editing) $("aw-save").textContent = "Save " + modules[editing.key].singular;
      }
    });
    document.addEventListener("click", event => {
      const create = event.target.closest("[data-create-module]");
      if (create) openEditor(create.dataset.createModule);
      const edit = event.target.closest("[data-edit-module]");
      if (edit) openEditor(edit.dataset.editModule, edit.dataset.editId);
      const city = event.target.closest("[data-location]");
      if (city) {
        history.pushState(null, "", "#churches");
        state.view = "churches";
        Object.assign(state, { query: "", category: city.dataset.location, status: "", page: 1 });
        render();
      }
      const action = event.target.closest("[data-aw-action]")?.dataset.awAction;
      if (action === "new") openEditor(state.view);
      if (action === "prev" || action === "next") { state.page += action === "next" ? 1 : -1; results(); }
      if (action === "clear") { Object.assign(state, { query: "", status: "", category: "", page: 1 }); list(); }
      if (action === "retry") render();
      const removeOption = event.target.closest("[data-taxonomy-remove]");
      if (removeOption) {
        const list = removeOption.closest(".aw-taxonomy-list");
        if (list.children.length <= 1) return notice("Keep at least one option in each group.");
        removeOption.closest(".aw-taxonomy-row").remove();
      }
      const addOption = event.target.closest("[data-taxonomy-add]");
      if (addOption) {
        const list = addOption.closest("form").querySelector(".aw-taxonomy-list");
        list.insertAdjacentHTML("beforeend", '<div class="aw-taxonomy-row"><input name="item" maxlength="80" required aria-label="New platform option" placeholder="New option" /><button class="aw-icon-button" type="button" data-taxonomy-remove aria-label="Remove option">' + icon("trash-2") + '</button></div>');
        list.lastElementChild.querySelector("input").focus();
        drawIcons();
      }
    });
    $("aw-content").addEventListener("submit", async event => {
      const form = event.target.closest("[data-taxonomy-form]");
      if (!form) return;
      event.preventDefault();
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        const items = [...form.querySelectorAll('[name="item"]')].map(input => input.value.trim());
        await window.MWEPlatform.saveTaxonomy(form.dataset.taxonomyForm, items);
        platformOptions();
        drawIcons();
        notice("Platform options saved.");
      } catch (error) {
        notice(error.message || "Unable to save platform options.");
      } finally {
        if (button.isConnected) button.disabled = false;
      }
    });
    const navBackdrop = document.createElement("button");
    navBackdrop.type = "button";
    navBackdrop.className = "aw-nav-backdrop";
    navBackdrop.setAttribute("aria-label", "Close navigation");
    document.body.append(navBackdrop);
    const setAdminNav = open => {
      document.body.classList.toggle("aw-nav-open", open);
      $("aw-menu").setAttribute("aria-expanded", String(open));
      $("aw-menu").setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    };
    $("aw-menu").addEventListener("click", () => setAdminNav(!document.body.classList.contains("aw-nav-open")));
    navBackdrop.addEventListener("click", () => setAdminNav(false));
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !$("aw-editor").open) {
        setAdminNav(false);
      }
    });
    window.addEventListener("hashchange", navigate);
    window.addEventListener("storage", () => { if (!$("aw-editor").open) render(); });
    window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
    navigate();
  });
})();
