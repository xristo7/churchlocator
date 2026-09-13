-- 0003_service_bookings.sql
-- Adds service_bookings table for church and creator service inquiries and bookings.

create table if not exists service_bookings (
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

create index if not exists idx_service_bookings_email on service_bookings(customer_email);
create index if not exists idx_service_bookings_service on service_bookings(service_id);
create index if not exists idx_service_bookings_user on service_bookings(user_id);
