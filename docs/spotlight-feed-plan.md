# Spotlight feed: verified findings and implementation plan

Audited 2026-10-06 against the live site and repository commit 648a16f.

## Findings

- Card navigation is broken relative to the requested flow. Clicking the first live card heading leaves the browser on `spotlight.html`. The card handler only toggles video playback; it never navigates to its publishing channel (`public/spotlight.js:144`).
- All eight posts returned by the live `/api/spotlight/feed` have a null `channelEntityId`. The first two CTAs point to the general Channels list, the church feature points to the directory, and five example CTAs point to YouTube. These destinations cannot deliver channel-specific navigation.
- Like, save, and comment are implemented in the frontend and database-backed API. The first live post already has two likes, one save, and two comments. This disproves a blanket claim that those controls have no implementation; authenticated persistence still needs end-to-end testing in an isolated environment.
- Like/save updates are optimistic but do not update `item.liked`/`item.saved`, restore counts after failures, or use authoritative server counts. Re-rendering and repeated clicks can produce inconsistent displays (`public/spotlight.js:103`).
- Comments open the currently active item rather than explicitly selecting the clicked item. Async comment responses can overwrite the panel after switching posts; posting does not refresh the card's displayed count (`public/spotlight.js:130,157`).
- Saved states exist, but there is no dedicated saved-Spotlight collection endpoint or member view.
- Share has native-share and clipboard code. Clipboard absence can still show a successful-copy toast. Links use the current feed URL and a hash, while the app shell does not forward that hash into Spotlight. Specific-post sharing is therefore incomplete.
- Following is keyed by creator handle in local storage and by Spotlight item in the database, rather than by member and channel. Errors are swallowed and follows do not synchronize reliably across devices.
- No Spotlight publication notifications, notification inbox, or watch reminders were found in the server, migrations, or feed code.
- Channel content currently renders three fixed sample posts and a fixed YouTube video (`public/channel-content.js:3-12`). Updating links alone would still show the wrong full video.
- The five existing Spotlight tests pass, but principally assert source structure. They do not test the requested discovery and engagement journey.

## Implementation sequence

### 1. Establish real channel and content destinations

- Require a published submitting channel for all publicly discoverable Spotlight entries, including owner-created features. Require a specific published content record for video CTAs.
- Add stable channel-content IDs, titles, media URLs, publication state, and channel ownership relationships. Replace sample-post indexing and fixed video playback with the selected record.
- Produce a reviewable mapping for the eight existing posts. Resolve publishing channels and original content from verified records; leave unresolved entries for owner correction rather than inventing an association.
- Validate those relationships when submitting, editing, moderating, and serving public posts. Support valid internal channel routes in URL validation.

### 2. Repair navigation throughout the app

- Card body and creator identity open the publishing channel, with keyboard access. Action controls keep their own behavior without triggering card navigation.
- Video CTA opens the exact full content within its channel; channel-only features open that channel.
- Preserve channel ID, content ID, and Spotlight post ID through app-shell navigation, direct links, browser Back, and mobile layouts. Fix the shell's message handler, which currently drops content-specific navigation parameters.
- Add a stable post permalink that works for posts beyond the feed's first 100 items and handles removed or expired content clearly.

### 3. Make engagement reliable and retrievable

- Reuse existing likes, saves, and comments storage. Authenticate from the server session, return authoritative counts and member state, prevent duplicate in-flight mutations, and restore state on failures.
- Target comments by clicked post ID, ignore stale responses, honor closed comments, and refresh counts after posting.
- Add a member Saved Spotlight view and paginated endpoint; restore bookmarks after refresh and across devices.
- Share a canonical post permalink through native share or a verified clipboard fallback. Handle cancellation and copy failure honestly.
- Restrict public comment reads and engagement to available published items, preserving member and tenant authorization.

### 4. Add channel follows and publication notifications

- Introduce member/channel follows with unique relationships, explicit follow/unfollow actions, notification preferences, and consistent state across Spotlight and channel pages.
- Add an in-app notification inbox with unread counts, read state, and links to the exact new post/content.
- Create durable publication events when approved content actually becomes public. Include scheduled publication, retries, and a uniqueness constraint per recipient/post/event to prevent duplicate notifications on edits or repeated moderation.
- Process delivery in bounded batches; respect unsubscribe preferences and avoid treating first deployment or legacy data backfill as a new publication.
- Email or push delivery is a separate extension requiring channel preferences and delivery-provider configuration. Start with in-app notifications.

### 5. Optional watch reminders

- Add a member-selected reminder time, cancellation, and server-stored schedule. Deliver through the in-app inbox using the same reliable delivery mechanism.
- Test time zones, expired content, repeat processing, and reminder cancellation. Keep this optional phase behind the core navigation and engagement work.

## Acceptance and release checks

- Every published card opens its actual channel; every video CTA plays its actual full content.
- Like/unlike and save/unsave persist after reload and a second session with correct counts. Failed requests restore the UI; rapid clicks do not double-apply changes.
- Comments attach to the intended post on desktop and mobile, including switching cards while responses are pending.
- Saved posts are retrievable. Shared links open the same post from the standalone feed and app shell.
- Follow/unfollow persists across devices. Followers receive one notification on immediate or scheduled publication, with no duplicates on edits or retries.
- Logged-out users receive a working sign-in flow; unpublished content and another member's saved items remain inaccessible.
- Verify the full flow in isolated preview with test accounts. Do not create production likes, comments, follows, or notifications during the audit.
- Apply additive migrations, verify production bindings and migration status, deploy reviewed changes, then check the public navigation and media playback live.

## Scope of this audit

The audit used read-only live API requests, browser inspection, a card click, repository inspection, and the existing Spotlight test suite. It did not write production engagement records or test signed-in mutations. The findings distinguish confirmed failures from implementation that needs authenticated verification. No application changes or deployment were performed for this audit.
