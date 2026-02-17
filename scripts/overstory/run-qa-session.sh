#!/usr/bin/env bash
# run-qa-session.sh — End-to-end orchestrated dogfood QA session via Overstory
# Usage: bash scripts/overstory/run-qa-session.sh [--headed] [--skip-capture]
#
# This script:
# 1. Starts the Overstory coordinator with watchdog
# 2. Slings the qa-capture agent to build + record + extract artifacts
# 3. Coordinator auto-dispatches scouts, reviewer, builder via mail polling
# 4. Prints dashboard URL for monitoring
#
# Requires: WSL Ubuntu with Bun + tmux installed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WSL_ROOT="$(echo "$REPO_ROOT" | sed 's|^/\([a-zA-Z]\)/|/mnt/\L\1/|')"

SKIP_CAPTURE=false
HEADED=false
for arg in "$@"; do
  case $arg in
    --skip-capture) SKIP_CAPTURE=true ;;
    --headed) HEADED=true ;;
  esac
done

# Helper: run overstory command in WSL
overstory() {
  wsl -d Ubuntu -- bash -c "
    export PATH=\"\$HOME/.bun/bin:\$PATH\"
    cd '$WSL_ROOT' && bunx overstory $*
  "
}

echo "=== NodeBench Dogfood QA Session (Overstory) ==="
echo "Repo: $REPO_ROOT"
echo "WSL:  $WSL_ROOT"
echo ""

# Step 1: Start coordinator with watchdog
echo "[1/4] Starting coordinator with watchdog..."
overstory coordinator start --watchdog --background 2>/dev/null || true
echo "  Coordinator started."

# Step 2: Sling capture agent (unless --skip-capture)
if [ "$SKIP_CAPTURE" = false ]; then
  TASK_ID="capture-$(date +%Y%m%d-%H%M%S)"
  echo "[2/4] Slinging qa-capture agent ($TASK_ID)..."
  overstory sling "$TASK_ID" \
    --capability qa-capture \
    --name capture-alpha \
    --files "public/dogfood/*,test-results/*,.tmp/*"
  echo "  qa-capture agent dispatched."
else
  echo "[2/4] Skipping capture (--skip-capture flag)."
fi

# Step 3: Wait for capture, then auto-dispatch scouts
echo "[3/4] Coordinator will auto-dispatch scouts when capture completes."
echo "  Mail routing:"
echo "    qa-capture → @all: capture-complete"
echo "    coordinator → 6x qa-scout: route batches"
echo "    qa-scouts → qa-reviewer: stability data"
echo "    qa-reviewer → coordinator: triage"
echo "    coordinator → qa-builder: fix assignments (if p0/p1)"
echo ""

# Step 4: Print monitoring commands
echo "[4/4] Monitoring:"
echo "  Dashboard:  bash scripts/overstory/run-in-wsl.sh dashboard"
echo "  Status:     bash scripts/overstory/run-in-wsl.sh status"
echo "  Mail:       bash scripts/overstory/run-in-wsl.sh mail check --inject"
echo "  Costs:      bash scripts/overstory/run-in-wsl.sh costs --live"
echo "  Logs:       bash scripts/overstory/run-in-wsl.sh logs --follow"
echo ""
echo "=== QA session launched. Use dashboard to monitor progress. ==="

# Route definitions for scout batching (36 routes, 6 batches of 6)
# Coordinator reads these from walkthrough.json and distributes via mail
ROUTES=(
  "/ /research /research/overview /research/signals /research/briefing /research/deals"
  "/research/changelog /documents /spreadsheets /calendar /agents /roadmap"
  "/timeline /showcase /footnotes /signals /benchmarks /funding"
  "/activity /analytics/hitl /analytics/components /analytics/recommendations /cost /industry"
  "/for-you /recommendations /marketplace /github /pr-suggestions /linkedin"
  "/mcp/ledger /dogfood /public /settings /command-palette /assistant"
)

echo ""
echo "Route batches for scouts (${#ROUTES[@]} batches):"
for i in "${!ROUTES[@]}"; do
  echo "  Batch $((i+1)): ${ROUTES[$i]}"
done
