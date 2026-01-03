<#
.SYNOPSIS
  End-to-end MCP validation (Convex Cloud -> external MCP servers -> live APIs).

.DESCRIPTION
  This script:
    1) Reads your Convex deployment URL from .env.local (VITE_CONVEX_URL).
    2) Reads MCP_SECRET from your Convex deployment (npx convex env get MCP_SECRET).
    3) Starts local servers:
        - Core Agent MCP JSON-RPC server (Node) on :4001
        - OpenBB REST server (Python) on :8001
        - Research REST server (Python) on :8002
    4) Exposes them via Cloudflare Quick Tunnels (cloudflared) to get public HTTPS URLs.
    5) Temporarily sets Convex env vars to point to those public URLs.
    6) Runs the live smoke in Convex via scripts/run-live-api-smoke.ts with --require-mcp.
    7) Restores Convex env vars and stops all processes.

  Notes:
    - This can spend money (Linkup). Use -SkipLinkup to avoid.
    - Secrets are never printed intentionally.
    - Logs are written under .tmp-tools/logs/.

.PARAMETER LinkupQuery
  Query passed to Linkup smoke check.

.PARAMETER BootstrapPython
  If set, creates Python venvs and installs requirements for openbb/research if missing.

.PARAMETER KeepLogs
  If set, keeps existing .tmp-tools/logs; otherwise rotates logs for this run.

.EXAMPLE
  pwsh ./validate-mcp-e2e.ps1

.EXAMPLE
  pwsh ./validate-mcp-e2e.ps1 -LinkupQuery "DISCO seed funding" -BootstrapPython
#>

#requires -Version 5.1

param(
  [string]$LinkupQuery = "DISCO Pharmaceuticals seed funding December 2025",
  [switch]$SkipLinkup,
  [switch]$BootstrapPython,
  [switch]$KeepLogs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string]$msg) { Write-Host "[mcp-e2e] $msg" }

# Global state used for tunnel capture.
if (-not (Get-Variable -Name "McpE2E_TunnelState" -Scope Global -ErrorAction SilentlyContinue)) {
  $global:McpE2E_TunnelState = @{}
}

function Require-File([string]$path) {
  if (-not (Test-Path $path)) { throw "Missing required file: $path" }
}

function Parse-DotEnv([string]$path) {
  $map = @{}
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line) { return }
    if ($line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $k = $line.Substring(0, $idx).Trim()
    $v = $line.Substring($idx + 1).Trim()
    $map[$k] = $v
  }
  return $map
}

function Get-ConvexUrls {
  Require-File ".env.local"
  $envMap = Parse-DotEnv ".env.local"
  $cloud = $envMap["VITE_CONVEX_URL"]
  if (-not $cloud) { throw "Missing VITE_CONVEX_URL in .env.local" }
  if ($cloud -notmatch "^https://.+\.convex\.cloud/?$") {
    throw "VITE_CONVEX_URL does not look like a Convex Cloud URL: $cloud"
  }
  $cloud = $cloud.TrimEnd("/")
  $site = $cloud -replace "\.convex\.cloud$", ".convex.site"
  return [pscustomobject]@{ Cloud = $cloud; Site = $site }
}

function Get-ConvexEnvValue([string]$name) {
  # Returns $null if unset.
  try {
    $value = (npx convex env get $name 2>$null) -join ""
    if ($null -eq $value) { $value = "" }
    $value = $value.Trim()
    if (-not $value) { return $null }
    return $value
  } catch {
    return $null
  }
}

function Set-ConvexEnvValue([string]$name, [string]$value) {
  $null = npx convex env set $name $value
  if ($LASTEXITCODE -ne 0) { throw "Failed to set Convex env var: $name" }
}

function Unset-ConvexEnvValue([string]$name) {
  $null = npx convex env remove $name
  if ($LASTEXITCODE -ne 0) { throw "Failed to unset Convex env var: $name" }
}

function Ensure-Cloudflared([string]$toolsDir) {
  $exe = Join-Path $toolsDir "cloudflared.exe"
  if (Test-Path $exe) { return (Resolve-Path $exe).Path }

  Write-Info "Downloading cloudflared..."
  New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
  $ProgressPreference = "SilentlyContinue"
  $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
  Invoke-WebRequest -Uri $url -OutFile $exe -TimeoutSec 180 | Out-Null
  return (Resolve-Path $exe).Path
}

function Wait-HttpOk([string]$url, [int]$timeoutSec = 30) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      # Windows PowerShell 5.1: rely on success/no exception (StatusCode handling is inconsistent across editions).
      $null = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 5 -UseBasicParsing
      return
    } catch {
      Start-Sleep -Milliseconds 350
      continue
    }
  }
  throw "Timed out waiting for HTTP: $url"
}

