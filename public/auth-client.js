/*
 * Real backend-backed authentication client.
 * Talks to /api/auth/* and /api/creator/* (Cloudflare Worker + D1) and mirrors
 * the resulting session into the same localStorage keys the rest of the app
 * already reads, so existing UI code needs no further changes.
 */
(function (root) {
  // Temporary launch-mode bypass. Keep this switch centralized so normal
  // backend authentication can be restored without rewriting login screens.
  const TEMPORARY_AUTH_BYPASS = true;

  function temporaryUser(email) {
    const normalizedEmail = String(email || "temporary@access.local").trim().toLowerCase();
    const safeEmail = normalizedEmail.includes("@") ? normalizedEmail : "temporary@access.local";
    return {
      id: "temporary:" + safeEmail,
      name: safeEmail.split("@")[0] || "Temporary Access",
      email: safeEmail,
      isCreator: true
    };
  }

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
    if (!user) return;
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
    if (TEMPORARY_AUTH_BYPASS) {
      const user = temporaryUser(email);
      applySession(user);
      return { ok: true, user, authenticationBypassed: true };
    }
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
    if (TEMPORARY_AUTH_BYPASS && localStorage.getItem("mwe.userLoggedIn") === "true") {
      return {
        ok: true,
        user: temporaryUser(localStorage.getItem("mwe.userEmail")),
        authenticationBypassed: true
      };
    }
    try {
      const response = await fetch("/api/auth/session", { credentials: "same-origin" });
      return await response.json();
    } catch {
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

  root.MWEAuth = { register, login, logout, session, creatorRegister, creatorUpgrade, applySession, clearSession };
})(window);
