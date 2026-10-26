-- Additive: per-user saved resources (library) and bookmarks.
create table if not exists resource_library (
 user_id text not null references users(id) on delete cascade,
 resource_id text not null references platform_entities(id) on delete cascade,
 list text not null check(list in ('library','bookmark')),
 created_at text not null,
 primary key(user_id,resource_id,list)
);
create index if not exists idx_resource_library_resource on resource_library(resource_id,list);
