-- Admin-controlled livestream billing mode. Default is free; owners switch to paid in the admin workspace.
insert into platform_settings (key, value_json, revision, updated_by, updated_at)
values ('livestream_billing', '{"mode":"free"}', 1, null, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
on conflict(key) do nothing;
