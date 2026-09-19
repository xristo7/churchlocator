document.addEventListener("DOMContentLoaded", async () => {
  await window.MWEPlatform?.ready;
  const form = document.querySelector("[data-creator-account-form]");
  if (!form) return;
  const account = window.MWECreator.account();
  const publicEmail = (localStorage.getItem("mwe.userEmail") || "").trim().toLowerCase();
  const accountEmail = (account?.email || "").trim().toLowerCase();
  const hasMatchingSession = localStorage.getItem("mwe.userLoggedIn") === "true" && !!publicEmail && publicEmail === accountEmail;
  document.body.classList.toggle("is-authenticated", hasMatchingSession);
  if (!hasMatchingSession && localStorage.getItem("mwe.userLoggedIn") === "true") {
    localStorage.removeItem("mwe.session.church.v1");
  }
  const esc = str => String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  window.MWEAuth?.session().then(result => {
    if (result.ok && result.user?.isCreator) {
      document.body.classList.add("is-authenticated");
      return;
    }
    if (result.ok && result.user && !result.user.isCreator) {
      const user = result.user;
      const modeBtn = document.getElementById("creator-account-mode");
      if (modeBtn) modeBtn.style.display = "none";
      const displayName = user.name || (user.email ? user.email.split("@")[0] : "Member");
      const initials = displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "MW";

      form.innerHTML = `
        <div class="creator-upgrade-profile-badge" style="margin-bottom: 16px;">
          <div class="creator-upgrade-avatar">${initials}</div>
          <div class="creator-upgrade-details">
            <div class="creator-upgrade-greeting">Logged in as <strong>${esc(displayName)}</strong></div>
            <div class="creator-upgrade-email">${esc(user.email || "")}</div>
          </div>
          <span class="creator-upgrade-status-pill"><i data-lucide="badge-check"></i> Member</span>
        </div>
        <p style="font-size:0.92rem;color:var(--text-secondary,#64748b);line-height:1.5;margin-bottom:18px;">
          Your account is currently a Member account. Click below to upgrade to Creator and unlock this workspace without creating new credentials.
        </p>
        <button class="aw-button aw-primary" type="submit" id="aw-upgrade-submit" style="width:100%;">
          <i data-lucide="sparkles"></i> Upgrade to Creator &amp; Continue
        </button>
      `;
      if (window.lucide) window.lucide.createIcons();

      form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById("aw-upgrade-submit");
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Upgrading...`;
          if (window.lucide) window.lucide.createIcons();
        }
        const up = await window.MWEAuth.creatorUpgrade();
        if (up.ok) {
          window.MWECreator.setAccount(up.user.name || displayName, up.user.email || user.email);
          localStorage.setItem("mwe.userEmail", (up.user.email || user.email).trim().toLowerCase());
          document.body.classList.add("is-authenticated");
          window.dispatchEvent(new HashChangeEvent("hashchange"));
          window.showToast("Welcome to Creator Workspace!");
        } else {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="sparkles"></i> Upgrade to Creator &amp; Continue`;
            if (window.lucide) window.lucide.createIcons();
          }
          window.showToast(up.error || "Upgrade failed.");
        }
      };
    }
  });
  let signingIn = false;
  document.getElementById("creator-account-mode").addEventListener("click", event => {
    signingIn = !signingIn;
    form.elements.name.required = !signingIn;
    form.elements.name.closest("label").hidden = signingIn;
    form.querySelector('[type="submit"]').textContent = signingIn ? "Sign in & continue" : "Create account & continue";
    event.currentTarget.textContent = signingIn ? "New here? Create an account" : "Already have an account? Sign in";
    form.elements.password.autocomplete = signingIn ? "current-password" : "new-password";
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const errorEl = document.querySelector("[data-creator-account-error]");
    if (errorEl) { errorEl.hidden = true; errorEl.textContent = ""; }

    if (!window.MWEAuth) {
      window.showToast("Account services are unavailable right now. Please reload and try again.");
      return;
    }

    const name = form.elements.name.value;
    const email = form.elements.email.value;
    const password = form.elements.password.value;
    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    let result;
    if (signingIn) {
      result = await window.MWEAuth.login(email, password);
      if (result.ok) result = await window.MWEAuth.creatorUpgrade();
    } else {
      result = await window.MWEAuth.creatorRegister(name, email, password);
    }

    if (submitBtn) submitBtn.disabled = false;

    if (!result.ok) {
      const message = result.error || "Something went wrong. Please try again.";
      if (errorEl) { errorEl.textContent = message; errorEl.hidden = false; }
      else window.showToast(message);
      return;
    }

    window.MWECreator.setAccount(result.user.name || name, result.user.email || email);
    localStorage.setItem("mwe.userEmail", (result.user.email || email).trim().toLowerCase());
    form.elements.password.value = "";
    document.body.classList.add("is-authenticated");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    document.getElementById("aw-main").focus();
    window.showToast("Welcome. Choose what you’d like to create.");
  });
  document.querySelector("[data-logout]")?.addEventListener("click", () => {
    if (window.MWEAuth) window.MWEAuth.logout().catch(() => {});
    localStorage.removeItem("mwe.userLoggedIn");
    localStorage.removeItem("mwe.session.church.v1");
    document.body.classList.remove("is-authenticated");
    form.reset();
    form.elements.email.focus();
  });
});
