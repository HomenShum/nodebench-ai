# Manual equivalent of Docker Desktop "Reset to factory defaults"
# Safe to run when Docker Desktop is fully closed.
# Deletes all Docker data (images, containers, volumes, settings).
# Preserves Docker Desktop the application and C:\Users\hshum\.docker\config.json

$ErrorActionPreference = 'Continue'

function Show-Space {
    $c = Get-PSDrive C
    "C: free = {0:N2} GB" -f ($c.Free / 1GB)
}

Write-Host "=== BEFORE ===" -ForegroundColor Cyan
Show-Space

# 1. Verify no Docker processes running
Write-Host "`n[1/5] Checking for running Docker processes..." -ForegroundColor Yellow
$procs = Get-Process -Name 'Docker Desktop','com.docker.backend','com.docker.build','com.docker.dev-envs','com.docker.extensions','dockerd','docker','vpnkit' -ErrorAction SilentlyContinue
if ($procs) {
    Write-Host "ERROR: Docker processes still running. Close Docker Desktop fully first." -ForegroundColor Red
    $procs | Select-Object Name, Id | Format-Table -AutoSize
    exit 1
}
Write-Host "  OK, no Docker processes running." -ForegroundColor Green

# 2. Shut down WSL to release any file locks on the VHDX
Write-Host "`n[2/5] Shutting down WSL (releases VHDX locks)..." -ForegroundColor Yellow
wsl --shutdown
Start-Sleep -Seconds 3
Write-Host "  WSL shutdown complete." -ForegroundColor Green

# 3. Record current Docker folder sizes
Write-Host "`n[3/5] Current Docker data on C:..." -ForegroundColor Yellow
$localDocker   = "$env:LOCALAPPDATA\Docker"
$roamingDocker = "$env:APPDATA\Docker"
foreach ($p in @($localDocker, $roamingDocker)) {
    if (Test-Path $p) {
        $m = Get-ChildItem -Path $p -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum
        $gb = if ($m.Sum) { [math]::Round($m.Sum/1GB, 2) } else { 0 }
        "  {0} = {1} GB ({2} files)" -f $p, $gb, $m.Count
    } else {
        "  {0} (does not exist)" -f $p
    }
}

# 4. Delete Docker data folders
Write-Host "`n[4/5] Deleting Docker data folders..." -ForegroundColor Yellow
foreach ($p in @($localDocker, $roamingDocker)) {
    if (Test-Path $p) {
        Write-Host "  Removing $p..."
        Remove-Item -Path $p -Recurse -Force -ErrorAction Continue
        if (Test-Path $p) {
            Write-Host "    WARNING: some files could not be deleted (likely locked)" -ForegroundColor Yellow
            # Show what's left
            Get-ChildItem -Path $p -Recurse -Force -ErrorAction SilentlyContinue | Select-Object FullName | Format-Table -AutoSize
        } else {
            Write-Host "    Deleted." -ForegroundColor Green
        }
    }
}

# 5. Verify
Write-Host "`n[5/5] Verification..." -ForegroundColor Yellow
if (-not (Test-Path $localDocker) -and -not (Test-Path $roamingDocker)) {
    Write-Host "  SUCCESS: Both Docker folders gone." -ForegroundColor Green
}
Write-Host "`n=== AFTER ===" -ForegroundColor Cyan
Show-Space

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Open Docker Desktop (Start menu or D:\...\Docker Desktop shortcut)." -ForegroundColor White
Write-Host "  2. Accept the terms of service when prompted." -ForegroundColor White
Write-Host "  3. IMMEDIATELY go to Settings (gear icon) > Resources > Advanced." -ForegroundColor White
Write-Host "  4. Set 'Disk image location' to D:\Docker" -ForegroundColor White
Write-Host "  5. Click Apply and Restart." -ForegroundColor White
Write-Host "  6. Tell me when done so I can verify." -ForegroundColor White
