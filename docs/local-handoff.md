# Local hand-off: finish the release from the owner's computer

You are Claude Code running on the owner's Windows computer in `C:\Users\xrist\churchlocator-claude`.
The cloud session could not deploy (its network blocks Wrangler's static-file upload). You can. The owner wants this
finished with as little input from them as possible. Work through the list below yourself and ask only where marked.

## Rules (already agreed with the owner)
- Work from a clean checkout of `origin/main`; merge only through pull requests on `claude/<name>` branches.
- Release one exact merged SHA. Record it, check no newer deployment overwrote it, confirm the live SHA before reporting.
- Back up before every production change. Never delete production data. No billing changes. Touch only the two
  `my-way-of-evangelism` Workers, their two D1 databases and two media buckets.
- Stop and tell the owner if a migration errors, a new test fails, a health check fails, or main moves mid-release.
- Never print or store secrets. Database backups (`release-*/`) contain user data and are git-ignored; never commit them.

## Steps
1. `git checkout main && git pull`. Note the SHA. Run `rm -f node_modules` if it is a stray file, then `pnpm install --frozen-lockfile`.
2. Run `node --test tests/*.test.mjs`. Exactly 14 known failures are allowed (listed in `docs/status-report-2026-11-09.md` and the PR descriptions). Any other failure: stop.
3. Run `scripts/release.sh` (preview only). It signs in through the browser: tell the owner "click Allow in the browser window" and wait.
   It backs up preview, applies migrations (preview already has 0033 to 0034; 0035 is new), deploys, checks health and the release SHA, and rolls back automatically on failure.
4. Check preview yourself with a browser (Playwright is acceptable) on https://my-way-of-evangelism-preview.doxalight-inc.workers.dev:
   - Home, Churches, Channels, Events, Shop, Watch Live, Spotlight, Resources load.
   - Open a channel post (a native post such as Words of Wisdom): player, Like, Save, Ask (signed in only), series tab, comments.
   - Open a live church broadcast: Subscribe with count, Like, Dislike, Ask, Report, More videos filters, chat.
   - Church owner: upload a short phone video in the hero Video slide, publish, confirm the public profile plays it.
   Use clearly labelled test accounts and delete the test data afterwards. Preview has email verification ON; if you cannot create an account, say so instead of weakening it.
5. **Ask the owner once:** "Preview checks passed (list). Release to production now?" Do not continue without a yes.
6. `scripts/release.sh --production`. It backs up production first, lists and applies migrations (production needs 0031, 0032, 0033, 0034, 0035; all additive or non-destructive), deploys preserving every deployed variable, health-checks `https://nuahn.baby` including the live release SHA, and rolls back automatically on failure.
7. Confirm: `https://nuahn.baby/api/status` shows `release` equal to the SHA; two live custom meditation rooms now appear in Meditation; the three reflections still exist (read-only check).
8. Report to the owner: SHA, versions before and after (also in `release-*/`), migrations applied, checks run, anything skipped.
9. Remind the owner to delete the Cloudflare API tokens they created for this and to keep the `release-*/` folder private.

## Cannot be done by an agent (tell the owner plainly, do not fake)
- Owner MFA test of live broadcast hosting and microphone with the live provider (needs their authenticator app and a second device).
- Client acceptance of the Remansphere brief.
