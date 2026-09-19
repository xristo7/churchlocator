(async function initAccountProfile() {
  await window.MWEPlatform?.ready;
  const user = window.MWEPlatform?.session;
  if (!user) {
    const next = encodeURIComponent("app.html?view=profile");
    window.top.location.href = `index.html?login=required&next=${next}`;
    return;
  }

  const detailsForm = document.getElementById("profile-details-form");
  const passwordForm = document.getElementById("profile-password-form");
  const notice = document.getElementById("profile-notice");
  const avatarInput = document.getElementById("profile-avatar-input");
  const avatarImage = document.getElementById("profile-avatar-preview");
  const avatarFallback = document.getElementById("profile-avatar-fallback");
  const removeAvatar = document.getElementById("profile-avatar-remove");
  const currentPasswordWrap = document.getElementById("profile-current-password-wrap");
  const emailHelp = document.getElementById("profile-email-help");
  let avatarUrl = user.avatarUrl || "";
  let savedEmail = user.email || "";

  function initials(name) {
    return String(name || "My Way").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  }

  function drawAvatar() {
    avatarFallback.textContent = initials(detailsForm.elements.name.value || user.name);
    avatarImage.hidden = !avatarUrl;
    avatarFallback.hidden = Boolean(avatarUrl);
    if (avatarUrl) avatarImage.src = avatarUrl;
    removeAvatar.disabled = !avatarUrl;
  }

  function showNotice(message, kind = "success") {
    notice.textContent = message;
    notice.dataset.kind = kind;
    notice.hidden = false;
    notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function setBusy(form, busy) {
    form.setAttribute("aria-busy", String(busy));
    form.querySelectorAll("button, input").forEach(control => { control.disabled = busy; });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That image could not be opened.")); };
      image.src = url;
    });
  }

  async function resizeAvatar(file) {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      throw new Error("Choose a PNG, JPEG, or WebP image under 5 MB.");
    }
    const image = await loadImage(file);
    const size = Math.min(512, Math.max(image.naturalWidth, image.naturalHeight));
    const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
    return canvas.toDataURL("image/jpeg", 0.84);
  }

  detailsForm.elements.name.value = user.name || "";
  detailsForm.elements.email.value = user.email || "";
  const managedByGoogle = user.hasPassword === false;
  detailsForm.elements.email.readOnly = managedByGoogle;
  currentPasswordWrap.hidden = true;
  if (managedByGoogle) emailHelp.textContent = "Your sign-in email is managed by Google.";
  document.getElementById("profile-password-fields").hidden = managedByGoogle;
  document.getElementById("profile-google-password").hidden = !managedByGoogle;
  drawAvatar();

  detailsForm.elements.name.addEventListener("input", drawAvatar);
  detailsForm.elements.email.addEventListener("input", () => {
    currentPasswordWrap.hidden = managedByGoogle || detailsForm.elements.email.value.trim().toLowerCase() === savedEmail.toLowerCase();
  });
  avatarInput.addEventListener("change", async () => {
    const file = avatarInput.files?.[0];
    if (!file) return;
    try { avatarUrl = await resizeAvatar(file); drawAvatar(); }
    catch (error) { showNotice(error.message, "error"); }
    finally { avatarInput.value = ""; }
  });
  removeAvatar.addEventListener("click", () => { avatarUrl = ""; drawAvatar(); });

  detailsForm.addEventListener("submit", async event => {
    event.preventDefault();
    setBusy(detailsForm, true);
    try {
      const result = await window.MWEAuth.updateProfile({
        name: detailsForm.elements.name.value,
        email: detailsForm.elements.email.value,
        avatarData: avatarUrl,
        currentPassword: detailsForm.elements.currentPassword.value
      });
      if (!result.ok) throw new Error(result.error || "Your profile could not be saved.");
      savedEmail = result.user.email;
      detailsForm.elements.currentPassword.value = "";
      currentPasswordWrap.hidden = true;
      window.parent.postMessage({ type: "mwe:profile-updated", user: result.user }, window.location.origin);
      showNotice("Your profile has been updated.");
    } catch (error) {
      showNotice(error.message, "error");
    } finally { setBusy(detailsForm, false); }
  });

  passwordForm.addEventListener("submit", async event => {
    event.preventDefault();
    const currentPassword = passwordForm.elements.currentPassword.value;
    const newPassword = passwordForm.elements.newPassword.value;
    const confirmPassword = passwordForm.elements.confirmPassword.value;
    if (newPassword !== confirmPassword) { showNotice("The new passwords do not match.", "error"); return; }
    setBusy(passwordForm, true);
    try {
      const result = await window.MWEAuth.changePassword(currentPassword, newPassword);
      if (!result.ok) throw new Error(result.error || "Your password could not be updated.");
      passwordForm.reset();
      showNotice("Your password has been updated.");
    } catch (error) {
      showNotice(error.message, "error");
    } finally { setBusy(passwordForm, false); }
  });

  document.querySelectorAll("[data-password-toggle]").forEach(button => button.addEventListener("click", () => {
    const input = button.closest(".account-password-field").querySelector("input");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-label", show ? "Hide password" : "Show password");
    button.innerHTML = `<i data-lucide="${show ? "eye-off" : "eye"}"></i>`;
    window.lucide?.createIcons();
  }));

  window.lucide?.createIcons();
})();
