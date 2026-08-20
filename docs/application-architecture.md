# Application Architecture

My Way of Evangelism is organized as four applications that share one platform data model.

## 1. Public Website App

- Route: `/`
- Login: No
- Users: seekers, first-time visitors, new believers, donors, volunteers
- Responsibilities:
  - Introduce the nonprofit
  - Let people search and compare churches
  - Link to church profiles and livestream pages
  - Send churches to `/church-portal` for registration/login

## 2. Church Portal App

- Route: `/church-portal`
- Login: Required
- Users: pastors, church owners, church staff
- Responsibilities:
  - Manage one church profile
  - Update pastor, services, ministries, media, contact, and livestream settings
  - Review visitor follow-up queues
  - Request paid livestream activation

## 3. Owner Dashboard App

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

## 4. API App

- Route: `/api/*`
- Runtime: Cloudflare Worker (`src/worker.js`)
- Data: D1, with R2/Queues/Turnstile planned
- Responsibilities:
  - Provide synchronized church data to the public website, church portal, and owner dashboard
  - Store church applications, visitor connections, prayer requests, livestream activation requests, and admin CRUD changes
  - Expose `/api/status` as a platform health and contract endpoint

## Production Auth Boundary

The current local preview uses a lightweight browser login gate for private app behavior. Production should enforce auth before page delivery:

- `/owner-dashboard`: Cloudflare Access or equivalent super-admin identity layer
- `/church-portal`: church account authentication with ownership verification
- `/api/admin/*`: bearer/session authorization
- `/api/churches` write paths: church session or application review workflow

The files under `functions/api` are retained only as migration reference. New API work belongs in `src/worker.js` so there is one deployable backend.
