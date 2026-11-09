# RhemaSphere status report, 9 Nov 2026

Source: client brief "Remansphere Developer Fixes" v03. Main is at the merge of PR #15 (code SHA before this report: 7f1a56e).

## Headline
- All code work for Phase A and Phase B is merged to `main`. Nothing from this work is live yet.
- Deployment is blocked by two things I cannot fix from here: GitHub Actions is locked for billing, and the cloud session's proxy breaks Wrangler's static-file upload (see docs/release-runbook.md). Backups were taken and the runbook has the exact commands.
- Phases C and D (below) are NOT finished. Items marked "not verified" were not run in a browser by me.

## Phase A (protect and recover the work): DONE in code
| Item | Result |
|---|---|
| Recover backend source that was only ever deployed by hand | Done. Meditation rooms API, Spotlight media and playback, routes, migrations recovered from the deployed Workers and proven by re-bundling and diffing against the deployed preview build. Remaining differences are main-only improvements. PR #13 |
| Land the preview snapshot | Done (PR #11) |
| Spotlight dislike and channel follower counts | Done and tested (PR #11, backend from deployed code in #13) |
| Church page decision | Kept the preview's standalone church profile; two tests rewritten to match |
| Do not lose live data | 2 custom meditation rooms are copied (not moved) into the current Meditation module by migration 0033; 3 reflections untouched. PR #14 |
| Config drift | Found: repo config would have reset production PUBLIC_ORIGIN, EMAIL_FROM and OWNER_BOOTSTRAP_EMAIL. Fixed to match what is deployed. PR #15 |
| Tests | 274 pass, 14 fail. The 14 are exactly the failures that already existed on the original main. No new failures. |

## Phase B (verify and fix, six packages): reviewed, GOOD, with caveats
I read each package's write-up and the combined verification (PR #12). Each package reproduced the problem before fixing it, added regression tests and a browser test run against a local copy with separate owner and viewer accounts, and reported its limits honestly (no assertions weakened).
| Brief item | Package | Verdict |
|---|---|---|
| 01 Shop in public nav | B1 | Fixed. Note: I kept the deployed routing for `/index.html` (opens the app) while bare `/` shows the landing page. |
| 13 Spotlight teasers | B2 | Fixed (start/end, pause offscreen, views, uploaded-video playback). Teaser length and trigger use the defaults you approved (8s muted, 60% visible). |
| 14 Resources | B3 | Fixed for free items. Paid purchase is not implemented; external PDF/EPUB hosting and video providers not tested. |
| 04.1 Meditation cover persistence | B4 | Fixed for cover and uploaded audio; only the timer style was run end to end. Known unfixed bug: switching room style does not rebuild the style fields. |
| 10 Event creation | B5 | Fixed (connected creators use the studio, past start dates rejected, drafts not public). Paid-ticket payments not tested. |
| 06.1, 06.3 Church hero and schedule | B6 | Fixed (autoplay pause on hover/focus, owner gatherings saved and shown). |
Caveats: the security audit reports advisories on an inherited `undici` dependency (not changed); Creator Studio's hub shows only the first five records per kind.

## Not done
| Brief item | Status |
|---|---|
| 02/03/15/16 Watch page unification (Ask, Download, From this series, subscriber counts, live Related/Report) | Not built. Defaults approved: Ask = private question to the publisher. |
| 07/08/09 Channel and podcast consistency (Plan Your Day, Words of Wisdom, Gloryyy routing) | Not reproduced or fixed. |
| 05.1 Shared meditation timeline | Christo's session code is in main with tests; needs a two-device test on a real deployment. |
| 05.2/05.3 Notes panel, pause request, secure chat, bookmarks | Partly present; not verified. |
| 04.2 Meditation audio incl. microphone | SoundCloud and MP3 upload exist; microphone broadcast code exists; needs a test with owner MFA and the live provider. |
| 06.2 Church hero phone-video upload | Not built. |
| 12 Venue rentals; creator and church store pages | Not built / partial. |
| 11 Native broadcast hosting | Partial; needs provider setup and an owner test. |
| E1 Full QA on a deployed preview; E2 deploy | Blocked on deployment. |

## What is needed from you
1. Deploy: run the commands in docs/release-runbook.md from a normal machine, or restore GitHub Actions (billing lock). Backups taken today (live and preview databases exported; Worker version ids and Time Travel bookmarks recorded) are held in the cloud session only; Cloudflare keeps the Time Travel bookmarks for 30 days: live `000009d4-00000000-0000511d-7f5f88428457fafb1119c78573c3ee9f`, preview `00000230-00000000-0000511e-a9c49ee9a9de4bb7ea791accf7655760`. Previous Worker versions: production `bbcc5242-da88-4555-b383-ee99885670dd`, preview `ff55a6e4-c6c7-4e3e-8d18-f1593352ee66`.
2. Migration 0033 was already applied to the preview database (additive, safe). Production still needs 0031, 0032 and 0033, which `migrations apply` will run in order.
3. Human-only checks: owner MFA and live-provider tests for microphone and broadcast; client acceptance.
