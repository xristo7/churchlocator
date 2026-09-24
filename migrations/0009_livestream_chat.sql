create table livestream_chat_messages (
  id text primary key,
  entity_id text not null references platform_entities(id) on delete cascade,
  stream_type text not null check(stream_type in ('church','channel','store')),
  user_id text not null references users(id) on delete cascade,
  body text not null check(length(body) between 1 and 300),
  created_at text not null,
  deleted_at text
);

create index livestream_chat_messages_stream
  on livestream_chat_messages(entity_id, stream_type, created_at desc);
