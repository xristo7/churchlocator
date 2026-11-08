# B2 — Spotlight teasers

Status: Fixed.

Reproduced through the local creator studio: uploading an MP4 set its full-content URL to `/media/church-video/...`, but submission rejected that URL as not HTTPS. Code inspection and browser tests also found no excerpt-end enforcement or feed playback counting. The native watch page rejected the same local uploaded media path.

Changes accept only the existing, validated uploaded-video path in addition to HTTPS; preserve start/end fields and server automatic-preview defaults; seek to the selected start; stop at the selected end; pause inactive or background videos; record views with the existing per-tab playback key; and show the poster when a video fails. Uploaded-video CTAs now open their actual full content. No new teaser duration or trigger policy was invented.

Running-app evidence: `tests/e2e/b2-spotlight-teasers.e2e.mjs` registers local creator/viewer accounts, marks them verified in local D1, creates a channel, generates an MP4, uploads through the creator UI and publishes. The separate viewer tests that upload and two linked MP4 fixtures with excerpts 1–3s, 0–2s and 2–4s. Each pauses at its exact end; offscreen pause and sound controls are exercised. CTA clicks open the correct watch item and publisher; the uploaded full video plays. A fourth broken linked fixture shows its poster. Feed playback records a view; repeated calls with one playback key increment only once. Linked-media responses are browser fixtures with range support, not remote uploads. Evidence is in `/workspace/scratch/phase-b/b2/`.

Run with the locally seeded Worker, `BASE=http://127.0.0.1:8800`, `PLAYWRIGHT_PATH` pointing to Playwright if needed, and `PHASE_B_FIXTURE_DIR` pointing to a private scratch directory. The helper uses only local D1 and example.invalid accounts; FFmpeg and Chromium are required. Credentials are generated privately outside git and are not logged.

Tests: baseline 273 total / 257 pass / 16 fail; branch 274 total / 258 pass / the identical 16 fail. The added SQLite regression saves and edits an actual upload as full content and rejects an unrelated relative path. `pnpm run check` passed, including local packaging dry run. Latest integration base fetched and merged before completion.

Branch: `claude/b2-spotlight-teasers`. No PR, deployment or remote database operation.

Open question: client confirmation of teaser length and playback trigger. Out-of-scope: this does not validate a third-party video provider's availability; linked MP4 playback used controlled media responses. The 16 known baseline failures were not changed.
