(function initFaithLinkMemberShell() {
  const frame = document.getElementById("member-shell-frame");
  const loading = document.getElementById("member-shell-loading");
  const rail = document.getElementById("member-shell-rail");
  const mobileMenu = document.getElementById("member-mobile-menu");
  const accountButton = document.getElementById("member-account-button");
  const accountMenu = document.getElementById("member-account-menu");
  const shellSearch = document.getElementById("member-shell-search");

  if (!frame) return;

  const views = {
    directory: { source: "churches.html", title: "Church Directory" },
    groups: { source: "churches.html", title: "Groups & Community" },
    events: { source: "events.html", title: "Events" },
    livestream: { source: "livestream.html", title: "Livestreams" },
    church: { source: "church-profile.html", title: "Church Profile" },
    event: { source: "event-profile.html", title: "Event Details" },
    giving: { source: "donate.html", title: "Giving" },
    resources: { source: "foundation.html", title: "Resources" }
  };

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
      q: params.get("q") || ""
    };
  }

  function buildSource(route) {
    const definition = views[route.view] || views.directory;
    const source = new URL(definition.source, window.location.href);
    source.searchParams.set("embed", "1");
    if (route.id) source.searchParams.set("id", route.id);
    if (route.q) source.searchParams.set("q", route.q);
    return source.toString();
  }

  function buildShellUrl(route) {
    const target = new URL("app.html", window.location.href);
    target.searchParams.set("view", route.view);
    if (route.id) target.searchParams.set("id", route.id);
    if (route.q) target.searchParams.set("q", route.q);
    return `${target.pathname.split("/").pop()}${target.search}`;
  }

  function setActiveNavigation(view) {
    document.querySelectorAll("[data-shell-view]").forEach(link => {
      const linkView = link.dataset.shellView;
      const isActive = linkView === view || (view === "church" && linkView === "directory") || (view === "event" && linkView === "events");
      link.classList.toggle("active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function loadRoute(route, options = {}) {
    const safeRoute = views[route.view] ? route : { view: "directory", id: "", q: "" };
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

  shellSearch?.addEventListener("submit", event => {
    event.preventDefault();
    const q = new FormData(shellSearch).get("q")?.toString().trim() || "";
    loadRoute({ view: "directory", id: "", q });
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

  loadRoute(getRoute(), { history: false });
  window.lucide?.createIcons();
})();
