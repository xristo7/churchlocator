insert into platform_settings (key, value_json, revision, updated_by, updated_at)
values (
  'meditation_publication',
  json_object('autoPublishPendingMeditations', json('false')),
  1,
  null,
  strftime('%Y-%m-%dT%H:%M:%fZ','now')
)
on conflict(key) do nothing;
