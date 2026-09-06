(function (root) {
  const { modules } = root.MWEAdmin;
  const f = (key, label, type = "text", required = false, options, hint) => ({ key, label, type, required, options, hint });
  const booleanOptions = [["false", "Offline"], ["true", "Live"]];
  // Store profiles are distinct from individual products.
  modules.products = { ...modules.store, label: "Products", auxiliary: true };
  const productGroups = modules.products.groups;
  modules.products.groups = () => [{ title: "Store connection", fields: [f("storeId", "Store profile", "select", document.body.hasAttribute("data-creator-workspace"), [["", "Unassigned"], ...root.MWECreator.getStores().filter(s => !document.body.hasAttribute("data-creator-workspace") || s.createdBy === root.MWECreator.account()?.id).map(s => [s.id, s.name])])] }, ...productGroups()];
  const productSave = modules.products.save;
  modules.products.save = (r, v) => {
    const store = root.MWECreator.getStores().find(s => s.id === v.storeId);
    if (v.storeId && !store) throw new Error("Choose an existing store.");
    if (document.body.hasAttribute("data-creator-workspace") && (!store || store.createdBy !== root.MWECreator.account()?.id)) throw new Error("Create and select your own store before adding products.");
    return productSave(r, { ...v, seller: store?.name || v.seller });
  };
  modules.store = {
    label: "Stores", singular: "store", icon: "store", noun: "stores",
    description: "Store profiles, seller identity and live shopping.", page: "store.html",
    get: root.MWECreator.getStores, title: r => r.name, owner: r => r.ownerName,
    detail: r => r.description, category: r => r.category, status: r => r.live ? "Live" : "Offline", statuses: ["Live", "Offline"],
    preview: r => "storefront.html?id=" + encodeURIComponent(r.id),
    groups: () => [
      { title: "01 · Store profile", fields: [f("name", "Store name", "text", true), f("ownerName", "Store owner", "text", true), f("category", "Category", "select", true, ["Books & resources", "Apparel", "Music", "Gifts", "Church supplies", "General"]), f("description", "About your store", "textarea", true), f("image", "Cover image URL", "url"), f("email", "Contact email", "email", true)] },
      { title: "02 · Live shopping", fields: [f("liveUrl", "Broadcast URL", "url", false, null, "Add the HTTPS link to your external broadcast. My Way does not capture your camera or host video."), f("live", "Broadcast status", "select", true, booleanOptions)] }
    ],
    defaults: () => ({ category: "General", live: "false" }),
    save(r, v) {
      const saved = { ...r, ...v, live: v.live === true || v.live === "true" };
      if (saved.live && !root.MWECreator.safeLiveUrl(saved.liveUrl)) throw new Error("Add a valid HTTPS broadcast URL before going live.");
      const records = root.MWECreator.getStores();
      const index = records.findIndex(x => x.id === saved.id);
      if (index < 0) records.push(saved); else records[index] = saved;
      root.MWECreator.saveStores(records);
      return saved;
    }
  };
  const channelGroups = modules.channels.groups;
  modules.channels.groups = () => channelGroups().map(g => ({ ...g, fields: g.fields.filter(f => f.key !== "live") })).concat({
    title: "04 · Live broadcast",
    fields: [f("liveUrl", "Broadcast URL", "url", false, null, "Use an HTTPS link from your broadcasting provider."), f("live", "Broadcast status", "select", true, booleanOptions)]
  });
  const channelSave = modules.channels.save;
  modules.channels.save = (r, v) => {
    v.live = v.live === true || v.live === "true";
    if (v.live && !root.MWECreator.safeLiveUrl(v.liveUrl)) throw new Error("Add a valid HTTPS broadcast URL before going live.");
    return channelSave(r, v);
  };
  const churchSave = modules.churches.save;
  modules.churches.save = (r, v) => {
    if (v.streamEnabled && !root.MWECreator.safeLiveUrl(v.streamUrl)) throw new Error("Add an HTTPS broadcast URL before enabling the church livestream.");
    return churchSave(r, v);
  };
  // A personal account can organize an event without creating a church first.
  const eventGroups = modules.events.groups;
  modules.events.groups = () => eventGroups().map(g => ({ ...g, fields: g.fields.map(field => field.key === "churchId" ? { ...field, required: false, options: [["", "Independent event / my account"], ...root.MWE.getChurches().map(c => [c.id, c.name])] } : field) }));
  modules.events.owner = r => root.MWE.getChurches().find(c => c.id === r.churchId)?.name || r.ownerName || "Independent event";
  const resourceGroups = modules.resources.groups;
  modules.resources.groups = () => resourceGroups().concat({ title: "04 · Resource material", fields: [f("sourceUrl", "Material URL", "url", false, null, "Link to the actual PDF, EPUB, audio or video. Existing uploaded attachments are preserved.")] });
  const resourceSave = modules.resources.save;
  modules.resources.save = (r, v) => {
    if (!r.title && !v.sourceUrl) throw new Error("Add a link to the resource material.");
    return resourceSave(r, v);
  };

  if (!document.body.hasAttribute("data-creator-workspace")) return;
  const profile = root.MWECreator.account();
  if (profile && localStorage.getItem("mwe.userLoggedIn") === "true") document.body.classList.add("is-authenticated");
  // Creator controls only show records created by this local account. Never infer ownership
  // from sample church names or grant creator access to the owner dashboard.
  Object.entries(modules).forEach(([key, mod]) => {
    const getAll = mod.get;
    const save = mod.save;
    const groups = mod.groups;
    mod.get = () => {
      const current = root.MWECreator.account();
      return current ? getAll().filter(record => record.createdBy === current.id) : [];
    };
    mod.groups = () => groups().map(g => ({ ...g, fields: g.fields.filter(field => !["verified", "streamPaid"].includes(field.key)).map(field => {
      if (field.key === "churchId") return { ...field, options: [["", "Independent event / my account"], ...modules.churches.get().map(c => [c.id, c.name])] };
      return field;
    }) })).filter(g => g.fields.length);
    mod.save = (r, values) => {
      const current = root.MWECreator.account();
      if (!current || localStorage.getItem("mwe.userLoggedIn") !== "true") throw new Error("Sign in to your account first.");
      const existing = getAll().find(record => record.id === r.id);
      if (existing && existing.createdBy !== current.id) throw new Error("You can only edit your own records.");
      const record = { ...r, createdBy: current.id, ownerName: r.ownerName || current.name, createdAt: r.createdAt || new Date().toISOString() };
      if (key === "churches" || key === "channels") values.verified = existing?.verified || false;
      if (key === "churches") values.streamPaid = existing?.livestream?.paid || false;
      if (key === "events" && values.churchId && !modules.churches.get().some(c => c.id === values.churchId)) throw new Error("Choose one of your own churches or create an independent event.");
      return save(record, values);
    };
  });
})(window);
