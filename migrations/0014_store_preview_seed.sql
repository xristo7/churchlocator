-- Preview-only demo seed. Safe to re-run (insert or ignore).
-- Apply only to D1 my-way-of-evangelism-preview. Do NOT apply to production.

insert or ignore into store_sellers (
  id, user_id, church_id, display_name, slug, bio, logo_url, status, created_at, updated_at
) select
  'seller_preview_demo',
  id,
  null,
  'MWoE Preview Store',
  'mwoe-preview-store',
  'Demo seller for Cloudflare preview only.',
  null,
  'active',
  datetime('now'),
  datetime('now')
from users
where is_creator = 1
order by created_at asc
limit 1;

insert or ignore into store_products (
  id, seller_id, kind, title, slug, description, image_url, currency, price_cents,
  compare_at_cents, status, inventory_tracked, stock_qty, metadata_json, created_at, updated_at
)
select
  'prod_preview_devotional',
  'seller_preview_demo',
  'product',
  'Preview Devotional Journal',
  'preview-devotional-journal',
  'Sample physical product for storefront QA on preview.',
  null,
  'USD',
  1800,
  2200,
  'published',
  1,
  25,
  null,
  datetime('now'),
  datetime('now')
where exists (select 1 from store_sellers where id = 'seller_preview_demo');

insert or ignore into store_products (
  id, seller_id, kind, title, slug, description, image_url, currency, price_cents,
  compare_at_cents, status, inventory_tracked, stock_qty, metadata_json, created_at, updated_at
)
select
  'prod_preview_prayer_coaching',
  'seller_preview_demo',
  'service',
  'Preview Prayer Coaching Session',
  'preview-prayer-coaching',
  'Sample service listing for storefront QA on preview.',
  null,
  'USD',
  4500,
  null,
  'published',
  0,
  0,
  null,
  datetime('now'),
  datetime('now')
where exists (select 1 from store_sellers where id = 'seller_preview_demo');
