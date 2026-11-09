-- Like, private dislike and reports for live broadcasts (church, store and channel streams).
create table live_ratings (
  stream_type text not null check(stream_type in ('church','store','channel')),
  stream_id text not null references platform_entities(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  rating text not null check(rating in ('like','dislike')),
  created_at text not null,
  primary key(stream_type, stream_id, user_id)
);
create index live_ratings_stream on live_ratings(stream_type, stream_id, rating);
create table live_reports (
  stream_type text not null check(stream_type in ('church','store','channel')),
  stream_id text not null references platform_entities(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  created_at text not null,
  primary key(stream_type, stream_id, user_id)
);
