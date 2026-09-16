create table spotlight_items (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  created_by text not null references users(id) on delete cascade,
  channel_entity_id text references platform_entities(id) on delete set null,
  subject_entity_id text references platform_entities(id) on delete set null,
  content_type text not null check(content_type in ('short','long-preview','church','channel','event','live')),
  title text not null,
  caption text not null default '',
  creator_name text not null,
  creator_handle text not null default '',
  creator_avatar_url text,
  media_url text,
  poster_url text not null,
  full_content_url text,
  preview_source text not null default 'creator' check(preview_source in ('creator','automatic')),
  preview_start_seconds integer not null default 0 check(preview_start_seconds >= 0),
  preview_end_seconds integer check(preview_end_seconds is null or preview_end_seconds > preview_start_seconds),
  duration_seconds integer check(duration_seconds is null or duration_seconds >= 0),
  cta_label text,
  cta_url text,
  status text not null default 'pending' check(status in ('draft','pending','needs-changes','approved','scheduled','live','rejected','expired')),
  placement_kind text not null default 'organic' check(placement_kind in ('organic','editorial','sponsored')),
  moderation_note text,
  comments_enabled integer not null default 1,
  priority integer not null default 0 check(priority between 0 and 1000),
  scheduled_at text,
  expires_at text,
  published_at text,
  revision integer not null default 1,
  created_at text not null,
  updated_at text not null
);

create index spotlight_items_feed on spotlight_items(status, priority desc, scheduled_at, expires_at);
create index spotlight_items_tenant on spotlight_items(tenant_id, updated_at desc);
create index spotlight_items_channel on spotlight_items(channel_entity_id, status);

create table spotlight_engagements (
  item_id text not null references spotlight_items(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  action text not null check(action in ('like','save','follow','report')),
  created_at text not null,
  primary key(item_id, user_id, action)
);

create index spotlight_engagements_item on spotlight_engagements(item_id, action);

create table spotlight_comments (
  id text primary key,
  item_id text not null references spotlight_items(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  body text not null check(length(body) between 1 and 600),
  status text not null default 'visible' check(status in ('visible','hidden','reported')),
  created_at text not null
);

create index spotlight_comments_item on spotlight_comments(item_id, status, created_at desc);

insert into spotlight_items (
  id, tenant_id, created_by, content_type, title, caption, creator_name, creator_handle,
  poster_url, full_content_url, preview_source, preview_start_seconds, preview_end_seconds,
  duration_seconds, cta_label, cta_url, status, placement_kind, priority, published_at,
  created_at, updated_at
) values
  ('spotlight-grace-story', 'platform-system', 'system:platform', 'long-preview',
   'A new beginning in faith', 'Grace shares how one faithful conversation helped her begin again.',
   'Grace Stories', '@gracestories', '/assets/spotlight/grace-testimony.webp',
   'app.html?view=channels', 'creator', 42, 87, 1920, 'Watch full video',
   'app.html?view=channels', 'live', 'editorial', 90,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('spotlight-river-city', 'platform-system', 'system:platform', 'church',
   'River City Fellowship', 'A welcoming church for real people, real faith and a brighter tomorrow.',
   'River City Fellowship', '@rivercity', '/assets/spotlight/river-city-fellowship.webp',
   'app.html?view=directory', 'creator', 0, null, null, 'View Church',
   'app.html?view=directory', 'live', 'editorial', 70,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('spotlight-marcus-word', 'platform-system', 'system:platform', 'short',
   'Faith moves when we step out', 'Pastor Marcus shares what God taught him in the waiting.',
   'Pastor Marcus Hale', '@marcushale', '/assets/spotlight/pastor-marcus.webp',
   'app.html?view=channels', 'automatic', 0, 60, 80, 'Open Channel',
   'app.html?view=channels', 'live', 'organic', 80,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));
