-- Recovered from the preview database (applied 2026-11-06).
-- Adds a private "dislike" rating (like and dislike are mutually exclusive) and a per-minute rate limit.
-- SQLite cannot alter a CHECK constraint, so the table is rebuilt and existing rows are kept.
create table spotlight_engagements_next (
  item_id text not null references spotlight_items(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  action text not null check(action in ('like','save','follow','report','dislike')),
  created_at text not null,
  primary key(item_id, user_id, action)
);
insert into spotlight_engagements_next (item_id, user_id, action, created_at)
  select item_id, user_id, action, created_at from spotlight_engagements;
drop table spotlight_engagements;
alter table spotlight_engagements_next rename to spotlight_engagements;
create index spotlight_engagements_item on spotlight_engagements(item_id, action);

create trigger spotlight_engagements_rating_exclusive
before insert on spotlight_engagements
when new.action in ('like','dislike')
begin
  delete from spotlight_engagements
    where item_id=new.item_id and user_id=new.user_id
      and action in ('like','dislike') and action<>new.action;
end;

create table if not exists spotlight_engagement_rate_limits (
  user_id text not null references users(id) on delete cascade,
  item_id text not null references spotlight_items(id) on delete cascade,
  minute_bucket text not null,
  attempts integer not null check(attempts >= 1),
  primary key(user_id,item_id,minute_bucket)
);
