#!/bin/bash
# Vercel build script that deploys Convex

set -e

echo "Deploying Convex functions and building frontend..."
npx convex deploy --cmd 'npm run build' --typecheck=enable

echo "Build complete!"
