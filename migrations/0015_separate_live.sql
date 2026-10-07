create table live_provider_settings (
  id integer primary key check(id=1),
  account_id text not null,
  app_id text not null,
  token_encrypted text not null,
  revision integer not null default 1,
  updated_at text not null
);
create table church_broadcast_sources (
  church_id text primary key references platform_entities(id) on delete cascade,
  mode text not null check(mode in ('external','cloudflare')),
  source_url text,
  input_id text,
  status text not null check(status in ('creating','ready','failed')),
  enabled integer not null default 0 check(enabled in (0,1)),
  revision integer not null default 1,
  updated_at text not null
);
create table channel_live_sessions (
  id text primary key,
  channel_id text not null references platform_entities(id) on delete cascade,
  created_by text not null references users(id),
  title text not null,
  meeting_id text,
  status text not null check(status in ('creating','live','ending','ended','failed')),
  created_at text not null,
  expires_at text not null,
  ended_at text
);
create unique index channel_one_stage on channel_live_sessions(channel_id) where status in ('creating','live','ending');
create index channel_stage_expiry on channel_live_sessions(status,expires_at);
create table channel_live_members (
  session_id text not null references channel_live_sessions(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  participant_id text,
  role text not null default 'viewer' check(role in ('host','viewer')),
  blocked integer not null default 0 check(blocked in (0,1)),
  primary key(session_id,user_id)
);
create table live_notifications (
  session_id text not null references channel_live_sessions(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  created_at text not null,
  read_at text,
  primary key(session_id,user_id)
);
create index live_notifications_user on live_notifications(user_id,created_at desc);
