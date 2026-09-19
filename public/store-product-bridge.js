/* Bridges product-detail (FaithLinkModules + MWEPlatform.ready) onto MWEStore. */
(function (root) {
  'use strict';

  function installProxy() {
    if (!root.MWEStore) return false;
    const legacy = root.FaithLinkModules && !root.FaithLinkModules.__mweStoreProxy
      ? root.FaithLinkModules
      : (root.__mweFaithLinkLegacy || {});
    if (!root.__mweFaithLinkLegacy && root.FaithLinkModules && !root.FaithLinkModules.__mweStoreProxy) {
      root.__mweFaithLinkLegacy = root.FaithLinkModules;
    }
    const store = root.MWEStore;
    // Sync helpers product-detail historically expected on FaithLinkModules
    if (!store.getItemById) {
      store.getItemById = function (id) {
        const rows = []
          .concat(store.getProducts?.() || [])
          .concat(store.getAllProducts?.() || []);
        return rows.find(function (p) { return p && p.id === id; }) || null;
      };
    }
    const proxy = new Proxy(store, {
      get(target, prop, receiver) {
        if (prop === '__mweStoreProxy') return true;
        if (prop in target) return Reflect.get(target, prop, receiver);
        const base = root.__mweFaithLinkLegacy || legacy;
        return base[prop];
      }
    });
    root.FaithLinkModules = proxy;
    return true;
  }

  const boot = (async function () {
    try { await root.MWEStore?.ready; } catch (_) {}
    installProxy();
  })();

  root.__mweStoreBridgeReady = boot;
  // Eager install so early sync reads hit MWEStore once it exists (even before ready fills cache).
  if (!installProxy()) {
    var eager = 0;
    var eagerId = setInterval(function () {
      eager += 1;
      if (installProxy() || eager > 400) clearInterval(eagerId);
    }, 10);
  }

  // product-detail awaits MWEPlatform.ready; extend THAT promise for future awaiters only.
  // store-api already captured the original ready Promise, so this does not deadlock.
  function patchPlatformReady() {
    const platform = root.MWEPlatform;
    const storeReady = root.MWEStore && root.MWEStore.ready;
    if (!platform || !storeReady || platform.__storeAwaitPatched) return false;
    const current = platform.ready;
    platform.ready = Promise.all([
      Promise.resolve(current),
      Promise.resolve(storeReady).catch(function () {})
    ]).then(function () { return current; });
    platform.__storeAwaitPatched = true;
    return true;
  }

  if (!patchPlatformReady()) {
    var tries = 0;
    var id = setInterval(function () {
      tries += 1;
      if (patchPlatformReady() || tries > 400) clearInterval(id);
    }, 10);
  }
})(window);
