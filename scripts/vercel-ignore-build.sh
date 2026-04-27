#!/bin/bash
# Vercel "Ignored Build Step" — exits 0 to SKIP build, exits 1 to BUILD.
# Goal: cut Vercel deploy count from 200+/day to ~20/day by skipping
# commits that don't change anything Vercel actually serves.
#
# Belongs in vercel.json under "ignoreCommand". Vercel runs this in the
# build container with VERCEL_GIT_COMMIT_REF and similar env vars set.
#
# Triggered against EVERY commit Vercel considers building (preview + prod).

set -euo pipefail

# Always build production (main). Safety: never accidentally skip prod.
if [ "${VERCEL_GIT_COMMIT_REF:-}" = "main" ]; then
  echo "Build: main branch (always deploy)"
  exit 1
fi

# Skip dependabot — already gated in vercel.json git.deploymentEnabled,
# but belt-and-suspenders in case a manual cherry-pick lands on a
# dependabot/* branch.
case "${VERCEL_GIT_COMMIT_REF:-}" in
  dependabot/*)
    echo "Skip: dependabot branch — preview disabled"
    exit 0
    ;;
esac

# For everything else, skip the build if the commit only touches
# paths that don't affect what Vercel serves.
#
# What Vercel serves:
#   /src, /convex, /packages, /apps, /public, /server, /shared, /api,
#   /scripts/vercel-build.sh, vercel.json, package.json, package-lock.json,
#   tsconfig*.json, vite.config.*, *.html
#
# What Vercel does NOT serve (safe to skip):
#   .claude/, .cursor/, .windsurf/, .augment/, .serena/, .overstory/,
#   .storybook/, .agents/, .agent-browser-profiles/, docs/, plans/,
#   distribution/, screenshots/, e2e-screenshots/, .tmp-*, tests/,
#   *.md (top-level except CHANGELOG.md), .github/ (workflows still run via Actions)
#
# Strategy: list "build-relevant" paths. If `git diff` against parent
# touches NONE of them, skip.

BUILD_RELEVANT=(
  "src" "convex" "packages" "apps" "public" "server" "shared" "api"
  "scripts/vercel-build.sh" "vercel.json"
  "package.json" "package-lock.json"
  "tsconfig.json" "tsconfig.node.json"
  "vite.config.ts" "vite.config.mjs"
  "index.html"
)

# Vercel checks out a shallow clone — HEAD~1 may not exist on first commit.
# Compare to HEAD~1 if available, else default to building.
if ! git rev-parse HEAD~1 >/dev/null 2>&1; then
  echo "Build: first commit on this branch (no parent to diff)"
  exit 1
fi

CHANGED=$(git diff --name-only HEAD~1 HEAD || echo "")
if [ -z "$CHANGED" ]; then
  echo "Skip: no files changed (empty diff)"
  exit 0
fi

# Check if any changed file matches a build-relevant path.
for path in "${BUILD_RELEVANT[@]}"; do
  if echo "$CHANGED" | grep -qE "(^|/)${path}(/|$)"; then
    echo "Build: changed files touch ${path}"
    exit 1
  fi
done

echo "Skip: no build-relevant files changed"
echo "Changed files:"
echo "$CHANGED" | head -20
exit 0
