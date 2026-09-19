import { ApiError, readJson } from './security.js';
import { isOwner } from './trusted-platform.js';


export const PRODUCT_KINDS = new Set(['product', 'service', 'digital']);
export const PRODUCT_STATUSES = new Set(['draft', 'pending', 'published', 'archived']);
export const SELLER_STATUSES = new Set(['pending', 'active', 'suspended', 'rejected']);
export const ORDER_STATUSES = new Set(['pending', 'paid', 'fulfilled', 'cancelled', 'refunded']);

export const isValidId = (value) => /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(String(value || ''));

export function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function makeOrderRef() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.getRandomValues(new Uint8Array(3));
  const suffix = Array.from(rand, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `ORD-${stamp}-${suffix}`;
}

export function makeDonationRef() {
  return `DON-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export function cleanText(value, max, label, required = false) {
  const out = String(value ?? '').trim();
  if (required && !out) throw new ApiError(400, `${label} is required.`);
  if (out.length > max) throw new ApiError(400, `${label} is too long.`);
  return out;
}

export function cleanSlug(value) {
  const slug = cleanText(value, 80, 'Slug', true)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length < 2) throw new ApiError(400, 'Slug is invalid.');
  return slug;
}

export function cleanCents(value, label) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new ApiError(400, `Invalid ${label}.`);
  return n;
}

export function cleanQty(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 999) throw new ApiError(400, 'Invalid quantity.');
  return n;
}

export function isPreviewEnv(env) {
  const value = String(env.ENVIRONMENT || env.ENV || '').toLowerCase();
  return value === 'preview' || value === 'development' || value === 'dev' || value === '';
}

export function mapSeller(row) {
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

export function mapProduct(row) {
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

export function mapOrder(row) {
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

export function mapDonation(row) {
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

export async function requireUser(request, env, context) {
  const user = await context.getSessionUser(request, env);
  if (!user) throw new ApiError(401, 'Sign in required.');
  return user;
}

export async function getSellerForUser(env, userId) {
  return env.DB.prepare('select * from store_sellers where user_id = ? order by created_at asc limit 1').bind(userId).first();
}

export async function requireSeller(env, user, { allowPending = false } = {}) {
  const seller = await getSellerForUser(env, user.id);
  if (!seller) throw new ApiError(403, 'Seller profile required.');
  if (seller.status === 'active' || allowPending || (await isOwner(env, user))) return seller;
  throw new ApiError(403, 'Seller account is not active.');
}

export async function ensureCart(env, userId) {
  const existing = await env.DB.prepare('select * from store_carts where user_id = ?').bind(userId).first();
  if (existing) return existing;
  const id = newId('cart');
  const ts = nowIso();
  await env.DB.prepare('insert into store_carts (id, user_id, created_at, updated_at) values (?, ?, ?, ?)').bind(id, userId, ts, ts).run();
  return { id, user_id: userId, created_at: ts, updated_at: ts };
}

export async function loadCart(env, cartId) {
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

export async function listPublishedProducts(env, url) {
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

export async function getPublishedProduct(env, productId) {
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

export async function upsertSeller(env, user, body) {
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

export async function saveProduct(env, seller, productId, body, isCreate) {
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

export async function checkout(env, user, body) {
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

