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

  async function applySession(user) {
    if (!user) { clearSession(); return; }
    if (root.MWEPlatform) { await root.MWEPlatform.refresh(user); return; }
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
    root.MWEPlatform?.clear();
    ["mwe.creator.account.v1", "mwe.session.owner.v1", "mwe.session.church.v1", "mwe.eventHost.v1"].forEach(key => localStorage.removeItem(key));
    localStorage.removeItem("mwe.userLoggedIn");
    localStorage.removeItem("mwe.username");
    localStorage.removeItem("mwe.userEmail");
    localStorage.removeItem("mwe.creator_auth");
    localStorage.removeItem("mwe.active_account_email");
  }

  async function register(name, email, password) {
    const result = await callApi("/api/auth/register", { name, email, password });
    if (result.ok) await applySession(result.user);
    return result;
  }

  async function login(email, password) {
    let result = await callApi("/api/auth/login", { email, password });
    if (result.mfaRequired) result = await confirmMfa(result.challenge);
    if (result.ok) await applySession(result.user);
    return result;
  }

  async function logout() {
    const result = await callApi("/api/auth/logout", {});
    if (result.ok) clearSession();
    return result;
  }

  async function session() {
    try {
      const response = await fetch("/api/auth/session", { credentials: "same-origin" });
      const result = await response.json();
      if (response.ok) await applySession(result.user); else clearSession();
      return result;
    } catch {
      clearSession();
      return { ok: false, user: null };
    }
  }

  // Kept for older buttons, but registration never grants creator access.
  // The member chooses to activate creator tools after signing in.
  async function creatorRegister(name, email, password) {
    return register(name, email, password);
  }

  async function creatorUpgrade() {
    const result = await callApi("/api/creator/upgrade", {});
    if (result.ok) await applySession(result.user);
    return result;
  }

  async function confirmMfa(challenge) {
    return new Promise(resolve => {
      const dialog=document.createElement('dialog');
      dialog.style.cssText='width:min(90vw,400px);padding:24px;border-radius:20px;background:var(--surface,#fff);color:var(--text,#111)';
      dialog.innerHTML='<form><h2>Authenticator code</h2><p>Enter the six-digit code from your authenticator.</p><input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required aria-label="Authenticator code" style="width:100%;padding:12px"><p role="alert"></p><button type="submit">Verify</button> <button type="button" data-cancel>Cancel</button></form>';
      const close=()=>{dialog.close();dialog.remove();resolve({ok:false,error:'Sign-in cancelled.'});};
      dialog.querySelector('[data-cancel]').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
      dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const button=dialog.querySelector('[type=submit]');button.disabled=true;const result=await callApi('/api/auth/mfa/confirm',{challenge,code:dialog.querySelector('input').value});button.disabled=false;if(result.ok){dialog.close();dialog.remove();resolve(result);}else dialog.querySelector('[role=alert]').textContent=result.error;};
      document.body.append(dialog);dialog.showModal();dialog.querySelector('input').focus();
    });
  }
  document.addEventListener("DOMContentLoaded", async () => { await root.MWEPlatform?.ready; session().then(result => {
    if (!result.ok || !result.user) clearSession();
    if (typeof root.updateHomepageAuthUI === "function") root.updateHomepageAuthUI();
  }); });

  root.MWEAuth = { register, login, logout, session, creatorRegister, creatorUpgrade, applySession, clearSession };
})(window);
