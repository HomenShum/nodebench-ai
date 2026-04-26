#!/usr/bin/env bash
# Vercel build entry — invoked from vercel.json `buildCommand`.
#
# Why this script exists:
#   The previous inline `buildCommand` in vercel.json grew past Vercel's
#   256-char API limit, which made every deploy fail at config validation
#   (no build logs produced — Vercel rejects the config before invoking
#   any build steps).  Extracting to a script keeps `vercel.json` short
#   and makes the build logic editable + reviewable.
#
# Behavior:
#   Production env:
#     - require CONVEX_DEPLOY_KEY (fail-fast with actionable message)
#     - run `npx convex deploy --cmd 'npm run build'` so the Convex
#       backend ships in lockstep with the frontend bundle
#   Preview env (PR previews):
#     - skip `convex deploy` (don't touch shared Convex from a PR branch)
#     - warn if VITE_CONVEX_URL is missing (frontend will fall back to
#       baked-in default)
#     - run plain `npm run build`

set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  if [ -z "${CONVEX_DEPLOY_KEY:-}" ]; then
    echo "::error::Missing CONVEX_DEPLOY_KEY in production env. Add it at Vercel → Settings → Environment Variables → Production."
    exit 1
  fi
  exec npx convex deploy --cmd "npm run build"
fi

if [ -z "${VITE_CONVEX_URL:-}" ]; then
  echo "::warning::VITE_CONVEX_URL not set in preview env — frontend will use baked-in default."
fi
exec npm run build
