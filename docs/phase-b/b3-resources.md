# B3 — Resources

Status: Fixed.

Local reproduction found that the creator's material URL did not become an embed for supported video providers; list-page library actions wrote only browser memory; paid list actions attempted to synthesize a marketplace product despite purchasing being unavailable; and the bookmark callback used an expired event target after awaiting its request. Trusted external document hosts also needed a scoped reader connection policy.

Changes reuse the existing resource library API, add a user-scoped list lookup, persist list-page saves, send paid-list actions to the actual locked resource detail, recognize supported video embed URLs in the creator's material field, capture the bookmark button before the asynchronous request, and allow only configured material hosts in reader connections. No purchasing or access bypass was added.

Running-app evidence: `tests/e2e/b3-resources.e2e.mjs` publishes free video, free PDF and paid PDF records as the local creator, verifies viewer search and real dropdown filters, library and bookmark persistence after reload, comments after reload, a rendered one-page PDF canvas, paid material withheld, a 402 response to unpaid library access, and no request for the paid file. It also uploads a cover and publishes a video through the actual creator studio, reloads and verifies delivery. The PDF is a browser-served fixture; a supported video embed iframe is verified, not external-provider playback. Screenshots and logs: `/workspace/scratch/phase-b/b3/`.

Run with the locally seeded Worker and `--var RESOURCE_HOSTS:phase-b-material.example.invalid`; the fixture host is intercepted only inside the browser. Set `BASE=http://127.0.0.1:8800`, `PLAYWRIGHT_PATH` if needed and a private `PHASE_B_FIXTURE_DIR`. The local helper generates example.invalid accounts with random private credentials. No remote mutations.

Tests: baseline 273 / 257 pass / 16 fail; branch 275 / 259 pass / identical 16 fail. New SQLite coverage checks material delivery, per-user saved lists, deduplication and unpaid access; response-policy coverage restricts document hosts. `pnpm run check` passed. Latest integration base fetched and merged before completion.

Branch: `claude/b3-resources-e2e`. No PR or deployment.

Open decisions: resource purchasing is not implemented; choose/configure real trusted document hosting before validating external PDF/EPUB delivery. External video-provider playback and EPUB rendering were not tested. Out-of-scope: the existing 16 baseline failures and church implementation conflict are unchanged.