function New-RandomToken {
  return ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
}

function Test-TcpPortInUse([int]$port) {
  try {
    $listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Loopback), $port
    $listener.Start()
    $listener.Stop()
    return $false
  } catch {
    return $true
  }
}

function Get-FreeTcpPort([int]$preferred, [int]$maxTries = 50) {
  $port = $preferred
  for ($i = 0; $i -lt $maxTries; $i++) {
    if (-not (Test-TcpPortInUse $port)) { return $port }
    $port++
  }
  throw "Could not find a free TCP port starting from $preferred"
}

function Ensure-PythonVenv([string]$venvPythonPath, [string]$venvDir, [string]$requirementsPath) {
  if (Test-Path $venvPythonPath) { return }
  if (-not $BootstrapPython) {
    throw "Missing venv: $venvPythonPath. Re-run with -BootstrapPython"
  }
  Write-Info "Bootstrapping Python venv: $venvDir"
  python -m venv $venvDir
  & $venvPythonPath -m pip install --upgrade pip | Out-Null
  & (Join-Path $venvDir "Scripts\\pip.exe") install -r $requirementsPath | Out-Null
}

function Start-LoggedProcess {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string[]]$ArgumentList,
    [Parameter(Mandatory=$true)][string]$WorkingDirectory,
    [Parameter(Mandatory=$true)][string]$StdoutPath,
    [Parameter(Mandatory=$true)][string]$StderrPath,
    [Parameter()][hashtable]$Environment = @{}
  )

  foreach ($k in $Environment.Keys) {
    Set-Item -Path ("Env:" + $k) -Value ([string]$Environment[$k])
  }

  return Start-Process `
    -FilePath $FilePath `
    -ArgumentList $ArgumentList `
    -WorkingDirectory $WorkingDirectory `
    -RedirectStandardOutput $StdoutPath `
    -RedirectStandardError $StderrPath `
    -PassThru
}

