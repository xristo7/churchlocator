/* My Way of Evangelism — storefront API adapter.
   Prefer Worker /api/store/*; fall back to /api/catalog + /api/workspace.
   Never re-seed FaithLinkModules demo products when the platform is connected. */
(function (root) {
  'use strict';

  const CART_KEY = 'faithlink.store.cart.v1';
  const ORDERS_KEY = 'faithlink.store.orders.v1';
  const CACHE_BUST = '20260919storeapi1';

  let productsCache = [];
  let allProductsCache = [];
  let cartCache = [];
  let cartItemIndex = Object.create(null);
  let storeProductsApi = null;
  let storeCartApi = null;
  let storeCheckoutApi = null;
  let storeDonateApi = null;
  let readyResolved = false;

  function platform() { return root.MWEPlatform; }
  function modules() { return root.FaithLinkModules; }

  function escapeHtml(value) {
    if (modules()?.escapeHtml) return modules().escapeHtml(value);
    return String(value ?? '').replace(/[&<>'"]/g, char =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]
    );
  }

  function money(value) {
    if (modules()?.money) return modules().money(value);
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(Number(value) || 0);
  }

  function normalizeStatus(raw, publicationState) {
    const value = String(raw || publicationState || '').trim();
    const lower = value.toLowerCase();
    if (lower === 'published' || lower === 'active') return 'Active';
    if (lower === 'draft' || lower === 'pending') return 'Draft';
    if (lower === 'archived') return 'Archived';
    if (value === 'Active' || value === 'Draft' || value === 'Archived') return value;
    return publicationState === 'published' ? 'Active' : value || 'Draft';
  }

  function mapRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const price = raw.price != null ? Number(raw.price) : raw.priceCents != null ? Number(raw.priceCents) / 100 : 0;
    const compareAt = raw.compareAt != null ? Number(raw.compareAt) : raw.compareAtCents != null ? Number(raw.compareAtCents) / 100 : 0;
    const inventory = raw.inventory != null ? Number(raw.inventory) : raw.stockQty != null ? Number(raw.stockQty) : 0;
    const itemType = raw.itemType || (raw.kind === 'service' ? 'service' : 'product');
    return {
      ...raw,
      id: raw.id,
      title: raw.title || 'Untitled',
      seller: raw.seller || raw.sellerName || 'Seller',
      sellerType: raw.sellerType || 'Church',
      category: raw.category || raw.kind || 'General',
      price, compareAt, inventory,
      rating: Number(raw.rating || 0),
      status: normalizeStatus(raw.status, raw.publicationState || raw.state),
      featured: Boolean(raw.featured),
      image: raw.image || raw.imageUrl || '',
      description: raw.description || '',
      itemType,
      storeId: raw.storeId || raw.sellerId || '',
      sellerId: raw.sellerId || raw.storeId || '',
      pricingUnit: raw.pricingUnit || '',
      serviceType: raw.serviceType || '',
      packages: raw.packages || raw.tiers || undefined,
      tiers: raw.tiers || raw.packages || undefined
    };
  }

  function isPublicActive(product) { return product && product.status === 'Active'; }

  async function apiTry(path, body, method) {
    const p = platform();
    if (!p?.api) { const err = new Error('Platform API unavailable.'); err.status = 503; throw err; }
    try { return await p.api(path, body, method); }
    catch (error) { error.status = error.status || 0; throw error; }
  }

  function readLocalCart() {
    try { const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }

  function writeLocalCart(cart) {
    const next = Array.isArray(cart) ? cart : [];
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    cartCache = next.map(item => ({ id: item.id, quantity: Number(item.quantity) || 0 })).filter(item => item.quantity > 0);
    return cartCache;
  }

  function syncCartFromModules() {
    if (modules()?.getCart) {
      cartCache = modules().getCart().map(item => ({ id: item.id, quantity: Number(item.quantity) || 0 }));
      return cartCache;
    }
    return writeLocalCart(readLocalCart());
  }

  function applyCartPayload(payload) {
    const items = payload?.items || [];
    cartItemIndex = Object.create(null);
    cartCache = items.map(item => {
      const productId = item.productId || item.id;
      if (item.id && productId) cartItemIndex[productId] = item.id;
      return { id: productId, quantity: Number(item.qty ?? item.quantity) || 0 };
    }).filter(item => item.quantity > 0);
    return cartCache;
  }

  async function refreshProducts({ includeDrafts = false } = {}) {
    const p = platform();
    try {
      const data = await apiTry('store/products');
      if (data?.ok !== false && Array.isArray(data.products)) {
        storeProductsApi = true;
        const mapped = data.products.map(mapRecord).filter(Boolean);
        allProductsCache = mapped;
        productsCache = mapped.filter(isPublicActive);
        return includeDrafts ? allProductsCache : productsCache;
      }
    } catch (error) {
      if (error.status && error.status !== 404) console.warn('[MWEStore] store/products failed', error.message);
      storeProductsApi = false;
    }
    if (p?.installed && !p.staging) {
      const publicRows = (p.records('products') || []).map(mapRecord).filter(Boolean);
      const managedRows = includeDrafts ? (p.records('products', true) || []).map(mapRecord).filter(Boolean) : [];
      allProductsCache = includeDrafts && managedRows.length ? managedRows : publicRows;
      if (!includeDrafts) {
        productsCache = publicRows.filter(row => {
          const pub = row.publicationState || row.state;
          return row.status === 'Active' || pub === 'published';
        }).map(row => ({ ...row, status: 'Active' }));
        allProductsCache = productsCache;
      } else {
        productsCache = allProductsCache.filter(isPublicActive);
      }
      return includeDrafts ? allProductsCache : productsCache;
    }
    if (p?.staging || !p?.installed) {
      const seeded = (modules()?.getProducts?.() || []).map(mapRecord).filter(Boolean);
      allProductsCache = seeded;
      productsCache = seeded.filter(isPublicActive);
      return includeDrafts ? allProductsCache : productsCache;
    }
    allProductsCache = [];
    productsCache = [];
    return productsCache;
  }

  async function refreshCart() {
    const p = platform();
    if (p?.session) {
      try {
        const data = await apiTry('store/cart');
        if (data && data.ok !== false) { storeCartApi = true; return applyCartPayload(data); }
      } catch (error) {
        if (error.status === 404 || error.status === 401) storeCartApi = false;
        else console.warn('[MWEStore] store/cart failed', error.message);
      }
    }
    storeCartApi = false;
    return syncCartFromModules();
  }

  async function listProducts(options) { return refreshProducts(options); }
  function getProducts() { return productsCache.slice(); }
  function getAllProducts() { return (allProductsCache.length ? allProductsCache : productsCache).slice(); }

  async function getProduct(id) {
    const cached = [...allProductsCache, ...productsCache].find(product => product.id === id);
    if (cached) return cached;
    try {
      const data = await apiTry('store/products/' + encodeURIComponent(id));
      if (data?.product) {
        const mapped = mapRecord(data.product);
        if (mapped && !productsCache.some(p => p.id === mapped.id) && isPublicActive(mapped)) productsCache.push(mapped);
        return mapped;
      }
    } catch (error) {
      if (error.status !== 404) console.warn('[MWEStore] getProduct', error.message);
    }
    const fromCatalog = (platform()?.records('products') || []).map(mapRecord).find(p => p.id === id);
    if (fromCatalog) return fromCatalog;
    if (platform()?.staging || !platform()?.installed) {
      return mapRecord(modules()?.getItemById?.(id) || modules()?.getProducts?.().find(p => p.id === id));
    }
    return null;
  }

  function getCart() { return cartCache.map(item => ({ ...item })); }

  async function addToCart(id, quantity = 1) {
    const qty = Math.max(1, Number(quantity) || 1);
    if (storeCartApi !== false && platform()?.session) {
      try {
        const data = await apiTry('store/cart/items', { productId: id, qty }, 'POST');
        if (data && data.ok !== false) { storeCartApi = true; applyCartPayload(data); return getCart(); }
      } catch (error) {
        if (error.status === 404 || error.status === 401) storeCartApi = false;
        else throw error;
      }
    }
    if (modules()?.addToCart) {
      for (let i = 0; i < qty; i += 1) modules().addToCart(id);
      return syncCartFromModules();
    }
    const cart = readLocalCart();
    const row = cart.find(item => item.id === id);
    if (row) row.quantity += qty; else cart.push({ id, quantity: qty });
    return writeLocalCart(cart);
  }

  async function setCartQuantity(id, quantity) {
    const qty = Math.max(0, Number(quantity) || 0);
    if (storeCartApi !== false && platform()?.session) {
      try {
        if (qty <= 0) {
          let lineId = cartItemIndex[id];
          if (!lineId) { await refreshCart(); lineId = cartItemIndex[id]; }
          if (lineId) {
            const data = await apiTry('store/cart/items/' + encodeURIComponent(lineId), undefined, 'DELETE');
            if (data && data.ok !== false) { storeCartApi = true; applyCartPayload(data); return getCart(); }
          }
        } else {
          let lineId = cartItemIndex[id];
          if (!lineId) { await addToCart(id, qty); return getCart(); }
          const data = await apiTry('store/cart/items/' + encodeURIComponent(lineId), { qty }, 'PATCH');
          if (data && data.ok !== false) { storeCartApi = true; applyCartPayload(data); return getCart(); }
        }
      } catch (error) {
        if (error.status === 404 || error.status === 401) storeCartApi = false;
        else throw error;
      }
    }
    if (modules()?.setCartQuantity) { modules().setCartQuantity(id, qty); return syncCartFromModules(); }
    const cart = readLocalCart().map(item => (item.id === id ? { ...item, quantity: qty } : item)).filter(item => item.quantity > 0);
    return writeLocalCart(cart);
  }

  async function upsertProduct(product) {
    const payload = { ...product };
    if (payload.price != null) payload.price = Number(payload.price);
    if (payload.inventory != null) payload.inventory = Number(payload.inventory);
    if (storeProductsApi !== false) {
      try {
        const body = {
          kind: payload.itemType === 'service' ? 'service' : 'product',
          title: payload.title,
          slug: payload.slug || String(payload.title || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60),
          description: payload.description || '',
          imageUrl: payload.image || payload.imageUrl || '',
          priceCents: Math.round(Number(payload.price || 0) * 100),
          compareAtCents: payload.compareAt ? Math.round(Number(payload.compareAt) * 100) : null,
          status: payload.status === 'Active' ? 'published' : payload.status === 'Archived' ? 'archived' : 'draft',
          inventoryTracked: true,
          stockQty: Number(payload.inventory || 0)
        };
        let data;
        if (payload.id) {
          try { data = await apiTry('store/seller/products/' + encodeURIComponent(payload.id), body, 'PUT'); }
          catch (error) {
            if (error.status === 404) data = await apiTry('store/seller/products', body, 'POST');
            else throw error;
          }
        } else {
          data = await apiTry('store/seller/products', body, 'POST');
        }
        if (data?.product || data?.ok) {
          storeProductsApi = true;
          await refreshProducts({ includeDrafts: true });
          return mapRecord(data.product || payload);
        }
      } catch (error) {
        if (error.status === 404) storeProductsApi = false;
        else if (error.status !== 401 && error.status !== 403) throw error;
      }
    }
    if (platform()?.installed && !platform()?.staging) {
      if (!payload.storeId) {
        const stores = platform().records('store', true) || [];
        const managed = stores.find(store => store.canManage) || stores[0];
        if (managed) payload.storeId = managed.id;
      }
      if (!payload.storeId) throw new Error('Choose a store you manage before saving a product.');
      const saved = await platform().save('products', {
        ...payload,
        status: payload.status || 'Draft',
        publicationState: payload.status === 'Active' ? 'pending' : 'draft'
      });
      await refreshProducts({ includeDrafts: true });
      return mapRecord(saved);
    }
    if (modules()?.upsertProduct) {
      const saved = modules().upsertProduct(payload);
      await refreshProducts({ includeDrafts: true });
      return mapRecord(saved);
    }
    throw new Error('Unable to save product.');
  }

  async function removeProduct(id) {
    if (storeProductsApi !== false) {
      try {
        await apiTry('store/seller/products/' + encodeURIComponent(id), undefined, 'DELETE');
        storeProductsApi = true;
        await refreshProducts({ includeDrafts: true });
        return;
      } catch (error) {
        if (error.status === 404) storeProductsApi = false;
        else if (error.status !== 401 && error.status !== 403) throw error;
      }
    }
    if (platform()?.installed && !platform()?.staging) {
      const existing = (platform().records('products', true) || []).find(row => row.id === id);
      if (existing) {
        await platform().save('products', { ...existing, status: 'Archived', publicationState: 'archived' });
        await refreshProducts({ includeDrafts: true });
        return;
      }
    }
    modules()?.removeProduct?.(id);
    await refreshProducts({ includeDrafts: true });
  }

  function saveSandboxOrder(order) {
    try {
      const existing = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      const list = Array.isArray(existing) ? existing : [];
      list.unshift(order);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(list.slice(0, 50)));
    } catch {}
  }

  async function placeOrder(details = {}) {
    const cart = getCart();
    if (!cart.length) throw new Error('Your cart is empty.');
    const buyerName = String(details.buyerName || details.name || '').trim();
    const buyerEmail = String(details.buyerEmail || details.email || '').trim().toLowerCase();
    const notes = String(details.notes || '').trim();
    const mode = details.mode || 'sandbox';
    try {
      const data = await apiTry('store/checkout', {
        buyerName, buyerEmail, notes, mode,
        shipping: details.shipping, deliveryType: details.deliveryType, totals: details.totals
      }, 'POST');
      if (data && data.ok !== false) {
        storeCheckoutApi = true;
        cartCache = []; cartItemIndex = Object.create(null);
        try { modules()?.saveCart?.([]); } catch {}
        try { localStorage.setItem(CART_KEY, '[]'); } catch {}
        return {
          ok: true,
          sandbox: (data.payment?.mode || mode) !== 'live',
          order: data.order,
          items: data.items || [],
          payment: data.payment || { mode: 'manual_pending', note: 'Order recorded as pending. No charge captured.' },
          message: data.payment?.note || 'Sandbox order recorded as pending. No payment was captured.'
        };
      }
    } catch (error) {
      if (error.status === 404) storeCheckoutApi = false;
      else if (error.status === 401) throw new Error('Sign in to complete checkout against the store API.');
      else throw error;
    }
    const products = getProducts();
    const lines = cart.map(item => {
      const product = products.find(row => row.id === item.id) || allProductsCache.find(row => row.id === item.id);
      return product ? { id: product.id, title: product.title, quantity: item.quantity, price: product.price, seller: product.seller } : null;
    }).filter(Boolean);
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const order = {
      id: 'SANDBOX-' + Date.now().toString(36).toUpperCase(),
      status: 'pending',
      fulfillment: 'Sandbox · awaiting payment provider',
      sandbox: true, mode: 'sandbox', email: buyerEmail, buyerName, items: lines,
      totals: details.totals || { subtotal, total: subtotal },
      createdAt: new Date().toISOString(),
      note: 'Local sandbox pending order. Not paid. Will sync when /api/store/checkout is available.'
    };
    saveSandboxOrder(order);
    cartCache = [];
    try { modules()?.saveCart?.([]); } catch {}
    try { localStorage.setItem(CART_KEY, '[]'); } catch {}
    return {
      ok: true, sandbox: true, order, items: lines,
      payment: { mode: 'sandbox_local', note: order.note },
      message: 'Sandbox order saved locally as pending. No payment was captured.'
    };
  }

  async function donate(details = {}) {
    const amount = Number(details.amount || details.amountCents / 100 || 0);
    const amountCents = details.amountCents != null ? Number(details.amountCents) : Math.round(amount * 100);
    if (!Number.isFinite(amountCents) || amountCents < 100) throw new Error('Enter a donation of at least $1.00.');
    try {
      const data = await apiTry('store/donations', {
        amountCents,
        donorName: details.donorName || details.name,
        donorEmail: details.donorEmail || details.email,
        message: details.message || '',
        churchId: details.churchId || null,
        sellerId: details.sellerId || null,
        frequency: details.frequency || 'one-time',
        payMethod: details.payMethod || 'card',
        mode: details.mode || 'sandbox'
      }, 'POST');
      if (data && data.ok !== false) {
        storeDonateApi = true;
        return {
          ok: true, sandbox: true, donation: data.donation,
          message: 'Donation recorded as pending/sandbox. No payment was captured until a provider is configured.'
        };
      }
    } catch (error) {
      if (error.status === 404) {
        storeDonateApi = false;
        const err = new Error('Donations API is not available yet. No charge was made.');
        err.status = 404; err.unavailable = true; throw err;
      }
      throw error;
    }
    const err = new Error('Donations are unavailable until the store donations endpoint is deployed.');
    err.unavailable = true; throw err;
  }

  const ready = (async () => {
    try { await platform()?.ready; } catch {}
    await refreshProducts({ includeDrafts: false });
    await refreshCart();
    if (root.document?.body?.getAttribute('data-page') === 'store-manager') {
      try {
        const data = await apiTry('store/seller/products');
        if (Array.isArray(data?.products)) {
          storeProductsApi = true;
          allProductsCache = data.products.map(mapRecord).filter(Boolean);
          productsCache = allProductsCache.filter(isPublicActive);
        } else {
          await refreshProducts({ includeDrafts: true });
        }
      } catch {
        await refreshProducts({ includeDrafts: true });
      }
    }
    readyResolved = true;
    root.dispatchEvent(new Event('mwe-store-ready'));
  })();

  root.document?.addEventListener('DOMContentLoaded', () => {
    if (root.document.body?.getAttribute('data-page') !== 'donate') return;
    const form = root.document.querySelector('[data-donation-form]');
    if (!form) return;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const fd = new FormData(form);
      const amount = Number(root.document.getElementById('custom-donate-amount')?.value || fd.get('amount') || 0);
      const frequency = root.document.querySelector('.master-freq-btn.active')?.dataset.freq || 'one-time';
      const payMethod = fd.get('payMethod') || root.document.querySelector('input[name="payMethod"]:checked')?.value || 'card';
      const status = root.document.getElementById('donate-api-status') || (() => {
        const el = root.document.createElement('p');
        el.id = 'donate-api-status';
        el.setAttribute('role', 'alert');
        el.style.cssText = 'margin-top:12px;font-size:0.9rem;text-align:center;';
        form.appendChild(el);
        return el;
      })();
      status.textContent = 'Submitting…';
      try {
        await ready;
        const result = await donate({
          amount,
          donorName: fd.get('donorName'),
          donorEmail: fd.get('donorEmail'),
          frequency, payMethod, mode: 'sandbox'
        });
        status.style.color = 'var(--primary, #5b4bdb)';
        status.textContent = result.message || 'Donation recorded (sandbox/pending). No payment captured.';
        root.MWE?.showMemberToast?.(status.textContent);
      } catch (error) {
        status.style.color = '#b42318';
        status.textContent = error.unavailable
          ? 'Donations API is not available yet. No charge was made.'
          : (error.message || 'Unable to record donation.');
        root.MWE?.showMemberToast?.(status.textContent);
      }
    }, true);
  });

  root.MWEStore = {
    version: CACHE_BUST,
    ready,
    get readyResolved() { return readyResolved; },
    escapeHtml, money, listProducts, refreshProducts, refreshCart,
    getProducts, getAllProducts, getProduct, getCart, addToCart, setCartQuantity,
    upsertProduct, removeProduct, placeOrder, checkout: placeOrder, donate,
    endpoints: {
      products: { primary: '/api/store/products', fallback: '/api/catalog (kind=products)' },
      cart: { primary: '/api/store/cart*', fallback: 'FaithLinkModules local cart (memory)' },
      seller: { primary: '/api/store/seller/products', fallback: "MWEPlatform.save('products') / workspace" },
      checkout: { primary: 'POST /api/store/checkout', fallback: 'labeled sandbox local pending order' },
      donations: { primary: 'POST /api/store/donations', fallback: 'honest unavailable message' }
    }
  };
})(window);
