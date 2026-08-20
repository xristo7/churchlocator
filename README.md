# My Way of Evangelism

Cloudflare Worker Static Assets project for a nonprofit church discovery and digital evangelism platform.

## What is included

- Five explicit applications:
  - Public Website App at `/`, with no login required.
  - Member SPA at `/app`, login required, with a persistent header and left navigation.
  - Church Portal App at `/church-portal`, login required.
  - Owner Dashboard App at `/owner-dashboard`, login required.
  - API App at `/api/*`, responsible for shared data synchronization.
- Public church discovery at `index.html` with filters, real seeded church cards, impact storytelling, church profiles, and church portal register/login links.
- Public church, event, and livestream cards remain visible for discovery. Opening a protected detail prompts member sign-in and then loads the selected view inside `/app`.
- The member SPA keeps Home, Churches, Events, and Live while adding independent Channels, Store, seller-management, Christian Resources, and member messaging. Channel cards open dedicated profiles and start owner conversations; Messages provides inbox, compose, replies, and email-forwarding preferences from the profile menu. Store includes product details, a dedicated cart, a Shopify-inspired one-page checkout, and local order records. Giving is accessed from the persistent header instead of the sidebar.
- Church portal at `church-portal.html` for churches to manage profile details, ministries, contact information, pastor content, and livestream settings behind a login gate.
- Owner dashboard at `owner-dashboard.html` for adding, editing, verifying, viewing, and removing churches, including livestream status and admin metrics behind a login gate.
- Admin API at `/api/admin/churches` and status API at `/api/status` for D1-backed production synchronization. Set `ADMIN_API_TOKEN` in Cloudflare to require a bearer token.
- Contact/share interactions in the imported UI, with Worker API routes for future visitor, prayer, and church application flows.
- Media center, Rhapsody of Realities, member church channels, and profile preview sections.
- Local generated visual assets in `public/assets` remain available for later use; the imported UI currently references remote Unsplash images and Lucide icons.
- Cloudflare Worker Static Assets configuration in `wrangler.jsonc`, with a Pages deploy script kept for later if the project is recreated as Pages.
- D1-oriented backend schema draft in `database/schema.sql`.

## Folder layout

```text
my-way-of-evangelism/
  public/                 Static website assets
    index.html            Public seeker-facing site
    app.html              Authenticated persistent member shell
    app-shell.js          Member shell routing and static-region behavior
    channels.html         Member-created podcast, video, and livestream channels
    store.html            Church and creator marketplace
    seller-dashboard.html Seller catalog, inventory, and order management
    resources.html        Filterable free and paid Christian resource library
    church-profile.html   Church profile content view
    livestream.html       Livestream directory and player view
    church-portal.html    Church-owned dashboard
    owner-dashboard.html  Platform-owner dashboard
    admin.html            Legacy alias for owner dashboard
    styles.css            Shared design system
    app.js                Shared data store and route controllers
  functions/api/          Pages Function source kept as a reference if the project is later moved to Pages
  database/schema.sql     Draft D1 schema for the production backend
  docs/backend-roadmap.md Cloudflare implementation roadmap
  tools/static-server.ps1 Static local preview server for this environment
  src/worker.js           Cloudflare Worker entrypoint for static assets and API routes
  wrangler.jsonc          Cloudflare Worker Static Assets config
```

## Run locally

Install dependencies and initialize the local D1 database:

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars
npm run db:migrate:local
npm run db:seed:local
```

Run the full Worker and API locally:

```powershell
npm run dev
```

Wrangler prints the local address, normally `http://127.0.0.1:8787/`.

For a frontend-only static preview without Worker API routes:

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
http://127.0.0.1:4173/app.html?view=directory
http://127.0.0.1:4173/church-portal
http://127.0.0.1:4173/owner-dashboard
http://127.0.0.1:4173/livestream.html?id=christ-embassy-edmonton
```

The PowerShell static preview does not execute Worker API routes. Use `npm run dev` or deploy to Cloudflare to test `/api/*` routes such as `/api/status`.

## Deploy to Cloudflare Workers

Direct upload:

```bash
npm install
npm run deploy
```

Git deployment settings for the current Cloudflare Worker project:

- Framework preset: None
- Build command: `npm run build` or leave empty
- Deploy command: `npx wrangler deploy`
- Build output directory: not required for Workers; static assets are configured in `wrangler.jsonc`
- Root directory: repository root / leave empty

The Cloudflare account currently has a Worker named `churchlocator`, so `wrangler.jsonc` is configured for Worker Static Assets and the API routes are handled by `src/worker.js`.

If Cloudflare needs a Node version, this repo pins Node `22.16.0` in `.nvmrc` and `.node-version`. You can also set `NODE_VERSION=22.16.0` in the build environment variables.

## Production backend direction

Use Cloudflare services as the project grows:

- D1 for churches, visitors, ministries, events, prayer requests, and follow-up records.
- R2 for church photos, logos, videos, testimonies, documents, and gallery media.
- Cloudflare Access or another auth layer for `/owner-dashboard` and real church account authentication for `/church-portal` before production use.
- Turnstile for public forms.
- Queues for SMS, email, reminders, receipts, and moderation jobs.
- Workers AI and Vectorize later for semantic church/media search.

The `DB` binding and migration directory are declared in `wrangler.jsonc`. Apply pending migrations before deploying application code:

```bash
npm run db:migrate:preview
npm run db:migrate:production
```

`database/seed.sql` is development-only and must not be applied to production.
