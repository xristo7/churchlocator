// Shows the play-as-live settings mount to people who manage a church.
// A church manager is a platform owner, or an owner/editor on the church's tenant
// (the workspace API reports this as canManage). The panel ships in simulated-live-settings.js.
(async function () {
  const platform = window.MWEPlatform;
  const note = document.getElementById("cs-live-note");
  if (!platform) return;
  await platform.ready;

  function managedChurchId() {
    if (!platform.session || !platform.records) return "";
    const churches = platform.records("churches", true).filter(record => record.canManage && record.id);
    const wanted = new URLSearchParams(location.search).get("church");
    return (churches.find(record => record.id === wanted) || churches[0])?.id || "";
  }

  function sync() {
    const mount = document.getElementById("simulated-live-settings");
    if (!mount) return;
    const churchId = managedChurchId();
    if (!churchId) {
      mount.hidden = true;
      if (note) note.textContent = platform.session
        ? "Play as live is only available for a church you manage."
        : "Sign in from the creator workspace to set up play as live.";
      return;
    }
    if (note) note.hidden = true;
    if (mount.dataset.churchId !== churchId) {
      const fresh = document.createElement("section");
      fresh.id = "simulated-live-settings";
      fresh.dataset.churchId = churchId;
      mount.replaceWith(fresh);
      return;
    }
    mount.hidden = false;
  }

  window.addEventListener("mwe-platform-ready", sync);
  sync();
})();
