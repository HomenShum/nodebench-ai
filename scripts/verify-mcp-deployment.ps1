<#
.SYNOPSIS
    Verify NodeBench MCP server deployments on Render.

.DESCRIPTION
    Tests health endpoints and basic tool listing for all 3 MCP servers.
    Run after deploying to Render to verify everything is working.

.PARAMETER Token
    MCP_HTTP_TOKEN for authentication (required for core-agent).

.PARAMETER CoreAgentUrl
    Base URL for core agent server (default: from Render).

.PARAMETER OpenBBUrl
    Base URL for OpenBB server.

.PARAMETER ResearchUrl
    Base URL for research server.

.EXAMPLE
    .\verify-mcp-deployment.ps1 -Token "your_token"
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$Token = $env:MCP_HTTP_TOKEN,
    
    [string]$CoreAgentUrl = "https://nodebench-mcp-core-agent.onrender.com",
    [string]$OpenBBUrl = "https://nodebench-mcp-openbb.onrender.com",
    [string]$ResearchUrl = "https://nodebench-mcp-research.onrender.com"
)

$ErrorActionPreference = "Stop"

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    Write-Host "`n[$Name] Testing $Url..." -ForegroundColor Cyan
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params["Body"] = $Body
            $params["ContentType"] = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        $json = $response.Content | ConvertFrom-Json
        Write-Host "  ✓ Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "  Response: $($response.Content | ConvertFrom-Json | ConvertTo-Json -Compress)"
        return $true
    }
    catch {
        Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "=== NodeBench MCP Deployment Verification ===" -ForegroundColor Yellow
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

$results = @{}

# 1. Core Agent MCP Server
Write-Host "`n--- Core Agent MCP Server ---" -ForegroundColor Magenta

$results["CoreAgent-Health"] = Test-Endpoint -Name "Health" -Url "$CoreAgentUrl/health"

$toolsListBody = @{
    jsonrpc = "2.0"
    id = 1
    method = "tools/list"
} | ConvertTo-Json

$headers = @{ "Content-Type" = "application/json" }
if ($Token) { $headers["x-mcp-token"] = $Token }

$results["CoreAgent-Tools"] = Test-Endpoint -Name "Tools List" -Url $CoreAgentUrl -Method "POST" -Headers $headers -Body $toolsListBody

# 2. OpenBB MCP Server
Write-Host "`n--- OpenBB MCP Server ---" -ForegroundColor Magenta
$results["OpenBB-Health"] = Test-Endpoint -Name "Health" -Url "$OpenBBUrl/health"
$results["OpenBB-Root"] = Test-Endpoint -Name "Root" -Url $OpenBBUrl

# 3. Research MCP Server
Write-Host "`n--- Research MCP Server ---" -ForegroundColor Magenta
$results["Research-Health"] = Test-Endpoint -Name "Health" -Url "$ResearchUrl/health"
$results["Research-Root"] = Test-Endpoint -Name "Root" -Url $ResearchUrl

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Yellow
$passed = ($results.Values | Where-Object { $_ -eq $true }).Count
$total = $results.Count

foreach ($key in $results.Keys) {
    $status = if ($results[$key]) { "✓ PASS" } else { "✗ FAIL" }
    $color = if ($results[$key]) { "Green" } else { "Red" }
    Write-Host "  $key : $status" -ForegroundColor $color
}

Write-Host "`nTotal: $passed / $total passed" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Yellow" })

if ($passed -ne $total) {
    Write-Host "`nNote: If servers are not yet deployed, connect the repo to Render Blueprint first." -ForegroundColor Cyan
    exit 1
}

Write-Host "`n✓ All MCP servers verified successfully!" -ForegroundColor Green

