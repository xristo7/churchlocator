# B6 — Church owner hero and schedule

Status: Fixed on the existing standalone church profile.

Reproduced in the running app: a gathering entered in Creator Studio was dropped by server validation. The public normalizer also discarded owner-created object rows, accepting only legacy schedule pairs. Automatic hero advancement already worked, but leaving hover restarted it while the carousel still had keyboard focus. These findings were reproduced before changing their respective code paths.

Changes: preserve and validate up to twelve owner gatherings, accept both owner objects and legacy pairs in the standalone profile, guard the autoplay scheduler against both hover and focus, and prevent automatic advancement from moving keyboard focus. The church implementation was not switched. The profile asset version was refreshed.

Running-app evidence: `tests/e2e/b6-church-owner.e2e.mjs` creates a local owned church, uses the actual creator form to upload and publish a hero image and gathering, reloads the editor, changes the time and republishes. A separate viewer waits 7.8 seconds and asserts automatic advancement, then separately asserts hover and focus pauses. The public Schedule tab shows the edited time. An authenticated owner API creates a linked event and the viewer finds it in the correct profile's Events tab; the full event creation UI was tested separately in B5. Screenshots and logs are in `/workspace/scratch/phase-b/b6/`. Reduced-motion browser emulation confirms autoplay continues. Code inspection found reduced-transition CSS for tabs/cards, but no carousel promise to stop autoplay; no new policy was invented.

Tests: baseline 273 / 257 pass / 16 fail; branch 275 / 259 pass / the identical 16 fail. Added `church-schedule-owner.test.mjs` (validation and legacy compatibility) and `church-hero-timer.test.mjs` (scheduler guards and automatic interaction semantics), plus the browser regression and local fixture helper. `pnpm run check` passed, including its configured local packaging dry-run. Latest integration base was fetched and merged before completion.

Branch: `claude/b6-church-owner-hero-schedule`.

Files: `src/trusted-platform.js` validates/preserves gatherings; `public/app.js` normalizes gatherings and fixes autoplay scheduling; `public/church-profile.html` refreshes the script version; the tests above provide regressions; this report records the result.

Open questions/risks: decide whether reduced-motion should also stop carousel autoplay. Schedule persistence uses platform entities consumed by the current standalone page; this package does not project it into the alternative implementation's legacy services table. The operator must decide which church implementation to retain before that integration is attempted. The two known church implementation-conflict tests remain unchanged and failing.

Out of scope: phone-video upload, switching church implementations, microphone service validation, PRs, deployment and remote database operations. No changes to these were made.
