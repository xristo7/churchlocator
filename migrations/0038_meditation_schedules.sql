create table if not exists meditation_schedule_events (
  id text primary key,
  room_id text not null references platform_entities(id) on delete cascade,
  owner_user_id text not null references users(id) on delete cascade,
  scheduled_at text not null,
  session_id text references meditation_sessions(id) on delete set null,
  opened_at text,
  alert_stage integer not null default 0,
  created_at text not null,
  updated_at text not null,
  read_at text,
  unique(room_id,scheduled_at)
);
create index if not exists meditation_schedule_alerts on meditation_schedule_events(owner_user_id,read_at,updated_at desc);
