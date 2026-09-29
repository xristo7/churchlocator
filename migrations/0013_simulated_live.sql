-- Scheduled play-as-live church livestreams.
-- Next migration on origin/main (after 0012_church_testimonies). Does not touch existing livestream_url columns.
create table if not exists simulated_live_streams (
  id text primary key,
  church_id text not null references churches(id) on delete cascade,
  title text not null,
  description text,
  video_url text not null,
  poster_url text,
  video_source text not null check (video_source in ('upload','mp4_url')),
  duration_seconds integer not null check (duration_seconds > 0),
  play_mode text not null check (play_mode in ('once','loop')),
  loop_window_minutes integer check (
    (play_mode = 'once') or
    (loop_window_minutes is not null and loop_window_minutes * 60 >= duration_seconds)
  ),
  timezone text not null default 'Africa/Kampala',
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_by text,
  paused_by text,
  paused_at text,
  moderation_locked integer not null default 0,
  moderation_note text,
  created_at text not null,
  updated_at text not null
);

create table if not exists simulated_live_slots (
  id text primary key,
  stream_id text not null references simulated_live_streams(id) on delete cascade,
  church_id text not null,
  kind text not null check (kind in ('once','weekly')),
  starts_at text,
  weekday integer check (weekday is null or weekday between 0 and 6),
  local_time text,
  active_from text,
  active_until text,
  created_at text not null
);

-- Tracks R2 multipart uploads so parts/completion can be tied to one church.
create table if not exists simulated_live_uploads (
  upload_id text primary key,
  object_key text not null unique,
  church_id text not null,
  created_by text,
  size integer not null,
  part_size integer not null,
  status text not null default 'pending' check (status in ('pending','completed','aborted')),
  first_part_ok integer not null default 0,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_simulated_live_streams_church_status on simulated_live_streams(church_id, status);
create index if not exists idx_simulated_live_slots_stream on simulated_live_slots(stream_id);
create index if not exists idx_simulated_live_slots_church on simulated_live_slots(church_id);
create index if not exists idx_simulated_live_uploads_church on simulated_live_uploads(church_id);
