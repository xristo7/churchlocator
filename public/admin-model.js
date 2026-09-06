/* Shared adapters. No independent copies of module records are maintained here. */
(function (root) {
  "use strict";
  const field = (key, label, type = "text", required = false, options, hint) => ({ key, label, type, required, options, hint });
  const yesNo = [["false", "No"], ["true", "Yes"]];
  const group = (title, fields) => ({ title, fields });
  const modules = {
    churches: {
      label: "Churches & locations", singular: "church", icon: "church", noun: "churches",
      description: "Profiles, locations and church verification.", page: "churches.html",
      get: () => root.MWE.getChurches(), title: r => r.name, owner: r => r.pastor,
      detail: r => [r.city, r.country].filter(Boolean).join(", "), category: r => r.city || "Unassigned",
      status: r => r.verified ? "Verified" : "Pending", statuses: ["Verified", "Pending"],
      preview: r => "church-profile.html?id=" + encodeURIComponent(r.id),
      groups: () => [
        group("01 · Church profile", [field("name", "Church name", "text", true), field("denomination", "Denomination"), field("pastor", "Lead pastor", "text", true), field("pastorTitle", "Leadership title"), field("about", "About the church", "textarea", true), field("pastorBio", "Pastor biography", "textarea")]),
        group("02 · Location & contact", [field("country", "Country", "text", true), field("city", "City", "text", true), field("area", "Area / neighbourhood"), field("postal", "Postal code"), field("location", "Street address", "text", true), field("email", "Contact email", "email", true), field("phone", "Contact phone", "tel"), field("website", "Website", "url")]),
        group("03 · Services & media", [field("sunday", "Sunday service", "text", true), field("midweek", "Midweek service"), field("language", "Language"), field("worship", "Worship style"), field("ministries", "Ministries", "text", false, null, "Separate ministries with commas."), field("photo", "Cover image URL", "url"), field("logo", "Logo URL", "url"), field("pastorPhoto", "Pastor image URL", "url"), field("tagline", "Short introduction")]),
        group("04 · Verification & livestream", [field("verified", "Profile verified", "select", false, yesNo), field("streamEnabled", "Livestream enabled", "select", false, yesNo), field("streamPaid", "Premium stream", "select", false, yesNo), field("streamUrl", "Livestream URL", "url")])
      ],
      flatten: r => ({ ...r, ministries: (r.ministries || []).join(", "), website: r.website === "#" ? "" : r.website, streamEnabled: !!r.livestream?.enabled, streamPaid: !!r.livestream?.paid, streamUrl: r.livestream?.url === "#" ? "" : r.livestream?.url }),
      defaults: () => ({ verified: false, streamEnabled: false, streamPaid: false, country: "Canada" }),
      save(r, v) {
        const { streamEnabled, streamPaid, streamUrl, ...values } = v;
        return root.MWE.upsertChurch({ ...r, ...values, phoneLabel: v.phone, emailHref: v.email ? "mailto:" + v.email : "", ministries: v.ministries.split(",").map(x => x.trim()).filter(Boolean), livestream: { ...r.livestream, enabled: streamEnabled, paid: streamPaid, url: streamUrl || "#", status: streamEnabled ? "Livestream active" : "Livestream unavailable" } });
      }
    },
    meditation: {
      label: "Meditation", singular: "room", icon: "flower-2", noun: "rooms",
      description: "Sanctuary rooms, scripture and atmosphere.", page: "meditation.html",
      get: () => root.MWEMeditation.getRooms(), title: r => r.title, owner: () => "My Way",
      detail: r => r.subtitle, category: r => ({ featured: "Featured", "bible-books": "Bible books", themes: "Scriptural themes" }[r.category] || r.category),
      status: () => "Available", statuses: ["Available"],
      preview: r => "meditation.html?room=" + encodeURIComponent(r.id),
      groups: () => [
        group("01 · Room details", [field("title", "Room title", "text", true), field("category", "Collection", "select", true, [["featured", "Featured"], ["bible-books", "Bible books"], ["themes", "Scriptural themes"]]), field("subtitle", "Introduction", "textarea", true)]),
        group("02 · Atmosphere", [field("cover", "Background image URL", "url", true), field("theme", "Atmosphere", "select", true, ["chapel", "stream", "stars", "forest"]), field("toneFreq", "Ambient tone (Hz)", "number", true, null, "Synthesized ambient tone; this is not an audio file upload.")]),
        group("03 · Scripture", [field("scriptures", "Room scriptures", "textarea", true, null, "One per line: Topic | Scripture text | Reference. Existing audio track definitions are preserved.")])
      ],
      flatten: r => ({ ...r, scriptures: (r.verses || []).map(v => [v.topic, v.text, v.ref].join(" | ")).join("\n") }),
      defaults: () => ({ category: "featured", theme: "chapel", toneFreq: 432 }),
      save(r, v) {
        const { scriptures, ...values } = v;
        const verses = scriptures.split("\n").filter(x => x.trim()).map(line => {
          const parts = line.split("|").map(x => x.trim());
          if (parts.length !== 3 || parts.some(x => !x)) throw new Error("Each scripture needs a topic, text and reference separated by |.");
          return { topic: parts[0], text: parts[1], ref: parts[2] };
        });
        if (!verses.length) throw new Error("Add at least one scripture.");
        if (v.toneFreq < 20 || v.toneFreq > 2000) throw new Error("Use an ambient tone between 20 and 2,000 Hz.");
        const audioTracks = r.audioTracks || Object.fromEntries(["bible", "instrumental", "worship", "sermon"].map(key => [key, { title: "Ambient reflection", cat: "Synthesized tone", freq: v.toneFreq }]));
        const saved = { ...r, ...values, verses, audioTracks, icon: r.icon || "book-open", categoryLabel: { featured: "Featured room", "bible-books": "Bible book", themes: "Scriptural theme" }[v.category] };
        replace(root.MWEMeditation.getRooms(), saved, root.MWEMeditation.saveRooms);
        return saved;
      }
    },
    events: {
      label: "Events", singular: "event", icon: "calendar-days", noun: "events",
      description: "Gatherings, church hosts and registration.", page: "events.html",
      get: () => root.MWE.getEvents(), title: r => r.title,
      owner: r => root.MWE.getChurches().find(c => c.id === r.churchId)?.name || "Unassigned church",
      detail: r => [r.city, r.startsAt?.replace("T", " · ")].filter(Boolean).join(" / "),
      category: r => r.eventType || "in-person",
      status: r => !r.startsAt ? "Needs date" : new Date(r.endsAt || r.startsAt) < new Date() ? "Past" : "Scheduled",
      statuses: ["Scheduled", "Past", "Needs date"], preview: r => "event-profile.html?id=" + encodeURIComponent(r.id),
      groups: () => [
        group("01 · Event & host", [field("title", "Event title", "text", true), field("churchId", "Host church", "select", true, root.MWE.getChurches().map(c => [c.id, c.name])), field("description", "Description", "textarea", true), field("eventType", "Format", "select", true, ["in-person", "online", "hybrid"])]),
        group("02 · Date & location", [field("startsAt", "Starts at (venue local time)", "datetime-local", true), field("endsAt", "Ends at (venue local time)", "datetime-local", true), field("venueName", "Venue name"), field("city", "City", "text", true), field("country", "Country", "text", true), field("directionsUrl", "Directions URL", "url")]),
        group("03 · Registration & media", [field("registrationRequired", "Registration required", "select", false, yesNo), field("totalTickets", "Capacity", "number"), field("ticketPriceCents", "Ticket price (minor units)", "number", false, null, "For example, 2500 = 25.00 in the selected currency."), field("currency", "Currency", "select", true, ["CAD", "USD", "GBP", "EUR"]), field("registrationUrl", "Registration URL", "url"), field("livestreamUrl", "Livestream URL", "url"), field("coverImageUrl", "Cover image URL", "url"), field("isFeatured", "Featured event", "select", false, yesNo)])
      ],
      defaults: () => ({ eventType: "in-person", currency: "CAD", totalTickets: 0, ticketPriceCents: 0, registrationRequired: false, isFeatured: false, country: "Canada" }),
      save(r, v) {
        if (new Date(v.endsAt) <= new Date(v.startsAt)) throw new Error("The event end must be after its start.");
        if (v.churchId && !root.MWE.getChurches().some(c => c.id === v.churchId)) throw new Error("Choose an existing host church.");
        if (v.totalTickets < (r.ticketsSold || 0)) throw new Error("Capacity cannot be below existing registrations.");
        return root.MWE.upsertEvent({ highlights: [], expectations: [], speakers: [], schedule: [], faqs: [], ticketsSold: 0, isPromoted: false, ...r, ...v });
      }
    },
    store: {
      label: "Store", singular: "product", icon: "shopping-bag", noun: "products",
      description: "Products, sellers, pricing and inventory.", page: "store.html",
      get: () => root.FaithLinkModules.getProducts(), title: r => r.title, owner: r => r.seller,
      detail: r => root.FaithLinkModules.money(r.price) + " · " + r.inventory + " in stock", category: r => r.category,
      status: r => r.status || "Draft", statuses: ["Active", "Draft", "Archived"], preview: r => "product-detail.html?id=" + encodeURIComponent(r.id),
      groups: () => [
        group("01 · Product & seller", [field("title", "Product title", "text", true), field("seller", "Seller name", "text", true), field("sellerType", "Seller type", "select", true, ["Church", "Channel"]), field("category", "Category", "select", true, ["Books", "Journals", "Apparel", "Church Supplies", "Study Tools", "Kids", "Music", "Gifts"]), field("description", "Description", "textarea", true)]),
        group("02 · Pricing & inventory", [field("price", "Price (CAD)", "number", true), field("compareAt", "Compare-at price (CAD)", "number"), field("inventory", "Stock quantity", "number", true)]),
        group("03 · Visibility & media", [field("status", "Store visibility", "select", true, ["Draft", "Active", "Archived"]), field("featured", "Featured product", "select", false, yesNo), field("image", "Product image URL", "url", true)])
      ],
      defaults: () => ({ status: "Draft", sellerType: "Church", category: "Books", price: 0, compareAt: 0, inventory: 0, featured: false }),
      save: (r, v) => root.FaithLinkModules.upsertProduct({ ...r, ...v })
    },
    channels: {
      label: "Channels", singular: "channel", icon: "radio-tower", noun: "channels",
      description: "Creators, formats and channel verification.", page: "channels.html",
      get: () => root.FaithLinkModules.getChannels(), title: r => r.name, owner: r => r.owner,
      detail: r => r.handle + " · " + r.format, category: r => r.topic,
      status: r => r.verified ? "Verified" : "Pending", statuses: ["Verified", "Pending"],
      preview: r => "channel-detail.html?id=" + encodeURIComponent(r.id),
      groups: () => [
        group("01 · Channel & creator", [field("name", "Channel name", "text", true), field("owner", "Creator / owner", "text", true), field("handle", "Channel handle", "text", true), field("topic", "Topic", "select", true, ["Bible Teaching", "Worship", "Family", "Leadership", "Youth", "Bible Study"]), field("description", "Description", "textarea", true)]),
        group("02 · Format & media", [field("format", "Primary format", "select", true, ["Podcast", "Video", "Livestream"]), field("cover", "Cover image URL", "url", true), field("avatar", "Avatar URL", "url")]),
        group("03 · Verification", [field("verified", "Creator verified", "select", false, yesNo), field("live", "Currently live", "select", false, yesNo)])
      ],
      defaults: () => ({ topic: "Bible Teaching", format: "Podcast", verified: false, live: false }),
      save(r, v) {
        if (!/^@[a-zA-Z0-9_.-]+$/.test(v.handle)) throw new Error("Use a handle starting with @, followed by letters, numbers, dots, underscores or hyphens.");
        if (root.FaithLinkModules.getChannels().some(c => c.id !== r.id && c.handle.toLowerCase() === v.handle.toLowerCase())) throw new Error("That channel handle is already in use.");
        const saved = { followers: 0, items: 0, ...r, ...v };
        replace(root.FaithLinkModules.getChannels(), saved, root.FaithLinkModules.saveChannels);
        return saved;
      }
    },
    resources: {
      label: "Resources", singular: "resource", icon: "library", noun: "resources",
      description: "Learning materials, formats and access.", page: "resources.html",
      get: () => root.FaithLinkModules.getResources(), title: r => r.title, owner: r => r.creator,
      detail: r => [r.type, r.format, r.duration].filter(Boolean).join(" · "), category: r => r.topic,
      status: r => r.access, statuses: ["Free", "Paid"], preview: r => "resource-detail.html?id=" + encodeURIComponent(r.id),
      groups: () => [
        group("01 · Resource & creator", [field("title", "Resource title", "text", true), field("creator", "Creator", "text", true), field("topic", "Topic", "select", true, ["Bible Study", "Prayer", "Discipleship", "Worship", "Devotional", "Leadership"]), field("description", "Description", "textarea", true)]),
        group("02 · Format & media", [field("type", "Content type", "select", true, ["Text", "Audio", "Video"]), field("format", "File format", "select", true, ["PDF", "EPUB", "MP3", "MP4"]), field("duration", "Length / duration", "text", true), field("image", "Cover image URL", "url", true)]),
        group("03 · Access & pricing", [field("access", "Access", "select", true, ["Free", "Paid"]), field("price", "Price (CAD)", "number", true)])
      ],
      defaults: () => ({ type: "Text", format: "PDF", topic: "Bible Study", access: "Free", price: 0 }),
      save(r, v) {
        if (v.access === "Paid" && v.price <= 0) throw new Error("Paid resources need a price above zero.");
        if (!({ Text: ["PDF", "EPUB"], Audio: ["MP3"], Video: ["MP4"] }[v.type] || []).includes(v.format)) throw new Error("Choose a file format that matches the content type.");
        const saved = { rating: 0, ...r, ...v, price: v.access === "Free" ? 0 : v.price };
        replace(root.FaithLinkModules.getResources(), saved, root.FaithLinkModules.saveResources);
        return saved;
      }
    }
  };
  function replace(rows, saved, write) {
    const index = rows.findIndex(r => r.id === saved.id);
    if (index < 0) rows.unshift(saved); else rows[index] = saved;
    write(rows);
  }
  function valuesFromEntries(moduleKey, entries) {
    const values = {};
    modules[moduleKey].groups().flatMap(g => g.fields).forEach(f => {
      const raw = String(entries[f.key] ?? "").trim();
      if (f.required && !raw) throw new Error(f.label + " is required.");
      if (f.type === "url" && raw && !/^https?:\/\//i.test(raw) && !/^assets\/[a-z0-9_./-]+$/i.test(raw)) throw new Error(f.label + " must be an http(s) URL.");
      if (f.type === "select") {
        const allowed = (f.options || []).map(o => Array.isArray(o) ? o[0] : o);
        const existing = modules[moduleKey].get().some(record => String(record[f.key]) === raw);
        if (!allowed.includes(raw) && !existing) throw new Error("Choose a valid " + f.label.toLowerCase() + ".");
      }
      if (f.options === yesNo) values[f.key] = raw === "true";
      else if (f.type === "number") {
        const number = Number(raw);
        if (!Number.isFinite(number) || number < 0) throw new Error(f.label + " must be zero or greater.");
        if (["inventory", "totalTickets", "ticketPriceCents"].includes(f.key) && !Number.isInteger(number)) throw new Error(f.label + " must be a whole number.");
        values[f.key] = number;
      } else values[f.key] = raw;
    });
    return values;
  }
  function filterRows(key, { query = "", status = "", category = "", sort = "name" } = {}) {
    const mod = modules[key];
    const needle = query.trim().toLowerCase();
    return mod.get().filter(r => (!needle || [mod.title(r), mod.owner(r), mod.detail(r), mod.category(r), r.email, r.location].join(" ").toLowerCase().includes(needle)) && (!status || mod.status(r) === status) && (!category || mod.category(r) === category))
      .sort((a, b) => sort === "recent" ? String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")) : mod.title(a).localeCompare(mod.title(b)));
  }
  // Legacy seed normalization creates a fresh createdAt on every read.
  // Ignore that fallback timestamp while detecting actual concurrent edits.
  function sameRecord(left, right) {
    const content = record => {
      if (!record) return null;
      const { createdAt, ...rest } = record;
      return rest;
    };
    return JSON.stringify(content(left)) === JSON.stringify(content(right));
  }
  root.MWEAdmin = { modules, valuesFromEntries, filterRows, sameRecord };
})(window);
