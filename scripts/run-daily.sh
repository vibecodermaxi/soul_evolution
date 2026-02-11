#!/usr/bin/env bash
set -euo pipefail

# Absolute path to the repo root
REPO_DIR="/Users/puranjaysingh/Documents/Claude2026/soul-evolution"
cd "$REPO_DIR"

echo "=== Soul Evolution — $(date) ==="

# Load environment variables
if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

# Run the orchestrator (local mode — no SOUL_REPO_URL)
npx tsx src/index.ts --pieces 6

# Find the latest day directory for the commit message
LATEST_DAY=$(ls -1d journal/days/day-* 2>/dev/null | sort -V | tail -1 | xargs basename)

# Commit and push
git add -A
git commit -m "day: ${LATEST_DAY:-unknown} — autonomous evolution" || echo "Nothing to commit"
git push origin main

echo "=== Done — $(date) ==="
