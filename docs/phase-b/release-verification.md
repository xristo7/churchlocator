# Phase B release verification

The six Phase B branches are combined on `claude/phase-b-release`, starting from main `14e9949fa9a85a3ffa6f13fb63264fc42df11115`. Main includes the contributors' Spotlight dislike/follower updates and their decision to retain the standalone church profile. Both are preserved. The sole merge conflict was the Creator Studio script cache version, refreshed for the combined script.

## Validation

- Current main: 278 native tests, 264 pass, 14 fail.
- Combined release: 287 native tests, 273 pass, the identical 14 fail. No assertions, skips, or test files were weakened to obtain this result.
- `pnpm run check`: passed syntax checks and local packaging dry-run.
- `python3 tests/security-sql.test.py`: passed.
- The six committed Phase B browser regressions were run against the combined local Worker and local D1/R2 state, with separate creator/viewer accounts. No remote accounts or database writes were used.
- The security audit successfully reached the npm advisory API using the environment's HTTP proxy. It reports advisories for inherited `undici` 7.29.1; no lockfile/dependency changes are included in this release. No historical credential matches or current credential-pattern files were found. The audit is not green because of those advisories.

Local logs and screenshots: `/workspace/scratch/phase-b/release/`, with browser fixture output also under the package evidence directories in `/workspace/scratch/phase-b/`.

The first combined B4 browser attempt used an accumulated owner fixture with many churches. Creator Studio's pre-existing hub groups records by kind and only displays its first five; the new meditation was unavailable through that hub. The unchanged test passed with a separate owner fixture. This existing recent-work limitation remains an out-of-scope follow-up; it was not hidden by changing assertions. B6 also uses its own owner fixture.

## Deployment readiness

At preparation time the latest GitHub deployment job could not start: its annotation states that the account is locked due to a billing issue. The environment has no Cloudflare API token or Wrangler login configured for a direct deployment. The existing deployment workflow also requires a fully passing native suite and security audit, so its inherited failures remain blockers even if billing is restored.

Merging this release does not establish that it is live. A successful deployment must use the exact merged main SHA, verify main has not advanced immediately before release, inspect newer pending/running deployments, and confirm the active Cloudflare version before completion is reported. No force push, direct push to main, Cloudflare secret changes, remote database migrations, or deployment bypasses were used while preparing this release.

The release branch uses the Phase B `claude/` namespace because origin already has a branch named `codex`, preventing Git from creating `codex/phase-b-release`. The existing shared branch was not renamed or deleted.
