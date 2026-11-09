-- Recovered from the deployed databases (applied on live 2026-10-29 and preview 2026-10-26).
-- Meditation rooms API: rooms, private reflections, shared session state, presence and chat.
create table if not exists meditation_rooms (
  id text primary key,
  created_by text not null references users(id),
  data_json text not null,
  created_at text not null
);
create index if not exists idx_meditation_rooms_created on meditation_rooms(created_at desc);

create table if not exists meditation_reflections (
  id text primary key,
  room_id text not null,
  session_id text,
  user_id text not null references users(id),
  body text not null,
  bookmarked integer not null default 0,
  created_at text not null
);
create index if not exists idx_meditation_reflections_user on meditation_reflections(user_id, room_id, created_at desc);

create table if not exists meditation_session_state (
  room_id text not null,
  session_id text not null,
  track_url text not null default '',
  playing integer not null default 0,
  position_sec real not null default 0,
  started_at text,
  updated_at_ms integer not null,
  updated_by text,
  primary key (room_id, session_id)
);

create table if not exists meditation_session_presence (
  room_id text not null,
  session_id text not null,
  client_id text not null,
  seen_at_ms integer not null,
  primary key (room_id, session_id, client_id)
);

create table if not exists meditation_session_chat (
  id text primary key,
  room_id text not null,
  session_id text not null,
  user_id text not null references users(id),
  body text not null,
  created_at text not null
);
create index if not exists idx_meditation_session_chat on meditation_session_chat(room_id, session_id, created_at);
