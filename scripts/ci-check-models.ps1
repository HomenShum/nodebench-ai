# ═══════════════════════════════════════════════════════════════════════════
# CI Model Check Script - 2025 Model Consolidation (PowerShell)
# ═══════════════════════════════════════════════════════════════════════════
#
# This script blocks disallowed model strings from being committed.
# Only 7 approved models are allowed:
#   - gpt-5.2 (OpenAI)
#   - claude-opus-4.5, claude-sonnet-4.5, claude-haiku-4.5 (Anthropic)
#   - gemini-3-pro, gemini-2.5-flash, gemini-2.5-pro (Google)
#
# Usage: .\scripts\ci-check-models.ps1
# Exit code: 0 = pass, 1 = fail
#
# See: convex/domains/agents/MODEL_CONSOLIDATION_PLAN.md

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════════════════════════════"
Write-Host "  2025 Model Consolidation - CI Check"
Write-Host "═══════════════════════════════════════════════════════════════════════════"
Write-Host ""

# Disallowed model patterns (legacy models that should not be used)
$DisallowedPatterns = @(
    "gpt-5.1",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-5.1-codex",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-3.5",
    "claude-3",
    "claude-3.5",
    "gemini-2.5-flash-lite",
    "gemini-1.5",
    "gemini-1.0"
)

# SDK IDs that should ONLY appear in modelResolver.ts (dated versions)
# These are internal implementation details, not for general use
$SdkIdPatterns = @(
    "claude-sonnet-4-5-20250929",
    "claude-opus-4-5-20251101",
    "claude-haiku-4-5-20251001",
    "gemini-3.0-pro-preview-0325",
    "gemini-2.5-flash-preview-04-17",
    "gemini-2.5-pro-preview-05-06"
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
    Write-Host "Allowed models (2025 consolidated):"
    Write-Host "  - gpt-5.2"
    Write-Host "  - claude-opus-4.5"
    Write-Host "  - claude-sonnet-4.5"
    Write-Host "  - claude-haiku-4.5"
    Write-Host "  - gemini-3-pro"
    Write-Host "  - gemini-2.5-flash"
    Write-Host "  - gemini-2.5-pro"
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

