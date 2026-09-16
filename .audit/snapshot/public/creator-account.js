document.addEventListener("DOMContentLoaded", () => {
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
  window.MWEAuth?.session().then(result => {
    document.body.classList.toggle("is-authenticated", !!result.ok && !!result.user?.isCreator);
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
