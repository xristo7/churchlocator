create table if not exists owner_access_tokens (
  digest text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at text not null,
  used_at text,
  created_at text not null
);

create index if not exists owner_access_tokens_expiry
  on owner_access_tokens(expires_at, used_at);
