-- Development-only seed data. Do not apply this file to production.

insert or ignore into churches (
  id, name, city, country, postal_code, denomination, language, worship_style,
  website, phone, email, cover_image_url, livestream_enabled, livestream_paid,
  livestream_url, description, is_verified, created_at
) values (
  'christ-embassy-edmonton', 'Christ Embassy Edmonton', 'Edmonton', 'CA',
  'T5J 0N3', 'Charismatic', 'English', 'Contemporary',
  'https://example.org', '+1 780 555 0100', 'hello@example.org',
  '/assets/church-audience.jpg', 1, 0,
  'https://www.youtube.com/embed/jiSyB8QZzk8',
  'Development record for local integration testing.', 1,
  '2026-08-19T00:00:00.000Z'
);

insert or ignore into church_profiles (
  church_id, pastor_name, pastor_title, pastor_bio, about
) values (
  'christ-embassy-edmonton', 'Pastor Samuel Okoye', 'Lead Pastor',
  'Development profile used to exercise church directory API responses.',
  'A development church profile for local testing only.'
);

insert or ignore into events (
  id, church_id, title, event_type, starts_at, ends_at, venue_name, city,
  country, cover_image_url, registration_required, ticket_price_cents,
  currency, total_tickets, tickets_sold, is_featured, is_promoted,
  registration_url, livestream_url, directions_url, description
) values (
  'development-community-service', 'christ-embassy-edmonton',
  'Development Community Service', 'in-person', '2026-12-06T17:00:00.000Z',
  '2026-12-06T19:00:00.000Z', 'Main Auditorium', 'Edmonton', 'CA',
  '/assets/community-outreach.png', 1, 0, 'CAD', 100, 0, 1, 0,
  '', '', '', 'Development event used for API and registration testing.'
);