function Find-TunnelUrlInText([string]$text) {
  if (-not $text) { return $null }
  $m = [regex]::Match(
    $text,
    "https://[a-z0-9\\-]+\\.trycloudflare\\.com",
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
  if ($m.Success) { return $m.Value }
  return $null
}

function Start-Tunnel {
  param(
    [Parameter(Mandatory=$true)][string]$cloudflaredPath,
    [Parameter(Mandatory=$true)][string]$localUrl,
    [Parameter(Mandatory=$true)][string]$logPath
  )

  New-Item -ItemType File -Force -Path $logPath | Out-Null

  $lines = New-Object System.Collections.Generic.List[string]
  $url = $null

  $job = Start-Job -ScriptBlock {
    param($cf, $local)
    & $cf tunnel --no-autoupdate --url $local --loglevel info 2>&1
  } -ArgumentList $cloudflaredPath, $localUrl

  $deadline = (Get-Date).AddSeconds(45)
  while ((Get-Date) -lt $deadline) {
    $batch = @()
    try { $batch = Receive-Job -Job $job -ErrorAction SilentlyContinue } catch { $batch = @() }

    foreach ($item in $batch) {
      $line = [string]$item
      if ($line) {
        $lines.Add($line) | Out-Null
        if (-not $url) {
          $found = Find-TunnelUrlInText $line
          if ($found) { $url = $found }
        }
      }
    }

    if ($url) { break }

    $state = $job.State
    if ($state -eq "Failed" -or $state -eq "Completed" -or $state -eq "Stopped") { break }
    Start-Sleep -Milliseconds 250
  }

  # Drain remaining output once.
  try {
    $batch = Receive-Job -Job $job -ErrorAction SilentlyContinue
    foreach ($item in @($batch)) {
      $line = [string]$item
      if ($line) { $lines.Add($line) | Out-Null }
    }
  } catch {}

  if (-not $url -and $lines.Count -gt 0) {
    $url = Find-TunnelUrlInText ($lines.ToArray() -join "`n")
  }

  if ($lines.Count -gt 0) {
    $lines.ToArray() | Set-Content -Path $logPath -Encoding utf8
  }

  if (-not $url) {
    try {
      $rawLog = Get-Content -Path $logPath -Raw -ErrorAction SilentlyContinue
      $url = Find-TunnelUrlInText $rawLog
    } catch {
      # best-effort
    }
  }

  if (-not $url) {
    throw "Failed to acquire tunnel URL for $localUrl (see $logPath)"
  }

  return [pscustomobject]@{
    Job = $job
    Url = $url
    LogPath = $logPath
  }
}

function Stop-Quiet([int[]]$pids) {
  foreach ($procId in $pids) {
    if ($procId -and $procId -gt 0) {
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
}

# --------------------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------------------

$repoRoot = (Resolve-Path ".").Path
$tmpDir = Join-Path $repoRoot ".tmp-tools"
$logsRoot = Join-Path $tmpDir "logs"
New-Item -ItemType Directory -Force -Path $logsRoot | Out-Null

# Always write logs to a unique run directory to avoid file-lock issues on Windows.
$runStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logsDir = Join-Path $logsRoot $runStamp
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$urls = Get-ConvexUrls
Write-Info "Convex Cloud: $($urls.Cloud)"
Write-Info "Convex Site:  $($urls.Site)"

$mcpSecret = Get-ConvexEnvValue "MCP_SECRET"
if (-not $mcpSecret) {
  throw "Convex env MCP_SECRET is not set. Set it with: npx convex env set MCP_SECRET <value>"
}

$cloudflared = Ensure-Cloudflared $tmpDir

Write-Info "Preparing local servers..."

$coreToken = New-RandomToken

$coreOut = Join-Path $logsDir "core-agent-mcp.out.log"
$coreErr = Join-Path $logsDir "core-agent-mcp.err.log"
$openbbOut = Join-Path $logsDir "openbb.out.log"
$openbbErr = Join-Path $logsDir "openbb.err.log"
$researchOut = Join-Path $logsDir "research.out.log"
$researchErr = Join-Path $logsDir "research.err.log"

$coreProc = $null
$openbbProc = $null
$researchProc = $null
$coreTunnel = $null
$openbbTunnel = $null
$researchTunnel = $null

$convexEnvBackup = @{}
$convexEnvVarsToManage = @(
  "CORE_AGENT_MCP_SERVER_URL",
  "CORE_AGENT_MCP_AUTH_TOKEN",
  "OPENBB_MCP_SERVER_URL",
  "RESEARCH_MCP_SERVER_URL"
)

try {
  foreach ($name in $convexEnvVarsToManage) {
    $convexEnvBackup[$name] = Get-ConvexEnvValue $name
  }

  $corePort = Get-FreeTcpPort 4001
  $openbbPort = Get-FreeTcpPort 8001
  $researchStart = [Math]::Max(8002, ($openbbPort + 1))
  $researchPort = Get-FreeTcpPort $researchStart

  Write-Info "Using local ports: core=$corePort openbb=$openbbPort research=$researchPort"

  # Core Agent MCP server (Node -> JSON-RPC over HTTP)
  $coreProc = Start-LoggedProcess `
    -FilePath "cmd.exe" `
    -ArgumentList @("/c","npx","tsx","mcp_tools/core_agent_server/httpServer.ts") `
    -WorkingDirectory $repoRoot `
    -StdoutPath $coreOut `
    -StderrPath $coreErr `
    -Environment @{
      CONVEX_BASE_URL = $urls.Site
      MCP_SECRET = $mcpSecret
      MCP_HTTP_TOKEN = $coreToken
      PORT = [string]$corePort
      MCP_HTTP_HOST = "127.0.0.1"
    }

  # OpenBB server (Python -> REST)
  $openbbVenvDir = Join-Path $repoRoot "python-mcp-servers\\openbb\\.venv"
  $openbbPy = Join-Path $openbbVenvDir "Scripts\\python.exe"
  Ensure-PythonVenv $openbbPy $openbbVenvDir (Join-Path $repoRoot "python-mcp-servers\\openbb\\requirements.txt")
  $openbbProc = Start-LoggedProcess `
    -FilePath $openbbPy `
    -ArgumentList @("python-mcp-servers\\openbb\\server.py") `
    -WorkingDirectory $repoRoot `
    -StdoutPath $openbbOut `
    -StderrPath $openbbErr `
    -Environment @{
      OPENBB_HOST = "127.0.0.1"
      OPENBB_PORT = [string]$openbbPort
      ENVIRONMENT = "production"
      LOG_LEVEL = "INFO"
      ALLOWED_ORIGINS = "*"
    }

  # Research server (Python -> REST)
  $researchVenvDir = Join-Path $repoRoot "python-mcp-servers\\research\\.venv"
  $researchPy = Join-Path $researchVenvDir "Scripts\\python.exe"
  Ensure-PythonVenv $researchPy $researchVenvDir (Join-Path $repoRoot "python-mcp-servers\\research\\requirements.txt")
  $researchProc = Start-LoggedProcess `
    -FilePath $researchPy `
    -ArgumentList @("python-mcp-servers\\research\\server.py") `
    -WorkingDirectory $repoRoot `
    -StdoutPath $researchOut `
    -StderrPath $researchErr `
    -Environment @{
      RESEARCH_HOST = "127.0.0.1"
      RESEARCH_PORT = [string]$researchPort
      CONVEX_URL = $urls.Cloud
      MCP_SECRET = $mcpSecret
      ENVIRONMENT = "production"
      LOG_LEVEL = "INFO"
      ALLOWED_ORIGINS = "*"
    }

  Write-Info "Waiting for local health endpoints..."
  Wait-HttpOk ("http://127.0.0.1:" + $openbbPort + "/health") 45
  Wait-HttpOk ("http://127.0.0.1:" + $researchPort + "/health") 45

  Write-Info "Starting Cloudflare tunnels..."
  $coreTunnelLog = Join-Path $logsDir "tunnel-core.log"
  $openbbTunnelLog = Join-Path $logsDir "tunnel-openbb.log"
  $researchTunnelLog = Join-Path $logsDir "tunnel-research.log"

  $coreTunnel = Start-Tunnel $cloudflared ("http://127.0.0.1:" + $corePort) $coreTunnelLog
  $openbbTunnel = Start-Tunnel $cloudflared ("http://127.0.0.1:" + $openbbPort) $openbbTunnelLog
  $researchTunnel = Start-Tunnel $cloudflared ("http://127.0.0.1:" + $researchPort) $researchTunnelLog

  Write-Info "Core Agent MCP URL: $($coreTunnel.Url)"
  Write-Info "OpenBB MCP URL:     $($openbbTunnel.Url)"
  Write-Info "Research MCP URL:   $($researchTunnel.Url)"

  # Quick public tunnel sanity
  $null = Invoke-RestMethod -Method Get -Uri ($openbbTunnel.Url + "/health")
  $null = Invoke-RestMethod -Method Get -Uri ($researchTunnel.Url + "/health")
  $null = Invoke-RestMethod -Method Post -Uri $coreTunnel.Url -Headers @{ "x-mcp-token" = $coreToken } -ContentType "application/json" -Body (@{
    jsonrpc = "2.0"; id = "1"; method = "tools/list"; params = @{}
  } | ConvertTo-Json -Depth 6)

  Write-Info "Temporarily setting Convex MCP server env vars..."
  Set-ConvexEnvValue "CORE_AGENT_MCP_SERVER_URL" $coreTunnel.Url
  Set-ConvexEnvValue "CORE_AGENT_MCP_AUTH_TOKEN" $coreToken
  Set-ConvexEnvValue "OPENBB_MCP_SERVER_URL" $openbbTunnel.Url
  Set-ConvexEnvValue "RESEARCH_MCP_SERVER_URL" $researchTunnel.Url

  Write-Info "Running Convex live MCP smoke..."
  $env:CONVEX_URL = $urls.Cloud
  $env:MCP_SECRET = $mcpSecret

  $resultPath = Join-Path $logsDir "validate-mcp-e2e.result.json"
  $args = @("tsx","scripts/run-live-api-smoke.ts","--require-mcp")
  if (-not $SkipLinkup) {
    $args += @("--include-linkup","--linkup-query",$LinkupQuery)
  }
  $json = (& npx @args) -join "`n"
  $json | Set-Content -Encoding utf8 $resultPath

  $parsed = $null
  try { $parsed = $json | ConvertFrom-Json } catch {}

  if ($parsed -and $parsed.ok -eq $true) {
    Write-Info "PASS (details: $resultPath)"
    $script:ExitCode = 0
  } else {
    Write-Info "FAIL (details: $resultPath)"
    $script:ExitCode = 2
  }
}
finally {
  Write-Info "Restoring Convex env vars..."
  foreach ($name in $convexEnvVarsToManage) {
    $prev = $convexEnvBackup[$name]
    try {
      if ($prev) {
        Set-ConvexEnvValue $name $prev
      } else {
        Unset-ConvexEnvValue $name
      }
    } catch {
      # best-effort cleanup
    }
  }

  Write-Info "Stopping tunnels and servers..."
  foreach ($t in @($coreTunnel, $openbbTunnel, $researchTunnel)) {
    if ($t -and $t.Job) {
      try { Stop-Job -Job $t.Job -ErrorAction SilentlyContinue } catch {}
      try { Remove-Job -Job $t.Job -Force -ErrorAction SilentlyContinue } catch {}
    }
  }

  $pids = @()
  if ($coreProc) { $pids += $coreProc.Id }
  if ($openbbProc) { $pids += $openbbProc.Id }
  if ($researchProc) { $pids += $researchProc.Id }
  Stop-Quiet $pids
}

if (-not (Get-Variable -Name "ExitCode" -Scope Script -ErrorAction SilentlyContinue)) {
  $script:ExitCode = 1
}
exit $script:ExitCode
