with owner_account as (
  select u.id as user_id, t.id as tenant_id
  from users u
  join tenants t on t.owner_user_id = u.id
  where lower(u.email) = lower('xristoinno@gmail.com')
  limit 1
), examples (
  id, content_type, title, caption, creator_name, creator_handle,
  media_url, poster_url, full_content_url, preview_source,
  preview_start_seconds, preview_end_seconds, duration_seconds,
  cta_label, placement_kind, priority
) as (values
  (
    'spotlight-example-what-is-the-bible', 'long-preview',
    'What Is the Bible?',
    'A beautifully animated introduction to where the Bible came from, what it contains, and how its unified story leads to Jesus.',
    'BibleProject', '@bibleproject',
    'https://www.youtube.com/watch?v=ak06MSETeo4',
    'https://i.ytimg.com/vi/ak06MSETeo4/maxresdefault.jpg',
    'https://www.youtube.com/watch?v=ak06MSETeo4',
    'creator', 19, 79, 291,
    'Watch on YouTube', 'editorial', 45
  ),
  (
    'spotlight-example-story-of-the-bible', 'long-preview',
    'The Story of the Bible',
    'Follow the Bible’s story from humanity’s earliest choices through Israel, Jesus, and the hope of new creation.',
    'BibleProject', '@bibleproject',
    'https://www.youtube.com/watch?v=7_CGP-12AE0',
    'https://i.ytimg.com/vi/7_CGP-12AE0/maxresdefault.jpg',
    'https://www.youtube.com/watch?v=7_CGP-12AE0',
    'automatic', 0, 60, 347,
    'Watch on YouTube', 'organic', 0
  ),
  (
    'spotlight-example-sermon-on-the-mount', 'long-preview',
    'What Jesus Taught in the Sermon on the Mount',
    'Explore Jesus’ announcement of God’s Kingdom and his invitation to a transformed way of life with God and neighbour.',
    'BibleProject', '@bibleproject',
    'https://www.youtube.com/watch?v=ajwehw_AT0s',
    'https://i.ytimg.com/vi/ajwehw_AT0s/maxresdefault.jpg',
    'https://www.youtube.com/watch?v=ajwehw_AT0s',
    'creator', 95, 155, 531,
    'Watch on YouTube', 'organic', 0
  ),
  (
    'spotlight-example-kingdom-of-god', 'long-preview',
    'Why Jesus Talks About the Kingdom of God',
    'A thoughtful conversation tracing the Kingdom of God through Scripture and explaining why it stands at the centre of Jesus’ message.',
    'BibleProject', '@bibleproject',
    'https://www.youtube.com/watch?v=APEO0FNzwoM',
    'https://i.ytimg.com/vi/APEO0FNzwoM/maxresdefault.jpg',
    'https://www.youtube.com/watch?v=APEO0FNzwoM',
    'creator', 30, 90, 3600,
    'Watch full conversation', 'organic', 0
  ),
  (
    'spotlight-example-about-bibleproject', 'short',
    'Experience the Bible as One Unified Story',
    'Meet BibleProject and discover free visual resources designed to help people experience the Bible as a unified story that leads to Jesus.',
    'BibleProject', '@bibleproject',
    'https://www.youtube.com/watch?v=vFwNZNyDu9k',
    'https://i.ytimg.com/vi/vFwNZNyDu9k/maxresdefault.jpg',
    'https://www.youtube.com/watch?v=vFwNZNyDu9k',
    'creator', 0, 45, 166,
    'Meet BibleProject', 'organic', 0
  )
)
insert or ignore into spotlight_items (
  id, tenant_id, created_by, content_type, title, caption,
  creator_name, creator_handle, creator_avatar_url, media_url, poster_url,
  full_content_url, preview_source, preview_start_seconds,
  preview_end_seconds, duration_seconds, cta_label, cta_url,
  status, placement_kind, comments_enabled, priority,
  published_at, created_at, updated_at
)
select
  e.id, o.tenant_id, o.user_id, e.content_type, e.title, e.caption,
  e.creator_name, e.creator_handle, null, e.media_url, e.poster_url,
  e.full_content_url, e.preview_source, e.preview_start_seconds,
  e.preview_end_seconds, e.duration_seconds, e.cta_label, e.full_content_url,
  'live', e.placement_kind, 1, e.priority,
  strftime('%Y-%m-%dT%H:%M:%fZ','now'),
  strftime('%Y-%m-%dT%H:%M:%fZ','now'),
  strftime('%Y-%m-%dT%H:%M:%fZ','now')
from examples e cross join owner_account o;
