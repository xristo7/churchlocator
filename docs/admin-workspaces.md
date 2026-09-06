# Owner and tenant workspaces

## Entry points

- owner-dashboard.html: platform-wide collections, location coverage and church/channel verification.
- admin.html: redirects to the owner dashboard, preserving the query and hash.
- creator-workspace.html: account-first onboarding and the tenant's own records.
- The member app's Creator Hub opens the standalone creator workspace, avoiding nested navigation.

Both dashboards use the same responsive layout, theme tokens, module adapters, accessible dialog
editor, search, filters, sorting, pagination, validation and save feedback. The six primary modules
are churches, meditation, channels, events, stores and resources. Product management is nested under
Stores rather than treated as another account type.

## Data and workflow

1. Create/sign into the local demo account.
2. Choose any of the six creation paths. A church/organization is not required.
3. Review/create records in their module. Personal events can be independent of a church.
4. Save locally and use Preview to review the member-facing result.

Churches reuse MWE; events reuse the existing event collection; channels/products/resources reuse
FaithLinkModules. Meditation uses mwe.meditation.rooms.v1; storefronts use mwe.storefronts.v1.
The creator view filters records by createdBy and omits platform verification/premium controls.
Old sample records are not automatically assigned to a tenant.

Storefronts are separate from products. Products can reference storeId; tenant-created products
must reference an owned storefront. Resources support an actual material URL and preserve existing
uploaded attachment fields. Meditation edits preserve existing audio-track configuration.

Churches, channels and stores can supply an HTTPS broadcast URL and switch their live state on/off.
The Live directory uses these records without inventing viewer counts. The broadcast page supports
YouTube/Vimeo embeds and a provider-link fallback; storefronts display a store's active products.

## Important limitations

This is still a local preview, not production-ready authentication or tenancy.

- Demo passwords are neither stored nor verified.
- Browser storage and client-side record filtering are not a security boundary.
- Owner access retains existing demo authentication. No new production permissions are granted.
- Only owner church edits retain the existing API synchronization attempt; failures are explicitly
  shown as local-only saves. Other module data has no new server synchronization.
- Video is externally hosted. No camera ingestion, stream-key issuance, transcoding or realtime
  provider-status verification is implemented.
- A live flag indicates creator configuration, not an independently verified provider broadcast.
- Team roles, secure uploads, checkout/payment enforcement, audit logs and durable production
  publishing need authenticated server APIs and ownership checks before deployment.
- Data saved at 127.0.0.1 is separate from data saved at localhost; use one origin consistently.

## Validation

Run node --test tests/*.test.mjs for adapter, persistence, ownership-filter, validation,
store/product-link and broadcast-state tests. Tests do not contact live services or mutate accounts.
