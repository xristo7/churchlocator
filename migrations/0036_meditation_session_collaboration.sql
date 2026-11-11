-- Brief 05.2/05.3: session-only chat, pause requests and bookmarked moments. Additive only.
alter table meditation_session_chat add column kind text not null default 'chat';
alter table meditation_session_chat add column position_sec real;
create table if not exists meditation_session_bookmarks (
  id text primary key,
  room_id text not null,
  session_id text not null,
  user_id text not null references users(id) on delete cascade,
  position_sec real not null,
  verse integer not null default 0,
  label text not null default '',
  created_at text not null
);
create index if not exists idx_meditation_session_bookmarks on meditation_session_bookmarks(session_id, user_id, created_at);
