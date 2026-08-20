# Application Architecture

My Way of Evangelism is organized as five applications that share one platform data model.

## 1. Public Website App

- Route: `/`
- Login: No
- Users: seekers, first-time visitors, new believers, donors, volunteers
- Responsibilities:
  - Introduce the nonprofit
  - Let people search and compare churches
  - Show church, event, and livestream discovery cards before sign-in
  - Prompt for member sign-in when a protected detail is opened
  - Send churches to `/church-portal` for registration/login

## 2. Member SPA

- Route: `/app`
- Login: Required
- Users: church seekers and signed-in community members
- Persistent regions: FaithLink header and left navigation
- Changing region: the existing page-specific content loaded into the shell
- Responsibilities:
  - Load Churches from the existing church card listing
  - Run Channels as an independent creator module for podcasts, videos, and livestreams
  - Load Events from the existing event card listing
  - Load Live from the existing stream card listing and player
  - Run Store as an independent marketplace for churches and channel owners
  - Give sellers an authenticated catalog, inventory, and order-management dashboard
  - Run Resources as a dedicated free and paid library for text, video, and audio material
  - Load church and event details from their selected cards
  - Keep church-only profile tabs inside the church profile view

The member sidebar is exactly `Home`, `Churches`, `Channels`, `Events`, `Live`, `Store`, and `Resources`. It has no `Church Profile` link because profiles are entered from church cards, and it has no `Giving` link because the Give action sits in the persistent header beside the member profile. Home leaves the member shell and returns to the standalone landing page.

## 3. Church Portal App

- Route: `/church-portal`
- Login: Required
- Users: pastors, church owners, church staff
- Responsibilities:
  - Manage one church profile
  - Update pastor, services, ministries, media, contact, and livestream settings
  - Review visitor follow-up queues
  - Request paid livestream activation

## 4. Owner Dashboard App

- Route: `/owner-dashboard`
- Legacy alias: `/admin`
- Login: Required
- Users: platform owners and super admins
- Responsibilities:
  - Approve and verify churches
  - Manage global directory records
  - Moderate content
  - Monitor livestream billing and platform operations
  - Audit visitor/follow-up health

## 5. API App

- Route: `/api/*`
- Runtime: Cloudflare Worker (`src/worker.js`)
- Data: D1, with R2/Queues/Turnstile planned
- Responsibilities:
  - Provide synchronized church data to the public website, church portal, and owner dashboard
  - Store church applications, visitor connections, prayer requests, livestream activation requests, and admin CRUD changes
  - Expose `/api/status` as a platform health and contract endpoint

## Production Auth Boundary

The current local preview uses a lightweight browser login gate for private app behavior. Production should enforce auth before page delivery:

- `/app`: real member sessions enforced at the Worker/API boundary
- `/owner-dashboard`: Cloudflare Access or equivalent super-admin identity layer
- `/church-portal`: church account authentication with ownership verification
- `/api/admin/*`: bearer/session authorization
- `/api/churches` write paths: church session or application review workflow

The files under `functions/api` are retained only as migration reference. New API work belongs in `src/worker.js` so there is one deployable backend.
