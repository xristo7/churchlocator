insert into platform_settings (key,value_json,revision,updated_by,updated_at)
values
  ('event_publication','{"autoPublishPendingEvents":false}',1,null,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('store_publication','{"autoPublishPendingStores":false}',1,null,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('product_publication','{"autoPublishPendingProducts":false}',1,null,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('channel_publication','{"autoPublishPendingChannels":false}',1,null,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('resource_publication','{"autoPublishPendingResources":false}',1,null,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
on conflict(key) do nothing;
