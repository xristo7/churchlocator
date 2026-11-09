# Release runbook (RhemaSphere)

Workers: `my-way-of-evangelism` (production, https://nuahn.baby) and `my-way-of-evangelism-preview`.
Databases: `my-way-of-evangelism` (2a60c9f6-2850-4db3-9df3-ac80f69adb00), `my-way-of-evangelism-preview` (9d5c6215-602b-4641-bea9-dca104a1c3ba). Account `17e900e2ac8567adf3e60c83fc64589e`.

## Standing release rules
1. Work on `claude/<name>` cut from the latest `origin/main`; merge main into the branch, re-run checks, merge only by pull request.
2. Deploy only a specific merged SHA from a clean checkout equal to `origin/main`. Record the SHA, confirm no newer deployment overwrote it, and confirm the live version before reporting.
3. Before any production change: export the D1 database and record the current Worker version id and D1 Time Travel bookmark.
4. Deploy to preview first and apply migrations there; run the acceptance checks; only then production.
5. Production only after: backup exists, preview checks passed, `d1 migrations list` checked, health checks pass afterwards; roll back on a failed health check.
6. Never delete production data. Do not change billing. Touch only the two Workers above, their two databases and two media buckets.
7. Stop and report on: a migration error, a new failing test, a failed health check, or main moving mid-deploy.

## Commands (run from a clean checkout of the exact SHA, with a Cloudflare API token that can edit Workers, D1 and R2)
```
pnpm install --frozen-lockfile && node --test tests/*.test.mjs   # expect exactly the 14 known failures
npx wrangler d1 migrations list DB --env preview --remote
npx wrangler d1 migrations apply DB --env preview --remote
npx wrangler deploy --env preview --keep-vars --var REQUIRE_EMAIL_VERIFICATION:false --var AUTH_BYPASS:false
# production, after preview checks pass
npx wrangler d1 export my-way-of-evangelism --remote --output backup-$(date +%F).sql
npx wrangler d1 migrations apply DB --remote
npx wrangler deploy --keep-vars --var AUTH_BYPASS:false
```
`REQUIRE_EMAIL_VERIFICATION:false` is for the preview only so test accounts can be created.
Rollback: `npx wrangler rollback --name my-way-of-evangelism` (version ids are in the backup notes).

## Why this cannot be run from the Claude cloud session
`wrangler deploy` uploads changed static files with a short-lived upload token sent in the `Authorization` header. The session's network proxy replaces that header with the stored API token for api.cloudflare.com, so the upload is rejected (401). Everything else (D1 export, migrations, reads) works there. Deploy from a normal machine, or restore GitHub Actions (the account's Actions are currently locked for billing).

## Config drift fixed
`wrangler.jsonc` vars had diverged from the deployed Workers (production PUBLIC_ORIGIN, EMAIL_FROM, OWNER_BOOTSTRAP_EMAIL). They now match the deployed values; a deploy from the old file would have reset them.
