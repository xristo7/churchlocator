-- Recovered from the deployed databases (applied on live 2026-10-30 and preview 2026-10-30).
-- Host-only playback control: the first signed-in host to claim a session owns it.
create table if not exists meditation_session_hosts (
  room_id text not null,
  session_id text not null,
  user_id text not null,
  claimed_at_ms integer not null,
  primary key (room_id, session_id)
);
