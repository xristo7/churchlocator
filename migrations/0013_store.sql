-- Additive store commerce schema (products/services, sellers, inventory, cart, orders, donations).
-- Preview-safe: no drops. Apply to my-way-of-evangelism-preview first; never destructive on prod D1.

create table if not exists store_sellers (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  church_id text references churches(id) on delete set null,
  display_name text not null,
  slug text not null unique,
  bio text,
  logo_url text,
  status text not null default 'pending' check(status in ('pending','active','suspended','rejected')),
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_store_sellers_user on store_sellers(user_id);
create index if not exists idx_store_sellers_status on store_sellers(status, updated_at desc);

create table if not exists store_products (
  id text primary key,
  seller_id text not null references store_sellers(id) on delete cascade,
  kind text not null default 'product' check(kind in ('product','service','digital')),
  title text not null,
  slug text not null,
  description text,
  image_url text,
  currency text not null default 'USD',
  price_cents integer not null check(price_cents >= 0),
  compare_at_cents integer,
  status text not null default 'draft' check(status in ('draft','pending','published','archived')),
  inventory_tracked integer not null default 1 check(inventory_tracked in (0, 1)),
  stock_qty integer not null default 0 check(stock_qty >= 0),
  metadata_json text,
  created_at text not null,
  updated_at text not null,
  unique(seller_id, slug)
);

create index if not exists idx_store_products_catalog
  on store_products(status, kind, updated_at desc);
create index if not exists idx_store_products_seller
  on store_products(seller_id, status, updated_at desc);

create table if not exists store_carts (
  id text primary key,
  user_id text not null unique references users(id) on delete cascade,
  updated_at text not null,
  created_at text not null
);

create table if not exists store_cart_items (
  id text primary key,
  cart_id text not null references store_carts(id) on delete cascade,
  product_id text not null references store_products(id) on delete cascade,
  qty integer not null check(qty > 0),
  unit_price_cents integer not null check(unit_price_cents >= 0),
  created_at text not null,
  updated_at text not null,
  unique(cart_id, product_id)
);

create index if not exists idx_store_cart_items_cart on store_cart_items(cart_id);

create table if not exists store_orders (
  id text primary key,
  order_ref text not null unique,
  user_id text not null references users(id) on delete restrict,
  status text not null default 'pending' check(status in ('pending','paid','fulfilled','cancelled','refunded')),
  currency text not null default 'USD',
  subtotal_cents integer not null check(subtotal_cents >= 0),
  total_cents integer not null check(total_cents >= 0),
  buyer_name text not null,
  buyer_email text not null,
  notes text,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_store_orders_user on store_orders(user_id, created_at desc);
create index if not exists idx_store_orders_status on store_orders(status, created_at desc);

create table if not exists store_order_items (
  id text primary key,
  order_id text not null references store_orders(id) on delete cascade,
  product_id text not null references store_products(id) on delete restrict,
  seller_id text not null references store_sellers(id) on delete restrict,
  title text not null,
  qty integer not null check(qty > 0),
  unit_price_cents integer not null check(unit_price_cents >= 0),
  line_total_cents integer not null check(line_total_cents >= 0)
);

create index if not exists idx_store_order_items_order on store_order_items(order_id);
create index if not exists idx_store_order_items_seller on store_order_items(seller_id, order_id);

create table if not exists store_donations (
  id text primary key,
  donation_ref text not null unique,
  user_id text references users(id) on delete set null,
  church_id text references churches(id) on delete set null,
  seller_id text references store_sellers(id) on delete set null,
  amount_cents integer not null check(amount_cents > 0),
  currency text not null default 'USD',
  donor_name text not null,
  donor_email text not null,
  message text,
  status text not null default 'recorded' check(status in ('recorded','confirmed','refunded')),
  created_at text not null
);

create index if not exists idx_store_donations_created on store_donations(created_at desc);
create index if not exists idx_store_donations_church on store_donations(church_id, created_at desc);
