# Cloudflare Backend Roadmap

## Phase 1: Persistent platform foundation

- Deploy the Worker and static assets together from `src/worker.js` and `public/`.
- Keep all API routes in the Worker; `functions/api` is migration reference only.
- Add Cloudflare Turnstile to visitor, prayer, volunteer, donation, and church application forms.
- Create a D1 database and apply `database/schema.sql`.
- Add the D1 binding as `DB` in `wrangler.jsonc`.

## Phase 2: Church directory and media

- Store logos, church photos, pastor photos, videos, documents, and gallery uploads in R2.
- Add signed upload URLs through Pages Functions so churches upload media safely.
- Store R2 object keys in D1 instead of storing files in D1.
- Add role-based dashboards for church admins, platform admins, and evangelism teams.

## Phase 3: Follow-up operations

- Use Queues for SMS, email, reminder, receipt, and moderation jobs.
- Add follow-up status transitions: new, assigned, contacted, attending, pastoral-care, complete.
- Track notes, assigned team members, date contacted, outcome, SMS history, and email history.

## Phase 4: Search and discovery

- Keep structured filters in D1 for city, country, postal code, denomination, language, worship style, service time, ministries, livestream, accessibility, parking, and transport.
- Add geocoding fields for distance search.
- Add Vectorize later for semantic search across churches, sermons, articles, devotionals, and ministries.

## Phase 5: Donations and receipts

- Integrate Stripe, PayPal, bank transfer references, and regional mobile money providers.
- Generate receipts asynchronously with Queues.
- Store donation metadata in D1 and receipt files in R2.

## Phase 6: Governance and moderation

- Add admin workflows for church approvals, verification documents, content moderation, testimonies, volunteers, organizations, campaigns, emails, and notifications.
- Audit sensitive changes.
- Keep verification documents private in R2 with signed access for authorized reviewers only.
