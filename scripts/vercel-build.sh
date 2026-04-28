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
# Behavior (DECOUPLED — Convex deploy is now a separate GHA workflow):
#   Both production and preview run plain `npm run build` here. The
#   Convex backend is deployed by `.github/workflows/convex-deploy.yml`
#   on push to main, in parallel with Vercel's frontend deploy.
#
#   Why decoupled:
#     The old `npx convex deploy --cmd "npm run build"` failure mode
#     fed Convex push failures (uuid missing dep, @openai/agents-core
#     zod regression) into the frontend's build pipeline — meaning a
#     bug in a single Convex tool blocked the entire frontend deploy.
#     Now those failure surfaces are independent: Convex can be broken
#     without keeping new frontend code from shipping, and vice versa.
#
#   Ordering note:
#     Convex push (~30-60s) typically finishes before Vercel build
#     (~3-4min), so new APIs are usually live before the frontend
#     that calls them. Race window is small and acceptable.

set -euo pipefail

if [ -z "${VITE_CONVEX_URL:-}" ]; then
  echo "::warning::VITE_CONVEX_URL not set — frontend will use baked-in default."
fi
exec npm run build
