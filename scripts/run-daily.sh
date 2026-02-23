#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root: use REPO_DIR env var, or derive from script location
REPO_DIR="${REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$REPO_DIR"

echo "=== Soul Evolution — $(date) ==="

# Load .env if present (local dev); Railway injects env vars natively
if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

# Randomly pick 3 or 4 pieces per day
PIECES=$(( RANDOM % 2 + 3 ))
echo "Today's pieces: $PIECES"

# Run the orchestrator
# In remote mode (SOUL_REPO_URL set), it handles git clone/commit/push itself.
# Use compiled JS if available, fall back to tsx for local dev.
if [[ -f dist/index.js ]]; then
  node dist/index.js --pieces "$PIECES"
else
  npx tsx src/index.ts --pieces "$PIECES"
fi

# Local mode only: commit and push if SOUL_REPO_URL is not set
# (remote mode handles git operations internally)
if [[ -z "${SOUL_REPO_URL:-}" ]]; then
  LATEST_DAY=$(ls -1d journal/days/day-* 2>/dev/null | sort -V | tail -1 | xargs basename)
  git add -A
  git commit -m "day: ${LATEST_DAY:-unknown} — autonomous evolution" || echo "Nothing to commit"
  git push origin main
fi

echo "=== Done — $(date) ==="
