# Development and preview verification

- The user has authorized deploying each completed application edit to the existing Cloudflare preview Worker so they can test it. Run relevant checks, deploy to `my-way-of-evangelism-preview`, verify the live result, and return the verified preview URL before finishing a coding session.
- This standing instruction permits preview deployments of the current working changes; the merged-main requirement in `docs/release-runbook.md` still applies to production releases.
- Preserve deployed preview variables with `--keep-vars`. Preserve existing remote secrets, especially `AUTH_ENCRYPTION_KEY`; never upload the local development key or reset preview data with development seeds.
- Use the configured `preview` environment and verify that D1 and R2 bindings target preview resources. Never deploy to production without an explicit production request.
- If credentials, network policy or deployment fail, finish independent checks and report the exact blocker. A local build or an existing preview URL is not evidence of a successful deployment.
