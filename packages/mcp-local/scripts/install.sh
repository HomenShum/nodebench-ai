#!/usr/bin/env bash
# NodeBench MCP installer
# Usage: curl -sL https://nodebenchai.com/install.sh | bash

set -euo pipefail

if [ -t 1 ]; then
  B="\033[1m"
  G="\033[32m"
  Y="\033[33m"
  C="\033[36m"
  R="\033[31m"
  X="\033[0m"
else
  B="" G="" Y="" C="" R="" X=""
fi

echo -e "${B}NodeBench MCP Installer${X}"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo -e "${R}ERROR${X}: Node.js not found. Install Node.js >= 18 from https://nodejs.org"
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/^v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo -e "${R}ERROR${X}: Node.js >= 18 required (found $(node -v))"
  exit 1
fi
echo -e "  ${G}OK${X}  Node.js $(node -v)"

if ! command -v npm >/dev/null 2>&1; then
  echo -e "${R}ERROR${X}: npm not found"
  exit 1
fi
echo -e "  ${G}OK${X}  npm $(npm -v)"

PACKAGE_NAME="nodebench-mcp"
SERVER_KEY="nodebench"
PACKAGE_ARGS=(" -y")

echo ""
echo -e "${B}Choose an install lane:${X}"
echo "  1) core      - nodebench-mcp (9 visible tools, workflow-first lane)"
echo "  2) power     - nodebench-mcp-power (founder + recon + packets)"
echo "  3) admin     - nodebench-mcp-admin (profiling + dashboards + eval)"
echo "  4) founder   - nodebench-mcp --preset founder (compatibility preset)"
echo "  5) full      - nodebench-mcp --preset full (warehouse mode)"
echo ""
read -r -p "Choose [1-5, default=1]: " CHOICE </dev/tty 2>/dev/null || CHOICE="1"

PACKAGE_ARGS=("-y")
EXTRA_ARGS=()

case "${CHOICE:-1}" in
  2)
    PACKAGE_NAME="nodebench-mcp-power"
    SERVER_KEY="nodebench-power"
    ;;
  3)
    PACKAGE_NAME="nodebench-mcp-admin"
    SERVER_KEY="nodebench-admin"
    ;;
  4)
    PACKAGE_NAME="nodebench-mcp"
    SERVER_KEY="nodebench-founder"
    EXTRA_ARGS=("--preset" "founder")
    ;;
  5)
    PACKAGE_NAME="nodebench-mcp"
    SERVER_KEY="nodebench-full"
    EXTRA_ARGS=("--preset" "full")
    ;;
  *)
    PACKAGE_NAME="nodebench-mcp"
    SERVER_KEY="nodebench"
    ;;
esac

echo ""
echo -e "${B}Installing ${PACKAGE_NAME}@latest...${X}"
if npm install -g "${PACKAGE_NAME}@latest" >/dev/null 2>&1; then
  echo -e "  ${G}OK${X}  Installed globally"
else
  echo -e "  ${Y}WARN${X} Global install failed. The config will still use npx."
fi

NPM_ROOT=$(npm root -g 2>/dev/null || echo "")
RULES_SOURCE=""
if [ -n "$NPM_ROOT" ]; then
  if [ -d "$NPM_ROOT/$PACKAGE_NAME/rules" ]; then
    RULES_SOURCE="$NPM_ROOT/$PACKAGE_NAME/rules"
  elif [ -d "$NPM_ROOT/$PACKAGE_NAME/node_modules/nodebench-mcp/rules" ]; then
    RULES_SOURCE="$NPM_ROOT/$PACKAGE_NAME/node_modules/nodebench-mcp/rules"
  elif [ -d "$NPM_ROOT/nodebench-mcp/rules" ]; then
    RULES_SOURCE="$NPM_ROOT/nodebench-mcp/rules"
  fi
fi

CLAUDE_RULES_DIR="$HOME/.claude/rules"
mkdir -p "$CLAUDE_RULES_DIR"
echo ""
if [ -n "$RULES_SOURCE" ] && [ -d "$RULES_SOURCE" ]; then
  echo -e "${B}Installing Claude rules...${X}"
  INSTALLED=0
  for rule in "$RULES_SOURCE"/nodebench-*.md; do
    [ -f "$rule" ] || continue
    cp "$rule" "$CLAUDE_RULES_DIR/$(basename "$rule")"
    INSTALLED=$((INSTALLED + 1))
  done
  echo -e "  ${G}OK${X}  Installed ${INSTALLED} rules into ${CLAUDE_RULES_DIR}"
else
  echo -e "${Y}WARN${X} Could not find packaged rules. Run sync-configs from the MCP after install if needed."
fi

ENV_JSON="{}"
ENV_PAIRS=()
for key in GEMINI_API_KEY OPENAI_API_KEY GITHUB_TOKEN; do
  if [ -n "${!key:-}" ]; then
    ENV_PAIRS+=("\"$key\": \"${!key}\"")
  fi
done
if [ "${#ENV_PAIRS[@]}" -gt 0 ]; then
  ENV_JSON="{ $(IFS=', '; echo "${ENV_PAIRS[*]}") }"
fi

ARGS_JSON=$(node -e "console.log(JSON.stringify(process.argv.slice(1)))" "${PACKAGE_ARGS[@]}" "$PACKAGE_NAME" "${EXTRA_ARGS[@]}")

cat > .mcp.json <<MCPEOF
{
  "mcpServers": {
    "${SERVER_KEY}": {
      "command": "npx",
      "args": ${ARGS_JSON},
      "env": ${ENV_JSON}
    }
  }
}
MCPEOF

if [ -f ".gitignore" ] && ! grep -qF ".mcp.json" .gitignore; then
  {
    echo ""
    echo "# NodeBench MCP config"
    echo ".mcp.json"
  } >> .gitignore
fi

echo ""
echo -e "${B}Running health check...${X}"
if npx "${PACKAGE_ARGS[@]}" "$PACKAGE_NAME" "${EXTRA_ARGS[@]}" --health >/dev/null 2>&1; then
  echo -e "  ${G}OK${X}  Health check passed"
else
  echo -e "  ${Y}WARN${X} Health check skipped or failed. Run it manually after install."
fi

echo ""
echo -e "${B}${G}Installed.${X}"
echo -e "  Package: ${C}${PACKAGE_NAME}${X}"
if [ "${#EXTRA_ARGS[@]}" -gt 0 ]; then
  echo -e "  Args:    ${C}${EXTRA_ARGS[*]}${X}"
fi
echo -e "  Server:  ${C}${SERVER_KEY}${X}"
echo ""
echo -e "${B}Try these first:${X}"
echo -e "  ${C}investigate({ topic: 'Anthropic' })${X}"
echo -e "  ${C}compare({ entities: ['Anthropic', 'OpenAI'] })${X}"
echo -e "  ${C}discover_tools({ query: 'visual QA for a Vite app' })${X}"
echo -e "  ${C}load_toolset({ toolset: 'ui_ux_dive' })${X}"
echo ""
