const MWE_THEME_KEY = "mwe.platform.theme.v1";
const MWE_PRIMARY_COLOR_KEY = "mwe.platform.primary.v1";

const RAINBOW_PALETTES = [
  { id: "blue", name: "Sapphire Blue", color: "#2563eb", class: "swatch-blue" },
  { id: "indigo", name: "Electric Indigo", color: "#4f46e5", class: "swatch-indigo" },
  { id: "purple", name: "Royal Amethyst", color: "#7c3aed", class: "swatch-purple" },
  { id: "pink", name: "Radiant Rose", color: "#db2777", class: "swatch-pink" },
  { id: "red", name: "Crimson Ruby", color: "#e11d48", class: "swatch-red" },
  { id: "orange", name: "Sunset Flame", color: "#ea580c", class: "swatch-orange" },
  { id: "green", name: "Emerald Forest", color: "#059669", class: "swatch-green" },
  { id: "teal", name: "Ocean Cyan", color: "#0d9488", class: "swatch-teal" }
];

function getPreferredTheme() {
  const saved = localStorage.getItem(MWE_THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getPreferredPrimaryColor() {
  const saved = localStorage.getItem(MWE_PRIMARY_COLOR_KEY);
  if (RAINBOW_PALETTES.some(p => p.id === saved)) return saved;
  return "blue";
}

function applyTheme(theme, persist = false) {
  const resolved = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  if (persist) localStorage.setItem(MWE_THEME_KEY, resolved);

  document.querySelectorAll("[data-theme-toggle]").forEach(button => {
    const isDark = resolved === "dark";
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    button.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
    button.innerHTML = `<i data-lucide="${isDark ? "sun" : "moon"}"></i><span>${isDark ? "Light" : "Dark"}</span>`;
  });

  document.querySelectorAll("[data-mode-toggle-btn]").forEach(btn => {
    const active = btn.dataset.modeToggleBtn === resolved;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });

  const frame = document.getElementById("member-shell-frame");
  frame?.contentWindow?.postMessage({ type: "mwe-theme", theme: resolved }, window.location.origin);
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

function applyPrimaryColor(primaryColor, persist = false) {
  const resolved = RAINBOW_PALETTES.some(p => p.id === primaryColor) ? primaryColor : "blue";
  document.documentElement.dataset.primary = resolved;
  if (persist) localStorage.setItem(MWE_PRIMARY_COLOR_KEY, resolved);

  const pal = RAINBOW_PALETTES.find(p => p.id === resolved);

  document.querySelectorAll("[data-primary-indicator]").forEach(el => {
    if (pal) el.style.background = pal.color;
  });

  document.querySelectorAll("[data-palette-swatch]").forEach(btn => {
    const active = btn.dataset.paletteSwatch === resolved;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-checked", String(active));
  });

  const frame = document.getElementById("member-shell-frame");
  frame?.contentWindow?.postMessage({ type: "mwe-primary-color", primaryColor: resolved }, window.location.origin);
}

function initThemeControl() {
  applyTheme(getPreferredTheme());
  applyPrimaryColor(getPreferredPrimaryColor());

  const target = document.body.classList.contains("member-app-shell")
    ? document.querySelector(".member-shell-actions")
    : document.querySelector(".aw-top-actions, .nav-actions");

  if (target && !target.querySelector(".theme-palette-container")) {
    const currentPrimary = getPreferredPrimaryColor();
    const currentTheme = getPreferredTheme();
    const currentPal = RAINBOW_PALETTES.find(p => p.id === currentPrimary) || RAINBOW_PALETTES[0];

    const container = document.createElement("div");
    container.className = "theme-palette-container";
    container.innerHTML = `
      <button type="button" class="theme-palette-btn" id="theme-palette-trigger" aria-haspopup="dialog" aria-expanded="false" title="Theme & Color Palette">
        <span class="theme-palette-indicator" data-primary-indicator style="background: ${currentPal.color};"></span>
        <i data-lucide="palette"></i>
        <span>Theme</span>
      </button>
      <div class="theme-palette-popover" id="theme-palette-menu" hidden role="dialog" aria-label="Theme and color palette settings">
        <div class="theme-palette-header">
          <strong><i data-lucide="palette"></i> Appearance & Colors</strong>
        </div>
        
        <div class="mode-toggle-group">
          <button type="button" class="mode-toggle-btn ${currentTheme === 'light' ? 'active' : ''}" data-mode-toggle-btn="light">
            <i data-lucide="sun"></i> Light
          </button>
          <button type="button" class="mode-toggle-btn ${currentTheme === 'dark' ? 'active' : ''}" data-mode-toggle-btn="dark">
            <i data-lucide="moon"></i> Dark
          </button>
        </div>

        <div>
          <div class="palette-section-title">Primary Color Accent</div>
          <div class="rainbow-swatch-grid" role="radiogroup" aria-label="Primary color options">
            ${RAINBOW_PALETTES.map(p => `
              <button
                type="button"
                class="swatch-btn ${p.class} ${p.id === currentPrimary ? 'active' : ''}"
                data-palette-swatch="${p.id}"
                title="${p.name}"
                aria-label="${p.name}"
                role="radio"
                aria-checked="${p.id === currentPrimary}"
              ></button>
            `).join('')}
          </div>
        </div>

        <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; padding-top: 4px; border-top: 1px solid var(--border-subtle);">
          <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:var(--gold); box-shadow:0 0 6px var(--gold);"></span>
          <span>Gold accents are standard across all themes.</span>
        </div>
      </div>
    `;

    target.prepend(container);

    const trigger = container.querySelector("#theme-palette-trigger");
    const popover = container.querySelector("#theme-palette-menu");

    trigger?.addEventListener("click", event => {
      event.stopPropagation();
      const isHidden = popover.hidden;
      popover.hidden = !isHidden;
      trigger.setAttribute("aria-expanded", String(isHidden));
      container.classList.toggle("has-active-popover", !isHidden);
      container.closest(".topbar, .aw-topbar, .dash-topbar, header, .member-shell-header")?.classList.toggle("has-active-popover", !isHidden);
    });

    popover?.addEventListener("click", event => {
      event.stopPropagation();
      const modeBtn = event.target.closest("[data-mode-toggle-btn]");
      if (modeBtn) {
        applyTheme(modeBtn.dataset.modeToggleBtn, true);
        return;
      }

      const swatchBtn = event.target.closest("[data-palette-swatch]");
      if (swatchBtn) {
        applyPrimaryColor(swatchBtn.dataset.paletteSwatch, true);
        return;
      }
    });

    document.addEventListener("click", () => {
      if (popover && !popover.hidden) {
        popover.hidden = true;
        trigger?.setAttribute("aria-expanded", "false");
        container.classList.remove("has-active-popover");
        container.closest(".topbar, .aw-topbar, .dash-topbar, header, .member-shell-header")?.classList.remove("has-active-popover");
      }
    });
  }

  // Also maintain existing data-theme-toggle compatibility
  document.querySelectorAll("[data-theme-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
    });
  });

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

function initScrollReveal() {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".reveal-on-scroll").forEach(el => el.classList.add("is-revealed"));
    return;
  }

  const selector = [
    ".church-card",
    ".event-card",
    ".channel-card",
    ".channel-profile-card",
    ".store-product-card",
    ".resource-card",
    ".kpi-card",
    ".dash-panel",
    ".donation-impact-card",
    ".content-callout",
    ".readable-grid > div",
    ".hero-feature-pill",
    ".tiny-church-card",
    ".search-card",
    ".profile-story",
    ".command-card",
    ".live-card",
    ".card",
    ".story-card",
    ".stream-info-card"
  ].join(", ");

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        obs.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: "0px 0px -40px 0px",
    threshold: 0.08
  });

  function scanAndObserve() {
    document.querySelectorAll(selector).forEach(el => {
      if (!el.classList.contains("reveal-on-scroll")) {
        el.classList.add("reveal-on-scroll");
        observer.observe(el);
      }
    });
  }

  scanAndObserve();

  // Monitor DOM modifications to reveal new cards (e.g. filters or pagination)
  if (window.MutationObserver) {
    const domObserver = new MutationObserver(() => scanAndObserve());
    domObserver.observe(document.body, { childList: true, subtree: true });
  }
}

applyTheme(getPreferredTheme());
applyPrimaryColor(getPreferredPrimaryColor());

window.addEventListener("storage", event => {
  if (event.key === MWE_THEME_KEY) applyTheme(getPreferredTheme());
  if (event.key === MWE_PRIMARY_COLOR_KEY) applyPrimaryColor(getPreferredPrimaryColor());
});

window.addEventListener("message", event => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === "mwe-theme") {
    applyTheme(event.data.theme);
  } else if (event.data?.type === "mwe-primary-color") {
    applyPrimaryColor(event.data.primaryColor);
  }
});

