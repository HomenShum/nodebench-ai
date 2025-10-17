#!/usr/bin/env pwsh
# Run E2E tests with Convex deployment URL

$env:CONVEX_DEPLOYMENT_URL = "https://formal-shepherd-851.convex.cloud"

Write-Host "Running E2E Coordinator Agent Tests..." -ForegroundColor Green
Write-Host "Deployment URL: $env:CONVEX_DEPLOYMENT_URL" -ForegroundColor Cyan

npx vitest run convex/agents/__tests__/e2e-coordinator-agent.test.ts --reporter=verbose

