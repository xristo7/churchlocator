# B5 — Owner event creation

Status: Fixed.

Reproduced in the running Events page: a connected creator's Host an Event button opened a second, legacy organizer signup. A separate API check accepted a newly created event entirely in the past. The draft/publication browser test also showed a workspace draft in the public church-event API.

Connected accounts now use the existing server-backed creator studio; viewers receive the existing creator-permission message, and anonymous users are sent to sign-in. Event edit links select the managed record rather than a new blank form. Server writes reject new/rescheduled past starts while allowing metadata edits to historical events. Public event listing omits unpublished workspace entities while preserving legacy records without a workspace entity. Legacy static/demo helpers remain for disconnected contexts; no church-page implementation was replaced.

Running-app evidence: `tests/e2e/b5-events-owner.e2e.mjs` creates a local owned church, clicks Host an Event as the creator, fills the studio, saves a draft (not publicly listed), publishes, reloads through an edit link, edits and republishes. A separate viewer finds the edited event on Events and the correct standalone church profile. A real local free reservation for two seats makes a one-seat capacity update return 409. Missing title and past starts return 400; a viewer create attempt returns 403 with an error. Screenshots/logs: `/workspace/scratch/phase-b/b5/`.

Tests: baseline 273 / 257 pass / 16 fail; branch 275 / 259 pass / identical 16 fail. Added date validation and real-SQLite public publication filtering regressions. `pnpm run check` passed. Latest integration base fetched and merged before completion.

Branch: `claude/b5-events-owner-flow`. No PR, deployment or remote database action.

Open questions/risks: legacy static host-dashboard helpers still exist; this package routes connected creation/editing into the canonical studio rather than redesigning those helpers. The public church profile's pending implementation decision remains untouched. No paid-ticket payment-provider flow was tested.
