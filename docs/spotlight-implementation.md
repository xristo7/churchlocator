# Spotlight implementation

2026-10-06: implemented the plan in spotlight-feed-plan.md.

Card bodies open the assigned channel. Video CTAs open stable Spotlight content IDs
inside that channel; channel-only features open the channel. The full content viewer
uses the post's own media and preserves existing channel posts. Engagement is available
on both the Spotlight feed and full content page. The public homepage shows current
Spotlight discovery cards.

Likes, saves and follows use explicit server state. Saved and Following lists persist
across sessions; comments target the selected post. Shared post permalinks survive
app-shell navigation. Channel pages include follow and notification preference controls.

In-app notifications and optional watch reminders are delivered by a one-minute
production Cron Trigger. Persistent receipts prevent duplicate delivery on retries.
Work is bounded to batches of 500. Old posts are baselined before delivery, so deployment
does not announce them as new. Preview has no Cron Trigger. Email and device push are
not part of this implementation.

The user approved distributing the eight existing examples among published channels.
Migration 0014 preserves existing associations and makes these assignments:

| Channel | Posts |
| --- | --- |
| Harbor Worship Sessions | Grace Stories; Sermon on the Mount; About BibleProject |
| Strong Homes, Open Tables | Pastor Marcus; Story of the Bible; Kingdom of God |
| Everyday Faith Notes | River City Fellowship; What Is the Bible? |

Grace Stories and Pastor Marcus supplied no playable full video, only a Channels-list
URL. They remain discoverable as channel features until their actual videos are supplied.
The existing BibleProject video URLs are preserved. New video submissions require a
published channel and an HTTPS full-content URL.

Validation: SQLite-backed API tests cover persistent counts and member state, isolation,
comments, scheduled publication, notification preferences, read state, reminders and
duplicate prevention. A real local HTTP session check covers likes, bookmarks, comments,
follows and reminder scheduling/cancellation. Database security checks and the full
repository test suite are also run. Local fixtures are kept under ignored .wrangler;
test users and comments are never uploaded to production.
