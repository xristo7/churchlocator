create table if not exists platform_settings (
  key text primary key,
  value_json text not null check(json_valid(value_json)),
  revision integer not null default 1,
  updated_by text references users(id),
  updated_at text not null
);

insert into platform_settings (key, value_json, revision, updated_by, updated_at)
values (
  'church_publication',
  json_object('autoPublishPendingChurches', json('false')),
  1,
  null,
  strftime('%Y-%m-%dT%H:%M:%fZ','now')
)
on conflict(key) do nothing;
