# Application security audit — 15 September 2026

## Assessment

**High residual risk. The application is not ready to handle banking workloads, unrestricted tenant administration, payment-card data, or highly sensitive personal information.** Serious exploitable access-control defects were found and patched. Other features still use a prototype architecture that must be replaced before they can provide trustworthy multi-user security.

No software can be certified “101% secure” or “hack proof” by a repository scan. “Military grade” is not a defined application-security certification. This work is an engineering audit, not independent penetration testing, PCI DSS validation, FIPS validation, a bank certification, or an assertion that every OWASP requirement passes. OWASP ASVS 5.0 provides the requirements framework; a complete Level 3 assessment would require additional architecture, infrastructure and operational evidence. [OWASP ASVS](https://owasp.org/projects/asvs)

## Scope and evidence

Repository: `churchlocator`, branch `codex`. The audit inventoried application scripts, HTML pages, styles, Worker and legacy Pages functions, SQL schema/migrations, dependency locks, deployment configuration, workflow, and tracked historical text objects. Generated builds, private tools, node_modules, recovery exports and unrelated logs were excluded from source inventory. First-party modules were reviewed for authentication, authorization, injection sinks, browser storage, payments, downloads, messaging, and request boundaries. Vendored bundles were provenance/hash inventoried rather than line-by-line independently audited.

The inventory in `scan-results.json` records file hashes and line-numbered patterns for HTML sinks, dynamic execution, browser storage, cross-window messaging and known credential formats. These are review leads, not automatic findings. The npm bulk advisory lookup covers both lockfile packages and vendored Lucide/Tailwind versions. The historical credential scan only detects its explicit formats; zero matches does not prove that credentials never leaked. It neither prints nor exports secret contents.

Testing included negative authentication tests, request parsing and CSRF tests, session hash/revocation checks, nested JavaScript/HTML injection payloads, paid-admission forgery, real SQLite constraints and concurrency, and 78 Cloudflare preview integration assertions using two synthetic accounts. Those assertions cover all 30 HTML pages, session isolation, wrong passwords, hardened cookies, admin rejection, payment rejection and event capacity. Synthetic preview records were removed after testing. Live production checks are read-only. Real users' private bookings were not retrieved, and no production password guessing, destructive exploitation, load testing or external attack was performed.

The local Cloudflare runtime crashed with a Windows native access violation. The deployment dry run succeeded, and remote preview provided the real Worker/D1 integration evidence. Browser inspection checked homepage/profile rendering and runtime warnings; HTTP page checks are not full interactive verification of every modal, theme, viewport or third-party player.

Cloudflare account IAM, billing/account recovery, MFA, WAF/Bot Management settings, DNS ownership, TLS minimum version, backup restore drills, vendor contracts, log access/retention, private environment-secret contents and breach history were not independently assessed. No Semgrep, CodeQL or comprehensive authenticated external DAST campaign was run. Historical logs may contain information from before the logging fix; retention/access review remains necessary.

## Threat model

Actors include anonymous attackers, registered seekers, creators, malicious tenants, compromised administrator credentials, hostile uploaded content and compromised dependencies. Assets include credentials/sessions, prayer and visitor information, contact details, bookings, creator content, administrative privileges, ticket inventory and payment/entitlement state.

The trusted boundary is the Cloudflare Worker plus D1 and server-held configuration. HTML, localStorage, sessionStorage, hidden buttons, client role flags, supplied user IDs, contact emails and claimed prices are untrusted. A frontend filter is not tenant authorization. A card reading “paid,” a generated receipt, or a QR image is not payment verification or admission authorization.

## Findings and remediation status

Severity is a contextual engineering assessment, not a calculated CVSS score. “Fixed” refers to the specific defect tested; it does not imply that its entire security category is solved.

| ID | Severity | Finding | Status and evidence |
|---|---|---|---|
| S01 | Critical | Production authentication bypass accepted arbitrary passwords for existing accounts and could create temporary creator identities. Frontend fallback fabricated sessions. | Fixed: bypass code removed from Worker and auth client, stale `AUTH_BYPASS=true` ignored, temporary/bypass-hash users denied. Wrong-password and stale-setting tests; preview authenticated with real credentials. |
| S02 | High | Booking retrieval used a caller-supplied email without authentication, allowing private data access. | Fixed: require validated session and bind `user_id` to the trusted session identity. Two-account preview test proves that changing email/userId and even listing another user as contact email cannot grant access. |
| S03 | High | Legacy Pages administrator function failed open when the admin token was missing; wildcard CORS increased exposure. | Fixed: all seven legacy functions delegate to the same hardened Worker. Missing/wrong credentials deny access, no wildcard access-control origin. |
| S04 | High | Anonymous livestream activation could modify another church's stream settings. | Fixed: requires server-held administrator bearer authorization. Tenant membership is not implemented, so ordinary tenant activation is deliberately unavailable through this route. |
| S05 | High | Event registration accepted client payment/quantity claims and could race past capacity. Browser independently fabricated tickets. | Fixed: authoritative D1 event price, safe whole quantity 1–20, paid admission rejected pending provider integration, guarded insert and database triggers reserve stock atomically. Browser now awaits server registration and does not persist new registration PII locally. Concurrent SQLite/preview tests pass. External ticket QR service removed. |
| S06 | High | Checkout collected raw card number/CVV on a site without a verified payment integration; local order/donation success could be fabricated. | Contained: card input fields and fake order/receipt paths removed or disabled. Checkout and donations cannot process payments. Real payment security and entitlement fulfillment remain open under S16. |
| S07 | High | Untrusted values inserted into quoted inline JavaScript attributes could escape HTML encoding and execute code; other dynamic image/text attributes were raw. | Fixed at reviewed sinks: encode nested JavaScript and HTML contexts separately; escape gallery/speaker/queue and record attributes; encode route IDs and validate dynamic event links. Hostile quotes, backslashes, tags and Unicode separators tested. Many legacy HTML sinks and inline handlers remain, so this is not a universal XSS assurance. |
| S08 | Medium | Embedded video destinations and resource download destinations could accept unsafe protocols/hosts. | Fixed at reviewed sinks: HTTPS exact video-host allowlist; deny credentialed/unknown embed URLs. Download data URLs restricted to bounded base64 document MIME types, rejecting HTML/SVG/JavaScript destinations. This does not verify file contents or eliminate malware risk. |
| S09 | High | Password attacks and unbounded input were not adequately constrained; declared Content-Length was trusted. | Improved: actual streamed 64 KiB limit, JSON-only object inputs, depth/field/string/control-character/URL checks, edge write/auth throttles that fail closed when bindings are missing. Distributed/per-account controls remain open under S15. |
| S10 | Medium | Browser mutations lacked Origin/Fetch-Metadata checks and consistent security headers. | Improved: reject foreign-Origin/cross-site mutations; JSON media-type requirement, SameSite cookies, HSTS/nosniff/frame protections/CSP on APIs and static assets. CSP still permits inline scripts: S14 remains open. |
| S11 | High | Raw bearer session tokens were stored in D1; long-lived and bypass-era sessions remained valid. | Fixed: new v2 HttpOnly/Secure/SameSite cookie, random token only in cookie, SHA-256 token digest stored in D1, 24-hour expiry, invalid expiry rejected, logout deletion tested. Migration deletes old raw-token sessions; previous cookies are never accepted. Identity-wide revocation and recovery remain open under S13. |
| S12 | High | Mutable external runtime scripts and an installed sharp dependency with a known high-severity advisory expanded supply-chain risk. | Improved: official versioned Lucide/Tailwind bundles hosted locally with SHA-256 provenance; Wrangler pinned to 4.131.1 with sharp 0.35.4, both lockfiles updated; known-advisory lookup now clean. Workflow actions pinned to commit SHAs and checks added before deployment. This is a point-in-time result, not assurance against future advisories. [Sharp advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) |
| S13 | High | Identity lifecycle lacks administrator MFA, verified email, password reset/recovery, per-user session management and sufficient password hashing work factor. | Open. New password minimum is 15 characters (maximum 128); existing accounts remain compatible. Current PBKDF2-HMAC-SHA256 is 100,000 iterations, below OWASP's 600,000 recommendation. Move identity to a maintained provider with MFA/passkeys, or implement versioned KDF migration with runtime benchmarking; never merely change the constant and invalidate all existing hashes. [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) |
| S14 | High | Platform/tenant roles and publishing authority are predominantly browser-local; CSP permits inline scripts and substantial local personal data remains. | Open. Owner passwordless login is blocked, but there is no trusted owner-session UI or server tenant membership model. Creator self-registration is not administrator authority. Browser-local data can be modified by its user and read by same-origin scripts or another account sharing the browser. Sensitive notes/messages/ride information need protected server storage and account isolation. |
| S15 | Medium | Anti-abuse controls are per-IP and per-location, without verified-account throttling, global account protection, application spam prevention or durable quotas. | Open. Native edge limits reduce abuse but are permissive/eventually consistent and cannot guarantee global limits; shared-IP users can also be throttled. Add per-account credential defenses, Turnstile for public submissions, anomaly detection and durable quotas as justified. [Cloudflare rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) |
| S16 | High | Orders, paid resources and access/entitlements lack authoritative server payment and fulfillment state. Uploaded/downloaded documents lack quarantine and content inspection. | Open. Keep payment/card paths disabled. Use provider-hosted payment fields/checkout, verified signed webhooks, idempotent settlement, server-computed price/currency/inventory and tenant-bound entitlements. Store files outside public assets; scan/quarantine uploads and issue authorization-checked short-lived downloads. |
| S17 | Medium | Operational security and data governance are not established by this repository. | Open/unverified. Define least-privilege Cloudflare/GitHub credentials, MFA, secret rotation, deployment approvals, database restores, retention/deletion, protected logs, incident response and alerting. Error logs now avoid DB error text and request bodies, but earlier logs and any bypass-era compromise must be investigated. |

### Tenant and local-data architecture (S14)

`public/admin-model.js`, `creator-model.js`, `creator-data.js`, `admin-workspace.js`, `platform-modules.js`, `meditation.js` and `app.js` contain browser-side content collections, owner/host decisions and member UI flags. Local creator filters help the interface display the right records but do not establish trusted ownership. Channels, stores, resources, meditation rooms, messages and many event/admin workflows are not backed by comprehensive authenticated tenant CRUD APIs. Church sync calls from the UI do not supply the administrator bearer authorization and therefore cannot be assumed to persist privileged changes.

This is principally a missing security/functional boundary, not proof that changing localStorage writes another user's production database. A user can change that browser's records and identity display. An attacker cannot be said to compromise all server tenants merely because the local prototype allows edits. Nevertheless, the intended owner → tenant → public-platform system is not trustworthy or complete today.

Required design: server tables for users, tenants, memberships, roles, entity ownership and publication state; deny-by-default permissions on every read/write/export; trusted platform owner role assigned outside public registration; audit trails for privileged actions; tenant-scoped queries even when IDs are known; server moderation before public publication; checks for every user/entity relationship. Add adversarial tests with at least two tenants and multiple roles. Eliminate sensitive shared browser caches and migrate each content module to these APIs before declaring it functional for real tenants.

The CSP allows `unsafe-inline` because existing pages rely on inline handlers/styles. It blocks many external scripts and unsafe frame destinations but is not a strict script-execution defense. Replace inline handlers with event listeners, remove inline executable blocks or apply per-response nonces/hashes, and then remove `unsafe-inline`. External HTTPS images/media are broadly permitted and still reveal visitor requests to remote hosts. The location lookup now uses same-origin coarse Cloudflare metadata rather than third-party IP APIs. The Tailwind bundle is pinned/local but its runtime compiler remains unsuitable as a long-term production build pipeline.

## API authorization inventory after fixes

All mutations pass Origin/Fetch-Metadata checks and edge throttling before route work. JSON bodies are bounded and validated. Requests without Origin remain supported for authenticated CLI/API clients; CSRF protection also relies on JSON-only mutations and SameSite cookies, not Origin alone. No cross-origin access-control allow-origin header is issued.

| Route | Trusted authorization / data boundary | Residual concern |
|---|---|---|
| GET `/api/status` | Public, no private records; bypass always reported false | Operational metadata should remain minimal |
| GET `/api/location` | Requester's own coarse edge city/country, no-store, no IP forwarded | Not a reliable identity/location proof |
| GET `/api/churches` | Public verified directory, parameter-bound filters | Public business contact details intentional; moderation required |
| `/api/admin/churches` | Server-configured administrator bearer required for every supported method | No individual owner identity/MFA or granular roles |
| GET `/api/events` | Public listings, parameter-bound queries | Needs publication/moderation policy |
| POST `/api/events` | Administrator bearer required | No tenant-scoped event editor; inventory update permissions need future role design |
| POST `/api/church-application` | Public submission, persisted as unverified | Needs email verification, anti-spam and moderation |
| POST `/api/livestream-activation` | Administrator bearer required | Tenant membership not yet implemented |
| POST `/api/visitor`, `/api/prayer` | Public submission; not anonymously readable through these routes | Abuse controls, ownership, retention and consent required |
| POST `/api/event-register` | Authoritative existing free event, guarded capacity and zero payment | Guest admission allowed intentionally; replay/attendee verification policy needed |
| POST `/api/auth/register`, `/api/creator/register` | Real password hashing; server decides creator flag; session created | Email verification, recovery, KDF upgrade and abuse defenses |
| POST `/api/auth/login` | Real credential verification; generic invalid-credential response | MFA and distributed/per-account attack protection |
| GET `/api/auth/session` | Hashed v2 token lookup, finite expiry, temporary identities denied | User-wide revocation and expired-session housekeeping |
| POST `/api/auth/logout` | Deletes presented session digest and expires cookie | Network failure cannot guarantee server revocation |
| POST `/api/creator/upgrade` | Authenticated user upgrades own creator account | Creator role does not confer entity/administrator ownership |
| POST `/api/services/book` | Inquiry tied to validated session user ID when signed in; supplied userId ignored | Guest inquiries allowed; service/provider catalog is not authoritative fulfillment |
| GET `/api/services/bookings` | Authenticated, query bound to session user ID; email query ignored | Tenant-provider view and server status updates not implemented |

## Other reviewed categories

- SQL injection: reviewed Worker queries bind request values rather than interpolating them into SQL. No verified SQL injection was found at those reviewed paths. Administrative integrity validation and future queries still need review.
- Server-side request forgery, command execution, unsafe deserialization: no arbitrary outbound server fetch, shell execution or object-code deserialization was identified in the current Worker. This is not a claim about Cloudflare internals or future upload/proxy features.
- Cross-window messaging: member shell checks source frame and exact origin; outgoing navigation is now restricted to same-origin HTTP(S). Same-origin scripts remain inside the trust boundary.
- Session cryptography: cryptographic randomness and Web Crypto are used; JavaScript timing comparisons are not a certified constant-time primitive or validated cryptographic module. Never describe these changes as FIPS-certified.
- Privacy: prayers, visitor goals, rides, notes and messages can contain highly sensitive information. Hosting encryption does not replace access control, data minimization, retention, consent, deletion, log governance and recovery procedures.
- Availability: bounded input and edge throttles reduce some abuse. DDoS resilience, billing limits, floods from distributed clients, abuse of read routes and disaster recovery were not load-tested or certified.
- Supply chain/deployment: pinned dependencies and action SHAs narrow drift. Branch protection, protected deployment environments, action permission policy and account-scoped tokens remain external settings to verify. Security scan fails closed on advisory-service errors, reported advisories and matching historical credential formats; review/rotation is necessary if a pattern is discovered.

## Verification and release

- Node suite: 114 tests passed, including authentication and new exploit regression checks.
- SQLite suite: 3 tests passed, including eight concurrent attempts against two-ticket capacity.
- Preview integration: 78 checks passed; synthetic records removed. Evidence: `preview-verification.json`.
- Production: 103 read-only checks passed, including all 30 HTML pages, anonymous private/admin denial, security headers and vendor digests. Evidence: `production-verification.json`.
- Syntax checks: all 37 first-party scripts in src/public/functions/tools passed; Git whitespace check passed.
- Advisory lookup: 93 package names including vendors; zero reported advisory packages at scan time. This does not include unregistered binaries or future advisories.
- Credential formats: zero matches in scanned source and 1,267 tracked historical objects, subject to the detector limitations above.
- Deployment dry run: passed using Wrangler 4.131.1. D1 migration 0004 successfully applied in preview after correcting trigger syntax/LF compatibility; `.gitattributes` preserves LF for migrations.
- Production migration 0004 applied and Worker version `143b3095-8ba6-4d2d-bc57-d854b7e71128` deployed. Read-only verification is recorded in `production-verification.json`. Do not restore bypass-era sessions or roll back to authentication-bypass code.

Behavior changes: real passwords are required; old sessions are invalidated; fake owner login is unavailable pending a trusted owner identity implementation; unverified paid checkout/donations/paid event admission are unavailable; arbitrary video embeds and executable attachment destinations are rejected; registration/inquiry success requires server persistence. These are intentional security boundaries, not proof that the disabled feature is complete.

## Priority plan and acceptance gates

1. **Incident review now:** because production bypass existed, treat account impersonation as possible exposure. Review access/deployment history and relevant logs through authorized channels; rotate exposed administrative credentials, expire sessions, investigate affected data and follow the incident-response process. This audit establishes the defect, not evidence that an attack occurred.
2. **Before tenant launch:** implement server tenant membership, role/ownership checks and publication/moderation for each entity. Test two-tenant cross-access denials for reads, writes, attachments, exports and all admin operations. Replace browser-local sensitive workflows.
3. **Before privileged access:** implement maintained identity with administrator MFA/passkeys, recovery, verified email, role assignment, session controls and auditable privileged actions. Upgrade password storage with compatible versioned migration.
4. **Before taking money or serving paid files:** integrate provider-hosted payments and trusted webhook settlement/entitlements. Complete the applicable payment-security assessment; quarantine and inspect uploads; protect downloads on the server.
5. **Before handling sensitive workloads:** strict CSP, sensitive-cache removal, durable abuse defenses, least-privilege platform credentials, tested restores, retention/deletion and monitored incident response. Re-audit changed architecture and commission an independent authenticated penetration test.

Release acceptance is evidence-based: defined requirements, verified controls, documented exceptions and an accountable owner for each remaining risk. There is no meaningful percentage that replaces these gates.

Supporting guidance: [Cloudflare Worker best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), and the OWASP sources cited above.
