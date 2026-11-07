create table meditation_voice (
 session_id text primary key references meditation_sessions(id) on delete cascade,
 generation text not null,
 meeting_id text,
 status text not null check(status in ('creating','live','ended','failed')),
 expires_at integer not null
);
