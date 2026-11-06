# Shared meditation sessions and reflection saves

An invitation carries both the room and session ID through the member shell. The member who starts a session controls its play/pause state, audio selection, timeline and scripture index. Other members follow through authenticated polling every 1.5 seconds; they must explicitly join audio. Volume and muting remain personal. Session state is stored in D1 with revision checks; a stale write is rejected rather than overwriting a newer host action. A newly created session updates the outer member-shell URL so refreshing preserves the session.

Reflections use the authenticated private-record collection for both saving and display. The form prevents overlapping saves, displays progress, keeps failed drafts, and refreshes private history when opened. Reflections are never sent with shared session state.

## Database prerequisite

Apply migration `0028_meditation_sessions.sql` before releasing the Worker. Use the existing database migration scripts against the intended preview/production database; development and test fixtures must remain local. New session controls require a published meditation room and an authenticated member.

## Verification

- `node --test tests/meditation-session.test.mjs`: real SQLite tests for membership, host authorization, room scope, published visibility, revision conflicts and input validation.
- `python3 tests/security-sql.test.py`: SQL security constraints.
- `npm run check`: syntax checks, Tailwind generation and Worker dry-run build. Tailwind rewrites a generated tracked CSS file; inspect that output separately.
- Local browser regression: start `npm run dev -- --local --ip 127.0.0.1 --port 8787` with preview migrations applied, then run `node tests/e2e/meditation-sync.e2e.mjs`. Playwright and Chromium must be available; set `PLAYWRIGHT_PATH` and `CHROME` if needed. The test creates ephemeral members and a published fixture using local D1 only, and removes them afterward.
- Repeat with `MEDITATION_E2E_MEDIA=1` to exercise uploaded audio playback and pause; this mode also requires FFmpeg to generate a temporary MP3.

Both browser modes exercise independent browser profiles, invitation routing, audio joining, host play/pause, scripture updates, refresh, single-request reflection saves, cross-profile persistence for the same user, privacy and failed-save draft retention. Third-party SoundCloud playback was not validated against its live service.

At base commit `eb8525925ae4415a656ec7e57e7ca1abca03c245`, the full suite has 14 existing source/UI assertion failures. The dependency advisory scan also reports `undici` without dependency changes in this branch. These remain release blockers for required checks.

## Release workflow

Fetch main immediately before merging. Merge advanced main into the `codex/` branch, repeat affected checks, push, and wait for required checks on that head. Merge only through a PR. Deploy a specific merged SHA from a clean main matching origin/main. Re-fetch after the merge, inspect concurrent/newer deployments, and confirm the actual live SHA before reporting a deployment complete.
