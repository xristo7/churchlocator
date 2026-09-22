import { ApiError, readJson } from './security.js';
import { isOwner } from './trusted-platform.js';

const PRODUCT_KINDS = new Set(['product', 'service', 'digital']);
const PRODUCT_STATUSES = new Set(['draft', 'pending', 'published', 'archived']);
const SELLER_STATUSES = new Set(['pending', 'active', 'suspended', 'rejected']);
const ORDER_STATUSES = new Set(['pending', 'paid', 'fulfilled', 'cancelled', 'refunded']);

const isValidId = (value) => /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(String(value || ''));

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

function makeOrderRef() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.getRandomValues(new Uint8Array(3));
  const suffix = Array.from(rand, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `ORD-${stamp}-${suffix}`;
}

function makeDonationRef() {
  return `DON-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function cleanText(value, max, label, required = false) {
  const out = String(value ?? '').trim();
  if (required && !out) throw new ApiError(400, `${label} is required.`);
  if (out.length > max) throw new ApiError(400, `${label} is too long.`);
  return out;
}

function cleanSlug(value) {
  const slug = cleanText(value, 80, 'Slug', true)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length < 2) throw new ApiError(400, 'Slug is invalid.');
  return slug;
}

function cleanCents(value, label) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new ApiError(400, `Invalid ${label}.`);
  return n;
}

function cleanQty(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 999) throw new ApiError(400, 'Invalid quantity.');
  return n;
}

function isPreviewEnv(env) {
  const value = String(env.ENVIRONMENT || env.ENV || '').toLowerCase();
  return value === 'preview' || value === 'development' || value === 'dev' || value === '';
}

function mapSeller(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    churchId: row.church_id || null,
    displayName: row.display_name,
    slug: row.slug,
    bio: row.bio || '',
    logoUrl: row.logo_url || null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerName: row.seller_name || undefined,
    kind: row.kind,
    title: row.title,
    slug: row.slug,
    description: row.description || '',
    imageUrl: row.image_url || null,
    currency: row.currency,
    priceCents: row.price_cents,
    compareAtCents: row.compare_at_cents ?? null,
    status: row.status,
    inventoryTracked: Boolean(row.inventory_tracked),
    stockQty: row.stock_qty,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapOrder(row) {
  return {
    id: row.id,
    orderRef: row.order_ref,
    userId: row.user_id,
    status: row.status,
    currency: row.currency,
    subtotalCents: row.subtotal_cents,
    totalCents: row.total_cents,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapDonation(row) {
  return {
    id: row.id,
    donationRef: row.donation_ref,
    userId: row.user_id || null,
    churchId: row.church_id || null,
    sellerId: row.seller_id || null,
    amountCents: row.amount_cents,
    currency: row.currency,
    donorName: row.donor_name,
    donorEmail: row.donor_email,
    message: row.message || '',
    status: row.status,
    createdAt: row.created_at
  };
}

async function requireUser(request, env, context) {
  const user = await context.getSessionUser(request, env);
  if (!user) throw new ApiError(401, 'Sign in required.');
  return user;
}

async function getSellerForUser(env, userId) {
  return env.DB.prepare('select * from store_sellers where user_id = ? order by created_at asc limit 1').bind(userId).first();
}

async function requireSeller(env, user, { allowPending = false } = {}) {
  const seller = await getSellerForUser(env, user.id);
  if (!seller) throw new ApiError(403, 'Seller profile required.');
  if (seller.status === 'active' || allowPending || (await isOwner(env, user))) return seller;
  throw new ApiError(403, 'Seller account is not active.');
}

async function ensureCart(env, userId) {
  const existing = await env.DB.prepare('select * from store_carts where user_id = ?').bind(userId).first();
  if (existing) return existing;
  const id = newId('cart');
  const ts = nowIso();
  await env.DB.prepare('insert into store_carts (id, user_id, created_at, updated_at) values (?, ?, ?, ?)').bind(id, userId, ts, ts).run();
  return { id, user_id: userId, created_at: ts, updated_at: ts };
}

async function loadCart(env, cartId) {
  const { results } = await env.DB.prepare(`
    select ci.*, p.title, p.slug, p.image_url, p.status as product_status, p.stock_qty, p.inventory_tracked, p.currency,
           s.display_name as seller_name, s.status as seller_status
    from store_cart_items ci
    join store_products p on p.id = ci.product_id
    join store_sellers s on s.id = p.seller_id
    where ci.cart_id = ?
    order by ci.created_at asc
  `).bind(cartId).all();
  const items = (results || []).map((row) => ({
    id: row.id,
    productId: row.product_id,
    title: row.title,
    slug: row.slug,
    imageUrl: row.image_url || null,
    sellerName: row.seller_name,
    qty: row.qty,
    unitPriceCents: row.unit_price_cents,
    lineTotalCents: row.qty * row.unit_price_cents,
    currency: row.currency,
    productStatus: row.product_status,
    sellerStatus: row.seller_status,
    stockQty: row.stock_qty,
    inventoryTracked: Boolean(row.inventory_tracked)
  }));
  return {
    items,
    subtotalCents: items.reduce((sum, item) => sum + item.lineTotalCents, 0),
    itemCount: items.reduce((sum, item) => sum + item.qty, 0)
  };
}

async function listPublishedProducts(env, url) {
  const kind = String(url.searchParams.get('kind') || '').trim();
  const q = cleanText(url.searchParams.get('q') || '', 100, 'Query');
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 24) || 24, 1), 100);
  const clauses = ["p.status = 'published'", "s.status = 'active'"];
  const binds = [];
  if (kind) {
    if (!PRODUCT_KINDS.has(kind)) throw new ApiError(400, 'Invalid kind.');
    clauses.push('p.kind = ?');
    binds.push(kind);
  }
  if (q) {
    clauses.push("(p.title like ? or ifnull(p.description, '') like ?)");
    binds.push(`%${q}%`, `%${q}%`);
  }
  const { results } = await env.DB.prepare(`
    select p.*, s.display_name as seller_name
    from store_products p
    join store_sellers s on s.id = p.seller_id
    where ${clauses.join(' and ')}
    order by p.updated_at desc
    limit ?
  `).bind(...binds, limit).all();
  return (results || []).map(mapProduct);
}

async function getPublishedProduct(env, productId) {
  if (!isValidId(productId)) throw new ApiError(400, 'Invalid product id.');
  const row = await env.DB.prepare(`
    select p.*, s.display_name as seller_name, s.slug as seller_slug, s.status as seller_status
    from store_products p
    join store_sellers s on s.id = p.seller_id
    where p.id = ?
  `).bind(productId).first();
  if (!row || row.status !== 'published' || row.seller_status !== 'active') throw new ApiError(404, 'Product not found.');
  return { ...mapProduct(row), sellerSlug: row.seller_slug };
}

async function upsertSeller(env, user, body) {
  const existing = await getSellerForUser(env, user.id);
  const displayName = cleanText(body.displayName || body.name, 120, 'Display name', true);
  const slug = cleanSlug(body.slug || displayName);
  const bio = cleanText(body.bio || '', 2000, 'Bio');
  const logoUrl = cleanText(body.logoUrl || '', 2000, 'Logo URL') || null;
  const churchId = body.churchId ? cleanText(body.churchId, 128, 'Church id') : null;
  if (churchId && !isValidId(churchId)) throw new ApiError(400, 'Invalid church id.');
  const ts = nowIso();
  if (existing) {
    await env.DB.prepare(`
      update store_sellers
      set display_name = ?, slug = ?, bio = ?, logo_url = ?, church_id = coalesce(?, church_id), updated_at = ?
      where id = ?
    `).bind(displayName, slug, bio, logoUrl, churchId, ts, existing.id).run();
    return mapSeller(await env.DB.prepare('select * from store_sellers where id = ?').bind(existing.id).first());
  }
  if (!user.is_creator && !(await isOwner(env, user))) {
    throw new ApiError(403, 'Creator upgrade required to sell.');
  }
  const id = newId('seller');
  await env.DB.prepare(`
    insert into store_sellers (id, user_id, church_id, display_name, slug, bio, logo_url, status, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).bind(id, user.id, churchId, displayName, slug, bio, logoUrl, ts, ts).run();
  return mapSeller(await env.DB.prepare('select * from store_sellers where id = ?').bind(id).first());
}

