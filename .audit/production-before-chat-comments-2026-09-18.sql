PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0001_initial.sql','2026-08-30 18:12:40');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(2,'0002_auth.sql','2026-09-13 17:52:37');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(3,'0003_service_bookings.sql','2026-09-13 17:52:37');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(4,'0004_security.sql','2026-09-15 07:29:02');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(5,'0005_trusted_platform.sql','2026-09-16 15:16:10');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(6,'0006_spotlight.sql','2026-09-16 15:16:10');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(7,'0007_platform_taxonomies.sql','2026-09-16 15:16:10');
CREATE TABLE churches (
  id text primary key,
  name text not null,
  city text not null,
  country text not null,
  postal_code text,
  denomination text,
  language text,
  worship_style text,
  website text,
  phone text,
  email text,
  cover_image_url text,
  livestream_enabled integer not null default 0,
  livestream_paid integer not null default 0,
  livestream_url text,
  description text,
  is_verified integer not null default 0,
  created_at text not null
);
INSERT INTO "churches" ("id","name","city","country","postal_code","denomination","language","worship_style","website","phone","email","cover_image_url","livestream_enabled","livestream_paid","livestream_url","description","is_verified","created_at") VALUES('christ-embassy-edmonton','Christ Embassy Edmonton','Edmonton','CA','T5J 0N3','Charismatic','English','Contemporary','https://example.org','+1 780 555 0100','hello@example.org','/assets/church-audience.jpg',1,0,'https://www.youtube.com/embed/jiSyB8QZzk8','Development record for local integration testing.',1,'2026-08-19T00:00:00.000Z');
CREATE TABLE church_profiles (
  church_id text primary key references churches(id) on delete cascade,
  history text,
  vision text,
  mission text,
  statement_of_faith text,
  first_visit text,
  dress_code text,
  parking_information text,
  children_information text,
  pastor_name text,
  pastor_title text,
  pastor_bio text,
  pastor_welcome text,
  about text
);
INSERT INTO "church_profiles" ("church_id","history","vision","mission","statement_of_faith","first_visit","dress_code","parking_information","children_information","pastor_name","pastor_title","pastor_bio","pastor_welcome","about") VALUES('christ-embassy-edmonton',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Pastor Samuel Okoye','Lead Pastor','Development profile used to exercise church directory API responses.',NULL,'A development church profile for local testing only.');
CREATE TABLE service_schedules (
  id text primary key,
  church_id text not null references churches(id) on delete cascade,
  service_type text not null,
  day_of_week text,
  starts_at text,
  notes text
);
CREATE TABLE ministries (
  id text primary key,
  church_id text not null references churches(id) on delete cascade,
  name text not null,
  description text,
  meeting_times text,
  leader text,
  location text,
  contact text
);
CREATE TABLE events (
  id text primary key,
  church_id text references churches(id) on delete set null,
  title text not null,
  event_type text, 
  starts_at text,
  ends_at text,
  venue_name text,
  city text,
  country text,
  cover_image_url text,
  registration_required integer not null default 0,
  ticket_price_cents integer not null default 0,
  currency text not null default 'USD',
  total_tickets integer,
  tickets_sold integer not null default 0,
  is_featured integer not null default 0,
  is_promoted integer not null default 0,
  registration_url text,
  livestream_url text,
  directions_url text,
  description text
);
INSERT INTO "events" ("id","church_id","title","event_type","starts_at","ends_at","venue_name","city","country","cover_image_url","registration_required","ticket_price_cents","currency","total_tickets","tickets_sold","is_featured","is_promoted","registration_url","livestream_url","directions_url","description") VALUES('development-community-service','christ-embassy-edmonton','Development Community Service','in-person','2026-12-06T17:00:00.000Z','2026-12-06T19:00:00.000Z','Main Auditorium','Edmonton','CA','/assets/community-outreach.png',1,0,'CAD',100,0,1,0,'','','','Development event used for API and registration testing.');
CREATE TABLE visitor_connections (
  id text primary key,
  church_id text not null references churches(id) on delete cascade,
  full_name text not null,
  phone text,
  email text not null,
  city text,
  message text,
  needs text,
  status text not null default 'new',
  assigned_to text,
  date_contacted text,
  outcome text,
  notes text,
  created_at text not null
);
CREATE TABLE prayer_requests (
  id text primary key,
  church_id text references churches(id) on delete set null,
  request_text text not null,
  is_anonymous integer not null default 0,
  status text not null default 'new',
  created_at text not null
);
CREATE TABLE church_applications (
  id text primary key,
  church_name text not null,
  pastor_name text not null,
  website text,
  social text,
  admin_email text not null,
  statement_of_faith text,
  phone text,
  email text,
  cover_image_url text,
  livestream_url text,
  livestream_paid integer not null default 0,
  status text not null default 'pending',
  created_at text not null
);
CREATE TABLE livestream_activations (
  id text primary key,
  church_id text not null references churches(id) on delete cascade,
  livestream_url text not null,
  status text not null default 'requested',
  payment_status text not null default 'pending',
  provider text,
  created_at text not null,
  activated_at text
);
CREATE TABLE donations (
  id text primary key,
  donor_email text,
  amount_cents integer not null,
  currency text not null default 'USD',
  giving_type text not null,
  payment_provider text not null,
  provider_reference text,
  receipt_url text,
  created_at text not null
);
CREATE TABLE volunteer_applications (
  id text primary key,
  full_name text not null,
  email text not null,
  volunteer_area text not null,
  status text not null default 'new',
  created_at text not null
);
CREATE TABLE event_registrations (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  full_name text not null,
  email text not null,
  ticket_quantity integer not null default 1,
  amount_paid_cents integer not null default 0,
  registration_code text not null,
  created_at text not null
);
CREATE TABLE ride_requests (
  id text primary key,
  church_id text not null references churches(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text not null,
  age_group text,
  passengers integer not null default 1,
  preferred_service text,
  pickup_address text not null,
  accessibility_needs text,
  contact_consent integer not null default 1,
  status text not null default 'new',
  assigned_driver text,
  created_at text not null
);
CREATE TABLE ride_followups (
  id text primary key,
  ride_request_id text not null references ride_requests(id) on delete cascade,
  stage integer not null, 
  contacted_at text not null,
  team_member_name text not null,
  contact_method text not null,
  visitor_response text,
  pickup_status text,
  driver_assigned text,
  attendance_status text
);
CREATE TABLE salvation_decisions (
  id text primary key,
  church_id text references churches(id) on delete set null,
  full_name text not null,
  phone text not null,
  email text not null,
  city text,
  country text,
  contact_method text,
  need_prayer integer default 0,
  need_bible integer default 0,
  want_join_church integer default 0,
  need_transportation integer default 0,
  followup_consent integer default 1,
  status text not null default 'new',
  created_at text not null
);
CREATE TABLE foundation_projects (
  id text primary key,
  title text not null,
  summary text not null,
  category text not null,
  target_amount_cents integer not null,
  raised_amount_cents integer not null default 0,
  status text not null default 'active',
  location text,
  cover_image_url text,
  created_at text not null
);
CREATE TABLE foundation_applications (
  id text primary key,
  org_name text not null,
  reg_number text,
  contact_name text not null,
  phone text not null,
  email text not null,
  location text not null,
  children_count integer not null,
  assistance_type text not null,
  estimated_cost_cents integer not null,
  preferred_date text,
  status text not null default 'pending',
  created_at text not null
);
CREATE TABLE church_staff_roles (
  id text primary key,
  church_id text not null references churches(id) on delete cascade,
  user_email text not null,
  role text not null,
  created_at text not null
);
CREATE TABLE users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  name text not null,
  is_creator integer not null default 0,
  created_at text not null,
  last_login_at text
, email_verified_at text, totp_secret_encrypted text, totp_pending_encrypted text, totp_last_step integer not null default -1);
INSERT INTO "users" ("id","email","password_hash","password_salt","name","is_creator","created_at","last_login_at","email_verified_at","totp_secret_encrypted","totp_pending_encrypted","totp_last_step") VALUES('local:live-tester-01@myway.org','live-tester-01@myway.org','G+Pw+gKs5dEmSf7EhNHe5EYClSC/S9DtRhlfto8TC+o=','w5J+3dnoxRBJhw9dGAQSVg==','Evangelism User',1,'2026-09-11T12:08:09.486Z','2026-09-11T12:08:10.073Z',NULL,NULL,NULL,-1);
INSERT INTO "users" ("id","email","password_hash","password_salt","name","is_creator","created_at","last_login_at","email_verified_at","totp_secret_encrypted","totp_pending_encrypted","totp_last_step") VALUES('local:jarrietkennedy@gmail.com','jarrietkennedy@gmail.com','pbkdf2-sha256$100000$Fsihn1QXZC+d8IVvs+M63jt6sf0ZiP/xFXtRmma3nhI=','yTXjtay0wTqubEQD1GCcBA==','Jarriet Kennedy',0,'2026-09-12T09:27:54.773Z','2026-09-18T15:11:06.322Z',NULL,NULL,NULL,-1);
INSERT INTO "users" ("id","email","password_hash","password_salt","name","is_creator","created_at","last_login_at","email_verified_at","totp_secret_encrypted","totp_pending_encrypted","totp_last_step") VALUES('system:platform','system@platform.invalid','authentication-disabled','','Platform catalog',0,'2026-09-16T15:16:10.304Z',NULL,NULL,NULL,NULL,-1);
INSERT INTO "users" ("id","email","password_hash","password_salt","name","is_creator","created_at","last_login_at","email_verified_at","totp_secret_encrypted","totp_pending_encrypted","totp_last_step") VALUES('google:114390209769027706503','churchoal@gmail.com','authentication-disabled','','Church OS',0,'2026-09-16T15:59:15.014Z','2026-09-18T08:19:01.358Z','2026-09-16T15:59:15.014Z',NULL,NULL,-1);
INSERT INTO "users" ("id","email","password_hash","password_salt","name","is_creator","created_at","last_login_at","email_verified_at","totp_secret_encrypted","totp_pending_encrypted","totp_last_step") VALUES('local:jarrietkennedy1@gmail.com','jarrietkennedy1@gmail.com','pbkdf2-sha256$100000$LvsU22LCXmH1hIjgtorSZoO00ueuxloDxJzTRoK8jjM=','b5YaYa3J4rY6Bwf4IXW4rA==','Janna Brooks',1,'2026-09-16T23:09:18.710Z','2026-09-16T23:09:18.710Z',NULL,NULL,NULL,-1);
INSERT INTO "users" ("id","email","password_hash","password_salt","name","is_creator","created_at","last_login_at","email_verified_at","totp_secret_encrypted","totp_pending_encrypted","totp_last_step") VALUES('google:106376242540128282268','xristoinno@gmail.com','authentication-disabled','','Christo',0,'2026-09-17T09:26:54.937Z','2026-09-18T10:43:57.992Z','2026-09-17T09:26:54.937Z',NULL,NULL,-1);
INSERT INTO "users" ("id","email","password_hash","password_salt","name","is_creator","created_at","last_login_at","email_verified_at","totp_secret_encrypted","totp_pending_encrypted","totp_last_step") VALUES('google:104050193452962387798','sharonachristo@gmail.com','authentication-disabled','','Sharon Christo',0,'2026-09-18T07:55:04.074Z','2026-09-18T07:55:04.074Z','2026-09-18T07:55:04.074Z',NULL,NULL,-1);
CREATE TABLE sessions (
  token text primary key,
  user_id text not null references users(id) on delete cascade,
  created_at text not null,
  expires_at text not null
, mfa_verified_at text);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:o0g7XukW0KTMZOZX7ePb058D5rq0EG785Pn7JmSgH+A=','google:114390209769027706503','2026-09-16T15:59:15.084Z','2026-09-17T15:59:15.084Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:TzwrhG7Je+HY4iV+V1S6tmL3+uEnWbDtDXU5WdfvEmM=','local:jarrietkennedy@gmail.com','2026-09-16T18:50:56.238Z','2026-09-17T18:50:56.238Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:I+7lWkgPT4aKMX4lRpsiW9qviC2wr11C8tXRcL/XkZM=','local:jarrietkennedy@gmail.com','2026-09-16T22:30:52.694Z','2026-09-17T22:30:52.694Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:M2U1zkJrGguRrdaYAED3wNh7mWd1DRLCqcj4oJAm+Co=','local:jarrietkennedy1@gmail.com','2026-09-16T23:09:18.894Z','2026-09-17T23:09:18.894Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:USJiB0BVfraeOExXwoFqwD46t9ATFTkXjVQVHUP/1BA=','local:jarrietkennedy@gmail.com','2026-09-16T23:41:40.329Z','2026-09-17T23:41:40.329Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:SsEpFY6cbqLwsQ8bk9tk003ZfmAKfz9lsPap4XmX6mc=','google:114390209769027706503','2026-09-17T08:13:10.139Z','2026-09-18T08:13:10.139Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:aLHI8k2/eMAJxtpD8xpyQZpip+fLR+ZqN06UXVAyGkU=','google:106376242540128282268','2026-09-17T09:26:55.196Z','2026-09-18T09:26:55.196Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:guxBXydX8Tkv/sSkOR6uctamfgiu3xhr/Se7vXeK4LA=','google:114390209769027706503','2026-09-18T07:53:58.262Z','2026-09-19T07:53:58.262Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:lS8NLJ23w9aYpnitRqdriqjp4s4RL6ze7hnv63578Og=','google:106376242540128282268','2026-09-18T07:54:41.876Z','2026-09-19T07:54:41.876Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:9z+Dc5C9Mo5p3vpSeAjhynmqqBSfANdo+hw/kGZyk0U=','google:104050193452962387798','2026-09-18T07:55:04.138Z','2026-09-19T07:55:04.138Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:WTsPH/Cxf0wcRVoTU5p+oaOkN4sl4GD54MKbpMTQ2kw=','google:106376242540128282268','2026-09-18T08:02:50.831Z','2026-09-19T08:02:50.831Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:wprpJxqbWQFMYMZuq/cCSADeA+T873hP/NpoUQN4Qcw=','google:106376242540128282268','2026-09-18T08:17:35.497Z','2026-09-19T08:17:35.497Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:in6/i7gUGbKvexIoV62A8XCOBpsRtvSRzPYPErcXqms=','google:106376242540128282268','2026-09-18T08:18:24.385Z','2026-09-19T08:18:24.385Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:gzAnd4hBv3CBmY+mqsSDWdpxX+8J4wIQNeZTVmvVspQ=','google:114390209769027706503','2026-09-18T08:19:01.417Z','2026-09-19T08:19:01.417Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:eA/Xd3V1N74usLyUHrDvrR2IB0hBtIJa2MeZSlV/tVk=','local:jarrietkennedy@gmail.com','2026-09-18T09:27:47.708Z','2026-09-19T09:27:47.708Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:alrwJNYfxdEwS6XxeOmjJuva8H2ms6vZRrizrtT1L+o=','local:jarrietkennedy@gmail.com','2026-09-18T15:11:06.505Z','2026-09-19T15:11:06.505Z',NULL);
CREATE TABLE service_bookings (
  id text primary key,
  booking_ref text not null,
  service_id text not null,
  service_title text not null,
  service_type text not null,
  provider_name text not null,
  provider_type text not null,
  package_tier text not null,
  estimated_amount text,
  requested_date text not null,
  requested_time text,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  event_location text,
  notes text,
  status text not null default 'inquiry_received',
  user_id text references users(id) on delete set null,
  created_at text not null
);
CREATE TABLE platform_roles (user_id text primary key references users(id) on delete cascade, role text not null check(role = 'owner'));
CREATE TABLE tenants (id text primary key, owner_user_id text not null unique references users(id), name text not null, created_at text not null);
INSERT INTO "tenants" ("id","owner_user_id","name","created_at") VALUES('platform-system','system:platform','Platform catalog','2026-09-16T15:16:10.304Z');
INSERT INTO "tenants" ("id","owner_user_id","name","created_at") VALUES('da4fe720-bbf2-4b71-a1cc-43851d2a829a','local:jarrietkennedy1@gmail.com','Janna Brooks','2026-09-16T23:09:19.861Z');
CREATE TABLE tenant_memberships (tenant_id text not null references tenants(id), user_id text not null references users(id), role text not null check(role in ('owner','editor','viewer','pastor')), primary key(tenant_id,user_id));
INSERT INTO "tenant_memberships" ("tenant_id","user_id","role") VALUES('da4fe720-bbf2-4b71-a1cc-43851d2a829a','local:jarrietkennedy1@gmail.com','owner');
CREATE TABLE platform_entities (
  id text primary key, kind text not null check(kind in ('churches','meditation','events','store','products','channels','resources')),
  tenant_id text not null references tenants(id), created_by text not null references users(id),
  state text not null default 'draft' check(state in ('draft','pending','published','archived')),
  revision integer not null default 1, data_json text not null check(json_valid(data_json)),
  created_at text not null, updated_at text not null
);
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('christ-embassy-edmonton','churches','platform-system','system:platform','published',1,'{"name":"Christ Embassy Edmonton","city":"Edmonton","country":"CA","postal":"T5J 0N3","denomination":"Charismatic","language":"English","worship":"Contemporary","website":"https://example.org","phone":"+1 780 555 0100","email":"hello@example.org","photo":"/assets/church-audience.jpg","about":"A development church profile for local testing only.","pastor":"Pastor Samuel Okoye","pastorTitle":"Lead Pastor","pastorBio":"Development profile used to exercise church directory API responses.","location":"Edmonton","sunday":"","midweek":"","ministries":[],"livestream":{"enabled":1,"paid":0,"url":"https://www.youtube.com/embed/jiSyB8QZzk8"}}','2026-08-19T00:00:00.000Z','2026-08-19T00:00:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('development-community-service','events','platform-system','system:platform','published',1,'{"title":"Development Community Service","churchId":"christ-embassy-edmonton","eventType":"in-person","startsAt":"2026-12-06T17:00:00.000Z","endsAt":"2026-12-06T19:00:00.000Z","venueName":"Main Auditorium","city":"Edmonton","country":"CA","coverImageUrl":"/assets/community-outreach.png","registrationRequired":1,"ticketPriceCents":0,"currency":"CAD","totalTickets":100,"ticketsSold":0,"isFeatured":1,"isPromoted":0,"registrationUrl":"","livestreamUrl":"","directionsUrl":"","description":"Development event used for API and registration testing."}','2026-09-16T15:16:10.304Z','2026-09-16T15:16:10.304Z');
CREATE TABLE private_records (
  id text primary key, user_id text not null references users(id), tenant_id text references tenants(id),
  kind text not null check(kind in ('prayer','reflection','ride','visit','salvation','foundation','message','settings')),
  entity_id text, recipient_user_id text references users(id), visibility text not null default 'private' check(visibility in ('private','pastors','recipient')),
  data_encrypted text not null, status text not null default 'new', revision integer not null default 1, created_at text not null, updated_at text not null
);
CREATE TABLE security_tokens (digest text primary key, user_id text not null references users(id), purpose text not null check(purpose in ('verify','reset','mfa')), expires_at text not null, created_at text not null);
CREATE TABLE auth_attempts (account_digest text primary key, window_start integer not null, attempts integer not null);
INSERT INTO "auth_attempts" ("account_digest","window_start","attempts") VALUES('dLOI9wEKh/mpQCPsCrJtKeQfVXAIdHaTqtWo584jfog=',1789573068,1);
INSERT INTO "auth_attempts" ("account_digest","window_start","attempts") VALUES('f8lRZABvLVWf2UqxhB7pAvK7FUr2KgZWWw5Yzkj8bwE=',1789744265,1);
INSERT INTO "auth_attempts" ("account_digest","window_start","attempts") VALUES('dBfm5mLzG7K2RJvNgRbi4IDZkYWRgxPoMh/Ia+1qDsw=',1789730256,1);
CREATE TABLE audit_log (id text primary key, actor_user_id text, action text not null, entity_id text, tenant_id text, created_at text not null);
CREATE TABLE payment_orders (
 id text primary key, user_id text not null references users(id), tenant_id text references tenants(id), entity_id text references platform_entities(id),
 kind text not null check(kind in ('product','resource','event','donation')), quantity integer not null check(quantity between 1 and 20),
 amount_cents integer not null check(amount_cents > 0), currency text not null,
 status text not null default 'pending' check(status in ('pending','paid','expired','refunded')),
 provider_session_id text unique, idempotency_key text not null, created_at text not null, unique(user_id,idempotency_key)
);
CREATE TABLE payment_events (id text primary key, order_id text not null references payment_orders(id), created_at text not null);
CREATE TABLE entitlements (user_id text not null references users(id), entity_id text not null references platform_entities(id), order_id text not null unique references payment_orders(id), revoked_at text, primary key(user_id,entity_id));
CREATE TABLE spotlight_items (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  created_by text not null references users(id) on delete cascade,
  channel_entity_id text references platform_entities(id) on delete set null,
  subject_entity_id text references platform_entities(id) on delete set null,
  content_type text not null check(content_type in ('short','long-preview','church','channel','event','live')),
  title text not null,
  caption text not null default '',
  creator_name text not null,
  creator_handle text not null default '',
  creator_avatar_url text,
  media_url text,
  poster_url text not null,
  full_content_url text,
  preview_source text not null default 'creator' check(preview_source in ('creator','automatic')),
  preview_start_seconds integer not null default 0 check(preview_start_seconds >= 0),
  preview_end_seconds integer check(preview_end_seconds is null or preview_end_seconds > preview_start_seconds),
  duration_seconds integer check(duration_seconds is null or duration_seconds >= 0),
  cta_label text,
  cta_url text,
  status text not null default 'pending' check(status in ('draft','pending','needs-changes','approved','scheduled','live','rejected','expired')),
  placement_kind text not null default 'organic' check(placement_kind in ('organic','editorial','sponsored')),
  moderation_note text,
  comments_enabled integer not null default 1,
  priority integer not null default 0 check(priority between 0 and 1000),
  scheduled_at text,
  expires_at text,
  published_at text,
  revision integer not null default 1,
  created_at text not null,
  updated_at text not null
);
INSERT INTO "spotlight_items" ("id","tenant_id","created_by","channel_entity_id","subject_entity_id","content_type","title","caption","creator_name","creator_handle","creator_avatar_url","media_url","poster_url","full_content_url","preview_source","preview_start_seconds","preview_end_seconds","duration_seconds","cta_label","cta_url","status","placement_kind","moderation_note","comments_enabled","priority","scheduled_at","expires_at","published_at","revision","created_at","updated_at") VALUES('spotlight-grace-story','platform-system','system:platform',NULL,NULL,'long-preview','A new beginning in faith','Grace shares how one faithful conversation helped her begin again.','Grace Stories','@gracestories',NULL,NULL,'/assets/spotlight/grace-testimony.webp','app.html?view=channels','creator',42,87,1920,'Watch full video','app.html?view=channels','live','editorial',NULL,1,90,NULL,NULL,'2026-09-16T15:16:10.534Z',1,'2026-09-16T15:16:10.534Z','2026-09-16T15:16:10.534Z');
INSERT INTO "spotlight_items" ("id","tenant_id","created_by","channel_entity_id","subject_entity_id","content_type","title","caption","creator_name","creator_handle","creator_avatar_url","media_url","poster_url","full_content_url","preview_source","preview_start_seconds","preview_end_seconds","duration_seconds","cta_label","cta_url","status","placement_kind","moderation_note","comments_enabled","priority","scheduled_at","expires_at","published_at","revision","created_at","updated_at") VALUES('spotlight-river-city','platform-system','system:platform',NULL,NULL,'church','River City Fellowship','A welcoming church for real people, real faith and a brighter tomorrow.','River City Fellowship','@rivercity',NULL,NULL,'/assets/spotlight/river-city-fellowship.webp','app.html?view=directory','creator',0,NULL,NULL,'View Church','app.html?view=directory','live','editorial',NULL,1,70,NULL,NULL,'2026-09-16T15:16:10.534Z',1,'2026-09-16T15:16:10.534Z','2026-09-16T15:16:10.534Z');
INSERT INTO "spotlight_items" ("id","tenant_id","created_by","channel_entity_id","subject_entity_id","content_type","title","caption","creator_name","creator_handle","creator_avatar_url","media_url","poster_url","full_content_url","preview_source","preview_start_seconds","preview_end_seconds","duration_seconds","cta_label","cta_url","status","placement_kind","moderation_note","comments_enabled","priority","scheduled_at","expires_at","published_at","revision","created_at","updated_at") VALUES('spotlight-marcus-word','platform-system','system:platform',NULL,NULL,'short','Faith moves when we step out','Pastor Marcus shares what God taught him in the waiting.','Pastor Marcus Hale','@marcushale',NULL,NULL,'/assets/spotlight/pastor-marcus.webp','app.html?view=channels','automatic',0,60,80,'Open Channel','app.html?view=channels','live','organic',NULL,1,80,NULL,NULL,'2026-09-16T15:16:10.534Z',1,'2026-09-16T15:16:10.534Z','2026-09-16T15:16:10.534Z');
CREATE TABLE spotlight_engagements (
  item_id text not null references spotlight_items(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  action text not null check(action in ('like','save','follow','report')),
  created_at text not null,
  primary key(item_id, user_id, action)
);
INSERT INTO "spotlight_engagements" ("item_id","user_id","action","created_at") VALUES('spotlight-marcus-word','google:114390209769027706503','follow','2026-09-16T17:58:42.932Z');
INSERT INTO "spotlight_engagements" ("item_id","user_id","action","created_at") VALUES('spotlight-grace-story','local:jarrietkennedy@gmail.com','like','2026-09-16T23:01:39.183Z');
INSERT INTO "spotlight_engagements" ("item_id","user_id","action","created_at") VALUES('spotlight-grace-story','local:jarrietkennedy@gmail.com','save','2026-09-16T23:01:48.310Z');
CREATE TABLE spotlight_comments (
  id text primary key,
  item_id text not null references spotlight_items(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  body text not null check(length(body) between 1 and 600),
  status text not null default 'visible' check(status in ('visible','hidden','reported')),
  created_at text not null
);
INSERT INTO "spotlight_comments" ("id","item_id","user_id","body","status","created_at") VALUES('3f6a24a5-cf46-42e3-b25b-9c05ddf46996','spotlight-marcus-word','google:114390209769027706503','hello','visible','2026-09-16T16:07:17.635Z');
INSERT INTO "spotlight_comments" ("id","item_id","user_id","body","status","created_at") VALUES('e642002d-e524-4033-a169-c7f6d2c8d1ba','spotlight-grace-story','google:114390209769027706503','this is beautiful','visible','2026-09-16T16:07:29.629Z');
INSERT INTO "spotlight_comments" ("id","item_id","user_id","body","status","created_at") VALUES('aaf3584e-56b0-4607-ad69-7c3b37e7dd17','spotlight-grace-story','local:jarrietkennedy@gmail.com','Gloryyy','visible','2026-09-16T23:01:54.773Z');
CREATE TABLE platform_taxonomies (
  key text primary key check(key in ('denominations','languages','worship_styles','store_categories','product_categories','channel_topics','resource_topics')),
  items_json text not null check(json_valid(items_json) and json_type(items_json) = 'array'),
  revision integer not null default 1,
  updated_by text references users(id),
  updated_at text not null
);
INSERT INTO "platform_taxonomies" ("key","items_json","revision","updated_by","updated_at") VALUES('denominations','["Christ Embassy","New Generation","Pentecostal","Full Gospel","Charismatic","Baptist","Catholic","Anglican","Presbyterian","Protestant"]',1,NULL,'2026-09-16T15:16:10.769Z');
INSERT INTO "platform_taxonomies" ("key","items_json","revision","updated_by","updated_at") VALUES('languages','["English","French","Spanish","Portuguese","Swahili","Arabic"]',1,NULL,'2026-09-16T15:16:10.769Z');
INSERT INTO "platform_taxonomies" ("key","items_json","revision","updated_by","updated_at") VALUES('worship_styles','["Contemporary","Traditional","Blended","Charismatic"]',1,NULL,'2026-09-16T15:16:10.769Z');
INSERT INTO "platform_taxonomies" ("key","items_json","revision","updated_by","updated_at") VALUES('store_categories','["Books & Resources","Apparel","Music","Gifts","Church Supplies","General"]',1,NULL,'2026-09-16T15:16:10.769Z');
INSERT INTO "platform_taxonomies" ("key","items_json","revision","updated_by","updated_at") VALUES('product_categories','["Books","Journals","Apparel","Church Supplies","Study Tools","Kids","Music","Gifts"]',1,NULL,'2026-09-16T15:16:10.769Z');
INSERT INTO "platform_taxonomies" ("key","items_json","revision","updated_by","updated_at") VALUES('channel_topics','["Bible Teaching","Worship","Family","Leadership","Youth","Bible Study"]',1,NULL,'2026-09-16T15:16:10.769Z');
INSERT INTO "platform_taxonomies" ("key","items_json","revision","updated_by","updated_at") VALUES('resource_topics','["Bible Study","Prayer","Discipleship","Worship","Devotional","Leadership"]',1,NULL,'2026-09-16T15:16:10.769Z');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',7);
CREATE INDEX idx_churches_public_directory
  on churches(is_verified, country, city, name);
CREATE INDEX idx_churches_filters
  on churches(denomination, language, worship_style);
CREATE INDEX idx_events_upcoming
  on events(starts_at, city, event_type);
CREATE INDEX idx_events_church
  on events(church_id, starts_at);
CREATE INDEX idx_visitor_connections_queue
  on visitor_connections(church_id, status, created_at);
CREATE INDEX idx_prayer_requests_queue
  on prayer_requests(church_id, status, created_at);
CREATE INDEX idx_church_applications_queue
  on church_applications(status, created_at);
CREATE INDEX idx_livestream_activations_queue
  on livestream_activations(church_id, status, created_at);
CREATE INDEX idx_event_registrations_event
  on event_registrations(event_id, created_at);
CREATE UNIQUE INDEX idx_event_registration_code
  on event_registrations(registration_code);
CREATE INDEX idx_ride_requests_queue
  on ride_requests(church_id, status, created_at);
CREATE INDEX idx_salvation_decisions_queue
  on salvation_decisions(church_id, status, created_at);
CREATE INDEX idx_foundation_applications_queue
  on foundation_applications(status, created_at);
CREATE UNIQUE INDEX idx_church_staff_membership
  on church_staff_roles(church_id, user_email);
CREATE INDEX idx_sessions_user on sessions(user_id);
CREATE INDEX idx_sessions_expiry on sessions(expires_at);
CREATE INDEX idx_service_bookings_email on service_bookings(customer_email);
CREATE INDEX idx_service_bookings_service on service_bookings(service_id);
CREATE INDEX idx_service_bookings_user on service_bookings(user_id);
CREATE INDEX platform_entities_tenant on platform_entities(tenant_id,kind,state);
CREATE INDEX platform_entities_public on platform_entities(kind,state);
CREATE INDEX private_records_owner on private_records(user_id,kind,created_at);
CREATE INDEX private_records_recipient on private_records(recipient_user_id,kind,created_at);
CREATE INDEX audit_log_time on audit_log(created_at);
CREATE INDEX spotlight_items_feed on spotlight_items(status, priority desc, scheduled_at, expires_at);
CREATE INDEX spotlight_items_tenant on spotlight_items(tenant_id, updated_at desc);
CREATE INDEX spotlight_items_channel on spotlight_items(channel_entity_id, status);
CREATE INDEX spotlight_engagements_item on spotlight_engagements(item_id, action);
CREATE INDEX spotlight_comments_item on spotlight_comments(item_id, status, created_at desc);
CREATE TRIGGER event_registration_reserve_capacity
before insert on event_registrations
BEGIN
  SELECT (CASE WHEN new.ticket_quantity < 1 or new.ticket_quantity > 20
    or new.ticket_quantity != cast(new.ticket_quantity as integer)
    or new.amount_paid_cents != 0
    then raise(abort, 'invalid registration') END);
  SELECT (CASE WHEN not exists (
    select 1 from events where id = new.event_id and ticket_price_cents = 0
      and (total_tickets is null or total_tickets = 0 or coalesce(tickets_sold, 0) + new.ticket_quantity <= total_tickets)
  ) then raise(abort, 'event unavailable') END);
END;
CREATE TRIGGER event_registration_count_tickets
after insert on event_registrations
BEGIN
  update events set tickets_sold = coalesce(tickets_sold, 0) + new.ticket_quantity where id = new.event_id;
END;
CREATE TRIGGER events_capacity_integrity before update on events
BEGIN
 SELECT (CASE WHEN new.tickets_sold < old.tickets_sold or (new.total_tickets > 0 and new.total_tickets < new.tickets_sold) THEN raise(abort,'invalid event inventory') END);
END;
