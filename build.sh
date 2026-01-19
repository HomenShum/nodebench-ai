#!/bin/bash
# Vercel build script that deploys Convex

set -e

echo "Building frontend..."
npm run build

echo "Deploying Convex functions..."
npx convex deploy --typecheck=enable

echo "Build complete!"
