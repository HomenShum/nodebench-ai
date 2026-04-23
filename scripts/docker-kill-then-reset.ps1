# Force-kill orphaned Docker processes, then do the manual reset.
$ErrorActionPreference = 'Continue'

function Show-Space {
    $c = Get-PSDrive C
    "C: free = {0:N2} GB" -f ($c.Free / 1GB)
}

Write-Host "=== BEFORE ===" -ForegroundColor Cyan
Show-Space

# 1. Force-kill all Docker-related processes
Write-Host "`n[1/6] Force-killing Docker processes..." -ForegroundColor Yellow
$names = @(
    'Docker Desktop',
    'com.docker.backend',
    'com.docker.build',
    'com.docker.dev-envs',
    'com.docker.extensions',
    'com.docker.service',
    'dockerd',
    'docker',
    'vpnkit',
    'DockerCli'
)
foreach ($n in $names) {
    $procs = Get-Process -Name $n -ErrorAction SilentlyContinue
    if ($procs) {
        foreach ($p in $procs) {
            Write-Host "  Killing $($p.Name) (PID $($p.Id))..."
            try {
                Stop-Process -Id $p.Id -Force -ErrorAction Stop
            } catch {
                Write-Host "    Failed: $_" -ForegroundColor Red
            }
        }
    }
}
Start-Sleep -Seconds 2

# Verify
$remaining = Get-Process -Name $names -ErrorAction SilentlyContinue
if ($remaining) {
    Write-Host "  WARNING: some Docker processes still alive:" -ForegroundColor Red
    $remaining | Select-Object Name, Id | Format-Table -AutoSize
    Write-Host "  Continuing anyway, but delete may fail on locked files." -ForegroundColor Yellow
} else {
    Write-Host "  All Docker processes killed." -ForegroundColor Green
}

# 2. Stop Docker Desktop Service if registered
Write-Host "`n[2/6] Stopping Docker Desktop Service (if installed)..." -ForegroundColor Yellow
$svc = Get-Service -Name 'com.docker.service' -ErrorAction SilentlyContinue
if ($svc) {
    if ($svc.Status -ne 'Stopped') {
        try {
            Stop-Service -Name 'com.docker.service' -Force -ErrorAction Stop
            Write-Host "  Service stopped." -ForegroundColor Green
        } catch {
            Write-Host "  Failed to stop service (needs admin): $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  Service already stopped." -ForegroundColor Green
    }
} else {
    Write-Host "  Service not installed." -ForegroundColor DarkGray
}

# 3. WSL shutdown
Write-Host "`n[3/6] Shutting down WSL..." -ForegroundColor Yellow
wsl --shutdown
Start-Sleep -Seconds 3
Write-Host "  WSL shutdown complete." -ForegroundColor Green

# 4. Record sizes
Write-Host "`n[4/6] Current Docker data on C:..." -ForegroundColor Yellow
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

# 5. Delete
Write-Host "`n[5/6] Deleting Docker data folders..." -ForegroundColor Yellow
foreach ($p in @($localDocker, $roamingDocker)) {
    if (Test-Path $p) {
        Write-Host "  Removing $p..."
        Remove-Item -Path $p -Recurse -Force -ErrorAction Continue
        if (Test-Path $p) {
            Write-Host "    WARNING: some files could not be deleted" -ForegroundColor Yellow
            $leftover = Get-ChildItem -Path $p -Recurse -Force -ErrorAction SilentlyContinue
            "    {0} items remain" -f $leftover.Count
        } else {
            Write-Host "    Deleted." -ForegroundColor Green
        }
    }
}

# 6. Verify
Write-Host "`n[6/6] Verification..." -ForegroundColor Yellow
if (-not (Test-Path $localDocker) -and -not (Test-Path $roamingDocker)) {
    Write-Host "  SUCCESS: Both Docker folders gone." -ForegroundColor Green
}
Write-Host "`n=== AFTER ===" -ForegroundColor Cyan
Show-Space

Write-Host "`nNext: open Docker Desktop. Accept TOS. Set Settings > Resources > Advanced > Disk image location = D:\Docker. Apply and Restart." -ForegroundColor Cyan
