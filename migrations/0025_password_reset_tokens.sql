-- Password reset tokens: only a SHA-256 digest of the emailed token is stored.
create table if not exists password_reset_tokens (
  digest text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at text not null,
  used_at text,
  created_at text not null
);

create index if not exists password_reset_tokens_user
  on password_reset_tokens(user_id, created_at);
create index if not exists password_reset_tokens_expiry
  on password_reset_tokens(expires_at, used_at);
