/* Bridges product-detail (FaithLinkModules + MWEPlatform.ready) onto MWEStore. */
(function (root) {
  'use strict';

  function applyBridge() {
    if (!root.MWEStore) return false;
    if (root.__mweStoreProxyApplied) return true;
    const legacy = root.FaithLinkModules || {};
    // Sync getItemById for legacy callers (product-detail).
    if (typeof root.MWEStore.getItemById !== 'function') {
      root.MWEStore.getItemById = function (id) {
        const all = [
          ...(typeof root.MWEStore.getProducts === 'function' ? root.MWEStore.getProducts() : []),
          ...(typeof root.MWEStore.getAllProducts === 'function' ? root.MWEStore.getAllProducts() : [])
        ];
        return all.find(function (p) { return p && p.id === id; }) || null;
      };
    }
    root.FaithLinkModules = new Proxy(root.MWEStore, {
      get(target, prop, receiver) {
        if (prop in target) return Reflect.get(target, prop, receiver);
        return legacy[prop];
      }
    });
    root.__mweStoreProxyApplied = true;
    return true;
  }

  applyBridge();

  const boot = (async function () {
    try { await root.MWEStore?.ready; } catch (_) {}
    applyBridge();
  })();

  root.__mweStoreBridgeReady = boot;

  function patchPlatformReady() {
    const platform = root.MWEPlatform;
    const storeReady = root.MWEStore && root.MWEStore.ready;
    if (!platform || !storeReady || platform.__storeAwaitPatched) return false;
    const current = platform.ready;
    platform.ready = Promise.all([
      Promise.resolve(current),
      Promise.resolve(storeReady).catch(function () {}),
      Promise.resolve(boot).catch(function () {})
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
