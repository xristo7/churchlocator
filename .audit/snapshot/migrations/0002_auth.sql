create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  name text not null,
  is_creator integer not null default 0,
  created_at text not null,
  last_login_at text
);

create table if not exists sessions (
  token text primary key,
  user_id text not null references users(id) on delete cascade,
  created_at text not null,
  expires_at text not null
);

create index if not exists idx_sessions_user on sessions(user_id);
create index if not exists idx_sessions_expiry on sessions(expires_at);
