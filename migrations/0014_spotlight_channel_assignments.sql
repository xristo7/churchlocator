-- User authorized distributing the existing examples among published channels.
-- Preserve any association already made by an owner. Only associate existing,
-- published channels; do not manufacture a channel when one is missing.
update spotlight_items set channel_entity_id='owner-demo-channel-harbor-worship'
where id in ('spotlight-grace-story','spotlight-example-sermon-on-the-mount','spotlight-example-about-bibleproject')
and channel_entity_id is null and exists(select 1 from platform_entities where id='owner-demo-channel-harbor-worship' and kind='channels' and state='published');
update spotlight_items set channel_entity_id='owner-demo-channel-strong-homes'
where id in ('spotlight-marcus-word','spotlight-example-story-of-the-bible','spotlight-example-kingdom-of-god')
and channel_entity_id is null and exists(select 1 from platform_entities where id='owner-demo-channel-strong-homes' and kind='channels' and state='published');
update spotlight_items set channel_entity_id='owner-demo-channel-everyday-faith'
where id in ('spotlight-river-city','spotlight-example-what-is-the-bible')
and channel_entity_id is null and exists(select 1 from platform_entities where id='owner-demo-channel-everyday-faith' and kind='channels' and state='published');
-- Original examples have no playable video source; keep them as channel features.
update spotlight_items set content_type='channel',full_content_url=null,
  cta_url='app.html?view=channel-detail&id='||channel_entity_id,cta_label='Open Channel',duration_seconds=null,preview_end_seconds=null
where id in ('spotlight-grace-story','spotlight-marcus-word') and channel_entity_id is not null
and full_content_url='app.html?view=channels';
insert or ignore into channel_follows(user_id,channel_id,created_at)
select distinct e.user_id,s.channel_entity_id,strftime('%Y-%m-%dT%H:%M:%fZ','now')
from spotlight_engagements e join spotlight_items s on s.id=e.item_id
where e.action='follow' and s.channel_entity_id is not null;
