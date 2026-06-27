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
      pastorPhoto: "assets/pastor-light-chapel.png",
      pastor: "Christ Embassy Edmonton Pastoral Team",
      pastorTitle: "Pastoral Leadership",
      pastorBio: "A Word-based church family welcoming believers, visitors, and new Christians into worship, prayer, teaching, and evangelism.",
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
      pastorPhoto: "assets/pastor-grace-house.png",
      pastor: "Beulah Alliance Church Team",
      pastorTitle: "Multi-campus Ministry Team",
      pastorBio: "A multi-generational church serving greater Edmonton through worship gatherings, groups, ministries, and community care.",
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
      pastorPhoto: "assets/pastor-river-city.png",
      pastor: "First Alliance Church Team",
      pastorTitle: "Church Leadership",
      pastorBio: "A Calgary church community focused on worship, formation, families, and joining Jesus in renewal.",
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
      pastorPhoto: "assets/pastor-new-life.png",
      pastor: "The Peoples Church Team",
      pastorTitle: "Pastoral Team",
      pastorBio: "A Toronto church community focused on worship, global mission, discipleship, and serving people across cultures.",
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
    ["Churches Connected", 1284],
    ["Cities Covered", 312],
    ["Countries Reached", 44],
    ["People Connected", 28640],
    ["Prayer Requests Submitted", 9108],
    ["New Church Visitors", 4732],
    ["Volunteer Hours", 18550],
    ["Evangelism Teams Active", 268]
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
      if (Array.isArray(saved)) return saved.map(normalizeChurch);
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
    syncDeleteChurch
  };
})();

