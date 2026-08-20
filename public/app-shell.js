(function initFaithLinkMemberShell() {
  const frame = document.getElementById("member-shell-frame");
  const loading = document.getElementById("member-shell-loading");
  const rail = document.getElementById("member-shell-rail");
  const mobileMenu = document.getElementById("member-mobile-menu");
  const accountButton = document.getElementById("member-account-button");
  const accountMenu = document.getElementById("member-account-menu");
  const shellSearch = document.getElementById("member-shell-search");
  const langSelector = document.getElementById("member-lang-selector");
  const langButton = document.getElementById("member-lang-button");
  const sectionContext = document.getElementById("member-section-context");
  const mobileActions = document.getElementById("member-mobile-actions");
  const desktopActions = document.querySelector(".member-shell-actions");
  const givingAction = document.querySelector(".member-header-giving");
  const accountWrap = document.querySelector(".member-shell-account-wrap");

  if (!frame) return;

  const views = {
    directory: { source: "churches.html", title: "Church Directory" },
    channels: { source: "channels.html", title: "Christian Channels" },
    "channel-detail": { source: "channel-detail.html", title: "Channel" },
    "channel-content": { source: "channel-content.html", title: "Channel Content" },
    messages: { source: "messages.html", title: "Messages" },
    events: { source: "events.html", title: "Events" },
    livestream: { source: "livestream.html", title: "Livestreams" },
    church: { source: "church-profile.html", title: "Church Profile" },
    event: { source: "event-profile.html", title: "Event Details" },
    giving: { source: "donate.html", title: "Giving" },
    store: { source: "store.html", title: "FaithLink Store" },
    product: { source: "product-detail.html", title: "Product Details" },
    cart: { source: "cart.html", title: "Your Cart" },
    checkout: { source: "checkout.html", title: "Checkout" },
    "store-manager": { source: "seller-dashboard.html", title: "Store Manager" },
    resources: { source: "resources.html", title: "Christian Resources" },
    "resource-detail": { source: "resource-detail.html", title: "Resource Details" }
    ,"resource-reader": { source: "resource-reader.html", title: "Resource Reader" }
  };

  const sectionContexts = {
    directory: ["Churches", "church"], church: ["Churches", "church"],
    channels: ["Channels", "podcast"], "channel-detail": ["Channels", "podcast"], "channel-content": ["Channels", "podcast"],
    events: ["Events", "calendar-days"], event: ["Events", "calendar-days"],
    livestream: ["Live", "radio"],
    store: ["Store", "shopping-bag"], product: ["Store", "shopping-bag"], cart: ["Store", "shopping-bag"], checkout: ["Store", "shopping-bag"], "store-manager": ["Store", "shopping-bag"],
    resources: ["Resources", "book-open"], "resource-detail": ["Resources", "book-open"], "resource-reader": ["Resources", "book-open"],
    giving: ["Give", "heart-handshake"], messages: ["Messages", "messages-square"]
  };

  function updateSectionContext(view) {
    const [label, icon] = sectionContexts[view] || sectionContexts.directory;
    sectionContext?.querySelector("strong")?.replaceChildren(label);
    const oldIcon = sectionContext?.querySelector("svg, i");
    if (oldIcon) { const replacement = document.createElement("i"); replacement.dataset.lucide = icon; replacement.id = "member-section-icon"; oldIcon.replaceWith(replacement); }
    window.lucide?.createIcons();
  }

  function placeResponsiveActions() {
    const mobile = window.matchMedia("(max-width: 900px)").matches;
    const destination = mobile ? mobileActions : desktopActions;
    if (!destination) return;
    if (mobile) { if (givingAction?.parentElement !== destination) destination.append(givingAction); if (accountWrap?.parentElement !== destination) destination.append(accountWrap); }
    else { if (givingAction?.parentElement !== destination) destination.append(givingAction); if (accountWrap?.parentElement !== destination) destination.append(accountWrap); }
  }

  function isAuthenticated() {
    return localStorage.getItem("mwe.userLoggedIn") === "true";
  }

  function getRoute() {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("view") || "directory";
    const view = views[requested] ? requested : "directory";
    return {
      view,
      id: params.get("id") || "",
      q: params.get("q") || "",
      compose: params.get("compose") || "",
      post: params.get("post") || ""
    };
  }

  function buildSource(route) {
    const definition = views[route.view] || views.directory;
    const source = new URL(definition.source, window.location.href);
    source.searchParams.set("embed", "1");
    if (route.id) source.searchParams.set("id", route.id);
    if (route.q) source.searchParams.set("q", route.q);
    if (route.compose) source.searchParams.set("compose", route.compose);
    if (route.view === "channel-content" && route.id) source.searchParams.set("channel", route.id);
    if (route.post) source.searchParams.set("post", route.post);
    return source.toString();
  }

  function buildShellUrl(route) {
    const target = new URL("app.html", window.location.href);
    target.searchParams.set("view", route.view);
    if (route.id) target.searchParams.set("id", route.id);
    if (route.q) target.searchParams.set("q", route.q);
    if (route.compose) target.searchParams.set("compose", route.compose);
    if (route.post) target.searchParams.set("post", route.post);
    return `${target.pathname.split("/").pop()}${target.search}`;
  }

  function setActiveNavigation(view) {
    document.querySelectorAll("[data-shell-view]").forEach(link => {
      const linkView = link.dataset.shellView;
      const isActive = linkView === view || (view === "church" && linkView === "directory") || (["channel-detail", "channel-content"].includes(view) && linkView === "channels") || (view === "event" && linkView === "events") || (["store-manager", "product", "cart", "checkout"].includes(view) && linkView === "store") || (["resource-detail", "resource-reader"].includes(view) && linkView === "resources");
      link.classList.toggle("active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function loadRoute(route, options = {}) {
    const safeRoute = views[route.view] ? route : { view: "directory", id: "", q: "", compose: "" };
    if (!isAuthenticated()) {
      const destination = buildShellUrl(safeRoute);
      if (window.MWE?.openMemberLogin) {
        window.MWE.openMemberLogin(destination, { locked: true });
      } else {
        window.location.href = `index.html?login=required&next=${encodeURIComponent(destination)}`;
      }
      return;
    }

    loading?.classList.remove("is-hidden");
    frame.classList.remove("is-ready");
    frame.src = buildSource(safeRoute);
    frame.title = views[safeRoute.view].title;
    document.title = `${views[safeRoute.view].title} | FaithLink`;
    setActiveNavigation(safeRoute.view);
    updateSectionContext(safeRoute.view);

    if (options.history !== false) {
      const method = options.replace ? "replaceState" : "pushState";
      window.history[method]({ route: safeRoute }, "", buildShellUrl(safeRoute));
    }

    document.body.classList.remove("member-nav-open");
    mobileMenu?.setAttribute("aria-expanded", "false");
  }

  document.querySelectorAll("[data-shell-view]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      const view = link.dataset.shellView;
      loadRoute({ view, id: "", q: "" });
    });
  });

  mobileMenu?.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("member-nav-open");
    mobileMenu.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", event => {
    if (document.body.classList.contains("member-nav-open") && rail && !rail.contains(event.target) && !mobileMenu?.contains(event.target)) {
      document.body.classList.remove("member-nav-open");
      mobileMenu?.setAttribute("aria-expanded", "false");
    }

    if (accountMenu && !accountMenu.hidden && !accountMenu.contains(event.target) && !accountButton?.contains(event.target)) {
      accountMenu.hidden = true;
      accountButton?.setAttribute("aria-expanded", "false");
    }
    if (langSelector?.classList.contains("open") && !langSelector.contains(event.target)) {
      langSelector.classList.remove("open");
      langButton?.setAttribute("aria-expanded", "false");
    }
  });

  accountButton?.addEventListener("click", () => {
    const willOpen = accountMenu.hidden;
    accountMenu.hidden = !willOpen;
    accountButton.setAttribute("aria-expanded", String(willOpen));
  });

  document.getElementById("member-sign-out")?.addEventListener("click", () => {
    localStorage.removeItem("mwe.userLoggedIn");
    localStorage.removeItem("mwe.username");
    window.location.href = "index.html";
  });

  document.getElementById("member-send-invite")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/churches.html`);
      window.MWE?.showMemberToast?.("Church directory link copied");
    } catch {
      window.MWE?.showMemberToast?.("Share the church directory with a friend");
    }
  });

  const languages = { en: ["🇺🇸", "EN"], fr: ["🇫🇷", "FR"], es: ["🇪🇸", "ES"] };
  function setMemberLanguage(lang) {
    const selected = languages[lang] || languages.en;
    localStorage.setItem("mwe.lang", lang);
    langButton?.querySelector(".lang-flag")?.replaceChildren(selected[0]);
    langButton?.querySelector(".lang-text")?.replaceChildren(selected[1]);
    langSelector?.classList.remove("open");
    langButton?.setAttribute("aria-expanded", "false");
  }
  setMemberLanguage(localStorage.getItem("mwe.lang") || "en");
  langButton?.addEventListener("click", event => { event.stopPropagation(); const open = langSelector.classList.toggle("open"); langButton.setAttribute("aria-expanded", String(open)); });
  langSelector?.querySelectorAll("[data-member-lang]").forEach(button => button.addEventListener("click", () => setMemberLanguage(button.dataset.memberLang)));

  shellSearch?.addEventListener("submit", event => {
    event.preventDefault();
    const q = new FormData(shellSearch).get("q")?.toString().trim() || "";
    const current = getRoute();
    const searchViewMap = { church: "directory", "channel-detail": "channels", "channel-content": "channels", event: "events", "store-manager": "store", product: "store", cart: "store", checkout: "store", "resource-detail": "resources", "resource-reader": "resources" };
    const searchableViews = ["directory", "channels", "events", "store", "resources"];
    const candidate = searchViewMap[current.view] || current.view;
    loadRoute({ view: searchableViews.includes(candidate) ? candidate : "directory", id: "", q });
  });

  frame.addEventListener("load", () => {
    loading?.classList.add("is-hidden");
    frame.classList.add("is-ready");
  });

  window.addEventListener("message", event => {
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
    const message = event.data || {};
    if (message.type !== "faithlink:navigate") return;
    if (message.leaveShell && message.href) {
      window.location.href = message.href;
      return;
    }
    if (!views[message.view]) return;
    loadRoute({ view: message.view, id: message.id || "", q: message.q || "" });
  });

  window.addEventListener("popstate", () => loadRoute(getRoute(), { history: false }));
  window.addEventListener("resize", placeResponsiveActions);

  placeResponsiveActions();
  loadRoute(getRoute(), { history: false });
  window.lucide?.createIcons();
})();
