# ═══════════════════════════════════════════════════════════════════════════
# CI Model Check Script - 2026 Model Registry (PowerShell)
# ═══════════════════════════════════════════════════════════════════════════
#
# This script blocks disallowed model strings from being committed.
# Current approved direct-provider families:
#   - gpt-5.4, gpt-5.4-mini, gpt-5.4-nano (OpenAI)
#   - claude-opus-4.7, claude-sonnet-4.6, claude-haiku-4.5 (Anthropic current)
#   - gemini-3.1-pro-preview, gemini-3-flash-preview, gemini-3.1-flash-lite-preview,
#     gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite (Google)
#   - kimi-k2.6, glm-4.7, glm-4.7-flash (OpenRouter current)
#
# Usage: .\scripts\ci-check-models.ps1
# Exit code: 0 = pass, 1 = fail
#
# See: convex/domains/agents/MODEL_CONSOLIDATION_PLAN.md

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════════════════════════════"
Write-Host "  2026 Model Registry - CI Check"
Write-Host "═══════════════════════════════════════════════════════════════════════════"
Write-Host ""

# Disallowed legacy model patterns that should not be introduced directly.
$DisallowedPatterns = @(
    "gpt-5.2",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-5.1",
    "gpt-5.1-codex",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-3.5",
    "claude-opus-4.5",
    "claude-sonnet-4.5",
    "claude-3",
    "claude-3.5",
    "gemini-3-pro",
    "gemini-3-flash",
    "gemini-3.1-flash-lite-preview-lite",
    "gemini-2.0-flash",
    "gemini-1.5",
    "gemini-1.0"
)

# SDK IDs that should ONLY appear in modelResolver.ts (dated versions)
# These are internal implementation details, not for general use
$SdkIdPatterns = @(
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-opus-4-1-20250805",
    "claude-3-5-haiku-20241022"
)

# Files allowed to contain SDK IDs
$SdkIdAllowedFiles = @(
    "modelResolver.ts",
    "healthcheck.ts",
    "approvedModels.ts"
)

# Directories to check
$CheckDirs = @("convex", "src", "shared")

# Files to exclude
$ExcludeFiles = @(
    "*.md",
    "modelCatalog.ts",
    "ci-check-models.ps1",
    "ci-check-models.sh"
)

$FoundIssues = 0

Write-Host "Checking for disallowed model strings..."
Write-Host ""

foreach ($pattern in $DisallowedPatterns) {
    $escapedPattern = [regex]::Escape("`"$pattern`"")
    
    foreach ($dir in $CheckDirs) {
        if (Test-Path $dir) {
            $files = Get-ChildItem -Path $dir -Recurse -Include "*.ts", "*.tsx", "*.js" -File |
                Where-Object { 
                    $_.Name -notmatch "\.md$" -and 
                    $_.Name -ne "modelCatalog.ts" -and
                    $_.Name -ne "MODEL_CONSOLIDATION_PLAN.md" -and
                    $_.Name -ne "ci-check-models.ps1" -and
                    $_.Name -ne "ci-check-models.sh"
                }
            
            foreach ($file in $files) {
                # Skip modelResolver.ts which contains LEGACY_ALIASES for backward compat
                if ($file.Name -eq "modelResolver.ts") { continue }

                $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
                if ($content -match $escapedPattern) {
                    Write-Host "❌ Found disallowed model: $pattern in $($file.FullName)" -ForegroundColor Red
                    $FoundIssues++
                }
            }
        }
    }
}

# Check for SDK IDs outside allowed files
Write-Host ""
Write-Host "Checking for SDK IDs outside allowed files..."
Write-Host ""

foreach ($sdkId in $SdkIdPatterns) {
    $escapedSdkId = [regex]::Escape($sdkId)

    foreach ($dir in $CheckDirs) {
        if (Test-Path $dir) {
            $files = Get-ChildItem -Path $dir -Recurse -Include "*.ts", "*.tsx", "*.js" -File

            foreach ($file in $files) {
                # Skip allowed files
                if ($SdkIdAllowedFiles -contains $file.Name) { continue }

                $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
                if ($content -match $escapedSdkId) {
                    Write-Host "❌ Found SDK ID outside allowed files: $sdkId in $($file.FullName)" -ForegroundColor Red
                    Write-Host "   SDK IDs should only appear in: $($SdkIdAllowedFiles -join ', ')" -ForegroundColor Yellow
                    $FoundIssues++
                }
            }
        }
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════"

if ($FoundIssues -gt 0) {
    Write-Host "❌ FAILED: Found $FoundIssues model/SDK ID issue(s)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Allowed current families:"
    Write-Host "  - gpt-5.4, gpt-5.4-mini, gpt-5.4-nano (OpenAI)"
    Write-Host "  - claude-opus-4.7, claude-sonnet-4.6, claude-haiku-4.5 (Anthropic current)"
    Write-Host "  - gemini-3.1-pro-preview, gemini-3-flash-preview, gemini-3.1-flash-lite-preview, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite (Google)"
    Write-Host "  - kimi-k2.6, glm-4.7, glm-4.7-flash (OpenRouter current)"
    Write-Host ""
    Write-Host "SDK IDs (dated versions) should ONLY appear in:"
    Write-Host "  - modelResolver.ts"
    Write-Host "  - healthcheck.ts"
    Write-Host "  - approvedModels.ts"
    Write-Host ""
    Write-Host "Use getLanguageModelSafe() from convex/domains/agents/mcp_tools/models"
    Write-Host "to resolve model aliases safely."
    exit 1
} else {
    Write-Host "✅ PASSED: No disallowed model strings or misplaced SDK IDs found" -ForegroundColor Green
    exit 0
}
