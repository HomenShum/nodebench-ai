#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# CI Model Check Script - 2025 Model Consolidation
# ═══════════════════════════════════════════════════════════════════════════
#
# This script blocks disallowed model strings from being committed.
# Only 7 approved models are allowed:
#   - gpt-5.2 (OpenAI)
#   - claude-opus-4.5, claude-sonnet-4.5, claude-haiku-4.5 (Anthropic)
#   - gemini-3-pro, gemini-2.5-flash, gemini-2.5-pro (Google)
#
# Usage: ./scripts/ci-check-models.sh
# Exit code: 0 = pass, 1 = fail
#
# See: convex/domains/agents/MODEL_CONSOLIDATION_PLAN.md

set -e

echo "═══════════════════════════════════════════════════════════════════════════"
echo "  2025 Model Consolidation - CI Check"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# Disallowed model patterns (legacy models that should not be used)
DISALLOWED_PATTERNS=(
  "gpt-5.1"
  "gpt-5-mini"
  "gpt-5-nano"
  "gpt-5.1-codex"
  "gpt-4.1"
  "gpt-4.1-mini"
  "gpt-4.1-nano"
  "gpt-4o"
  "gpt-4o-mini"
  "gpt-4-turbo"
  "gpt-3.5"
  "claude-3"
  "claude-3.5"
  "claude-sonnet-4-5-20250929"
  "claude-opus-4-5-20251101"
  "claude-haiku-4-5-20251001"
  "gemini-2.5-flash-lite"
  "gemini-1.5"
  "gemini-1.0"
)

# Directories to check
CHECK_DIRS=(
  "convex"
  "src"
  "shared"
)

# Files to exclude (documentation, plans, etc.)
EXCLUDE_PATTERNS=(
  "*.md"
  "MODEL_CONSOLIDATION_PLAN.md"
  "LEGACY_ALIASES"
  "modelCatalog.ts"  # Contains legacy aliases for backward compat
)

FOUND_ISSUES=0

echo "Checking for disallowed model strings..."
echo ""

for pattern in "${DISALLOWED_PATTERNS[@]}"; do
  # Search for the pattern in TypeScript/JavaScript files
  # Exclude markdown files and the modelCatalog (which has legacy aliases)
  MATCHES=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" \
    --exclude="*.md" \
    --exclude="modelCatalog.ts" \
    --exclude="MODEL_CONSOLIDATION_PLAN.md" \
    --exclude="ci-check-models.sh" \
    "\"$pattern\"" "${CHECK_DIRS[@]}" 2>/dev/null || true)
  
  if [ -n "$MATCHES" ]; then
    echo "❌ Found disallowed model: $pattern"
    echo "$MATCHES" | head -10
    echo ""
    FOUND_ISSUES=$((FOUND_ISSUES + 1))
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"

if [ $FOUND_ISSUES -gt 0 ]; then
  echo "❌ FAILED: Found $FOUND_ISSUES disallowed model pattern(s)"
  echo ""
  echo "Allowed models (2025 consolidated):"
  echo "  - gpt-5.2"
  echo "  - claude-opus-4.5"
  echo "  - claude-sonnet-4.5"
  echo "  - claude-haiku-4.5"
  echo "  - gemini-3-pro"
  echo "  - gemini-2.5-flash"
  echo "  - gemini-2.5-pro"
  echo ""
  echo "Use getLanguageModelSafe() from convex/domains/agents/mcp_tools/models"
  echo "to resolve model aliases safely."
  exit 1
else
  echo "✅ PASSED: No disallowed model strings found"
  exit 0
fi

