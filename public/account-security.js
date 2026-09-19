(async function () {
  await window.MWEPlatform.ready;
  const $ = id => document.getElementById(id);
  const api = window.MWEPlatform.api;
  const params = new URLSearchParams(location.hash.slice(1));
  const token = params.get("token");
  const purpose = params.get("purpose");

  if (token) history.replaceState(null, "", location.pathname);

  const esc = text => String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function notify(text, kind = "info") {
    const el = $("security-notice");
    if (!el) return;
    el.textContent = text || "";
    el.dataset.kind = kind;
    el.hidden = !text;
    if (text) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function action(fn) {
    try {
      await fn();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function draw() {
    const user = window.MWEPlatform.session;
    const controls = $("security-controls");
    const authForms = $("security-auth-forms");
    const signinForm = $("security-signin");

    if (controls) controls.hidden = !user;
    if (authForms) authForms.hidden = !!user;
    if (signinForm) signinForm.hidden = !!user;

    if (!user) {
      window.lucide?.createIcons();
      return;
    }

    const info = await api("auth/security");
    const verifiedBadge = info.emailVerified
      ? '<span class="account-security-tag tag-success">Email verified</span>'
      : '<span class="account-security-tag tag-warning">Email unverified</span>';
    const mfaBadge = info.mfaEnabled
      ? '<span class="account-security-tag tag-success">2FA active</span>'
      : '<span class="account-security-tag tag-muted">2FA off</span>';

    $("security-summary").innerHTML = "<strong>" + esc(user.email) + "</strong><br>" + verifiedBadge + mfaBadge;

    $("security-verify").disabled = info.emailVerified || !info.emailConfigured;
    $("security-enroll").disabled = !info.emailVerified || info.mfaEnabled;
    $("security-sessions").textContent = info.sessions.length + " active session(s).";

    if (!info.emailConfigured) {
      notify("Verification and recovery await account email configuration.", "warning");
    }

    window.lucide?.createIcons();
  }

  const backLink = $("security-back-link");
  if (backLink) {
    backLink.addEventListener("click", event => {
      if (window.parent !== window) {
        event.preventDefault();
        window.parent.postMessage({ type: "faithlink:navigate", view: "profile" }, window.location.origin);
      }
    });
  }

  const signin = $("security-signin");
  if (signin) {
    signin.onsubmit = event => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form));
      action(async () => {
        const result = await window.MWEAuth.login(data.email, data.password);
        form.elements.password.value = "";
        if (!result.ok) throw new Error(result.error);
        await draw();
        notify("Signed in successfully.", "success");
      });
    };
  }

  const recovery = $("security-recovery");
  if (recovery) {
    recovery.onsubmit = event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      action(async () => {
        const res = await api("auth/password/request", data);
        notify(res.message, "success");
      });
    };
  }

  const resetForm = $("security-reset");
  if (resetForm) {
    resetForm.hidden = !(token && purpose === "reset");
    resetForm.onsubmit = event => {
      event.preventDefault();
      const form = event.currentTarget;
      action(async () => {
        const res = await api("auth/password/reset", { token, password: form.elements.password.value });
        notify(res.message, "success");
        form.reset();
        form.hidden = true;
        window.MWEAuth.clearSession();
        await draw();
      });
    };
  }

  const verifyBtn = $("security-verify");
  if (verifyBtn) {
    verifyBtn.onclick = () => action(async () => {
      const res = await api("auth/verification/request", {});
      notify(res.message, "success");
    });
  }

  const enrollBtn = $("security-enroll");
  if (enrollBtn) {
    enrollBtn.onclick = () => action(async () => {
      const result = await api("auth/security/mfa/enroll", {});
      $("security-secret").textContent = result.secret;
      $("security-enrollment").hidden = false;
    });
  }

  const activateForm = $("security-activate");
  if (activateForm) {
    activateForm.onsubmit = event => {
      event.preventDefault();
      const form = event.currentTarget;
      action(async () => {
        await api("auth/security/mfa/activate", { code: form.elements.code.value });
        $("security-secret").textContent = "";
        $("security-enrollment").hidden = true;
        form.reset();
        await window.MWEAuth.session();
        await draw();
        notify("Authenticator enabled successfully.", "success");
      });
    };
  }

  const revokeBtn = $("security-revoke");
  if (revokeBtn) {
    revokeBtn.onclick = () => action(async () => {
      await api("auth/security/revoke-sessions", {});
      window.MWEAuth.clearSession();
      await draw();
      notify("All sessions signed out.", "success");
    });
  }

  if (token && purpose === "verify") {
    await action(async () => {
      const res = await api("auth/verification/confirm", { token });
      notify(res.message, "success");
      await window.MWEAuth.session();
    });
  }

  await action(draw);
  window.MWEPlatform.legacyControls?.($("security-legacy"), $("security-export"), $("security-clear-legacy"));
  window.lucide?.createIcons();
})();
