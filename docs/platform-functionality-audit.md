# Platform functionality review — 6 September 2026

The current application is a working browser-local prototype, not a complete multi-user publishing system. This review covers the repository and the local preview on port 4173; it does not certify a deployed Cloudflare database or service.

## Verified locally

- Owner and creator workspaces use the same six collections: churches, meditation rooms, events, stores, channels and resources. Products are managed separately within Stores.
- Creation persists in browser storage. The public modules read these same collections on the same origin and browser profile.
- The owner can edit creator records. Edits remain visible to the original creator and public data readers, without changing the creator ID.
- Creator views filter records by the current local account. Another creator does not see those records in their management list. These are browser checks, not a security boundary.
- Church and channel verification fields are reserved for the owner in the creator editor. Creator edits preserve the existing verification decision.
- Products can be linked to a creator's own store, with inventory, price and Draft/Active/Archived status. The public product directory filters for Active products.
- Churches, channels and stores can supply external HTTPS broadcast links. This is not video hosting or camera broadcasting.
- Search, filtering, pagination, creation, editing and preview controls are implemented. The current shared workspace does not provide full deletion, account suspension, role assignment or per-entity permission administration.

The automated local lifecycle test covers all six collections through creator creation, owner editing, public data reads, reload, another creator account and separate browser storage. UI checks cover the admin theme menu, light/dark palettes and the meditation, events, channels and resources tables.

## What is not complete

- Real authentication: owner preview accepts a valid-looking email/password. Creator passwords are not stored or verified. Account identity is browser-controlled.
- Server-enforced tenant authorization and entity permissions: no trusted account/tenant membership system protects these local collections.
- Shared publication: different devices, browser profiles and origins do not share local storage. Creator content on localhost does not automatically appear on the live site.
- Complete API integration: owner church saves attempt an authenticated API sync. Church and event endpoints exist in the Worker, but the shared workspace's other save actions are local. The static server does not execute Worker APIs.
- Moderation workflow: verification is available for churches and channels, but there is no universal draft/submission/approval/publication workflow across all six modules. Unverified records can still appear in local public readers.
- Commerce and interactions: checkout records orders locally. Payment processing and cross-user messaging/delivery are not established by those UI controls.
- Resource delivery: source URLs can be recorded, but sample readers and media do not establish a complete upload, conversion, entitlement or protected download system. Some legacy sample resource formats also conflict with the editor's narrower format validation.

## Stores

Store profiles start empty; existing sample products are not store profiles. Create a store, then associate products through Manage products. No fake stores were added during this review.

## Changes in this review

- Both workspaces use the public application's Theme menu and colour palette.
- Sidebar surfaces and navigation use shared theme colours instead of fixed blue.
- Removed circular CSS colour definitions that invalidated dark surfaces, and replaced the inherited white admin table background with the shared surface colour.
- Corrected dark status/error colours and kept the Theme menu visible on small screens.
- Removed the prominent local-preview banner from both workspaces. Login and save messages still accurately describe local persistence.
- Clarified empty store lists and displayed creator ownership for meditation rooms.

## Work needed for a real shared platform

Implement authenticated accounts and sessions, server-side account/entity roles, persistent APIs for every collection, explicit publication and moderation states, and public queries that return eligible published records. Then connect every creator/owner action and user interaction to those APIs and verify across separate accounts and devices. Payments, protected resources and notification delivery each need their own complete integration and tests.
