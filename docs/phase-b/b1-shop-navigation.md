# B1 — Shop navigation

Status: Fixed.

The landing-page markup already contained Shop in the requested order. The Worker instead mapped `/`, `/index.html` and `/home` to the member shell, hiding that public navigation. A read-only GET of the public preview confirmed it serves the original public landing page. The fix maps those three aliases to the existing landing asset; `/app.html` remains the explicit member shell. No homepage sections or styles changed.

Running-app evidence: `tests/e2e/b1-shop-navigation.e2e.mjs` clicks Shop at 1366px and through the 390px mobile menu. Both reach the community store with four seeded products; its product titles match the embedded app store. Screenshots and command output are in `/workspace/scratch/phase-b/b1/` in the validation workspace. All mutations and seeded data were local.

Regression: `public-home-route.test.mjs` verifies the actual asset requested for all aliases and preserves the explicit member-shell query.

Tests: before 273 total / 257 pass / 16 fail; after 274 total / 258 pass / the identical 16 fail. `pnpm run check` passed (syntax checks and local packaging dry run). The existing church implementation conflict and all other baseline failures were left unchanged.

Branch: `claude/b1-shop-nav-verify`, based on `claude/stage-a-integration` at `4a0b01c`. Latest base fetched and merged before completion. No PR, deployment or remote database operation.

Open questions: none for B1. Out-of-scope findings: none beyond the baseline failures documented in the brief.