const MWE = (() => {
  const storageKey = "mwe.platform.churches.v1";
  const defaultImage = "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=1500&q=85";

  const seedChurches = [
    {
      id: "christ-embassy-edmonton",
      name: "Christ Embassy Edmonton",
      city: "Edmonton",
      country: "Canada",
      postal: "T6E 5X4",
      denomination: "Pentecostal",
      language: "English",
      worship: "Contemporary",
      area: "South Edmonton",
      distance: "Local listing",
      sunday: "Sunday 10:00 AM",
      midweek: "Wednesday 7:00 PM",
      location: "9012 51 Ave NW, Edmonton, AB T6E 5X4",
      website: "https://christembassyedmonton.org/",
      phone: "+17809891002",
      phoneLabel: "(780) 989-1002",
      email: "info@christembassyedmonton.org",
      photo: "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=1500&q=85",
      logo: "assets/logo-light-chapel.png",
      pastorPhoto: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80",
      pastor: "Pastor John",
      pastorTitle: "Lead Pastor",
      pastorBio: "A Word-based church family welcoming believers, visitors, and new Christians into worship, prayer, teaching, and evangelism.",
      welcomeMedia: "https://www.youtube.com/embed/jiSyB8QZzk8",
      tagline: "Giving lives a meaning through the Word, worship, prayer, and evangelism.",
      about: "Christ Embassy Edmonton is a Bible-believing church in Edmonton with Sunday worship, midweek service, sermons, and evangelism resources for members and visitors.",
      ministries: ["Kids", "Youth", "Prayer", "Worship", "Evangelism", "Rhapsody"],
      features: ["Children's Ministry", "Youth Ministry", "Bible Study", "Livestream Available", "Parking Available"],
      schedule: [
        ["Sunday Service", "10:00 AM"],
        ["Midweek Service", "Wednesday 7:00 PM"],
        ["Prayer Meeting", "Weekly"],
        ["Evangelism Team", "Active"]
      ],
      livestream: { enabled: true, paid: true, url: "https://christembassyedmonton.org/", status: "Premium livestream active" },
      verified: true
    },
    {
      id: "beulah-alliance-west",
      name: "Beulah Alliance Church",
      city: "Edmonton",
      country: "Canada",
      postal: "T5T 5T8",
      denomination: "Alliance",
      language: "English",
      worship: "Contemporary",
      area: "West Edmonton",
      distance: "Local listing",
      sunday: "Saturday 6:30 PM | Sunday 9:00 AM & 11:00 AM",
      midweek: "Groups and ministry gatherings",
      location: "17504 98A Avenue NW, Edmonton, AB T5T 5T8",
      website: "https://beulah.ca/",
      phone: "+17804864010",
      phoneLabel: "780-486-4010",
      email: "info@beulah.ca",
      photo: "https://images.unsplash.com/photo-1490122417551-6ee9691429d0?auto=format&fit=crop&w=1500&q=85",
      logo: "assets/logo-grace-house.png",
      pastorPhoto: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80",
      pastor: "Pastor Teddy",
      pastorTitle: "Lead Pastor",
      pastorBio: "A multi-generational church serving greater Edmonton through worship gatherings, groups, ministries, and community care.",
      welcomeMedia: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      tagline: "A church family helping people take their next step with Jesus.",
      about: "Beulah Alliance Church serves greater Edmonton through in-person gatherings, online church, ministries, groups, and next-step pathways for families and individuals.",
      ministries: ["Kids", "Youth", "Groups", "Care", "Missions", "Prayer"],
      features: ["Children's Ministry", "Youth Ministry", "Bible Study", "Livestream Available", "Wheelchair Accessible"],
      schedule: [
        ["Saturday Service", "6:30 PM"],
        ["Sunday Services", "9:00 AM, 11:00 AM"],
        ["Online Church", "Available"],
        ["Groups", "Weekly"]
      ],
      livestream: { enabled: true, paid: true, url: "https://bac.online.church/", status: "Premium livestream active" },
      verified: true
    },
    {
      id: "first-alliance-calgary",
      name: "First Alliance Church Calgary",
      city: "Calgary",
      country: "Canada",
      postal: "",
      denomination: "Alliance",
      language: "English",
      worship: "Contemporary",
      area: "Deerfoot Campus",
      distance: "Local listing",
      sunday: "Sunday services | Online campus available",
      midweek: "Groups and ministry gatherings",
      location: "12345 40 St SE, Calgary, AB",
      website: "https://www.faccalgary.com/",
      phone: "+14032527572",
      phoneLabel: "403-252-7572",
      email: "Contact form",
      emailHref: "https://www.faccalgary.com/contactus",
      photo: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1500&q=85",
      logo: "assets/logo-river-city.png",
      pastorPhoto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
      pastor: "Pastor Mary",
      pastorTitle: "Lead Pastor",
      pastorBio: "A Calgary church community focused on worship, formation, families, and joining Jesus in renewal.",
      welcomeMedia: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      tagline: "Worship, formation, family ministry, and renewal in Calgary.",
      about: "First Alliance Church Calgary is a multi-campus church helping people worship, find community, and grow in the life and mission of Jesus.",
      ministries: ["Kids", "Youth", "Young Adults", "Groups", "Care", "Arts"],
      features: ["Children's Ministry", "Youth Ministry", "Bible Study", "Livestream Available", "Parking Available"],
      schedule: [
        ["Sunday Services", "In-person and online"],
        ["Online Campus", "Available"],
        ["Groups", "Weekly"],
        ["Care Ministry", "Available"]
      ],
      livestream: { enabled: false, paid: false, url: "https://www.faccalgary.com/", status: "Livestream upgrade available" },
      verified: true
    },
    {
      id: "the-peoples-church-toronto",
      name: "The Peoples Church",
      city: "Toronto",
      country: "Canada",
      postal: "M2N 3B6",
      denomination: "Non-denominational",
      language: "English",
      worship: "Blended",
      area: "North York",
      distance: "Local listing",
      sunday: "Sunday 9:00 AM | Sunday 11:30 AM",
      midweek: "Prayer, groups, and missions gatherings",
      location: "374 Sheppard Avenue East, Toronto, ON M2N 3B6",
      website: "https://thepeopleschurch.ca/",
      phone: "+14162223341",
      phoneLabel: "416-222-3341",
      email: "info@thepeopleschurch.ca",
      photo: "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=1500&q=85",
      logo: "assets/logo-new-life.png",
      pastorPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
      pastor: "Pastor David",
      pastorTitle: "Lead Pastor",
      pastorBio: "A Toronto church community focused on worship, global mission, discipleship, and serving people across cultures.",
      welcomeMedia: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      tagline: "Growing the body of Christ for God's global mission.",
      about: "The Peoples Church is a Toronto church growing the body of Christ for God's global mission, with in-person services and online participation.",
      ministries: ["Kids", "Youth", "Groups", "Missions", "Prayer", "Care"],
      features: ["Children's Ministry", "Youth Ministry", "Livestream Available", "Public Transport Nearby"],
      schedule: [
        ["Sunday Service", "9:00 AM"],
        ["Sunday Service", "11:30 AM"],
        ["Missions", "Active"],
        ["Prayer", "Weekly"]
      ],
      livestream: { enabled: true, paid: true, url: "https://thepeopleschurch.ca/", status: "Premium livestream active" },
      verified: true
    }
  ];

  const impactStats = [
    ["Churches Connected", 1284, "church"],
    ["Cities Covered", 312, "map-pin"],
    ["Countries Reached", 44, "globe"],
    ["People Connected", 28640, "users"],
    ["Prayer Requests Submitted", 9108, "heart"],
    ["New Church Visitors", 4732, "user-plus"]
  ];

  const stories = [
    ["Community outreach", "Neighborhood welcome teams", "assets/community-outreach.png"],
    ["Missions", "Local teams serving across borders", "assets/mission-trips.png"],
    ["Youth ministry", "Next generation evangelism", "assets/youth-ministry.png"],
    ["Children's ministry", "Safe spaces for families", "assets/children-ministry.png"],
    ["Humanitarian projects", "Faith with practical compassion", "assets/humanitarian-projects.png"],
    ["Baptisms", "New believers taking public steps", "assets/baptism-service.png"]
  ];

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function slugify(text) {
    return String(text || "church")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `church-${Date.now()}`;
  }

  function titleCase(text = "") {
    return String(text).replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }

  function normalizeChurch(church) {
    const livestream = church.livestream || {};
    const ministries = Array.isArray(church.ministries) ? church.ministries.filter(Boolean) : [];
    const streamEnabled = Boolean(livestream.enabled || church.streamEnabled);
    const streamPaid = Boolean(livestream.paid || church.streamPaid);
    const phone = church.phone || "";
    const email = church.email || "";

    return {
      createdBy: church.createdBy || "",
      ownerName: church.ownerName || "",
      updatedAt: church.updatedAt || "",
      id: church.id || slugify(church.name),
      name: church.name || "Unnamed Church",
      city: titleCase(church.city || ""),
      country: titleCase(church.country || ""),
      postal: church.postal || "",
      denomination: church.denomination || "",
      language: church.language || "English",
      worship: church.worship || "Contemporary",
      area: church.area || church.city || "Local Area",
      distance: church.distance || "Local listing",
      sunday: church.sunday || "Sunday service",
      midweek: church.midweek || "Midweek gathering",
      location: church.location || church.address || "Location pending",
      website: church.website || "#",
      phone,
      phoneLabel: church.phoneLabel || phone,
      email,
      emailHref: church.emailHref || (email && email.includes("@") ? `mailto:${email}` : church.website || "#"),
      photo: church.photo || church.image || defaultImage,
      logo: church.logo || "assets/logo-light-chapel.png",
      pastorPhoto: church.pastorPhoto || "assets/pastor-light-chapel.png",
      pastor: church.pastor || "Pastoral Team",
      pastorTitle: church.pastorTitle || "Church Leadership",
      pastorBio: church.pastorBio || "A welcoming church leadership team ready to help visitors connect.",
      welcomeMedia: church.welcomeMedia || "https://www.youtube.com/embed/jiSyB8QZzk8",
      tagline: church.tagline || "A local church ready to welcome visitors.",
      about: church.about || church.description || "This church profile is ready for more details from the church team.",
      ministries,
      features: Array.isArray(church.features) ? church.features : [],
      schedule: Array.isArray(church.schedule) ? church.schedule : [],
      livestream: {
        enabled: streamEnabled,
        paid: streamPaid,
        url: livestream.url || church.streamUrl || "#",
        status: livestream.status || (streamEnabled ? "Premium livestream active" : "Livestream upgrade available")
      },
      verified: church.verified !== false,
      createdAt: church.createdAt || new Date().toISOString()
    };
  }

  function loadChurches() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(saved) && saved.length > 0) return saved.map(normalizeChurch);
    } catch {
      localStorage.removeItem(storageKey);
    }
    return seedChurches.map(normalizeChurch);
  }

  function saveChurches(churches) {
    localStorage.setItem(storageKey, JSON.stringify(churches.map(normalizeChurch)));
  }

  function getChurches() {
    return loadChurches();
  }

  function getChurch(id) {
    return getChurches().find(church => church.id === id) || getChurches()[0];
  }

  function uniqueId(name, currentId = "") {
    const base = currentId || slugify(name);
    const churches = getChurches();
    if (currentId || !churches.some(church => church.id === base)) return base;
    let index = 2;
    while (churches.some(church => church.id === `${base}-${index}`)) index += 1;
    return `${base}-${index}`;
  }

  function upsertChurch(church) {
    const normalized = normalizeChurch(church);
    const churches = getChurches();
    const index = churches.findIndex(item => item.id === normalized.id);
    if (index >= 0) {
      churches[index] = normalized;
    } else {
      churches.push(normalized);
    }
    saveChurches(churches);
    return normalized;
  }

  function removeChurch(id) {
    saveChurches(getChurches().filter(church => church.id !== id));
  }

  function resetData() {
    localStorage.removeItem(storageKey);
  }

  function churchFromForm(form) {
    const data = new FormData(form);
    const currentId = data.get("id") || "";
    const ministries = String(data.get("ministries") || "")
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
    const streamEnabled = data.get("streamEnabled") === "true";
    const streamPaid = data.get("streamPaid") === "true";
    const streamUrl = String(data.get("streamUrl") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const email = String(data.get("email") || "").trim();
    const name = String(data.get("name") || "").trim();

    return normalizeChurch({
      id: uniqueId(name, currentId),
      name,
      city: data.get("city"),
      country: data.get("country"),
      postal: data.get("postal"),
      denomination: data.get("denomination"),
      language: data.get("language"),
      worship: data.get("worship"),
      area: data.get("area"),
      sunday: data.get("sunday"),
      midweek: data.get("midweek"),
      location: data.get("location"),
      website: data.get("website"),
      phone,
      phoneLabel: phone,
      email,
      photo: data.get("photo") || defaultImage,
      logo: data.get("logo") || "assets/logo-light-chapel.png",
      pastorPhoto: data.get("pastorPhoto") || "assets/pastor-light-chapel.png",
      pastor: data.get("pastor"),
      pastorTitle: data.get("pastorTitle"),
      pastorBio: data.get("pastorBio"),
      tagline: data.get("tagline"),
      about: data.get("about"),
      ministries,
      features: [
        ministries.some(item => item.toLowerCase().includes("kids") || item.toLowerCase().includes("children")) ? "Children's Ministry" : "",
        ministries.some(item => item.toLowerCase().includes("youth")) ? "Youth Ministry" : "",
        streamEnabled ? "Livestream Available" : "",
        "Bible Study"
      ].filter(Boolean),
      livestream: {
        enabled: streamEnabled,
        paid: streamPaid,
        url: streamUrl || "#",
        status: streamEnabled ? (streamPaid ? "Premium livestream active" : "Livestream active") : "Livestream upgrade available"
      },
      verified: data.get("verified") !== "false"
    });
  }

  function fillChurchForm(form, church) {
    const normalized = normalizeChurch(church);
    const values = {
      id: normalized.id,
      name: normalized.name,
      city: normalized.city,
      country: normalized.country,
      postal: normalized.postal,
      denomination: normalized.denomination,
      language: normalized.language,
      worship: normalized.worship,
      area: normalized.area,
      sunday: normalized.sunday,
      midweek: normalized.midweek,
      location: normalized.location,
      website: normalized.website === "#" ? "" : normalized.website,
      phone: normalized.phone,
      email: normalized.email,
      photo: normalized.photo === defaultImage ? "" : normalized.photo,
      logo: normalized.logo,
      pastorPhoto: normalized.pastorPhoto,
      pastor: normalized.pastor,
      pastorTitle: normalized.pastorTitle,
      pastorBio: normalized.pastorBio,
      tagline: normalized.tagline,
      about: normalized.about,
      ministries: normalized.ministries.join(", "),
      streamEnabled: String(normalized.livestream.enabled),
      streamPaid: String(normalized.livestream.paid),
      streamUrl: normalized.livestream.url === "#" ? "" : normalized.livestream.url,
      verified: String(normalized.verified)
    };

    Object.entries(values).forEach(([key, value]) => {
      if (form.elements[key]) form.elements[key].value = value;
    });
  }

  async function syncAdminChurch(church) {
    if (location.hostname === "127.0.0.1" && location.port === "4173") return false;
    try {
      const response = await fetch("/api/admin/churches", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(church)
      });
      return response.ok && response.headers.get("content-type")?.includes("application/json");
    } catch {
      return false;
    }
  }

  async function syncDeleteChurch(id) {
    if (location.hostname === "127.0.0.1" && location.port === "4173") return false;
    try {
      const response = await fetch("/api/admin/churches", {
        method: "DELETE",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ id })
      });
      return response.ok && response.headers.get("content-type")?.includes("application/json");
    } catch {
      return false;
    }
  }

  const eventsStorageKey = "mwe.platform.events.v4";
  const registrationsStorageKey = "mwe.platform.registrations.v2";

  const seedEvents = [
    {
      id: "calgary-awakening-2026",
      churchId: "first-alliance-calgary",
      title: "Calgary Awakening Conference 2026",
      eventType: "in-person",
      startsAt: "2026-08-15T09:00",
      endsAt: "2026-08-17T17:00",
      venueName: "FAC Calgary Main Campus",
      city: "Calgary",
      country: "Canada",
      coverImageUrl: "https://images.unsplash.com/photo-1510531704581-5b2870972060?auto=format&fit=crop&w=800&q=80",
      registrationRequired: true,
      ticketPriceCents: 0,
      currency: "USD",
      totalTickets: 800,
      ticketsSold: 142,
      isFeatured: true,
      isPromoted: false,
      registrationUrl: "",
      livestreamUrl: "",
      directionsUrl: "https://maps.google.com/?q=First+Alliance+Church+Calgary",
      description: "Join us for 3 days of worship, teaching, and break-out sessions focused on renewal and outreach in western Canada.",
      highlights: [
        { title: "Community Fellowship", desc: "Meet leaders and network over refreshments.", icon: "fa-users", color: "brand" },
        { title: "Live Worship Session", desc: "Contemporary hymns led by worship choirs.", icon: "fa-music", color: "clay" },
        { title: "Family & Kids Activities", desc: "Dedicated playground and Sunday school support.", icon: "fa-child", color: "gold" }
      ],
      expectations: [
        { title: "Deep Biblical Sermons", desc: "Join custom seminars exploring scriptures, history context reviews, and dynamic modern application models.", icon: "fa-book-bible", color: "brand" },
        { title: "Worship & Praise Choirs", desc: "Experience powerful contemporary hymns, worship team bands, and inspirational spiritual choir sessions.", icon: "fa-guitar", color: "clay" },
        { title: "Community Outreach", desc: "Participate in charity events, networking forums, and local missionary support plans.", icon: "fa-hands-holding-heart", color: "gold" }
      ],
      speakers: [
        { name: "Pastor Marcus Vance", role: "Host Pastor", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80", specialty: "Pastor", bio: "Pastor Marcus Vance has been ministering for 15 years, specializing in community outreach and local church connection strategies." },
        { name: "Dr. Helen Vance", role: "Theologian & Professor", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80", specialty: "Teacher", bio: "Dr. Helen Vance teaches historical theology, focusing on early Christian communities and scriptural contexts." },
        { name: "David Cole", role: "Worship Director", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80", specialty: "Worship Leader", bio: "David Cole is an acclaimed worship composer, directing musical choirs and instrumental praise bands globally." }
      ],
      schedule: [
        { day: 1, time: "09:30 AM", endTime: "11:00 AM", title: "Awakening & Opening Praise", track: "keynote", host: "David Cole", desc: "Opening praise concert with contemporary worship tunes and welcoming keynotes." },
        { day: 1, time: "11:30 AM", endTime: "01:00 PM", title: "Keynote: Spiritual Revival", track: "keynote", host: "Pastor Marcus Vance", desc: "Opening keynote message on renewal, outreach, and local revival strategies in Western Canada." },
        { day: 2, time: "10:00 AM", endTime: "11:30 AM", title: "Panel: Outreach Innovation", track: "panel", host: "Dr. Helen Vance", desc: "Practical interactive panel outlining modern visitor integration and evangelism tools." },
        { day: 2, time: "02:00 PM", endTime: "03:30 PM", title: "Workshop: Community Engagement", track: "workshop", host: "Hospitality Team", desc: "Detailed breakdown on managing ministry volunteer databases and church activities." },
        { day: 3, time: "01:30 PM", endTime: "03:00 PM", title: "Closing Worship & Dedication", track: "keynote", host: "David Cole", desc: "Final prayer, dedication, and inspirational worship service to send you forth." }
      ],
      faqs: [
        { question: "Is lunch provided?", answer: "Yes, complimentary light lunch boxes and beverages will be served during the afternoon fellowship break." },
        { question: "Where do I park?", answer: "Complimentary visitor parking is available in the north FAC Calgary campus parking lot." },
        { question: "Can I register my ministry team?", answer: "Yes, you can register up to 5 passes at once using the admission drawer." }
      ]
    },
    {
      id: "edmonton-worship-night",
      churchId: "christ-embassy-edmonton",
      title: "Night of Praise and Divine Worship",
      eventType: "in-person",
      startsAt: "2026-08-28T19:00",
      endsAt: "2026-08-28T22:30",
      venueName: "CE Edmonton Worship Center",
      city: "Edmonton",
      country: "Canada",
      coverImageUrl: "https://images.unsplash.com/photo-1471560090527-d1af5e4e6eb6?auto=format&fit=crop&w=800&q=80",
      registrationRequired: true,
      ticketPriceCents: 1000,
      currency: "USD",
      totalTickets: 300,
      ticketsSold: 94,
      isFeatured: false,
      isPromoted: true,
      registrationUrl: "",
      livestreamUrl: "",
      directionsUrl: "https://maps.google.com/?q=Christ+Embassy+Edmonton",
      description: "A special night of contemporary worship and prayer with CE music team. Ticket price includes refreshment vouchers.",
      highlights: [
        { title: "Praise Choirs", desc: "An evening of contemporary anthems.", icon: "fa-guitar", color: "clay" },
        { title: "Prayer Intercessions", desc: "Submit prayer needs live to our team.", icon: "fa-hands-praying", color: "brand" },
        { title: "Fellowship Café", desc: "Meet neighboring fellowships over refreshments.", icon: "fa-mug-hot", color: "gold" }
      ],
      expectations: [
        { title: "Live Worship Band", desc: "Contemporary hymns led by CE music team and special guest singers.", icon: "fa-music", color: "clay" },
        { title: "Candlelight Prayer", desc: "Dedicated time for contemplative prayer, healing intercessions, and blessings.", icon: "fa-fire-burner", color: "brand" },
        { title: "Worship Fellowship", desc: "Get refreshment vouchers to spend in our church fellowship lobby café.", icon: "fa-cookie", color: "gold" }
      ],
      speakers: [
        { name: "Pastor Samuel Okoye", role: "Lead Pastor", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80", specialty: "Pastor", bio: "Pastor Samuel Okoye leads CE Edmonton, directing regional prayer conferences and teaching covenant faith." },
        { name: "Sister Rebecca Lynn", role: "Choir Director", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80", specialty: "Worship Leader", bio: "Rebecca leads contemporary choir ensembles, training worship singers in vocal execution and spiritual ministry." }
      ],
      schedule: [
        { day: 1, time: "07:00 PM", endTime: "08:30 PM", title: "Doors Open & Cafe Fellowship", track: "panel", host: "CE Cafe Staff", desc: "Collect your check-in vouchers, meet friends, and grab coffee in the lobby." },
        { day: 1, time: "08:45 PM", endTime: "10:15 PM", title: "Keynote Worship: Praise Introit", track: "keynote", host: "Rebecca Lynn", desc: "Energetic worship concert featuring CE Edmonton choir and acoustic band." },
        { day: 2, time: "06:30 PM", endTime: "08:00 PM", title: "Workshop: Praise Team Vocal Training", track: "workshop", host: "Rebecca Lynn", desc: "Special coaching session training local worship singers in vocal execution and spiritual ministry." },
        { day: 2, time: "08:15 PM", endTime: "09:45 PM", title: "Sermon: Covenant Grace Worship", track: "keynote", host: "Pastor Samuel Okoye", desc: "Sermon exploring biblical praise and historical teachings on worship." },
        { day: 3, time: "07:30 PM", endTime: "09:00 PM", title: "Prophetic Prayer & Anointing", track: "keynote", host: "Pastor Samuel Okoye", desc: "Dedicated candlelight prayer session and lay hands healing intercessions." }
      ],
      faqs: [
        { question: "What is the ticket price for?", answer: "The $10 ticket price goes directly to cover refreshments and coffee vouchers at the church café." },
        { question: "Can I join online?", answer: "Yes, this service is streamed live for those unable to attend in-person." },
        { question: "Are children welcome?", answer: "Absolutely, child assemblies are welcome with family seating rooms available." }
      ]
    },
    {
      id: "global-bible-study",
      churchId: "beulah-alliance-west",
      title: "Global Online Bible Fellowship",
      eventType: "streamed",
      startsAt: "2026-09-01T19:30",
      endsAt: "2026-09-01T21:00",
      venueName: "Online Campus",
      city: "Edmonton",
      country: "Canada",
      coverImageUrl: "https://images.unsplash.com/photo-1447069387593-a5de0862481e?auto=format&fit=crop&w=800&q=80",
      registrationRequired: true,
      ticketPriceCents: 0,
      currency: "USD",
      totalTickets: 1000,
      ticketsSold: 341,
      isFeatured: false,
      isPromoted: false,
      registrationUrl: "",
      livestreamUrl: "https://bac.online.church/",
      directionsUrl: "",
      description: "An online group study focused on the Epistles, broadcasted live globally. All study guides will be sent via email upon registration.",
      highlights: [
        { title: "Global Broadcast", desc: "Study from home with stream links.", icon: "fa-tv", color: "brand" },
        { title: "Interactive Chat", desc: "Share prayer needs in real-time.", icon: "fa-comments", color: "clay" },
        { title: "Downloadable Guides", desc: "PDF lesson guides emailed to you.", icon: "fa-file-pdf", color: "gold" }
      ],
      expectations: [
        { title: "Verse-by-Verse Study", desc: "A deep contextual analysis of biblical texts, history, and application.", icon: "fa-book-open", color: "brand" },
        { title: "Interactive Q&A", desc: "Live session where you submit text questions directly to our theologians.", icon: "fa-circle-question", color: "clay" },
        { title: "Online Breakout Rooms", desc: "Optional video call small groups to connect, reflect, and pray with others.", icon: "fa-circle-nodes", color: "gold" }
      ],
      speakers: [
        { name: "Dr. Jonathan Vance", role: "Biblical Scholar", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80", specialty: "Teacher", bio: "Dr. Jonathan Vance holds a Ph.D. in Biblical Exegesis and leads our global online theological fellowships." },
        { name: "Pastor Sarah Jenkins", role: "Online Pastor", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80", specialty: "Pastor", bio: "Pastor Sarah Jenkins manages our digital campuses, virtual counseling rooms, and small group networks." }
      ],
      schedule: [
        { day: 1, time: "07:30 PM", endTime: "08:30 PM", title: "Online Lobby & Welcome Chat", track: "panel", host: "Sarah Jenkins", desc: "Virtual lobby welcome, icebreakers in live chat, and prayer submissions." },
        { day: 1, time: "08:45 PM", endTime: "10:15 PM", title: "Keynote Study: Romans 8 Exegesis", track: "keynote", host: "Dr. Jonathan Vance", desc: "Deep study covering the history, structure, and applications of Romans 8." },
        { day: 2, time: "07:00 PM", endTime: "08:30 PM", title: "Workshop: Scripture Hermeneutics", track: "workshop", host: "Dr. Jonathan Vance", desc: "Learn theological principles of interpreting ancient biblical letters accurately." },
        { day: 2, time: "08:45 PM", endTime: "10:00 PM", title: "Panel: Digital Church Evangelism", track: "panel", host: "Pastor Sarah Jenkins", desc: "Audience Q&A panel exploring digital small groups and counseling outreach networks." },
        { day: 3, time: "07:30 PM", endTime: "09:00 PM", title: "Global Prayer Broadcast", track: "keynote", host: "Sarah Jenkins", desc: "Intercessory prayer broadcast connecting virtual rooms around the world." }
      ],
      faqs: [
        { question: "How do I get the stream link?", answer: "The link bac.online.church is displayed on this page and will be emailed upon pass registration." },
        { question: "Do I need to buy study books?", answer: "No, all digital study guides and outline worksheets are completely free." },
        { question: "Which bible translation is used?", answer: "Dr. Vance will be teaching from the English Standard Version (ESV)." }
      ]
    },
    {
      id: "pastors-leadership-forum",
      churchId: "beulah-alliance-west",
      title: "Christian Leadership Forum 2026",
      eventType: "in-person",
      startsAt: "2026-10-10T09:00",
      endsAt: "2026-10-10T16:00",
      venueName: "Alliance West Auditorium",
      city: "Edmonton",
      country: "Canada",
      coverImageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
      registrationRequired: true,
      ticketPriceCents: 2500,
      currency: "USD",
      totalTickets: 150,
      ticketsSold: 12,
      isFeatured: true,
      isPromoted: true,
      registrationUrl: "",
      livestreamUrl: "",
      directionsUrl: "https://maps.google.com/?q=Beulah+Alliance+Church+Edmonton",
      description: "Equipping pastors and ministry team leaders with modern outreach tools, volunteer management strategies, and event coordination tips.",
      highlights: [
        { title: "Pastors Roundtable", desc: "Share church growth insights.", icon: "fa-users-line", color: "brand" },
        { title: "Outreach Strategy", desc: "Methods for local vicinity evangelism.", icon: "fa-map-location-dot", color: "clay" },
        { title: "Volunteer Management", desc: "Toolkits for managing team networks.", icon: "fa-toolbox", color: "gold" }
      ],
      expectations: [
        { title: "Strategic Panels", desc: "Hear experienced church planners discuss contemporary ministry challenges.", icon: "fa-user-group", color: "brand" },
        { title: "Church Resource Kits", desc: "Get copies of training manuals, volunteer handbooks, and budget planners.", icon: "fa-copy", color: "clay" },
        { title: "Networking Lunch", desc: "Interact with senior pastors, worship directors, and church planters.", icon: "fa-comments", color: "gold" }
      ],
      speakers: [
        { name: "Pastor Marcus Vance", role: "Senior Evangelist", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80", specialty: "Pastor", bio: "Pastor Marcus coordinates national evangelism forums, supporting new church plants in Canada." },
        { name: "Sister Evelyn Rose", role: "Youth Coordinator", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80", specialty: "Director", bio: "Evelyn manages training networks for youth leadership, outreach camps, and student ministries." }
      ],
      schedule: [
        { day: 1, time: "09:00 AM", endTime: "10:30 AM", title: "Keynote: Growth in Western Canada", track: "keynote", host: "Pastor Marcus Vance", desc: "Panel presentation outlining structural renewal, data-driven outreach, and local evangelism." },
        { day: 1, time: "11:00 AM", endTime: "12:30 PM", title: "Workshop: Empowering Volunteers", track: "workshop", host: "Evelyn Rose", desc: "Interactive break-out outlining recruitment, vetting, and leader development tools." },
        { day: 2, time: "09:30 AM", endTime: "11:00 AM", title: "Panel: Church Planting Realities", track: "panel", host: "Pastor Marcus Vance", desc: "Strategic roundtable discussing budget planning, venues, and team launches." },
        { day: 2, time: "02:00 PM", endTime: "03:30 PM", title: "Workshop: Student Ministries Camp", track: "workshop", host: "Evelyn Rose", desc: "Curriculum planning guide for training coordinators and student outreach coordinators." },
        { day: 3, time: "01:00 PM", endTime: "03:00 PM", title: "Forum Closing Panel & Prayer", track: "panel", host: "Pastor Marcus Vance", desc: "Closing panel resolving local concerns, Q&A summaries, and sending-forth prayers." }
      ],
      faqs: [
        { question: "Who is this forum designed for?", answer: "It is built for senior pastors, associate leaders, worship directors, and key ministry volunteers." },
        { question: "Are session replays available?", answer: "Yes, video recordings of the keynote panel will be sent to all registered delegates." },
        { question: "Is child care provided?", answer: "No, child supervision is not available due to the seminar nature of this event." }
      ]
    },
    {
      id: "past-evangelism-outreach",
      churchId: "christ-embassy-edmonton",
      title: "Edmonton Summer Outreach 2025",
      eventType: "in-person",
      startsAt: "2025-06-12T10:00",
      endsAt: "2025-06-12T16:00",
      venueName: "Edmonton River Valley Park",
      city: "Edmonton",
      country: "Canada",
      coverImageUrl: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=800&q=80",
      registrationRequired: false,
      ticketPriceCents: 0,
      currency: "USD",
      totalTickets: 500,
      ticketsSold: 180,
      isFeatured: false,
      isPromoted: false,
      registrationUrl: "",
      livestreamUrl: "",
      directionsUrl: "",
      description: "Our annual summer evangelism drive reaching local communities with resources, counseling, and children's activities.",
      highlights: [
        { title: "Neighborhood BBQ", desc: "Complimentary food and music.", icon: "fa-utensils", color: "brand" },
        { title: "Kids Play Zones", desc: "Inflatable bouncers and games.", icon: "fa-gamepad", color: "clay" },
        { title: "Community Support", desc: "Free clothing and food distributions.", icon: "fa-hand-holding-heart", color: "gold" }
      ],
      expectations: [
        { title: "Outdoor Praise Concert", desc: "Praise hymns and acoustic worship performance in the park.", icon: "fa-guitar", color: "clay" },
        { title: "Family Carnival Games", desc: "Interactive sports, face painting, and friendly competitions for kids.", icon: "fa-child", color: "brand" },
        { title: "Outreach & Prayers", desc: "Local coordinators share stories of faith, counseling services, and free bibles.", icon: "fa-bible", color: "gold" }
      ],
      speakers: [
        { name: "Pastor Samuel Okoye", role: "Outreach Lead", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80", specialty: "Pastor", bio: "Pastor Samuel Okoye leads CE Edmonton regional outreaches, providing community support and evangelism campaigns." },
        { name: "Brother Thomas Lee", role: "Children's Coordinator", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80", specialty: "Director", bio: "Thomas coordinates community sports leagues, children's camp assemblies, and outdoor game parks." },
        { name: "David Cole", role: "Worship Guest", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80", specialty: "Worship Leader", bio: "David Cole directs worship assemblies in Western Canada, leading regional praise sessions." }
      ],
      schedule: [
        { day: 1, time: "10:00 AM", endTime: "11:30 AM", title: "Outreach Kickoff & BBQ Setup", track: "panel", host: "Thomas Lee", desc: "Park registration desk opens, outdoor music starts, and bouncy castles are active." },
        { day: 1, time: "12:00 PM", endTime: "01:30 PM", title: "Worship in the Park Praise", track: "keynote", host: "David Cole", desc: "Outdoor praise concert and community singing session for local neighborhood visitors." },
        { day: 2, time: "10:30 AM", endTime: "12:00 PM", title: "Workshop: Child Evangelism Games", track: "workshop", host: "Thomas Lee", desc: "Learn to manage public park sports games and faith-oriented outreach stories for children." },
        { day: 2, time: "02:00 PM", endTime: "03:30 PM", title: "Keynote: Message of Hope Sermon", track: "keynote", host: "Pastor Samuel Okoye", desc: "Outdoor message highlighting faith, hope, and testimonies from our local members." },
        { day: 3, time: "01:00 PM", endTime: "03:00 PM", title: "Community Giveaways & Clean-up", track: "panel", host: "Thomas Lee", desc: "Free bible giveaways, grocery distributions, and park cleaning raffle." }
      ],
      faqs: [
        { question: "Is the food completely free?", answer: "Yes, all BBQ food, snacks, and drinks are complimentary for all park visitors." },
        { question: "What if it rains?", answer: "In case of rain, the outreach is shifted to the indoor gymnasium of CE Edmonton." },
        { question: "Do I need to sign up?", answer: "Registration is not required, but signing up helps our kitchen size food batches." }
      ]
    }
  ];

  function loadEvents() {
    try {
      const saved = JSON.parse(localStorage.getItem(eventsStorageKey) || "null");
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {
      localStorage.removeItem(eventsStorageKey);
    }
    return seedEvents;
  }

  function saveEvents(evts) {
    localStorage.setItem(eventsStorageKey, JSON.stringify(evts));
  }

  function getEvents() {
    return loadEvents();
  }

  function getEvent(id) {
    return getEvents().find(evt => evt.id === id);
  }

  function upsertEvent(evt) {
    const evts = getEvents();
    const index = evts.findIndex(item => item.id === evt.id);
    if (index >= 0) {
      evts[index] = { ...evts[index], ...evt };
    } else {
      evts.push(evt);
    }
    saveEvents(evts);
    return evt;
  }

  function removeEvent(id) {
    saveEvents(getEvents().filter(evt => evt.id !== id));
  }

  function loadRegistrations() {
    try {
      return JSON.parse(localStorage.getItem(registrationsStorageKey) || "[]");
    } catch {
      return [];
    }
  }

  function saveRegistrations(regs) {
    localStorage.setItem(registrationsStorageKey, JSON.stringify(regs));
  }

  function registerForEvent(reg) {
    const regs = loadRegistrations();
    const id = "REG-" + Math.floor(100000 + Math.random() * 900000);
    const newReg = {
      id,
      eventId: reg.eventId,
      fullName: reg.fullName,
      email: reg.email,
      ticketQuantity: reg.ticketQuantity,
      amountPaidCents: reg.amountPaidCents,
      registrationCode: id,
      createdAt: new Date().toISOString()
    };
    regs.push(newReg);
    saveRegistrations(regs);

    // Increment tickets_sold
    const evts = getEvents();
    const evtIdx = evts.findIndex(evt => evt.id === reg.eventId);
    if (evtIdx >= 0) {
      evts[evtIdx].ticketsSold = (evts[evtIdx].ticketsSold || 0) + Number(reg.ticketQuantity);
      saveEvents(evts);
    }

    return newReg;
  }

  function getRegistrationsForEvent(eventId) {
    return loadRegistrations().filter(reg => reg.eventId === eventId);
  }

  function showMapModal(churchId) {
    const church = getChurch(churchId);
    if (!church) return;

    let modal = document.getElementById("cpc-map-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "cpc-map-modal";
      modal.className = "cpc-modal-backdrop";
      document.body.appendChild(modal);
    }

    const mapEmbedUrl = MWE.MAP_SETTINGS.getEmbedUrl(church.location);
    const mapDirectionsUrl = MWE.MAP_SETTINGS.getDirectionsUrl(church.location);
    const providerName = MWE.MAP_SETTINGS.activeProvider === "openstreetmap" ? "OpenStreetMap" : "Google Maps";

    modal.innerHTML = `
      <div class="cpc-modal-content">
        <button onclick="MWE.closeMapModal()" class="cpc-modal-close" aria-label="Close modal">
          <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
        
        <div class="cpc-modal-header">
          <h3>Directions to ${escapeHtml(church.name)}</h3>
          <p class="cpc-modal-address"><i data-lucide="map-pin" style="width: 14px; height: 14px;"></i> ${escapeHtml(church.location)}</p>
        </div>
        
        <div class="cpc-modal-map-container" style="height: 320px; overflow: hidden; border-radius: 12px; border: 1px solid var(--line);">
          <iframe width="100%" height="100%" frameborder="0" style="border:0;" loading="lazy" src="${mapEmbedUrl}"></iframe>
        </div>
        
        <div class="cpc-modal-footer">
          <button onclick="MWE.shareDirections('${escapeHtml(church.name.replace(/'/g, "\\'"))}', '${escapeHtml(church.location.replace(/'/g, "\\'"))}')" class="cpc-modal-btn-share">
            <i data-lucide="share-2" style="width: 16px; height: 16px; margin-right: 4px;"></i> Share Directions
          </button>
          <a href="${mapDirectionsUrl}" target="_blank" rel="noopener noreferrer" class="cpc-modal-btn-gmaps">
            <i data-lucide="external-link" style="width: 16px; height: 16px; margin-right: 4px;"></i> Open in ${providerName}
          </a>
        </div>
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          class: 'lucide-modal-icon'
        },
        nameAttr: 'data-lucide',
        nodeList: modal.querySelectorAll('[data-lucide]')
      });
    }

    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeMapModal() {
    const modal = document.getElementById("cpc-map-modal");
    if (modal) {
      modal.classList.remove("open");
    }
    document.body.style.overflow = "";
  }

  function shareDirections(churchName, location) {
    const directionsUrl = MWE.MAP_SETTINGS.getDirectionsUrl(location);
    const shareData = {
      title: `Directions to ${churchName}`,
      text: `Here are the directions to ${churchName} located at: ${location}`,
      url: directionsUrl
    };

    if (navigator.share) {
      navigator.share(shareData)
        .then(() => {
          showToast("Directions shared successfully!");
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            fallbackCopyDirections(location);
          }
        });
    } else {
      fallbackCopyDirections(location);
    }
  }

  function fallbackCopyDirections(location) {
    const directionsUrl = MWE.MAP_SETTINGS.getDirectionsUrl(location);
    const providerName = MWE.MAP_SETTINGS.activeProvider === "openstreetmap" ? "OpenStreetMap" : "Google Maps";
    navigator.clipboard.writeText(`Address: ${location}\n${providerName}: ${directionsUrl}`)
      .then(() => {
        showToast("Directions copied to clipboard!");
      })
      .catch(() => {
        showToast("Could not copy directions automatically.");
      });
  }

  return {
    defaultImage,
    impactStats,
    stories,
    escapeHtml,
    titleCase,
    slugify,
    getChurches,
    getChurch,
    upsertChurch,
    removeChurch,
    resetData,
    churchFromForm,
    fillChurchForm,
    syncAdminChurch,
    syncDeleteChurch,
    getEvents,
    getEvent,
    upsertEvent,
    removeEvent,
    registerForEvent,
    getRegistrationsForEvent,
    fallbackCopyDirections
  };
})();

window.MWE = MWE;

/* My Way member experience: public discovery + authenticated SPA shell. */
MWE.isMemberAuthenticated = function() {
  return localStorage.getItem("mwe.userLoggedIn") === "true";
};

MWE.isMemberShellEmbed = function() {
  const params = new URLSearchParams(window.location.search);
  return params.get("embed") === "1" || window.self !== window.top;
};

MWE.getMemberShellRoute = function(input) {
  let url;
  try {
    url = new URL(input, window.location.href);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) return null;

  const file = (url.pathname.split("/").pop() || "").toLowerCase().replace(/\.html$/, "");
  const routeMap = {
    churches: "directory",
    events: "events",
    channels: "channels",
    "channel-detail": "channel-detail",
    "channel-content": "channel-content",
    messages: "messages",
    livestream: "livestream",
    "church-profile": "church",
    church: "church",
    "event-profile": "event",
    donate: "giving",
    store: "store",
    "product-detail": "product",
    cart: "cart",
    checkout: "checkout",
    "seller-dashboard": "store-manager",
    resources: "resources",
    "resource-detail": "resource-detail",
    "resource-reader": "resource-reader",
    "church-portal": "portal",
    portal: "portal",
    "register-church": "portal",
    creator: "portal",
    "creator-hub": "portal"
  };
  const view = routeMap[file];
  if (!view) return null;

  return {
    view,
    id: url.searchParams.get("id") || url.searchParams.get("channel") || "",
    q: url.searchParams.get("q") || "",
    compose: url.searchParams.get("compose") || "",
    post: url.searchParams.get("post") || ""
  };
};

MWE.buildMemberShellUrl = function(route) {
  const target = new URL("app.html", window.location.href);
  target.searchParams.set("view", route.view || "directory");
  if (route.id) target.searchParams.set("id", route.id);
  if (route.q) target.searchParams.set("q", route.q);
  if (route.compose) target.searchParams.set("compose", route.compose);
  return `${target.pathname.split("/").pop()}${target.search}`;
};

MWE.showMemberToast = function(message) {
  showToast(message);
};

MWE.ensureMemberLoginModal = function() {
  let modal = document.getElementById("member-auth-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "member-auth-modal";
  modal.className = "member-auth-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "member-auth-title");
  modal.innerHTML = `
    <div class="member-auth-card">
      <button class="member-auth-close" type="button" aria-label="Close sign in"><i data-lucide="x"></i></button>
      <div class="member-auth-icon"><i data-lucide="sparkles"></i></div>
      <h2 id="member-auth-title">Sign in to continue</h2>
      <p>Your selected church, event, or livestream will open inside your My Way member app.</p>
      <form class="member-auth-form" data-member-auth-form>
        <label>Email address
          <input type="email" name="email" autocomplete="email" placeholder="you@example.com" required />
        </label>
        <label>Password
          <input type="password" name="password" autocomplete="current-password" placeholder="Enter your password" required />
        </label>
        <button class="member-auth-submit" type="submit"><i data-lucide="log-in"></i> Sign in</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => {
    if (modal.dataset.locked === "true") return;
    modal.classList.remove("is-open");
    document.body.classList.remove("member-auth-open");
  };

  modal.querySelector(".member-auth-close")?.addEventListener("click", close);
  modal.addEventListener("click", event => {
    if (event.target === modal) close();
  });
  modal.addEventListener("keydown", event => {
    if (event.key === "Escape") close();
  });
  modal.querySelector("[data-member-auth-form]")?.addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = form.get("email")?.toString().trim() || "Member";
    localStorage.setItem("mwe.userLoggedIn", "true");
    localStorage.setItem("mwe.username", email.split("@")[0] || "Member");
    localStorage.setItem("mwe.userEmail", email.toLowerCase());
    let destination = modal.dataset.destination || "app.html?view=directory";
    try {
      const safeDestination = new URL(destination, window.location.href);
      if (safeDestination.origin !== window.location.origin) destination = "app.html?view=directory";
    } catch {
      destination = "app.html?view=directory";
    }
    window.location.assign(destination);
  });

  createIcons();
  return modal;
};

MWE.openMemberLogin = function(destination, options = {}) {
  const modal = MWE.ensureMemberLoginModal();
  modal.dataset.destination = destination || "app.html?view=directory";
  modal.dataset.locked = options.locked ? "true" : "false";
  modal.classList.add("is-open");
  document.body.classList.add("member-auth-open");
  window.setTimeout(() => modal.querySelector("input[name='email']")?.focus(), 50);
  createIcons();
};

MWE.applyMemberShellEmbed = function() {
  if (!MWE.isMemberShellEmbed()) return;

  document.documentElement.classList.add("member-shell-embed");
  document.body.classList.add("member-shell-embed");

  if (!document.getElementById("member-shell-embed-overrides")) {
    const style = document.createElement("style");
    style.id = "member-shell-embed-overrides";
    style.textContent = `
      html.member-shell-embed,
      body.member-shell-embed { min-height: 100%; background: transparent !important; }
      body.member-shell-embed > header,
      body.member-shell-embed > .topbar,
      body.member-shell-embed > .profile-app-header,
      body.member-shell-embed > .profile-left-rail,
      body.member-shell-embed > footer,
      body.member-shell-embed > .mini-footer { display: none !important; }
      body.member-shell-embed > main,
      body.member-shell-embed > section,
      body.member-shell-embed > footer { margin-left: 0 !important; }
      body.member-shell-embed > main { min-height: 100vh; }
      body.member-shell-embed.module-page:not([data-page="messages"]) > main.module-shell {
        width: 100% !important;
        max-width: none !important;
        margin-right: 0 !important;
        margin-left: 0 !important;
        padding-right: max(22px, calc((100% - var(--max)) / 2)) !important;
        padding-left: max(22px, calc((100% - var(--max)) / 2)) !important;
        box-sizing: border-box !important;
      }
      body[data-page="profile"].member-shell-embed > main > .container,
      body[data-page="profile"].member-shell-embed > section > .container { width: min(var(--max), calc(100% - 44px)) !important; }
      body[data-page="portal"].member-shell-embed .login-screen {
        height: auto !important;
        min-height: calc(100vh - 40px) !important;
        overflow: visible !important;
        padding: 24px max(22px, calc((100% - var(--max)) / 2)) 60px !important;
        background: transparent !important;
      }
      body[data-page="portal"].member-shell-embed .dash-shell {
        min-height: 100vh !important;
        padding: 20px max(22px, calc((100% - var(--max)) / 2)) 60px !important;
      }
      @media (max-width: 720px) {
        body[data-page="profile"].member-shell-embed > main > .container { width: calc(100% - 28px) !important; }
        body.member-shell-embed.module-page:not([data-page="messages"]) > main.module-shell {
          padding-right: 14px !important;
          padding-left: 14px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const q = new URLSearchParams(window.location.search).get("q");
  if (q) {
    window.setTimeout(() => {
      const input = document.querySelector("[data-search], #event-city-input, #channel-search, #store-search, #resource-search");
      if (!input) return;
      input.value = q;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, 120);
  }
};

MWE.initMemberExperience = function() {
  MWE.applyMemberShellEmbed();

  if (!document.documentElement.dataset.memberRoutingReady) {
    document.documentElement.dataset.memberRoutingReady = "true";
    document.addEventListener("click", event => {
      const anchor = event.target.closest("a[href]");
      if (!anchor || event.defaultPrevented || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const rawHref = anchor.getAttribute("href") || "";
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:") || rawHref.startsWith("javascript:")) return;

      let target;
      try {
        target = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (target.origin !== window.location.origin) return;

      const route = MWE.getMemberShellRoute(target.href);
      const targetFile = (target.pathname.split("/").pop() || "").toLowerCase().replace(/\.html$/, "");

      if (MWE.isMemberShellEmbed()) {
        if (route) {
          event.preventDefault();
          event.stopImmediatePropagation();
          window.parent.postMessage({ type: "faithlink:navigate", ...route }, window.location.origin);
        } else if (targetFile === "index" || targetFile === "") {
          event.preventDefault();
          event.stopImmediatePropagation();
          window.parent.postMessage({ type: "faithlink:navigate", leaveShell: true, href: target.href }, window.location.origin);
        }
        return;
      }

      if (!route) return;
      const isProtectedDetail = route.view === "church" || route.view === "event" || route.view === "channel-detail" || route.view === "channel-content" || route.view === "messages" || route.view === "store-manager" || route.view === "cart" || route.view === "checkout" || (route.view === "livestream" && Boolean(route.id));
      if (!MWE.isMemberAuthenticated() && isProtectedDetail) {
        event.preventDefault();
        event.stopImmediatePropagation();
        MWE.openMemberLogin(MWE.buildMemberShellUrl(route));
        return;
      }

      if (MWE.isMemberAuthenticated()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.href = MWE.buildMemberShellUrl(route);
      }
    }, true);
  }

  if (MWE.isMemberShellEmbed()) return "embedded";

  const currentRoute = MWE.getMemberShellRoute(window.location.href);
  if (!currentRoute) return "public";

  if (MWE.isMemberAuthenticated() || currentRoute.view === "portal") {
    window.location.replace(MWE.buildMemberShellUrl(currentRoute));
    return "redirecting";
  }

  const isProtectedDetail = currentRoute.view === "church" || currentRoute.view === "event" || currentRoute.view === "channel-detail" || currentRoute.view === "channel-content" || currentRoute.view === "messages" || currentRoute.view === "store-manager" || currentRoute.view === "cart" || currentRoute.view === "checkout" || (currentRoute.view === "livestream" && Boolean(currentRoute.id));
  if (isProtectedDetail) {
    MWE.openMemberLogin(MWE.buildMemberShellUrl(currentRoute), { locked: true });
    return "locked";
  }

  return "public";
};

MWE.MAP_SETTINGS = {
  // "openstreetmap" (active provider temporarily) | "google" (preserved for future API key integration)
  activeProvider: "openstreetmap",
  googleApiKey: "",
  
  setProvider: function(provider, apiKey = "") {
    this.activeProvider = provider;
    if (apiKey) this.googleApiKey = apiKey;
  },
  
  getEmbedUrl: function(locationQuery) {
    const encoded = encodeURIComponent(locationQuery || "Edmonton, AB");
    if (this.activeProvider === "google") {
      if (this.googleApiKey) {
        return `https://www.google.com/maps/embed/v1/place?key=${this.googleApiKey}&q=${encoded}`;
      }
      return `https://maps.google.com/maps?q=${encoded}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    }
    return `https://www.openstreetmap.org/export/embed.html?bbox=-113.7,53.4,-113.3,53.65&layer=mapnik`;
  },
  
  getDirectionsUrl: function(locationQuery) {
    const encoded = encodeURIComponent(locationQuery || "");
    if (this.activeProvider === "google") {
      return `https://maps.google.com/?q=${encoded}`;
    }
    return `https://www.openstreetmap.org/search?query=${encoded}`;
  }
};

function createIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    try {
      window.lucide.createIcons();
    } catch (e) {
      console.warn("Lucide createIcons warning:", e);
    }
  } else {
    setTimeout(() => {
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        try { window.lucide.createIcons(); } catch (err) {}
      }
    }, 200);
  }
}

function showToast(message) {
  const toast = document.querySelector("[data-toast]");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1700);
}

function initPrivateAppAuth() {
  const app = document.body.dataset.authApp;
  if (!app) return;

  const key = `mwe.session.${app}.v1`;
  let creatorIdentityMatches = true;
  if (app === "church") {
    creatorIdentityMatches = false;
    const publicEmail = (localStorage.getItem("mwe.userEmail") || "").trim().toLowerCase();
    try {
      const creator = JSON.parse(localStorage.getItem("mwe.creator.account.v1") || "null");
      creatorIdentityMatches = localStorage.getItem("mwe.userLoggedIn") === "true" && !!publicEmail && (creator?.email || "").trim().toLowerCase() === publicEmail;
    } catch {}
    if (!creatorIdentityMatches) localStorage.removeItem(key);
  }
  if (localStorage.getItem(key) === "authenticated" && creatorIdentityMatches) {
    document.body.classList.add("is-authenticated");
  }

  function updateUserDisplay() {
    const savedName = localStorage.getItem("mwe.username") || localStorage.getItem("mwe.orgName") || "Creator Workspace";
    const userTitle = document.getElementById("dash-user-title");
    const userAvatar = document.getElementById("dash-user-avatar");
    if (userTitle) userTitle.textContent = savedName;
    if (userAvatar) {
      const initials = savedName.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "FL";
      userAvatar.textContent = initials;
    }
  }
  updateUserDisplay();

  function openCreatorWorkspace(target = "overview", account = {}) {
    const moduleMap = { channel: "channels", event: "events", resource: "resources", all: "overview" };
    const module = moduleMap[target] || target || "overview";
    const loginEmail = document.querySelector("[data-login-form] input[type='text']")?.value.trim().toLowerCase() || "";
    const email = (account.email || loginEmail).trim().toLowerCase();
    const name = account.name || localStorage.getItem("mwe.username") || (email ? email.split("@")[0] : "Creator");
    if (email) {
      localStorage.setItem("mwe.userEmail", email);
      localStorage.setItem("mwe.creator.account.v1", JSON.stringify({ id: `local:${email}`, email, name }));
    }
    const workspace = window.open(`creator-workspace.html#${module}`, "_blank", "noopener");
    if (!workspace) window.location.href = `creator-workspace.html#${module}`;
  }

  function signIn(target = "overview", account = {}) {
    localStorage.setItem(key, "authenticated");
    localStorage.setItem("mwe.userLoggedIn", "true");
    document.body.classList.add("is-authenticated");
    updateUserDisplay();
    showToast(app === "owner" ? "Welcome to your admin workspace" : "Welcome to Creator Hub");
    if (app === "church") openCreatorWorkspace(target, account);
  }

  // Toggle Tabs between Sign In and Registration panels
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
      
      btn.classList.add("active");
      const contentId = `${btn.dataset.tab}-tab-content`;
      document.getElementById(contentId)?.classList.add("active");

      // Dynamically update the card title at the top
      const titleEl = document.getElementById("portal-active-title");
      if (titleEl) {
        titleEl.textContent = btn.dataset.tab === "register" ? "Create Creator Account" : "Sign in to Creator Hub";
      }
    });
  });

  document.querySelector("[data-login-form]")?.addEventListener("submit", event => {
    event.preventDefault();
    signIn();
  });

  document.querySelector("[data-login-form]")?.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (event.currentTarget.reportValidity()) signIn();
  });

  // Launch Goal selection cards
  document.querySelectorAll(".launch-goal-card").forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".launch-goal-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      const radio = card.querySelector("input[type='radio']");
      if (radio) radio.checked = true;
    });
  });

  // Handle multi-step registration forms (Step 1 -> Step 2 -> Step 3)
  const regForm = document.querySelector("[data-register-form]");
  const step1 = regForm?.querySelector("[data-step='1']");
  const step2 = regForm?.querySelector("[data-step='2']");
  const step3 = regForm?.querySelector("[data-step='3']");

  regForm?.querySelector("[data-next-step='1']")?.addEventListener("click", () => {
    if (step1 && step2) {
      step1.style.display = "none";
      step2.style.display = "block";
    }
  });

  regForm?.querySelector("[data-prev-step='2']")?.addEventListener("click", () => {
    if (step1 && step2) {
      step2.style.display = "none";
      step1.style.display = "block";
    }
  });

  regForm?.querySelector("[data-next-step='2']")?.addEventListener("click", () => {
    const nameInput = regForm.querySelector("#reg-name");
    const cityInput = regForm.querySelector("#reg-city");
    if (!nameInput?.value || !cityInput?.value) {
      showToast("Please fill in organization name and location.");
      if (!nameInput?.value) nameInput?.reportValidity();
      else if (!cityInput?.value) cityInput?.reportValidity();
      return;
    }
    if (step2 && step3) {
      step2.style.display = "none";
      step3.style.display = "block";
      regForm.querySelector("#reg-registrant-name")?.setAttribute("required", "true");
      regForm.querySelector("#reg-email")?.setAttribute("required", "true");
      regForm.querySelector("#reg-pass")?.setAttribute("required", "true");
      regForm.querySelector("#reg-pass-confirm")?.setAttribute("required", "true");
    }
  });

  regForm?.querySelector("[data-prev-step='3']")?.addEventListener("click", () => {
    if (step2 && step3) {
      step3.style.display = "none";
      step2.style.display = "block";
    }
  });

  // Morphing role selector dynamic swap listeners
  const roleSelect = regForm?.querySelector("#reg-role");
  const customWrapper = regForm?.querySelector("#reg-role-custom-wrapper");
  const customInput = regForm?.querySelector("#reg-role-custom-input");
  const customClearBtn = regForm?.querySelector("#reg-role-custom-clear");

  roleSelect?.addEventListener("change", () => {
    if (roleSelect.value === "Other") {
      const selectWrapper = roleSelect.previousElementSibling;
      if (selectWrapper && selectWrapper.classList.contains("custom-select-container")) {
        selectWrapper.style.display = "none";
      }
      roleSelect.removeAttribute("required");
      if (customWrapper) customWrapper.style.display = "block";
      if (customInput) {
        customInput.setAttribute("required", "true");
        customInput.focus();
      }
    }
  });

  customClearBtn?.addEventListener("click", () => {
    if (customWrapper) customWrapper.style.display = "none";
    if (customInput) {
      customInput.removeAttribute("required");
      customInput.value = "";
    }
    const selectWrapper = roleSelect?.previousElementSibling;
    if (selectWrapper && selectWrapper.classList.contains("custom-select-container")) {
      selectWrapper.style.display = "block";
    }
    if (roleSelect) {
      roleSelect.setAttribute("required", "true");
      roleSelect.value = "Senior Pastor"; // reset selection
      roleSelect.dispatchEvent(new Event("change"));
    }
  });

  // Password visibility eye icon toggles
  document.querySelectorAll(".password-toggle").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const input = btn.previousElementSibling;
      if (!input) return;
      if (input.type === "password") {
        input.type = "text";
        btn.innerHTML = `<i data-lucide="eye-off"></i>`;
      } else {
        input.type = "password";
        btn.innerHTML = `<i data-lucide="eye"></i>`;
      }
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // Handle dynamic register form submission
  document.querySelector("[data-register-form]")?.addEventListener("submit", event => {
    event.preventDefault();
    const nameInput = event.target.querySelector("#reg-name");
    const cityInput = event.target.querySelector("#reg-city");
    const countrySelect = event.target.querySelector("select[name='country']");
    const emailInput = event.target.querySelector("#reg-email");
    const passInput = event.target.querySelector("#reg-pass");
    const passConfirmInput = event.target.querySelector("#reg-pass-confirm");
    const registrantNameInput = event.target.querySelector("#reg-registrant-name");
    const registrantRoleSelect = event.target.querySelector("#reg-role");
    const registrantRoleCustomInput = event.target.querySelector("#reg-role-custom-input");
    
    if (passInput && passConfirmInput && passInput.value !== passConfirmInput.value) {
      showToast("Passwords do not match.");
      passConfirmInput.focus();
      return;
    }
    
    if (nameInput && cityInput) {
      const newId = nameInput.value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      
      let finalRole = registrantRoleSelect ? registrantRoleSelect.value : "Lead Pastor";
      if (finalRole === "Other" && registrantRoleCustomInput && registrantRoleCustomInput.value) {
        finalRole = registrantRoleCustomInput.value;
      }

      const newChurch = {
        id: newId,
        name: nameInput.value,
        city: cityInput.value,
        country: countrySelect ? countrySelect.value : "CA",
        area: "Downtown",
        denomination: "Christian Ministry",
        language: "English",
        worship: "Contemporary",
        tagline: "A vibrant faith community sharing God's love.",
        sunday: "10:00 AM",
        midweek: "Wednesday 7:00 PM",
        phone: "780-555-0199",
        email: emailInput ? emailInput.value : "info@" + newId + ".org",
        website: "https://" + newId + ".org",
        location: "10120 100 St NW, " + cityInput.value,
        verified: true,
        photo: "assets/church-audience.jpg",
        logo: "",
        pastor: registrantNameInput && registrantNameInput.value ? registrantNameInput.value : "Pastor John Doe",
        pastorTitle: finalRole,
        pastorPhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300",
        pastorBio: "Welcome to our ministry fellowship! We would love to connect with you.",
        about: "We are committed to sharing God's love and reaching communities globally.",
        ministries: ["worship", "community", "prayer", "youth"],
        livestream: { enabled: false, status: "Offline", player: "", paid: false }
      };
      
      const list = MWE.getChurches();
      list.push(newChurch);
      
      const portalSelect = document.querySelector("[data-portal-select]");
      if (portalSelect) {
        portalSelect.innerHTML = list.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
        portalSelect.value = newId;
        portalSelect.dispatchEvent(new Event("change"));
      }

      localStorage.setItem("mwe.orgName", nameInput.value);
      if (registrantNameInput && registrantNameInput.value) {
        localStorage.setItem("mwe.username", registrantNameInput.value);
      }
    }
    
    showToast("Creator account created successfully!");
    const launchGoal = event.target.querySelector("input[name='launchGoal']:checked")?.value || "overview";
    signIn(launchGoal, {
      name: registrantNameInput?.value || nameInput?.value || "Creator",
      email: emailInput?.value || ""
    });
  });

  // Setup Launchpad Quick Actions and Tabs
  function switchCreatorWorkspace(target) {
    const launchpad = document.getElementById("launchpad-grid-container");
    const churchProfile = document.getElementById("church-profile-container");
    const channelHub = document.getElementById("channel-hub-panel");
    const storeHub = document.getElementById("store-hub-panel");
    const resourcesHub = document.getElementById("resources-hub-panel");
    const eventsPanel = document.getElementById("events-manager-panel");
    const overviewHeader = document.getElementById("overview");
    const kpiStrip = document.querySelector(".kpi-strip");

    // Hide all panels
    if (launchpad) launchpad.style.display = target === "overview" ? "grid" : "none";
    if (churchProfile) churchProfile.style.display = (target === "overview" || target === "church" || ["identity", "pastor", "services", "ministries", "rides", "salvation", "prayer", "verification", "roles", "livestream"].includes(target)) ? "grid" : "none";
    if (channelHub) channelHub.style.display = target === "channels" ? "block" : "none";
    if (storeHub) storeHub.style.display = target === "store" ? "block" : "none";
    if (resourcesHub) resourcesHub.style.display = target === "resources" ? "block" : "none";
    if (eventsPanel) eventsPanel.style.display = target === "events" ? "block" : "none";

    // Header visibility
    if (overviewHeader) overviewHeader.style.display = "flex";
    if (kpiStrip) kpiStrip.style.display = "grid";

    // Update active nav state
    document.querySelectorAll(".dash-nav a").forEach(tab => {
      const tabTarget = tab.getAttribute("data-portal-tab") || (tab.getAttribute("href") || "").replace(/^#/, "");
      const isActive = tabTarget === target || (target === "overview" && tabTarget === "overview");
      tab.classList.toggle("active", isActive);
    });

    if (target === "events") {
      const select = document.querySelector("[data-portal-select]");
      if (select && select.value) MWE.renderPortalEvents(select.value);
    }
  }

  document.querySelectorAll("[data-launch-target]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.launchTarget;
      switchCreatorWorkspace(target);
    });
  });

  document.querySelectorAll(".dash-nav a").forEach(tab => {
    tab.addEventListener("click", (e) => {
      const target = tab.getAttribute("data-portal-tab") || (tab.getAttribute("href") || "").replace(/^#/, "");
      if (["overview", "church", "channels", "events", "store", "resources"].includes(target)) {
        e.preventDefault();
        switchCreatorWorkspace(target);
      }
    });
  });

  document.querySelectorAll("[data-logout]").forEach(button => {
    button.addEventListener("click", () => {
      localStorage.removeItem(key);
      document.body.classList.remove("is-authenticated");
      showToast("Signed out");
    });
  });
}

