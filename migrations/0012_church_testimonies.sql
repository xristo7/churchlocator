create table if not exists church_testimonies (
  id text primary key,
  church_id text not null references churches(id) on delete cascade,
  user_id text references users(id) on delete set null,
  author_name text not null,
  author_title text,
  author_photo_url text,
  scene_photo_url text,
  quote text not null,
  rating integer not null default 5 check(rating between 1 and 5),
  status text not null default 'approved' check(status in ('pending','approved','rejected')),
  is_featured integer not null default 0 check(is_featured in (0, 1)),
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_church_testimonies_lookup
  on church_testimonies(church_id, status, is_featured, created_at desc);

create index if not exists idx_church_testimonies_author
  on church_testimonies(user_id, created_at desc);
