-- Unique playback views per Spotlight item (one per anonymous or signed-in playback key).
alter table spotlight_items add column view_count integer not null default 0;

create table if not exists spotlight_views (
  item_id text not null references spotlight_items(id) on delete cascade,
  playback_key text not null,
  created_at text not null,
  primary key(item_id, playback_key)
);
create index if not exists idx_spotlight_views_item on spotlight_views(item_id);
