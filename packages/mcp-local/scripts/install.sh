#!/usr/bin/env bash
# NodeBench MCP — One-liner installer
# Usage: curl -sL https://nodebenchai.com/install.sh | bash
#   or:  bash packages/mcp-local/scripts/install.sh

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────
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

echo -e "${B}NodeBench MCP — Installer${X}"
echo ""

# ── Prerequisites ───────────────────────────────────────────────────────
# Check Node.js
if ! command -v node &>/dev/null; then
  echo -e "${R}ERROR${X}: Node.js not found. Install Node.js >= 18: https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${R}ERROR${X}: Node.js >= 18 required (found v$(node -v))"
  exit 1
fi
echo -e "  ${G}OK${X}  Node.js $(node -v)"

# Check npm
if ! command -v npm &>/dev/null; then
  echo -e "${R}ERROR${X}: npm not found"
  exit 1
fi
echo -e "  ${G}OK${X}  npm $(npm -v)"

# ── Detect user info ────────────────────────────────────────────────────
USER_EMAIL=$(git config user.email 2>/dev/null || echo "")
if [ -n "$USER_EMAIL" ]; then
  echo -e "  ${G}OK${X}  Git email: ${C}${USER_EMAIL}${X}"
fi

# ── Install nodebench-mcp globally ──────────────────────────────────────
echo ""
echo -e "${B}Installing nodebench-mcp...${X}"
npm install -g nodebench-mcp@latest 2>/dev/null || {
  echo -e "${Y}WARN${X}: Global install failed, will use npx instead"
}

# ── Determine nodebench-mcp location ────────────────────────────────────
NODEBENCH_PATH=""
if command -v nodebench-mcp &>/dev/null; then
  NODEBENCH_PATH=$(which nodebench-mcp)
  echo -e "  ${G}OK${X}  Installed: ${NODEBENCH_PATH}"
else
  echo -e "  ${G}OK${X}  Will use: npx -y nodebench-mcp"
fi

# ── Find rules directory ────────────────────────────────────────────────
RULES_SOURCE=""
if [ -n "$NODEBENCH_PATH" ]; then
  # Global install — rules are in the package
  PKG_DIR=$(dirname "$(dirname "$NODEBENCH_PATH")")/lib/node_modules/nodebench-mcp
  if [ -d "$PKG_DIR/rules" ]; then
    RULES_SOURCE="$PKG_DIR/rules"
  fi
fi

# Fallback: try npm root
if [ -z "$RULES_SOURCE" ]; then
  NPM_ROOT=$(npm root -g 2>/dev/null || echo "")
  if [ -d "$NPM_ROOT/nodebench-mcp/rules" ]; then
    RULES_SOURCE="$NPM_ROOT/nodebench-mcp/rules"
  fi
fi

# Fallback: npx cache
if [ -z "$RULES_SOURCE" ]; then
  # Run npx once to ensure package is cached, then find it
  npx -y nodebench-mcp --help >/dev/null 2>&1 || true
  NPX_CACHE=$(find "$HOME/.npm/_npx" -name "nodebench-mcp" -type d 2>/dev/null | head -1)
  if [ -n "$NPX_CACHE" ] && [ -d "$NPX_CACHE/rules" ]; then
    RULES_SOURCE="$NPX_CACHE/rules"
  fi
fi

# ── Install rules to ~/.claude/rules/ ───────────────────────────────────
echo ""
CLAUDE_RULES_DIR="$HOME/.claude/rules"
mkdir -p "$CLAUDE_RULES_DIR"

RULES_INSTALLED=0
if [ -n "$RULES_SOURCE" ] && [ -d "$RULES_SOURCE" ]; then
  echo -e "${B}Installing rules to ${CLAUDE_RULES_DIR}/${X}"
  for rule in "$RULES_SOURCE"/nodebench-*.md; do
    [ -f "$rule" ] || continue
    BASENAME=$(basename "$rule")
    TARGET="$CLAUDE_RULES_DIR/$BASENAME"
    # Don't overwrite if user's version is newer
    if [ -f "$TARGET" ] && [ "$TARGET" -nt "$rule" ]; then
      echo -e "  ${Y}SKIP${X} $BASENAME (user version is newer)"
    else
      cp "$rule" "$TARGET"
      echo -e "  ${G}OK${X}   $BASENAME"
      RULES_INSTALLED=$((RULES_INSTALLED + 1))
    fi
  done
  echo -e "  Installed ${G}${RULES_INSTALLED}${X} rules"
