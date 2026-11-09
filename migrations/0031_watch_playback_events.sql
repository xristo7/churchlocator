-- Recovered from the preview database (applied 2026-11-06). Unique playback starts per Spotlight/watch item.
create table if not exists watch_playback_events (
  item_id text not null references spotlight_items(id) on delete cascade,
  day_bucket text not null,
  session_hash text not null,
  created_at text not null,
  primary key (item_id, day_bucket, session_hash)
);
create index if not exists watch_playback_events_day on watch_playback_events(day_bucket, item_id);
