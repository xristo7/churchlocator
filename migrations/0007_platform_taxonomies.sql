create table platform_taxonomies (
  key text primary key check(key in ('denominations','languages','worship_styles','store_categories','product_categories','channel_topics','resource_topics')),
  items_json text not null check(json_valid(items_json) and json_type(items_json) = 'array'),
  revision integer not null default 1,
  updated_by text references users(id),
  updated_at text not null
);

insert into platform_taxonomies (key, items_json, updated_at) values
  ('denominations', json('["Christ Embassy","New Generation","Pentecostal","Full Gospel","Charismatic","Baptist","Catholic","Anglican","Presbyterian","Protestant"]'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('languages', json('["English","French","Spanish","Portuguese","Swahili","Arabic"]'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('worship_styles', json('["Contemporary","Traditional","Blended","Charismatic"]'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('store_categories', json('["Books & Resources","Apparel","Music","Gifts","Church Supplies","General"]'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('product_categories', json('["Books","Journals","Apparel","Church Supplies","Study Tools","Kids","Music","Gifts"]'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('channel_topics', json('["Bible Teaching","Worship","Family","Leadership","Youth","Bible Study"]'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('resource_topics', json('["Bible Study","Prayer","Discipleship","Worship","Devotional","Leadership"]'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));
