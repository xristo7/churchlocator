create table if not exists churches (
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

create table if not exists church_profiles (
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

create table if not exists service_schedules (
  id text primary key,
  church_id text not null references churches(id) on delete cascade,
  service_type text not null,
  day_of_week text,
  starts_at text,
  notes text
);

create table if not exists ministries (
  id text primary key,
  church_id text not null references churches(id) on delete cascade,
  name text not null,
  description text,
  meeting_times text,
  leader text,
  location text,
  contact text
);

create table if not exists events (
  id text primary key,
  church_id text references churches(id) on delete set null,
  title text not null,
  event_type text, -- 'in-person' or 'streamed'
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

create table if not exists visitor_connections (
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

create table if not exists prayer_requests (
  id text primary key,
  church_id text references churches(id) on delete set null,
  request_text text not null,
  is_anonymous integer not null default 0,
  status text not null default 'new',
  created_at text not null
);

create table if not exists church_applications (
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

create table if not exists livestream_activations (
  id text primary key,
  church_id text not null references churches(id) on delete cascade,
  livestream_url text not null,
  status text not null default 'requested',
  payment_status text not null default 'pending',
  provider text,
  created_at text not null,
  activated_at text
);

create table if not exists donations (
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

create table if not exists volunteer_applications (
  id text primary key,
  full_name text not null,
  email text not null,
  volunteer_area text not null,
  status text not null default 'new',
  created_at text not null
);

create table if not exists event_registrations (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  full_name text not null,
  email text not null,
  ticket_quantity integer not null default 1,
  amount_paid_cents integer not null default 0,
  registration_code text not null,
  created_at text not null
);

create table if not exists ride_requests (
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

create table if not exists ride_followups (
  id text primary key,
  ride_request_id text not null references ride_requests(id) on delete cascade,
  stage integer not null, -- 1: Welcome, 2: Reminder, 3: Confirmation
  contacted_at text not null,
  team_member_name text not null,
  contact_method text not null,
  visitor_response text,
  pickup_status text,
  driver_assigned text,
  attendance_status text
);

create table if not exists salvation_decisions (
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

create table if not exists foundation_projects (
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

create table if not exists foundation_applications (
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

create table if not exists church_staff_roles (
  id text primary key,
  church_id text not null references churches(id) on delete cascade,
  user_email text not null,
  role text not null,
  created_at text not null
);

create index if not exists idx_churches_public_directory
  on churches(is_verified, country, city, name);
create index if not exists idx_churches_filters
  on churches(denomination, language, worship_style);
create index if not exists idx_events_upcoming
  on events(starts_at, city, event_type);
create index if not exists idx_events_church
  on events(church_id, starts_at);
create index if not exists idx_visitor_connections_queue
  on visitor_connections(church_id, status, created_at);
create index if not exists idx_prayer_requests_queue
  on prayer_requests(church_id, status, created_at);
create index if not exists idx_church_applications_queue
  on church_applications(status, created_at);
create index if not exists idx_livestream_activations_queue
  on livestream_activations(church_id, status, created_at);
create index if not exists idx_event_registrations_event
  on event_registrations(event_id, created_at);
create unique index if not exists idx_event_registration_code
  on event_registrations(registration_code);
create index if not exists idx_ride_requests_queue
  on ride_requests(church_id, status, created_at);
create index if not exists idx_salvation_decisions_queue
  on salvation_decisions(church_id, status, created_at);
create index if not exists idx_foundation_applications_queue
  on foundation_applications(status, created_at);
create unique index if not exists idx_church_staff_membership
  on church_staff_roles(church_id, user_email);

-- Super Admin-managed labels used by public filters and creator forms.
-- Production defaults are inserted by migration 0007_platform_taxonomies.sql.
create table if not exists platform_taxonomies (
  key text primary key,
  items_json text not null check(json_valid(items_json) and json_type(items_json) = 'array'),
  revision integer not null default 1,
  updated_by text,
  updated_at text not null
);