async function saveProduct(env, seller, productId, body, isCreate) {
  const kind = String(body.kind || 'product').toLowerCase();
  if (!PRODUCT_KINDS.has(kind)) throw new ApiError(400, 'Invalid product kind.');
  const title = cleanText(body.title, 160, 'Title', true);
  const slug = cleanSlug(body.slug || title);
  const description = cleanText(body.description || '', 8000, 'Description');
  const imageUrl = cleanText(body.imageUrl || '', 2000, 'Image URL') || null;
  const currency = cleanText(body.currency || 'USD', 8, 'Currency', true).toUpperCase();
  const priceCents = cleanCents(body.priceCents, 'price');
  const compareAtCents = body.compareAtCents == null || body.compareAtCents === '' ? null : cleanCents(body.compareAtCents, 'compare-at price');
  const inventoryTracked = body.inventoryTracked === false || body.inventoryTracked === 0 ? 0 : 1;
  const stockQty = inventoryTracked ? cleanCents(body.stockQty ?? 0, 'stock') : 0;
  let status = String(body.status || 'draft').toLowerCase();
  if (!PRODUCT_STATUSES.has(status)) throw new ApiError(400, 'Invalid status.');
  if (status === 'published' && seller.status !== 'active') status = 'pending';
  const ts = nowIso();
  if (isCreate) {
    const id = newId('prod');
    await env.DB.prepare(`
      insert into store_products (
        id, seller_id, kind, title, slug, description, image_url, currency, price_cents, compare_at_cents,
        status, inventory_tracked, stock_qty, metadata_json, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?)
    `).bind(id, seller.id, kind, title, slug, description, imageUrl, currency, priceCents, compareAtCents, status, inventoryTracked, stockQty, ts, ts).run();
    return mapProduct(await env.DB.prepare('select * from store_products where id = ?').bind(id).first());
  }
  if (!isValidId(productId)) throw new ApiError(400, 'Invalid product id.');
  const existing = await env.DB.prepare('select * from store_products where id = ? and seller_id = ?').bind(productId, seller.id).first();
  if (!existing) throw new ApiError(404, 'Product not found.');
  await env.DB.prepare(`
    update store_products set
      kind = ?, title = ?, slug = ?, description = ?, image_url = ?, currency = ?, price_cents = ?,
      compare_at_cents = ?, status = ?, inventory_tracked = ?, stock_qty = ?, updated_at = ?
    where id = ? and seller_id = ?
  `).bind(kind, title, slug, description, imageUrl, currency, priceCents, compareAtCents, status, inventoryTracked, stockQty, ts, productId, seller.id).run();
  return mapProduct(await env.DB.prepare('select * from store_products where id = ?').bind(productId).first());
}

