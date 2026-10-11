/* Shared mobile bottom tab bar (all pages, <960px). */
(function initMWETabbar() {
  if (window.top !== window.self || document.querySelector(".mwe-tabbar")) return;
  const page = (location.pathname.replace(/\/+$/, "").split("/").pop() || "index").replace(/\.html$/, "") || "index";
  // Immersive full-screen views (short video feed, live/video players) skip the tab bar.
  const immersive = ["reset-password", "spotlight", "spotlight-studio", "live", "livestream", "watch", "broadcast", "channel-live"];
  if (immersive.includes(page)) { document.documentElement.classList.add("mwe-immersive"); return; }
  const svg = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  const tabs = [
    { label: "Home", href: "/", icon: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>'),
      match: ["index", "about", "volunteer", "prayer", "foundation", "donate", "privacy", "terms", "safeguarding"] },
    { label: "Discover", href: "/churches", icon: svg('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
      match: ["churches", "church", "church-profile", "events", "event", "event-profile", "channels", "channel", "channel-detail", "channel-content", "resources", "resource", "resource-detail", "resource-reader", "store", "storefront", "product", "product-detail", "cart", "checkout", "meditation"] },
    { label: "Spotlight", href: "/spotlight", icon: svg('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>'),
      match: ["spotlight", "spotlight-studio", "live", "livestream", "watch", "broadcast", "channel-live", "live-setup"] },
    { label: "Messages", href: "/messages", icon: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.7A8 8 0 1 1 21 12z"/>'),
      match: ["messages"] },
    { label: "Me", href: "/app?view=profile", icon: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
      match: ["app", "member", "member-home", "account-profile", "account-security", "creator-studio", "creator-workspace", "church-portal", "portal", "creator-hub", "owner-dashboard", "admin", "seller-dashboard", "store-manager"] }
  ];
  const bar = document.createElement("nav");
  bar.className = "mwe-tabbar";
  bar.setAttribute("aria-label", "Primary");
  // /app hosts modules via ?view=; map each view to its tab (default view is the church directory).
  const viewTab = { home: "Home", directory: "Discover", churches: "Discover", events: "Discover", channels: "Discover", resources: "Discover",
    store: "Discover", meditation: "Discover", spotlight: "Spotlight", livestream: "Spotlight", live: "Spotlight", messages: "Messages",
    profile: "Me", portal: "Me", giving: "Me", account: "Me", settings: "Me" };
  const activeLabel = () => {
    if (page === "app" || page === "member") {
      const view = new URLSearchParams(location.search).get("view") || "directory";
      return viewTab[view] || "Me";
    }
    const hit = tabs.find((t) => t.match.includes(page));
    return hit ? hit.label : "";
  };
  bar.innerHTML = tabs.map((t) => '<a class="mwe-tab" href="' + t.href + '" data-tab="' + t.label + '">' + t.icon + "<span>" + t.label + "</span></a>").join("");
  const syncActive = () => {
    const label = activeLabel();
    bar.querySelectorAll(".mwe-tab").forEach((a) => (a.dataset.tab === label ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  };
  syncActive();
  ["pushState", "replaceState"].forEach((fn) => {
    const orig = history[fn];
    history[fn] = function (...args) { const r = orig.apply(this, args); syncActive(); return r; };
  });
  window.addEventListener("popstate", syncActive);
  const adjust = () => {
    if (!window.matchMedia("(max-width: 959.98px)").matches) return;
    const vh = window.innerHeight;
    document.querySelectorAll("body *:not(.mwe-tabbar):not(.mwe-tabbar *)").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (cs.position === "fixed") {
        // Bottom-anchored floating UI (toasts, FABs, sticky action bars) sits above the bar.
        if (r.height < vh * 0.6 && vh - r.bottom < 40 && !el.closest(".topbar")) el.classList.add("mwe-lift-above-tabbar");
        // Full-screen fixed panels scrolling internally get bottom room.
        else if (r.height >= vh * 0.9 && /(auto|scroll)/.test(cs.overflowY)) el.classList.add("mwe-clear-tabbar");
      } else if (r.height >= vh * 0.9 && /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4) {
        el.classList.add("mwe-clear-tabbar");
      }
    });
  };
  const mount = () => {
    document.body.append(bar);
    document.body.classList.add("has-mwe-tabbar");
    adjust();
    window.addEventListener("load", () => setTimeout(adjust, 400), { once: true });
  };
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount, { once: true });
})();

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
    "channel-live": { source: "channel-live.html", title: "Channel Live" },
    messages: { source: "messages.html", title: "Messages" },
    profile: { source: "account-profile.html", title: "Profile & Account" },
    security: { source: "account-security.html", title: "Account Security" },
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
    portal: { source: "creator-studio.html", title: "Studio" }
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
    giving: ["Give", "heart-handshake"], messages: ["Messages", "messages-square"], profile: ["Profile", "user-round"], security: ["Security", "shield-check"],
    portal: ["Studio", "sparkles"]
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
    if (route.view === "channel-live" && route.post) source.searchParams.set("session", route.post);
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
      const isActive = linkView === view || (view === "portal" && linkView === "portal") || (view === "church" && linkView === "directory") || (["channel-detail", "channel-content"].includes(view) && linkView === "channels") || (view === "event" && linkView === "events") || (["store-manager", "product", "cart", "checkout"].includes(view) && linkView === "store") || (["resource-detail", "resource-reader"].includes(view) && linkView === "resources") || (view === "security" && linkView === "profile");
      link.classList.toggle("active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function isProtectedView(view) {
    return ["messages", "profile", "security", "store-manager", "cart", "checkout"].includes(view);
  }

  function loadRoute(route, options = {}) {
    const safeRoute = views[route.view] ? route : { view: "directory", id: "", q: "", compose: "" };
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

  const inviteButton = document.getElementById("member-send-invite");
  const invitePopover = document.getElementById("member-invite-popover");
  if (invitePopover && invitePopover.parentElement !== document.body) document.body.append(invitePopover);
  function closeInvitePopover() {
    if (!invitePopover || invitePopover.hidden) return;
    invitePopover.hidden = true;
    inviteButton?.setAttribute("aria-expanded", "false");
  }
  function openInvitePopover() {
    if (!invitePopover || !inviteButton) return;
    invitePopover.hidden = false;
    inviteButton.setAttribute("aria-expanded", "true");
    const inviteUrl = new URL("/churches.html", window.location.origin).href;
    const shareText = "Find a church community with My Way.";
    const encodedUrl = encodeURIComponent(inviteUrl);
    const encodedText = encodeURIComponent(shareText);
    invitePopover.querySelector('[data-share-target="whatsapp"]')?.setAttribute("href", `https://wa.me/?text=${encodedText}%20${encodedUrl}`);
    invitePopover.querySelector('[data-share-target="facebook"]')?.setAttribute("href", `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
    invitePopover.querySelector('[data-share-target="x"]')?.setAttribute("href", `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`);
    invitePopover.querySelector('[data-share-target="telegram"]')?.setAttribute("href", `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`);
    invitePopover.querySelector('[data-share-target="email"]')?.setAttribute("href", `mailto:?subject=${encodeURIComponent("Find a church with My Way")}&body=${encodedText}%20${encodedUrl}`);
  }
  inviteButton?.addEventListener("click", () => invitePopover?.hidden ? openInvitePopover() : closeInvitePopover());
  invitePopover?.querySelector(".member-invite-close")?.addEventListener("click", closeInvitePopover);
  invitePopover?.querySelector('[data-share-target="copy"]')?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(new URL("/churches.html", window.location.origin).href);
      window.MWE?.showMemberToast?.("Church directory link copied");
      closeInvitePopover();
    } catch {
      window.MWE?.showMemberToast?.("Could not copy the link. Please try again.");
    }
  });
  document.addEventListener("click", event => { if (invitePopover && (event.target === invitePopover || (!invitePopover.contains(event.target) && !inviteButton?.contains(event.target)))) closeInvitePopover(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeInvitePopover(); });

    const flagSvgs = {
    en: '<svg class="flag-svg" viewBox="0 0 20 15" width="18" height="13.5" style="border-radius: 2px; flex-shrink: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.15); display: inline-block; vertical-align: middle;"><rect width="20" height="15" fill="#bd3d44"/><path d="M0 2.3h20v2.3H0zm0 4.6h20v2.3H0zm0 4.6h20v2.3H0z" fill="#fff"/><rect width="9" height="8.1" fill="#192f5d"/><circle cx="4.5" cy="4" r="2" fill="#fff"/></svg>',
    fr: '<svg class="flag-svg" viewBox="0 0 20 15" width="18" height="13.5" style="border-radius: 2px; flex-shrink: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.15); display: inline-block; vertical-align: middle;"><rect width="6.67" height="15" fill="#002654"/><rect x="6.67" width="6.66" height="15" fill="#ffffff"/><rect x="13.33" width="6.67" height="15" fill="#ce1126"/></svg>',
    es: '<svg class="flag-svg" viewBox="0 0 20 15" width="18" height="13.5" style="border-radius: 2px; flex-shrink: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.15); display: inline-block; vertical-align: middle;"><rect width="20" height="15" fill="#aa151b"/><rect y="3.75" width="20" height="7.5" fill="#f1bf00"/><circle cx="6" cy="7.5" r="2" fill="#aa151b"/></svg>'
  };
  const languages = { en: "EN", fr: "FR", es: "ES" };
  const shellTranslations = {
    en: { home: "Home", spotlight: "Spotlight", meditation: "Meditation", directory: "Churches", channels: "Channels", events: "Events", livestream: "Live", store: "Store", resources: "Resources", giving: "Give", messages: "Messages", profile: "Profile", security: "Security", portal: "Studio", help: "Help & Support", invite: "Invite a friend", inviteBody: "Help others find their church home.", inviteAction: "Share", loading: "Loading your My Way view…", search: "Search My Way", member: "My Way member", signOut: "Sign out" },
    fr: { home: "Accueil", spotlight: "À la une", meditation: "Méditation", directory: "Églises", channels: "Chaînes", events: "Événements", livestream: "En direct", store: "Boutique", resources: "Ressources", giving: "Faire un don", messages: "Messages", profile: "Profil", security: "Sécurité", portal: "Studio", help: "Aide et assistance", invite: "Inviter un proche", inviteBody: "Aidez d’autres personnes à trouver leur communauté.", inviteAction: "Partager", loading: "Chargement de votre espace My Way…", search: "Rechercher des églises, chaînes, événements…", member: "Membre My Way", signOut: "Se déconnecter" },
    es: { home: "Inicio", spotlight: "Destacados", meditation: "Meditación", directory: "Iglesias", channels: "Canales", events: "Eventos", livestream: "En vivo", store: "Tienda", resources: "Recursos", giving: "Donar", messages: "Mensajes", profile: "Perfil", security: "Seguridad", portal: "Estudio", help: "Ayuda y soporte", invite: "Invitar a alguien", inviteBody: "Ayuda a otras personas a encontrar su comunidad.", inviteAction: "Compartir", loading: "Cargando tu espacio My Way…", search: "Buscar iglesias, canales y eventos…", member: "Miembro de My Way", signOut: "Cerrar sesión" }
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
    loadRoute({ view: message.view, id: message.id || "", q: message.q || "", post: message.post || "", compose: message.compose || "" });
  });

  window.addEventListener("popstate", () => loadRoute(getRoute(), { history: false }));
  window.addEventListener("resize", placeResponsiveActions);
  window.addEventListener("DOMContentLoaded", placeResponsiveActions);

  placeResponsiveActions();
  syncMemberIdentity();
  loadRoute(getRoute(), { history: false });
  window.lucide?.createIcons();
})();

/* Auth UI enhancements: password show/hide, forgot link, loading state (logic untouched). */
(function initMWEAuthEnhance() {
  const eye = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeOff = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.9 17.9A10.4 10.4 0 0 1 12 19C5.5 19 2 12 2 12a18.5 18.5 0 0 1 5.1-5.9M9.9 5.2A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a18.6 18.6 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20"/></svg>';
  const toast = (msg) => (window.MWE && typeof MWE.showMemberToast === "function" ? MWE.showMemberToast(msg) : alert(msg));
  const enhance = (root) => {
    root.querySelectorAll('.signin-dropdown-popover input[type="password"], .member-auth-card input[type="password"]').forEach((input) => {
      if (input.dataset.mweToggle) return;
      input.dataset.mweToggle = "1";
      let wrap = input.closest(".mwe-password-wrap");
      if (!wrap) { wrap = document.createElement("span"); wrap.className = "mwe-password-wrap"; input.parentNode.insertBefore(wrap, input); wrap.append(input); }
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "mwe-password-toggle"; btn.setAttribute("aria-label", "Show password"); btn.innerHTML = eye;
      btn.addEventListener("click", () => {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.innerHTML = show ? eyeOff : eye;
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
        input.focus();
      });
      wrap.append(btn);
    });
    root.querySelectorAll("#nav-dropdown-auth-form").forEach((form) => {
      if (form.querySelector("[data-auth-forgot]")) return;
      const pw = form.querySelector("#nav-auth-password");
      const group = pw && pw.closest(".signin-field-group");
      if (!group) return;
      const link = document.createElement("a");
      link.href = "#"; link.className = "member-auth-forgot nav-auth-forgot"; link.dataset.authForgot = ""; link.textContent = "Forgot password?";
      group.append(link);
      form.addEventListener("submit", () => {
        const b = form.querySelector('[type="submit"]');
        if (!b) return;
        b.setAttribute("aria-busy", "true");
        setTimeout(() => b.removeAttribute("aria-busy"), 8000);
      });
    });
  };
  const forgotPanel = (container) => {
    let panel = container.querySelector(":scope > .mwe-forgot-panel");
    if (panel) return panel;
    panel = document.createElement("form");
    panel.className = "mwe-forgot-panel"; panel.noValidate = true;
    panel.innerHTML = '<h3>Reset your password</h3><p>Enter the email on your account and we\'ll send you a link to choose a new password.</p>' +
      '<p class="member-auth-error" role="alert" hidden></p><p class="mwe-reset-success" role="status" hidden></p>' +
      '<label class="member-auth-field"><span class="member-auth-label">Email</span><input type="email" name="email" autocomplete="email" placeholder="Email address" required /></label>' +
      '<button class="member-auth-submit" type="submit"><span>Send reset link</span></button>' +
      '<button type="button" class="mwe-forgot-back">Back to sign in</button>';
    container.append(panel);
    const err = panel.querySelector(".member-auth-error"), ok = panel.querySelector(".mwe-reset-success"), btn = panel.querySelector('[type="submit"]'), input = panel.querySelector("input");
    panel.querySelector(".mwe-forgot-back").addEventListener("click", () => container.classList.remove("mwe-forgot-mode"));
    panel.addEventListener("submit", async (ev) => {
      ev.preventDefault(); err.hidden = true; ok.hidden = true;
      const email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = "Enter a valid email address."; err.hidden = false; input.focus(); return; }
      btn.disabled = true; btn.setAttribute("aria-busy", "true");
      try {
        const res = await fetch("/api/auth/forgot-password", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) throw new Error("Too many requests. Please wait a minute and try again.");
        if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
        ok.textContent = data.message || "If an account exists for that email, we've sent a reset link.";
        ok.hidden = false;
      } catch (e2) { err.textContent = e2.message; err.hidden = false; }
      finally { btn.disabled = false; btn.removeAttribute("aria-busy"); }
    });
    return panel;
  };
  document.addEventListener("click", (e) => {
    const f = e.target.closest && e.target.closest("[data-auth-forgot]");
    if (!f) return;
    e.preventDefault();
    const container = f.closest(".member-auth-card, .signin-dropdown-popover");
    if (!container) return toast("Open sign in to reset your password.");
    const panel = forgotPanel(container);
    const typed = container.querySelector('input[type="email"]:not(.mwe-forgot-panel input)');
    const input = panel.querySelector("input");
    if (typed && typed.value && !input.value) input.value = typed.value;
    container.classList.add("mwe-forgot-mode");
    setTimeout(() => input.focus(), 50);
  });
  const start = () => {
    enhance(document);
    new MutationObserver((muts) => { if (muts.some((m) => m.addedNodes.length)) enhance(document); }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });
})();

/* Account avatar from the real session: photo -> initials -> generic icon. */
(function initMWEAvatar() {
  const generic = "assets/avatar-generic.svg";
  const initials = (n) => String(n || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const paint = () => {
    const nodes = document.querySelectorAll("[data-mwe-avatar]");
    if (!nodes.length) return;
    const s = window.MWEPlatform && window.MWEPlatform.session;
    const name = (s && (s.name || s.email)) || "";
    nodes.forEach((el) => {
      el.textContent = "";
      const show = (src, label) => { const img = new Image(); img.alt = label; img.referrerPolicy = "no-referrer"; img.src = src; el.append(img); return img; };
      if (s && s.avatarUrl) {
        const img = show(s.avatarUrl, name + " profile picture");
        img.onerror = () => { img.remove(); fallback(); };
      } else fallback();
      function fallback() {
        const ini = initials(s && s.name);
        if (ini) { const sp = document.createElement("span"); sp.textContent = ini; el.append(sp); }
        else show(generic, "");
      }
    });
    document.querySelectorAll("[data-mwe-account-name]").forEach((n) => (n.textContent = s ? (s.name || "My account") : "Sign in"));
  };
  const header = document.querySelector(".member-shell-header");
  if (header && !header.querySelector(":scope > [data-mwe-avatar]")) {
    const a = document.createElement("a");
    a.className = "mwe-avatar"; a.dataset.mweAvatar = ""; a.href = "app.html?view=profile"; a.setAttribute("aria-label", "Your account");
    const menu = header.querySelector(".profile-mobile-menu");
    header.insertBefore(a, menu || null);
  }
  const run = async () => { paint(); try { await (window.MWEPlatform && window.MWEPlatform.ready); } catch (e) {} paint(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true }); else run();
})();

/* Email verification code step (6 boxes, paste, auto-advance, resend timer). */
(function initMWEVerifyStep() {
  const findContainer = () => document.querySelector("#nav-signin-popover:not([hidden])") ||
    document.querySelector(".member-auth-modal.is-open .member-auth-card");
  const build = (container, email) => {
    let panel = container.querySelector(":scope > .mwe-verify-panel");
    if (panel) panel.remove();
    panel = document.createElement("form");
    panel.className = "mwe-verify-panel"; panel.noValidate = true;
    const masked = String(email || "").replace(/^(.{2})[^@]*(@.*)$/, "$1•••$2");
    panel.innerHTML = '<h3>Check your email</h3><p>Enter the 6-digit code we sent to <strong></strong>. It expires in 15 minutes.</p>' +
      '<p class="member-auth-error" role="alert" hidden></p>' +
      '<div class="mwe-code-boxes" role="group" aria-label="Verification code">' +
      Array.from({ length: 6 }, (_, i) => `<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" ${i === 0 ? 'autocomplete="one-time-code"' : 'autocomplete="off"'} aria-label="Digit ${i + 1}" />`).join("") +
      '</div><button class="member-auth-submit" type="submit"><span>Verify email</span></button>' +
      '<div class="mwe-verify-row"><button type="button" class="mwe-resend" disabled>Resend code</button><button type="button" class="mwe-forgot-back">Use a different email</button></div>';
    panel.querySelector("strong").textContent = masked;
    container.append(panel);
    const boxes = [...panel.querySelectorAll(".mwe-code-boxes input")];
    const err = panel.querySelector(".member-auth-error"), btn = panel.querySelector('[type="submit"]'), resend = panel.querySelector(".mwe-resend");
    const value = () => boxes.map((b) => b.value).join("");
    const fill = (digits, start = 0) => { digits.split("").forEach((d, k) => { if (boxes[start + k]) boxes[start + k].value = d; }); const next = boxes.find((b) => !b.value); (next || boxes[5]).focus(); if (value().length === 6) panel.requestSubmit(); };
    boxes.forEach((box, i) => {
      box.addEventListener("input", () => {
        const d = box.value.replace(/\D/g, "");
        box.value = "";
        if (d.length > 1) return fill(d.slice(0, 6 - i), i);
        if (d) { box.value = d; if (boxes[i + 1]) boxes[i + 1].focus(); else if (value().length === 6) panel.requestSubmit(); }
        box.classList.toggle("filled", !!box.value);
      });
      box.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !box.value && boxes[i - 1]) { boxes[i - 1].value = ""; boxes[i - 1].focus(); e.preventDefault(); }
        if (e.key === "ArrowLeft" && boxes[i - 1]) boxes[i - 1].focus();
        if (e.key === "ArrowRight" && boxes[i + 1]) boxes[i + 1].focus();
      });
      box.addEventListener("paste", (e) => { const t = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, ""); if (t) { e.preventDefault(); fill(t.slice(0, 6), 0); } });
    });
    let timer;
    const countdown = (secs) => {
      clearInterval(timer); let left = secs; resend.disabled = true;
      const tick = () => { if (left <= 0) { clearInterval(timer); resend.disabled = false; resend.textContent = "Resend code"; return; } resend.textContent = `Resend in 0:${String(left).padStart(2, "0")}`; left -= 1; };
      tick(); timer = setInterval(tick, 1000);
    };
    countdown(60);
    resend.addEventListener("click", async () => {
      err.hidden = true; resend.disabled = true;
      const r = await (window.MWEAuth ? MWEAuth.resendVerification(email) : Promise.resolve({ ok: false }));
      countdown(Number(r.cooldown) || 60);
      if (!r.ok) { err.textContent = r.error || "Couldn't resend right now."; err.hidden = false; }
    });
    panel.querySelector(".mwe-forgot-back").addEventListener("click", () => { clearInterval(timer); container.classList.remove("mwe-verify-mode"); panel.remove(); });
    panel.addEventListener("submit", async (e) => {
      e.preventDefault(); err.hidden = true;
      const code = value();
      if (code.length !== 6) { err.textContent = "Enter all 6 digits."; err.hidden = false; (boxes.find((b) => !b.value) || boxes[0]).focus(); return; }
      btn.disabled = true; btn.setAttribute("aria-busy", "true");
      const r = await (window.MWEAuth ? MWEAuth.verifyEmail(email, code) : Promise.resolve({ ok: false, error: "Sign-in is unavailable." }));
      btn.disabled = false; btn.removeAttribute("aria-busy");
      if (!r.ok) {
        err.textContent = r.error || "That code is incorrect."; err.hidden = false;
        panel.querySelector(".mwe-code-boxes").classList.add("shake"); setTimeout(() => panel.querySelector(".mwe-code-boxes").classList.remove("shake"), 400);
        boxes.forEach((b) => { b.value = ""; b.classList.remove("filled"); }); boxes[0].focus();
        return;
      }
      clearInterval(timer);
      panel.innerHTML = '<h3>Email verified</h3><p class="mwe-reset-success" role="status">You\'re all set. Signing you in…</p>';
      setTimeout(() => window.location.reload(), 900);
    });
    container.classList.remove("mwe-forgot-mode");
    container.classList.add("mwe-verify-mode");
    setTimeout(() => boxes[0].focus(), 60);
  };
  window.addEventListener("mwe-verification-required", (e) => {
    const email = e.detail && e.detail.email;
    let container = findContainer();
    if (!container && window.MWE && typeof MWE.openMemberLogin === "function") { MWE.openMemberLogin(location.pathname + location.search); container = findContainer(); }
    if (container) build(container, email);
  });
  window.MWEShowVerifyStep = (email) => window.dispatchEvent(new CustomEvent("mwe-verification-required", { detail: { email } }));
})();

