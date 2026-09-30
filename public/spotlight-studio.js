(async function () {
  const root = document.getElementById("spotlight-studio");
  const platform = window.MWEPlatform;
  const auth = window.MWEAuth;
  await platform?.ready;

  const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
  const icon = name => `<i data-lucide="${name}"></i>`;
  const renderIcons = () => window.lucide?.createIcons();
  const signInUrl = `index.html?login=required&next=${encodeURIComponent("app.html?view=spotlight-studio")}`;

  function accessScreen() {
    const user = platform?.session;
    if (!user) {
      root.innerHTML = `<section class="cs-upgrade"><div class="cs-card-icon">${icon("log-in")}</div><p class="cs-eyebrow">Spotlight Studio</p><h1>Sign in to create for Spotlight.</h1><p>Use your My Way account to prepare vertical stories, save drafts, and submit them for review.</p><a class="cs-primary" href="${signInUrl}" target="_top">Sign in or create an account ${icon("arrow-right")}</a></section>`;
      renderIcons();
      return;
    }
    root.innerHTML = `<section class="cs-upgrade"><div class="cs-card-icon">${icon("sparkles")}</div><p class="cs-eyebrow">Spotlight Studio</p><h1>Turn on creation tools for this account.</h1><p>${esc(user.name || "Member")}, activation lets this account create channels and submit their strongest stories to Spotlight.</p><button class="cs-primary" id="spotlight-studio-upgrade" type="button">Activate creator tools ${icon("arrow-right")}</button><p class="cs-message" id="spotlight-studio-message" hidden></p></section>`;
    document.getElementById("spotlight-studio-upgrade")?.addEventListener("click", async event => {
      const button = event.currentTarget;
      const message = document.getElementById("spotlight-studio-message");
      button.disabled = true;
      button.textContent = "Activating…";
      const result = await auth?.creatorUpgrade();
      if (!result?.ok) {
        message.hidden = false;
        message.className = "cs-message error";
        message.textContent = result?.error || "We could not activate creator tools. Please try again.";
        button.disabled = false;
        button.textContent = "Activate creator tools";
        return;
      }
      await platform.refresh(result.user);
      renderStudio();
    });
    renderIcons();
  }

  function renderStudio() {
    const user = platform?.session;
    if (!user || (!user.isCreator && platform?.role !== "owner")) return accessScreen();
    root.innerHTML = `<div class="creator-studio spotlight-studio"><a class="cs-back" href="app.html?view=create" target="_top">${icon("arrow-left")} All creation tools</a><section class="cs-hero spotlight-studio-hero"><div><p class="cs-eyebrow">Dedicated creation workspace</p><h1>Create a Spotlight story.</h1><p>Build the vertical preview, choose its channel and excerpt, save privately, then submit the exact same story for review and publication.</p></div><div class="spotlight-studio-hero-actions"><a class="spotlight-studio-link" href="app.html?view=spotlight" target="_top">Open Spotlight ${icon("arrow-up-right")}</a><span class="cs-user"><span class="cs-avatar">${esc((user.name || "M").split(/\s+/).map(value => value[0]).join("").slice(0,2))}</span>${esc(user.name || "Member")}</span></div></section><section class="spotlight-studio-workspace" id="spotlight-studio-workspace"></section></div>`;
    renderIcons();
    window.MWESpotlightWorkspace?.render({ target: document.getElementById("spotlight-studio-workspace"), creator: true });
  }

  renderStudio();
})();
