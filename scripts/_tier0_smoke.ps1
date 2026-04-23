#Requires -Version 5
# Tier 0 smoke test.
# Creates a streaming thread under the product anon session and fires a chat
# message that anchors to an existing entity, then checks that the resulting
# agentRuns row carries knownEntityStateMarkdown.

$ErrorActionPreference = 'Stop'
$anon = '8dce4242-33a0-40f6-bed3-2b4156343efe'
$slug = 'supply-chain-ai-startup-loop'

Write-Host "[tier0-smoke] creating streaming thread for anon=$anon ..."
$createJson = '{\"anonymousSessionId\":\"' + $anon + '\",\"title\":\"Tier0 smoke\"}'
$createOutput = cmd /c "npx convex run domains/agents/fastAgentPanelStreaming:createThread `"$createJson`" 2>&1"
Write-Host "[tier0-smoke] create output:"
$createOutput | ForEach-Object { Write-Host "  $_" }
$threadId = ($createOutput | Where-Object { $_ -match '^"[a-z0-9]+"$' } | Select-Object -Last 1)
if (-not $threadId) { $threadId = ($createOutput | Select-Object -Last 1) }
$threadId = $threadId.Trim().Trim('"')
Write-Host "[tier0-smoke] threadId=$threadId"
if (-not $threadId -or $threadId -match 'Error|error|Failed|failed') { throw "createThread failed" }

Write-Host "[tier0-smoke] initiating async streaming with entitySlug=$slug ..."
$sendJson = '{\"threadId\":\"' + $threadId + '\",\"prompt\":\"What do we already know about ' + $slug + '?\",\"model\":\"claude-haiku-4.5\",\"useCoordinator\":true,\"anonymousSessionId\":\"' + $anon + '\",\"entitySlug\":\"' + $slug + '\"}'
$sendRes = cmd /c "npx convex run domains/agents/fastAgentPanelStreaming:initiateAsyncStreaming `"$sendJson`" 2>&1"
Write-Host "[tier0-smoke] send result:"
$sendRes | ForEach-Object { Write-Host "  $_" }

Write-Host "[tier0-smoke] sleeping 2s so the run is persisted ..."
Start-Sleep -Seconds 2

Write-Host "[tier0-smoke] latest agentRuns rows:"
& npx convex data agentRuns --limit 3 --order desc 2>&1 | Select-Object -Last 20
