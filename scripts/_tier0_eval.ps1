#Requires -Version 5
$ErrorActionPreference = 'Stop'
$threadId = $args[0]
$anon = '8dce4242-33a0-40f6-bed3-2b4156343efe'
$json = '{\"threadId\":\"' + $threadId + '\",\"anonymousSessionId\":\"' + $anon + '\"}'
$out = cmd /c "npx convex run domains/agents/fastAgentPanelStreaming:getThreadMessagesForEval `"$json`" 2>&1"
$out | ForEach-Object { Write-Host $_ }