function getRouteChurch() {
  const params = new URLSearchParams(location.search);
  return MWE.getChurch(params.get("id"));
}

function getServiceTimes(church) {
  const defaultTimes = ["10:00 AM"];
  if (!church.sunday) return defaultTimes;
  
  const matches = church.sunday.match(/\b\d{1,2}:\d{2}\s*(?:AM|PM)\b/gi);
  if (matches && matches.length > 0) {
    if (church.id === "beulah-alliance-west") {
      return ["9:00 AM", "11:00 AM"];
    }
    return matches.slice(0, 2);
  }
  
  if (church.sunday.toLowerCase().includes("online") || church.sunday.toLowerCase().includes("services")) {
    return ["9:00 AM", "11:00 AM"];
  }
  
  return [church.sunday.substring(0, 15)];
}

function renderServiceTimesBox(church) {
  const times = getServiceTimes(church);
  if (times.length === 1) {
    return `
      <div class="cpc-service-time-col">
        <span class="cpc-service-label">1st Service</span>
        <span class="cpc-service-time-item">${MWE.escapeHtml(times[0])}</span>
      </div>
    `;
  } else {
    return `
      <div class="cpc-service-time-col">
        <span class="cpc-service-label">1st Service</span>
        <span class="cpc-service-time-item">${MWE.escapeHtml(times[0])}</span>
      </div>
      <div class="cpc-service-time-sep-vertical"></div>
      <div class="cpc-service-time-col">
        <span class="cpc-service-label">2nd Service</span>
        <span class="cpc-service-time-item">${MWE.escapeHtml(times[1])}</span>
      </div>
    `;
  }
}

function churchCard(church) {
  const bgPhoto = church.photo || church.coverImage || "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=800&q=80";

  return `
    <article class="church-card-immersive" style="background-image: url('${MWE.escapeHtml(bgPhoto)}');">
      <div class="church-card-immersive-overlay">
        <div class="church-card-top-bar">
          <span class="immersive-badge"><i data-lucide="badge-check"></i> Verified</span>
          <button type="button" class="immersive-fav-btn" aria-label="Save church" onclick="MWE.toggleFavorite(event, '${church.id}')">
            <i data-lucide="heart" style="width: 18px; height: 18px; fill: rgba(239, 68, 68, 0.2);"></i>
          </button>
        </div>
        
        <div class="church-card-bottom-info">
          <h3 class="immersive-card-title">${MWE.escapeHtml(church.name)}</h3>
          <p class="immersive-card-subtitle">${MWE.escapeHtml(church.denomination || 'Christian Fellowship')} • ${MWE.escapeHtml(church.city)}</p>
          <div class="immersive-card-meta">
            <span><i data-lucide="map-pin"></i> ${MWE.escapeHtml(church.area || church.city)}</span>
            <span>•</span>
            <span><i data-lucide="clock"></i> ${MWE.escapeHtml(church.sunday || 'Sunday 10:00 AM')}</span>
          </div>
          <a href="church-profile.html?id=${church.id}" class="immersive-pill-btn">
            Explore Church <i data-lucide="arrow-right"></i>
          </a>
        </div>
      </div>
    </article>
  `;
}

function initPublicSite() {
  const grid = document.querySelector("[data-church-grid]");
  const search = document.querySelector("[data-search]");

  const churches = MWE.getChurches();

  // Populate dynamic City pill checkboxes
  const cityOptionsContainer = document.getElementById("church-city-options-list");
  if (cityOptionsContainer) {
    const cities = [...new Set(churches.map(church => church.city).filter(Boolean))].sort();
    cityOptionsContainer.innerHTML = cities.map(item => `
      <label class="custom-checkbox-row">
        <input type="checkbox" value="${MWE.escapeHtml(item)}" onchange="MWE.onChurchPillChange()" />
        <span class="checkbox-box"><i data-lucide="check"></i></span>
        <span class="checkbox-label">${MWE.escapeHtml(item)}</span>
      </label>
    `).join("");
    if (window.lucide) window.lucide.createIcons();
  }

  function render() {
    if (!grid) return;
    const q = (search?.value || "").toLowerCase().trim();
    
    const selectedCities = Array.from(document.querySelectorAll("#church-city-pill input:checked")).map(cb => cb.value.toLowerCase());
    const selectedDenoms = Array.from(document.querySelectorAll("#church-denom-pill input:checked")).map(cb => cb.value.toLowerCase());

    const filtered = MWE.getChurches().filter(church => {
      const haystack = [church.name, church.city, church.area, church.country, church.denomination, church.pastor, church.language, church.sunday, (church.ministries || []).join(" "), (church.features || []).join(" ")].join(" ").toLowerCase();
      
      const cityMatch = selectedCities.length === 0 || selectedCities.includes(church.city.toLowerCase());
      const denomMatch = selectedDenoms.length === 0 || selectedDenoms.some(d => (church.denomination || "").toLowerCase().includes(d));

      return (!q || haystack.includes(q)) && cityMatch && denomMatch;
    });

    grid.innerHTML = filtered.length ? filtered.map(churchCard).join("") : `<div class="empty flex-center py-8 text-muted font-bold text-center">No churches match those filter criteria. Click 'Reset' to view all churches.</div>`;
    createIcons();
  }

  MWE.triggerChurchSearch = render;

  if (search) {
    search.addEventListener("input", render);
  }



  const stories = document.querySelector("[data-stories]");
  if (stories) {
    stories.innerHTML = MWE.stories.map(([kicker, title, image]) => `
      <article class="story">
        <div class="story-image" style="--image:url('${image}')"></div>
        <div class="story-body">
          <p class="kicker">${MWE.escapeHtml(kicker)}</p>
          <h3>${MWE.escapeHtml(title)}</h3>
          <p>Churches can publish outreach, media, ministry updates, and visitor pathways from their own portal.</p>
        </div>
      </article>
    `).join("");
  }

  render();
}

function renderProfile(church) {
  if (!church) return;
  document.title = `${church.name} | My Way of Evangelism`;
  
  document.querySelectorAll("[data-church-name]").forEach(el => { el.textContent = church.name; });
  document.querySelectorAll("[data-church-tagline]").forEach(el => { el.textContent = church.tagline || church.about || ""; });
  
  const setVal = (selector, val) => {
    document.querySelectorAll(selector).forEach(el => { el.textContent = val || ""; });
  };
  
  setVal("[data-profile-location]", church.location);
  setVal("[data-profile-sunday]", church.sunday);
  setVal("[data-profile-midweek]", church.midweek);
  setVal("[data-profile-pastor]", church.pastor);
  setVal("[data-profile-pastor-title]", church.pastorTitle || "Lead Pastor");
  setVal("[data-profile-pastor-bio]", church.pastorBio || church.about);
  
  const leaderPhoto = document.getElementById("leader-profile-img");
  const defaultPastorPhoto = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80";
  if (leaderPhoto) {
    leaderPhoto.src = church.pastorPhoto || defaultPastorPhoto;
  }
  document.querySelector("[data-profile-hero]")?.style.setProperty("--profile-image", `url('${church.photo}')`);
  
  const msgCard = document.querySelector(".message-card");
  if (msgCard) {
    msgCard.removeAttribute("onclick");
    msgCard.onclick = (e) => {
      e.preventDefault();
      MWE.playPastorWelcomeMedia(church);
    };
  }
  
  const gatheringSelect = document.getElementById("rsvp-gathering-select");
  if (gatheringSelect && church.schedule) {
    gatheringSelect.innerHTML = church.schedule.map(([label, time]) => `
      <option value="${MWE.escapeHtml(label)} (${MWE.escapeHtml(time)})">${MWE.escapeHtml(label)} - ${MWE.escapeHtml(time)}</option>
    `).join("");
    gatheringSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const mapIframe = document.getElementById("footer-map-iframe");
  if (mapIframe && church.location) {
    mapIframe.src = MWE.MAP_SETTINGS.getEmbedUrl(church.location);
  }
  
  MWE.renderRelatedChurches(church.id);
  MWE.renderChurchProfileEvents(church.id);
}

MWE.renderChurchProfileEvents = function(churchId) {
  const container = document.getElementById("church-events-container");
  if (!container) return;

  const events = MWE.getEvents().filter(e => e.churchId === churchId);

  if (events.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px 24px; background: rgba(0, 0, 0, 0.02); border-radius: 20px; border: 1px dashed var(--line); margin-top: 10px;">
        <i data-lucide="calendar-off" style="width: 42px; height: 42px; color: var(--muted); margin-bottom: 12px; display: inline-block;"></i>
        <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--ink);">No Upcoming Events Scheduled</h4>
        <p style="font-size: 0.88rem; color: var(--muted); margin-top: 6px; max-width: 420px; margin-left: auto; margin-right: auto;">
          This fellowship currently has no public upcoming events. Check back soon for new service announcements and outreach programs.
        </p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = events.map(evt => MWE.createEventCardHtml(evt)).join("");
  if (window.lucide) window.lucide.createIcons();
};

MWE.renderRelatedChurches = function(currentChurchId) {
  const container = document.getElementById("related-churches-container");
  if (!container) return;

  const allChurches = MWE.getChurches();
  const otherChurches = allChurches.filter(c => c.id !== currentChurchId).slice(0, 3);

  if (otherChurches.length === 0) {
    container.innerHTML = `<p class="text-sm text-slate-500">No other churches found.</p>`;
    return;
  }

  container.innerHTML = otherChurches.map(c => `
    <article class="church-card-split">
      <div class="church-card-split-media" style="background-image: url('${MWE.escapeHtml(c.coverImage || c.photo || "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=600&q=80")}');">
        <span class="immersive-badge" style="position: absolute; top: 14px; left: 14px;"><i data-lucide="badge-check"></i> Verified</span>
      </div>
      <div class="church-card-split-body">
        <h3 class="split-card-title">${MWE.escapeHtml(c.name)}</h3>
        <p class="split-card-subtitle">${MWE.escapeHtml(c.denomination || "Christian Fellowship")} • ${MWE.escapeHtml(c.city)}</p>
        <div class="split-card-meta">
          <span><i data-lucide="map-pin"></i> ${MWE.escapeHtml(c.location || c.city)}</span>
        </div>
        <div class="split-card-action-row">
          <a href="church-profile.html?id=${encodeURIComponent(c.id)}" class="split-dark-pill-btn">
            Explore Church <i data-lucide="arrow-right"></i>
          </a>
          <button type="button" class="split-fav-btn" aria-label="Favorite" onclick="MWE.toggleFavorite(event, '${c.id}')">
            <i data-lucide="heart" style="width: 18px; height: 18px;"></i>
          </button>
        </div>
      </div>
    </article>
  `).join("");

  createIcons();
};

MWE.selectedCategoryState = null;
MWE.currentFormStep = 1;

MWE.selectCategory = function(category, shouldScroll = false) {
  MWE.selectedCategoryState = category;
  MWE.renderStep1Fields(category);
  
  if (shouldScroll) {
    const registerSec = document.getElementById("register");
    if (registerSec) {
      registerSec.scrollIntoView({ behavior: 'smooth' });
    }
  }
};

MWE.toggleCheckboxCard = function(card) {
  const cb = card.querySelector('input[type="checkbox"]');
  if (cb) {
    cb.checked = !cb.checked;
    card.classList.toggle('selected', cb.checked);
  }
};

MWE.renderStep1Fields = function(category) {
  const fieldsContainer = document.getElementById("dynamic-step-1-fields");
  const labelTitle = document.getElementById("step-1-title-label");
  if (!fieldsContainer) return;
  
  let html = "";
  let title = "Your Connection Interests:";
  
  switch(category) {
    case 'salvation':
      title = "Salvation & Faith Checklist:";
      html = `
        <div class="checkbox-grid">
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="salvation_opt" value="accept_christ" />
            <span>I want to receive Jesus Christ as my Savior</span>
          </div>
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="salvation_opt" value="water_baptism" />
            <span>I want to learn about water baptism</span>
          </div>
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="salvation_opt" value="believers_classes" />
            <span>I want to sign up for foundation believers classes</span>
          </div>
        </div>
      `;
      break;
    case 'spiritual':
      title = "Spiritual Growth Pathway:";
      html = `
        <div class="checkbox-grid">
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="spiritual_opt" value="bible_study" />
            <span>Join a regular weekly Bible study group</span>
          </div>
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="spiritual_opt" value="home_fellowship" />
            <span>Connect with a local home cell fellowship</span>
          </div>
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="spiritual_opt" value="worship_outreach" />
            <span>Get details on Worship Team and local missions</span>
          </div>
        </div>
      `;
      break;
    case 'kids':
      title = "Kids & Family Age Groups:";
      html = `
        <div class="checkbox-grid">
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="kids_opt" value="nursery" />
            <span>Nursery / Toddlers (Ages 0 - 3)</span>
          </div>
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="kids_opt" value="primary" />
            <span>Primary Sunday School (Ages 4 - 8)</span>
          </div>
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="kids_opt" value="preteens" />
            <span>Pre-Teens Class (Ages 9 - 12)</span>
          </div>
        </div>
      `;
      break;
    case 'youth':
      title = "Youth Network preferences:";
      html = `
        <div class="checkbox-grid">
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="youth_opt" value="highschool" />
            <span>High School ministry fellowship groups</span>
          </div>
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="youth_opt" value="campus" />
            <span>Campus / Young Adults prayer network</span>
          </div>
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="youth_opt" value="outreach_vol" />
            <span>Youth event volunteering and outreach plans</span>
          </div>
        </div>
      `;
      break;
    case 'prayer':
      title = "Submit Your Prayer Request:";
      html = `
        <div class="input-group" style="margin-top: 10px;">
          <textarea id="rsvp-prayer-text" name="prayer_request_text" required class="floating-input" oninput="MWE.handleInputFloat(this)"></textarea>
          <label for="rsvp-prayer-text">Write your prayer request details here...</label>
        </div>
      `;
      break;
    default:
      title = "Select your Connection Interest:";
      html = `
        <div class="checkbox-grid">
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="general_opt" value="first_visit" />
            <span>This is my first time visiting this church</span>
          </div>
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="general_opt" value="pastoral_contact" />
            <span>I would like a pastor to call or email me</span>
          </div>
          <div class="checkbox-card" onclick="MWE.toggleCheckboxCard(this)">
            <input type="checkbox" name="general_opt" value="volunteer_serve" />
            <span>I want to get involved with volunteering</span>
          </div>
        </div>
      `;
      break;
  }
  
  if (labelTitle) labelTitle.textContent = title;
  fieldsContainer.innerHTML = html;
  
  fieldsContainer.querySelectorAll('.floating-input').forEach(input => {
    MWE.handleInputFloat(input);
    input.addEventListener('focus', () => input.parentNode.classList.add('focused'));
    input.addEventListener('blur', () => {
      input.parentNode.classList.remove('focused');
      MWE.handleInputFloat(input);
    });
  });
};

MWE.updateFormStepUI = function(step = MWE.currentFormStep) {
  MWE.currentFormStep = step;

  const step1 = document.getElementById("rsvp-step-1");
  const step2 = document.getElementById("rsvp-step-2");
  const prevBtn = document.getElementById("form-btn-prev");
  const nextBtn = document.getElementById("form-btn-next");
  const submitBtn = document.getElementById("form-btn-submit");
  const tab1 = document.getElementById("tab-indicator-1");
  const tab2 = document.getElementById("tab-indicator-2");

  if (!prevBtn || !nextBtn || !submitBtn) return;

  if (step === 1) {
    if (step1) step1.style.display = "block";
    if (step2) step2.style.display = "none";

    prevBtn.style.setProperty("display", "none", "important");
    prevBtn.classList.add("hidden");

    nextBtn.style.setProperty("display", "flex", "important");
    nextBtn.classList.remove("hidden");

    submitBtn.style.setProperty("display", "none", "important");
    submitBtn.classList.add("hidden");

    if (tab1) tab1.classList.add("active");
    if (tab2) tab2.classList.remove("active");
  } else if (step === 2) {
    if (step1) step1.style.display = "none";
    if (step2) step2.style.display = "block";

    prevBtn.style.setProperty("display", "flex", "important");
    prevBtn.classList.remove("hidden");

    nextBtn.style.setProperty("display", "none", "important");
    nextBtn.classList.add("hidden");

    submitBtn.style.setProperty("display", "flex", "important");
    submitBtn.classList.remove("hidden");

    if (tab1) tab1.classList.remove("active");
    if (tab2) tab2.classList.add("active");
  }
};

MWE.nextFormStep = function() {
  if (MWE.currentFormStep === 1) {
    const prayerText = document.getElementById("rsvp-prayer-text");
    if (prayerText && !prayerText.value.trim()) {
      alert("Please enter your prayer request details.");
      return;
    }
    MWE.updateFormStepUI(2);
  }
};

MWE.prevFormStep = function() {
  if (MWE.currentFormStep === 2) {
    MWE.updateFormStepUI(1);
  }
};

MWE.toggleDiscoverSection = function(enabled) {
  const discoverWrapper = document.getElementById("discover-wrapper");
  const indicatorTabs = document.querySelector(".form-step-tabs");
  
  if (discoverWrapper) {
    discoverWrapper.style.display = enabled ? "block" : "none";
  }
  
  if (!enabled) {
    MWE.updateFormStepUI(2);
    const prevBtn = document.getElementById("form-btn-prev");
    if (prevBtn) {
      prevBtn.style.setProperty("display", "none", "important");
      prevBtn.classList.add("hidden");
    }
    if (indicatorTabs) indicatorTabs.style.display = "none";
  } else {
    MWE.updateFormStepUI(1);
    if (indicatorTabs) indicatorTabs.style.display = "grid";
  }
};

MWE.toggleDynamicRSVP = function(enabled) {
  MWE.toggleDiscoverSection(enabled);
  const cbDiscover = document.getElementById("editor-toggle-discover");
  if (cbDiscover) cbDiscover.checked = enabled;
};

MWE.setThemeGold = function(hexColor) {
  document.documentElement.style.setProperty('--color-primary-gold', hexColor);
};

MWE.toggleEditorPanel = function() {
  const drawer = document.getElementById("layout-editor-drawer");
  if (drawer) {
    drawer.classList.toggle("open");
  }
};

MWE.playTestimonyVideo = function(name, url) {
  const modal = document.getElementById("global-video-modal-view");
  const iframe = document.getElementById("global-video-iframe");
  if (modal && iframe) {
    iframe.src = `${url}?autoplay=1`;
    modal.classList.add("open");
  }
  const heroIframe = document.getElementById("hero-promo-iframe");
  if (heroIframe) {
    heroIframe.src = "https://www.youtube.com/embed/jiSyB8QZzk8?enablejsapi=1&autoplay=0&mute=1&loop=1&playlist=jiSyB8QZzk8";
  }
  const playOverlay = document.getElementById("hero-play-overlay");
  if (playOverlay) playOverlay.classList.remove("playing");
};

MWE.closeVideoModal = function() {
  const modal = document.getElementById("global-video-modal-view");
  const iframe = document.getElementById("global-video-iframe");
  if (modal && iframe) {
    iframe.src = "";
    modal.classList.remove("open");
  }
};

MWE.playPastorWelcomeMedia = function(church) {
  const mediaUrl = church.welcomeMedia || "https://www.youtube.com/embed/jiSyB8QZzk8";
  const isAudio = mediaUrl.endsWith(".mp3") || mediaUrl.includes(".mp3?");
  
  if (isAudio) {
    MWE.openAudioModal(church, mediaUrl);
  } else {
    MWE.playTestimonyVideo('Pastor Welcome Message', mediaUrl);
  }
};

MWE.openAudioModal = function(church, audioUrl) {
  const modal = document.getElementById("global-audio-modal-view");
  const audioEl = document.getElementById("global-audio-element");
  const pastorImg = document.getElementById("audio-pastor-img");
  const playerTitle = document.getElementById("audio-player-title");
  const playerSubtitle = document.getElementById("audio-player-subtitle");
  
  if (!modal || !audioEl) return;
  
  pastorImg.src = church.pastorPhoto || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80";
  playerTitle.textContent = `${church.pastor || 'Pastor'}'s Welcome`;
  playerSubtitle.textContent = `Senior Pastor, ${church.name}`;
  
  audioEl.src = audioUrl;
  audioEl.load();
  
  const playBtn = document.getElementById("audio-play-pause-trigger");
  if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  document.getElementById("audio-progress-fill-el").style.width = "0%";
  document.getElementById("audio-time-current").textContent = "0:00";
  document.getElementById("audio-time-total").textContent = "0:00";
  document.getElementById("audio-waves-container").classList.remove("playing");
  
  modal.classList.add("open");
  
  audioEl.onloadedmetadata = () => {
    document.getElementById("audio-time-total").textContent = MWE.formatAudioTime(audioEl.duration);
  };
  
  audioEl.ontimeupdate = () => {
    const current = audioEl.currentTime;
    const duration = audioEl.duration || 0;
    document.getElementById("audio-time-current").textContent = MWE.formatAudioTime(current);
    if (duration > 0) {
      const pct = (current / duration) * 100;
      document.getElementById("audio-progress-fill-el").style.width = `${pct}%`;
    }
  };
  
  audioEl.onended = () => {
    MWE.pauseAudioPlayback();
  };
};

MWE.closeAudioModal = function() {
  const modal = document.getElementById("global-audio-modal-view");
  const audioEl = document.getElementById("global-audio-element");
  if (audioEl) {
    audioEl.pause();
  }
  if (modal) {
    modal.classList.remove("open");
  }
  document.getElementById("audio-waves-container")?.classList.remove("playing");
};

MWE.toggleAudioPlayback = function() {
  const audioEl = document.getElementById("global-audio-element");
  const playBtn = document.getElementById("audio-play-pause-trigger");
  const waves = document.getElementById("audio-waves-container");
  if (!audioEl || !playBtn) return;
  
  if (audioEl.paused) {
    audioEl.play();
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    waves?.classList.add("playing");
  } else {
    audioEl.pause();
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    waves?.classList.remove("playing");
  }
};

MWE.pauseAudioPlayback = function() {
  const audioEl = document.getElementById("global-audio-element");
  const playBtn = document.getElementById("audio-play-pause-trigger");
  const waves = document.getElementById("audio-waves-container");
  if (audioEl) audioEl.pause();
  if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  waves?.classList.remove("playing");
};

MWE.seekAudio = function(event) {
  const audioEl = document.getElementById("global-audio-element");
  const track = document.getElementById("audio-progress-track-el");
  if (!audioEl || !track) return;
  
  const rect = track.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const width = rect.width;
  const duration = audioEl.duration || 0;
  if (duration > 0) {
    audioEl.currentTime = (clickX / width) * duration;
  }
};

MWE.formatAudioTime = function(secs) {
  if (isNaN(secs)) return "0:00";
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

MWE.showCustomAlert = function(msg) {
  const backdrop = document.getElementById("custom-alert-backdrop");
  const msgEl = document.getElementById("custom-alert-message");
  if (backdrop && msgEl) {
    msgEl.textContent = msg;
    backdrop.classList.add("open");
  }
};

MWE.closeCustomAlert = function() {
  const backdrop = document.getElementById("custom-alert-backdrop");
  if (backdrop) {
    backdrop.classList.remove("open");
  }
};

MWE.handleRSVPSubmit = function(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });
  
  data["first_name"] = document.getElementById("rsvp-first-name")?.value;
  data["last_name"] = document.getElementById("rsvp-last-name")?.value;
  data["email"] = document.getElementById("rsvp-email")?.value;
  data["phone"] = document.getElementById("rsvp-phone")?.value;
  data["gathering"] = document.getElementById("rsvp-gathering-select")?.value;
  data["category"] = MWE.selectedCategoryState;
  
  const selectedPreferences = [];
  document.querySelectorAll(".checkbox-card.selected input").forEach(cb => {
    selectedPreferences.push(cb.value);
  });
  data["preferences"] = selectedPreferences;
  
  console.log("Submitting RSVP campaign FormData:", data);
  
  const successPanel = document.getElementById("rsvp-success-panel");
  if (successPanel) {
    successPanel.classList.add("active");
  }
  
  const shareLinkField = document.getElementById("share-link-field");
  if (shareLinkField) {
    const uniqueCode = "PASS-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    shareLinkField.value = `${window.location.origin}${window.location.pathname}?pass=${uniqueCode}`;
  }
};

MWE.shareTo = function(platform) {
  const shareLinkField = document.getElementById("share-link-field");
  if (!shareLinkField) return;
  const url = encodeURIComponent(shareLinkField.value);
  const text = encodeURIComponent("Join me at this awesome church gathering!");
  
  let shareUrl = "";
  switch(platform) {
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      break;
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
      break;
    case 'whatsapp':
      shareUrl = `https://api.whatsapp.com/send?text=${text}%20${url}`;
      break;
    case 'telegram':
      shareUrl = `https://t.me/share/url?url=${url}&text=${text}`;
      break;
  }
  if (shareUrl) {
    window.open(shareUrl, "_blank", "width=600,height=400");
  }
};

function initProfilePage() {
  const church = getRouteChurch();
  renderProfile(church);

  // Custom alert overlay replace window.alert
  window.alert = function(msg) {
    MWE.showCustomAlert(msg);
  };

  // 1. Sticky dynamic header scrolling behavior
  const header = document.getElementById("sticky-header");
  let lastScrollY = window.scrollY;
  
  const handleHeaderSticky = () => {
    if (!header) return;
    const scrollY = window.scrollY;
    const engagementSec = document.getElementById("engagement");
    const registerSec = document.getElementById("register");
    
    let inHiddenZone = false;
    [engagementSec, registerSec].forEach(sec => {
      if (sec) {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= 70 && rect.bottom >= 0) {
          inHiddenZone = true;
        }
      }
    });
    
    if (inHiddenZone) {
      header.classList.add("header-hidden");
    } else {
      if (scrollY > lastScrollY && scrollY > 100) {
        header.classList.add("header-hidden");
      } else {
        header.classList.remove("header-hidden");
      }
    }
    lastScrollY = scrollY;
  };
  
  window.addEventListener("scroll", handleHeaderSticky);

  // 2. Discover section horizontal track side scroll progress on desktop
  const track = document.getElementById("discover-track");
  const wrapper = document.getElementById("discover-wrapper");
  
  const handleHorizontalScroll = () => {
    if (!track || !wrapper) return;
    if (window.innerWidth <= 968) {
      track.style.transform = "none";
      return;
    }
    const rect = wrapper.getBoundingClientRect();
    const sectionHeight = rect.height;
    const viewHeight = window.innerHeight;
    
    if (rect.top <= 0 && rect.bottom >= viewHeight) {
      const scrolled = -rect.top;
      const totalScrollable = sectionHeight - viewHeight;
      const progress = scrolled / totalScrollable;
      const trackWidth = track.scrollWidth;
      const maxTranslate = trackWidth - window.innerWidth;
      
      if (maxTranslate > 0) {
        track.style.transform = `translateX(-${progress * maxTranslate}px)`;
      }
    } else if (rect.top > 0) {
      track.style.transform = "translateX(0px)";
    } else if (rect.bottom < viewHeight) {
      const trackWidth = track.scrollWidth;
      const maxTranslate = trackWidth - window.innerWidth;
      if (maxTranslate > 0) {
        track.style.transform = `translateX(-${maxTranslate}px)`;
      }
    }
  };
  
  window.addEventListener("scroll", handleHorizontalScroll);

  // 3. Scroll zoom effect on form card
  const formCard = document.getElementById("form-scroll-card");
  const handleFormZoom = () => {
    if (!formCard) return;
    if (window.innerWidth <= 968) {
      formCard.style.transform = "none";
      return;
    }
    const rect = formCard.getBoundingClientRect();
    const viewHeight = window.innerHeight;
    const cardCenter = rect.top + rect.height / 2;
    const viewportCenter = viewHeight / 2;
    const distanceFromCenter = Math.abs(cardCenter - viewportCenter);
    const maxDistance = viewHeight;
    const progress = Math.max(0, Math.min(1, 1 - distanceFromCenter / maxDistance));
    const scale = 1 + (progress * 0.06);
    formCard.style.transform = `scale(${scale})`;
  };
  
  window.addEventListener("scroll", handleFormZoom);

  // 4. Hero video mute/unmute control
  const playOverlay = document.getElementById("hero-play-overlay");
  const heroIframe = document.getElementById("hero-promo-iframe");
  if (playOverlay && heroIframe) {
    playOverlay.addEventListener("click", () => {
      heroIframe.src = "https://www.youtube.com/embed/jiSyB8QZzk8?enablejsapi=1&autoplay=1&mute=0&loop=1&playlist=jiSyB8QZzk8";
      playOverlay.classList.add("playing");
    });
    
    const heroVideoWrapper = document.querySelector(".hero-video-wrapper");
    if (heroVideoWrapper) {
      heroVideoWrapper.addEventListener("click", (e) => {
        if (playOverlay.classList.contains("playing") && e.target !== playOverlay) {
          heroIframe.src = "https://www.youtube.com/embed/jiSyB8QZzk8?enablejsapi=1&autoplay=1&mute=1&loop=1&playlist=jiSyB8QZzk8";
          playOverlay.classList.remove("playing");
        }
      });
    }
  }

  // 5. Input floating labels
  MWE.handleInputFloat = function(input) {
    const group = input.parentNode;
    if (group && group.classList.contains("input-group")) {
      if (input.value.trim() !== "" || document.activeElement === input) {
        group.classList.add("has-value");
      } else {
        group.classList.remove("has-value");
      }
    }
  };

  document.querySelectorAll(".floating-input").forEach(input => {
    input.addEventListener("focus", () => {
      input.parentNode.classList.add("focused");
      input.parentNode.classList.add("has-value");
    });
    input.addEventListener("blur", () => {
      input.parentNode.classList.remove("focused");
      MWE.handleInputFloat(input);
    });
    input.addEventListener("input", () => {
      MWE.handleInputFloat(input);
    });
    MWE.handleInputFloat(input);
  });

  // 6. Real-time LocalStorage autofill sync & interval
  const inputMap = {
    "rsvp-first-name": "mwe.rsvp.firstName",
    "rsvp-last-name": "mwe.rsvp.lastName",
    "rsvp-email": "mwe.rsvp.email",
    "rsvp-phone": "mwe.rsvp.phone"
  };
  
  Object.entries(inputMap).forEach(([id, key]) => {
    const input = document.getElementById(id);
    if (input) {
      const stored = localStorage.getItem(key);
      if (stored) {
        input.value = stored;
        MWE.handleInputFloat(input);
      }
      input.addEventListener("input", () => {
        localStorage.setItem(key, input.value);
      });
    }
  });

  setInterval(() => {
    Object.entries(inputMap).forEach(([id, key]) => {
      const input = document.getElementById(id);
      if (input && document.activeElement !== input) {
        const stored = localStorage.getItem(key) || "";
        if (input.value !== stored) {
          input.value = stored;
          MWE.handleInputFloat(input);
        }
      }
    });
  }, 500);

MWE.switchProfileTab = function(tabId) {
  const buttons = document.querySelectorAll(".church-tab-button");
  const panes = document.querySelectorAll(".church-tab-pane");

  buttons.forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
    } else {
      btn.classList.remove("active");
      btn.setAttribute("aria-selected", "false");
    }
  });

  panes.forEach(pane => {
    if (pane.id === `tab-pane-${tabId}`) {
      pane.classList.add("active");
      pane.hidden = false;
    } else {
      pane.classList.remove("active");
      pane.hidden = true;
    }
  });
};

MWE.toggleVisitPanel = function(open) {
  document.body.classList.toggle("visit-panel-open", Boolean(open));
  const panel = document.getElementById("register");
  if (panel && open) {
    window.setTimeout(() => panel.querySelector("button, input, select")?.focus(), 80);
  }
};

  // Ensure form step button state starts strictly at Step 1 (only Continue button visible)
  MWE.updateFormStepUI(1);

  // Initialize with Salvation category checked without auto-scrolling
  MWE.selectCategory('salvation', false);
  
  if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
}

function initLivestreamPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const landing = document.getElementById("streams-landing-view");
  const player = document.getElementById("streams-player-view");

  if (!id) {
    if (landing) landing.style.display = "block";
    if (player) player.style.display = "none";
    initStreamsPage();
    return;
  }

  if (landing) landing.style.display = "none";
  if (player) player.style.display = "block";

  const church = MWE.getChurch(id);
  if (!church) {
    window.location.href = "livestream.html";
    return;
  }

  document.title = `${church.name} Livestream | My Way of Evangelism`;
  
  // Set host labels and title
  document.querySelectorAll("[data-church-name]").forEach(el => { el.textContent = church.name; });
  const playerChurchName = document.getElementById("player-church-name");
  if (playerChurchName) playerChurchName.textContent = church.name;

  document.querySelectorAll("[data-stream-profile]").forEach(profile => {
    profile.href = `church-profile.html?id=${church.id}`;
  });

  const playerChurchLink = document.getElementById("player-church-link");
  if (playerChurchLink) playerChurchLink.href = `church-profile.html?id=${church.id}`;
  
  const visitChurchBtn = document.getElementById("visit-church-btn");
  if (visitChurchBtn) visitChurchBtn.href = `church-profile.html?id=${church.id}`;

  // Populate dynamic iframe url
  const iframe = document.getElementById("main-player-iframe");
  if (iframe) {
    let embedUrl = church.livestream?.url || "";
    if (!embedUrl || embedUrl === "#" || !embedUrl.includes("embed")) {
      embedUrl = "https://www.youtube.com/embed/jiSyB8QZzk8?autoplay=1&mute=1&loop=1&playlist=jiSyB8QZzk8";
    } else {
      embedUrl = embedUrl.includes("?") ? `${embedUrl}&autoplay=1` : `${embedUrl}?autoplay=1`;
    }
    
    const lockOverlay = document.getElementById("video-lock-overlay");
    if (lockOverlay) lockOverlay.classList.add("hidden");

    const isLoggedIn = localStorage.getItem("mwe.userLoggedIn") === "true";
    if (isLoggedIn) {
      iframe.src = embedUrl;
    } else {
      iframe.src = embedUrl;
      
      // Set 10-second inactive lock timer
      if (videoLockTimeout) clearTimeout(videoLockTimeout);
      videoLockTimeout = setTimeout(() => {
        if (localStorage.getItem("mwe.userLoggedIn") !== "true") {
          if (lockOverlay) lockOverlay.classList.remove("hidden");
          if (typeof window.openLoginModal === "function") {
            window.openLoginModal();
          }
        }
      }, 10000);
    }
  }

  // Populate titles and descriptions natively
  const streamTitle = document.getElementById("player-stream-title");
  if (streamTitle) streamTitle.textContent = `${church.name} - Sunday Worship Service`;

  const streamDesc = document.getElementById("player-stream-desc");
  if (streamDesc) streamDesc.textContent = church.about || "Welcome! Join our church congregation live online as we sing, pray, and listen to the Gospel message.";



  // Setup twitch-style chat box and simulation
  const chatMessages = document.getElementById("player-chat-box");
  const typingIndicator = document.getElementById("chat-typing-indicator");
  if (chatMessages) {
    // Hide typing indicator initially
    if (typingIndicator) typingIndicator.classList.add("hidden");

    chatMessages.innerHTML = `
      <div class="stream-chat-welcome">
        Welcome to ${church.name}'s Chat Room. Please keep communications respectful and aligned with Christian fellowship.
      </div>
      <div class="stream-chat-msg-row incoming" style="margin-top: 10px;">
        <div class="stream-chat-msg-col">
          <span class="stream-chat-sender" style="margin-left: 42px;">Pastor Peter (Host)</span>
          <div style="display: flex; gap: 10px; align-items: flex-end;">
            <img class="stream-chat-avatar" src="${userAvatars["Pastor Peter"]}" alt="Pastor Peter" />
            <div class="stream-chat-bubble">Welcome to today's broadcast! Let us know where you are tuning in from. 🙏</div>
          </div>
        </div>
      </div>
    `;

    const chatUsers = ["Ama", "Daniel", "Sarah", "John", "Kojo", "Esther", "Paul", "Deborah", "David", "Ruth"];
    const chatMsgs = [
      "Amen! Powerful worship today.",
      "Greetings from Calgary!",
      "Please pray for my mother's health.",
      "Listening from Edmonton. The stream looks great!",
      "So blessed by this word.",
      "Glory to God!",
      "Hello everyone, watching from Toronto.",
      "Singing along with the choir here.",
      "Blessed Sunday to the church family!",
      "What a great message on evangelism."
    ];

    if (chatSimulatorTimer) clearInterval(chatSimulatorTimer);
    if (chatTypingTimeout) clearTimeout(chatTypingTimeout);

    chatSimulatorTimer = setInterval(() => {
      const user = chatUsers[Math.floor(Math.random() * chatUsers.length)];
      const msg = chatMsgs[Math.floor(Math.random() * chatMsgs.length)];
      const avatar = userAvatars[user] || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80";

      // Trigger typing state
      if (typingIndicator) {
        typingIndicator.querySelector(".typing-text").textContent = `${user} is typing...`;
        typingIndicator.classList.remove("hidden");
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      chatTypingTimeout = setTimeout(() => {
        if (typingIndicator) typingIndicator.classList.add("hidden");

        const msgEl = document.createElement("div");
        msgEl.className = "stream-chat-msg-row incoming";
        msgEl.innerHTML = `
          <div class="stream-chat-msg-col">
            <span class="stream-chat-sender" style="margin-left: 42px;">${MWE.escapeHtml(user)}</span>
            <div style="display: flex; gap: 10px; align-items: flex-end;">
              <img class="stream-chat-avatar" src="${avatar}" alt="${MWE.escapeHtml(user)}" />
              <div class="stream-chat-bubble">${MWE.escapeHtml(msg)}</div>
            </div>
          </div>
        `;
        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }, 1800);

    }, 5000);
  }

  const chatForm = document.querySelector("[data-live-chat-form]");
  const chatInput = document.getElementById("player-chat-input");

  function sendChatMessage() {
    const message = chatInput ? chatInput.value.trim() : "";
    if (!message || !chatMessages) return false;
    
    const msgEl = document.createElement("div");
    msgEl.className = "stream-chat-msg-row outgoing";
    msgEl.innerHTML = `
      <div class="stream-chat-msg-col">
        <span class="stream-chat-sender">You</span>
        <div class="stream-chat-bubble">${MWE.escapeHtml(message)}</div>
      </div>
    `;
    chatMessages.appendChild(msgEl);
    
    if (chatForm) chatForm.reset();
    chatMessages.scrollTop = chatMessages.scrollHeight;
    createIcons();
    return true;
  }

  chatForm?.addEventListener("submit", event => {
    event.preventDefault();
    sendChatMessage();
  });

  chatInput?.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    sendChatMessage();
  });

  function submitLiveResponse(form) {
    if (!form.reportValidity()) return;
    const label = form.dataset.responseLabel || "Response submitted";
    form.reset();
    showToast(label);
  }

  document.querySelectorAll("[data-live-response-form]").forEach(form => {
    form.addEventListener("submit", event => {
      event.preventDefault();
      submitLiveResponse(form);
    });
    form.addEventListener("keydown", event => {
      if (event.key !== "Enter" || event.target.tagName === "TEXTAREA") return;
      event.preventDefault();
      submitLiveResponse(form);
    });
  });
  createIcons();
}

function initChurchPortal() {
  const select = document.querySelector("[data-portal-select]");
  const form = document.querySelector("[data-portal-form]");
  const preview = document.querySelector("[data-portal-preview]");
  const churches = MWE.getChurches();

  function refreshSelect(selectedId = churches[0]?.id) {
    if (!select) return;
    const list = MWE.getChurches();
    select.innerHTML = list.map(church => `<option value="${church.id}">${MWE.escapeHtml(church.name)}</option>`).join("");
    if (selectedId) select.value = selectedId;
  }

  function renderPreview(church) {
    if (!preview) return;
    preview.innerHTML = `
      <div class="side-card profile-preview">
        <div class="preview-cover" style="--preview-image:url('${MWE.escapeHtml(church.photo)}')"></div>
        <div class="preview-body">
          <span class="badge"><i data-lucide="${church.livestream.enabled ? "radio" : "lock"}"></i>${MWE.escapeHtml(church.livestream.status)}</span>
          <h3 style="margin-top:14px">${MWE.escapeHtml(church.name)}</h3>
          <p>${MWE.escapeHtml(church.tagline)}</p>
          <div class="tag-row">${church.ministries.slice(0, 5).map(item => `<span class="tag">${MWE.escapeHtml(item)}</span>`).join("")}</div>
          <div class="card-actions">
            <a class="button primary small" href="church-profile.html?id=${church.id}">Public profile</a>
            <a class="button ghost small" href="livestream.html?id=${church.id}">Livestream</a>
          </div>
        </div>
      </div>
    `;
    createIcons();
  }

  function readableValue(value, fallback = "Not provided yet") {
    const text = String(value || "").trim();
    return text && text !== "#" ? text : fallback;
  }

  function renderReadableProfile(church) {
    const value = readableValue;
    const set = (key, text) => {
      document.querySelectorAll(`[data-readable="${key}"]`).forEach(el => {
        el.textContent = value(text);
      });
    };
    const ministries = Array.isArray(church.ministries) ? church.ministries : [];
    const stream = church.livestream || {};

    set("identityNarrative", `${value(church.name, "This church")} is listed as a ${value(church.denomination, "Christian")} church serving ${value(church.area, "its local area")} in ${value(church.city, "its city")}, ${value(church.country, "its country")}. The public profile highlights ${value(church.worship, "its worship style").toLowerCase()} worship and ${value(church.language, "its primary")} language ministry for people searching nearby.`);
    set("serviceNarrative", `Visitors see ${value(church.sunday, "the Sunday service schedule")} as the primary gathering. Midweek participation is shown as ${value(church.midweek, "not listed yet")}, with contact and address details available so first-time guests can call, email, plan directions, and arrive confidently.`);
    set("ministryNarrative", ministries.length
      ? `${value(church.name, "This church")} currently highlights ${ministries.length} ministry area${ministries.length === 1 ? "" : "s"} so families, young people, volunteers, and new believers can quickly understand where they can connect.`
      : "No ministries have been added yet. Add children's ministry, youth ministry, prayer, worship, outreach, or other groups so visitors can find their next connection point.");
    set("streamNarrative", stream.enabled
      ? `${value(church.name, "This church")} has livestream participation enabled. Visitors can open the church livestream page from the public profile, join the service room, use chat, and submit newcomer or salvation responses.`
      : "Livestream participation is not enabled yet. The church remains discoverable publicly, and the premium livestream feature can be activated when online participation is ready.");

    set("name", church.name);
    set("area", church.area);
    set("city", church.city);
    set("country", church.country);
    set("postal", church.postal);
    set("denomination", church.denomination);
    set("language", church.language);
    set("worship", church.worship);
    set("tagline", church.tagline);
    set("sunday", church.sunday);
    set("midweek", church.midweek);
    set("phone", church.phoneLabel || church.phone);
    set("email", church.email);
    set("website", church.website === "#" ? "" : church.website);
    set("verified", church.verified ? "Verified church" : "Pending platform review");
    set("location", church.location);
    set("pastor", church.pastor);
    set("pastorTitle", church.pastorTitle);
    set("pastorBio", church.pastorBio);
    set("about", church.about);
    set("photo", church.photo === MWE.defaultImage ? "Default platform cover image" : church.photo);
    set("logo", church.logo);
    set("streamEnabled", stream.enabled ? "Enabled" : "Not enabled");
    set("streamPaid", stream.paid ? "Premium paid feature" : "Free / inactive");
    set("streamUrl", stream.url === "#" ? "" : stream.url);
    set("streamStatus", stream.status);

    document.querySelectorAll("[data-readable-image='pastorPhoto']").forEach(img => {
      img.src = value(church.pastorPhoto, "assets/pastor-light-chapel.png");
    });
    document.querySelectorAll("[data-readable-list='ministries']").forEach(list => {
      list.innerHTML = ministries.length
        ? ministries.map(item => `<span class="tag">${MWE.escapeHtml(item)}</span>`).join("")
        : `<span class="tag">No ministries added yet</span>`;
    });
  }

  function renderPortalRides() {
    const ridesTbody = document.getElementById("portal-rides-table-body");
    if (!ridesTbody) return;

    const currentChurchId = select ? select.value : "";
    let rides = JSON.parse(localStorage.getItem("mwe.ride_requests") || "[]");
    const filteredRides = rides.filter(r => !r.churchId || r.churchId === currentChurchId);

    const stageLabels = {
      1: '<span class="badge pending">Stage 1: Welcome & Info Call</span>',
      2: '<span class="badge pending" style="background:#e0f2fe; color:#0369a1;">Stage 2: Service Reminder Sent</span>',
      3: '<span class="badge verified">Stage 3: Pickup Confirmed</span>'
    };

    if (filteredRides.length === 0) {
      ridesTbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No ride requests for this church yet.</td></tr>`;
      return;
    }

    ridesTbody.innerHTML = filteredRides.map(r => `
      <tr>
        <td><strong>${MWE.escapeHtml(r.fullName)}</strong><br/><small class="text-muted">${MWE.escapeHtml(r.phone)}</small></td>
        <td>${MWE.escapeHtml(r.pickupAddress)}</td>
        <td>${MWE.escapeHtml(r.preferredService)} (${r.passengers} pass)</td>
        <td>${stageLabels[r.stage] || stageLabels[1]}</td>
        <td><strong>${MWE.escapeHtml(r.driver || 'Unassigned')}</strong></td>
        <td>
          <button type="button" class="button ghost small" onclick="MWE.advanceRideStage('${r.id}')"><i data-lucide="check-circle-2"></i> Next Follow-up Stage</button>
          <button type="button" class="button outline small" onclick="MWE.assignDriver('${r.id}')"><i data-lucide="user-check"></i> Assign Driver</button>
        </td>
      </tr>
    `).join("");
    createIcons();
  }

  function renderPortalSalvation() {
    const salvTbody = document.getElementById("portal-salvation-table-body");
    if (!salvTbody) return;

    const currentChurchId = select ? select.value : "";
    let salvations = JSON.parse(localStorage.getItem("mwe.salvation_decisions") || "[]");
    const filteredSalvations = salvations.filter(s => !s.churchId || s.churchId === currentChurchId);

    if (filteredSalvations.length === 0) {
      salvTbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No salvation decisions logged for this church yet.</td></tr>`;
      return;
    }

    salvTbody.innerHTML = filteredSalvations.map(s => `
      <tr>
        <td><strong>${MWE.escapeHtml(s.fullName)}</strong></td>
        <td>${MWE.escapeHtml(s.phone)}<br/><small class="text-muted">${MWE.escapeHtml(s.email)}</small></td>
        <td>${s.needBible ? '📖 Bible Request ' : ''}${s.needPrayer ? '🙏 Prayer Request' : ''}</td>
        <td><span class="badge verified">${MWE.escapeHtml(s.status || 'New Decision')}</span></td>
        <td><strong>${MWE.escapeHtml(s.assignedTo || 'Unassigned')}</strong></td>
      </tr>
    `).join("");
    createIcons();
  }

  function renderPortalPrayer() {
    const prayerTbody = document.getElementById("portal-prayer-table-body");
    if (!prayerTbody) return;

    const currentChurchId = select ? select.value : "";
    let prayers = JSON.parse(localStorage.getItem("mwe.prayer_requests") || "[]");
    const filteredPrayers = prayers.filter(p => !p.churchId || p.churchId === currentChurchId);

    if (filteredPrayers.length === 0) {
      prayerTbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No prayer requests received for this church yet.</td></tr>`;
      return;
    }

    prayerTbody.innerHTML = filteredPrayers.map(p => `
      <tr>
        <td><strong>${MWE.escapeHtml(p.fullName || 'Anonymous')}</strong></td>
        <td>${MWE.escapeHtml(p.contact || 'No contact provided')}</td>
        <td>${MWE.escapeHtml(p.requestText)}</td>
        <td>
          <span class="badge ${p.urgency === 'urgent' ? 'pending' : 'verified'}">${MWE.escapeHtml(p.urgency || 'normal')}</span>
          <br/><small class="text-muted">${MWE.escapeHtml(p.confidential || 'team')}</small>
        </td>
        <td>${new Date(p.createdAt || Date.now()).toLocaleDateString()}</td>
      </tr>
    `).join("");
    createIcons();
  }

  function loadSelected() {
    if (!select || !select.value) return;
    const church = MWE.getChurch(select.value);
    if (!church) return;
    if (form) MWE.fillChurchForm(form, church);
    renderReadableProfile(church);
    renderPreview(church);
    renderPortalRides();
    renderPortalSalvation();
    renderPortalPrayer();
  }

  refreshSelect(churches[0]?.id);
  loadSelected();
  select?.addEventListener("change", loadSelected);

  const editors = [...document.querySelectorAll(".block-editor")];
  function closeEditors(except = null) {
    editors.forEach(editor => {
      if (editor !== except) editor.open = false;
    });
    document.body.classList.toggle("portal-modal-open", editors.some(editor => editor.open));
  }
  editors.forEach(editor => {
    editor.addEventListener("toggle", () => {
      if (editor.open) {
        closeEditors(editor);
      } else {
        closeEditors();
      }
    });
    editor.addEventListener("click", event => {
      if (event.target === editor) {
        editor.open = false;
        closeEditors();
      }
    });
  });
  document.querySelectorAll("[data-close-editor]").forEach(button => {
    button.addEventListener("click", () => closeEditors());
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && editors.some(editor => editor.open)) {
      closeEditors();
    }
  });

  document.querySelector("[data-portal-new]")?.addEventListener("click", () => {
    form.reset();
    form.elements.id.value = "";
    const draft = MWE.churchFromForm(form);
    renderReadableProfile(draft);
    renderPreview(draft);
  });
  let previewTimer;
  function renderDraft() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const draft = MWE.churchFromForm(form);
      renderReadableProfile(draft);
      renderPreview(draft);
    }, 80);
  }
  form?.addEventListener("input", renderDraft);
  form?.addEventListener("change", renderDraft);
  form?.addEventListener("submit", async event => {
    event.preventDefault();
    const church = MWE.upsertChurch(MWE.churchFromForm(form));
    await MWE.syncAdminChurch(church);
    refreshSelect(church.id);
    MWE.fillChurchForm(form, church);
    renderReadableProfile(church);
    renderPreview(church);
    closeEditors();
    showToast("Church portal profile saved");
  });
}

function initAdminPage() {
  if (document.body.hasAttribute("data-admin-workspace")) return;
  const table = document.querySelector("[data-admin-table]");
  const form = document.querySelector("[data-admin-form]");
  const search = document.querySelector("[data-admin-search]");

  function metrics(churches) {
    const set = (selector, value) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = value;
    };
    set("[data-admin-total]", churches.length);
    set("[data-admin-verified]", churches.filter(church => church.verified).length);
    set("[data-admin-streams]", churches.filter(church => church.livestream.enabled && church.livestream.paid).length);
    set("[data-admin-cities]", new Set(churches.map(church => church.city)).size);
  }

  function render() {
    const q = (search?.value || "").toLowerCase().trim();
    const churches = MWE.getChurches().filter(church => !q || [church.name, church.city, church.pastor, church.email].join(" ").toLowerCase().includes(q));
    metrics(MWE.getChurches());
    table.innerHTML = churches.map(church => `
      <tr>
        <td><strong>${MWE.escapeHtml(church.name)}</strong><br><span class="meta">${MWE.escapeHtml(church.city)} / ${MWE.escapeHtml(church.area)}</span></td>
        <td>${MWE.escapeHtml(church.pastor)}<br><span class="meta">${MWE.escapeHtml(church.pastorTitle)}</span></td>
        <td><a href="tel:${church.phone}">${MWE.escapeHtml(church.phoneLabel || church.phone)}</a><br><a href="${church.emailHref}">${MWE.escapeHtml(church.email)}</a></td>
        <td><span class="status ${church.verified ? "" : "pending"}"><i data-lucide="${church.verified ? "badge-check" : "clock"}"></i>${church.verified ? "Verified" : "Pending"}</span></td>
        <td><span class="status ${church.livestream.enabled ? "premium" : "offline"}"><i data-lucide="${church.livestream.enabled ? "radio" : "lock"}"></i>${church.livestream.enabled ? (church.livestream.paid ? "Premium" : "Enabled") : "Off"}</span></td>
        <td>
          <div class="row-actions">
            <button class="button small ghost" data-action="edit" data-id="${church.id}">Edit</button>
            <button class="button small ghost" data-action="verify" data-id="${church.id}">${church.verified ? "Unverify" : "Verify"}</button>
            <a class="button small ghost" href="church-profile.html?id=${church.id}">View</a>
            <button class="button small danger" data-action="remove" data-id="${church.id}">Remove</button>
          </div>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6" class="empty">No churches found.</td></tr>`;
    createIcons();
  }

  table?.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const church = MWE.getChurch(button.dataset.id);
    if (button.dataset.action === "edit") {
      MWE.fillChurchForm(form, church);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (button.dataset.action === "verify") {
      church.verified = !church.verified;
      const saved = MWE.upsertChurch(church);
      await MWE.syncAdminChurch(saved);
      render();
      showToast("Verification updated");
    }
    if (button.dataset.action === "remove") {
      if (!confirm(`Remove ${church.name} from the platform?`)) return;
      MWE.removeChurch(church.id);
      await MWE.syncDeleteChurch(church.id);
      render();
      showToast("Church removed");
    }
  });

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    const church = MWE.upsertChurch(MWE.churchFromForm(form));
    await MWE.syncAdminChurch(church);
    MWE.fillChurchForm(form, church);
    render();
    showToast("Church saved");
  });

  document.querySelectorAll("[data-admin-new]").forEach(button => button.addEventListener("click", () => {
    form.reset();
    form.elements.id.value = "";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  document.querySelector("[data-admin-reset]")?.addEventListener("click", () => {
    if (!confirm("Reset local preview data to seeded churches?")) return;
    MWE.resetData();
    render();
    showToast("Preview data reset");
  });

  search?.addEventListener("input", render);
  render();
}

async function detectUserCity() {
  const cacheKey = "mwe.detected.location.v2";
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  // Attempt 1: ipapi.co
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      if (data.city) {
        const result = { city: data.city, countryCode: data.country_code || "CA" };
        sessionStorage.setItem(cacheKey, JSON.stringify(result));
        return result;
      }
    }
  } catch (e) {
    console.warn("ipapi.co failed, trying fallback...", e);
  }

  // Attempt 2: ip-api.com
  try {
    const res = await fetch("https://ip-api.com/json/");
    if (res.ok) {
      const data = await res.json();
      if (data.city) {
        const result = { city: data.city, countryCode: data.countryCode || "CA" };
        sessionStorage.setItem(cacheKey, JSON.stringify(result));
        return result;
      }
    }
  } catch (e) {
    console.warn("ip-api.com failed...", e);
  }

  // Fallback default city (Edmonton, as it's the primary seeded city)
  return { city: "Edmonton", countryCode: "CA" };
}

function tinyChurchCard(church) {
  return `
    <a href="church-profile.html?id=${church.id}" class="tiny-church-card">
      <img src="${MWE.escapeHtml(church.photo)}" class="tiny-card-img" alt="${MWE.escapeHtml(church.name)}" />
      <div class="tiny-card-info">
        <span class="tiny-card-name">${MWE.escapeHtml(church.name)}</span>
        <span class="tiny-card-details">${MWE.escapeHtml(church.area || church.city)}</span>
        <span class="tiny-card-tag"><i data-lucide="map-pin" style="width: 10px; height: 10px; margin-right: 2px;"></i>${MWE.escapeHtml(church.city)}</span>
      </div>
    </a>
  `;
}

const MWE_COUNTRIES = [
  { code: "CA", name: "Canada" },
  { code: "US", name: "United States" }
];

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

async function initHeroPage() {
  const slider = document.querySelector("[data-hero-slider]");
  const datalist = document.getElementById("cities-list");
  const churches = MWE.getChurches();

  function renderSlider(nearbyList) {
    if (!slider) return;
    const items = nearbyList.length > 0 ? nearbyList : churches;
    let repeatCount = 1;
    if (items.length < 5) {
      repeatCount = Math.ceil(5 / items.length);
    }
    let marqueeItems = [];
    for (let i = 0; i < repeatCount; i++) {
      marqueeItems.push(...items);
    }
    const itemsToRender = [...marqueeItems, ...marqueeItems];
    slider.innerHTML = itemsToRender.map(tinyChurchCard).join("");
    createIcons();
  }

  // Render immediately on load so slider is NEVER blank
  renderSlider(churches);

  // Inject YouTube Player API loader to force endless looping on state change
  const iframe = document.querySelector(".video-background iframe");
  if (iframe) {
    if (!iframe.id) iframe.id = "hero-video-iframe";
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = function() {
      new YT.Player("hero-video-iframe", {
        events: {
          onStateChange: function(event) {
            if (event.data === 0) { // ended
              event.target.playVideo();
            }
          }
        }
      });
    };
  }

  // Populate country list select dropdown
  const countrySelectElement = document.getElementById("hero-country-select");
  if (countrySelectElement) {
    countrySelectElement.innerHTML = MWE_COUNTRIES.map(c => `<option value="${c.code}">${getFlagEmoji(c.code)} ${c.code}</option>`).join("");
  }

  // 1. Populate city suggestions datalist
  if (datalist) {
    const cities = [...new Set(churches.map(c => c.city).filter(Boolean))].sort();
    datalist.innerHTML = cities.map(city => `<option value="${MWE.escapeHtml(city)}">`).join("");
  }

  // 2. Perform Fast Geolocation Lookup (with 1 second timeout)
  let detectedCity = "Edmonton";
  let detectedCountry = "CA";
  try {
    const loc = await Promise.race([
      detectUserCity(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1000))
    ]);
    if (loc && loc.city) {
      detectedCity = loc.city;
      const code = loc.countryCode ? loc.countryCode.toUpperCase() : "CA";
      detectedCountry = ["CA", "US"].includes(code) ? code : "CA";
    }
  } catch (err) {
    console.log("IP lookup timed out, using default city Edmonton");
  }

  // 3. Auto-populate city input and select country dropdown
  const cityInput = document.getElementById("hero-city-input");
  if (cityInput && detectedCity) {
    cityInput.value = detectedCity;
  }
  const countrySelect = document.getElementById("hero-country-select");
  if (countrySelect && detectedCountry) {
    countrySelect.value = detectedCountry;
    countrySelect.dispatchEvent(new Event("change"));
  }

  // 4. Update slider with detected city matches if any
  if (detectedCity) {
    const cityFiltered = churches.filter(c => c.city.toLowerCase() === detectedCity.toLowerCase() && c.verified);
    if (cityFiltered.length > 0) {
      renderSlider(cityFiltered);
    }
  }

  // 6. Header scrolled styling (useful on scrollable mobile views)
  const topbar = document.querySelector(".topbar");
  if (topbar) {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        topbar.classList.add("scrolled");
      } else {
        topbar.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial invocation
  }
}

