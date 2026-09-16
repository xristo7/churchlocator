/*
 * Real backend-backed authentication client.
 * Talks to /api/auth/* and /api/creator/* (Cloudflare Worker + D1) and mirrors
 * the resulting session into the same localStorage keys the rest of the app
 * already reads, so existing UI code needs no further changes.
 */
(function (root) {
  async function callApi(path, body) {
    let response;
    try {
      response = await fetch(path, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body || {})
      });
    } catch {
      return { ok: false, error: "Could not reach the server. Check your connection and try again." };
    }

    let data;
    try {
      data = await response.json();
    } catch {
      data = { ok: false, error: "Unexpected server response." };
    }
    if (!response.ok && !("ok" in data)) data.ok = false;
    return data;
  }

  function applySession(user) {
    if (!user) { clearSession(); return; }
    if ((localStorage.getItem("mwe.userEmail") || "").toLowerCase() !== (user.email || "").toLowerCase()) clearSession();
    if (!user.isCreator) localStorage.removeItem("mwe.creator.account.v1");
    localStorage.setItem("mwe.userLoggedIn", "true");
    localStorage.setItem("mwe.username", user.name || (user.email ? user.email.split("@")[0] : "Member"));
    localStorage.setItem("mwe.userEmail", (user.email || "").toLowerCase());
    if (user.isCreator) {
      localStorage.setItem(
        "mwe.creator.account.v1",
        JSON.stringify({ id: user.id, name: user.name, email: user.email })
      );
    }
  }

  function clearSession() {
    ["mwe.creator.account.v1", "mwe.session.owner.v1", "mwe.session.church.v1", "mwe.eventHost.v1"].forEach(key => localStorage.removeItem(key));
    localStorage.removeItem("mwe.userLoggedIn");
    localStorage.removeItem("mwe.username");
    localStorage.removeItem("mwe.userEmail");
    localStorage.removeItem("mwe.creator_auth");
    localStorage.removeItem("mwe.active_account_email");
  }

  async function register(name, email, password) {
    const result = await callApi("/api/auth/register", { name, email, password });
    if (result.ok) applySession(result.user);
    return result;
  }

  async function login(email, password) {
    const result = await callApi("/api/auth/login", { email, password });
    if (result.ok) applySession(result.user);
    return result;
  }

  async function logout() {
    const result = await callApi("/api/auth/logout", {});
    clearSession();
    return result;
  }

  async function session() {
    try {
      const response = await fetch("/api/auth/session", { credentials: "same-origin" });
      const result = await response.json();
      if (response.ok) applySession(result.user); else clearSession();
      return result;
    } catch {
      clearSession();
      return { ok: false, user: null };
    }
  }

  async function creatorRegister(name, email, password) {
    const result = await callApi("/api/creator/register", { name, email, password });
    if (result.ok) applySession(result.user);
    return result;
  }

  async function creatorUpgrade() {
    const result = await callApi("/api/creator/upgrade", {});
    if (result.ok) applySession(result.user);
    return result;
  }

  document.addEventListener("DOMContentLoaded", () => { session().then(result => { if (!result.ok || !result.user) clearSession(); }); });

  root.MWEAuth = { register, login, logout, session, creatorRegister, creatorUpgrade, applySession, clearSession };
})(window);
