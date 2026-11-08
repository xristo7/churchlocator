-- Allow a private "dislike" rating on Spotlight items. SQLite cannot alter a CHECK constraint,
-- so the table is rebuilt and existing rows are kept.
create table spotlight_engagements_next (
  item_id text not null references spotlight_items(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  action text not null check(action in ('like','dislike','save','follow','report')),
  created_at text not null,
  primary key(item_id, user_id, action)
);
insert into spotlight_engagements_next (item_id, user_id, action, created_at)
  select item_id, user_id, action, created_at from spotlight_engagements;
drop table spotlight_engagements;
alter table spotlight_engagements_next rename to spotlight_engagements;
create index spotlight_engagements_item on spotlight_engagements(item_id, action);
