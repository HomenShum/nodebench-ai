#!/bin/bash
# Vercel build script that deploys Convex without typecheck

set -e

echo "Building frontend..."
npm run build

echo "Deploying Convex functions..."
npx convex deploy --typecheck=disable

echo "Build complete!"
