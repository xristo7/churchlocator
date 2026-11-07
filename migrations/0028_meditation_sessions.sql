create table if not exists meditation_sessions (
  id text primary key,
  room_id text not null references platform_entities(id) on delete cascade,
  host_user_id text not null references users(id) on delete cascade,
  state_json text not null,
  revision integer not null default 1,
  updated_at integer not null
);
create index if not exists meditation_sessions_room on meditation_sessions(room_id);