async function checkout(env, user, body) {
  const cart = await ensureCart(env, user.id);
  const payload = await loadCart(env, cart.id);
  if (!payload.items.length) throw new ApiError(400, 'Cart is empty.');
  for (const item of payload.items) {
    if (item.productStatus !== 'published' || item.sellerStatus !== 'active') {
      throw new ApiError(409, `"${item.title}" is unavailable.`);
    }
    if (item.inventoryTracked && item.stockQty < item.qty) {
      throw new ApiError(409, `Insufficient stock for "${item.title}".`);
    }
  }
  const buyerName = cleanText(body.buyerName || user.name, 120, 'Buyer name', true);
  const buyerEmail = cleanText(body.buyerEmail || user.email, 254, 'Buyer email', true).toLowerCase();
  const notes = cleanText(body.notes || '', 2000, 'Notes');
  const ts = nowIso();
  const orderId = newId('order');
  const ref = makeOrderRef();

  const stmts = [
    env.DB.prepare(`
      insert into store_orders (
        id, order_ref, user_id, status, currency, subtotal_cents, total_cents, buyer_name, buyer_email, notes, created_at, updated_at
      ) values (?, ?, ?, 'pending', 'USD', ?, ?, ?, ?, ?, ?, ?)
    `).bind(orderId, ref, user.id, payload.subtotalCents, payload.subtotalCents, buyerName, buyerEmail, notes, ts, ts)
  ];

  for (const item of payload.items) {
    const product = await env.DB.prepare('select seller_id from store_products where id = ?').bind(item.productId).first();
    stmts.push(env.DB.prepare(`
      insert into store_order_items (id, order_id, product_id, seller_id, title, qty, unit_price_cents, line_total_cents)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(newId('oi'), orderId, item.productId, product.seller_id, item.title, item.qty, item.unitPriceCents, item.lineTotalCents));
    if (item.inventoryTracked) {
      stmts.push(env.DB.prepare(`
        update store_products
        set stock_qty = stock_qty - ?, updated_at = ?
        where id = ? and stock_qty >= ?
      `).bind(item.qty, ts, item.productId, item.qty));
    }
  }
  stmts.push(env.DB.prepare('delete from store_cart_items where cart_id = ?').bind(cart.id));
  stmts.push(env.DB.prepare('update store_carts set updated_at = ? where id = ?').bind(ts, cart.id));
  await env.DB.batch(stmts);

  const order = await env.DB.prepare('select * from store_orders where id = ?').bind(orderId).first();
  const { results: lines } = await env.DB.prepare('select * from store_order_items where order_id = ?').bind(orderId).all();
  return {
    order: mapOrder(order),
    items: (lines || []).map((line) => ({
      id: line.id,
      productId: line.product_id,
      sellerId: line.seller_id,
      title: line.title,
      qty: line.qty,
      unitPriceCents: line.unit_price_cents,
      lineTotalCents: line.line_total_cents
    })),
    payment: {
      mode: 'manual_pending',
      note: 'Order recorded as pending. Payment provider not charged in Worker yet.'
    }
  };
}

export async function handleStoreApi(request, env, context) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (!path.startsWith('/api/store')) return null;
  if (!env.DB) return context.json({ ok: false, error: 'storage unavailable' }, 503);

  try {
    if (path === '/api/store/products' && request.method === 'GET') {
      return context.json({ ok: true, products: await listPublishedProducts(env, url) });
    }
    const productMatch = path.match(/^\/api\/store\/products\/([^/]+)$/);
    if (productMatch && request.method === 'GET') {
      return context.json({ ok: true, product: await getPublishedProduct(env, decodeURIComponent(productMatch[1])) });
    }
    const sellerPublicMatch = path.match(/^\/api\/store\/sellers\/([^/]+)$/);
    if (sellerPublicMatch && request.method === 'GET') {
      const key = decodeURIComponent(sellerPublicMatch[1]);
      const row = await env.DB.prepare(`select * from store_sellers where (id = ? or slug = ?) and status = 'active'`).bind(key, key).first();
      if (!row) throw new ApiError(404, 'Seller not found.');
      const { results } = await env.DB.prepare(`
        select * from store_products where seller_id = ? and status = 'published' order by updated_at desc limit 100
      `).bind(row.id).all();
      return context.json({ ok: true, seller: mapSeller(row), products: (results || []).map(mapProduct) });
    }

    if (path === '/api/store/seller' && request.method === 'GET') {
      const user = await requireUser(request, env, context);
      return context.json({ ok: true, seller: mapSeller(await getSellerForUser(env, user.id)) });
    }
    if (path === '/api/store/seller' && (request.method === 'POST' || request.method === 'PUT')) {
      const user = await requireUser(request, env, context);
      return context.json({ ok: true, seller: await upsertSeller(env, user, await readJson(request)) });
    }
    if (path === '/api/store/seller/products' && request.method === 'GET') {
      const user = await requireUser(request, env, context);
      const seller = await requireSeller(env, user, { allowPending: true });
      const { results } = await env.DB.prepare(`select * from store_products where seller_id = ? order by updated_at desc limit 200`).bind(seller.id).all();
      return context.json({ ok: true, products: (results || []).map(mapProduct) });
    }
    if (path === '/api/store/seller/products' && request.method === 'POST') {
      const user = await requireUser(request, env, context);
      const seller = await requireSeller(env, user, { allowPending: true });
      const product = await saveProduct(env, seller, null, await readJson(request), true);
      return context.json({ ok: true, product }, 201);
    }
    const sellerProductMatch = path.match(/^\/api\/store\/seller\/products\/([^/]+)$/);
    if (sellerProductMatch && request.method === 'PUT') {
      const user = await requireUser(request, env, context);
      const seller = await requireSeller(env, user, { allowPending: true });
      const product = await saveProduct(env, seller, decodeURIComponent(sellerProductMatch[1]), await readJson(request), false);
      return context.json({ ok: true, product });
    }
    if (sellerProductMatch && request.method === 'DELETE') {
      const user = await requireUser(request, env, context);
      const seller = await requireSeller(env, user, { allowPending: true });
      const productId = decodeURIComponent(sellerProductMatch[1]);
      const result = await env.DB.prepare(`update store_products set status = 'archived', updated_at = ? where id = ? and seller_id = ?`)
        .bind(nowIso(), productId, seller.id).run();
      if (!result.meta?.changes) throw new ApiError(404, 'Product not found.');
      return context.json({ ok: true });
    }
    const inventoryMatch = path.match(/^\/api\/store\/seller\/products\/([^/]+)\/inventory$/);
    if (inventoryMatch && request.method === 'PATCH') {
      const user = await requireUser(request, env, context);
      const seller = await requireSeller(env, user, { allowPending: true });
      const body = await readJson(request);
      const productId = decodeURIComponent(inventoryMatch[1]);
      const stockQty = cleanCents(body.stockQty, 'stock');
      const result = await env.DB.prepare(`
        update store_products set stock_qty = ?, inventory_tracked = 1, updated_at = ? where id = ? and seller_id = ?
      `).bind(stockQty, nowIso(), productId, seller.id).run();
      if (!result.meta?.changes) throw new ApiError(404, 'Product not found.');
      return context.json({ ok: true, product: mapProduct(await env.DB.prepare('select * from store_products where id = ?').bind(productId).first()) });
    }
    if (path === '/api/store/seller/orders' && request.method === 'GET') {
      const user = await requireUser(request, env, context);
      const seller = await requireSeller(env, user, { allowPending: true });
      const { results } = await env.DB.prepare(`
        select distinct o.* from store_orders o
        join store_order_items i on i.order_id = o.id
        where i.seller_id = ?
        order by o.created_at desc limit 200
      `).bind(seller.id).all();
      return context.json({ ok: true, orders: (results || []).map(mapOrder) });
    }

    if (path === '/api/store/cart' && request.method === 'GET') {
      const user = await requireUser(request, env, context);
      const cart = await ensureCart(env, user.id);
      return context.json({ ok: true, cartId: cart.id, ...(await loadCart(env, cart.id)) });
    }
    if (path === '/api/store/cart/items' && request.method === 'POST') {
      const user = await requireUser(request, env, context);
      const body = await readJson(request);
      const productId = cleanText(body.productId, 128, 'Product id', true);
      if (!isValidId(productId)) throw new ApiError(400, 'Invalid product id.');
      const amount = cleanQty(body.qty ?? 1);
      const product = await env.DB.prepare(`
        select p.*, s.status as seller_status from store_products p
        join store_sellers s on s.id = p.seller_id where p.id = ?
      `).bind(productId).first();
      if (!product || product.status !== 'published' || product.seller_status !== 'active') throw new ApiError(404, 'Product not found.');
      if (product.inventory_tracked && product.stock_qty < amount) throw new ApiError(409, 'Insufficient stock.');
      const cart = await ensureCart(env, user.id);
      const ts = nowIso();
      const existing = await env.DB.prepare('select * from store_cart_items where cart_id = ? and product_id = ?').bind(cart.id, productId).first();
      if (existing) {
        const nextQty = existing.qty + amount;
        if (product.inventory_tracked && product.stock_qty < nextQty) throw new ApiError(409, 'Insufficient stock.');
        await env.DB.prepare('update store_cart_items set qty = ?, unit_price_cents = ?, updated_at = ? where id = ?')
          .bind(nextQty, product.price_cents, ts, existing.id).run();
      } else {
        await env.DB.prepare(`
          insert into store_cart_items (id, cart_id, product_id, qty, unit_price_cents, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?, ?)
        `).bind(newId('ci'), cart.id, productId, amount, product.price_cents, ts, ts).run();
      }
      await env.DB.prepare('update store_carts set updated_at = ? where id = ?').bind(ts, cart.id).run();
      return context.json({ ok: true, cartId: cart.id, ...(await loadCart(env, cart.id)) });
    }
    const cartItemMatch = path.match(/^\/api\/store\/cart\/items\/([^/]+)$/);
    if (cartItemMatch && request.method === 'PATCH') {
      const user = await requireUser(request, env, context);
      const body = await readJson(request);
      const amount = cleanQty(body.qty);
      const cart = await ensureCart(env, user.id);
      const itemId = decodeURIComponent(cartItemMatch[1]);
      const item = await env.DB.prepare('select * from store_cart_items where id = ? and cart_id = ?').bind(itemId, cart.id).first();
      if (!item) throw new ApiError(404, 'Cart item not found.');
      const product = await env.DB.prepare('select * from store_products where id = ?').bind(item.product_id).first();
      if (product?.inventory_tracked && product.stock_qty < amount) throw new ApiError(409, 'Insufficient stock.');
      const ts = nowIso();
      await env.DB.prepare('update store_cart_items set qty = ?, updated_at = ? where id = ?').bind(amount, ts, itemId).run();
      await env.DB.prepare('update store_carts set updated_at = ? where id = ?').bind(ts, cart.id).run();
      return context.json({ ok: true, cartId: cart.id, ...(await loadCart(env, cart.id)) });
    }
    if (cartItemMatch && request.method === 'DELETE') {
      const user = await requireUser(request, env, context);
      const cart = await ensureCart(env, user.id);
      await env.DB.prepare('delete from store_cart_items where id = ? and cart_id = ?').bind(decodeURIComponent(cartItemMatch[1]), cart.id).run();
      await env.DB.prepare('update store_carts set updated_at = ? where id = ?').bind(nowIso(), cart.id).run();
      return context.json({ ok: true, cartId: cart.id, ...(await loadCart(env, cart.id)) });
    }
    if (path === '/api/store/checkout' && request.method === 'POST') {
      const user = await requireUser(request, env, context);
      const result = await checkout(env, user, await readJson(request));
      return context.json({ ok: true, ...result }, 201);
    }
    if (path === '/api/store/orders' && request.method === 'GET') {
      const user = await requireUser(request, env, context);
      const { results } = await env.DB.prepare('select * from store_orders where user_id = ? order by created_at desc limit 100').bind(user.id).all();
      return context.json({ ok: true, orders: (results || []).map(mapOrder) });
    }
    const orderMatch = path.match(/^\/api\/store\/orders\/([^/]+)$/);
    if (orderMatch && request.method === 'GET') {
      const user = await requireUser(request, env, context);
      const orderId = decodeURIComponent(orderMatch[1]);
      const order = await env.DB.prepare('select * from store_orders where id = ?').bind(orderId).first();
      if (!order) throw new ApiError(404, 'Order not found.');
      if (order.user_id !== user.id && !(await isOwner(env, user))) throw new ApiError(403, 'Forbidden.');
      const { results } = await env.DB.prepare('select * from store_order_items where order_id = ?').bind(orderId).all();
      return context.json({
        ok: true,
        order: mapOrder(order),
        items: (results || []).map((line) => ({
          id: line.id,
          productId: line.product_id,
          sellerId: line.seller_id,
          title: line.title,
          qty: line.qty,
          unitPriceCents: line.unit_price_cents,
          lineTotalCents: line.line_total_cents
        }))
      });
    }

    if (path === '/api/store/donations' && request.method === 'POST') {
      const user = await context.getSessionUser(request, env);
      const body = await readJson(request);
      const amountCents = cleanCents(body.amountCents, 'amount');
      if (amountCents < 100) throw new ApiError(400, 'Minimum donation is 100 cents.');
      const donorName = cleanText(body.donorName || user?.name, 120, 'Donor name', true);
      const donorEmail = cleanText(body.donorEmail || user?.email, 254, 'Donor email', true).toLowerCase();
      const message = cleanText(body.message || '', 2000, 'Message');
      const churchId = body.churchId ? cleanText(body.churchId, 128, 'Church id') : null;
      const sellerId = body.sellerId ? cleanText(body.sellerId, 128, 'Seller id') : null;
      if (churchId && !isValidId(churchId)) throw new ApiError(400, 'Invalid church id.');
      if (sellerId && !isValidId(sellerId)) throw new ApiError(400, 'Invalid seller id.');
      const id = newId('don');
      const ref = makeDonationRef();
      const ts = nowIso();
      await env.DB.prepare(`
        insert into store_donations (
          id, donation_ref, user_id, church_id, seller_id, amount_cents, currency, donor_name, donor_email, message, status, created_at
        ) values (?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, 'recorded', ?)
      `).bind(id, ref, user?.id || null, churchId, sellerId, amountCents, donorName, donorEmail, message, ts).run();
      return context.json({ ok: true, donation: mapDonation(await env.DB.prepare('select * from store_donations where id = ?').bind(id).first()) }, 201);
    }

    if (path.startsWith('/api/store/admin')) {
      const user = await requireUser(request, env, context);
      if (!(await isOwner(env, user))) throw new ApiError(403, 'Owner access required.');

      if (path === '/api/store/admin/products' && request.method === 'GET') {
        const status = String(url.searchParams.get('status') || '').trim();
        const binds = [];
        let where = '1=1';
        if (status) {
          if (!PRODUCT_STATUSES.has(status)) throw new ApiError(400, 'Invalid status.');
          where = 'p.status = ?';
          binds.push(status);
        }
        const { results } = await env.DB.prepare(`
          select p.*, s.display_name as seller_name
          from store_products p join store_sellers s on s.id = p.seller_id
          where ${where}
          order by p.updated_at desc limit 300
        `).bind(...binds).all();
        return context.json({ ok: true, products: (results || []).map(mapProduct) });
      }
      const adminProductMatch = path.match(/^\/api\/store\/admin\/products\/([^/]+)$/);
      if (adminProductMatch && request.method === 'PATCH') {
        const body = await readJson(request);
        const status = String(body.status || '').toLowerCase();
        if (!PRODUCT_STATUSES.has(status)) throw new ApiError(400, 'Invalid status.');
        const productId = decodeURIComponent(adminProductMatch[1]);
        const product = await env.DB.prepare('select seller_id from store_products where id = ?').bind(productId).first();
        if (!product) throw new ApiError(404, 'Product not found.');
        const timestamp = nowIso();
        const result = await env.DB.prepare('update store_products set status = ?, updated_at = ? where id = ?').bind(status, timestamp, productId).run();
        if (status === 'published') await env.DB.prepare("update store_sellers set status = 'active', updated_at = ? where id = ? and status = 'pending'").bind(timestamp, product.seller_id).run();
        if (!result.meta?.changes) throw new ApiError(404, 'Product not found.');
        return context.json({ ok: true, product: mapProduct(await env.DB.prepare('select * from store_products where id = ?').bind(productId).first()) });
      }
      if (path === '/api/store/admin/sellers' && request.method === 'GET') {
        const { results } = await env.DB.prepare('select * from store_sellers order by updated_at desc limit 300').all();
        return context.json({ ok: true, sellers: (results || []).map(mapSeller) });
      }
      const adminSellerMatch = path.match(/^\/api\/store\/admin\/sellers\/([^/]+)$/);
      if (adminSellerMatch && request.method === 'PATCH') {
        const body = await readJson(request);
        const status = String(body.status || '').toLowerCase();
        if (!SELLER_STATUSES.has(status)) throw new ApiError(400, 'Invalid status.');
        const sellerId = decodeURIComponent(adminSellerMatch[1]);
        const result = await env.DB.prepare('update store_sellers set status = ?, updated_at = ? where id = ?').bind(status, nowIso(), sellerId).run();
        if (!result.meta?.changes) throw new ApiError(404, 'Seller not found.');
        return context.json({ ok: true, seller: mapSeller(await env.DB.prepare('select * from store_sellers where id = ?').bind(sellerId).first()) });
      }
      if (path === '/api/store/admin/orders' && request.method === 'GET') {
        const { results } = await env.DB.prepare('select * from store_orders order by created_at desc limit 300').all();
        return context.json({ ok: true, orders: (results || []).map(mapOrder) });
      }
      const adminOrderMatch = path.match(/^\/api\/store\/admin\/orders\/([^/]+)$/);
      if (adminOrderMatch && request.method === 'PATCH') {
        const body = await readJson(request);
        const status = String(body.status || '').toLowerCase();
        if (!ORDER_STATUSES.has(status)) throw new ApiError(400, 'Invalid status.');
        const orderId = decodeURIComponent(adminOrderMatch[1]);
        const result = await env.DB.prepare('update store_orders set status = ?, updated_at = ? where id = ?').bind(status, nowIso(), orderId).run();
        if (!result.meta?.changes) throw new ApiError(404, 'Order not found.');
        return context.json({ ok: true, order: mapOrder(await env.DB.prepare('select * from store_orders where id = ?').bind(orderId).first()) });
      }
      if (path === '/api/store/admin/donations' && request.method === 'GET') {
        const { results } = await env.DB.prepare('select * from store_donations order by created_at desc limit 300').all();
        return context.json({ ok: true, donations: (results || []).map(mapDonation) });
      }
      if ((path === '/api/store/admin/metrics' || path === '/api/store/admin/overview') && request.method === 'GET') {
        const products = await env.DB.prepare("select count(*) as c from store_products where status = 'published'").first();
        const orders = await env.DB.prepare("select count(*) as c, coalesce(sum(total_cents),0) as revenue from store_orders where status in ('paid','fulfilled')").first();
        const donations = await env.DB.prepare('select count(*) as c, coalesce(sum(amount_cents),0) as total from store_donations').first();
        const sellers = await env.DB.prepare("select count(*) as c from store_sellers where status = 'active'").first();
        return context.json({
          ok: true,
          metrics: {
            publishedProducts: Number(products?.c || 0),
            activeSellers: Number(sellers?.c || 0),
            paidOrders: Number(orders?.c || 0),
            orderRevenueCents: Number(orders?.revenue || 0),
            donations: Number(donations?.c || 0),
            donationTotalCents: Number(donations?.total || 0)
          }
        });
      }
    }

    if (path === '/api/store/preview/seed' && request.method === 'POST') {
      const user = await requireUser(request, env, context);
      if (!(await isOwner(env, user))) throw new ApiError(403, 'Owner access required.');
      if (!isPreviewEnv(env)) throw new ApiError(403, 'Preview seed blocked outside preview/dev.');
      let seller = await getSellerForUser(env, user.id);
      if (!seller) {
        seller = await upsertSeller(env, { ...user, is_creator: 1 }, {
          displayName: 'MWoE Preview Store',
          slug: 'mwoe-preview-store',
          bio: 'Preview seller for QA'
        });
        await env.DB.prepare("update store_sellers set status = 'active', updated_at = ? where id = ?").bind(nowIso(), seller.id).run();
        seller = await env.DB.prepare('select * from store_sellers where id = ?').bind(seller.id).first();
      }
      const existing = await env.DB.prepare("select id from store_products where seller_id = ? and slug = 'preview-devotional-journal'").bind(seller.id).first();
      if (!existing) {
        await saveProduct(env, { ...seller, status: 'active' }, null, {
          kind: 'product',
          title: 'Preview Devotional Journal',
          slug: 'preview-devotional-journal',
          description: 'Sample product for preview QA.',
          priceCents: 1800,
          compareAtCents: 2200,
          status: 'published',
          inventoryTracked: true,
          stockQty: 25
        }, true);
      }
      return context.json({ ok: true, seller: mapSeller(seller) });
    }

    return context.json({ ok: false, error: 'not found' }, 404);
  } catch (error) {
    if (error instanceof ApiError) return context.json({ ok: false, error: error.message }, error.status);
    throw error;
  }
}
