# My Way of Evangelism

Cloudflare Pages project for a nonprofit church discovery and digital evangelism platform.

## What is included

- Four explicit applications:
  - Public Website App at `/`, with no login required.
  - Church Portal App at `/church-portal`, login required.
  - Owner Dashboard App at `/owner-dashboard`, login required.
  - API App at `/api/*`, responsible for shared data synchronization.
- Public church discovery at `index.html` with filters, real seeded church cards, impact storytelling, church profiles, and church portal register/login links.
- Public church profile route at `church-profile.html?id=...` for visitors trying to evaluate and contact a church.
- Church-specific livestream route at `livestream.html?id=...`, populated from the selected church profile and modeled as a paid/premium feature.
- Church portal at `church-portal.html` for churches to manage profile details, ministries, contact information, pastor content, and livestream settings behind a login gate.
- Owner dashboard at `owner-dashboard.html` for adding, editing, verifying, viewing, and removing churches, including livestream status and admin metrics behind a login gate.
- Admin API at `/api/admin/churches` and status API at `/api/status` for D1-backed production synchronization. Set `ADMIN_API_TOKEN` in Cloudflare to require a bearer token.
- Contact/share interactions in the imported UI, with Cloudflare Pages Function placeholders kept for future visitor, prayer, and church application flows.
- Media center, Rhapsody of Realities, member church channels, and profile preview sections.
- Local generated visual assets in `public/assets` remain available for later use; the imported UI currently references remote Unsplash images and Lucide icons.
- Cloudflare Pages configuration in `wrangler.jsonc`.
- D1-oriented backend schema draft in `database/schema.sql`.

## Folder layout

```text
my-way-of-evangelism/
  public/                 Static Cloudflare Pages output
    index.html            Public seeker-facing site
    church-profile.html   Public church profile page
    livestream.html       Public church-specific stream page
    church-portal.html    Church-owned dashboard
    owner-dashboard.html  Platform-owner dashboard
    admin.html            Legacy alias for owner dashboard
    styles.css            Shared design system
    app.js                Shared data store and route controllers
  functions/api/          API application powered by Pages Functions
  database/schema.sql     Draft D1 schema for the production backend
  docs/backend-roadmap.md Cloudflare implementation roadmap
  tools/static-server.ps1 Static local preview server for this environment
  wrangler.jsonc          Cloudflare Pages config
```

## Run locally

This environment did not have Node.js available, so dependencies were not installed here. A static preview server is included for this workspace:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\static-server.ps1 -Root .\public -Port 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

Static preview routes:

```text
http://127.0.0.1:4173/
http://127.0.0.1:4173/church-portal
http://127.0.0.1:4173/owner-dashboard
http://127.0.0.1:4173/livestream.html?id=christ-embassy-edmonton
```

On a machine with Node.js 20+, use Wrangler for the full Cloudflare Pages Functions runtime:

```bash
npm install
npm run dev
```

For a quick static preview without Pages Functions, open `public/index.html` in a browser.

The PowerShell static preview does not execute Cloudflare Pages Functions. Use `npm run dev` or deploy to Cloudflare to test `/api/*` routes such as `/api/status`.

## Deploy to Cloudflare Pages

Direct upload:

```bash
npm install
npm run deploy
```

Git deployment settings:

- Framework preset: None
- Build command: leave empty
- Build output directory: `public`
- Root directory: repository root / leave empty

## Production backend direction

Use Cloudflare services as the project grows:

- D1 for churches, visitors, ministries, events, prayer requests, and follow-up records.
- R2 for church photos, logos, videos, testimonies, documents, and gallery media.
- Cloudflare Access or another auth layer for `/owner-dashboard` and real church account authentication for `/church-portal` before production use.
- Turnstile for public forms.
- Queues for SMS, email, reminders, receipts, and moderation jobs.
- Workers AI and Vectorize later for semantic church/media search.

After creating a D1 database in Cloudflare, add its binding to `wrangler.jsonc` so Pages Functions can access `env.DB`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "my-way-of-evangelism",
    "database_id": "<cloudflare-d1-database-id>"
  }
]
```

Apply the initial schema with Wrangler:

```bash
npx wrangler d1 execute my-way-of-evangelism --file=./database/schema.sql
```