function createIcons() {
  if (window.lucide) window.lucide.createIcons();
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
  if (localStorage.getItem(key) === "authenticated") {
    document.body.classList.add("is-authenticated");
  }

  function signIn() {
    localStorage.setItem(key, "authenticated");
    document.body.classList.add("is-authenticated");
    showToast("Signed in");
  }

  document.querySelector("[data-login-form]")?.addEventListener("submit", event => {
    event.preventDefault();
    signIn();
  });

  document.querySelector("[data-login-form]")?.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    signIn();
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

function churchCard(church) {
  const tags = [church.city, church.language, church.livestream.enabled ? "Livestream" : "In-person", ...church.ministries.slice(0, 2)];
  return `
    <article class="church-card">
      <div class="church-photo" style="--photo:url('${MWE.escapeHtml(church.photo)}')">
        <span class="badge"><i data-lucide="${church.verified ? "badge-check" : "clock"}"></i>${church.verified ? "Verified" : "Pending"}</span>
      </div>
      <div class="church-card-body">
        <h3>${MWE.escapeHtml(church.name)}</h3>
        <div class="meta">${MWE.escapeHtml(church.area)}<br>${MWE.escapeHtml(church.sunday)}</div>
        <div class="tag-row">${tags.map(tag => `<span class="tag">${MWE.escapeHtml(tag)}</span>`).join("")}</div>
        <div class="card-actions">
          <a class="button primary small" href="church-profile.html?id=${church.id}"><i data-lucide="external-link"></i>Profile</a>
          <a class="button ghost small" href="tel:${church.phone}"><i data-lucide="phone"></i>Call</a>
        </div>
      </div>
    </article>
  `;
}

function initPublicSite() {
  const grid = document.querySelector("[data-church-grid]");
  const search = document.querySelector("[data-search]");
  const city = document.querySelector("[data-city]");
  const ministry = document.querySelector("[data-ministry]");
  const stream = document.querySelector("[data-stream]");
  const reset = document.querySelector("[data-reset]");

  const churches = MWE.getChurches();

  if (city) {
    const cities = [...new Set(churches.map(church => church.city).filter(Boolean))].sort();
    city.innerHTML = `<option value="">All cities</option>${cities.map(item => `<option value="${MWE.escapeHtml(item)}">${MWE.escapeHtml(item)}</option>`).join("")}`;
  }

  function render() {
    if (!grid) return;
    const q = (search?.value || "").toLowerCase().trim();
    const cityValue = city?.value || "";
    const ministryValue = ministry?.value || "";
    const streamValue = stream?.value || "";
    const filtered = MWE.getChurches().filter(church => {
      const haystack = [church.name, church.city, church.area, church.country, church.denomination, church.language, church.sunday, church.ministries.join(" ")].join(" ").toLowerCase();
      const ministryMatch = !ministryValue || church.ministries.some(item => item.toLowerCase().includes(ministryValue));
      const streamMatch = !streamValue || String(church.livestream.enabled) === streamValue;
      return (!q || haystack.includes(q)) && (!cityValue || church.city === cityValue) && ministryMatch && streamMatch;
    });
    grid.innerHTML = filtered.length ? filtered.map(churchCard).join("") : `<div class="empty">No churches match those filters yet.</div>`;
    createIcons();
  }

  [search, city, ministry, stream].filter(Boolean).forEach(input => input.addEventListener("input", render));
  reset?.addEventListener("click", () => {
    [search, city, ministry, stream].filter(Boolean).forEach(input => { input.value = ""; });
    render();
  });

  const stats = document.querySelector("[data-impact-stats]");
  if (stats) {
    stats.innerHTML = MWE.impactStats.map(([label, value]) => `
      <div class="stat"><strong>${Number(value).toLocaleString()}</strong><span>${MWE.escapeHtml(label)}</span></div>
    `).join("");
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
  document.title = `${church.name} | My Way of Evangelism`;
  document.querySelector("[data-profile-hero]")?.style.setProperty("--profile-image", `url('${church.photo}')`);
  document.querySelectorAll("[data-church-name]").forEach(el => { el.textContent = church.name; });
  document.querySelectorAll("[data-church-tagline]").forEach(el => { el.textContent = church.tagline; });
  const set = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  };
  set("[data-profile-location]", church.location);
  set("[data-profile-sunday]", church.sunday);
  set("[data-profile-midweek]", church.midweek);
  set("[data-profile-about]", church.about);
  set("[data-profile-pastor]", church.pastor);
  set("[data-profile-pastor-title]", church.pastorTitle);
  set("[data-profile-pastor-bio]", church.pastorBio);
  const website = document.querySelector("[data-profile-website]");
  if (website) website.href = church.website;
  const phone = document.querySelector("[data-profile-phone]");
  if (phone) {
    phone.href = `tel:${church.phone}`;
    phone.textContent = church.phoneLabel || church.phone;
  }
  const email = document.querySelector("[data-profile-email]");
  if (email) {
    email.href = church.emailHref;
    email.textContent = church.email || "Contact church";
  }
  const live = document.querySelector("[data-profile-live]");
  if (live) live.href = `livestream.html?id=${church.id}`;
  const ministries = document.querySelector("[data-profile-ministries]");
  if (ministries) ministries.innerHTML = church.ministries.map(item => `<span class="tag"><i data-lucide="check"></i>${MWE.escapeHtml(item)}</span>`).join("");
  const schedule = document.querySelector("[data-profile-schedule]");
  if (schedule) {
    schedule.innerHTML = church.schedule.map(([label, time]) => `<tr><td>${MWE.escapeHtml(label)}</td><td>${MWE.escapeHtml(time)}</td></tr>`).join("");
  }
  createIcons();
}

function initProfilePage() {
  const church = getRouteChurch();
  renderProfile(church);
  document.querySelector("[data-visitor-form]")?.addEventListener("submit", event => {
    event.preventDefault();
    event.target.reset();
    showToast(`Message sent to ${church.name}`);
  });
}

function initLivestreamPage() {
  const church = getRouteChurch();
  document.title = `${church.name} Livestream | My Way of Evangelism`;
  document.querySelector("[data-player]")?.style.setProperty("--player-image", `url('${church.photo}')`);
  document.querySelectorAll("[data-church-name]").forEach(el => { el.textContent = church.name; });
  document.querySelectorAll("[data-stream-profile]").forEach(profile => {
    profile.href = `church-profile.html?id=${church.id}`;
  });

  const tabButtons = [...document.querySelectorAll("[data-live-tab]")];
  const tabPanels = [...document.querySelectorAll("[data-live-tab-panel]")];
  function setLiveTab(tabName) {
    tabButtons.forEach(button => {
      const active = button.dataset.liveTab === tabName;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    tabPanels.forEach(panel => {
      const active = panel.dataset.liveTabPanel === tabName;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  }
  tabButtons.forEach((button, index) => {
    button.addEventListener("click", () => setLiveTab(button.dataset.liveTab));
    button.addEventListener("keydown", event => {
      const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!offset) return;
      event.preventDefault();
      const next = tabButtons[(index + offset + tabButtons.length) % tabButtons.length];
      next.focus();
      setLiveTab(next.dataset.liveTab);
    });
  });
  if (tabButtons.length) setLiveTab(tabButtons.find(button => button.classList.contains("active"))?.dataset.liveTab || tabButtons[0].dataset.liveTab);

  const chatForm = document.querySelector("[data-live-chat-form]");
  const chatMessages = document.querySelector("[data-live-chat-messages]");
  function sendChatMessage() {
    const message = chatForm.elements.message.value.trim();
    if (!message || !chatMessages) return false;
    chatMessages.insertAdjacentHTML("beforeend", `
      <div class="chat-message">
        <span class="chat-avatar">ME</span>
        <div><strong>You</strong><p>${MWE.escapeHtml(message)}</p></div>
      </div>
    `);
    chatForm.reset();
    chatMessages.scrollTop = chatMessages.scrollHeight;
    createIcons();
    return true;
  }

  chatForm?.addEventListener("submit", event => {
    event.preventDefault();
    sendChatMessage();
  });

  chatForm?.elements.message?.addEventListener("keydown", event => {
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

  function loadSelected() {
    const church = MWE.getChurch(select.value);
    MWE.fillChurchForm(form, church);
    renderReadableProfile(church);
    renderPreview(church);
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

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  initPrivateAppAuth();
  if (page === "public") initPublicSite();
  if (page === "profile") initProfilePage();
  if (page === "livestream") initLivestreamPage();
  if (page === "portal") initChurchPortal();
  if (page === "admin" || page === "owner") initAdminPage();
  createIcons();
});
