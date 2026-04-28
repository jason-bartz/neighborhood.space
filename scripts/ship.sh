#!/usr/bin/env bash
# ship.sh — full-stack deploy + smoke test.
# Sequencing matters: rules/indexes/storage first, then functions, then hosting,
# so users never load a frontend that calls a function or writes to a collection
# that isn't ready for it.
#
# Usage: npm run ship   (or: bash scripts/ship.sh)
set -euo pipefail
cd "$(dirname "$0")/.."

say()  { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m? %s\033[0m\n' "$*"; }
fail() { printf '\033[31m✗ %s\033[0m\n' "$*"; exit 1; }

# 1. Pre-flight: confirm Firebase project before deploying anything.
say "Pre-flight"
firebase use | grep -qi "gnf-app" || fail "Wrong Firebase project — run 'firebase use gnf-app-9d7e3'"
ok "$(firebase use | head -1)"

# 2. Build SPA (prebuild hook auto-syncs src/styles → public/assets/css).
say "Build SPA"
npm run build
ok "Build complete"

# 3. Deploy backend gates BEFORE anything that writes to new collections.
say "Deploy firestore rules + indexes + storage"
firebase deploy --only firestore:rules,firestore:indexes,storage
ok "Backend gates live"

# 4. Functions next so the frontend never calls a function that isn't deployed.
say "Deploy functions"
firebase deploy --only functions
ok "Functions live"

# 5. Hosting last.
say "Deploy hosting"
firebase deploy --only hosting
ok "Hosting live"

# 6. Smoke-test live URLs. curl is the source of truth — the deploy succeeding
#    doesn't mean a route renders. Non-200 prints in yellow rather than failing
#    the script, since CDN propagation can lag a few seconds.
say "Smoke test"
URLS=(
  "https://www.goodneighbor.fund/"
  "https://www.goodneighbor.fund/portal"
  "https://www.goodneighbor.fund/upstate"
  "https://www.goodneighbor.fund/wny"
  "https://www.goodneighbor.fund/denver"
  "https://www.goodneighbor.fund/capital-region"
  "https://www.goodneighbor.fund/start-a-chapter"
  "https://www.goodneighbor.fund/chapter-handbook"
  "https://www.goodneighbor.fund/forms/lp-onboarding"
  "https://www.goodneighbor.fund/forms/microgrant-awardee"
)
for url in "${URLS[@]}"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" || echo "000")
  if [ "$code" = "200" ]; then
    ok "$url ($code)"
  else
    warn "$url ($code)"
  fi
done

say "Done."
echo "If anything looked off, tail recent function errors:"
echo "  firebase functions:log --lines 30"
