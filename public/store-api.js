/* MWEStore — Worker/D1 store client for storefront (branch grok). */
(function (root) {
  'use strict';

  const CART_KEY = 'faithlink.store.cart.v1';
  const ORDERS_KEY = 'faithlink.store.orders.v1';

  let published = [];
  let allCached = [];
  let cart = [];
  let cartLineIds = Object.create(null);
  let currency = 'USD';
  let readyResolved = false;

  function platform() { return root.MWEPlatform; }
  function legacy() { return root.FaithLinkModules; }

  function toUiStatus(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'published' || s === 'active') return 'Active';
    if (s === 'draft' || s === 'pending') return 'Draft';
    if (s === 'archived') return 'Archived';
    return status || 'Draft';
  }

  function toApiStatus(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'active' || s === 'published') return 'published';
    if (s === 'archived') return 'archived';
    if (s === 'pending') return 'pending';
    return 'draft';
  }

  function mapProduct(row) {
    if (!row || typeof row !== 'object') return null;
    const price = row.priceCents != null ? Number(row.priceCents) / 100 : Number(row.price || 0);
    const compareAt = row.compareAtCents != null ? Number(row.compareAtCents) / 100 : Number(row.compareAt || 0);
    const stock = row.stockQty != null ? Number(row.stockQty) : Number(row.inventory || 0);
    const kind = row.kind || row.itemType || 'product';
    if (row.currency) currency = row.currency;
    return {
      id: row.id,
      sellerId: row.sellerId || '',
      seller: row.sellerName || row.seller || 'Seller',
      sellerName: row.sellerName || row.seller || 'Seller',
      sellerType: row.sellerType || '',
      category: row.category || '',
      featured: Boolean(row.featured),
      rating: Number(row.rating || 0),
      title: row.title || 'Untitled',
      slug: row.slug || '',
      description: row.description || '',
      image: (row.imageUrl || row.image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=82'),
      imageUrl: (row.imageUrl || row.image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=82'),
      currency: row.currency || currency || 'USD',
      price: price,
      priceCents: row.priceCents != null ? Number(row.priceCents) : Math.round(price * 100),
      compareAt: compareAt,
      compareAtCents: row.compareAtCents != null ? Number(row.compareAtCents) : (compareAt ? Math.round(compareAt * 100) : null),
      inventory: stock,
      stockQty: stock,
      inventoryTracked: row.inventoryTracked == null ? true : Boolean(row.inventoryTracked),
      status: toUiStatus(row.status),
      apiStatus: String(row.status || '').toLowerCase() || toApiStatus(row.status),
      kind: kind,
      itemType: kind === 'service' ? 'service' : 'product',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async function apiFetch(path, body, method) {
    const verb = method || (body ? 'POST' : 'GET');
    // Prefer platform.api when present (session cookies + error shape), else raw fetch.
    const p = platform();
    if (p && typeof p.api === 'function') {
      try {
        return await p.api(path, body, verb);
      } catch (err) {
        // Fall through to raw fetch for GETs so catalog still loads if platform.api throws.
        if (verb !== 'GET') throw err;
      }
    }
    const response = await fetch('/api/' + path, {
      method: verb,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    let data = null;
    try { data = await response.json(); } catch (_) { data = null; }
    if (!response.ok || (data && data.ok === false)) {
      const error = new Error((data && data.error) || 'Store request failed');
      error.status = response.status;
      throw error;
    }
    return data || { ok: true };
  }

  function readLocalCart() {
    try {
      const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function writeLocalCart(rows) {
    const next = (Array.isArray(rows) ? rows : [])
      .map(function (row) { return { id: row.id, quantity: Number(row.quantity) || 0 }; })
      .filter(function (row) { return row.quantity > 0; });
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    cart = next;
    return cart;
  }

  function applyServerCart(payload) {
    const items = (payload && payload.items) || [];
    cartLineIds = Object.create(null);
    cart = items.map(function (item) {
      const productId = item.productId || item.id;
      if (item.id && productId) cartLineIds[productId] = item.id;
      if (item.currency) currency = item.currency;
      return { id: productId, quantity: Number(item.qty != null ? item.qty : item.quantity) || 0 };
    }).filter(function (row) { return row.quantity > 0; });
    return cart;
  }

  async function refreshProducts(options) {
    const includeDrafts = !!(options && options.includeDrafts);
    try {
      const data = await apiFetch('store/products');
      const rows = Array.isArray(data && data.products) ? data.products.map(mapProduct).filter(Boolean) : [];
      allCached = rows;
      published = rows.filter(function (row) { return row.status === 'Active'; });
      return includeDrafts ? allCached.slice() : published.slice();
    } catch (err) {
      if (err && err.status && err.status !== 404) {
        console.warn('[MWEStore] GET /api/store/products', err.message || err);
      }
    }

    const p = platform();
    if (p && p.installed && !p.staging) {
      const source = (includeDrafts ? p.records('products', true) : p.records('products')) || [];
      const rows = source.map(function (row) {
        return mapProduct({
          id: row.id,
          sellerName: row.seller,
          sellerType: row.sellerType,
          category: row.category,
          title: row.title,
          description: row.description,
          imageUrl: row.image,
          price: row.price,
          compareAt: row.compareAt,
          stockQty: row.inventory,
          status: row.status === 'Active' || row.publicationState === 'published' || row.state === 'published' ? 'published' : (row.status === 'Archived' ? 'archived' : 'draft'),
          kind: row.itemType === 'service' ? 'service' : 'product',
          featured: row.featured,
          rating: row.rating
        });
      }).filter(Boolean);
      allCached = rows;
      published = rows.filter(function (row) { return row.status === 'Active'; });
      return includeDrafts ? allCached.slice() : published.slice();
    }

    allCached = [];
    published = [];
    return [];
  }

  async function refreshCart() {
    if (platform() && platform().session) {
      try {
        const data = await apiFetch('store/cart');
        if (data && data.ok !== false) return applyServerCart(data);
      } catch (err) {
        if (!err || (err.status !== 404 && err.status !== 401)) {
          console.warn('[MWEStore] GET /api/store/cart', err && err.message);
        }
      }
    }
    cart = readLocalCart();
    return cart.slice();
  }

  async function getProduct(id) {
    if (!id) return null;
    const hit = published.concat(allCached).find(function (row) { return row.id === id; });
    if (hit) return hit;
    try {
      const data = await apiFetch('store/products/' + encodeURIComponent(id));
      if (data && data.product) {
        const mapped = mapProduct(data.product);
        if (mapped && mapped.status === 'Active' && !published.some(function (row) { return row.id === mapped.id; })) {
          published.push(mapped);
        }
        return mapped;
      }
    } catch (err) {
      if (!err || err.status !== 404) console.warn('[MWEStore] getProduct', err && err.message);
    }
    return published.find(function (row) { return row.id === id; }) || null;
  }

  async function addToCart(id, qty) {
    const quantity = Math.max(1, Number(qty) || 1);
    if (platform() && platform().session) {
      try {
        const data = await apiFetch('store/cart/items', { productId: id, qty: quantity }, 'POST');
        if (data && data.ok !== false) {
          applyServerCart(data);
          return cart.slice();
        }
      } catch (err) {
        if (err && err.status && err.status !== 401 && err.status !== 404) throw err;
      }
    }
    const rows = readLocalCart();
    const existing = rows.find(function (row) { return row.id === id; });
    if (existing) existing.quantity += quantity;
    else rows.push({ id: id, quantity: quantity });
    return writeLocalCart(rows).slice();
  }

  async function setCartQuantity(id, qty) {
    const quantity = Math.max(0, Number(qty) || 0);
    if (platform() && platform().session) {
      try {
        let lineId = cartLineIds[id];
        if (!lineId) {
          await refreshCart();
          lineId = cartLineIds[id];
        }
        if (quantity <= 0 && lineId) {
          const data = await apiFetch('store/cart/items/' + encodeURIComponent(lineId), undefined, 'DELETE');
          if (data && data.ok !== false) {
            applyServerCart(data);
            return cart.slice();
          }
        } else if (quantity > 0 && lineId) {
          const data = await apiFetch('store/cart/items/' + encodeURIComponent(lineId), { qty: quantity }, 'PATCH');
          if (data && data.ok !== false) {
            applyServerCart(data);
            return cart.slice();
          }
        } else if (quantity > 0 && !lineId) {
          return addToCart(id, quantity);
        }
      } catch (err) {
        if (err && err.status && err.status !== 401 && err.status !== 404) throw err;
      }
    }
    return writeLocalCart(
      readLocalCart()
        .map(function (row) { return row.id === id ? { id: row.id, quantity: quantity } : row; })
        .filter(function (row) { return row.quantity > 0; })
    ).slice();
  }

  async function placeOrder(input) {
    input = input || {};
    const lines = cart.slice();
    if (!lines.length) throw new Error('Your cart is empty.');
    const buyerName = String(input.buyerName || input.name || '').trim();
    const buyerEmail = String(input.buyerEmail || input.email || '').trim().toLowerCase();
    const notes = String(input.notes || '').trim();
    try {
      const data = await apiFetch('store/checkout', {
        buyerName: buyerName,
        buyerEmail: buyerEmail,
        notes: notes,
        payment: { mode: 'manual_pending', note: 'Order recorded as pending. No charge captured.' }
      }, 'POST');
      if (data && data.ok !== false) {
        cart = [];
        cartLineIds = Object.create(null);
        try { localStorage.setItem(CART_KEY, '[]'); } catch (_) {}
        const payment = data.payment || { mode: 'manual_pending', note: 'Order recorded as pending. No charge captured.' };
        return {
          ok: true,
          sandbox: payment.mode !== 'live',
          order: data.order,
          items: data.items || [],
          payment: payment,
          message: payment.note || 'Order recorded as pending. No payment was captured.'
        };
      }
    } catch (err) {
      // Guests: fall through to local sandbox pending order (no forced sign-in).
      // Signed-in users: surface auth errors instead of silently faking success.
      if (err && err.status === 401) {
        if (platform() && platform().session) throw new Error('Sign in to complete checkout.');
        console.warn('[MWEStore] checkout 401 as guest — using local sandbox');
      } else if (err && err.status !== 404) {
        throw err;
      }
    }
    const catalog = published.concat(allCached);
    const items = lines.map(function (line) {
      const product = catalog.find(function (row) { return row.id === line.id; });
      return product ? {
        id: product.id,
        title: product.title,
        quantity: line.quantity,
        price: product.price,
        seller: product.seller
      } : null;
    }).filter(Boolean);
    const subtotal = items.reduce(function (sum, item) { return sum + item.price * item.quantity; }, 0);
    const order = {
      id: 'SANDBOX-' + Date.now().toString(36).toUpperCase(),
      status: 'pending',
      fulfillment: 'Sandbox · awaiting /api/store/checkout',
      sandbox: true,
      email: buyerEmail,
      buyerName: buyerName,
      items: items,
      totals: input.totals || { subtotal: subtotal, total: subtotal },
      createdAt: new Date().toISOString(),
      note: 'Local sandbox pending order. Not paid.'
    };
    try {
      const prior = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      const list = Array.isArray(prior) ? prior : [];
      list.unshift(order);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(list.slice(0, 50)));
    } catch (_) {}
    cart = [];
    try { localStorage.setItem(CART_KEY, '[]'); } catch (_) {}
    return {
      ok: true,
      sandbox: true,
      order: order,
      items: items,
      payment: { mode: 'sandbox_local', note: order.note },
      message: 'Sandbox order saved locally as pending. No payment was captured.'
    };
  }

  async function donate(input) {
    input = input || {};
    const amount = Number(input.amount || 0);
    const amountCents = input.amountCents != null ? Number(input.amountCents) : Math.round(amount * 100);
    if (!Number.isFinite(amountCents) || amountCents < 100) throw new Error('Enter a donation of at least $1.00.');
    try {
      const data = await apiFetch('store/donations', {
        amountCents: amountCents,
        donorName: input.donorName || input.name,
        donorEmail: input.donorEmail || input.email,
        message: input.message || '',
        churchId: input.churchId || null,
        sellerId: input.sellerId || null
      }, 'POST');
      if (data && data.ok !== false) {
        return {
          ok: true,
          sandbox: true,
          donation: data.donation,
          message: 'Donation recorded. No live payment provider is configured yet — treat as pending/sandbox.'
        };
      }
    } catch (err) {
      if (err && err.status === 404) {
        const missing = new Error('Donations API is not available yet. No charge was made.');
        missing.status = 404;
        missing.unavailable = true;
        throw missing;
      }
      throw err;
    }
    const unavailable = new Error('Donations are unavailable. No charge was made.');
    unavailable.unavailable = true;
    throw unavailable;
  }


  async function resolveCartRows() {
    await refreshProducts({ includeDrafts: false });
    await refreshCart();
    const lines = cart.slice();
    const rows = [];
    for (const line of lines) {
      let product = published.concat(allCached).find(function (row) { return row.id === line.id; });
      if (!product) product = await getProduct(line.id);
      if (product) rows.push({ id: line.id, quantity: line.quantity, product: product });
    }
    return rows;
  }

  const ready = (async function () {
    try { await (platform() && platform().ready); } catch (_) {}
    await refreshProducts({ includeDrafts: false });
    await refreshCart();
    readyResolved = true;
    try { root.dispatchEvent(new Event('mwe-store-ready')); } catch (_) {}
    return true;
  })();

  root.MWEStore = {
    version: '20260919p0qa1',
    ready: ready,
    get readyResolved() { return readyResolved; },
    escapeHtml: function (value) {
      if (legacy() && legacy().escapeHtml) return legacy().escapeHtml(value);
      return String(value ?? '').replace(/[&<>"']/g, function (ch) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
      });
    },
    money: function (value, code) {
      const cur = code || currency || 'USD';
      try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(Number(value) || 0);
      } catch (_) {
        return cur + ' ' + (Number(value) || 0).toFixed(2);
      }
    },
    listProducts: refreshProducts,
    refreshProducts: refreshProducts,
    refreshCart: refreshCart,
    getProducts: function () { return published.slice(); },
    getAllProducts: function () { return (allCached.length ? allCached : published).slice(); },
    getProduct: getProduct,
    getItemById: function (id) {
      return published.concat(allCached).find(function (row) { return row && row.id === id; }) || null;
    },
    getCart: function () { return cart.map(function (row) { return Object.assign({}, row); }); },
    resolveCartRows: resolveCartRows,
    addToCart: addToCart,
    setCartQuantity: setCartQuantity,
    placeOrder: placeOrder,
    checkout: placeOrder,
    donate: donate
  };
})(window);

