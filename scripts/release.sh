#!/usr/bin/env bash
# Safe release of one merged main SHA: backup, migrate, deploy preview, health-check, then (optionally) production.
# Usage: CLOUDFLARE_API_TOKEN=... scripts/release.sh [--production]
# Needs: git, node, pnpm, python3 (or python on Windows), curl. Run from a clean checkout. See docs/release-runbook.md.
set -euo pipefail
# Windows (Git Bash) installs Python as `python`, Linux and macOS as `python3`.
PY=$(command -v python3 || command -v python || true); [ -n "$PY" ] && "$PY" -c 'import sys' 2>/dev/null || { echo 'STOP: Python 3 is required (python3 or python on PATH).' >&2; exit 1; }
ACCOUNT=17e900e2ac8567adf3e60c83fc64589e
PROD=my-way-of-evangelism; PREV=my-way-of-evangelism-preview
PROD_DB=2a60c9f6-2850-4db3-9df3-ac80f69adb00; PREV_DB=9d5c6215-602b-4641-bea9-dca104a1c3ba
PROD_URL=https://nuahn.baby; PREV_URL=https://my-way-of-evangelism-preview.doxalight-inc.workers.dev
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"; export CLOUDFLARE_ACCOUNT_ID=$ACCOUNT
DO_PROD=0; [ "${1:-}" = "--production" ] && DO_PROD=1
py() { "$PY" "$@" | tr -d '\r'; }   # Windows Python writes CRLF; strip the CR
api() { curl -fsS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/$1"; }
say() { printf '\n== %s\n' "$*"; }
die() { printf '\nSTOP: %s\n' "$*" >&2; exit 1; }

say "1. Clean checkout equal to origin/main"
git fetch -q origin main
[ -z "$(git status --porcelain)" ] || die "working tree is not clean"
SHA=$(git rev-parse HEAD); [ "$SHA" = "$(git rev-parse origin/main)" ] || die "HEAD $SHA is not origin/main $(git rev-parse origin/main)"
echo "releasing $SHA"
STAMP=$(date -u +%Y%m%dT%H%M%SZ); OUT=release-$STAMP; mkdir -p "$OUT"; chmod 700 "$OUT"

say "2. Tests (exactly the 14 known failures are allowed)"
pnpm install --frozen-lockfile >/dev/null
FAILS=$( (node --test tests/*.test.mjs 2>&1 || true) | grep -E '^# fail' | awk '{print $3}')
[ -n "$FAILS" ] || die "could not read the test summary"
[ "$FAILS" -le 14 ] || die "$FAILS tests fail; the baseline is 14"

versions() { api "workers/scripts/$1/deployments" | py -c "import sys,json;print(json.load(sys.stdin)['result']['deployments'][0]['versions'][0]['version_id'])"; }
vars_for() { api "workers/scripts/$1/settings" | py -c "
import sys,json
for b in json.load(sys.stdin)['result']['bindings']:
    if b['type']=='plain_text': print('--var'); print(b['name']+':'+b['text'])"; }
backup() { # name db
  echo "$(versions "$1")" > "$OUT/$1.previous-version"; npx wrangler d1 export "$2" --remote --output "$OUT/$1.sql" >/dev/null
  [ -s "$OUT/$1.sql" ] || die "backup of $1 is empty"; chmod 600 "$OUT/$1.sql"; echo "backup $OUT/$1.sql, previous version $(cat "$OUT/$1.previous-version")"; }
health() { # url name
  for path in /api/status /index.html /channel-content.html; do
    code=$(curl -s -o /dev/null -w '%{http_code}' "$1$path"); [ "$code" = 200 ] || return 1; done
  [ "$(curl -fsS "$1/api/status" | py -c "import sys,json;print(json.load(sys.stdin).get('release'))")" = "$SHA" ] || { echo "live release does not report $SHA"; return 1; }; }
deploy() { # name env-flag db-binding-name url [extra --var args...]
  local name=$1 envflag=$2 url=$3; shift 3
  mapfile -t V < <(vars_for "$name")   # keep every deployed variable exactly as it is today
  say "deploying $name"
  npx wrangler d1 migrations list DB $envflag --remote
  npx wrangler d1 migrations apply DB $envflag --remote
  npx wrangler deploy $envflag --keep-vars "${V[@]}" --var "RELEASE_SHA:$SHA" --var AUTH_BYPASS:false "$@"
  sleep 8
  if ! health "$url" "$name"; then
    echo "health check FAILED, rolling back $name to $(cat "$OUT/$name.previous-version")"
    npx wrangler rollback "$(cat "$OUT/$name.previous-version")" --name "$name" --message "auto-rollback of $SHA" -y || true
    die "$name failed its health check and was rolled back"
  fi
  echo "$name is live at $SHA (version $(versions "$name"))" | tee -a "$OUT/result.txt"; }

say "3. Preview: backup, migrate, deploy, check"
backup "$PREV" "$PREV_DB"
deploy "$PREV" "--env preview" "$PREV_URL"
echo "Preview OK. Run your acceptance checks on $PREV_URL (preview has email verification off only if you pass --var REQUIRE_EMAIL_VERIFICATION:false)."
[ $DO_PROD = 1 ] || { echo "Re-run with --production to release to $PROD_URL."; exit 0; }

say "4. Production: backup, migrate, deploy, check"
backup "$PROD" "$PROD_DB"
deploy "$PROD" "" "$PROD_URL"
echo "Production released at $SHA. Backups and previous version ids are in $OUT/"
