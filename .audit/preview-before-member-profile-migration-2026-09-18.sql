PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0001_initial.sql','2026-09-05 09:55:56');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(2,'0002_auth.sql','2026-09-15 07:16:29');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(3,'0003_service_bookings.sql','2026-09-15 07:16:29');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(4,'0004_security.sql','2026-09-15 07:17:07');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(5,'0005_trusted_platform.sql','2026-09-15 08:58:57');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(6,'0006_spotlight.sql','2026-09-17 04:41:16');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(7,'0007_platform_taxonomies.sql','2026-09-17 04:41:16');
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
INSERT INTO "churches" ("id","name","city","country","postal_code","denomination","language","worship_style","website","phone","email","cover_image_url","livestream_enabled","livestream_paid","livestream_url","description","is_verified","created_at") VALUES('demo-church-river-city','River City Fellowship','Nairobi','KE','00100','Pentecostal','English','Contemporary','https://rivercity.demo.myway.test','+254 700 000 101','hello@rivercity.demo.myway.test','/assets/church-river-city.png',1,0,'https://www.youtube.com/embed/jiSyB8QZzk8','A welcoming Nairobi fellowship centered on scripture, worship, and practical care for neighbors.',1,'2026-09-17T08:10:00.000Z');
INSERT INTO "churches" ("id","name","city","country","postal_code","denomination","language","worship_style","website","phone","email","cover_image_url","livestream_enabled","livestream_paid","livestream_url","description","is_verified","created_at") VALUES('demo-church-grace-community','Grace Community Church','Kampala','UG','25600','Full Gospel','English','Blended','https://gracecommunity.demo.myway.test','+256 700 000 202','hello@gracecommunity.demo.myway.test','/assets/church-grace-house.png',1,0,'https://www.youtube.com/embed/jiSyB8QZzk8','A warm community helping new believers grow through small groups, prayer, and discipleship.',1,'2026-09-17T08:11:00.000Z');
INSERT INTO "churches" ("id","name","city","country","postal_code","denomination","language","worship_style","website","phone","email","cover_image_url","livestream_enabled","livestream_paid","livestream_url","description","is_verified","created_at") VALUES('demo-church-harbor-light','Harbor Light Chapel','Mombasa','KE','80100','Charismatic','Swahili','Contemporary','https://harborlight.demo.myway.test','+254 700 000 303','hello@harborlight.demo.myway.test','/assets/church-light-chapel.png',1,0,'https://www.youtube.com/embed/jiSyB8QZzk8','A coastal church family making room for worship, youth leadership, and community outreach.',1,'2026-09-17T08:12:00.000Z');
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
INSERT INTO "church_profiles" ("church_id","history","vision","mission","statement_of_faith","first_visit","dress_code","parking_information","children_information","pastor_name","pastor_title","pastor_bio","pastor_welcome","about") VALUES('demo-church-river-city',NULL,'A healthy, multiplying church in every neighborhood.','Make room for people to meet Jesus and serve their city.',NULL,'Come as you are. Our welcome team will help you find your next step.',NULL,'Street parking and a guarded lot are available beside the auditorium.','Safe, joyful children groups meet during every Sunday service.','Pastor Daniel Mwangi','Lead Pastor','Daniel leads River City with a heart for scripture, prayer, and everyday evangelism.',NULL,'River City Fellowship is a multi-generational home for people seeking Jesus and meaningful community.');
INSERT INTO "church_profiles" ("church_id","history","vision","mission","statement_of_faith","first_visit","dress_code","parking_information","children_information","pastor_name","pastor_title","pastor_bio","pastor_welcome","about") VALUES('demo-church-grace-community',NULL,'A city shaped by humble, faithful followers of Jesus.','Grow disciples who bring hope into homes and workplaces.',NULL,'Arrive 20 minutes early for a welcome and orientation.',NULL,'A marked visitor lot is available behind the fellowship hall.','Children join age-based groups after the opening worship set.','Pastor Miriam Kato','Senior Pastor','Miriam teaches scripture and equips small-group leaders across Kampala.',NULL,'Grace Community Church helps people build a faithful life through worship, study, and friendship.');
INSERT INTO "church_profiles" ("church_id","history","vision","mission","statement_of_faith","first_visit","dress_code","parking_information","children_information","pastor_name","pastor_title","pastor_bio","pastor_welcome","about") VALUES('demo-church-harbor-light',NULL,'A thriving church family for every generation on the coast.','Carry the light of Christ into every home and street.',NULL,'Our welcome team meets first-time guests at the front gate.',NULL,'Parking is available across from the chapel and along the side road.','The children ministry includes worship, Bible stories, and games.','Pastor Elias Wanjala','Lead Pastor','Elias serves families and young leaders along the coast.',NULL,'Harbor Light Chapel is a joyful coastal church with a strong culture of prayer and service.');
CREATE TABLE service_schedules (
  id text primary key,
  church_id text not null references churches(id) on delete cascade,
  service_type text not null,
  day_of_week text,
  starts_at text,
  notes text
);
INSERT INTO "service_schedules" ("id","church_id","service_type","day_of_week","starts_at","notes") VALUES('demo-schedule-river-sun','demo-church-river-city','Sunday Worship','Sunday','09:00','Main auditorium and livestream');
INSERT INTO "service_schedules" ("id","church_id","service_type","day_of_week","starts_at","notes") VALUES('demo-schedule-grace-sun','demo-church-grace-community','Sunday Worship','Sunday','10:30','Family worship and children groups');
INSERT INTO "service_schedules" ("id","church_id","service_type","day_of_week","starts_at","notes") VALUES('demo-schedule-harbor-sat','demo-church-harbor-light','Saturday Gathering','Saturday','16:00','Coastal worship and prayer');
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
INSERT INTO "ministries" ("id","church_id","name","description","meeting_times","leader","location","contact") VALUES('demo-ministry-river-youth','demo-church-river-city','River City Youth','A weekly space for honest questions, worship, and service.','Fridays at 18:00','Joy Wambui','Youth hall','youth@rivercity.demo.myway.test');
INSERT INTO "ministries" ("id","church_id","name","description","meeting_times","leader","location","contact") VALUES('demo-ministry-grace-groups','demo-church-grace-community','Grace Groups','Small groups for scripture, prayer, and shared meals.','Tuesdays at 18:30','Samuel Kato','Neighborhood homes','groups@gracecommunity.demo.myway.test');
INSERT INTO "ministries" ("id","church_id","name","description","meeting_times","leader","location","contact") VALUES('demo-ministry-harbor-outreach','demo-church-harbor-light','Harbor Light Outreach','Food support and practical care for families in need.','First Saturday monthly','Amina Salim','Community center','outreach@harborlight.demo.myway.test');
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
INSERT INTO "events" ("id","church_id","title","event_type","starts_at","ends_at","venue_name","city","country","cover_image_url","registration_required","ticket_price_cents","currency","total_tickets","tickets_sold","is_featured","is_promoted","registration_url","livestream_url","directions_url","description") VALUES('demo-event-kingdom-summit','demo-church-river-city','Kingdom Builders Summit','in-person','2026-10-03T08:00:00.000Z','2026-10-03T16:00:00.000Z','River City Auditorium','Nairobi','KE','/assets/community-outreach.png',1,0,'KES',500,0,1,1,'https://rivercity.demo.myway.test/summit','https://www.youtube.com/embed/jiSyB8QZzk8','https://maps.google.com','A practical day of Bible teaching, evangelism stories, and ministry workshops.');
INSERT INTO "events" ("id","church_id","title","event_type","starts_at","ends_at","venue_name","city","country","cover_image_url","registration_required","ticket_price_cents","currency","total_tickets","tickets_sold","is_featured","is_promoted","registration_url","livestream_url","directions_url","description") VALUES('demo-event-prayer-night','demo-church-grace-community','Citywide Prayer Night','in-person','2026-10-09T17:00:00.000Z','2026-10-09T20:00:00.000Z','Grace Community Hall','Kampala','UG','/assets/baptism-service.png',0,0,'UGX',0,0,1,0,'','https://www.youtube.com/embed/jiSyB8QZzk8','https://maps.google.com','An evening of worship, scripture, and prayer for families across Kampala.');
INSERT INTO "events" ("id","church_id","title","event_type","starts_at","ends_at","venue_name","city","country","cover_image_url","registration_required","ticket_price_cents","currency","total_tickets","tickets_sold","is_featured","is_promoted","registration_url","livestream_url","directions_url","description") VALUES('demo-event-global-worship','demo-church-harbor-light','Global Worship Stream','streamed','2026-10-17T18:00:00.000Z','2026-10-17T20:00:00.000Z','Online','Mombasa','KE','/assets/hero-global-church.png',0,0,'KES',0,0,1,1,'','https://www.youtube.com/embed/jiSyB8QZzk8','','A live worship gathering connecting churches, homes, and prayer groups across the region.');
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
INSERT INTO "users" ("id","email","password_hash","password_salt","name","is_creator","created_at","last_login_at","email_verified_at","totp_secret_encrypted","totp_pending_encrypted","totp_last_step") VALUES('system:platform','system@platform.invalid','authentication-disabled','','Platform catalog',0,'2026-09-15T08:58:57.280Z',NULL,NULL,NULL,NULL,-1);
INSERT INTO "users" ("id","email","password_hash","password_salt","name","is_creator","created_at","last_login_at","email_verified_at","totp_secret_encrypted","totp_pending_encrypted","totp_last_step") VALUES('local:rivercity@demo.myway.test','rivercity@demo.myway.test','pbkdf2-sha256$100000$NfE+KVczgN5YF7f3IU7SqJ0L9ca7zjnjamNFI+YJ0bY=','wAAQzklE3EJJJpoNQo+wpQ==','River City Fellowship Admin',1,'2026-09-17T08:01:00.000Z',NULL,'2026-09-17T08:01:00.000Z',NULL,NULL,-1);
INSERT INTO "users" ("id","email","password_hash","password_salt","name","is_creator","created_at","last_login_at","email_verified_at","totp_secret_encrypted","totp_pending_encrypted","totp_last_step") VALUES('local:grace@demo.myway.test','grace@demo.myway.test','pbkdf2-sha256$100000$YBnAZw7A4YCydCjvTxW7dOgHJEbxFyfkndc7Cm2GzIU=','Lmd6E+M5YVD1wGmhBvvXAA==','Grace Stories Studio',1,'2026-09-17T08:02:00.000Z',NULL,'2026-09-17T08:02:00.000Z',NULL,NULL,-1);
INSERT INTO "users" ("id","email","password_hash","password_salt","name","is_creator","created_at","last_login_at","email_verified_at","totp_secret_encrypted","totp_pending_encrypted","totp_last_step") VALUES('local:harbor@demo.myway.test','harbor@demo.myway.test','pbkdf2-sha256$100000$kxIOPw4BmnUDHIa5cmMGvQQmUFvJ5ZVPteSZes5U4vI=','4atY9iBHEfrSsMNtPfPZGA==','Harbor Light Ministries',1,'2026-09-17T08:03:00.000Z',NULL,'2026-09-17T08:03:00.000Z',NULL,NULL,-1);
INSERT INTO "users" ("id","email","password_hash","password_salt","name","is_creator","created_at","last_login_at","email_verified_at","totp_secret_encrypted","totp_pending_encrypted","totp_last_step") VALUES('google:106376242540128282268','xristoinno@gmail.com','authentication-disabled','','Christo',0,'2026-09-18T10:46:34.733Z','2026-09-18T11:15:56.463Z','2026-09-18T10:46:34.733Z',NULL,NULL,-1);
CREATE TABLE sessions (
  token text primary key,
  user_id text not null references users(id) on delete cascade,
  created_at text not null,
  expires_at text not null
, mfa_verified_at text);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:qoDB8IQw3LlBGBRguUSSrlhhQIBT/+kuOoh30IBkYQY=','google:106376242540128282268','2026-09-18T10:46:34.790Z','2026-09-19T10:46:34.790Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:4jLVOUw3ZFetjpPK0I/u+lMfpUJltV7AtncipK8mXeM=','google:106376242540128282268','2026-09-18T11:06:49.620Z','2026-09-19T11:06:49.620Z',NULL);
INSERT INTO "sessions" ("token","user_id","created_at","expires_at","mfa_verified_at") VALUES('v2:i7VfywCX3lKuNGKMz179aS26Kk/dqGnjd4HNIipNFpI=','google:106376242540128282268','2026-09-18T11:15:56.484Z','2026-09-19T11:15:56.484Z',NULL);
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
INSERT INTO "tenants" ("id","owner_user_id","name","created_at") VALUES('platform-system','system:platform','Platform catalog','2026-09-15T08:58:57.280Z');
INSERT INTO "tenants" ("id","owner_user_id","name","created_at") VALUES('demo-tenant-river-city','local:rivercity@demo.myway.test','River City Fellowship','2026-09-17T08:01:00.000Z');
INSERT INTO "tenants" ("id","owner_user_id","name","created_at") VALUES('demo-tenant-grace-stories','local:grace@demo.myway.test','Grace Stories Studio','2026-09-17T08:02:00.000Z');
INSERT INTO "tenants" ("id","owner_user_id","name","created_at") VALUES('demo-tenant-harbor-light','local:harbor@demo.myway.test','Harbor Light Ministries','2026-09-17T08:03:00.000Z');
CREATE TABLE tenant_memberships (tenant_id text not null references tenants(id), user_id text not null references users(id), role text not null check(role in ('owner','editor','viewer','pastor')), primary key(tenant_id,user_id));
INSERT INTO "tenant_memberships" ("tenant_id","user_id","role") VALUES('demo-tenant-river-city','local:rivercity@demo.myway.test','owner');
INSERT INTO "tenant_memberships" ("tenant_id","user_id","role") VALUES('demo-tenant-grace-stories','local:grace@demo.myway.test','owner');
INSERT INTO "tenant_memberships" ("tenant_id","user_id","role") VALUES('demo-tenant-harbor-light','local:harbor@demo.myway.test','owner');
CREATE TABLE platform_entities (
  id text primary key, kind text not null check(kind in ('churches','meditation','events','store','products','channels','resources')),
  tenant_id text not null references tenants(id), created_by text not null references users(id),
  state text not null default 'draft' check(state in ('draft','pending','published','archived')),
  revision integer not null default 1, data_json text not null check(json_valid(data_json)),
  created_at text not null, updated_at text not null
);
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-church-river-city','churches','demo-tenant-river-city','local:rivercity@demo.myway.test','published',1,'{"name":"River City Fellowship","city":"Nairobi","country":"KE","postal":"00100","denomination":"Pentecostal","language":"English","worship":"Contemporary","website":"https://rivercity.demo.myway.test","phone":"+254 700 000 101","email":"hello@rivercity.demo.myway.test","photo":"/assets/church-river-city.png","logo":"/assets/logo-river-city.png","pastor":"Pastor Daniel Mwangi","pastorTitle":"Lead Pastor","pastorBio":"Daniel leads River City with a heart for scripture, prayer, and everyday evangelism.","about":"A welcoming Nairobi fellowship centered on scripture, worship, and practical care for neighbors.","location":"Nairobi","sunday":"09:00","midweek":"18:30","ministries":["River City Youth","River City Outreach"],"livestream":{"enabled":true,"paid":false,"url":"https://www.youtube.com/embed/jiSyB8QZzk8"}}','2026-09-17T08:10:00.000Z','2026-09-17T08:10:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-church-grace-community','churches','demo-tenant-grace-stories','local:grace@demo.myway.test','published',1,'{"name":"Grace Community Church","city":"Kampala","country":"UG","postal":"25600","denomination":"Full Gospel","language":"English","worship":"Blended","website":"https://gracecommunity.demo.myway.test","phone":"+256 700 000 202","email":"hello@gracecommunity.demo.myway.test","photo":"/assets/church-grace-house.png","logo":"/assets/logo-grace-house.png","pastor":"Pastor Miriam Kato","pastorTitle":"Senior Pastor","pastorBio":"Miriam teaches scripture and equips small-group leaders across Kampala.","about":"A warm community helping new believers grow through small groups, prayer, and discipleship.","location":"Kampala","sunday":"10:30","midweek":"18:00","ministries":["Grace Groups","Grace Kids"],"livestream":{"enabled":true,"paid":false,"url":"https://www.youtube.com/embed/jiSyB8QZzk8"}}','2026-09-17T08:11:00.000Z','2026-09-17T08:11:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-church-harbor-light','churches','demo-tenant-harbor-light','local:harbor@demo.myway.test','published',1,'{"name":"Harbor Light Chapel","city":"Mombasa","country":"KE","postal":"80100","denomination":"Charismatic","language":"Swahili","worship":"Contemporary","website":"https://harborlight.demo.myway.test","phone":"+254 700 000 303","email":"hello@harborlight.demo.myway.test","photo":"/assets/church-light-chapel.png","logo":"/assets/logo-light-chapel.png","pastor":"Pastor Elias Wanjala","pastorTitle":"Lead Pastor","pastorBio":"Elias serves families and young leaders along the coast.","about":"A coastal church family making room for worship, youth leadership, and community outreach.","location":"Mombasa","sunday":"08:30","midweek":"17:30","ministries":["Harbor Light Outreach","Coastal Youth"],"livestream":{"enabled":true,"paid":false,"url":"https://www.youtube.com/embed/jiSyB8QZzk8"}}','2026-09-17T08:12:00.000Z','2026-09-17T08:12:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-channel-grace-stories','channels','demo-tenant-grace-stories','local:grace@demo.myway.test','published',1,'{"name":"Grace Stories","owner":"Grace Stories Studio","handle":"@gracestories","topic":"Testimonies","description":"Short, honest stories of faith, restoration, and everyday courage.","format":"Video","cover":"/assets/hero-global-church.png","avatar":"/assets/logo-grace-house.png","live":false,"posts":18}','2026-09-17T08:20:00.000Z','2026-09-17T08:20:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-channel-river-word','channels','demo-tenant-river-city','local:rivercity@demo.myway.test','published',1,'{"name":"River Word","owner":"River City Fellowship","handle":"@riverword","topic":"Bible Teaching","description":"Clear Bible teaching for Monday mornings, small groups, and growing leaders.","format":"Podcast","cover":"/assets/church-river-city.png","avatar":"/assets/logo-river-city.png","live":true,"liveUrl":"https://www.youtube.com/embed/jiSyB8QZzk8","posts":32}','2026-09-17T08:21:00.000Z','2026-09-17T08:21:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-channel-harbor-worship','channels','demo-tenant-harbor-light','local:harbor@demo.myway.test','published',1,'{"name":"Harbor Worship","owner":"Harbor Light Ministries","handle":"@harborworship","topic":"Worship","description":"Acoustic worship, prayer moments, and songs from the coast.","format":"Music","cover":"/assets/church-light-chapel.png","avatar":"/assets/logo-light-chapel.png","live":false,"posts":11}','2026-09-17T08:22:00.000Z','2026-09-17T08:22:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-event-kingdom-summit','events','demo-tenant-river-city','local:rivercity@demo.myway.test','published',1,'{"title":"Kingdom Builders Summit","churchId":"demo-church-river-city","eventType":"in-person","startsAt":"2026-10-03T08:00:00.000Z","endsAt":"2026-10-03T16:00:00.000Z","venueName":"River City Auditorium","city":"Nairobi","country":"KE","coverImageUrl":"/assets/community-outreach.png","registrationRequired":true,"ticketPriceCents":0,"currency":"KES","totalTickets":500,"ticketsSold":0,"isFeatured":true,"isPromoted":true,"registrationUrl":"https://rivercity.demo.myway.test/summit","livestreamUrl":"https://www.youtube.com/embed/jiSyB8QZzk8","directionsUrl":"https://maps.google.com","description":"A practical day of Bible teaching, evangelism stories, and ministry workshops.","highlights":["Evangelism lab","Worship night","Leader roundtables"]}','2026-09-17T08:30:00.000Z','2026-09-17T08:30:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-event-prayer-night','events','demo-tenant-grace-stories','local:grace@demo.myway.test','published',1,'{"title":"Citywide Prayer Night","churchId":"demo-church-grace-community","eventType":"in-person","startsAt":"2026-10-09T17:00:00.000Z","endsAt":"2026-10-09T20:00:00.000Z","venueName":"Grace Community Hall","city":"Kampala","country":"UG","coverImageUrl":"/assets/baptism-service.png","registrationRequired":false,"ticketPriceCents":0,"currency":"UGX","totalTickets":0,"ticketsSold":0,"isFeatured":true,"isPromoted":false,"registrationUrl":"","livestreamUrl":"https://www.youtube.com/embed/jiSyB8QZzk8","directionsUrl":"https://maps.google.com","description":"An evening of worship, scripture, and prayer for families across Kampala.","highlights":["Worship","Prayer rooms","Pastoral blessing"]}','2026-09-17T08:31:00.000Z','2026-09-17T08:31:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-event-global-worship','events','demo-tenant-harbor-light','local:harbor@demo.myway.test','published',1,'{"title":"Global Worship Stream","churchId":"demo-church-harbor-light","eventType":"online","startsAt":"2026-10-17T18:00:00.000Z","endsAt":"2026-10-17T20:00:00.000Z","venueName":"Online","city":"Mombasa","country":"KE","coverImageUrl":"/assets/hero-global-church.png","registrationRequired":false,"ticketPriceCents":0,"currency":"KES","totalTickets":0,"ticketsSold":0,"isFeatured":true,"isPromoted":true,"registrationUrl":"","livestreamUrl":"https://www.youtube.com/embed/jiSyB8QZzk8","directionsUrl":"","description":"A live worship gathering connecting churches, homes, and prayer groups across the region.","highlights":["Live worship","Prayer wall","Creator guests"]}','2026-09-17T08:32:00.000Z','2026-09-17T08:32:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-store-river-city','store','demo-tenant-river-city','local:rivercity@demo.myway.test','published',1,'{"name":"River City Store","ownerName":"River City Fellowship","category":"Books & Resources","description":"Study tools, journals, and church supplies from River City Fellowship.","image":"/assets/church-river-city.png","email":"store@rivercity.demo.myway.test","liveUrl":"https://rivercity.demo.myway.test/store","live":true}','2026-09-17T08:40:00.000Z','2026-09-17T08:40:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-store-grace-books','store','demo-tenant-grace-stories','local:grace@demo.myway.test','published',1,'{"name":"Grace Books & Gifts","ownerName":"Grace Stories Studio","category":"Books & Resources","description":"Simple resources for prayer, testimony, and a faithful daily rhythm.","image":"/assets/church-grace-house.png","email":"shop@gracecommunity.demo.myway.test","liveUrl":"https://gracecommunity.demo.myway.test/store","live":true}','2026-09-17T08:41:00.000Z','2026-09-17T08:41:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-store-harbor-light','store','demo-tenant-harbor-light','local:harbor@demo.myway.test','published',1,'{"name":"Harbor Light Market","ownerName":"Harbor Light Ministries","category":"Apparel & Gifts","description":"Worship apparel and simple gifts from Harbor Light Ministries.","image":"/assets/church-light-chapel.png","email":"market@harborlight.demo.myway.test","liveUrl":"https://harborlight.demo.myway.test/store","live":true}','2026-09-17T08:41:30.000Z','2026-09-17T08:41:30.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-product-study-bible','products','demo-tenant-river-city','local:rivercity@demo.myway.test','published',1,'{"itemType":"product","title":"FaithLink Study Bible","storeId":"demo-store-river-city","seller":"River City Fellowship","sellerType":"Church","category":"Books","description":"A durable study Bible with guided notes, maps, and room for reflection.","price":48,"compareAt":58,"inventory":34,"status":"Active","featured":true,"image":"https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=82"}','2026-09-17T08:42:00.000Z','2026-09-17T08:42:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-product-prayer-journal','products','demo-tenant-grace-stories','local:grace@demo.myway.test','published',1,'{"itemType":"product","title":"90-Day Prayer Journal","storeId":"demo-store-grace-books","seller":"Grace Stories Studio","sellerType":"Channel","category":"Journals","description":"Daily prompts for scripture, gratitude, prayer, and testimony.","price":22,"compareAt":28,"inventory":68,"status":"Active","featured":true,"image":"https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=82"}','2026-09-17T08:43:00.000Z','2026-09-17T08:43:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-product-worship-hoodie','products','demo-tenant-harbor-light','local:harbor@demo.myway.test','published',1,'{"itemType":"product","title":"Worship Is My Response Hoodie","storeId":"demo-store-harbor-light","seller":"Harbor Light Ministries","sellerType":"Church","category":"Apparel","description":"A heavyweight unisex hoodie designed for worship teams and everyday wear.","price":54,"compareAt":64,"inventory":21,"status":"Active","featured":false,"image":"https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=82"}','2026-09-17T08:44:00.000Z','2026-09-17T08:44:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-product-communion-set','products','demo-tenant-grace-stories','local:grace@demo.myway.test','published',1,'{"itemType":"product","title":"Home Communion Set","storeId":"demo-store-grace-books","seller":"Grace Community Church","sellerType":"Church","category":"Church Supplies","description":"A simple reusable communion set for families, groups, and pastoral visits.","price":38,"compareAt":0,"inventory":17,"status":"Active","featured":false,"image":"https://images.unsplash.com/photo-1473177104440-ffee2f376098?auto=format&fit=crop&w=800&q=82"}','2026-09-17T08:45:00.000Z','2026-09-17T08:45:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-resource-romans','resources','demo-tenant-river-city','local:rivercity@demo.myway.test','published',1,'{"title":"Romans: Grace and Righteousness","creator":"River Word","topic":"Bible Study","description":"A chapter-by-chapter study outline with discussion and application questions.","type":"Text","format":"PDF","duration":"42 pages","image":"https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=800&q=82","access":"Free","price":0,"sourceUrl":"https://example.com/demo-romans.pdf","pages":["Introduction","Grace","Righteousness","Mission"]}','2026-09-17T08:50:00.000Z','2026-09-17T08:50:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-resource-prayer','resources','demo-tenant-grace-stories','local:grace@demo.myway.test','published',1,'{"title":"30-Day Guided Prayer Journal","creator":"Grace Stories","topic":"Prayer","description":"Daily scripture, reflection prompts, gratitude, and prayer tracking.","type":"Text","format":"EPUB","duration":"30 days","image":"https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=800&q=82","access":"Paid","price":8,"sourceUrl":"https://example.com/demo-prayer.epub","pages":["Day 1","Day 2","Day 3"]}','2026-09-17T08:51:00.000Z','2026-09-17T08:51:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-resource-gospel-basics','resources','demo-tenant-river-city','local:rivercity@demo.myway.test','published',1,'{"title":"The Gospel: A Clear Foundation","creator":"River City Fellowship","topic":"Discipleship","description":"A clear introduction to salvation, grace, faith, and new life in Christ.","type":"Video","format":"MP4","duration":"48 min","image":"https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=800&q=82","access":"Free","price":0,"sourceUrl":"https://example.com/demo-gospel.mp4","embedUrl":"https://www.youtube.com/embed/jiSyB8QZzk8"}','2026-09-17T08:52:00.000Z','2026-09-17T08:52:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-meditation-peace','meditation','demo-tenant-grace-stories','local:grace@demo.myway.test','published',1,'{"title":"Be Still and Abide","subtitle":"Calm your soul and release every anxious thought into His hands.","category":"featured","categoryLabel":"Featured room","theme":"chapel","template":"timer","toneFreq":432,"cover":"/assets/meditation-chapel.png","selectedAudio":"bible","commentsEnabled":false,"ownerName":"Grace Stories","verses":[{"topic":"Be Still","text":"The Lord is in His holy temple; let all the earth keep silence before Him.","ref":"Habakkuk 2:20"},{"topic":"Perfect Peace","text":"Peace I leave with you; my peace I give you.","ref":"John 14:27"}],"audioTracks":{"bible":{"title":"Audio Bible: Psalms of Peace","cat":"Dramatized Scripture","freq":432},"instrumental":{"title":"Still Waters Harp and Strings","cat":"Soaking Instrumental","freq":432}}}','2026-09-17T08:55:00.000Z','2026-09-17T08:55:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-meditation-forest','meditation','demo-tenant-harbor-light','local:harbor@demo.myway.test','published',1,'{"title":"Quiet Waters for the Journey","subtitle":"A gentle scripture room for reflection, breath, and renewal.","category":"themes","categoryLabel":"Scriptural theme","theme":"forest","template":"nature","toneFreq":528,"cover":"/assets/meditation-forest.png","selectedAudio":"instrumental","commentsEnabled":true,"ownerName":"Harbor Light Ministries","verses":[{"topic":"Quiet Waters","text":"He leads me beside quiet waters; he refreshes my soul.","ref":"Psalm 23:2-3"},{"topic":"Renewal","text":"Those who hope in the Lord will renew their strength.","ref":"Isaiah 40:31"}],"audioTracks":{"instrumental":{"title":"Forest Strings","cat":"Soaking Instrumental","freq":528},"worship":{"title":"Acoustic Renewal","cat":"Christian Worship","freq":528}}}','2026-09-17T08:56:00.000Z','2026-09-17T08:56:00.000Z');
INSERT INTO "platform_entities" ("id","kind","tenant_id","created_by","state","revision","data_json","created_at","updated_at") VALUES('demo-meditation-stars','meditation','demo-tenant-river-city','local:rivercity@demo.myway.test','published',1,'{"title":"Night Watch Prayer","subtitle":"A quiet room for intercession, surrender, and faithful listening.","category":"bible-books","categoryLabel":"Bible book","theme":"stars","template":"journey","toneFreq":396,"cover":"/assets/meditation-stars.png","selectedAudio":"silence","commentsEnabled":false,"ownerName":"River City Fellowship","verses":[{"topic":"Watch and Pray","text":"Stay awake and pray that you will not fall into temptation.","ref":"Matthew 26:41"},{"topic":"Hope","text":"The Lord is good to those whose hope is in him.","ref":"Lamentations 3:25"}],"audioTracks":{"silence":{"title":"Silence and Ambience Only","cat":"Ambient Atmosphere","freq":396},"sermon":{"title":"Night Watch Reflection","cat":"Pastoral Teaching","freq":396}}}','2026-09-17T08:57:00.000Z','2026-09-17T08:57:00.000Z');
CREATE TABLE private_records (
  id text primary key, user_id text not null references users(id), tenant_id text references tenants(id),
  kind text not null check(kind in ('prayer','reflection','ride','visit','salvation','foundation','message','settings')),
  entity_id text, recipient_user_id text references users(id), visibility text not null default 'private' check(visibility in ('private','pastors','recipient')),
  data_encrypted text not null, status text not null default 'new', revision integer not null default 1, created_at text not null, updated_at text not null
);
CREATE TABLE security_tokens (digest text primary key, user_id text not null references users(id), purpose text not null check(purpose in ('verify','reset','mfa')), expires_at text not null, created_at text not null);
CREATE TABLE auth_attempts (account_digest text primary key, window_start integer not null, attempts integer not null);
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
INSERT INTO "spotlight_items" ("id","tenant_id","created_by","channel_entity_id","subject_entity_id","content_type","title","caption","creator_name","creator_handle","creator_avatar_url","media_url","poster_url","full_content_url","preview_source","preview_start_seconds","preview_end_seconds","duration_seconds","cta_label","cta_url","status","placement_kind","moderation_note","comments_enabled","priority","scheduled_at","expires_at","published_at","revision","created_at","updated_at") VALUES('demo-spotlight-grace','demo-tenant-grace-stories','local:grace@demo.myway.test','demo-channel-grace-stories','demo-church-grace-community','long-preview','A new beginning in faith','Grace shares how one faithful conversation helped her begin again.','Grace Stories','@gracestories','/assets/logo-grace-house.png','','/assets/spotlight/grace-testimony.webp','app.html?view=channels','creator',42,87,1920,'Watch full video','app.html?view=channels','live','editorial',NULL,1,100,NULL,NULL,'2026-09-17T09:00:00.000Z',1,'2026-09-17T08:58:00.000Z','2026-09-17T09:00:00.000Z');
INSERT INTO "spotlight_items" ("id","tenant_id","created_by","channel_entity_id","subject_entity_id","content_type","title","caption","creator_name","creator_handle","creator_avatar_url","media_url","poster_url","full_content_url","preview_source","preview_start_seconds","preview_end_seconds","duration_seconds","cta_label","cta_url","status","placement_kind","moderation_note","comments_enabled","priority","scheduled_at","expires_at","published_at","revision","created_at","updated_at") VALUES('demo-spotlight-river','demo-tenant-river-city','local:rivercity@demo.myway.test','demo-channel-river-word','demo-church-river-city','short','Faith moves when we step out','Pastor Daniel shares what God taught him while serving his city.','River Word','@riverword','/assets/logo-river-city.png','','/assets/spotlight/pastor-marcus.webp','app.html?view=channels','automatic',0,60,80,'Open Channel','app.html?view=channels','live','organic',NULL,1,90,NULL,NULL,'2026-09-17T09:00:00.000Z',1,'2026-09-17T08:59:00.000Z','2026-09-17T09:00:00.000Z');
INSERT INTO "spotlight_items" ("id","tenant_id","created_by","channel_entity_id","subject_entity_id","content_type","title","caption","creator_name","creator_handle","creator_avatar_url","media_url","poster_url","full_content_url","preview_source","preview_start_seconds","preview_end_seconds","duration_seconds","cta_label","cta_url","status","placement_kind","moderation_note","comments_enabled","priority","scheduled_at","expires_at","published_at","revision","created_at","updated_at") VALUES('demo-spotlight-harbor','demo-tenant-harbor-light','local:harbor@demo.myway.test','demo-channel-harbor-worship','demo-church-harbor-light','church','Harbor Light Chapel','A coastal church family making room for worship, youth leadership, and community outreach.','Harbor Light Chapel','@harborlight','/assets/logo-light-chapel.png','','/assets/church-light-chapel.png','app.html?view=directory','creator',0,NULL,NULL,'View Church','app.html?view=directory','live','editorial',NULL,1,80,NULL,NULL,'2026-09-17T09:00:00.000Z',1,'2026-09-17T09:00:00.000Z','2026-09-17T09:00:00.000Z');
CREATE TABLE spotlight_engagements (
  item_id text not null references spotlight_items(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  action text not null check(action in ('like','save','follow','report')),
  created_at text not null,
  primary key(item_id, user_id, action)
);
INSERT INTO "spotlight_engagements" ("item_id","user_id","action","created_at") VALUES('demo-spotlight-grace','local:rivercity@demo.myway.test','like','2026-09-17T09:10:00.000Z');
INSERT INTO "spotlight_engagements" ("item_id","user_id","action","created_at") VALUES('demo-spotlight-grace','local:harbor@demo.myway.test','save','2026-09-17T09:11:00.000Z');
INSERT INTO "spotlight_engagements" ("item_id","user_id","action","created_at") VALUES('demo-spotlight-river','local:grace@demo.myway.test','like','2026-09-17T09:12:00.000Z');
INSERT INTO "spotlight_engagements" ("item_id","user_id","action","created_at") VALUES('demo-spotlight-harbor','local:rivercity@demo.myway.test','like','2026-09-17T09:13:00.000Z');
CREATE TABLE spotlight_comments (
  id text primary key,
  item_id text not null references spotlight_items(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  body text not null check(length(body) between 1 and 600),
  status text not null default 'visible' check(status in ('visible','hidden','reported')),
  created_at text not null
);
INSERT INTO "spotlight_comments" ("id","item_id","user_id","body","status","created_at") VALUES('demo-comment-grace-1','demo-spotlight-grace','local:rivercity@demo.myway.test','This is exactly the encouragement I needed today.','visible','2026-09-17T09:10:00.000Z');
INSERT INTO "spotlight_comments" ("id","item_id","user_id","body","status","created_at") VALUES('demo-comment-grace-2','demo-spotlight-grace','local:harbor@demo.myway.test','Thank you for sharing a story of hope.','visible','2026-09-17T09:11:00.000Z');
INSERT INTO "spotlight_comments" ("id","item_id","user_id","body","status","created_at") VALUES('demo-comment-river-1','demo-spotlight-river','local:grace@demo.myway.test','Faith really does move us into action.','visible','2026-09-17T09:12:00.000Z');
CREATE TABLE platform_taxonomies (
  key text primary key check(key in ('denominations','languages','worship_styles','store_categories','product_categories','channel_topics','resource_topics')),
  items_json text not null check(json_valid(items_json) and json_type(items_json) = 'array'),
  revision integer not null default 1,
  updated_by text references users(id),
  updated_at text not null
);
INSERT INTO "platform_taxonomies" ("key","items_json","revision","updated_by","updated_at") VALUES('denominations','["Christ Embassy","New Generation","Pentecostal","Full Gospel","Charismatic","Baptist","Catholic","Anglican","Presbyterian","Protestant"]',1,NULL,'2026-09-17T04:41:16.381Z');
INSERT INTO "platform_taxonomies" ("key","items_json","revision","updated_by","updated_at") VALUES('languages','["English","French","Spanish","Portuguese","Swahili","Arabic"]',1,NULL,'2026-09-17T04:41:16.381Z');
INSERT INTO "platform_taxonomies" ("key","items_json","revision","updated_by","updated_at") VALUES('worship_styles','["Contemporary","Traditional","Blended","Charismatic"]',1,NULL,'2026-09-17T04:41:16.381Z');
INSERT INTO "platform_taxonomies" ("key","items_json","revision","updated_by","updated_at") VALUES('store_categories','["Books & Resources","Apparel","Music","Gifts","Church Supplies","General"]',1,NULL,'2026-09-17T04:41:16.381Z');
INSERT INTO "platform_taxonomies" ("key","items_json","revision","updated_by","updated_at") VALUES('product_categories','["Books","Journals","Apparel","Church Supplies","Study Tools","Kids","Music","Gifts"]',1,NULL,'2026-09-17T04:41:16.381Z');
INSERT INTO "platform_taxonomies" ("key","items_json","revision","updated_by","updated_at") VALUES('channel_topics','["Bible Teaching","Worship","Family","Leadership","Youth","Bible Study"]',1,NULL,'2026-09-17T04:41:16.381Z');
INSERT INTO "platform_taxonomies" ("key","items_json","revision","updated_by","updated_at") VALUES('resource_topics','["Bible Study","Prayer","Discipleship","Worship","Devotional","Leadership"]',1,NULL,'2026-09-17T04:41:16.381Z');
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
