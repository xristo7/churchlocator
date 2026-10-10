(function initResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  // Drop the token from the address bar and history once read.
  if (token && window.history.replaceState) window.history.replaceState(null, "", window.location.pathname);
  const form = document.getElementById("reset-password-form");
  const pw = document.getElementById("reset-new-password");
  const confirm = document.getElementById("reset-confirm-password");
  const error = document.getElementById("reset-error");
  const submit = document.getElementById("reset-submit");
  const fill = document.getElementById("reset-strength-fill");
  const label = document.getElementById("reset-strength-label");
  const done = document.getElementById("reset-done");
  const showError = (msg) => { error.textContent = msg; error.hidden = false; };

  function strength(value) {
    if (value.length < 15) return { score: Math.min(1, value.length / 15) * 0.25, text: `Too short (${value.length}/15)` };
    let score = 0.5;
    if (value.length >= 20) score += 0.2;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 0.1;
    if (/\d/.test(value)) score += 0.1;
    if (/[^A-Za-z0-9]/.test(value) || /\s/.test(value)) score += 0.1;
    return { score: Math.min(1, score), text: score >= 0.8 ? "Strong" : score >= 0.6 ? "Good" : "Okay" };
  }
  pw.addEventListener("input", () => {
    const s = strength(pw.value);
    fill.style.width = `${Math.round(s.score * 100)}%`;
    fill.dataset.level = s.score >= 0.8 ? "strong" : s.score >= 0.5 ? "ok" : "weak";
    label.textContent = s.text;
  });

  if (!token) {
    showError("This reset link is missing its token. Request a new link from the sign-in screen.");
    submit.disabled = true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.hidden = true;
    if (pw.value.length < 15) return showError("Your new password must be at least 15 characters.");
    if (pw.value !== confirm.value) return showError("The two passwords don't match.");
    submit.disabled = true; submit.setAttribute("aria-busy", "true");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword: pw.value })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "We couldn't reset your password. Please try again.");
      form.hidden = true;
      document.querySelector("[data-reset-intro]").hidden = true;
      document.getElementById("reset-title").textContent = "Password updated";
      done.hidden = false;
    } catch (err) {
      showError(err.message);
    } finally {
      submit.disabled = false; submit.removeAttribute("aria-busy");
    }
  });
})();
