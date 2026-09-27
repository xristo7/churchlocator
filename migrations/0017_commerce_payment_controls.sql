-- Payment collection is disabled by default. An MFA-verified owner may enable
-- either sandbox collection surface from the owner dashboard.
create table if not exists commerce_payment_settings (
  id integer primary key check (id = 1),
  store_sandbox_enabled integer not null default 0 check (store_sandbox_enabled in (0, 1)),
  giving_sandbox_enabled integer not null default 0 check (giving_sandbox_enabled in (0, 1)),
  updated_by text references users(id) on delete set null,
  updated_at text not null
);

insert into commerce_payment_settings (id, store_sandbox_enabled, giving_sandbox_enabled, updated_at)
values (1, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
on conflict(id) do nothing;
