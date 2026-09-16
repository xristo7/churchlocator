/* Development data only. Server-side identity/ownership is required before deployment. */
(function (root) {
  const storeKey = "mwe.storefronts.v1";
  const accountKey = "mwe.creator.account.v1";
  function account() {
    try { return JSON.parse(localStorage.getItem(accountKey) || "null"); } catch { return null; }
  }
  function setAccount(name, email) {
    const normalized = email.trim().toLowerCase();
    const profile = { id: "local:" + normalized, name: name.trim(), email: normalized };
    localStorage.setItem(accountKey, JSON.stringify(profile));
    localStorage.setItem("mwe.username", profile.name);
    localStorage.setItem("mwe.userLoggedIn", "true");
    return profile;
  }
  const getStores = () => {
    const value = JSON.parse(localStorage.getItem(storeKey) || "[]");
    if (!Array.isArray(value)) throw new Error("Store profiles could not be read.");
    return value;
  };
  const saveStores = records => localStorage.setItem(storeKey, JSON.stringify(records));
  function safeLiveUrl(value) {
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : ""; } catch { return ""; }
  }
  function broadcasts() {
    const churches = root.MWE.getChurches().filter(r => r.livestream?.enabled && safeLiveUrl(r.livestream.url)).map(r => ({ id: r.id, type: "church", name: r.name, url: r.livestream.url, image: r.photo, description: r.city }));
    const channels = root.FaithLinkModules.getChannels().filter(r => r.live && safeLiveUrl(r.liveUrl)).map(r => ({ id: r.id, type: "channel", name: r.name, url: r.liveUrl, image: r.cover, description: r.topic }));
    const stores = getStores().filter(r => r.live && safeLiveUrl(r.liveUrl)).map(r => ({ id: r.id, type: "store", name: r.name, url: r.liveUrl, image: r.image, description: r.description }));
    return [...churches, ...channels, ...stores];
  }
  root.MWECreator = { account, setAccount, getStores, saveStores, safeLiveUrl, broadcasts };
})(window);
