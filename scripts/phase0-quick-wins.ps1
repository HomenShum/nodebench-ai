# Phase 0: Safe, immediate disk space reclaim. Nothing moved, only junk cleared.
# Run as current user (no admin needed for most steps). Step 5 needs admin.
$ErrorActionPreference = 'Continue'

function Show-Space {
    $c = Get-PSDrive C
    "C: free = {0:N1} GB" -f ($c.Free / 1GB)
}

Write-Host "=== BEFORE ===" -ForegroundColor Cyan
Show-Space

# 1. Empty Recycle Bin (all drives)
Write-Host "`n[1/5] Emptying Recycle Bin..." -ForegroundColor Yellow
Clear-RecycleBin -Force -ErrorAction SilentlyContinue
Show-Space

# 2. User temp folder (safe. Anything actively in use is locked and will be skipped)
Write-Host "`n[2/5] Clearing user Temp folder ($env:TEMP)..." -ForegroundColor Yellow
Get-ChildItem -Path $env:TEMP -Recurse -Force -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Show-Space

# 3. Windows Temp (needs admin for full effect. Skips locked files.)
Write-Host "`n[3/5] Clearing C:\Windows\Temp..." -ForegroundColor Yellow
Get-ChildItem -Path 'C:\Windows\Temp' -Recurse -Force -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Show-Space

# 4. Squirrel installer leftovers (1 GB from earlier audit)
Write-Host "`n[4/5] Clearing AppData\Local\SquirrelTemp..." -ForegroundColor Yellow
$squirrel = "$env:LOCALAPPDATA\SquirrelTemp"
if (Test-Path $squirrel) {
    Remove-Item -Path $squirrel -Recurse -Force -ErrorAction SilentlyContinue
}
Show-Space

# 5. Windows Delivery Optimization cache + SoftwareDistribution\Download
Write-Host "`n[5/5] Clearing Windows Update download cache..." -ForegroundColor Yellow
Write-Host "  (requires admin. Will skip silently if not elevated.)" -ForegroundColor DarkGray
try {
    Stop-Service -Name wuauserv -Force -ErrorAction Stop
    Get-ChildItem 'C:\Windows\SoftwareDistribution\Download' -Recurse -Force -ErrorAction SilentlyContinue |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Start-Service -Name wuauserv -ErrorAction SilentlyContinue
    Write-Host "  Done." -ForegroundColor Green
} catch {
    Write-Host "  Skipped (need admin PowerShell for this step)." -ForegroundColor DarkYellow
}
Show-Space

Write-Host "`n=== AFTER ===" -ForegroundColor Cyan
Show-Space
Write-Host "`nNext: run Disk Cleanup manually for deeper clean:" -ForegroundColor Cyan
Write-Host "  1. Press Win+R, type: cleanmgr /d C:" -ForegroundColor White
Write-Host "  2. Click 'Clean up system files'" -ForegroundColor White
Write-Host "  3. Tick: Previous Windows installs, Windows Update Cleanup, Delivery Optimization, Temporary files" -ForegroundColor White
Write-Host "  4. Click OK, then Delete Files" -ForegroundColor White
