/* Shared adapters. No independent copies of module records are maintained here. */
(function (root) {
  "use strict";
  const field = (key, label, type = "text", required = false, options, hint) => ({ key, label, type, required, options, hint });
  const optionDefaults = {
    denominations: ["Christ Embassy", "New Generation", "Pentecostal", "Full Gospel", "Charismatic", "Baptist", "Catholic", "Anglican", "Presbyterian", "Protestant"],
    languages: ["English", "French", "Spanish", "Portuguese", "Swahili", "Arabic"],
    worship_styles: ["Contemporary", "Traditional", "Blended", "Charismatic"],
    product_categories: ["Books", "Journals", "Apparel", "Church Supplies", "Study Tools", "Kids", "Music", "Gifts"],
    channel_topics: ["Bible Teaching", "Worship", "Family", "Leadership", "Youth", "Bible Study"],
    resource_topics: ["Bible Study", "Prayer", "Discipleship", "Worship", "Devotional", "Leadership"]
  };
  const platformOptions = key => root.MWEPlatform?.options?.(key) || optionDefaults[key];
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
        group("01 · Church profile", [field("name", "Church name", "text", true), field("denomination", "Denomination", "select", true, platformOptions("denominations")), field("pastor", "Lead pastor", "text", true), field("pastorTitle", "Leadership title"), field("about", "About the church", "textarea", true), field("pastorBio", "Pastor biography", "textarea")]),
        group("02 · Location & contact", [field("country", "Country", "text", true), field("city", "City", "text", true), field("area", "Area / neighbourhood"), field("postal", "Postal code"), field("location", "Street address", "text", true), field("email", "Contact email", "email", true), field("phone", "Contact phone", "tel"), field("website", "Website", "url")]),
        group("03 · Services & media", [field("sunday", "Sunday service", "text", true), field("midweek", "Midweek service"), field("language", "Language", "select", false, platformOptions("languages")), field("worship", "Worship style", "select", false, platformOptions("worship_styles")), field("ministries", "Ministries", "text", false, null, "Separate ministries with commas."), field("photo", "Cover image URL", "url"), field("logo", "Logo URL", "url"), field("pastorPhoto", "Pastor image URL", "url"), field("tagline", "Short introduction")]),
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
      get: () => root.MWEMeditation.getRooms(), title: r => r.title, owner: r => r.ownerName || "My Way",
      detail: r => r.subtitle, category: r => ({ featured: "Featured", "bible-books": "Bible books", themes: "Scriptural themes" }[r.category] || r.category),
      status: () => "Available", statuses: ["Available"],
      preview: r => "meditation.html?room=" + encodeURIComponent(r.id),
      groups: () => [
        group("01 · Room details", [field("title", "Room title", "text", true), field("category", "Collection", "select", true, [["featured", "Featured"], ["bible-books", "Bible books"], ["themes", "Scriptural themes"]]), field("subtitle", "Introduction", "textarea", true)]),
        group("02 · Atmosphere & audio", [field("cover", "Background image URL", "url", true), field("theme", "Atmosphere", "select", true, ["chapel", "stream", "stars", "forest", "mountains"]), field("template", "Room experience", "select", true, [["timer", "Stillness timer"], ["ripple", "Healing ripple"], ["journey", "Guided journey"], ["nature", "Nature teaching"], ["sunburst", "Victory sunburst"]]), field("purpose", "Room purpose", "select", true, [["prayer", "Prayer"], ["peace", "Peace"], ["healing", "Healing"], ["scripture", "Scripture"], ["worship", "Worship"], ["joy", "Joy"]]), field("mode", "Preferred room mode", "select", true, [["light", "Light"], ["dark", "Dark"]]), field("themeColor", "Theme color", "color", false), field("toneFreq", "Ambient tone (Hz)", "number", true, null, "Synthesized ambient tone; this is not an audio file upload."), field("selectedAudio", "Background audio track", "select", false, [["bible", "Dramatized Audio Bible"], ["instrumental", "Soaking Instrumental (432Hz)"], ["worship", "Christian Worship"], ["sermon", "Sermons & Preaching"], ["silence", "Silence / Ambience Only"]])]),
        group("03 · Scripture", [field("scriptures", "Room scriptures", "textarea", true, null, "One per line: Topic | Scripture text | Reference. Existing audio track definitions are preserved.")]),
        group("04 · Prayer flow", [field("timeMode", "Session timing", "select", true, [["timed", "Timed"], ["teaching", "Teaching"], ["loop", "Endless loop"]]), field("durationMinutes", "Session duration minutes", "number", true), field("autoPlayInterval", "Auto-advance seconds", "number", true), field("allowUserNavigation", "Allow participant navigation", "select", false, yesNo), field("inhaleWord", "Breathing guide inhale word"), field("exhaleWord", "Breathing guide exhale word")]),
        group("05 · Fellowship & live chat", [field("commentsEnabled", "Enable live comments", "select", false, yesNo, "Allow participants to share comments and prayer notes in the room.")])
      ],
      flatten: r => ({ ...r, selectedAudio: r.selectedAudio || "bible", commentsEnabled: String(!!r.commentsEnabled), allowUserNavigation: String(r.allowUserNavigation !== false), scriptures: (r.verses || []).map(v => [v.topic, v.text, v.ref].join(" | ")).join("\n") }),
      defaults: () => ({ category: "featured", theme: "chapel", template: "timer", purpose: "prayer", mode: "light", themeColor: "#3b82f6", toneFreq: 432, selectedAudio: "bible", timeMode: "timed", durationMinutes: 20, autoPlayInterval: 300, allowUserNavigation: true, inhaleWord: "Jesus", exhaleWord: "Give Me Peace", commentsEnabled: false }),
      save(r, v) {
        const { scriptures, ...values } = v;
        const verses = scriptures.split("\n").filter(x => x.trim()).map(line => {
          const parts = line.split("|").map(x => x.trim());
          if (parts.length !== 3 || parts.some(x => !x)) throw new Error("Each scripture needs a topic, text and reference separated by |.");
          return { topic: parts[0], text: parts[1], ref: parts[2] };
        });
        if (!verses.length) throw new Error("Add at least one scripture.");
        if (v.toneFreq < 20 || v.toneFreq > 2000) throw new Error("Use an ambient tone between 20 and 2,000 Hz.");
        if (v.durationMinutes < 1 || v.durationMinutes > 240) throw new Error("Use a room duration between 1 and 240 minutes.");
        if (v.autoPlayInterval < 0 || v.autoPlayInterval > 3600) throw new Error("Use an auto-advance interval between 0 and 3,600 seconds.");
        const audioTracks = r.audioTracks || Object.fromEntries(["bible", "instrumental", "worship", "sermon"].map(key => [key, { title: "Ambient reflection", cat: "Synthesized tone", freq: v.toneFreq }]));
        const selectedAudio = v.selectedAudio || r.selectedAudio || "bible";
        const commentsEnabled = typeof v.commentsEnabled === "boolean" ? v.commentsEnabled : (r.commentsEnabled ?? false);
        const allowUserNavigation = typeof v.allowUserNavigation === "boolean" ? v.allowUserNavigation : true;
        const saved = { ...r, ...values, selectedAudio, commentsEnabled, allowUserNavigation, verses, audioTracks, icon: r.icon || "book-open", categoryLabel: { featured: "Featured room", "bible-books": "Bible book", themes: "Scriptural theme" }[v.category] };
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
        group("01 · Product & seller", [field("title", "Product title", "text", true), field("seller", "Seller name", "text", true), field("sellerType", "Seller type", "select", true, ["Church", "Channel"]), field("itemType", "Listing type", "select", true, [["product", "Physical product"], ["service", "Bookable service"]]), field("serviceType", "Service type"), field("category", "Category", "select", true, platformOptions("product_categories")), field("description", "Description", "textarea", true)]),
        group("02 · Pricing & inventory", [field("price", "Price (CAD)", "number", true), field("compareAt", "Compare-at price (CAD)", "number"), field("pricingUnit", "Pricing unit"), field("inventory", "Stock / booking slots", "number", true)]),
        group("03 · Service details", [field("capacity", "Capacity / specs"), field("audioSample", "Audio sample URL", "url"), field("audioTitle", "Audio sample title"), field("requirements", "Booking requirements", "textarea"), field("guidelines", "Facility guidelines", "textarea"), field("turnaround", "Turnaround time", "textarea"), field("deliverablesText", "Deliverables", "textarea", false, null, "One deliverable per line."), field("amenitiesText", "Amenities", "textarea", false, null, "One amenity per line."), field("tiersText", "Packages", "textarea", false, null, "One package per line: Name | Price | Duration | Highlight; Highlight")]),
        group("04 · Visibility & media", [field("status", "Store visibility", "select", true, ["Draft", "Active", "Archived"]), field("featured", "Featured product", "select", false, yesNo), field("image", "Product image URL", "url", true)])
      ],
      flatten: r => ({ ...r, itemType: r.itemType || "product", deliverablesText: (r.deliverables || []).join("\n"), amenitiesText: (r.amenities || []).join("\n"), tiersText: (r.tiers || []).map(t => [t.name, t.price, t.duration, (t.highlights || []).join("; ")].join(" | ")).join("\n") }),
      defaults: () => ({ status: "Draft", sellerType: "Church", itemType: "product", category: platformOptions("product_categories")[0] || "", price: 0, compareAt: 0, pricingUnit: "", inventory: 0, featured: false }),
      save(r, v) {
        const lines = value => String(value || "").split("\n").map(x => x.trim()).filter(Boolean);
        const tiers = lines(v.tiersText).map((line, index) => {
          const parts = line.split("|").map(x => x.trim());
          if (parts.length < 3 || parts.some((part, i) => i < 3 && !part)) throw new Error("Each package needs a name, price and duration separated by |.");
          const price = Number(parts[1]);
          if (!Number.isFinite(price) || price < 0) throw new Error("Package prices must be zero or greater.");
          return { id: "tier-" + (index + 1), name: parts[0], price, duration: parts[2], highlights: (parts[3] || "").split(";").map(x => x.trim()).filter(Boolean) };
        });
        const { deliverablesText, amenitiesText, tiersText, ...values } = v;
        if (values.itemType === "service" && !tiers.length) throw new Error("Bookable services need at least one package.");
        return root.FaithLinkModules.upsertProduct({ ...r, ...values, itemType: values.itemType || "product", deliverables: lines(deliverablesText), amenities: lines(amenitiesText), tiers });
      }
    },
    channels: {
      label: "Channels", singular: "channel", icon: "radio-tower", noun: "channels",
      description: "Creators, formats and channel verification.", page: "channels.html",
      get: () => root.FaithLinkModules.getChannels(), title: r => r.name, owner: r => r.owner,
      detail: r => r.handle + " · " + r.format, category: r => r.topic,
      status: r => r.verified ? "Verified" : "Pending", statuses: ["Verified", "Pending"],
      preview: r => "channel-detail.html?id=" + encodeURIComponent(r.id),
      groups: () => [
        group("01 · Channel & creator", [field("name", "Channel name", "text", true), field("owner", "Creator / owner", "text", true), field("handle", "Channel handle", "text", true), field("topic", "Topic", "select", true, platformOptions("channel_topics")), field("description", "Description", "textarea", true)]),
        group("02 · Format & media", [field("format", "Primary format", "select", true, ["Podcast", "Video", "Livestream"]), field("cover", "Cover image URL", "url", true), field("avatar", "Avatar URL", "url")]),
        group("03 · Channel content", [field("postsText", "Latest posts", "textarea", false, null, "One post per line: Title | Summary | Content URL")]),
        group("04 · Verification", [field("verified", "Creator verified", "select", false, yesNo), field("live", "Currently live", "select", false, yesNo)])
      ],
      flatten: r => ({ ...r, postsText: (r.posts || []).map(post => [post.title, post.summary, post.url].filter(Boolean).join(" | ")).join("\n") }),
      defaults: () => ({ topic: platformOptions("channel_topics")[0] || "", format: "Podcast", verified: false, live: false }),
      save(r, v) {
        if (!/^@[a-zA-Z0-9_.-]+$/.test(v.handle)) throw new Error("Use a handle starting with @, followed by letters, numbers, dots, underscores or hyphens.");
        if (root.FaithLinkModules.getChannels().some(c => c.id !== r.id && c.handle.toLowerCase() === v.handle.toLowerCase())) throw new Error("That channel handle is already in use.");
        const posts = String(v.postsText || "").split("\n").map(line => line.trim()).filter(Boolean).map(line => {
          const [title, summary, url] = line.split("|").map(x => x.trim());
          if (!title || !summary) throw new Error("Each channel post needs a title and summary separated by |.");
          if (url && !/^https?:\/\//i.test(url) && !/^[\w.-]+\.html(?:[?#].*)?$/i.test(url)) throw new Error("Channel post URLs must be http(s) or a local page.");
          return { title, summary, url };
        });
        const { postsText, ...values } = v;
        const saved = { followers: 0, items: posts.length || Number(r.items || 0), ...r, ...values, posts };
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
        group("01 · Resource & creator", [field("title", "Resource title", "text", true), field("creator", "Creator", "text", true), field("topic", "Topic", "select", true, platformOptions("resource_topics")), field("description", "Description", "textarea", true)]),
        group("02 · Format & media", [field("type", "Content type", "select", true, ["Text", "Audio", "Video"]), field("format", "File format", "select", true, ["Article", "PDF", "DOC", "EPUB", "TXT", "MP3", "AAC", "MP4", "FLV"]), field("duration", "Length / duration", "text", true), field("image", "Cover image URL", "url", true), field("sourceUrl", "Material URL", "url", false, null, "Link to the actual PDF, EPUB, audio or video."), field("mediaUrl", "Playable media URL", "url", false, null, "Direct audio/video file or embeddable video URL.")]),
        group("03 · Content", [field("pagesText", "Article / reader pages", "textarea", false, null, "Use ---page--- on its own line to begin a new page.")]),
        group("04 · Access & pricing", [field("access", "Access", "select", true, ["Free", "Paid"]), field("price", "Price (CAD)", "number", true)])
      ],
      flatten: r => ({ ...r, pagesText: (r.pages || []).join("\n\n---page---\n\n") }),
      defaults: () => ({ type: "Text", format: "PDF", topic: platformOptions("resource_topics")[0] || "", access: "Free", price: 0 }),
      save(r, v) {
        if (v.access === "Paid" && v.price <= 0) throw new Error("Paid resources need a price above zero.");
        if (!({ Text: ["Article", "PDF", "DOC", "EPUB", "TXT"], Audio: ["MP3", "AAC"], Video: ["MP4", "FLV"] }[v.type] || []).includes(v.format)) throw new Error("Choose a file format that matches the content type.");
        const pages = String(v.pagesText || "").split(/\n\s*---page---\s*\n/i).map(page => page.trim()).filter(Boolean);
        if (v.type === "Text" && !pages.length && !v.sourceUrl && !r.attachmentData) throw new Error("Text resources need reader pages or a material URL.");
        if (["Audio", "Video"].includes(v.type) && !v.mediaUrl && !v.sourceUrl && !r.attachmentData) throw new Error(v.type + " resources need a playable media URL or material URL.");
        const { pagesText, ...values } = v;
        const saved = { rating: 0, ...r, ...values, pages, price: v.access === "Free" ? 0 : v.price };
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