function initCustomDropdowns() {
  const selectElements = document.querySelectorAll("select.field, select.custom-select-target, .site-search-bar select.module-select, .module-directory-toolbar select.module-select");
  
  selectElements.forEach(select => {
    if (select.dataset.customInitialized) {
      if (select._updateCustomDropdown) select._updateCustomDropdown();
      return;
    }
    select.dataset.customInitialized = "true";
    
    // Hide native select
    select.style.display = "none";
    
    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "custom-select-container module-filter-control";
    select.classList.forEach(cls => {
      if (cls !== "field" && cls !== "module-select") wrapper.classList.add(cls);
    });
    
    // Create trigger button
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "custom-select-trigger module-filter-trigger field";
    if (select.id === "hero-country-select") {
      trigger.classList.add("country-dropdown");
    }
    
    const labelSpan = document.createElement("span");
    labelSpan.className = "trigger-label";
    
    const arrow = document.createElement("i");
    arrow.setAttribute("data-lucide", "chevron-down");
    arrow.className = "trigger-arrow";
    
    trigger.appendChild(labelSpan);
    trigger.appendChild(arrow);
    wrapper.appendChild(trigger);
    
    // Create options panel
    const optionsPanel = document.createElement("div");
    optionsPanel.className = "custom-options-panel";
    
    const updateOptions = () => {
      optionsPanel.innerHTML = "";
      const options = select.querySelectorAll("option");
      const selectedLabels = [];
      
      options.forEach(opt => {
        const item = document.createElement("div");
        item.className = "custom-option";
        
        const isSelected = select.multiple ? opt.selected : (opt.value === select.value);
        if (isSelected) {
          item.classList.add("selected");
          selectedLabels.push(opt.textContent);
        }

        if (select.multiple) {
          const checkbox = document.createElement("span");
          checkbox.className = "option-checkbox";
          
          const checkIcon = document.createElement("i");
          checkIcon.setAttribute("data-lucide", "check");
          checkIcon.className = "option-checkbox-icon";
          checkbox.appendChild(checkIcon);
          
          item.appendChild(checkbox);
        }
        
        const labelText = document.createElement("span");
        labelText.className = "option-label-text";
        if (select.id === "hero-country-select") {
          labelText.classList.add("country-label-wrapper");
          const parts = opt.textContent.split(" ");
          const flagSpan = document.createElement("span");
          flagSpan.className = "country-flag";
          flagSpan.textContent = parts[0] || "";
          const codeSpan = document.createElement("span");
          codeSpan.className = "country-code";
          codeSpan.textContent = parts[1] || "";
          labelText.appendChild(flagSpan);
          labelText.appendChild(codeSpan);
        } else {
          labelText.textContent = opt.textContent;
        }
        item.appendChild(labelText);
        
        item.dataset.value = opt.value;
        
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          
          if (select.multiple) {
            opt.selected = !opt.selected;
          } else {
            select.value = opt.value;
            wrapper.classList.remove("open");
          }
          
          select.dispatchEvent(new Event("change", { bubbles: true }));
          updateOptions();
        });
        optionsPanel.appendChild(item);
      });
      
      if (selectedLabels.length > 0) {
        if (select.id === "hero-country-select") {
          labelSpan.innerHTML = "";
          labelSpan.classList.add("country-label-wrapper");
          const parts = (selectedLabels[0] || "").split(" ");
          const flagSpan = document.createElement("span");
          flagSpan.className = "country-flag";
          flagSpan.textContent = parts[0] || "";
          const codeSpan = document.createElement("span");
          codeSpan.className = "country-code";
          codeSpan.textContent = parts[1] || "";
          labelSpan.appendChild(flagSpan);
          labelSpan.appendChild(codeSpan);
        } else {
          labelSpan.textContent = selectedLabels.join(", ");
        }
        wrapper.classList.add("has-selection");
      } else {
        labelSpan.textContent = select.multiple ? "All options" : (options[0]?.textContent || "");
        wrapper.classList.remove("has-selection");
      }
    };

    select._updateCustomDropdown = updateOptions;
    
    updateOptions();
    wrapper.appendChild(optionsPanel);
    
    select.parentNode.insertBefore(wrapper, select);
    
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !wrapper.classList.contains("open");
      document.querySelectorAll(".custom-select-container").forEach(c => {
        if (c !== wrapper) c.classList.remove("open");
      });
      document.querySelectorAll(".site-search-bar, .aw-filters, .module-directory-toolbar").forEach(tb => {
        tb.classList.remove("has-open-dropdown");
      });
      wrapper.classList.toggle("open", willOpen);
      if (willOpen) {
        wrapper.closest(".site-search-bar, .aw-filters, .module-directory-toolbar")?.classList.add("has-open-dropdown");
      }
    });
    
    select.addEventListener("change", () => {
      updateOptions();
    });
    new MutationObserver(updateOptions).observe(select, { childList: true, subtree: true });
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".custom-select-container").forEach(c => {
      c.classList.remove("open");
    });
    document.querySelectorAll(".site-search-bar, .aw-filters, .module-directory-toolbar").forEach(tb => {
      tb.classList.remove("has-open-dropdown");
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

MWE.initCustomDropdowns = initCustomDropdowns;

// Lightweight Dynamic Translation System (EN, FR, ES)
function initTranslations() {
  const translatedTitles = {
    fr: { home: "Accueil", public: "Annuaire des églises", profile: "Profil de l’église", events: "Événements", "event-profile": "Détails de l’événement", livestream: "Diffusions en direct", donate: "Faire un don", foundation: "Fondation", channels: "Chaînes chrétiennes", "channel-detail": "Chaîne", "channel-content": "Contenu de la chaîne", store: "Boutique My Way", product: "Détails du produit", "product-detail": "Détails du produit", cart: "Votre panier", checkout: "Paiement", resources: "Ressources chrétiennes", "resource-detail": "Détails de la ressource", "resource-reader": "Lecteur", messages: "Messages", meditation: "Sanctuaire de méditation", portal: "Espace créateur", creator: "Espace créateur", owner: "Administration de la plateforme", "store-manager": "Gestion de la boutique", storefront: "Profil de la boutique", broadcast: "Diffusion en direct", privacy: "Confidentialité et conditions", "member-home": "Accueil membre" },
    es: { home: "Inicio", public: "Directorio de iglesias", profile: "Perfil de la iglesia", events: "Eventos", "event-profile": "Detalles del evento", livestream: "Transmisiones en vivo", donate: "Donar", foundation: "Fundación", channels: "Canales cristianos", "channel-detail": "Canal", "channel-content": "Contenido del canal", store: "Tienda My Way", product: "Detalles del producto", "product-detail": "Detalles del producto", cart: "Tu carrito", checkout: "Pago", resources: "Recursos cristianos", "resource-detail": "Detalles del recurso", "resource-reader": "Lector", messages: "Mensajes", meditation: "Santuario de meditación", portal: "Centro de creadores", creator: "Espacio del creador", owner: "Administración de la plataforma", "store-manager": "Gestión de la tienda", storefront: "Perfil de la tienda", broadcast: "Transmisión en vivo", privacy: "Privacidad y condiciones", "member-home": "Inicio del miembro" }
  };
  const translations = {
    en: {
      find_churches: "Churches",
      events: "Events",
      streams: "Livestreams",
      impact: "Impact",
      media: "Media",
      church_login: "Add Church",
      hero_title: "Find a church family near you.",
      hero_subtitle: "Search verified churches by city, ministry, service time, and livestream availability. Open a church profile, contact the church, get directions, and join online when livestream is enabled.",
      churches_in_area: "Churches in your area",
      find_church_family: "Find a Church Family",
      search_card_desc: "Search fellowships, ministries, and active livestream channels near you.",
      city_location: "City / Location",
      city_placeholder: "City name or area name",
      interested_in: "Interested in",
      only_livestream: "Only show livestreaming churches",
      find_button: "Find a Church Family",
      checking_location: "Checking your location...",
      all_interests: "All interests",
      kids: "Kids & Children",
      youth: "Youth & Youth Ministry",
      prayer: "Prayer Groups",
      worship: "Worship Team",
      missions: "Missions & Outreach",
      explore_events: "Explore Events", verified_near: "Verified churches near you", search_title: "Search Fellowships & Streams", search_desc: "Find trusted local churches by city, worship style, or ministry focus.", platform_doorways: "Platform Doorways", serve_title: "How Can We Serve You Today?", serve_desc: "Choose an action below to find a fellowship, explore upcoming events, watch live streams, or support outreach.", transportation: "Free Sunday Transportation", donation: "Donation"
    },
    fr: {
      find_churches: "Églises",
      events: "Événements",
      streams: "Directs",
      impact: "Impact",
      media: "Médias",
      church_login: "Ajouter une Église",
      hero_title: "Trouvez une famille d'église près de chez vous.",
      hero_subtitle: "Recherchez des églises vérifiées par ville, ministère, heure de service et disponibilité du direct. Ouvrez un profil d'église, contactez-la, obtenez des directions et rejoignez-la en ligne.",
      churches_in_area: "Églises dans votre région",
      find_church_family: "Trouver une Famille d'Église",
      search_card_desc: "Recherchez des fraternités, des ministères et des chaînes de diffusion en direct actives près de chez vous.",
      city_location: "Ville / Emplacement",
      city_placeholder: "Nom de la ville ou de la région",
      interested_in: "Intéressé par",
      only_livestream: "Afficher uniquement les églises avec direct",
      find_button: "Trouver une Famille d'Église",
      checking_location: "Vérification de votre emplacement...",
      all_interests: "Tous les intérêts",
      kids: "Enfants & Famille",
      youth: "Ministère des Jeunes",
      prayer: "Groupes de Prière",
      worship: "Groupe de Louange",
      missions: "Missions et évangélisation",
      explore_events: "Découvrir les événements", verified_near: "Églises vérifiées près de chez vous", search_title: "Rechercher des communautés et des directs", search_desc: "Trouvez des églises locales fiables par ville, style de culte ou domaine de ministère.", platform_doorways: "Accès à la plateforme", serve_title: "Comment pouvons-nous vous servir aujourd’hui ?", serve_desc: "Choisissez une action pour trouver une communauté, découvrir des événements, regarder des directs ou soutenir une mission.", transportation: "Transport gratuit le dimanche", donation: "Faire un don"
    },
    es: {
      find_churches: "Iglesias",
      events: "Eventos",
      streams: "Transmisiones",
      impact: "Impacto",
      media: "Medios",
      church_login: "Añadir Iglesia",
      hero_title: "Encuentra una familia de la iglesia cerca de ti.",
      hero_subtitle: "Busque iglesias verificadas por ciudad, ministerio, horario de servicio y disponibilidad de transmisión en vivo. Abra un perfil de la iglesia, contáctelos, obtenga direcciones y únase en línea.",
      churches_in_area: "Iglesias en tu área",
      find_church_family: "Encontrar una Familia de la Iglesia",
      search_card_desc: "Busque compañerismos, ministerios y canales de transmisión en vivo activos cerca de usted.",
      city_location: "Ciudad / Ubicación",
      city_placeholder: "Nombre de la ciudad o zona",
      interested_in: "Interesado en",
      only_livestream: "Solo mostrar iglesias con transmisión",
      find_button: "Encontrar una Familia de la Iglesia",
      checking_location: "Comprobando tu ubicación...",
      all_interests: "Todos los intereses",
      kids: "Niños y Familia",
      youth: "Ministerio de Jóvenes",
      prayer: "Grupos de Oración",
      worship: "Equipo de Alabanza",
      missions: "Misiones y evangelización",
      explore_events: "Explorar eventos", verified_near: "Iglesias verificadas cerca de ti", search_title: "Buscar comunidades y transmisiones", search_desc: "Encuentra iglesias locales de confianza por ciudad, estilo de adoración o enfoque ministerial.", platform_doorways: "Accesos de la plataforma", serve_title: "¿Cómo podemos ayudarte hoy?", serve_desc: "Elige una acción para encontrar una comunidad, explorar eventos, ver transmisiones en vivo o apoyar una misión.", transportation: "Transporte dominical gratuito", donation: "Donación"
    }
  };

  // Exact UI-copy translations used by every embedded SPA module. Published
  // names and user-authored descriptions are deliberately left untouched.
  const uiPhrases = {
    fr: {
      "Home": "Accueil", "Churches": "Églises", "Channels": "Chaînes", "Events": "Événements", "Livestreams": "Diffusions en direct", "Store": "Boutique", "Resources": "Ressources", "Messages": "Messages", "Donation": "Faire un don",
      "Search": "Rechercher", "Filter": "Filtrer", "All": "Tous", "Featured": "En vedette", "Newest": "Plus récents", "Popular": "Populaires", "Free": "Gratuit", "Paid": "Payant", "Live": "En direct", "Upcoming": "À venir", "Past": "Passés", "Open": "Ouvrir", "View": "Voir", "Close": "Fermer", "Cancel": "Annuler", "Save": "Enregistrer", "Apply": "Appliquer", "Continue": "Continuer", "Back": "Retour", "Next": "Suivant", "Previous": "Précédent", "Share": "Partager", "Download": "Télécharger", "Read": "Lire", "Watch": "Regarder", "Listen": "Écouter", "Register": "S’inscrire", "Sign In": "Se connecter", "Create Account": "Créer un compte",
      "Find a Church": "Trouver une église", "Find Churches": "Trouver des églises", "Church Directory": "Annuaire des églises", "Churches near you": "Églises près de chez vous", "Verified churches": "Églises vérifiées", "View Church": "Voir l’église", "View Profile": "Voir le profil", "Get Directions": "Obtenir l’itinéraire", "Contact Church": "Contacter l’église", "Request a Ride": "Demander un transport", "Join Livestream": "Rejoindre le direct",
      "Share the Gospel with the world.": "Partagez l’Évangile avec le monde.", "Create a Channel": "Créer une chaîne", "Create Channel": "Créer la chaîne", "Channels to explore": "Chaînes à découvrir", "Christian Channels": "Chaînes chrétiennes", "Create your Christian channel": "Créez votre chaîne chrétienne", "Channel name": "Nom de la chaîne", "Channel handle": "Identifiant de la chaîne", "Your name": "Votre nom", "Primary format": "Format principal", "Topic": "Thème", "Description": "Description", "Subscribe": "S’abonner", "Subscribed": "Abonné",
      "Discover Christian podcasts, livestreams, video teaching, worship, testimony, and creator-led communities—or start a channel of your own.": "Découvrez des podcasts chrétiens, des directs, des enseignements vidéo, de la louange, des témoignages et des communautés de créateurs — ou lancez votre propre chaîne.", "Search channels, creators, or topics...": "Rechercher des chaînes, créateurs ou thèmes…", "Filter by topic": "Filtrer par thème", "Filter by format": "Filtrer par format", "Filter by status": "Filtrer par statut", "All topics": "Tous les thèmes", "All formats": "Tous les formats", "Any status": "Tous les statuts", "Bible Teaching": "Enseignement biblique", "Bible Study": "Étude biblique", "Worship": "Louange", "Family": "Famille", "Leadership": "Leadership", "Youth": "Jeunesse", "Livestream": "Direct", "Video": "Vidéo", "Live now": "En direct", "Verified": "Vérifié", "Active": "Actif", "Followers": "Abonnés", "Episodes": "Épisodes", "Posts": "Publications", "Rating": "Note", "Get in touch": "Contacter",
      "Explore Events": "Découvrir les événements", "Upcoming Events": "Événements à venir", "Event Details": "Détails de l’événement", "About": "À propos", "Host & Speakers": "Hôte et intervenants", "Agenda": "Programme", "Frequently Asked Questions": "Questions fréquentes", "Book Your Pass": "Réserver votre pass", "First Name": "Prénom", "Last Name": "Nom", "Email Address": "Adresse e-mail", "Quantity": "Quantité", "Your Message": "Votre message", "Send Message": "Envoyer le message",
      "Live Now": "En direct maintenant", "Watch Live": "Regarder en direct", "Start watching": "Commencer à regarder", "Meditation Sanctuary": "Sanctuaire de méditation", "Create a Meditation Room": "Créer une salle de méditation", "Join Room": "Rejoindre la salle", "Start Session": "Commencer la séance", "End Session": "Terminer la séance",
      "Shop with churches and Christian creators.": "Achetez auprès d’églises et de créateurs chrétiens.", "Marketplace products": "Produits de la marketplace", "Cart": "Panier", "Your Cart": "Votre panier", "Your cart": "Votre panier", "Shopping cart": "Panier", "Continue shopping": "Continuer vos achats", "Order summary": "Récapitulatif de la commande", "Subtotal": "Sous-total", "Shipping": "Livraison", "Discount": "Réduction", "Total": "Total", "Checkout": "Paiement", "Contact": "Coordonnées", "Delivery": "Livraison", "Ship": "Expédier", "Pick up": "Retirer", "Country/Region": "Pays/région", "First name": "Prénom", "Last name": "Nom", "Address": "Adresse", "City": "Ville", "Postal code": "Code postal", "Shipping method": "Mode de livraison", "Payment": "Paiement", "Credit card": "Carte de crédit", "Card number": "Numéro de carte", "Security code": "Code de sécurité", "Name on card": "Nom sur la carte", "Pay now": "Payer maintenant", "Continue shopping": "Continuer vos achats",
      "Study, grow, teach, and share.": "Étudiez, grandissez, enseignez et partagez.", "Publish resource": "Publier une ressource", "Purchased": "Achats", "Resource library": "Bibliothèque de ressources", "Publish a Christian resource": "Publier une ressource chrétienne", "Title": "Titre", "Content type": "Type de contenu", "Format": "Format", "Access": "Accès", "Price": "Prix", "Summary": "Résumé", "Optional attachment": "Pièce jointe facultative",
      "Communication": "Communication", "Unread": "Non lus", "Sent": "Envoyés", "New message": "Nouveau message", "Email forwarding": "Transfert d’e-mails", "Not connected": "Non connecté", "Your My Way inbox": "Votre messagerie My Way", "Start a conversation": "Démarrer une conversation",
      "Create Creator Account": "Créer un compte créateur", "What would you like to launch first?": "Que souhaitez-vous lancer en premier ?", "Church Profile": "Profil d’église", "Channel / Media": "Chaîne / Média", "Events & Tickets": "Événements et billets", "Store & Merch": "Boutique et produits", "Study Resources": "Ressources d’étude", "All-in-One": "Tout-en-un", "Next: Organization Info": "Suivant : informations sur l’organisation"
    },
    es: {
      "Home": "Inicio", "Churches": "Iglesias", "Channels": "Canales", "Events": "Eventos", "Livestreams": "Transmisiones en vivo", "Store": "Tienda", "Resources": "Recursos", "Messages": "Mensajes", "Donation": "Donar",
      "Search": "Buscar", "Filter": "Filtrar", "All": "Todos", "Featured": "Destacados", "Newest": "Más recientes", "Popular": "Populares", "Free": "Gratis", "Paid": "De pago", "Live": "En vivo", "Upcoming": "Próximos", "Past": "Pasados", "Open": "Abrir", "View": "Ver", "Close": "Cerrar", "Cancel": "Cancelar", "Save": "Guardar", "Apply": "Aplicar", "Continue": "Continuar", "Back": "Atrás", "Next": "Siguiente", "Previous": "Anterior", "Share": "Compartir", "Download": "Descargar", "Read": "Leer", "Watch": "Ver", "Listen": "Escuchar", "Register": "Registrarse", "Sign In": "Iniciar sesión", "Create Account": "Crear cuenta",
      "Find a Church": "Encontrar una iglesia", "Find Churches": "Encontrar iglesias", "Church Directory": "Directorio de iglesias", "Churches near you": "Iglesias cerca de ti", "Verified churches": "Iglesias verificadas", "View Church": "Ver iglesia", "View Profile": "Ver perfil", "Get Directions": "Cómo llegar", "Contact Church": "Contactar con la iglesia", "Request a Ride": "Solicitar transporte", "Join Livestream": "Unirse a la transmisión",
      "Share the Gospel with the world.": "Comparte el Evangelio con el mundo.", "Create a Channel": "Crear un canal", "Create Channel": "Crear canal", "Channels to explore": "Canales para explorar", "Christian Channels": "Canales cristianos", "Create your Christian channel": "Crea tu canal cristiano", "Channel name": "Nombre del canal", "Channel handle": "Identificador del canal", "Your name": "Tu nombre", "Primary format": "Formato principal", "Topic": "Tema", "Description": "Descripción", "Subscribe": "Suscribirse", "Subscribed": "Suscrito",
      "Discover Christian podcasts, livestreams, video teaching, worship, testimony, and creator-led communities—or start a channel of your own.": "Descubre podcasts cristianos, transmisiones en vivo, enseñanzas en vídeo, adoración, testimonios y comunidades de creadores, o inicia tu propio canal.", "Search channels, creators, or topics...": "Buscar canales, creadores o temas…", "Filter by topic": "Filtrar por tema", "Filter by format": "Filtrar por formato", "Filter by status": "Filtrar por estado", "All topics": "Todos los temas", "All formats": "Todos los formatos", "Any status": "Cualquier estado", "Bible Teaching": "Enseñanza bíblica", "Bible Study": "Estudio bíblico", "Worship": "Adoración", "Family": "Familia", "Leadership": "Liderazgo", "Youth": "Jóvenes", "Livestream": "Transmisión en vivo", "Video": "Vídeo", "Live now": "En vivo ahora", "Verified": "Verificado", "Active": "Activo", "Followers": "Seguidores", "Episodes": "Episodios", "Posts": "Publicaciones", "Rating": "Valoración", "Get in touch": "Contactar",
      "Explore Events": "Explorar eventos", "Upcoming Events": "Próximos eventos", "Event Details": "Detalles del evento", "About": "Acerca de", "Host & Speakers": "Anfitrión y ponentes", "Agenda": "Programa", "Frequently Asked Questions": "Preguntas frecuentes", "Book Your Pass": "Reserva tu entrada", "First Name": "Nombre", "Last Name": "Apellido", "Email Address": "Correo electrónico", "Quantity": "Cantidad", "Your Message": "Tu mensaje", "Send Message": "Enviar mensaje",
      "Live Now": "En vivo ahora", "Watch Live": "Ver en vivo", "Start watching": "Empezar a ver", "Meditation Sanctuary": "Santuario de meditación", "Create a Meditation Room": "Crear una sala de meditación", "Join Room": "Unirse a la sala", "Start Session": "Iniciar sesión", "End Session": "Finalizar sesión",
      "Shop with churches and Christian creators.": "Compra a iglesias y creadores cristianos.", "Marketplace products": "Productos del mercado", "Cart": "Carrito", "Your Cart": "Tu carrito", "Your cart": "Tu carrito", "Shopping cart": "Carrito", "Continue shopping": "Seguir comprando", "Order summary": "Resumen del pedido", "Subtotal": "Subtotal", "Shipping": "Envío", "Discount": "Descuento", "Total": "Total", "Checkout": "Pago", "Contact": "Contacto", "Delivery": "Entrega", "Ship": "Enviar", "Pick up": "Recoger", "Country/Region": "País/región", "First name": "Nombre", "Last name": "Apellido", "Address": "Dirección", "City": "Ciudad", "Postal code": "Código postal", "Shipping method": "Método de envío", "Payment": "Pago", "Credit card": "Tarjeta de crédito", "Card number": "Número de tarjeta", "Security code": "Código de seguridad", "Name on card": "Nombre en la tarjeta", "Pay now": "Pagar ahora",
      "Study, grow, teach, and share.": "Estudia, crece, enseña y comparte.", "Publish resource": "Publicar recurso", "Purchased": "Comprados", "Resource library": "Biblioteca de recursos", "Publish a Christian resource": "Publicar un recurso cristiano", "Title": "Título", "Content type": "Tipo de contenido", "Format": "Formato", "Access": "Acceso", "Price": "Precio", "Summary": "Resumen", "Optional attachment": "Archivo adjunto opcional",
      "Communication": "Comunicación", "Unread": "No leídos", "Sent": "Enviados", "New message": "Nuevo mensaje", "Email forwarding": "Reenvío de correo", "Not connected": "No conectado", "Your My Way inbox": "Tu bandeja de entrada de My Way", "Start a conversation": "Iniciar una conversación",
      "Create Creator Account": "Crear cuenta de creador", "What would you like to launch first?": "¿Qué te gustaría lanzar primero?", "Church Profile": "Perfil de iglesia", "Channel / Media": "Canal / Medios", "Events & Tickets": "Eventos y entradas", "Store & Merch": "Tienda y productos", "Study Resources": "Recursos de estudio", "All-in-One": "Todo en uno", "Next: Organization Info": "Siguiente: información de la organización"
    }
  };
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();

  function translateModuleCopy(root, lang) {
    const phraseMap = { ...(window.MWE_TRANSLATIONS?.[lang] || {}), ...(uiPhrases[lang] || {}) };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement?.closest("script, style, textarea, [data-no-translate]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const source = originalText.get(node);
      const clean = source.trim();
      const translated = lang === "en" ? clean : phraseMap[clean];
      if (translated) node.nodeValue = source.replace(clean, translated);
      else if (lang === "en") node.nodeValue = source;
    });
    root.querySelectorAll?.("[placeholder], [aria-label], [title]").forEach(el => {
      if (!originalAttributes.has(el)) originalAttributes.set(el, {});
      const originals = originalAttributes.get(el);
      ["placeholder", "aria-label", "title"].forEach(attribute => {
        if (!el.hasAttribute(attribute)) return;
        if (!(attribute in originals)) originals[attribute] = el.getAttribute(attribute);
        const source = originals[attribute];
        el.setAttribute(attribute, lang === "en" ? source : (phraseMap[source] || source));
      });
    });
  }

  const flags = {
    en: '<svg class="flag-svg" viewBox="0 0 20 15" width="18" height="13.5" style="border-radius: 2px; flex-shrink: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.15); display: inline-block; vertical-align: middle;"><rect width="20" height="15" fill="#bd3d44"/><path d="M0 2.3h20v2.3H0zm0 4.6h20v2.3H0zm0 4.6h20v2.3H0z" fill="#fff"/><rect width="9" height="8.1" fill="#192f5d"/><circle cx="4.5" cy="4" r="2" fill="#fff"/></svg>',
    fr: '<svg class="flag-svg" viewBox="0 0 20 15" width="18" height="13.5" style="border-radius: 2px; flex-shrink: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.15); display: inline-block; vertical-align: middle;"><rect width="6.67" height="15" fill="#002654"/><rect x="6.67" width="6.66" height="15" fill="#ffffff"/><rect x="13.33" width="6.67" height="15" fill="#ce1126"/></svg>',
    es: '<svg class="flag-svg" viewBox="0 0 20 15" width="18" height="13.5" style="border-radius: 2px; flex-shrink: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.15); display: inline-block; vertical-align: middle;"><rect width="20" height="15" fill="#aa151b"/><rect y="3.75" width="20" height="7.5" fill="#f1bf00"/><circle cx="6" cy="7.5" r="2" fill="#aa151b"/></svg>'
  };
  const shortNames = { en: "EN", fr: "FR", es: "ES" };

  let currentLang = localStorage.getItem("mwe.lang") || "en";
  if (!translations[currentLang]) currentLang = "en";

  const applyLanguage = (lang) => {
    localStorage.setItem("mwe.lang", lang);
    currentLang = lang;
    document.documentElement.lang = lang;
    const page = document.body?.dataset.page;
    if (lang !== "en" && translatedTitles[lang]?.[page]) document.title = `${translatedTitles[lang][page]} | My Way`;

    document.querySelectorAll(".lang-selector-btn .lang-flag").forEach(el => {
      el.innerHTML = flags[lang] || flags.en;
    });
    document.querySelectorAll(".lang-selector-btn .lang-text").forEach(el => {
      el.textContent = shortNames[lang];
    });

    const dict = translations[lang];

    document.querySelectorAll("[data-t]").forEach(el => {
      const key = el.dataset.t;
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    const cityInput = document.getElementById("hero-city-input");
    if (cityInput) {
      cityInput.placeholder = dict["city_placeholder"];
    }

    document.querySelectorAll("[data-t-option]").forEach(el => {
      const key = el.dataset.tOption;
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    document.querySelectorAll(".custom-select-container").forEach(c => {
      const select = c.nextElementSibling;
      if (select && select.tagName === "SELECT") {
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    translateModuleCopy(document, lang);
    window.dispatchEvent(new CustomEvent("mwe:languagechange", { detail: { lang } }));
  };

  MWE.setLanguage = applyLanguage;
  if (!window.__mweLanguageMessageBound) {
    window.__mweLanguageMessageBound = true;
    window.addEventListener("message", event => {
      if (event.origin !== window.location.origin || event.data?.type !== "mwe-language") return;
      if (translations[event.data.lang]) applyLanguage(event.data.lang);
    });
  }

  const topbars = document.querySelectorAll(".topbar-inner .nav-actions");
  topbars.forEach(navActions => {
    if (navActions.querySelector(".lang-selector-container")) return;

    const container = document.createElement("div");
    container.className = "lang-selector-container";

    const btn = document.createElement("button");
    btn.className = "lang-selector-btn";
    btn.type = "button";
    btn.innerHTML = `<span class="lang-flag">${flags[currentLang]}</span> <span class="lang-text">${shortNames[currentLang]}</span> <i data-lucide="chevron-down" class="lang-chevron"></i>`;
    container.appendChild(btn);

    const panel = document.createElement("div");
    panel.className = "lang-selector-panel";
    panel.innerHTML = `
      <div class="lang-option" data-lang="en"><span class="lang-flag"><svg class="flag-svg" viewBox="0 0 20 15" width="18" height="13.5" style="border-radius: 2px; flex-shrink: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.15); display: inline-block; vertical-align: middle;"><rect width="20" height="15" fill="#bd3d44"/><path d="M0 2.3h20v2.3H0zm0 4.6h20v2.3H0zm0 4.6h20v2.3H0z" fill="#fff"/><rect width="9" height="8.1" fill="#192f5d"/><circle cx="4.5" cy="4" r="2" fill="#fff"/></svg></span> English</div>
      <div class="lang-option" data-lang="fr"><span class="lang-flag"><svg class="flag-svg" viewBox="0 0 20 15" width="18" height="13.5" style="border-radius: 2px; flex-shrink: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.15); display: inline-block; vertical-align: middle;"><rect width="6.67" height="15" fill="#002654"/><rect x="6.67" width="6.66" height="15" fill="#ffffff"/><rect x="13.33" width="6.67" height="15" fill="#ce1126"/></svg></span> Français</div>
      <div class="lang-option" data-lang="es"><span class="lang-flag"><svg class="flag-svg" viewBox="0 0 20 15" width="18" height="13.5" style="border-radius: 2px; flex-shrink: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.15); display: inline-block; vertical-align: middle;"><rect width="20" height="15" fill="#aa151b"/><rect y="3.75" width="20" height="7.5" fill="#f1bf00"/><circle cx="6" cy="7.5" r="2" fill="#aa151b"/></svg></span> Español</div>
    `;
    container.appendChild(panel);

    navActions.insertBefore(container, navActions.firstChild);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      container.classList.toggle("open");
    });

    panel.querySelectorAll(".lang-option").forEach(opt => {
      opt.addEventListener("click", () => {
        const lang = opt.dataset.lang;
        applyLanguage(lang);
        container.classList.remove("open");
      });
    });
  });

  // Handle moving the language selector dynamically between header (on mobile) and menu actions (on desktop)
  const handleResponsiveLangSelector = () => {
    const isMobile = window.innerWidth <= 768;
    document.querySelectorAll(".topbar-inner").forEach(topbarInner => {
      const langSelector = topbarInner.querySelector(".lang-selector-container") || topbarInner.querySelector(".topbar-menu-group .lang-selector-container");
      const navActions = topbarInner.querySelector(".nav-actions");
      const toggleBtn = topbarInner.querySelector(".mobile-menu-toggle");
      
      if (!langSelector) return;
      
      if (isMobile) {
        if (toggleBtn && langSelector.nextSibling !== toggleBtn) {
          topbarInner.insertBefore(langSelector, toggleBtn);
        }
      } else {
        if (navActions && langSelector.parentNode !== navActions) {
          navActions.insertBefore(langSelector, navActions.firstChild);
        }
      }
    });
  };

  handleResponsiveLangSelector();
  window.addEventListener("resize", handleResponsiveLangSelector);

  document.addEventListener("click", () => {
    document.querySelectorAll(".lang-selector-container").forEach(c => {
      c.classList.remove("open");
    });
  });

  applyLanguage(currentLang);

  // Cards and results are rendered after page load. Re-run the exact-copy
  // translator for newly inserted UI without translating published content.
  if (!window.__mweTranslationObserver) {
    let translationQueued = false;
    const observer = new MutationObserver(() => {
      if (translationQueued) return;
      translationQueued = true;
      queueMicrotask(() => {
        observer.disconnect();
        translateModuleCopy(document, currentLang);
        observer.observe(document.body, { childList: true, subtree: true });
        translationQueued = false;
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.__mweTranslationObserver = observer;
  }
}

function initModuleDirectoryToolbars() {
  document.querySelectorAll(".site-search-bar, .module-directory-toolbar").forEach(toolbar => {
    if (toolbar.dataset.responsiveFiltersInitialized) return;
    toolbar.dataset.responsiveFiltersInitialized = "true";

    const search = toolbar.querySelector(":scope > .module-search");
    if (!search) return;

    let group = toolbar.querySelector(":scope > .module-filter-group");
    if (!group) {
      group = document.createElement("div");
      group.className = "module-filter-group";
      [...toolbar.children].filter(child => child !== search).forEach(child => group.appendChild(child));
      toolbar.appendChild(group);
    }

    const filterItems = [...group.children].filter(child =>
      !child.matches(".module-filter-overflow-only") && child.matches(".module-filter-control, .module-filter-trigger, .lobby-tab-btn")
    );
    const overflowOnlyItems = [...group.children].filter(child => child.matches(".module-filter-overflow-only"));
    if (!filterItems.length && !overflowOnlyItems.length) return;

    const overflow = document.createElement("div");
    overflow.className = "module-filter-overflow module-filter-control";
    overflow.innerHTML = `
      <button class="module-filter-trigger module-overflow-trigger" type="button" aria-expanded="false">
        <i data-lucide="sliders-horizontal"></i>
        <span class="module-overflow-label">More filters</span>
      </button>
      <div class="module-filter-popup" aria-hidden="true"></div>`;
    toolbar.appendChild(overflow);

    const mobileButton = document.createElement("button");
    mobileButton.type = "button";
    mobileButton.className = "module-mobile-filter-button";
    mobileButton.setAttribute("aria-label", "Open filters");
    mobileButton.setAttribute("aria-expanded", "false");
    mobileButton.innerHTML = '<i data-lucide="sliders-horizontal"></i><span class="module-filter-count" hidden></span>';
    toolbar.appendChild(mobileButton);

    const popup = overflow.querySelector(".module-filter-popup");
    const desktopTrigger = overflow.querySelector(".module-overflow-trigger");

    const closePopup = () => {
      overflow.classList.remove("open");
      toolbar.classList.remove("has-open-dropdown");
      desktopTrigger.setAttribute("aria-expanded", "false");
      mobileButton.setAttribute("aria-expanded", "false");
      popup.setAttribute("aria-hidden", "true");
    };
    const togglePopup = event => {
      event.preventDefault();
      event.stopPropagation();
      const opening = !overflow.classList.contains("open");
      closePopup();
      overflow.classList.toggle("open", opening);
      toolbar.classList.toggle("has-open-dropdown", opening);
      desktopTrigger.setAttribute("aria-expanded", String(opening));
      mobileButton.setAttribute("aria-expanded", String(opening));
      popup.setAttribute("aria-hidden", String(!opening));
    };

    desktopTrigger.addEventListener("click", togglePopup);
    mobileButton.addEventListener("click", togglePopup);
    popup.addEventListener("click", event => event.stopPropagation());
    document.addEventListener("click", event => {
      if (!overflow.contains(event.target) && !mobileButton.contains(event.target)) closePopup();
    });
    document.addEventListener("keydown", event => { if (event.key === "Escape") closePopup(); });

    const layout = () => {
      filterItems.forEach(item => group.appendChild(item));
      const mobile = window.matchMedia("(max-width: 700px)").matches;

      if (mobile) {
        filterItems.forEach(item => popup.appendChild(item));
        overflowOnlyItems.forEach(item => popup.appendChild(item));
        overflow.classList.add("mobile-filter-mode");
        overflow.hidden = false;
        mobileButton.hidden = false;
        return;
      }

      overflow.classList.remove("mobile-filter-mode");
      mobileButton.hidden = true;
      const available = toolbar.clientWidth - 24;
      const searchMinWidth = 360;
      const itemWidth = 178;
      const gap = 12;
      const overflowWidth = 56;
      const visibleLimit = Math.min(3, filterItems.length);
      const visibleFiltersWidth = (visibleLimit * itemWidth) + (Math.max(0, visibleLimit - 1) * gap);
      const allFiltersFit = filterItems.length <= 3 && available >= searchMinWidth + gap + visibleFiltersWidth;
      let capacity = visibleLimit;

      if (!allFiltersFit) {
        const filterSpace = available - searchMinWidth - gap - overflowWidth - gap;
        capacity = Math.max(1, Math.min(filterItems.length, Math.floor((filterSpace + gap) / (itemWidth + gap))));
      }

      if (capacity < filterItems.length) {
        filterItems.slice(capacity).forEach(item => popup.appendChild(item));
        overflow.hidden = false;
      } else {
        overflow.hidden = !overflowOnlyItems.length;
      }
      overflowOnlyItems.forEach(item => popup.appendChild(item));
    };

    let resizeFrame = 0;
    let lastToolbarWidth = toolbar.clientWidth;
    const scheduleLayout = () => {
      if (Math.abs(toolbar.clientWidth - lastToolbarWidth) < 1) return;
      lastToolbarWidth = toolbar.clientWidth;
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(layout);
    };
    new ResizeObserver(scheduleLayout).observe(toolbar);
    layout();
    createIcons();
  });
}

function initStandardPublicSearchBars(root = document) {
  root.querySelectorAll(".module-search, .profile-app-search, .messages-search").forEach(search => {
    search.classList.add("site-search");
  });
}

// Shared by the public directories and the dynamically rendered admin workspaces.
MWE.initCustomDropdowns = initCustomDropdowns;
MWE.initModuleDirectoryToolbars = initModuleDirectoryToolbars;
MWE.initStandardPublicSearchBars = initStandardPublicSearchBars;

// Initialize mobile menu toggle logic
const initMobileMenu = () => {
  const toggleBtn = document.querySelector(".mobile-menu-toggle");
  const menuGroup = document.querySelector(".topbar-menu-group");
  if (!toggleBtn || !menuGroup) return;
  if (toggleBtn.dataset.mobileMenuReady === "true") return;
  toggleBtn.dataset.mobileMenuReady = "true";

  // Create backdrop element if it doesn't exist
  let backdrop = document.querySelector(".mobile-menu-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "mobile-menu-backdrop";
    document.body.appendChild(backdrop);
  }

  const toggleMenu = (forceState) => {
    const isOpen = typeof forceState === "boolean" ? forceState : !menuGroup.classList.contains("open");
    menuGroup.classList.toggle("open", isOpen);
    backdrop.classList.toggle("open", isOpen);
    document.body.classList.toggle("mobile-menu-active", isOpen);
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
    toggleBtn.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    
    // Toggle toggle button icon between menu and x
    const icon = toggleBtn.querySelector("i, svg");
    if (icon) {
      icon.setAttribute("data-lucide", isOpen ? "x" : "menu");
      if (window.lucide) window.lucide.createIcons();
    }
  };

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  backdrop.addEventListener("click", () => {
    toggleMenu(false);
  });

  // Close menu on navigation click
  menuGroup.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", () => {
      if (!el.classList.contains("lang-selector-btn") && !el.closest(".theme-palette-container")) {
        toggleMenu(false);
      }
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && menuGroup.classList.contains("open")) {
      toggleMenu(false);
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menuGroup.classList.contains("open")) {
      toggleMenu(false);
      toggleBtn.focus();
    }
  });
};

function initOnboardingCarousel() {
  const container = document.getElementById("onboarding-carousel");
  if (!container) return;

  const features = [
    {
      text: "Register & grow your Church profile",
      icon: "church",
      stats: [
        { label: "Churches Connected", value: 1284, icon: "church" },
        { label: "New Church Visitors", value: 4732, icon: "user-plus" },
        { label: "Cities Covered", value: 312, icon: "map-pin" }
      ]
    },
    {
      text: "Broadcast video & podcast Channels",
      icon: "podcast",
      stats: [
        { label: "Media Subscribers", value: 8420, icon: "users" },
        { label: "Audio & Video Episodes", value: 1150, icon: "mic-2" },
        { label: "Countries Reached", value: 44, icon: "globe" }
      ]
    },
    {
      text: "Schedule conferences & sell Event tickets",
      icon: "calendar",
      stats: [
        { label: "Events Publicised", value: 3842, icon: "calendar" },
        { label: "Attendees Registered", value: 19450, icon: "users" },
        { label: "Ticket Check-ins", value: 14200, icon: "ticket" }
      ]
    },
    {
      text: "Open your Christian Store & Merch catalog",
      icon: "shopping-bag",
      stats: [
        { label: "Products Listed", value: 620, icon: "package" },
        { label: "Store Orders", value: 1830, icon: "shopping-bag" },
        { label: "Books & Apparel", value: 450, icon: "tag" }
      ]
    },
    {
      text: "Publish Study Guides & PDF Resources",
      icon: "book-open",
      stats: [
        { label: "Digital Downloads", value: 12900, icon: "download-cloud" },
        { label: "Study Guides", value: 780, icon: "file-text" },
        { label: "Global Readers", value: 34200, icon: "globe" }
      ]
    }
  ];

  let currentIdx = 0;

  function animateCounter(el) {
    const target = parseInt(el.getAttribute("data-target"), 10);
    const duration = 1200;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress);
      const currentValue = Math.floor(easeProgress * target);

      el.textContent = currentValue.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target.toLocaleString();
      }
    }

    requestAnimationFrame(update);
  }

  function displayFeature(idx) {
    const feat = features[idx];
    const groupEl = document.createElement("div");
    groupEl.className = "onboarding-feature-group";

    let displayText = feat.text;
    if (window.innerWidth <= 1040 && displayText === "Share schedules, ministries & contact details") {
      displayText = "Share schedules, & contact details";
    }

    const statsHtml = feat.stats.map((stat, i) => `
      <div class="onboarding-stat-card" style="animation-delay: ${0.25 + i * 0.15}s;">
        <div class="onboarding-stat-card-icon">
          <i data-lucide="${stat.icon}"></i>
        </div>
        <div class="onboarding-stat-card-content">
          <strong class="count-up" data-target="${stat.value}">0</strong>
          <span>${MWE.escapeHtml(stat.label)}</span>
        </div>
      </div>
    `).join("");

    groupEl.innerHTML = `
      <div class="onboarding-feature-item">
        <i data-lucide="${feat.icon}"></i>
        <span>${MWE.escapeHtml(displayText)}</span>
      </div>
      <div class="onboarding-feature-stats">
        ${statsHtml}
      </div>
    `;

    container.innerHTML = "";
    container.appendChild(groupEl);

    if (window.lucide) {
      window.lucide.createIcons();
    }

    groupEl.querySelectorAll(".count-up").forEach(animateCounter);
  }

  function cycle() {
    const activeGroup = container.querySelector(".onboarding-feature-group");
    if (activeGroup) {
      activeGroup.classList.add("exit");
      setTimeout(() => {
        currentIdx = (currentIdx + 1) % features.length;
        displayFeature(currentIdx);
      }, 500);
    } else {
      displayFeature(currentIdx);
    }
  }

  displayFeature(currentIdx);
  setInterval(cycle, 5500);
}

MWE.renderEventsList = function() {
  const cityInput = document.getElementById("event-city-input");
  const typeSelect = document.getElementById("event-type-select");
  const priceSelect = document.getElementById("event-price-select");
  const timeSelect = document.getElementById("event-time-select");

  const cityFilter = cityInput ? cityInput.value.trim().toLowerCase() : "";
  const typeFilter = typeSelect ? typeSelect.value : "all";
  const priceFilter = priceSelect ? priceSelect.value : "all";
  const timeFilter = timeSelect ? timeSelect.value : "upcoming";

  const allEvents = MWE.getEvents();
  const now = new Date();

  // Filter events
  const filtered = allEvents.filter(evt => {
    const eventDate = new Date(evt.startsAt);
    
    // Timeframe filter
    if (timeFilter === "upcoming" && eventDate < now) return false;
    if (timeFilter === "past" && eventDate >= now) return false;

    // City filter
    if (cityFilter) {
      const eventCity = (evt.city || "").toLowerCase();
      const church = MWE.getChurches().find(c => c.id === evt.churchId);
      const churchCity = church ? (church.city || "").toLowerCase() : "";
      if (!eventCity.includes(cityFilter) && !churchCity.includes(cityFilter)) return false;
    }

    // Event type / category filter
    if (typeFilter !== "all") {
      const categoryHaystack = [evt.eventType, evt.title, evt.description, (evt.highlights || []).map(h => (h.title || "") + " " + (h.desc || "")).join(" ")].join(" ").toLowerCase();
      if (typeFilter === "in-person" && evt.eventType !== "in-person") return false;
      if (typeFilter === "streamed" && evt.eventType !== "streamed") return false;
      if (typeFilter === "sunday-services" && !categoryHaystack.includes("sunday") && !categoryHaystack.includes("worship") && !categoryHaystack.includes("service")) return false;
      if (typeFilter === "conferences" && !categoryHaystack.includes("conference") && !categoryHaystack.includes("awakening") && !categoryHaystack.includes("forum")) return false;
      if (typeFilter === "youth-events" && !categoryHaystack.includes("youth") && !categoryHaystack.includes("student")) return false;
      if (typeFilter === "prayer-programs" && !categoryHaystack.includes("prayer") && !categoryHaystack.includes("praise") && !categoryHaystack.includes("fasting")) return false;
      if (typeFilter === "evangelism-outreaches" && !categoryHaystack.includes("outreach") && !categoryHaystack.includes("evangelism") && !categoryHaystack.includes("street")) return false;
      if (typeFilter === "community-assistance" && !categoryHaystack.includes("food") && !categoryHaystack.includes("assistance") && !categoryHaystack.includes("community")) return false;
      if (typeFilter === "fundraisers" && !categoryHaystack.includes("fundraiser") && !categoryHaystack.includes("gala") && !categoryHaystack.includes("ticket")) return false;
    }

    // Price filter
    if (priceFilter === "free" && (evt.ticketPriceCents || 0) > 0) return false;
    if (priceFilter === "paid" && (evt.ticketPriceCents || 0) === 0) return false;

    return true;
  });

  // Render Featured Events (Only upcoming & featured)
  const featuredWrapper = document.getElementById("featured-events-wrapper");
  const featuredGrid = document.getElementById("featured-events-grid");
  if (featuredWrapper && featuredGrid) {
    const featured = filtered.filter(evt => evt.isFeatured && new Date(evt.startsAt) >= now);
    if (featured.length === 0 || timeFilter === "past") {
      featuredWrapper.style.display = "none";
    } else {
      featuredWrapper.style.display = "block";
      featuredGrid.innerHTML = featured.map(evt => MWE.createEventCardHtml(evt, true)).join("");
    }
  }

  // Render general events list
  const listGrid = document.getElementById("events-list-grid");
  const emptyState = document.getElementById("events-empty-state");
  const listTitle = document.getElementById("events-list-title");

  if (listTitle) {
    listTitle.textContent = timeFilter === "upcoming" ? "All Upcoming Events" : "Past Christian Events";
  }

  if (listGrid) {
    const listEvents = (timeFilter === "upcoming") 
      ? filtered.filter(evt => !evt.isFeatured) 
      : filtered;

    if (listEvents.length === 0) {
      listGrid.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
    } else {
      if (emptyState) emptyState.style.display = "none";
      listGrid.innerHTML = listEvents.map(evt => MWE.createEventCardHtml(evt, false)).join("");
    }
  }

  createIcons();
};

MWE.createEventCardHtml = function(evt, isFeatured = false) {
  const dateObj = new Date(evt.startsAt);
  const dayNum = dateObj.getDate();
  const monthShort = dateObj.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  const isPast = new Date(evt.startsAt) < new Date();
  
  const church = MWE.getChurches().find(c => c.id === evt.churchId);
  const displayCity = evt.city || (church ? church.city : "Edmonton");
  const priceLabel = evt.ticketPriceCents ? `$${(evt.ticketPriceCents / 100).toFixed(0)}` : "Free";
  const bgPhoto = evt.coverImageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80';

  let badgeHtml = "";
  if (evt.eventType === "streamed") badgeHtml = `<span class="event-card-top-badge" style="color: #dc2626;"><span style="width:6px; height:6px; background:#dc2626; border-radius:50%; display:inline-block;"></span> LIVE</span>`;
  else if (isPast) badgeHtml = `<span class="event-card-top-badge" style="color: #64748b;">Past</span>`;

  if (isFeatured) {
    return `
      <a href="event-profile.html?id=${evt.id}" class="event-card-modern ${isPast ? 'opacity-75' : ''}">
        <div class="event-card-banner-wrap is-featured-banner" style="background-image: url('${MWE.escapeHtml(bgPhoto)}');">
          <div class="event-card-featured-overlay"></div>
          
          <span class="event-card-top-badge" style="top: 15px; left: 15px; background: rgba(255,255,255,0.92); color: #0f172a;"><i data-lucide="sparkles" style="color: var(--color-primary-gold);"></i> Featured</span>

          <div class="event-card-bottom-row">
            <!-- Date Badge & Ticket Price Column -->
            <div class="event-date-col">
              <span class="event-date-month">${MWE.escapeHtml(monthShort)}</span>
              <span class="event-date-num">${dayNum}</span>
              <span class="event-price-tag-sub">${priceLabel === 'Free' ? 'FREE' : priceLabel}</span>
            </div>

            <div class="event-date-divider"></div>

            <!-- Event Details Column -->
            <div class="event-details-col">
              <span class="event-location-pill"><i data-lucide="map-pin" style="width: 12px; height: 12px;"></i> ${MWE.escapeHtml(displayCity)}</span>
              <h4 class="event-card-title-new">${MWE.escapeHtml(evt.title)}</h4>
              <p class="event-card-desc">${MWE.escapeHtml(evt.description || 'Join us for a dynamic gathering.')}</p>
            </div>
          </div>
        </div>
      </a>
    `;
  }

  return `
    <a href="event-profile.html?id=${evt.id}" class="event-card-modern ${isPast ? 'opacity-75' : ''}">
      <div class="event-card-banner-wrap">
        <img class="event-card-banner-img" src="${MWE.escapeHtml(bgPhoto)}" alt="${MWE.escapeHtml(evt.title)}" loading="lazy" />
        ${badgeHtml}
      </div>

      <div class="event-card-bottom-row">
        <!-- Date Badge & Ticket Price Column -->
        <div class="event-date-col">
          <span class="event-date-month">${MWE.escapeHtml(monthShort)}</span>
          <span class="event-date-num">${dayNum}</span>
          <span class="event-price-tag-sub">${priceLabel === 'Free' ? 'FREE' : priceLabel}</span>
        </div>

        <div class="event-date-divider"></div>

        <!-- Event Details Column -->
        <div class="event-details-col">
          <span class="event-location-pill"><i data-lucide="map-pin" style="width: 12px; height: 12px;"></i> ${MWE.escapeHtml(displayCity)}</span>
          <h4 class="event-card-title-new">${MWE.escapeHtml(evt.title)}</h4>
          <p class="event-card-desc">${MWE.escapeHtml(evt.description || 'Join us for a dynamic gathering.')}</p>
        </div>
      </div>
    </a>
  `;
};

MWE.openEventModal = function(id) {
  const modal = document.getElementById("event-detail-modal");
  const body = document.getElementById("modal-event-body");
  if (!modal || !body) return;

  const evt = MWE.getEvent(id);
  if (!evt) return;

  const dateObj = new Date(evt.startsAt);
  const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const price = (evt.ticketPriceCents || 0) === 0 ? "Free / Registration Required" : `$${(evt.ticketPriceCents / 100).toFixed(2)}`;
  const isPast = new Date(evt.startsAt) < new Date();

  const church = MWE.getChurches().find(c => c.id === evt.churchId);
  const organizerName = church ? church.name : "Christian Fellowship";

  let actionButton = "";
  if (!isPast) {
    actionButton = `
      <button class="button primary block large" onclick="MWE.openRegModal('${evt.id}')" style="margin-top: 24px; width: 100%;">
        <i data-lucide="ticket"></i> Register / Get Tickets
      </button>
    `;
  } else {
    actionButton = `
      <div class="info-alert" style="margin-top: 20px; padding: 12px; background: rgba(0,0,0,0.04); border-radius: 8px; text-align: center; color: var(--muted);">
        This event has concluded.
      </div>
    `;
  }

  let locationInfo = "";
  if (evt.eventType === "streamed") {
    locationInfo = `
      <div class="meta-row" style="display:flex; gap:12px; align-items:center; margin-bottom:12px;"><i data-lucide="video" style="color:var(--forest); width:20px; height:20px; flex-shrink:0;"></i><div><strong style="font-size:0.85rem;">Streamed Event</strong><p style="margin:0; font-size:0.9rem; color:var(--muted);">Broadcast online via <a href="${evt.livestreamUrl || '#'}" target="_blank">${evt.livestreamUrl || 'livestream channel'}</a></p></div></div>
    `;
  } else {
    locationInfo = `
      <div class="meta-row" style="display:flex; gap:12px; align-items:center; margin-bottom:12px;"><i data-lucide="map-pin" style="color:var(--forest); width:20px; height:20px; flex-shrink:0;"></i><div><strong style="font-size:0.85rem;">Venue / Location</strong><p style="margin:0; font-size:0.9rem; color:var(--muted);">${MWE.escapeHtml(evt.venueName || "Venue")}, ${MWE.escapeHtml(evt.city || (church ? church.city : ""))}<br><small><a href="${evt.directionsUrl || '#'}" target="_blank">Get Directions</a></small></p></div></div>
    `;
  }

  body.innerHTML = `
    <div class="event-modal-detail-grid">
      <div class="detail-header-image" style="background-image: url('${evt.coverImageUrl}'); height: 200px; border-radius: 8px; background-size: cover; background-position: center; margin-bottom: 20px;"></div>
      <div class="event-meta-info-list" style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px;">
        <div class="meta-row" style="display:flex; gap:12px; align-items:center; margin-bottom:12px;"><i data-lucide="calendar" style="color:var(--forest); width:20px; height:20px; flex-shrink:0;"></i><div><strong style="font-size:0.85rem;">Date & Time</strong><p style="margin:0; font-size:0.9rem; color:var(--muted);">${formattedDate}</p></div></div>
        ${locationInfo}
        <div class="meta-row" style="display:flex; gap:12px; align-items:center; margin-bottom:12px;"><i data-lucide="church" style="color:var(--forest); width:20px; height:20px; flex-shrink:0;"></i><div><strong style="font-size:0.85rem;">Hosted By</strong><p style="margin:0; font-size:0.9rem; color:var(--muted);"><a href="church-profile.html?id=${evt.churchId}">${MWE.escapeHtml(organizerName)}</a></p></div></div>
        <div class="meta-row" style="display:flex; gap:12px; align-items:center; margin-bottom:12px;"><i data-lucide="banknote" style="color:var(--forest); width:20px; height:20px; flex-shrink:0;"></i><div><strong style="font-size:0.85rem;">Admission Price</strong><p style="margin:0; font-size:0.9rem; color:var(--muted);">${price}</p></div></div>
      </div>
      <div class="event-description-box" style="border-top: 1px solid var(--line); padding-top: 16px;">
        <h4 style="margin-top:0; margin-bottom:8px;">Description</h4>
        <p style="font-size: 0.95rem; line-height: 1.6; color: var(--ink); margin: 0;">${MWE.escapeHtml(evt.description || "No description provided.")}</p>
      </div>
      ${actionButton}
    </div>
  `;

  modal.classList.add("open");
  createIcons();
};

MWE.closeEventModal = function() {
  const modal = document.getElementById("event-detail-modal");
  if (modal) modal.classList.remove("open");
};

MWE.openRegModal = function(id) {
  MWE.closeEventModal();
  const modal = document.getElementById("ticket-reg-modal");
  const form = document.getElementById("event-registration-form");
  const eventIdInput = document.getElementById("reg-event-id");
  const formContainer = document.getElementById("reg-form-container");
  const receiptContainer = document.getElementById("reg-receipt-container");

  if (!modal || !form || !eventIdInput) return;

  const evt = MWE.getEvent(id);
  if (!evt) return;

  eventIdInput.value = id;
  
  // Reset form
  form.reset();
  formContainer.style.display = "block";
  receiptContainer.style.display = "none";

  MWE.updateCheckoutPrice();
  modal.classList.add("open");
};

MWE.closeRegModal = function() {
  const modal = document.getElementById("ticket-reg-modal");
  if (modal) modal.classList.remove("open");
};

MWE.updateCheckoutPrice = function() {
  const eventId = document.getElementById("reg-event-id").value;
  const qty = Number(document.getElementById("reg-quantity").value || 1);
  const priceBox = document.getElementById("checkout-price-box");
  const priceLabel = document.getElementById("checkout-total-price");

  if (!eventId) return;

  const evt = MWE.getEvent(eventId);
  if (!evt) return;

  const priceCents = evt.ticketPriceCents || 0;
  if (priceCents === 0) {
    if (priceBox) priceBox.style.display = "none";
  } else {
    if (priceBox && priceLabel) {
      priceBox.style.display = "flex";
      priceLabel.textContent = `$${((priceCents * qty) / 100).toFixed(2)}`;
    }
  }
};

MWE.handleRegistrationSubmit = function(e) {
  e.preventDefault();
  const eventId = document.getElementById("reg-event-id").value;
  const fullName = document.getElementById("reg-full-name").value;
  const email = document.getElementById("reg-email").value;
  const ticketQuantity = Number(document.getElementById("reg-quantity").value || 1);

  if (!eventId || !fullName || !email) return;

  const evt = MWE.getEvent(eventId);
  if (!evt) return;

  const reg = MWE.registerForEvent({
    eventId,
    fullName,
    email,
    ticketQuantity,
    ticketPriceCents: evt.ticketPriceCents || 0
  });

  // Render receipt ticket with QR Code!
  const formContainer = document.getElementById("reg-form-container");
  const receiptContainer = document.getElementById("reg-receipt-container");
  const totalDisplay = (reg.amountPaidCents || 0) === 0 ? "Free" : `$${(reg.amountPaidCents / 100).toFixed(2)}`;

  receiptContainer.innerHTML = `
    <div class="ticket-receipt" style="text-align: center; padding: 12px 0;">
      <i data-lucide="check-circle" style="width: 48px; height: 48px; color: var(--forest); margin-bottom: 12px; display:inline-block;"></i>
      <h4 style="margin-top:0; margin-bottom:4px;">Registration Successful!</h4>
      <p style="font-size:0.85rem; color:var(--muted); margin-bottom:20px;">Present this ticket at the event entrance.</p>
      
      <!-- Generated Ticket Stub -->
      <div class="ticket-stub" style="border: 1px dashed var(--line); border-radius: 12px; background: #fff; padding: 20px; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.02); position: relative; overflow: hidden; margin-bottom: 20px; color:var(--ink);">
        <h5 style="margin-top:0; margin-bottom:4px; font-size:1rem; font-weight:800; color:var(--ink);">${MWE.escapeHtml(evt.title)}</h5>
        <div style="font-size:0.78rem; color:var(--muted); margin-bottom:12px;"><i data-lucide="calendar" style="width:12px; height:12px; vertical-align:middle; margin-right:3px; display:inline-block;"></i>${new Date(evt.startsAt).toLocaleDateString()}</div>
        
        <div class="ticket-meta-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem; margin-bottom: 16px; border-bottom: 1px solid var(--line); padding-bottom: 12px;">
          <div><span style="color:var(--muted)">Attendee:</span><br><strong>${MWE.escapeHtml(reg.fullName)}</strong></div>
          <div><span style="color:var(--muted)">Quantity:</span><br><strong>${reg.ticketQuantity} Ticket(s)</strong></div>
          <div><span style="color:var(--muted)">Price paid:</span><br><strong>${totalDisplay}</strong></div>
          <div><span style="color:var(--muted)">Ticket Code:</span><br><strong>${reg.registrationCode}</strong></div>
        </div>

        <div style="text-align: center;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${reg.registrationCode}" alt="Ticket QR Code" style="width: 140px; height: 140px; border: 1px solid var(--line); padding: 4px; border-radius: 6px; margin-bottom: 6px; display:inline-block;" />
          <div style="font-size:0.7rem; color:var(--muted)">Scan code to verify entry</div>
        </div>
      </div>

      <button class="button primary" onclick="MWE.closeRegModal()">Close</button>
    </div>
  `;

  formContainer.style.display = "none";
  receiptContainer.style.display = "block";
  createIcons();
};

MWE.showNewEventForm = function() {
  const form = document.getElementById("portal-event-form");
  const card = document.getElementById("event-editor-card");
  const title = document.getElementById("event-editor-title");
  const idInput = document.getElementById("pe-event-id");

  if (!form || !card || !title || !idInput) return;

  form.reset();
  idInput.value = "";
  title.textContent = "Schedule New Event";
  
  // Set default startsAt value to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);
  const startsAtInput = document.getElementById("pe-starts-at");
  if (startsAtInput) startsAtInput.value = tomorrow.toISOString().slice(0, 16);

  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth", block: "start" });
};

MWE.hideEventEditor = function() {
  const card = document.getElementById("event-editor-card");
  if (card) card.style.display = "none";
};

MWE.openCreatorChannelModal = function(type) {
  if (MWE.isMemberShellEmbed()) {
    window.parent.postMessage({
      type: "faithlink:navigate",
      view: "channels"
    }, window.location.origin);
    return;
  }
  window.location.href = "channels.html";
};

MWE.openCreatorStoreModal = function() {
  if (MWE.isMemberShellEmbed()) {
    window.parent.postMessage({
      type: "faithlink:navigate",
      view: "store-manager"
    }, window.location.origin);
    return;
  }
  window.location.href = "seller-dashboard.html";
};

MWE.openCreatorResourceModal = function() {
  if (MWE.isMemberShellEmbed()) {
    window.parent.postMessage({
      type: "faithlink:navigate",
      view: "resources"
    }, window.location.origin);
    return;
  }
  window.location.href = "resources.html";
};

MWE.handlePortalEventSubmit = function(e) {
  e.preventDefault();
  const select = document.querySelector("[data-portal-select]");
  if (!select || !select.value) return;

  const idInput = document.getElementById("pe-event-id").value;
  const titleVal = document.getElementById("pe-title").value;
  const typeVal = document.getElementById("pe-type").value;
  const imageVal = document.getElementById("pe-image").value;
  const startsAtVal = document.getElementById("pe-starts-at").value;
  const venueVal = document.getElementById("pe-venue").value;
  const cityVal = document.getElementById("pe-city").value;
  const priceVal = Number(document.getElementById("pe-price").value || 0);
  const capacityVal = document.getElementById("pe-capacity").value;
  const streamVal = document.getElementById("pe-stream").value;
  const descVal = document.getElementById("pe-desc").value;

  const churchId = select.value;
  const eventId = idInput || MWE.slugify(titleVal) + "-" + Date.now();

  const eventData = {
    id: eventId,
    churchId,
    title: titleVal,
    eventType: typeVal,
    startsAt: startsAtVal,
    venueName: venueVal,
    city: cityVal,
    coverImageUrl: imageVal || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
    registrationRequired: true,
    ticketPriceCents: Math.round(priceVal * 100),
    currency: "USD",
    totalTickets: capacityVal ? Number(capacityVal) : null,
    ticketsSold: idInput ? (MWE.getEvent(idInput)?.ticketsSold || 0) : 0,
    livestreamUrl: streamVal,
    description: descVal,
    isFeatured: idInput ? (MWE.getEvent(idInput)?.isFeatured || false) : false,
    isPromoted: idInput ? (MWE.getEvent(idInput)?.isPromoted || false) : false
  };

  MWE.upsertEvent(eventData);
  MWE.hideEventEditor();
  MWE.renderPortalEvents(churchId);
  showToast(idInput ? "Event updated successfully" : "New event scheduled!");
};

MWE.renderPortalEvents = function(churchId) {
  const tbody = document.getElementById("portal-events-tbody");
  if (!tbody) return;

  const events = MWE.getEvents().filter(evt => evt.churchId === churchId);

  if (events.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="padding: 24px; text-align: center; color: var(--muted);">
          No events scheduled yet. Click 'Add Event' above to get started.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = events.map(evt => {
    const dateObj = new Date(evt.startsAt);
    const formattedDate = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const price = (evt.ticketPriceCents || 0) === 0 ? "Free" : `$${(evt.ticketPriceCents / 100).toFixed(2)}`;
    const sold = evt.ticketsSold || 0;
    const limit = evt.totalTickets ? `/ ${evt.totalTickets}` : "";

    return `
      <tr style="border-bottom: 1px solid var(--line);">
        <td style="padding:12px;"><strong>${MWE.escapeHtml(evt.title)}</strong></td>
        <td style="padding:12px;"><span class="tag small">${MWE.escapeHtml(evt.eventType)}</span><br><small>${MWE.escapeHtml(evt.venueName || "No venue")}</small></td>
        <td style="padding:12px;">${formattedDate}</td>
        <td style="padding:12px;">${price}<br><small style="color:var(--muted)">${sold}${limit} sold</small></td>
        <td style="padding:12px; text-align:right;">
          <button class="button ghost small" style="margin-right:4px;" onclick="MWE.viewEventRegistrants('${evt.id}')" title="View Attendees"><i data-lucide="users" style="width:14px;height:14px;display:inline-block;"></i></button>
          <button class="button ghost small" style="margin-right:4px;" onclick="MWE.editPortalEvent('${evt.id}')" title="Edit Event"><i data-lucide="edit-3" style="width:14px;height:14px;display:inline-block;"></i></button>
          <button class="button ghost small danger" onclick="MWE.deletePortalEvent('${evt.id}')" title="Delete Event">&times;</button>
        </td>
      </tr>
    `;
  }).join("");

  createIcons();
};

MWE.editPortalEvent = function(id) {
  const evt = MWE.getEvent(id);
  if (!evt) return;

  MWE.showNewEventForm();
  
  document.getElementById("event-editor-title").textContent = "Edit Event Details";
  document.getElementById("pe-event-id").value = evt.id;
  document.getElementById("pe-title").value = evt.title;
  document.getElementById("pe-type").value = evt.eventType;
  document.getElementById("pe-image").value = evt.coverImageUrl || "";
  document.getElementById("pe-starts-at").value = (evt.startsAt || "").slice(0, 16);
  document.getElementById("pe-venue").value = evt.venueName || "";
  document.getElementById("pe-city").value = evt.city || "";
  document.getElementById("pe-price").value = ((evt.ticketPriceCents || 0) / 100).toFixed(2);
  document.getElementById("pe-capacity").value = evt.totalTickets || "";
  document.getElementById("pe-stream").value = evt.livestreamUrl || "";
  document.getElementById("pe-desc").value = evt.description || "";
};

MWE.deletePortalEvent = function(id) {
  if (!confirm("Are you sure you want to delete this event?")) return;
  const select = document.querySelector("[data-portal-select]");
  if (!select) return;

  MWE.removeEvent(id);
  MWE.renderPortalEvents(select.value);
  showToast("Event deleted");
};

MWE.viewEventRegistrants = function(eventId) {
  const modal = document.getElementById("portal-registrants-modal");
  const title = document.getElementById("portal-registrants-event-title");
  const tbody = document.getElementById("portal-registrants-tbody");

  if (!modal || !title || !tbody) return;

  const evt = MWE.getEvent(eventId);
  if (!evt) return;

  title.textContent = evt.title;
  const regs = MWE.getRegistrationsForEvent(eventId);

  if (regs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="padding: 16px; text-align: center; color: var(--muted);">
          No one has registered for this event yet.
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = regs.map(reg => `
      <tr style="border-bottom: 1px solid var(--line);">
        <td style="padding:8px;"><strong>${MWE.escapeHtml(reg.fullName)}</strong></td>
        <td style="padding:8px;"><a href="mailto:${MWE.escapeHtml(reg.email)}">${MWE.escapeHtml(reg.email)}</a></td>
        <td style="padding:8px;">${reg.ticketQuantity} ticket(s)</td>
        <td style="padding:8px;"><code style="background:var(--soft);padding:2px 4px;border-radius:4px;">${reg.registrationCode}</code></td>
        <td style="padding:8px;font-size:0.8rem;color:var(--muted);">${new Date(reg.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join("");
  }

  modal.classList.add("open");
};

MWE.closeRegistrantsModal = function() {
  const modal = document.getElementById("portal-registrants-modal");
  if (modal) modal.classList.remove("open");
};

function setupPortalEventsTab() {
  const select = document.querySelector("[data-portal-select]");
  const formPanel = document.querySelector(".profile-content-panel");
  const sidebars = document.querySelector(".dashboard-grid aside.stack");
  const eventsPanel = document.getElementById("events-manager-panel");
  const tabs = document.querySelectorAll(".dash-nav a");

  if (!eventsPanel) return;

  // Render initial list if select has value
  if (select && select.value) {
    MWE.renderPortalEvents(select.value);
  }

  // Handle select profile change
  if (select) {
    select.addEventListener("change", () => {
      MWE.renderPortalEvents(select.value);
    });
  }

  // Handle dashboard sidebar tabs
  tabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
      const isEventsTab = tab.getAttribute("data-portal-tab") === "events";
      
      // Update sidebar active state
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      if (isEventsTab) {
        e.preventDefault();
        // Hide standard profile editors & sidebars
        if (formPanel) formPanel.style.display = "none";
        if (sidebars) sidebars.style.display = "none";
        
        // Show Events Panel
        eventsPanel.style.display = "block";
      } else {
        // Show standard profile editors & sidebars
        if (formPanel) formPanel.style.display = "block";
        if (sidebars) sidebars.style.display = "block";
        
        // Hide Events Panel
        eventsPanel.style.display = "none";
        MWE.hideEventEditor();
      }
    });
  });
}

MWE.resetEventsSearch = function() {
  const cityInput = document.getElementById("event-city-input");
  const typeSelect = document.getElementById("event-type-select");
  const priceSelect = document.getElementById("event-price-select");
  const timeSelect = document.getElementById("event-time-select");

  if (cityInput) cityInput.value = "";
  if (typeSelect) { typeSelect.value = "all"; typeSelect.dispatchEvent(new Event("change")); }
  if (priceSelect) { priceSelect.value = "all"; priceSelect.dispatchEvent(new Event("change")); }
  if (timeSelect) { timeSelect.value = "upcoming"; timeSelect.dispatchEvent(new Event("change")); }

  if (typeof initCustomDropdowns === "function") initCustomDropdowns();
  MWE.renderEventsList();
};

MWE.updatePageCheckoutPrice = function() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  if (!id) return;

  const evt = MWE.getEvent(id);
  if (!evt) return;

  const qty = Number(document.getElementById("page-reg-quantity").value || 1);
  const priceBox = document.getElementById("page-checkout-price-box");
  const priceLabel = document.getElementById("page-checkout-total-price");

  const priceCents = evt.ticketPriceCents || 0;
  if (priceCents === 0) {
    if (priceBox) priceBox.style.display = "none";
  } else {
    if (priceBox && priceLabel) {
      priceBox.style.display = "flex";
      priceLabel.textContent = `$${((priceCents * qty) / 100).toFixed(2)}`;
    }
  }
};

MWE.handlePageRegistrationSubmit = function(e) {
  e.preventDefault();
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("id");
  if (!eventId) return;

  const evt = MWE.getEvent(eventId);
  if (!evt) return;

  const firstName = (document.getElementById("page-reg-first-name")?.value || "").trim();
  const lastName = (document.getElementById("page-reg-last-name")?.value || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const email = document.getElementById("page-reg-email").value;
  const ticketQuantity = Number(document.getElementById("page-reg-quantity").value || 1);

  if (!firstName || !lastName || !email) return;

  const reg = MWE.registerForEvent({
    eventId,
    fullName,
    email,
    ticketQuantity,
    ticketPriceCents: evt.ticketPriceCents || 0
  });

  const formContainer = document.getElementById("page-reg-form-container");
  const receiptContainer = document.getElementById("page-reg-receipt-container");
  const totalDisplay = (reg.amountPaidCents || 0) === 0 ? "Free" : `$${(reg.amountPaidCents / 100).toFixed(2)}`;

  receiptContainer.innerHTML = `
    <div class="ticket-receipt" style="text-align: center; padding: 12px 0;">
      <i data-lucide="check-circle" style="width: 48px; height: 48px; color: var(--forest); margin-bottom: 12px; display:inline-block;"></i>
      <h4 style="margin-top:0; margin-bottom:4px;">Registration Successful!</h4>
      <p style="font-size:0.85rem; color:var(--muted); margin-bottom:20px;">Present this ticket at the event entrance.</p>
      
      <div class="ticket-stub" style="border: 1px dashed var(--line); border-radius: 12px; background: #fff; padding: 20px; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.02); position: relative; overflow: hidden; margin-bottom: 0; color:var(--ink);">
        <h5 style="margin-top:0; margin-bottom:4px; font-size:1rem; font-weight:800; color:var(--ink);">${MWE.escapeHtml(evt.title)}</h5>
        <div style="font-size:0.78rem; color:var(--muted); margin-bottom:12px;"><i data-lucide="calendar" style="width:12px; height:12px; vertical-align:middle; margin-right:3px; display:inline-block;"></i>${new Date(evt.startsAt).toLocaleDateString()}</div>
        
        <div class="ticket-meta-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem; margin-bottom: 16px; border-bottom: 1px solid var(--line); padding-bottom: 12px;">
          <div><span style="color:var(--muted)">Attendee:</span><br><strong>${MWE.escapeHtml(reg.fullName)}</strong></div>
          <div><span style="color:var(--muted)">Quantity:</span><br><strong>${reg.ticketQuantity} Ticket(s)</strong></div>
          <div><span style="color:var(--muted)">Price paid:</span><br><strong>${totalDisplay}</strong></div>
          <div><span style="color:var(--muted)">Ticket Code:</span><br><strong>${reg.registrationCode}</strong></div>
        </div>

        <div style="text-align: center;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${reg.registrationCode}" alt="Ticket QR Code" style="width: 140px; height: 140px; border: 1px solid var(--line); padding: 4px; border-radius: 6px; margin-bottom: 6px; display:inline-block;" />
          <div style="font-size:0.7rem; color:var(--muted)">Scan code to verify entry</div>
        </div>
      </div>
    </div>
  `;

  if (typeof confetti === 'function') {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  }
  formContainer.style.display = "none";
  receiptContainer.style.display = "block";
  createIcons();
};

MWE.starredSessionsKey = "mwe.event.starred.sessions";
MWE.isSessionStarred = function(title) {
  const starred = JSON.parse(localStorage.getItem(MWE.starredSessionsKey) || "[]");
  return starred.includes(title);
};

MWE.toggleSessionStar = function(event, title) {
  event.stopPropagation();
  let starred = JSON.parse(localStorage.getItem(MWE.starredSessionsKey) || "[]");
  if (starred.includes(title)) {
    starred = starred.filter(t => t !== title);
  } else {
    starred.push(title);
  }
  localStorage.setItem(MWE.starredSessionsKey, JSON.stringify(starred));
  
  MWE.updateItineraryBadge();
  
  const activePill = document.querySelector(".schedule-track-pill.bg-brand-500");
  const currentTrack = activePill ? activePill.getAttribute("data-track") : "all";
  MWE.renderSchedule(currentTrack);
  MWE.renderItineraryDrawer();
};

MWE.updateItineraryBadge = function() {
  const starred = JSON.parse(localStorage.getItem(MWE.starredSessionsKey) || "[]");
  const badge = document.getElementById("itinerary-badge");
  if (badge) {
    if (starred.length > 0) {
      badge.textContent = starred.length;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }
};

MWE.renderItineraryDrawer = function() {
  const container = document.getElementById("itinerary-items-list");
  if (!container) return;

  const starred = JSON.parse(localStorage.getItem(MWE.starredSessionsKey) || "[]");
  if (starred.length === 0) {
    container.innerHTML = `<p class="text-center text-xs text-slate-400 py-6">Your starred sessions will appear here.</p>`;
    return;
  }

  if (!MWE.currentEvent || !MWE.currentEvent.schedule) {
    container.innerHTML = `<p class="text-center text-xs text-slate-400 py-6">No active sessions found.</p>`;
    return;
  }

  const items = MWE.currentEvent.schedule.filter(item => starred.includes(item.title));
  if (items.length === 0) {
    container.innerHTML = `<p class="text-center text-xs text-slate-400 py-6">No starred sessions found.</p>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="p-4 rounded-xl border border-slate-100 bg-slate-50/50 relative">
      <button onclick="MWE.toggleSessionStar(event, '${MWE.escapeHtml(item.title)}')" class="absolute top-3 right-3 text-clay-500 hover:text-rose-500 transition-colors">
        <i class="fa-solid fa-star"></i>
      </button>
      <span class="inline-block px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide bg-brand-50 text-brand-600 mb-2">
        ${item.track.toUpperCase()}
      </span>
      <h4 class="text-xs font-bold text-slate-900 pr-5">${MWE.escapeHtml(item.title)}</h4>
      <div class="flex items-center gap-1.5 text-[10px] text-slate-500 mt-2">
        <i class="fa-regular fa-clock"></i> ${item.time} - ${item.endTime || ''}
      </div>
    </div>
  `).join("");
};

MWE.showSpeakerDetail = function(idx) {
  const speakers = (MWE.currentEvent && MWE.currentEvent.speakers) ? MWE.currentEvent.speakers : [];
  const sp = speakers[idx];
  if (!sp) return;
  const modalBody = `
    <div class="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
      <img src="${sp.image}" alt="${sp.name}" class="w-32 h-32 rounded-2xl object-cover border-4 border-brand-500/20 shadow-md shrink-0" />
      <div>
        <span class="text-[10px] font-bold uppercase tracking-widest text-brand-600">${sp.specialty} Spotlight</span>
        <h3 class="text-2xl font-bold text-slate-900 mt-1">${sp.name}</h3>
        <p class="text-sm font-semibold text-clay-500 mb-4">${sp.role}</p>
        <p class="text-sm text-slate-600 leading-relaxed">${sp.bio}</p>
      </div>
    </div>
  `;
  openSpeakerModal(modalBody);
};

MWE.currentScheduleDay = 1;
MWE.currentScheduleTrack = "all";

MWE.switchScheduleDay = function(day) {
  MWE.currentScheduleDay = day;
  MWE.renderScheduleDays();
  MWE.renderSchedule();
};

MWE.switchScheduleTrack = function(track) {
  MWE.currentScheduleTrack = track;
  MWE.renderScheduleTracks();
  MWE.renderSchedule();
};

MWE.renderScheduleDays = function() {
  const container = document.getElementById("schedule-days-container");
  if (!container || !MWE.currentEvent) return;

  const baseDate = new Date(MWE.currentEvent.startsAt);
  const options = { month: 'short', day: 'numeric', year: 'numeric' };

  const daysData = [1, 2, 3].map(d => {
    const dateObj = new Date(baseDate);
    dateObj.setDate(baseDate.getDate() + (d - 1));
    const dateStr = dateObj.toLocaleDateString(undefined, options);
    return { dayNum: d, dateStr: dateStr };
  });

  container.innerHTML = daysData.map(d => {
    const isActive = MWE.currentScheduleDay === d.dayNum;
    if (isActive) {
      return `
        <button onclick="MWE.switchScheduleDay(${d.dayNum})" class="flex flex-col items-center justify-center px-6 py-2.5 rounded-2xl text-center bg-brand-500 text-white shadow-md transition-all shrink-0">
          <span class="text-xs font-extrabold uppercase tracking-wide">Day 0${d.dayNum}</span>
          <span class="text-[10px] opacity-90 mt-0.5 font-medium">${d.dateStr}</span>
        </button>
      `;
    } else {
      return `
        <button onclick="MWE.switchScheduleDay(${d.dayNum})" class="flex flex-col items-center justify-center px-6 py-2.5 rounded-2xl text-center hover:bg-slate-50 text-slate-800 transition-all shrink-0">
          <span class="text-xs font-extrabold uppercase tracking-wide text-slate-800">Day 0${d.dayNum}</span>
          <span class="text-[10px] text-slate-500 mt-0.5 font-medium">${d.dateStr}</span>
        </button>
      `;
    }
  }).join("");
};

MWE.renderScheduleTracks = function() {
  const container = document.getElementById("schedule-tracks-container");
  if (!container) return;

  const tracks = [
    { id: "all", label: "All" },
    { id: "keynote", label: "Keynote" },
    { id: "panel", label: "Panel" },
    { id: "workshop", label: "Workshop" }
  ];

  container.innerHTML = tracks.map(tr => {
    const isActive = MWE.currentScheduleTrack === tr.id;
    if (isActive) {
      return `
        <button onclick="MWE.switchScheduleTrack('${tr.id}')" class="px-4 py-2 rounded-full text-xs font-extrabold bg-brand-500 text-white shadow-sm transition-all">
          ${tr.label}
        </button>
      `;
    } else {
      return `
        <button onclick="MWE.switchScheduleTrack('${tr.id}')" class="px-4 py-2 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all">
          ${tr.label}
        </button>
      `;
    }
  }).join("");
};

MWE.renderSchedule = function() {
  const timelineEl = document.getElementById("schedule-timeline");
  if (!timelineEl) return;

  const items = (MWE.currentEvent && MWE.currentEvent.schedule) ? MWE.currentEvent.schedule : [];
  const filtered = items.filter(item => {
    const matchDay = item.day === MWE.currentScheduleDay;
    const matchTrack = MWE.currentScheduleTrack === "all" || item.track === MWE.currentScheduleTrack;
    return matchDay && matchTrack;
  });

  timelineEl.innerHTML = filtered.map((item) => {
    const isStarred = MWE.isSessionStarred(item.title);
    const badgeLabel = item.track === 'keynote' ? 'Keynote Focus' : item.track === 'workshop' ? 'Technical Workshop' : 'Panel Session';
    const roomLabel = item.track === 'keynote' ? 'Stage Alpha' : item.track === 'workshop' ? 'Workshop Room B' : 'Panel Room C';
    
    const badgeColorClass = item.track === 'keynote' 
      ? 'bg-clay-100 text-clay-700' 
      : item.track === 'workshop' 
        ? 'bg-brand-100 text-brand-700' 
        : 'bg-slate-100 text-slate-700';

    return `
      <div class="relative pl-12 sm:pl-[180px] pb-8 group schedule-item-row">
        <!-- Desktop Time Block (Left Column) -->
        <div class="hidden sm:block absolute left-0 top-0.5 w-[120px] text-right font-bold transition-colors">
          <span class="block text-slate-800 text-sm">${item.time}</span>
          <span class="block text-slate-400 text-[11px] mt-0.5 font-semibold">${item.endTime || ''}</span>
        </div>
        
        <!-- Timeline Step Circle Indicator on the line -->
        <div class="absolute left-[14px] sm:left-[142px] top-[4px] w-4 h-4 rounded-full border-2 border-brand-500 bg-white z-10 flex items-center justify-center group-hover:scale-125 transition-all">
          <span class="w-1.5 h-1.5 rounded-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-all"></span>
        </div>
        
        <!-- Details Card -->
        <div class="p-6 sm:p-7 rounded-2xl border border-slate-200/70 bg-white shadow-sm hover:shadow-md transition-all relative">
          <div class="flex items-start justify-between gap-4">
            <div>
              <!-- Mobile Time (Only on mobile views) -->
              <div class="sm:hidden text-xs font-bold text-brand-500 mb-2 uppercase flex items-center gap-1.5">
                <i class="fa-regular fa-clock"></i> ${item.time} - ${item.endTime || ''}
              </div>
              
              <span class="inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${badgeColorClass} mb-3">
                ${badgeLabel}
              </span>
              <h4 class="font-extrabold text-slate-900 text-lg leading-snug group-hover:text-brand-500 transition-colors">${item.title}</h4>
              <p class="text-slate-500 text-sm mt-3 leading-relaxed">${item.desc}</p>
            </div>
            
            <button onclick="MWE.toggleSessionStar(event, '${MWE.escapeHtml(item.title)}')" class="p-2.5 rounded-full border border-slate-200 hover:border-brand-200 bg-white hover:bg-brand-50/30 text-slate-400 hover:text-brand-500 transition-colors shrink-0">
              <i class="${isStarred ? 'fa-solid text-clay-500' : 'fa-regular'} fa-star"></i>
            </button>
          </div>
          
          <!-- Presenter and Stage Location Footer -->
          <div class="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100 text-slate-500 text-xs font-semibold">
            <div class="flex items-center gap-1.5">
              <i class="fa-solid fa-microphone text-brand-500"></i> Presenter: ${item.host}
            </div>
            <div class="flex items-center gap-1.5 text-slate-400">
               <i class="fa-solid fa-map-pin"></i> ${roomLabel}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  if (filtered.length === 0) {
    timelineEl.innerHTML = `<p class="text-center text-slate-400 py-8">No sessions found for this day and track filter.</p>`;
  }
};

function initEventProfilePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  if (!id) {
    window.location.href = "events.html";
    return;
  }

  const evt = MWE.getEvent(id);
  if (!evt) {
    window.location.href = "events.html";
    return;
  }

  MWE.currentEvent = evt;

  // Populate Hero
  const titleEl = document.getElementById("event-profile-title");
  if (titleEl) titleEl.textContent = evt.title;

  const church = MWE.getChurches().find(c => c.id === evt.churchId);
  const organizerName = church ? church.name : "Christian Fellowship";
  const orgLead = document.getElementById("event-profile-organizer-lead");
  if (orgLead) orgLead.innerHTML = `Hosted by <a href="church-profile.html?id=${evt.churchId || ''}" class="text-clay-500 dark:text-gold-500 hover:underline">${MWE.escapeHtml(organizerName)}</a>`;

  // Populate dynamic badge details
  const dateObj = new Date(evt.startsAt);
  const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  const displayCity = evt.city || (church ? church.city : "Local");
  const badgeText = `${dateStr} • ${displayCity.toUpperCase()} CONVENTION CENTER & ONLINE`;
  const badgeTextEl = document.getElementById("hero-badge-text");
  if (badgeTextEl) badgeTextEl.textContent = badgeText;

  // Populate Event Cover Image Thumbnail
  const coverImg = document.getElementById("event-profile-cover-img");
  if (coverImg) {
    const src = evt.coverImageUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80";
    coverImg.src = src;
    const blurImg = document.getElementById("event-profile-cover-img-blur");
    if (blurImg) blurImg.src = src;
    const heroBlurBg = document.getElementById("event-profile-hero-blur-bg");
    if (heroBlurBg) heroBlurBg.src = src;
  }

  // Populate Overview Description
  const descEl = document.getElementById("event-profile-description");
  if (descEl) descEl.textContent = evt.description || "No description details provided.";

  // Populate Church Host Details
  const churchAboutEl = document.getElementById("event-profile-church-about");
  if (churchAboutEl && church) {
    churchAboutEl.textContent = church.about || `Join regular worship services and community groups hosted by ${organizerName}. Discover local fellowship groups, Sunday school sessions, and regular Bible study streams.`;
  }

  const churchLink = document.getElementById("event-profile-church-link");
  if (churchLink && evt.churchId) churchLink.href = `church-profile.html?id=${evt.churchId}`;

  // Populate Location Details
  const venueLoc = `${evt.venueName || 'Main Sanctuary'}, ${displayCity}`;
  const locEl = document.getElementById("event-profile-location");
  if (locEl) locEl.textContent = venueLoc;

  // Extract arrays (fallback to defaults if undefined)
  const speakers = evt.speakers || [];
  const schedule = evt.schedule || [];
  const highlights = evt.highlights || [
    { title: "Community Fellowship", desc: "Meet leaders and network over refreshments.", icon: "fa-users", color: "brand" },
    { title: "Live Worship Session", desc: "Contemporary hymns led by worship choirs.", icon: "fa-music", color: "clay" },
    { title: "Family & Kids Activities", desc: "Dedicated playground and Sunday school support.", icon: "fa-child", color: "gold" }
  ];
  const expectations = evt.expectations || [
    { title: "Deep Biblical Sermons", desc: "Join custom seminars exploring scriptures, history context reviews, and dynamic modern application models.", icon: "fa-book-bible", color: "brand" },
    { title: "Worship & Praise Choirs", desc: "Experience powerful contemporary hymns, worship team bands, and inspirational spiritual choir sessions.", icon: "fa-guitar", color: "clay" },
    { title: "Community Outreach", desc: "Participate in charity events, networking forums, and local missionary support plans.", icon: "fa-hands-holding-heart", color: "gold" }
  ];
  const faqs = evt.faqs || [
    { question: "Are tickets refundable or required?", answer: "Most registrations are free and simply help our church hospitality team prepare refreshments and seating. For ticketed events, bookings are refundable up to 7 days prior." },
    { question: "Is child care or Sunday school available?", answer: "Yes! For family-friendly events, children aged 2-12 have access to child supervision programs and child assemblies in Sunday School Room B." },
    { question: "Are snacks and refreshments provided?", answer: "Yes, complimentary beverages (coffee, tea) and snack platters are served during the fellowship intervals at the dining desk." }
  ];

  // Populate Stats
  const statSpeakersEl = document.getElementById("stat-speakers");
  if (statSpeakersEl) statSpeakersEl.textContent = `${speakers.length}+`;

  const statSessionsEl = document.getElementById("stat-sessions");
  if (statSessionsEl) statSessionsEl.textContent = `${schedule.length}+`;

  const statCapacityEl = document.getElementById("stat-capacity");
  if (statCapacityEl) {
    statCapacityEl.textContent = evt.totalTickets ? `${evt.totalTickets}` : "500+";
  }

  // Populate Map Directions
  const dirLink = document.getElementById("event-directions-link");
  if (dirLink) {
    if (evt.directionsUrl) {
      dirLink.href = evt.directionsUrl;
      const row = document.getElementById("event-directions-row");
      if (row) row.style.display = "flex";
    } else {
      const row = document.getElementById("event-directions-row");
      if (row) row.style.display = "none";
    }
  }

  // Handle register / tickets card visibility for past events
  const isPast = new Date(evt.startsAt) < new Date();
  const regPanel = document.getElementById("event-register-panel");
  if (isPast && regPanel) {
    regPanel.innerHTML = `
      <div class="text-center py-6">
        <span class="text-[10px] font-bold uppercase tracking-widest text-clay-500"><i class="fa-solid fa-circle-info"></i> Event Concluded</span>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mt-1">Admission Closed</h3>
        <p class="text-xs text-slate-500 mt-2">This event has already concluded. Keep checking for upcoming evangelism channels!</p>
      </div>
    `;
  }

  // Start live ticking countdown to startsAt
  const targetTime = new Date(evt.startsAt).getTime();
  function updateCountdown() {
    const now = new Date().getTime();
    const difference = targetTime - now;
    if (difference < 0) {
      document.getElementById("cd-days").textContent = "00";
      document.getElementById("cd-hours").textContent = "00";
      document.getElementById("cd-mins").textContent = "00";
      document.getElementById("cd-secs").textContent = "00";
      return;
    }
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    document.getElementById("cd-days").textContent = String(days).padStart(2, '0');
    document.getElementById("cd-hours").textContent = String(hours).padStart(2, '0');
    document.getElementById("cd-mins").textContent = String(minutes).padStart(2, '0');
    document.getElementById("cd-secs").textContent = String(seconds).padStart(2, '0');
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Render Highlights
  const highlightsEl = document.getElementById("event-highlights-list");
  if (highlightsEl) {
    highlightsEl.innerHTML = highlights.map(hl => {
      let iconColorClass = "text-brand-500 bg-brand-500/10";
      if (hl.color === "clay") iconColorClass = "text-clay-500 bg-clay-500/10";
      if (hl.color === "gold") iconColorClass = "text-gold-600 bg-gold-500/10";
      return `
        <div class="flex gap-3.5 items-start">
          <div class="w-7 h-7 rounded-lg ${iconColorClass} flex items-center justify-center shrink-0">
            <i class="fa-solid ${hl.icon} text-xs"></i>
          </div>
          <div>
            <h4 class="text-xs sm:text-sm font-bold text-slate-900">${MWE.escapeHtml(hl.title)}</h4>
            <p class="text-[11px] text-slate-500 mt-0.5">${MWE.escapeHtml(hl.desc)}</p>
          </div>
        </div>
      `;
    }).join("");
  }

  // Render Expectations
  const expectEl = document.getElementById("event-expect-grid");
  if (expectEl) {
    expectEl.innerHTML = expectations.map(exp => {
      let gradientClass = "from-brand-500 to-brand-600";
      if (exp.color === "clay") gradientClass = "from-clay-500 to-clay-600";
      if (exp.color === "gold") gradientClass = "from-gold-500 to-gold-600";
      return `
        <div class="p-8 rounded-2xl border border-slate-200/60 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white text-xl shadow-md mb-6">
            <i class="fa-solid ${exp.icon}"></i>
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">${MWE.escapeHtml(exp.title)}</h3>
          <p class="text-sm text-slate-600 leading-relaxed">${MWE.escapeHtml(exp.desc)}</p>
        </div>
      `;
    }).join("");
  }

  // Render Speakers
  const gridEl = document.getElementById("speakers-grid");
  if (gridEl) {
    const mobileCols = speakers.length === 1 ? 1 : 2;
    const desktopCols = 4;
    gridEl.style.setProperty('--spk-cols-mobile', mobileCols);
    gridEl.style.setProperty('--spk-cols-desktop', desktopCols);
    gridEl.innerHTML = speakers.map((sp, idx) => {
      const sessions = (evt.schedule || []).filter(s => s.host === sp.name).length;
      return `
      <div class="spk-card" onclick="MWE.showSpeakerDetail(${idx})">
        <div class="spk-photo-wrap">
          <img src="${sp.image}" alt="${MWE.escapeHtml(sp.name)}" class="spk-photo" />
        </div>
        <div class="spk-info">
          <h4 class="spk-name">${MWE.escapeHtml(sp.name)}</h4>
          <p class="spk-role">${MWE.escapeHtml(sp.role)}</p>
        </div>
        <div class="spk-footer">
          <div class="spk-stats">
            <span class="spk-stat"><i data-lucide="mic" style="width:13px;height:13px;"></i> ${sessions}</span>
            <span class="spk-stat"><i data-lucide="users" style="width:13px;height:13px;"></i> ${Math.floor(40 + Math.random() * 160)}</span>
          </div>
          <span class="spk-follow-btn">Follow</span>
        </div>
      </div>
    `;
    }).join("");
    createIcons();
  }

  // Render FAQs
  const faqsEl = document.getElementById("event-faq-accordion");
  if (faqsEl) {
    faqsEl.innerHTML = faqs.map(faq => `
      <div class="faq-item rounded-2xl border border-slate-200 bg-white transition-all shadow-sm">
        <button class="w-full px-6 py-5 text-left flex items-center justify-between font-bold text-slate-900" onclick="toggleFaq(this)">
          <span>${MWE.escapeHtml(faq.question)}</span>
          <span class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 ml-4">
            <i class="fa-solid fa-chevron-down text-xs text-slate-500 transition-transform"></i>
          </span>
        </button>
        <div class="faq-answer hidden px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
          ${MWE.escapeHtml(faq.answer)}
        </div>
      </div>
    `).join("");
  }

  MWE.currentScheduleDay = 1;
  MWE.currentScheduleTrack = "all";
  MWE.renderScheduleDays();
  MWE.renderScheduleTracks();
  MWE.renderSchedule();
  MWE.updateItineraryBadge();
  MWE.renderItineraryDrawer();
  MWE.updatePageCheckoutPrice();



  createIcons();
}

// User Avatars Mapping for premium chat bubble styling
const userAvatars = {
  "Ama": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
  "Daniel": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
  "Sarah": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80",
  "John": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80",
  "Kojo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
  "Esther": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80",
  "Paul": "https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&w=100&q=80",
  "Deborah": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
  "David": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=100&q=80",
  "Ruth": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80",
  "Pastor Peter": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&q=80"
};

let chatSimulatorTimer = null;
let chatTypingTimeout = null;
let videoLockTimeout = null;

MWE.openLivePlayer = function(churchId) {
  const shellRoute = { view: "livestream", id: churchId || "", q: "" };
  if (!MWE.isMemberShellEmbed() && !MWE.isMemberAuthenticated()) {
    MWE.openMemberLogin(MWE.buildMemberShellUrl(shellRoute));
    return;
  }
  if (!MWE.isMemberShellEmbed() && MWE.isMemberAuthenticated()) {
    window.location.href = MWE.buildMemberShellUrl(shellRoute);
    return;
  }

  const landing = document.getElementById("streams-landing-view");
  const player = document.getElementById("streams-player-view");
  const iframe = document.getElementById("main-player-iframe");
  const title = document.getElementById("player-stream-title");
  const churchLink = document.getElementById("player-church-link");
  const viewerCount = document.getElementById("player-viewer-count");
  const desc = document.getElementById("player-stream-desc");
  const chatBox = document.getElementById("player-chat-box");
  const typingIndicator = document.getElementById("chat-typing-indicator");

  if (!landing || !player || !iframe) return;

  const church = MWE.getChurches().find(c => c.id === churchId);
  if (!church) return;

  // Set titles & text details
  title.textContent = `${church.name} - Sunday Worship Livestream`;
  churchLink.textContent = church.name;
  churchLink.href = `church-profile.html?id=${church.id}`;
  
  const visitChurchBtn = document.getElementById("visit-church-btn");
  if (visitChurchBtn) visitChurchBtn.href = `church-profile.html?id=${church.id}`;
  
  const viewers = Math.floor(80 + Math.random() * 200);
  viewerCount.textContent = viewers;
  desc.textContent = church.about || "Join us live online as we gather to sing, pray, and listen to the Gospel message.";

  // Set video source
  let embedUrl = church.livestream?.url || "";
  if (!embedUrl || embedUrl === "#" || !embedUrl.includes("embed")) {
    embedUrl = "https://www.youtube.com/embed/jiSyB8QZzk8?autoplay=1&mute=1&loop=1&playlist=jiSyB8QZzk8";
  } else {
    embedUrl = embedUrl.includes("?") ? `${embedUrl}&autoplay=1` : `${embedUrl}?autoplay=1`;
  }
  
  const lockOverlay = document.getElementById("video-lock-overlay");
  if (lockOverlay) lockOverlay.classList.add("hidden");

  const isLoggedIn = localStorage.getItem("mwe.userLoggedIn") === "true";
  if (isLoggedIn) {
    iframe.src = embedUrl;
  } else {
    iframe.src = embedUrl;
    
    // Set 10-second inactive lock timer
    if (videoLockTimeout) clearTimeout(videoLockTimeout);
    videoLockTimeout = setTimeout(() => {
      if (localStorage.getItem("mwe.userLoggedIn") !== "true") {
        if (lockOverlay) lockOverlay.classList.remove("hidden");
        if (typeof window.openLoginModal === "function") {
          window.openLoginModal();
        }
      }
    }, 10000);
  }

  // Render view layout toggles
  landing.style.display = "none";
  player.style.display = "block";

  // Hide typing indicator initially
  if (typingIndicator) typingIndicator.classList.add("hidden");

  // Reset simulated Chat Room
  chatBox.innerHTML = `
    <div class="stream-chat-welcome">
      Welcome to ${church.name}'s Chat Room. Please keep communications respectful and aligned with Christian fellowship.
    </div>
    
    <div class="stream-chat-msg-row incoming" style="margin-top: 10px;">
      <div class="stream-chat-msg-col">
        <span class="stream-chat-sender" style="margin-left: 42px;">Pastor Peter (Host)</span>
        <div style="display: flex; gap: 10px; align-items: flex-end;">
          <img class="stream-chat-avatar" src="${userAvatars["Pastor Peter"]}" alt="Pastor Peter" />
          <div class="stream-chat-bubble">Welcome to today's broadcast! Let us know where you are tuning in from. 🙏</div>
        </div>
      </div>
    </div>
  `;

  // Start chat simulation
  const chatUsers = ["Ama", "Daniel", "Sarah", "John", "Kojo", "Esther", "Paul", "Deborah", "David", "Ruth"];
  const chatMsgs = [
    "Amen! Powerful worship today.",
    "Greetings from Calgary!",
    "Please pray for my mother's health.",
    "Listening from Edmonton. The stream looks great!",
    "So blessed by this word.",
    "Glory to God!",
    "Hello everyone, watching from Toronto.",
    "Singing along with the choir here.",
    "Blessed Sunday to the church family!",
    "What a great message on evangelism."
  ];

  if (chatSimulatorTimer) clearInterval(chatSimulatorTimer);
  if (chatTypingTimeout) clearTimeout(chatTypingTimeout);

  chatSimulatorTimer = setInterval(() => {
    const user = chatUsers[Math.floor(Math.random() * chatUsers.length)];
    const msg = chatMsgs[Math.floor(Math.random() * chatMsgs.length)];
    const avatar = userAvatars[user] || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80";

    // Trigger typing state
    if (typingIndicator) {
      typingIndicator.querySelector(".typing-text").textContent = `${user} is typing...`;
      typingIndicator.classList.remove("hidden");
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Set delay for message bubble creation to mock active typing duration
    chatTypingTimeout = setTimeout(() => {
      if (typingIndicator) typingIndicator.classList.add("hidden");

      const msgEl = document.createElement("div");
      msgEl.className = "stream-chat-msg-row incoming";
      msgEl.innerHTML = `
        <div class="stream-chat-msg-col">
          <span class="stream-chat-sender" style="margin-left: 42px;">${MWE.escapeHtml(user)}</span>
          <div style="display: flex; gap: 10px; align-items: flex-end;">
            <img class="stream-chat-avatar" src="${avatar}" alt="${MWE.escapeHtml(user)}" />
            <div class="stream-chat-bubble">${MWE.escapeHtml(msg)}</div>
          </div>
        </div>
      `;
      chatBox.appendChild(msgEl);
      chatBox.scrollTop = chatBox.scrollHeight;
    }, 1800);

  }, 5000);

  createIcons();
};

MWE.closeLivePlayer = function() {
  if (chatSimulatorTimer) {
    clearInterval(chatSimulatorTimer);
    chatSimulatorTimer = null;
  }
  if (chatTypingTimeout) {
    clearTimeout(chatTypingTimeout);
    chatTypingTimeout = null;
  }
  if (videoLockTimeout) {
    clearTimeout(videoLockTimeout);
    videoLockTimeout = null;
  }
  const body = document.body;
  if (body.classList.contains("lights-out")) {
    body.classList.remove("lights-out");
  }
  const landing = document.getElementById("streams-landing-view");
  const player = document.getElementById("streams-player-view");
  const iframe = document.getElementById("main-player-iframe");

  if (landing) landing.style.display = "block";
  if (player) player.style.display = "none";
  if (iframe) iframe.src = "about:blank";
};

MWE.submitLiveStreamChat = function(e) {
  e.preventDefault();
  const input = document.getElementById("player-chat-input");
  const chatBox = document.getElementById("player-chat-box");
  if (!input || !chatBox || !input.value.trim()) return;

  const text = input.value.trim();

  const username = localStorage.getItem("mwe.username") || "You";
  const msgEl = document.createElement("div");
  msgEl.className = "stream-chat-msg-row outgoing";
  msgEl.innerHTML = `
    <div class="stream-chat-msg-col">
      <span class="stream-chat-sender">${MWE.escapeHtml(username)}</span>
      <div class="stream-chat-bubble">${MWE.escapeHtml(text)}</div>
    </div>
  `;
  chatBox.appendChild(msgEl);
  chatBox.scrollTop = chatBox.scrollHeight;

  input.value = "";
};

MWE.toggleLights = function() {
  const body = document.body;
  const btn = document.getElementById("lights-toggle-btn");
  if (!btn) return;

  const isDark = body.classList.toggle("lights-out");
  
  if (isDark) {
    btn.innerHTML = `<i data-lucide="sun"></i> Turn On Lights`;
    showToast("Lights turned off.");
  } else {
    btn.innerHTML = `<i data-lucide="moon"></i> Turn Off Lights`;
    showToast("Lights turned on.");
  }

  createIcons();
};

function initStreamsPage() {
  const streamsList = document.getElementById("active-streams-list");
  const emptyState = document.getElementById("streams-empty-state");
  if (!streamsList) return;

  // Filter churches that have livestreaming enabled
  const liveChurches = MWE.getChurches().filter(c => c.livestream?.enabled === true || c.livestream?.enabled === "true");

  if (liveChurches.length === 0) {
    streamsList.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  streamsList.style.display = "grid";
  if (emptyState) emptyState.style.display = "none";

  streamsList.innerHTML = liveChurches.map(c => {
    const viewers = Math.floor(60 + Math.random() * 150);
    const photo = c.photo || c.coverImage || MWE.defaultImage;
    const isLive = c.livestream?.enabled === true || c.livestream?.enabled === "true";

    return `
      <a href="livestream.html?id=${c.id}" class="livestream-card-16-9 ${isLive ? 'is-live' : ''}" style="background-image: url('${MWE.escapeHtml(photo)}');">
        <div class="livestream-card-overlay"></div>
        
        <div class="livestream-card-top">
          ${isLive ? `
            <span class="livestream-live-badge">
              <span class="live-pulse-dot"></span> LIVE
            </span>
          ` : '<span></span>'}

          <div class="livestream-play-btn" title="Watch Livestream">
            <i data-lucide="play" style="width: 18px; height: 18px; fill: #ffffff; margin-left: 2px;"></i>
          </div>
        </div>

        <div class="livestream-card-bottom">
          <h4 class="livestream-card-title">${MWE.escapeHtml(c.name)}</h4>
          <p class="livestream-card-desc">${MWE.escapeHtml(c.tagline || 'Livestream Sunday Worship Service')}</p>
          <div class="livestream-viewers-tag">
            <i data-lucide="users" style="width: 12px; height: 12px;"></i> ${viewers} watching • ${MWE.escapeHtml(c.city)}
          </div>
        </div>
      </a>
    `;
  }).join("");

  createIcons();
}

function initEventsPage() {
  const cityInput = document.getElementById("event-city-input");
  if (!cityInput) return;

  const typeSelect = document.getElementById("event-type-select");
  const priceSelect = document.getElementById("event-price-select");
  const timeSelect = document.getElementById("event-time-select");

  cityInput.addEventListener("input", MWE.renderEventsList);
  if (typeSelect) typeSelect.addEventListener("change", MWE.renderEventsList);
  if (priceSelect) priceSelect.addEventListener("change", MWE.renderEventsList);
  if (timeSelect) timeSelect.addEventListener("change", MWE.renderEventsList);

  initStandardPublicSearchBars();
  initCustomDropdowns();
  initModuleDirectoryToolbars();

  // Initial render
  MWE.renderEventsList();
}

// ==========================================
// EXPANDED PLATFORM MODULES & MODAL HANDLERS
// ==========================================

MWE.foundationProjects = [
  {
    id: "proj-spring-orphanage-2026",
    title: "Spring Orphanage Supply & Food Drive",
    summary: "Delivering bulk food packs, infant formula, blankets, and hygiene kits to 280 children across 3 regional centers.",
    category: "Orphanage & Children",
    targetAmountCents: 1500000,
    raisedAmountCents: 1245000,
    location: "Edmonton & Surrounding Area",
    coverImageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "proj-school-backpacks-2026",
    title: "Back-to-School Backpack & Laptop Drive",
    summary: "Equipping 450 underprivileged students with backpacks, stationery, textbooks, and refurbished study laptops.",
    category: "Education Support",
    targetAmountCents: 2000000,
    raisedAmountCents: 1820000,
    location: "Calgary & Western Canada",
    coverImageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "proj-pediatric-medical-2026",
    title: "Vulnerable Children Medical & Dental Aid",
    summary: "Sponsoring emergency prescriptions, pediatric checkups, and vision care for low-income single-parent families.",
    category: "Medical Assistance",
    targetAmountCents: 1000000,
    raisedAmountCents: 940000,
    location: "Greater Vancouver & Alberta",
    coverImageUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80"
  }
];

MWE.openRideModal = function(preferredService = "Sunday 10:00 AM Service", targetChurchId = "") {
  const churches = MWE.getChurches();
  let selectedChurchId = targetChurchId;
  if (!selectedChurchId && typeof getRouteChurch === "function") {
    const rc = getRouteChurch();
    if (rc) selectedChurchId = rc.id;
  }
  if (!selectedChurchId) selectedChurchId = churches[0]?.id || "";

  const backdrop = document.createElement("div");
  backdrop.className = "alert-modal-backdrop open";
  backdrop.id = "ride-modal-backdrop";
  backdrop.innerHTML = `
    <div class="dash-panel dash-panel-pad" style="max-width: 540px; width: 90%; margin: 20px auto;">
      <div class="category-head flex-between">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="category-icon"><i data-lucide="car"></i></span>
          <div><h3>Request Transportation to Church</h3><p class="text-xs text-muted">Free Sunday pickup & ride coordination by local church teams.</p></div>
        </div>
        <button type="button" class="button ghost small" onclick="document.getElementById('ride-modal-backdrop').remove()"><i data-lucide="x"></i></button>
      </div>
      <form onsubmit="MWE.handleRideSubmit(event)" class="mt-4">
        <label class="form-field mb-2"><span>Select Local Church *</span>
          <select name="churchId" class="field" required>
            ${churches.map(c => `<option value="${c.id}" ${c.id === selectedChurchId ? 'selected' : ''}>${MWE.escapeHtml(c.name)} (${MWE.escapeHtml(c.city)})</option>`).join("")}
          </select>
        </label>
        <div class="compact-grid">
          <label class="form-field"><span>Full Name *</span><input required name="fullName" placeholder="John Smith" /></label>
          <label class="form-field"><span>Phone Number *</span><input required type="tel" name="phone" placeholder="(780) 555-0199" /></label>
        </div>
        <div class="compact-grid mt-2">
          <label class="form-field"><span>Email Address *</span><input required type="email" name="email" placeholder="john@example.com" /></label>
          <label class="form-field"><span>Age Group</span>
            <select name="ageGroup" class="field">
              <option value="Adult">Adult (18+)</option>
              <option value="Youth">Youth / Student (13-17)</option>
              <option value="Family">Family with Children</option>
              <option value="Senior">Senior (65+)</option>
            </select>
          </label>
        </div>
        <div class="compact-grid mt-2">
          <label class="form-field"><span>Passengers Count</span><input type="number" min="1" max="10" name="passengers" value="1" class="field" /></label>
          <label class="form-field"><span>Preferred Gathering</span><input name="preferredService" value="${MWE.escapeHtml(preferredService)}" class="field" /></label>
        </div>
        <label class="form-field mt-2"><span>Pickup Address / Landmark *</span><input required name="pickupAddress" placeholder="123 Main St, Apartment 4B" class="field" /></label>
        <label class="form-field mt-2"><span>Accessibility or Special Needs</span><input name="accessibility" placeholder="e.g. Wheelchair ramp needed, booster seat" class="field" /></label>
        <div class="form-group toggle-group mt-3">
          <label class="toggle-label-wrapper">
            <span class="toggle-label-text text-xs">I grant permission for the local church transportation team to contact me via phone, text, or WhatsApp.</span>
            <div class="toggle-switch">
              <input type="checkbox" checked name="consent" value="true" />
              <span class="toggle-slider"></span>
            </div>
          </label>
        </div>
        <div class="editor-actions mt-4">
          <button type="button" class="button ghost" onclick="document.getElementById('ride-modal-backdrop').remove()">Cancel</button>
          <button type="submit" class="button primary"><i data-lucide="send"></i> Submit Ride Request</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);
  createIcons();
};

MWE.handleRideSubmit = function(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  const churches = MWE.getChurches();
  const targetChurch = churches.find(c => c.id === data.churchId) || churches[0];
  
  const rides = JSON.parse(localStorage.getItem("mwe.ride_requests") || "[]");
  rides.push({
    id: "ride-" + Date.now(),
    churchId: targetChurch.id,
    churchName: targetChurch.name,
    fullName: data.fullName,
    phone: data.phone,
    email: data.email,
    passengers: data.passengers || 1,
    preferredService: data.preferredService,
    pickupAddress: data.pickupAddress,
    status: "new",
    stage: 1, // Stage 1: Welcome contact
    driver: "Unassigned",
    createdAt: new Date().toISOString()
  });
  localStorage.setItem("mwe.ride_requests", JSON.stringify(rides));
  
  const backdrop = document.getElementById("ride-modal-backdrop");
  if (backdrop) backdrop.remove();
  
  showToast(`Your ride request for ${targetChurch.name} has been submitted! Their local transportation team will contact you.`);
};

MWE.advanceRideStage = function(id) {
  let rides = JSON.parse(localStorage.getItem("mwe.ride_requests") || "[]");
  rides = rides.map(r => {
    if (r.id === id) {
      const nextStage = r.stage >= 3 ? 3 : (r.stage || 1) + 1;
      return { ...r, stage: nextStage };
    }
    return r;
  });
  localStorage.setItem("mwe.ride_requests", JSON.stringify(rides));
  showToast("Advanced ride request to next follow-up stage!");
  if (typeof initChurchPortal === "function") {
    const select = document.querySelector("[data-portal-select]");
    if (select) select.dispatchEvent(new Event("change"));
  }
};

MWE.assignDriver = function(id) {
  const driverName = prompt("Enter assigned driver name (e.g., Deacon Mark - Van #1):", "Deacon Mark (Van #1)");
  if (!driverName) return;

  let rides = JSON.parse(localStorage.getItem("mwe.ride_requests") || "[]");
  rides = rides.map(r => r.id === id ? { ...r, driver: driverName, stage: 3 } : r);
  localStorage.setItem("mwe.ride_requests", JSON.stringify(rides));
  showToast(`Assigned ${driverName} to pickup!`);
  if (typeof initChurchPortal === "function") {
    const select = document.querySelector("[data-portal-select]");
    if (select) select.dispatchEvent(new Event("change"));
  }
};

MWE.openPrayerModal = function(targetChurchId = "") {
  const churches = MWE.getChurches();
  let selectedChurchId = targetChurchId;
  if (!selectedChurchId && typeof getRouteChurch === "function") {
    const rc = getRouteChurch();
    if (rc) selectedChurchId = rc.id;
  }
  if (!selectedChurchId) selectedChurchId = churches[0]?.id || "";

  const backdrop = document.createElement("div");
  backdrop.className = "alert-modal-backdrop open";
  backdrop.id = "prayer-modal-backdrop";
  backdrop.innerHTML = `
    <div class="dash-panel dash-panel-pad" style="max-width: 540px; width: 90%; margin: 20px auto;">
      <div class="category-head flex-between">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="category-icon"><i data-lucide="heart-handshake"></i></span>
          <div><h3>Submit a Prayer Request</h3><p class="text-xs text-muted">Standing together with your local church prayer team in faith.</p></div>
        </div>
        <button type="button" class="button ghost small" onclick="document.getElementById('prayer-modal-backdrop').remove()"><i data-lucide="x"></i></button>
      </div>
      <form onsubmit="MWE.handlePrayerSubmit(event)" class="mt-4">
        <label class="form-field mb-2"><span>Select Local Church Prayer Team *</span>
          <select name="churchId" class="field" required>
            ${churches.map(c => `<option value="${c.id}" ${c.id === selectedChurchId ? 'selected' : ''}>${MWE.escapeHtml(c.name)} (${MWE.escapeHtml(c.city)})</option>`).join("")}
          </select>
        </label>
        <label class="form-field"><span>Your Prayer Need / Request *</span><textarea required name="requestText" rows="4" placeholder="Describe your prayer need..."></textarea></label>
        <div class="compact-grid mt-2">
          <label class="form-field"><span>Full Name</span><input name="fullName" placeholder="Optional if anonymous" /></label>
          <label class="form-field"><span>Phone / Email</span><input name="contact" placeholder="Optional contact info" /></label>
        </div>
        <div class="compact-grid mt-3">
          <label class="form-field"><span>Confidentiality</span>
            <select name="confidential" class="field">
              <option value="team">Available to Church Prayer Team</option>
              <option value="private">Private & Confidential (Pastors Only)</option>
            </select>
          </label>
          <label class="form-field"><span>Urgency</span>
            <select name="urgency" class="field">
              <option value="normal">Normal Prayer Need</option>
              <option value="urgent">Urgent / Emergency Prayer</option>
            </select>
          </label>
        </div>
        <div class="editor-actions mt-4">
          <button type="button" class="button ghost" onclick="document.getElementById('prayer-modal-backdrop').remove()">Cancel</button>
          <button type="submit" class="button primary"><i data-lucide="send"></i> Submit Prayer Request</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);
  createIcons();
};

MWE.handlePrayerSubmit = function(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  const churches = MWE.getChurches();
  const targetChurch = churches.find(c => c.id === data.churchId) || churches[0];

  const prayers = JSON.parse(localStorage.getItem("mwe.prayer_requests") || "[]");
  prayers.push({
    id: "prayer-" + Date.now(),
    churchId: targetChurch.id,
    churchName: targetChurch.name,
    requestText: data.requestText,
    fullName: data.fullName || "Anonymous",
    contact: data.contact || "",
    confidential: data.confidential,
    urgency: data.urgency,
    status: "new",
    createdAt: new Date().toISOString()
  });
  localStorage.setItem("mwe.prayer_requests", JSON.stringify(prayers));

  const backdrop = document.getElementById("prayer-modal-backdrop");
  if (backdrop) backdrop.remove();

  showToast(`Your prayer request has been submitted to ${targetChurch.name}! Their prayer team is joining you in faith.`);
};

MWE.openSalvationModal = function(targetChurchId = "") {
  const churches = MWE.getChurches();
  let selectedChurchId = targetChurchId;
  if (!selectedChurchId && typeof getRouteChurch === "function") {
    const rc = getRouteChurch();
    if (rc) selectedChurchId = rc.id;
  }
  if (!selectedChurchId) selectedChurchId = churches[0]?.id || "";

  const backdrop = document.createElement("div");
  backdrop.className = "alert-modal-backdrop open";
  backdrop.id = "salvation-modal-backdrop";
  backdrop.innerHTML = `
    <div class="dash-panel dash-panel-pad" style="max-width: 540px; width: 90%; margin: 20px auto;">
      <div class="category-head flex-between">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="category-icon"><i data-lucide="cross"></i></span>
          <div><h3>I Have Received Jesus Christ</h3><p class="text-xs text-muted">Praise God! Connect with a local church family for discipleship.</p></div>
        </div>
        <button type="button" class="button ghost small" onclick="document.getElementById('salvation-modal-backdrop').remove()"><i data-lucide="x"></i></button>
      </div>
      <form onsubmit="MWE.handleSalvationSubmit(event)" class="mt-4">
        <label class="form-field mb-2"><span>Select Local Church for Discipleship & Bible Delivery *</span>
          <select name="churchId" class="field" required>
            ${churches.map(c => `<option value="${c.id}" ${c.id === selectedChurchId ? 'selected' : ''}>${MWE.escapeHtml(c.name)} (${MWE.escapeHtml(c.city)})</option>`).join("")}
          </select>
        </label>
        <div class="compact-grid">
          <label class="form-field"><span>Full Name *</span><input required name="fullName" placeholder="David Miller" /></label>
          <label class="form-field"><span>Phone Number *</span><input required type="tel" name="phone" placeholder="(780) 555-0811" /></label>
        </div>
        <label class="form-field mt-2"><span>Email Address *</span><input required type="email" name="email" placeholder="david@example.com" /></label>
        <label class="form-field mt-2"><span>Mailing Address (For Free Bible Delivery)</span><input name="address" placeholder="123 Main St, City, Postal Code" class="field" /></label>
        
        <div class="mt-3 flex flex-col gap-2">
          <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input type="checkbox" name="needBible" value="true" checked class="rounded text-amber-600 focus:ring-amber-500" />
            <span>Please send me a free physical Holy Bible</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input type="checkbox" name="needPrayer" value="true" checked class="rounded text-amber-600 focus:ring-amber-500" />
            <span>I would like a pastor to call me for prayer & guidance</span>
          </label>
        </div>

        <div class="editor-actions mt-4">
          <button type="button" class="button ghost" onclick="document.getElementById('salvation-modal-backdrop').remove()">Cancel</button>
          <button type="submit" class="button primary"><i data-lucide="heart"></i> Confirm Decision & Connect</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);
  createIcons();
};

MWE.handleSalvationSubmit = function(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  const churches = MWE.getChurches();
  const targetChurch = churches.find(c => c.id === data.churchId) || churches[0];

  const salvations = JSON.parse(localStorage.getItem("mwe.salvation_decisions") || "[]");
  salvations.push({
    id: "salv-" + Date.now(),
    churchId: targetChurch.id,
    churchName: targetChurch.name,
    fullName: data.fullName,
    phone: data.phone,
    email: data.email,
    address: data.address || "",
    needBible: Boolean(data.needBible),
    needPrayer: Boolean(data.needPrayer),
    status: "New Decision",
    assignedTo: "Unassigned",
    createdAt: new Date().toISOString()
  });
  localStorage.setItem("mwe.salvation_decisions", JSON.stringify(salvations));

  const backdrop = document.getElementById("salvation-modal-backdrop");
  if (backdrop) backdrop.remove();

  showToast(`Praise God! Your decision has been routed to ${targetChurch.name} for follow-up.`);
};

MWE.handleSalvationSubmit = function(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));

  const salvations = JSON.parse(localStorage.getItem("mwe.salvation_decisions") || "[]");
  salvations.push({
    id: "salv-" + Date.now(),
    fullName: data.fullName,
    phone: data.phone,
    email: data.email,
    cityCountry: data.cityCountry,
    needBible: Boolean(data.needBible),
    needPrayer: Boolean(data.needPrayer),
    wantJoinChurch: Boolean(data.wantJoinChurch),
    needTransportation: Boolean(data.needTransportation),
    createdAt: new Date().toISOString()
  });
  localStorage.setItem("mwe.salvation_decisions", JSON.stringify(salvations));

  const backdrop = document.getElementById("salvation-modal-backdrop");
  if (backdrop) backdrop.remove();

  showToast("Praise God for your decision! An evangelism leader will contact you with your free Bible.");
};

MWE.openFoundationAppModal = function() {
  const backdrop = document.createElement("div");
  backdrop.className = "alert-modal-backdrop open";
  backdrop.id = "foundation-modal-backdrop";
  backdrop.innerHTML = `
    <div class="dash-panel dash-panel-pad" style="max-width: 580px; width: 90%; margin: 20px auto;">
      <div class="category-head flex-between">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="category-icon"><i data-lucide="building-2"></i></span>
          <div><h3>Apply for Organization Assistance</h3><p class="text-xs text-muted">For orphanages & community shelters.</p></div>
        </div>
        <button type="button" class="button ghost small" onclick="document.getElementById('foundation-modal-backdrop').remove()"><i data-lucide="x"></i></button>
      </div>
      <form onsubmit="MWE.handleFoundationAppSubmit(event)" class="mt-4">
        <div class="compact-grid">
          <label class="form-field"><span>Organization / Orphanage Name *</span><input required name="orgName" placeholder="Hope Orphanage Center" /></label>
          <label class="form-field"><span>Registration No.</span><input name="regNumber" placeholder="Reg # 12345-NGO" /></label>
        </div>
        <div class="compact-grid mt-2">
          <label class="form-field"><span>Contact Person *</span><input required name="contactName" placeholder="Jane Director" /></label>
          <label class="form-field"><span>Phone Number *</span><input required type="tel" name="phone" placeholder="(780) 555-0188" /></label>
        </div>
        <div class="compact-grid mt-2">
          <label class="form-field"><span>Email Address *</span><input required type="email" name="email" placeholder="contact@hopecenter.org" /></label>
          <label class="form-field"><span>Physical Location *</span><input required name="location" placeholder="City & Address" /></label>
        </div>
        <div class="compact-grid mt-2">
          <label class="form-field"><span>Children / Beneficiaries Count *</span><input required type="number" name="childrenCount" placeholder="e.g. 75" class="field" /></label>
          <label class="form-field"><span>Primary Need Category *</span>
            <select name="assistanceType" class="field">
              <option value="Food & Water">Food & Clean Water Supplies</option>
              <option value="Clothing & Hygiene">Clothing, Shoes & Hygiene Kits</option>
              <option value="School Supplies">School Supplies & Books</option>
              <option value="Medical Assistance">Medical Care & Pediatric First Aid</option>
              <option value="Shelter Repair">Shelter Repair & Facility Aid</option>
            </select>
          </label>
        </div>
        <label class="form-field mt-2"><span>Estimated Cost / Urgent Details ($)</span><input name="estimatedCost" placeholder="e.g. $4,500 for winter food packs" class="field" /></label>
        <div class="editor-actions mt-4">
          <button type="button" class="button ghost" onclick="document.getElementById('foundation-modal-backdrop').remove()">Cancel</button>
          <button type="submit" class="button primary"><i data-lucide="send"></i> Submit Assistance Application</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);
  createIcons();
};

MWE.handleFoundationAppSubmit = function(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));

  const apps = JSON.parse(localStorage.getItem("mwe.foundation_apps") || "[]");
  apps.push({
    id: "fapp-" + Date.now(),
    orgName: data.orgName,
    contactName: data.contactName,
    phone: data.phone,
    email: data.email,
    location: data.location,
    childrenCount: data.childrenCount,
    assistanceType: data.assistanceType,
    estimatedCost: data.estimatedCost,
    status: "pending",
    createdAt: new Date().toISOString()
  });
  localStorage.setItem("mwe.foundation_apps", JSON.stringify(apps));

  const backdrop = document.getElementById("foundation-modal-backdrop");
  if (backdrop) backdrop.remove();

  showToast("Application submitted successfully! Our super-admin team will review your organization details.");
};

MWE.openYouthModal = function() {
  MWE.openRideModal("Youth Friday Gathering");
};

MWE.setGivingFreq = function(btn, freq) {
  const container = btn.closest(".giving-freq-selector") || btn.closest(".master-freq-switcher");
  if (!container) return;
  container.querySelectorAll(".freq-btn, .master-freq-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
};

MWE.setDonateAmount = function(amt, btn) {
  const input = document.getElementById("custom-donate-amount") || document.getElementById("donate-custom-amount");
  if (input) input.value = amt;
  const pills = btn.closest(".amount-pills-grid") || btn.closest(".master-amount-grid");
  if (pills) {
    pills.querySelectorAll(".amount-pill, .master-amount-pill").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
  }
  const submitBtn = btn.closest("form") ? btn.closest("form").querySelector("button[type='submit']") : null;
  if (submitBtn) {
    submitBtn.innerHTML = `<i data-lucide="heart" style="width: 20px; height: 20px;"></i> Complete $${amt} Contribution`;
    createIcons();
  }
};

MWE.onCustomAmountInput = function(input) {
  const val = input.value ? parseInt(input.value, 10) : 0;
  const pills = input.closest(".form-group-block") ? input.closest(".form-group-block").querySelectorAll(".amount-pill, .master-amount-pill") : document.querySelectorAll(".amount-pill, .master-amount-pill");
  
  pills.forEach(p => {
    const pillAmt = parseInt(p.textContent.replace("$", "").trim(), 10);
    p.classList.toggle("active", pillAmt === val);
  });

  const displayVal = input.value || 50;
  const submitBtn = input.closest("form") ? input.closest("form").querySelector("button[type='submit']") : null;
  if (submitBtn) {
    submitBtn.innerHTML = `<i data-lucide="heart" style="width: 20px; height: 20px;"></i> Complete $${displayVal} Contribution`;
    createIcons();
  }
};

MWE.setPayMethod = function(elem) {
  const container = elem.closest(".payment-method-selector") || elem.closest(".master-pay-method-grid");
  if (!container) return;
  container.querySelectorAll(".pay-method-radio, .master-pay-radio").forEach(el => el.classList.remove("active"));
  const label = elem.closest(".pay-method-radio, .master-pay-radio");
  if (label) label.classList.add("active");
};

MWE.handleDonationSubmit = function(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  const customInput = document.getElementById("custom-donate-amount") || document.getElementById("donate-custom-amount");
  const activePill = form.querySelector(".amount-pill.active, .master-amount-pill.active");
  
  let amount = 50;
  if (customInput && customInput.value) {
    amount = customInput.value;
  } else if (activePill) {
    amount = activePill.textContent.replace("$", "").trim();
  }
  
  const donorName = data.donorName || "Generous Partner";
  const regCode = "REC-DON-" + Math.floor(100000 + Math.random() * 900000);

  const backdrop = document.createElement("div");
  backdrop.className = "alert-modal-backdrop open";
  backdrop.innerHTML = `
    <div class="dash-panel dash-panel-pad text-center" style="max-width: 500px; width: 90%; margin: 20px auto; border-radius: 24px; padding: 36px;">
      <div class="success-check-circle mx-auto" style="width: 60px; height: 60px; border-radius: 50%; background: rgba(176, 129, 26, 0.12); color: #b0811a; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px;"><i data-lucide="check-circle-2" style="width: 32px; height: 32px;"></i></div>
      <h3 style="font-size: 1.5rem; font-weight: 900; color: #0f172a; margin-bottom: 8px;">Thank You, ${MWE.escapeHtml(donorName)}!</h3>
      <p style="font-size: 0.95rem; color: #475569; margin-bottom: 20px;">Your contribution of <strong style="color: #b0811a;">$${amount}.00 USD</strong> has been received and allocated to the <strong>My Way of Evangelism Platform Fund</strong>.</p>
      
      <div style="background: #f8fafc; border: 1.5px dashed rgba(176, 129, 26, 0.4); border-radius: 16px; padding: 16px; margin-bottom: 20px;">
        <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 4px;">Confirmation Receipt</span>
        <strong style="font-size: 1.3rem; font-weight: 900; color: #0f172a; letter-spacing: 0.04em;">${regCode}</strong>
      </div>
      <p style="font-size: 0.82rem; color: #94a3b8; line-height: 1.5;">An official tax deductible receipt has been logged. Thank you for empowering local evangelism technology and bi-monthly orphanage relief.</p>
      <div style="margin-top: 24px;">
        <button type="button" class="button primary lg" style="width: 100%; height: 48px; border-radius: 14px; background: #b0811a; border-color: #b0811a; font-weight: 800;" onclick="this.closest('.alert-modal-backdrop').remove()">Close & Return</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  createIcons();
};

MWE.downloadCalendarICS = function(title, timeStr, location) {
  const currentChurch = MWE.activeChurchProfile || {};
  const churchName = currentChurch.name || "My Way of Evangelism Church";
  const finalLocation = location || currentChurch.location || "Church Sanctuary";
  const cleanTitle = `${title} - ${churchName}`;
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-event.ics`;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate() + 1).padStart(2, '0');

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//My Way of Evangelism//Gathering Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `SUMMARY:${cleanTitle}`,
    `DESCRIPTION:Join us for ${cleanTitle}. Service time: ${timeStr}. Location: ${finalLocation}.`,
    `LOCATION:${finalLocation}`,
    `DTSTART:${year}${month}${day}T100000Z`,
    `DTEND:${year}${month}${day}T113000Z`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR"
  ];

  const icsData = icsLines.join("\r\n");
  const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8;" });
  
  if (window.navigator && window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 150);
  }

  showToast(`📅 Calendar event (.ics) downloaded for ${title}!`);
};

MWE.toggleDirectoryMapView = function() {
  const container = document.getElementById("directory-map-container");
  if (container) {
    container.classList.toggle("hidden");
  }
};

MWE.submitVerificationDocs = function() {
  showToast("Church verification documents submitted to owner dashboard for approval!");
};

function renderFoundationPage() {
  const grid = document.querySelector("[data-foundation-projects-grid]");
  if (!grid) return;

  grid.innerHTML = MWE.foundationProjects.map(p => `
    <article class="church-card foundation-card">
      <div class="church-photo" style="background-image: url('${p.coverImageUrl}'); height: 180px;">
        <span class="badge"><i data-lucide="heart"></i> ${MWE.escapeHtml(p.category)}</span>
      </div>
      <div class="church-card-body">
        <h3 style="font-size:1.15rem; font-weight:800; color:var(--ink); margin-bottom:6px;">${MWE.escapeHtml(p.title)}</h3>
        <p class="meta" style="margin-bottom:12px;">${MWE.escapeHtml(p.summary)}</p>
        
        <div class="mini-chart my-3">
          <div class="flex-between text-xs font-bold" style="margin-bottom:4px;">
            <span>Raised: $${(p.raisedAmountCents / 100).toLocaleString()}</span>
            <span>Target: $${(p.targetAmountCents / 100).toLocaleString()}</span>
          </div>
          <div class="bar"><span style="width:${Math.min(100, Math.round((p.raisedAmountCents / p.targetAmountCents) * 100))}%"></span></div>
        </div>

        <div class="tag-row" style="margin-top: auto;">
          <span class="tag"><i data-lucide="map-pin"></i> ${MWE.escapeHtml(p.location)}</span>
        </div>

        <div class="card-actions" style="margin-top:14px;">
          <a href="donate.html" class="button primary small"><i data-lucide="heart"></i> Support Project</a>
        </div>
      </div>
    </article>
  `).join("");

  createIcons();
}

function initLivestreamDirectoryFilters() {
  const search = document.getElementById("livestream-search");
  const status = document.getElementById("livestream-status");
  const type = document.getElementById("livestream-type");
  const list = document.getElementById("active-streams-list");
  if (!search || !status || !type || !list) return;
  const apply = () => {
    const query = search.value.trim().toLowerCase();
    const statusValue = status.value;
    const typeValue = type.value;
    [...list.children].forEach(card => {
      const text = card.textContent.toLowerCase();
      const matchesQuery = !query || text.includes(query);
      const matchesStatus = statusValue === "all" || text.includes(statusValue === "live" ? "live" : "scheduled");
      const matchesType = typeValue === "all" || text.includes(typeValue);
      card.hidden = !(matchesQuery && matchesStatus && matchesType);
    });
  };
  search.addEventListener("input", apply);
  status.addEventListener("change", apply);
  type.addEventListener("change", apply);
  new MutationObserver(apply).observe(list, { childList: true });
}

document.addEventListener("DOMContentLoaded", () => {
  const memberExperienceState = MWE.initMemberExperience();
  if (memberExperienceState === "redirecting" || memberExperienceState === "locked") return;

  const page = document.body.dataset.page;
  initPrivateAppAuth();
  if (page === "home") initHeroPage();
  if (page === "public") initPublicSite();
  if (page === "profile") initProfilePage();
  if (page === "livestream") initLivestreamPage();
  if (page === "livestream") initLivestreamDirectoryFilters();
  if (page === "portal") initChurchPortal();
  if (page === "admin" || page === "owner") initAdminPage();
  if (page === "events") initEventsPage();
  if (page === "event-profile") initEventProfilePage();
  if (page === "foundation") renderFoundationPage();
  if (page === "portal") setupPortalEventsTab();
  
  initCustomDropdowns();
  initModuleDirectoryToolbars();
  initTranslations();
  initGlobalHeaderAndFooter();
  initThemeControl();
  initScrollReveal();
  initMobileMenu();
  initOnboardingCarousel();

  const stats = document.querySelector("[data-impact-stats]");
  if (stats) {
    const isSlider = stats.classList.contains("stats-slider-track");
    const items = isSlider ? [...MWE.impactStats, ...MWE.impactStats] : MWE.impactStats;
    stats.innerHTML = items.map(([label, value]) => `
      <div class="stat"><strong>${Number(value).toLocaleString()}</strong><span>${MWE.escapeHtml(label)}</span></div>
    `).join("");
  }

  initDonateHeroSlider();
  createIcons();
});

/* Centralized Header & Footer Component Loader (Single Source of Truth) */
function initGlobalHeaderAndFooter() {
  const headerElem = document.querySelector("header.topbar") || document.querySelector("[data-component='header']");
  const footerElem = document.querySelector("footer.platform-footer") || document.querySelector("[data-component='footer']");

  const headerHTML = `<div class="container topbar-inner">
  <a class="brand" href="index.html">
    <span class="brand-mark"><i data-lucide="church"></i></span>
    <span><strong>My Way</strong><small>Evangelism & Fellowship</small></span>
  </a>
  <button class="mobile-menu-toggle" type="button" aria-label="Toggle Menu">
    <i data-lucide="menu"></i>
  </button>
  <div class="topbar-menu-group">
    <nav class="nav-links">
      <a href="churches.html" data-nav="churches" data-t="find_churches">Churches</a>
      <a href="events.html" data-nav="events" data-t="events">Events</a>
      <a href="livestream.html" data-nav="livestream" data-t="streams">Livestreams</a>
      <a href="donate.html" data-nav="donate" data-t="donation" class="highlight-link">Donation</a>
    </nav>
    <div class="nav-actions">
    </div>
  </div>
</div>`;

  const footerHTML = `<div class="container">
  <div class="footer-main">
    <div class="footer-brand-block">
      <a class="footer-brand" href="index.html">
        <span class="footer-brand-mark"><i data-lucide="church"></i></span>
        <span>My Way of Evangelism</span>
      </a>
      <p class="footer-description">A trusted bridge from search to local church connection, helping seekers find verified churches, services, events, and livestreams near them.</p>
      <div class="footer-cta-row">
        <a class="footer-button primary" href="churches.html"><i data-lucide="search"></i> Find a Church</a>
        <a class="footer-button" href="church-portal.html"><i data-lucide="building-2"></i> Register Your Church</a>
      </div>
    </div>
    <nav class="footer-column" aria-label="Explore">
      <h2>Explore</h2>
      <ul class="footer-links">
        <li><a href="index.html">Home</a></li>
        <li><a href="churches.html">Church Directory</a></li>
        <li><a href="events.html">Events</a></li>
        <li><a href="livestream.html">Livestreams</a></li>
        <li><a href="donate.html">Donation</a></li>
      </ul>
    </nav>
    <nav class="footer-column" aria-label="Churches">
      <h2>For Churches</h2>
      <ul class="footer-links">
        <li><a href="church-portal.html">Register or Sign In</a></li>
        <li><a href="owner-dashboard.html">Owner Dashboard</a></li>
        <li><a href="church-portal.html#events-tab">Manage Events</a></li>
        <li><a href="church-portal.html#livestream">Livestream Setup</a></li>
      </ul>
    </nav>
    <div class="footer-column">
      <h2>Connect</h2>
      <div class="footer-contact-card">
        <div class="footer-contact-row"><i data-lucide="map-pin"></i><span>Serving churches and communities across North America.</span></div>
        <div class="footer-contact-row"><i data-lucide="shield-check"></i><span>Verified profiles, ministry details, and public church discovery.</span></div>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; 2026 My Way of Evangelism. All rights reserved.</span>
    <span class="footer-status">Platform online</span>
  </div>
</div>`;

  const minimalFooterHTML = `<div class="container">
  <div class="footer-minimal-inner" style="display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; padding: 24px 0; border-top: 1px solid var(--line);">
    <div class="footer-minimal-brand" style="display: flex; align-items: center; gap: 12px;">
      <a class="footer-brand" href="index.html" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 800; color: #0f172a; text-decoration: none;">
        <span class="footer-brand-mark" style="width: 28px; height: 28px; border-radius: 8px; background: rgba(176, 129, 26, 0.12); color: #b0811a; display: flex; align-items: center; justify-content: center;"><i data-lucide="church" style="width: 16px; height: 16px;"></i></span>
        <span>My Way of Evangelism</span>
      </a>
      <span style="color: #cbd5e1;">|</span>
      <span style="font-size: 0.85rem; color: #64748b;">&copy; 2026 My Way of Evangelism. All rights reserved.</span>
    </div>
    <div class="footer-minimal-nav" style="display: flex; align-items: center; gap: 20px; font-size: 0.88rem; font-weight: 600;">
      <a href="churches.html" style="color: #475569; text-decoration: none;">Churches</a>
      <a href="events.html" style="color: #475569; text-decoration: none;">Events</a>
      <a href="livestream.html" style="color: #475569; text-decoration: none;">Livestreams</a>
      <a href="donate.html" style="color: #b0811a; font-weight: 700; text-decoration: none;">Donation</a>
      <span class="footer-status" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: rgba(16, 185, 129, 0.1); color: #059669; font-size: 0.78rem; font-weight: 700;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span> Platform online
      </span>
    </div>
  </div>
</div>`;

  const rawPath = window.location.pathname.split("/").pop() || "index.html";
  const currentPage = document.body.dataset.page || rawPath.replace(".html", "") || "index";
  const isSinglePage = currentPage === "profile" || currentPage === "event-profile" || currentPage === "livestream-profile" || rawPath.includes("church-profile") || rawPath.includes("event-profile") || (footerElem && footerElem.classList.contains("minimal"));

  if (headerElem) {
    headerElem.innerHTML = headerHTML;
  }
  if (footerElem) {
    footerElem.innerHTML = isSinglePage ? minimalFooterHTML : footerHTML;
    if (isSinglePage) footerElem.classList.add("minimal");
  }

  // Highlight active nav link based on current page URL / body data-page
  document.querySelectorAll(".nav-links a").forEach(link => {
    const href = link.getAttribute("href") || "";
    const navKey = link.dataset.nav || href.replace(".html", "");
    
    if (navKey === currentPage || (currentPage === "profile" && navKey === "churches") || (currentPage === "churches" && navKey === "churches") || (currentPage === "events" && navKey === "events") || (currentPage === "livestream" && navKey === "livestream") || (currentPage === "donate" && navKey === "donate")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Re-bind Lucide icons, Mobile Menu, and Translations after template insertion
  if (typeof initTranslations === "function") {
    initTranslations();
  }
  createIcons();
  initMobileMenu();
}

/* Masterful Hero Slider Controller for donate.html */
function initDonateHeroSlider() {
  const slider = document.getElementById("donate-hero-slider");
  if (!slider) return;

  const slides = slider.querySelectorAll(".donate-slide-item");
  const dots = slider.querySelectorAll(".slider-pill-dot");
  const prevBtn = document.getElementById("donate-slider-prev");
  const nextBtn = document.getElementById("donate-slider-next");

  if (slides.length === 0) return;

  let currentIdx = 0;
  let timer = null;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
    currentIdx = index;
  }

  function nextSlide() {
    const nextIdx = (currentIdx + 1) % slides.length;
    showSlide(nextIdx);
  }

  function prevSlide() {
    const pIdx = (currentIdx - 1 + slides.length) % slides.length;
    showSlide(pIdx);
  }

  function startAutoPlay() {
    stopAutoPlay();
    timer = setInterval(nextSlide, 5500);
  }

  function stopAutoPlay() {
    if (timer) clearInterval(timer);
  }

  if (nextBtn) nextBtn.addEventListener("click", () => { nextSlide(); startAutoPlay(); });
  if (prevBtn) prevBtn.addEventListener("click", () => { prevSlide(); startAutoPlay(); });

  dots.forEach((dot, idx) => {
    dot.addEventListener("click", () => {
      showSlide(idx);
      startAutoPlay();
    });
  });

  slider.addEventListener("mouseenter", stopAutoPlay);
  slider.addEventListener("mouseleave", startAutoPlay);

  showSlide(0);
  startAutoPlay();
}

/* Modern Green Pill Filter System */
MWE.toggleFilterPillDropdown = function(btn, event) {
  if (event) event.stopPropagation();
  const parent = btn.closest(".custom-pill-filter");
  const isOpen = parent.classList.contains("open");
  
  document.querySelectorAll(".custom-pill-filter.open").forEach(el => {
    if (el !== parent) el.classList.remove("open");
  });
  
  parent.classList.toggle("open", !isOpen);
};

document.addEventListener("click", function(e) {
  if (!e.target.closest(".custom-pill-filter")) {
    document.querySelectorAll(".custom-pill-filter.open").forEach(el => el.classList.remove("open"));
  }
});

// Update Badge & Active Pill State
MWE.updatePillState = function(pillId, defaultTitle) {
  const pill = document.getElementById(pillId);
  if (!pill) return;
  
  const checkedBoxes = pill.querySelectorAll("input[type='checkbox']:checked, input[type='radio']:checked");
  const count = checkedBoxes.length;
  
  const titleSpan = pill.querySelector(".pill-title");
  const badgeSpan = pill.querySelector(".pill-badge");
  
  if (count > 0) {
    pill.classList.add("is-active");
    if (count === 1) {
      const valLabel = checkedBoxes[0].closest(".custom-checkbox-row")?.querySelector(".checkbox-label")?.textContent;
      if (titleSpan) titleSpan.textContent = valLabel || defaultTitle;
      if (badgeSpan) badgeSpan.style.display = "none";
    } else {
      if (titleSpan) titleSpan.textContent = defaultTitle;
      if (badgeSpan) {
        badgeSpan.textContent = count;
        badgeSpan.style.display = "inline-flex";
      }
    }
  } else {
    pill.classList.remove("is-active");
    if (titleSpan) titleSpan.textContent = defaultTitle;
    if (badgeSpan) badgeSpan.style.display = "none";
  }
};

MWE.onChurchPillChange = function() {
  MWE.updatePillState("church-city-pill", "City");
  MWE.updatePillState("church-denom-pill", "Denomination");
  
  if (typeof MWE.triggerChurchSearch === "function") {
    MWE.triggerChurchSearch();
  }
};

MWE.resetChurchPillFilters = function() {
  document.querySelectorAll("#church-city-pill input, #church-denom-pill input").forEach(cb => cb.checked = false);
  const searchInput = document.querySelector("[data-search]");
  if (searchInput) searchInput.value = "";
  
  MWE.updatePillState("church-city-pill", "City");
  MWE.updatePillState("church-denom-pill", "Denomination");
  
  if (typeof MWE.triggerChurchSearch === "function") {
    MWE.triggerChurchSearch();
  }
};

MWE.onEventPillChange = function() {
  MWE.updatePillState("event-cat-pill", "Category");
  MWE.updatePillState("event-price-pill", "Admission");
  MWE.updatePillState("event-time-pill", "Date Range");
  
  if (typeof MWE.renderEventsList === "function") {
    MWE.renderEventsList();
  }
};

MWE.resetEventPillFilters = function() {
  document.querySelectorAll("#event-cat-pill input, #event-price-pill input").forEach(cb => cb.checked = false);
  const upcomingRadio = document.querySelector("input[name='event-time-radio'][value='upcoming']");
  if (upcomingRadio) upcomingRadio.checked = true;
  
  const searchInput = document.getElementById("event-city-input");
  if (searchInput) searchInput.value = "";
  
  MWE.updatePillState("event-cat-pill", "Category");
  MWE.updatePillState("event-price-pill", "Admission");
  MWE.updatePillState("event-time-pill", "Date Range");
  
  if (typeof MWE.renderEventsList === "function") {
    MWE.renderEventsList();
  }
};

/* Church Profile Lightbox Video Modal Controllers */
MWE.openChurchVideoModal = function() {
  const modal = document.getElementById("church-video-modal");
  const iframe = document.getElementById("church-popup-iframe");
  if (!modal || !iframe) return;

  const currentChurch = MWE.activeChurchProfile || {};
  const churchName = currentChurch.name || "Church Intro Video";
  const videoUrl = currentChurch.videoUrl || "https://www.youtube.com/embed/jiSyB8QZzk8";
  const embedUrl = videoUrl.includes("autoplay=1") ? videoUrl : `${videoUrl}${videoUrl.includes("?") ? "&" : "?"}autoplay=1&enablejsapi=1`;

  const titleEl = modal.querySelector("[data-church-name-video]");
  if (titleEl) titleEl.textContent = `${churchName} — Welcome Video`;

  iframe.src = embedUrl;
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  createIcons();
};

MWE.closeChurchVideoModal = function(e) {
  if (e && e.target !== e.currentTarget && !e.target.closest(".video-modal-close-btn")) return;
  const modal = document.getElementById("church-video-modal");
  const iframe = document.getElementById("church-popup-iframe");
  if (!modal) return;

  modal.classList.remove("open");
  if (iframe) iframe.src = "";
  document.body.style.overflow = "";
};

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    MWE.closeChurchVideoModal();
  }
});

