# B4 — Meditation cover persistence and uploaded audio

Status: Fixed for the cover/audio scope.

Reproduced in the running creator studio: the style-specific section replaced the generic section and omitted its cover upload control (zero controls found). Added the existing shared image field to all five style sections. The room backdrop also ignored saved covers in favor of stylesheet defaults; it now applies a saved cover consistently and restores the existing atmosphere default when no cover exists. Session synchronization and microphone code were not changed.

Running-app evidence: `tests/e2e/b4-meditation-cover.e2e.mjs` uploads an image and generated MP3, publishes a timer room, verifies both files return 200, reopens the room through the creator hub, edits and republishes, and confirms both media URLs remain intact. A separate viewer loads the actual lobby image (nonzero natural width), enters the room, sees that cover in the computed backdrop and plays the uploaded MP3 (media time advances). Screenshots and logs: `/workspace/scratch/phase-b/b4/`.

The helper test `meditation-cover.test.mjs` checks all five style renderers expose exactly one cover field and retain both uploaded URLs. Only the timer style's complete owner-to-viewer flow was exercised in the browser.

Tests: baseline 273 / 257 pass / 16 fail; branch 274 / 258 pass / identical 16 fail. `pnpm run check` passed. Latest integration base fetched and merged before completion. No PR, deployment, remote mutation or microphone/provider test.

Branch: `claude/b4-meditation-cover`.

Out-of-scope finding: changing the room template in the generic design step does not rebuild the style-specific controls; required fields for the new style can be absent, blocking publication with no highlighted missing field. The cover regression uses the unchanged default timer style. This style-switching issue was not fixed because B4 is limited to cover and uploaded-audio handling. Existing remote rooms or lost media files were not repaired; owners must supply a cover where none is saved.
