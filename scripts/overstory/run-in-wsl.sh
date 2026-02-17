#!/usr/bin/env bash
# run-in-wsl.sh — Bridge script to invoke Overstory CLI from Windows via WSL Ubuntu
# Usage: bash scripts/overstory/run-in-wsl.sh <overstory-command> [args...]
# Example: bash scripts/overstory/run-in-wsl.sh doctor
#          bash scripts/overstory/run-in-wsl.sh status
#          bash scripts/overstory/run-in-wsl.sh dashboard

set -euo pipefail

# Translate Windows repo root to WSL path
WIN_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# Convert /d/... to /mnt/d/... for WSL
WSL_ROOT="$(echo "$WIN_ROOT" | sed 's|^/\([a-zA-Z]\)/|/mnt/\L\1/|')"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <overstory-command> [args...]"
  echo ""
  echo "Commands:"
  echo "  init              Initialize .overstory/ in the project"
  echo "  doctor            Run health checks (9 modules)"
  echo "  status            Show all active agents"
  echo "  dashboard         Live TUI dashboard (ANSI)"
  echo "  sling <id> ...    Spawn a worker agent"
  echo "  mail check        Surface new messages from agents"
  echo "  mail send ...     Send a message to an agent"
  echo "  merge --all       Merge all completed branches"
  echo "  costs --live      Real-time token usage"
  echo "  clean --all       Nuclear cleanup"
  echo ""
  echo "Proxy: All args are forwarded to Overstory engine inside WSL Ubuntu."
  exit 1
fi

# Forward all arguments to the cloned Overstory engine inside WSL
# Uses bun run on the local clone instead of bunx (avoids npm registry dependency)
exec wsl -d Ubuntu -- bash -c "
  export PATH=\"\$HOME/.bun/bin:\$PATH\"
  cd '$WSL_ROOT' && bun run .overstory/engine/src/index.ts $*
"
