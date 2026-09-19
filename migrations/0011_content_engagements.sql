create table if not exists content_engagements (
  content_type text not null check(content_type in ('channel','product','resource','livestream')),
  content_id text not null,
  user_id text not null references users(id) on delete cascade,
  reaction text not null default 'love' check(reaction = 'love'),
  created_at text not null,
  primary key(content_type, content_id, user_id, reaction)
);

create index if not exists idx_content_engagements_totals
  on content_engagements(content_type, content_id, reaction);
