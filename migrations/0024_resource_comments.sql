create table if not exists resource_comments (
 id text primary key,
 resource_id text not null references platform_entities(id) on delete cascade,
 user_id text not null references users(id),
 body text not null check(length(body) between 1 and 1000),
 status text not null default 'visible' check(status in ('visible','hidden')),
 created_at text not null
);

create index if not exists idx_resource_comments_visible
 on resource_comments(resource_id,status,created_at desc,id desc);
