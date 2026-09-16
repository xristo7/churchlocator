alter table users add column email_verified_at text;
alter table users add column totp_secret_encrypted text;
alter table users add column totp_pending_encrypted text;
alter table users add column totp_last_step integer not null default -1;
alter table sessions add column mfa_verified_at text;
create table platform_roles (user_id text primary key references users(id) on delete cascade, role text not null check(role = 'owner'));
create table tenants (id text primary key, owner_user_id text not null unique references users(id), name text not null, created_at text not null);
create table tenant_memberships (tenant_id text not null references tenants(id), user_id text not null references users(id), role text not null check(role in ('owner','editor','viewer','pastor')), primary key(tenant_id,user_id));
create table platform_entities (
  id text primary key, kind text not null check(kind in ('churches','meditation','events','store','products','channels','resources')),
  tenant_id text not null references tenants(id), created_by text not null references users(id),
  state text not null default 'draft' check(state in ('draft','pending','published','archived')),
  revision integer not null default 1, data_json text not null check(json_valid(data_json)),
  created_at text not null, updated_at text not null
);
create index platform_entities_tenant on platform_entities(tenant_id,kind,state);
create index platform_entities_public on platform_entities(kind,state);
create table private_records (
  id text primary key, user_id text not null references users(id), tenant_id text references tenants(id),
  kind text not null check(kind in ('prayer','reflection','ride','visit','salvation','foundation','message','settings')),
  entity_id text, recipient_user_id text references users(id), visibility text not null default 'private' check(visibility in ('private','pastors','recipient')),
  data_encrypted text not null, status text not null default 'new', revision integer not null default 1, created_at text not null, updated_at text not null
);
create index private_records_owner on private_records(user_id,kind,created_at);
create index private_records_recipient on private_records(recipient_user_id,kind,created_at);
create table security_tokens (digest text primary key, user_id text not null references users(id), purpose text not null check(purpose in ('verify','reset','mfa')), expires_at text not null, created_at text not null);
create table auth_attempts (account_digest text primary key, window_start integer not null, attempts integer not null);
create table audit_log (id text primary key, actor_user_id text, action text not null, entity_id text, tenant_id text, created_at text not null);
create index audit_log_time on audit_log(created_at);
create table payment_orders (
 id text primary key, user_id text not null references users(id), tenant_id text references tenants(id), entity_id text references platform_entities(id),
 kind text not null check(kind in ('product','resource','event','donation')), quantity integer not null check(quantity between 1 and 20),
 amount_cents integer not null check(amount_cents > 0), currency text not null,
 status text not null default 'pending' check(status in ('pending','paid','expired','refunded')),
 provider_session_id text unique, idempotency_key text not null, created_at text not null, unique(user_id,idempotency_key)
);
create table payment_events (id text primary key, order_id text not null references payment_orders(id), created_at text not null);
create table entitlements (user_id text not null references users(id), entity_id text not null references platform_entities(id), order_id text not null unique references payment_orders(id), revoked_at text, primary key(user_id,entity_id));
-- Existing sessions were issued before trusted role/MFA checks existed.
delete from sessions;
insert into users (id,email,password_hash,password_salt,name,is_creator,created_at) values ('system:platform','system@platform.invalid','authentication-disabled','','Platform catalog',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
insert into tenants values ('platform-system','system:platform','Platform catalog',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
insert into platform_entities (id,kind,tenant_id,created_by,state,data_json,created_at,updated_at)
 select c.id,'churches','platform-system','system:platform',case when c.is_verified=1 then 'published' else 'pending' end,
 json_object('name',c.name,'city',c.city,'country',c.country,'postal',c.postal_code,'denomination',c.denomination,'language',c.language,'worship',c.worship_style,'website',c.website,'phone',c.phone,'email',c.email,'photo',c.cover_image_url,'about',coalesce(p.about,c.description),'pastor',p.pastor_name,'pastorTitle',p.pastor_title,'pastorBio',p.pastor_bio,'location',c.city,'sunday','','midweek','','ministries',json('[]'),'livestream',json_object('enabled',c.livestream_enabled=1,'paid',c.livestream_paid=1,'url',c.livestream_url)),c.created_at,c.created_at
 from churches c left join church_profiles p on p.church_id=c.id;
insert into platform_entities (id,kind,tenant_id,created_by,state,data_json,created_at,updated_at)
 select id,'events','platform-system','system:platform','published',json_object('title',title,'churchId',church_id,'eventType',event_type,'startsAt',starts_at,'endsAt',ends_at,'venueName',venue_name,'city',city,'country',country,'coverImageUrl',cover_image_url,'registrationRequired',registration_required=1,'ticketPriceCents',ticket_price_cents,'currency',currency,'totalTickets',total_tickets,'ticketsSold',tickets_sold,'isFeatured',is_featured=1,'isPromoted',is_promoted=1,'registrationUrl',registration_url,'livestreamUrl',livestream_url,'directionsUrl',directions_url,'description',description),strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now') from events;
create trigger events_capacity_integrity before update on events
BEGIN
 SELECT (CASE WHEN new.tickets_sold < old.tickets_sold or (new.total_tickets > 0 and new.total_tickets < new.tickets_sold) THEN raise(abort,'invalid event inventory') END);
END;
