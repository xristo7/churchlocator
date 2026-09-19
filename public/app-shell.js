(async function initFaithLinkMemberShell() {
  await window.MWEPlatform?.ready;
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

  const navBackdrop = document.createElement("button");
  navBackdrop.type = "button";
  navBackdrop.className = "member-nav-backdrop";
  navBackdrop.setAttribute("aria-label", "Close navigation");
  document.body.append(navBackdrop);

  function setMemberNav(open) {
    document.body.classList.toggle("member-nav-open", open);
    mobileMenu?.setAttribute("aria-expanded", String(open));
    mobileMenu?.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    mobileMenu?.classList.toggle("is-open", open);
  }

  mobileMenu?.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    setMemberNav(!document.body.classList.contains("member-nav-open"));
  }, { capture: true });
  navBackdrop.addEventListener("click", () => setMemberNav(false));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.body.classList.contains("member-nav-open")) {
      setMemberNav(false);
      mobileMenu?.focus();
    }
  });

  const views = {
    home: { source: "member-home.html", title: "Member Home" },
    spotlight: { source: "spotlight.html", title: "Spotlight" },
    meditation: { source: "meditation.html", title: "Meditation Sanctuary" },
    directory: { source: "churches.html", title: "Church Directory" },
    channels: { source: "channels.html", title: "Christian Channels" },
    "channel-detail": { source: "channel-detail.html", title: "Channel" },
    "channel-content": { source: "channel-content.html", title: "Channel Content" },
    messages: { source: "messages.html", title: "Messages" },
    profile: { source: "account-profile.html", title: "Profile & Account" },
    events: { source: "events.html", title: "Events" },
    livestream: { source: "livestream.html", title: "Livestreams" },
    church: { source: "church-profile.html", title: "Church Profile" },
    event: { source: "event-profile.html", title: "Event Details" },
    giving: { source: "donate.html", title: "Giving" },
    store: { source: "store.html", title: "My Way Store" },
    product: { source: "product-detail.html", title: "Product Details" },
    cart: { source: "cart.html", title: "Your Cart" },
    checkout: { source: "checkout.html", title: "Checkout" },
    "store-manager": { source: "seller-dashboard.html", title: "Store Manager" },
    resources: { source: "resources.html", title: "Christian Resources" },
    "resource-detail": { source: "resource-detail.html", title: "Resource Details" },
    "resource-reader": { source: "resource-reader.html", title: "Resource Reader" },
    portal: { source: "church-portal.html", title: "Creator & Ministry Hub" }
  };

  const sectionContexts = {
    home: ["Home", "layout-grid"],
    spotlight: ["Spotlight", "play-square"],
    meditation: ["Meditation", "sparkles"],
    directory: ["Churches", "church"], church: ["Churches", "church"],
    channels: ["Channels", "podcast"], "channel-detail": ["Channels", "podcast"], "channel-content": ["Channels", "podcast"],
    events: ["Events", "calendar-days"], event: ["Events", "calendar-days"],
    livestream: ["Live", "radio"],
    store: ["Store", "shopping-bag"], product: ["Store", "shopping-bag"], cart: ["Store", "shopping-bag"], checkout: ["Store", "shopping-bag"], "store-manager": ["Store", "shopping-bag"],
    resources: ["Resources", "book-open"], "resource-detail": ["Resources", "book-open"], "resource-reader": ["Resources", "book-open"],
    giving: ["Give", "heart-handshake"], messages: ["Messages", "messages-square"], profile: ["Profile", "user-round"],
    portal: ["Creator Hub", "rocket"]
  };

  function updateSectionContext(view) {
    const [defaultLabel, icon] = sectionContexts[view] || sectionContexts.directory;
    const translationKey = ({ church: "directory", "channel-detail": "channels", "channel-content": "channels", event: "events", product: "store", cart: "store", checkout: "store", "store-manager": "store", "resource-detail": "resources", "resource-reader": "resources" })[view] || view;
    const label = shellTranslations?.[currentMemberLanguage]?.[translationKey] || defaultLabel;
    sectionContext?.querySelector("strong")?.replaceChildren(label);
    const oldIcon = sectionContext?.querySelector("svg, i");
    if (oldIcon) { const replacement = document.createElement("i"); replacement.dataset.lucide = icon; replacement.id = "member-section-icon"; oldIcon.replaceWith(replacement); }
    window.lucide?.createIcons();
  }

  function placeResponsiveActions() {
    const mobile = window.matchMedia("(max-width: 900px)").matches;
    const destination = mobile ? mobileActions : desktopActions;
    if (!destination) return;
    const themeControl = document.querySelector(".theme-palette-container");
    [themeControl, langSelector, givingAction, accountWrap].forEach(action => {
      if (action && action.parentElement !== destination) destination.append(action);
    });
  }

  function isAuthenticated() {
    return Boolean(window.MWEPlatform?.session) || localStorage.getItem("mwe.userLoggedIn") === "true";
  }

  function memberInitials(name) {
    const parts = String(name || "My Way").trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0, 2).map(part => part[0]).join("") || "MW").toUpperCase();
  }

  function syncMemberIdentity() {
    const session = window.MWEPlatform?.session;
    const name = session?.name || localStorage.getItem("mwe.username") || "My Way member";
    const role = session?.isCreator ? "Creator account" : "My Way member";
    document.body.classList.toggle("member-is-authenticated", isAuthenticated());
    document.querySelectorAll("[data-member-name]").forEach(node => { node.textContent = name; });
    document.querySelectorAll("[data-member-role]").forEach(node => { node.textContent = role; });
    document.querySelectorAll("[data-member-avatar]").forEach(container => {
      const avatar = container.querySelector("[data-member-avatar-image]");
      const fallback = container.querySelector("[data-member-avatar-initials]");
      const showFallback = () => {
        if (avatar) {
          avatar.hidden = true;
          avatar.removeAttribute("src");
        }
        if (fallback) fallback.hidden = false;
      };
      if (fallback) fallback.textContent = memberInitials(name);
      if (avatar && session?.avatarUrl) {
        avatar.onload = () => {
          avatar.hidden = false;
          if (fallback) fallback.hidden = true;
        };
        avatar.onerror = showFallback;
        avatar.alt = `${name} profile picture`;
        avatar.src = session.avatarUrl;
      } else {
        showFallback();
      }
    });
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
      const isActive = linkView === view || (view === "portal" && linkView === "portal") || (view === "church" && linkView === "directory") || (["channel-detail", "channel-content"].includes(view) && linkView === "channels") || (view === "event" && linkView === "events") || (["store-manager", "product", "cart", "checkout"].includes(view) && linkView === "store") || (["resource-detail", "resource-reader"].includes(view) && linkView === "resources");
      link.classList.toggle("active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function isProtectedView(view) {
    return ["messages", "profile", "store-manager", "cart", "checkout"].includes(view);
  }

  function hasMatchingCreatorIdentity() {
    if (localStorage.getItem("mwe.userLoggedIn") !== "true") return false;
    const publicEmail = (localStorage.getItem("mwe.userEmail") || "").trim().toLowerCase();
    if (!publicEmail) return false;
    try {
      const creator = JSON.parse(localStorage.getItem("mwe.creator.account.v1") || "null");
      return (creator?.email || "").trim().toLowerCase() === publicEmail;
    } catch {
      return false;
    }
  }

  function openCreatorWorkspace() {
    const workspace = window.open("creator-workspace.html", "_blank", "noopener");
    if (!workspace) window.location.href = "creator-workspace.html";
  }

  function loadRoute(route, options = {}) {
    const safeRoute = views[route.view] ? route : { view: "directory", id: "", q: "", compose: "" };
    if (safeRoute.view === "portal" && localStorage.getItem("mwe.session.church.v1") === "authenticated" && hasMatchingCreatorIdentity()) {
      openCreatorWorkspace();
      loadRoute({ view: "directory", id: "", q: "" }, { replace: true });
      return;
    }
    if (isProtectedView(safeRoute.view) && !isAuthenticated()) {
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
    document.title = `${views[safeRoute.view].title} | My Way`;
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
      if (view === "portal" && localStorage.getItem("mwe.session.church.v1") === "authenticated" && hasMatchingCreatorIdentity()) {
        openCreatorWorkspace();
        document.body.classList.remove("member-nav-open");
        mobileMenu?.setAttribute("aria-expanded", "false");
        return;
      }
      loadRoute({ view, id: "", q: "" });
    });
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

  document.getElementById("member-sign-out")?.addEventListener("click", async () => {
    if (window.MWEAuth) { const result = await window.MWEAuth.logout(); if (!result.ok) { window.alert("Could not sign out securely. Please try again."); return; } }
    localStorage.removeItem("mwe.userLoggedIn");
    localStorage.removeItem("mwe.username");
    localStorage.removeItem("mwe.userEmail");
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

    const flagSvgs = {
    en: '<svg class="flag-svg" viewBox="0 0 20 15" width="18" height="13.5" style="border-radius: 2px; flex-shrink: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.15); display: inline-block; vertical-align: middle;"><rect width="20" height="15" fill="#bd3d44"/><path d="M0 2.3h20v2.3H0zm0 4.6h20v2.3H0zm0 4.6h20v2.3H0z" fill="#fff"/><rect width="9" height="8.1" fill="#192f5d"/><circle cx="4.5" cy="4" r="2" fill="#fff"/></svg>',
    fr: '<svg class="flag-svg" viewBox="0 0 20 15" width="18" height="13.5" style="border-radius: 2px; flex-shrink: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.15); display: inline-block; vertical-align: middle;"><rect width="6.67" height="15" fill="#002654"/><rect x="6.67" width="6.66" height="15" fill="#ffffff"/><rect x="13.33" width="6.67" height="15" fill="#ce1126"/></svg>',
    es: '<svg class="flag-svg" viewBox="0 0 20 15" width="18" height="13.5" style="border-radius: 2px; flex-shrink: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.15); display: inline-block; vertical-align: middle;"><rect width="20" height="15" fill="#aa151b"/><rect y="3.75" width="20" height="7.5" fill="#f1bf00"/><circle cx="6" cy="7.5" r="2" fill="#aa151b"/></svg>'
  };
  const languages = { en: "EN", fr: "FR", es: "ES" };
  const shellTranslations = {
    en: { home: "Home", spotlight: "Spotlight", meditation: "Meditation", directory: "Churches", channels: "Channels", events: "Events", livestream: "Live", store: "Store", resources: "Resources", giving: "Give", messages: "Messages", portal: "Creator Hub", help: "Help & Support", invite: "Invite a friend", inviteBody: "Help others find their church home.", inviteAction: "Send Invite", loading: "Loading your My Way view…", search: "Search churches, channels, events...", member: "My Way member", signOut: "Sign out" },
    fr: { home: "Accueil", spotlight: "À la une", meditation: "Méditation", directory: "Églises", channels: "Chaînes", events: "Événements", livestream: "En direct", store: "Boutique", resources: "Ressources", giving: "Faire un don", messages: "Messages", portal: "Espace créateur", help: "Aide et assistance", invite: "Inviter un proche", inviteBody: "Aidez d’autres personnes à trouver leur communauté.", inviteAction: "Envoyer l’invitation", loading: "Chargement de votre espace My Way…", search: "Rechercher des églises, chaînes, événements…", member: "Membre My Way", signOut: "Se déconnecter" },
    es: { home: "Inicio", spotlight: "Destacados", meditation: "Meditación", directory: "Iglesias", channels: "Canales", events: "Eventos", livestream: "En vivo", store: "Tienda", resources: "Recursos", giving: "Donar", messages: "Mensajes", portal: "Centro de creadores", help: "Ayuda y soporte", invite: "Invitar a alguien", inviteBody: "Ayuda a otras personas a encontrar su comunidad.", inviteAction: "Enviar invitación", loading: "Cargando tu espacio My Way…", search: "Buscar iglesias, canales y eventos…", member: "Miembro de My Way", signOut: "Cerrar sesión" }
  };
  let currentMemberLanguage = localStorage.getItem("mwe.lang") || "en";
  if (!shellTranslations[currentMemberLanguage]) currentMemberLanguage = "en";

  function applyShellLanguage(lang) {
    const dict = shellTranslations[lang] || shellTranslations.en;
    currentMemberLanguage = shellTranslations[lang] ? lang : "en";
    document.documentElement.lang = currentMemberLanguage;
    document.querySelectorAll("[data-shell-view]").forEach(link => {
      const label = link.querySelector("span");
      if (label && dict[link.dataset.shellView]) label.textContent = dict[link.dataset.shellView];
    });
    const search = shellSearch?.querySelector('input[name="q"]');
    if (search) { search.placeholder = dict.search; search.setAttribute("aria-label", dict.search); }
    const utility = document.querySelectorAll(".profile-rail-utility a span");
    if (utility[1]) utility[1].textContent = dict.help;
    const invite = document.querySelector(".profile-invite-card");
    if (invite) {
      const strong = invite.querySelector("strong");
      if (strong) strong.lastChild.textContent = " " + dict.invite;
      const body = invite.querySelector("p"); if (body) body.textContent = dict.inviteBody;
      const action = invite.querySelector("button"); if (action) action.childNodes[0].textContent = dict.inviteAction + " ";
    }
    const memberLabel = document.querySelector("#member-account-menu > span"); if (memberLabel) memberLabel.textContent = dict.member;
    const signOut = document.getElementById("member-sign-out"); if (signOut) signOut.lastChild.textContent = " " + dict.signOut;
    const loadingText = loading?.querySelector("p"); if (loadingText) loadingText.textContent = dict.loading;
    updateSectionContext(getRoute().view);
    window.lucide?.createIcons();
  }
  function setMemberLanguage(lang) {
    if (!languages[lang]) lang = "en";
    const selectedText = languages[lang];
    const selectedSvg = flagSvgs[lang];
    localStorage.setItem("mwe.lang", lang);
    const flagContainer = langButton?.querySelector(".lang-flag");
    if (flagContainer) flagContainer.innerHTML = selectedSvg;
    const textContainer = langButton?.querySelector(".lang-text");
    if (textContainer) textContainer.textContent = selectedText;
    langSelector?.classList.remove("open");
    langButton?.setAttribute("aria-expanded", "false");
    window.MWE?.setLanguage?.(lang);
    applyShellLanguage(lang);
    frame.contentWindow?.MWE?.setLanguage?.(lang);
    frame.contentWindow?.postMessage({ type: "mwe-language", lang }, window.location.origin);
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
    const currentTheme = document.documentElement.dataset.theme || "light";
    const currentPrimary = document.documentElement.dataset.primary || "blue";
    frame.contentWindow?.postMessage({ type: "mwe-theme", theme: currentTheme }, window.location.origin);
    frame.contentWindow?.postMessage({ type: "mwe-primary-color", primaryColor: currentPrimary }, window.location.origin);
    frame.contentWindow?.MWE?.setLanguage?.(currentMemberLanguage);
    frame.contentWindow?.postMessage({ type: "mwe-language", lang: currentMemberLanguage }, window.location.origin);
  });
  window.addEventListener("message", event => {
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
    const message = event.data || {};
    if (message.type === "mwe:profile-updated" && message.user) {
      window.MWEAuth?.applySession(message.user).then(syncMemberIdentity);
      return;
    }
    if (message.type === "faithlink:fullscreen" || message.type === "mwe-fullscreen") {
      document.body.classList.toggle("member-shell-fullscreen", !!message.fullscreen);
      return;
    }
    if (message.type !== "faithlink:navigate") return;
    if (message.leaveShell && message.href) {
      const destination = new URL(message.href, window.location.href);
      if (destination.origin !== window.location.origin || !["http:", "https:"].includes(destination.protocol)) return;
      window.location.href = destination.href;
      return;
    }
    if (!views[message.view]) return;
    loadRoute({ view: message.view, id: message.id || "", q: message.q || "" });
  });

  window.addEventListener("popstate", () => loadRoute(getRoute(), { history: false }));
  window.addEventListener("resize", placeResponsiveActions);
  window.addEventListener("DOMContentLoaded", placeResponsiveActions);

  placeResponsiveActions();
  syncMemberIdentity();
  loadRoute(getRoute(), { history: false });
  window.lucide?.createIcons();
})();