else
  echo -e "${Y}WARN${X}: Could not find rules directory. Run ${C}nodebench-mcp --sync-configs${X} after install to copy rules."
fi

# ── Write .mcp.json ─────────────────────────────────────────────────────
echo ""
MCP_CONFIG=".mcp.json"

# Collect preset preference
PRESET="starter"
echo -e "${B}Select a preset:${X}"
echo "  1) starter    — 15 tools (decision intelligence core)"
echo "  2) founder    — 40 tools (weekly resets, delegation, entities)"
echo "  3) researcher — 32 tools (web search, LLM, RSS, email)"
echo "  4) web_dev    — 150 tools (vision, SEO, git, UI/UX)"
echo "  5) full       — 338 tools (everything)"
echo ""
read -r -p "Choose [1-5, default=1]: " CHOICE </dev/tty 2>/dev/null || CHOICE="1"
case "${CHOICE:-1}" in
  2) PRESET="founder" ;;
  3) PRESET="researcher" ;;
  4) PRESET="web_dev" ;;
  5) PRESET="full" ;;
  *) PRESET="starter" ;;
esac

# Build MCP config
if [ -n "$NODEBENCH_PATH" ]; then
  MCP_CMD="nodebench-mcp"
  MCP_ARGS="[\"--preset\", \"$PRESET\"]"
else
  MCP_CMD="npx"
  MCP_ARGS="[\"-y\", \"nodebench-mcp\", \"--preset\", \"$PRESET\"]"
fi

# Collect env vars
ENV_BLOCK=""
if [ -n "${GEMINI_API_KEY:-}" ]; then
  ENV_BLOCK="\"GEMINI_API_KEY\": \"$GEMINI_API_KEY\""
fi
if [ -n "${OPENAI_API_KEY:-}" ]; then
  [ -n "$ENV_BLOCK" ] && ENV_BLOCK="$ENV_BLOCK, "
  ENV_BLOCK="${ENV_BLOCK}\"OPENAI_API_KEY\": \"$OPENAI_API_KEY\""
fi
if [ -n "${GITHUB_TOKEN:-}" ]; then
  [ -n "$ENV_BLOCK" ] && ENV_BLOCK="$ENV_BLOCK, "
  ENV_BLOCK="${ENV_BLOCK}\"GITHUB_TOKEN\": \"$GITHUB_TOKEN\""
fi

ENV_JSON="{}"
if [ -n "$ENV_BLOCK" ]; then
  ENV_JSON="{$ENV_BLOCK}"
fi

# Write or merge .mcp.json
if [ -f "$MCP_CONFIG" ]; then
  echo -e "${Y}NOTE${X}: $MCP_CONFIG already exists. Adding nodebench entry."
fi

cat > "$MCP_CONFIG" <<MCPEOF
{
  "mcpServers": {
    "nodebench": {
      "command": "$MCP_CMD",
      "args": $MCP_ARGS,
      "env": $ENV_JSON
    }
  }
}
MCPEOF
echo -e "  ${G}OK${X}  Written: ${C}${MCP_CONFIG}${X} (preset: $PRESET)"

# ── Add .mcp.json to .gitignore ─────────────────────────────────────────
if [ -f ".gitignore" ]; then
  if ! grep -qF ".mcp.json" .gitignore; then
    echo "" >> .gitignore
    echo "# NodeBench MCP config (contains API keys)" >> .gitignore
    echo ".mcp.json" >> .gitignore
    echo -e "  ${G}OK${X}  Added .mcp.json to .gitignore"
  fi
fi

# ── Run health check ────────────────────────────────────────────────────
echo ""
echo -e "${B}Running health check...${X}"
npx -y nodebench-mcp --health 2>/dev/null || echo -e "${Y}WARN${X}: Health check skipped (will run on first use)"

# ── Summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "${B}${G}NodeBench MCP installed successfully!${X}"
echo ""
echo -e "${B}Try these first:${X}"
echo -e "  ${C}discover_tools('analyze a company')${X}     — find relevant tools"
echo -e "  ${C}load_toolset('founder')${X}                  — activate founder tools"
echo -e "  ${C}get_workflow_chain('weekly_reset')${X}        — get guided workflow"
echo -e "  ${C}site_map({ url: 'https://yoursite.com' })${X} — crawl & inspect"
echo ""
echo -e "  Run ${C}nodebench-mcp --health${X} anytime to check system status."
echo -e "  Run ${C}nodebench-mcp --sync-configs${X} to write configs to Claude/Cursor/Windsurf."
echo ""
