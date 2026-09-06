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
  let signingIn = false;
  document.getElementById("creator-account-mode").addEventListener("click", event => {
    signingIn = !signingIn;
    form.elements.name.required = !signingIn;
    form.elements.name.closest("label").hidden = signingIn;
    form.querySelector('[type="submit"]').textContent = signingIn ? "Sign in & continue" : "Create account & continue";
    event.currentTarget.textContent = signingIn ? "New here? Create an account" : "Already have an account? Sign in";
    form.elements.password.autocomplete = signingIn ? "current-password" : "new-password";
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try {
      const email = form.elements.email.value;
      const existing = window.MWECreator.account();
      const name = signingIn ? (existing?.email === email.trim().toLowerCase() ? existing.name : email.split("@")[0]) : form.elements.name.value;
      window.MWECreator.setAccount(name, email);
      localStorage.setItem("mwe.userEmail", email.trim().toLowerCase());
      form.elements.password.value = "";
      document.body.classList.add("is-authenticated");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      document.getElementById("aw-main").focus();
      window.showToast("Welcome. Choose what you’d like to create.");
    } catch {
      window.showToast("Browser storage is unavailable. Your account was not created.");
    }
  });
  document.querySelector("[data-logout]")?.addEventListener("click", () => {
    localStorage.removeItem("mwe.userLoggedIn");
    localStorage.removeItem("mwe.session.church.v1");
    document.body.classList.remove("is-authenticated");
    form.reset();
    form.elements.email.focus();
  });
});