/* Testimonies: swipe carousel (mobile 85% cards; desktop keeps its columns) with arrows, dots, drag, Read more. */
(function initMWETestimonyCarousel() {
  const SEL = ".testimonials-grid, .testimonies-grid, .testimony-grid";
  const chev = (d) => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  const setup = (grid) => {
    const cards = [...grid.querySelectorAll(":scope > .testimony-card")];
    let nav = grid.nextElementSibling && grid.nextElementSibling.classList.contains("mwe-carousel-nav") ? grid.nextElementSibling : null;
    if (cards.length < 2) { if (nav) nav.remove(); grid.classList.remove("mwe-testimony-carousel"); return; }
    if (!grid.classList.contains("mwe-testimony-carousel")) {
      const cs = getComputedStyle(grid);
      const cols = cs.display.includes("grid") ? cs.gridTemplateColumns.split(" ").filter(Boolean).length : 3;
      grid.style.setProperty("--mwe-tcols", String(Math.max(1, Math.min(4, cols))));
      grid.style.setProperty("--mwe-tgap", (parseFloat(cs.columnGap) || 20) + "px");
      grid.classList.add("mwe-testimony-carousel");
    }
    if (!nav) {
      nav = document.createElement("div"); nav.className = "mwe-carousel-nav";
      nav.innerHTML = '<button type="button" class="mwe-carousel-arrow" data-dir="-1" aria-label="Previous stories">' + chev("m15 18-6-6 6-6") + '</button><div class="mwe-carousel-dots" aria-hidden="true"></div><button type="button" class="mwe-carousel-arrow" data-dir="1" aria-label="Next stories">' + chev("m9 18 6-6-6-6") + "</button>";
      grid.after(nav);
      nav.addEventListener("click", (e) => { const b = e.target.closest(".mwe-carousel-arrow"); if (!b) return; const w = cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(grid).columnGap || 16); grid.scrollBy({ left: Number(b.dataset.dir) * w, behavior: "smooth" }); });
    }
    const dots = nav.querySelector(".mwe-carousel-dots");
    const sync = () => {
      const live = [...grid.querySelectorAll(":scope > .testimony-card")];
      const step = (live[0] ? live[0].getBoundingClientRect().width : 1) + parseFloat(getComputedStyle(grid).columnGap || 16);
      const perView = Math.max(1, Math.round((grid.clientWidth + 4) / step));
      const pages = Math.max(1, live.length - perView + 1);
      if (dots.children.length !== pages) dots.innerHTML = Array.from({ length: pages }, () => "<span></span>").join("");
      const i = Math.min(pages - 1, Math.round(grid.scrollLeft / step));
      [...dots.children].forEach((d, k) => d.classList.toggle("on", k === i));
      const max = grid.scrollWidth - grid.clientWidth - 2;
      nav.querySelector('[data-dir="-1"]').disabled = grid.scrollLeft <= 2;
      nav.querySelector('[data-dir="1"]').disabled = grid.scrollLeft >= max;
      nav.hidden = pages < 2;
    };
    if (!grid.dataset.mweCarousel) {
      grid.dataset.mweCarousel = "1";
      grid.addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
      window.addEventListener("resize", () => requestAnimationFrame(sync));
      let down = null, moved = false;
      grid.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" || e.button !== 0) return; down = { x: e.clientX, left: grid.scrollLeft }; moved = false; });
      window.addEventListener("pointermove", (e) => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 5) { moved = true; grid.classList.add("mwe-dragging"); grid.scrollLeft = down.left - dx; } });
      window.addEventListener("pointerup", () => { if (!down) return; down = null; if (grid.classList.contains("mwe-dragging")) { grid.classList.remove("mwe-dragging"); const step = cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(grid).columnGap || 16); grid.scrollTo({ left: Math.round(grid.scrollLeft / step) * step, behavior: "smooth" }); } });
      grid.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
      grid.addEventListener("dragstart", (e) => e.preventDefault());
    }
    sync();
    cards.forEach((card) => {
      const text = card.querySelector(".testimony-text");
      if (!text || text.dataset.mweClamp) return;
      text.dataset.mweClamp = "1";
      requestAnimationFrame(() => {
        if (text.scrollHeight <= text.clientHeight + 2) return;
        const b = document.createElement("button");
        b.type = "button"; b.className = "mwe-read-more"; b.textContent = "Read more";
        b.addEventListener("click", () => { const open = card.classList.toggle("mwe-expanded"); b.textContent = open ? "Show less" : "Read more"; });
        text.after(b);
      });
    });
  };
  const scan = () => document.querySelectorAll(SEL).forEach(setup);
  const start = () => {
    scan();
    new MutationObserver((m) => { if (m.some((x) => x.addedNodes.length && x.target.matches && x.target.matches(SEL))) scan(); })
      .observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
