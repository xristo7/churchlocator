/* Bridges product-detail (FaithLinkModules + MWEPlatform.ready) onto MWEStore. */
(function (root) {
  'use strict';

  const boot = (async function () {
    try { await root.MWEStore?.ready; } catch (_) {}
    if (!root.MWEStore) return;
    const legacy = root.FaithLinkModules || {};
    root.FaithLinkModules = new Proxy(root.MWEStore, {
      get(target, prop, receiver) {
        if (prop in target) return Reflect.get(target, prop, receiver);
        return legacy[prop];
      }
    });
  })();

  root.__mweStoreBridgeReady = boot;

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
