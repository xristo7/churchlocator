-- One active 6-digit email verification code per user; only a SHA-256 digest is stored.
create table if not exists email_verification_codes (
  user_id text primary key references users(id) on delete cascade,
  code_digest text not null,
  expires_at text not null,
  attempts integer not null default 0,
  last_sent_at text not null,
  created_at text not null
);

-- Existing accounts (including Google sign-ins) are treated as verified.
update users
   set email_verified_at = coalesce(created_at, last_login_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
 where email_verified_at is null;
