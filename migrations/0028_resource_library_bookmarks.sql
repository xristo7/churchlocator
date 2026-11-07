-- Member library and bookmarks for published resources.
create table if not exists resource_library (
  user_id text not null references users(id) on delete cascade,
  resource_id text not null references platform_entities(id) on delete cascade,
  created_at text not null,
  primary key(user_id, resource_id)
);
create index if not exists idx_resource_library_resource on resource_library(resource_id);

create table if not exists resource_bookmarks (
  user_id text not null references users(id) on delete cascade,
  resource_id text not null references platform_entities(id) on delete cascade,
  created_at text not null,
  primary key(user_id, resource_id)
);
create index if not exists idx_resource_bookmarks_resource on resource_bookmarks(resource_id);
