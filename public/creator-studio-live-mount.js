// Shows the "play as live" settings mount in Creator Studio to people who manage a church.
// A church manager is a platform owner, or an owner/editor on the tenant that owns the church
// (the workspace API reports this as canManage). The panel itself ships in simulated-live-settings.js.
(async function () {
  const platform = window.MWEPlatform;
  if (!platform) return;
  await platform.ready;
  const root = document.getElementById("creator-studio");

  function managedChurchId() {
    if (!platform.session || !platform.records) return "";
    const churches = platform.records("churches", true).filter(record => record.canManage && record.id);
    const wanted = new URLSearchParams(location.search).get("church");
    return (churches.find(record => record.id === wanted) || churches[0])?.id || "";
  }

  function sync() {
    const mount = document.getElementById("simulated-live-settings");
    if (!mount) return;
    const inEditor = !!root?.querySelector(".cs-editor-shell");
    const churchId = inEditor ? "" : managedChurchId();
    if (!churchId) { mount.hidden = true; return; }
    if (mount.dataset.churchId !== churchId) {
      // Insert a fresh node so the panel script, which watches for the mount being added, attaches with the right church.
      const fresh = document.createElement("section");
      fresh.id = "simulated-live-settings";
      fresh.dataset.churchId = churchId;
      mount.replaceWith(fresh);
      return;
    }
    mount.hidden = false;
  }

  if (root) new MutationObserver(sync).observe(root, { childList: true });
  window.addEventListener("mwe-platform-ready", sync);
  window.addEventListener("popstate", () => setTimeout(sync));
  sync();
})();
