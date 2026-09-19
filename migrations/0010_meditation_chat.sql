create table meditation_chat_messages (
  id text primary key,
  room_id text not null references platform_entities(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  body text not null check(length(body) between 1 and 300),
  is_host integer not null default 0 check(is_host in (0, 1)),
  created_at text not null,
  deleted_at text
);

create index meditation_chat_messages_room
  on meditation_chat_messages(room_id, created_at desc);
