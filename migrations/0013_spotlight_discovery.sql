create table channel_follows (
  user_id text not null references users(id) on delete cascade,
  channel_id text not null references platform_entities(id) on delete cascade,
  notifications_enabled integer not null default 1 check(notifications_enabled in (0,1)),
  created_at text not null,
  primary key(user_id,channel_id)
);
create index channel_follows_channel on channel_follows(channel_id,created_at);
create table spotlight_publications (
  item_id text primary key references spotlight_items(id) on delete cascade,
  published_at text not null
);
-- Existing stories are not new publication events at deployment.
insert into spotlight_publications select id,coalesce(published_at,updated_at) from spotlight_items
where status='live' or (status='approved' and (scheduled_at is null or scheduled_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now'))) or (status='scheduled' and scheduled_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now'));
create table spotlight_notifications (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  item_id text not null references spotlight_items(id) on delete cascade,
  kind text not null check(kind in ('publication','reminder')),
  created_at text not null,
  read_at text
);
create index spotlight_notifications_user on spotlight_notifications(user_id,created_at desc);
create table spotlight_reminders (
  user_id text not null references users(id) on delete cascade,
  item_id text not null references spotlight_items(id) on delete cascade,
  due_at text not null,
  delivered_at text,
  primary key(user_id,item_id)
);
create index spotlight_reminders_due on spotlight_reminders(delivered_at,due_at);
