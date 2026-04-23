# Quick status check: disk space, Docker processes, VHDX existence
Write-Host "=== Disk space ===" -ForegroundColor Cyan
Get-PSDrive -PSProvider FileSystem |
    Where-Object { $_.Name -in 'C','D' } |
    Select-Object Name,
        @{N='UsedGB';  E={[math]::Round($_.Used/1GB,1)}},
        @{N='FreeGB';  E={[math]::Round($_.Free/1GB,1)}},
        @{N='TotalGB'; E={[math]::Round(($_.Used+$_.Free)/1GB,1)}} |
    Format-Table -AutoSize

Write-Host "=== Docker Desktop processes ===" -ForegroundColor Cyan
$procs = Get-Process -Name 'Docker Desktop','com.docker.backend','com.docker.build','com.docker.dev-envs','dockerd','docker' -ErrorAction SilentlyContinue
if ($procs) {
    $procs | Select-Object Name, Id, StartTime | Format-Table -AutoSize
} else {
    Write-Host "  (none running)" -ForegroundColor DarkGray
}

Write-Host "`n=== VHDX files (the 249 GB culprit) ===" -ForegroundColor Cyan
$cRoot  = "$env:LOCALAPPDATA\Docker"
$dRoot  = "D:\Docker"
Write-Host "Searching C:\..\Docker..."
if (Test-Path $cRoot) {
    Get-ChildItem -Path $cRoot -Recurse -Filter '*.vhdx' -ErrorAction SilentlyContinue |
        Select-Object @{N='Path';E={$_.FullName}}, @{N='SizeGB';E={[math]::Round($_.Length/1GB,2)}}, LastWriteTime |
        Format-Table -AutoSize
} else {
    Write-Host "  (C folder gone)" -ForegroundColor DarkGray
}
Write-Host "Searching D:\Docker..."
if (Test-Path $dRoot) {
    $items = Get-ChildItem -Path $dRoot -Recurse -Filter '*.vhdx' -ErrorAction SilentlyContinue
    if ($items) {
        $items |
            Select-Object @{N='Path';E={$_.FullName}}, @{N='SizeGB';E={[math]::Round($_.Length/1GB,2)}}, LastWriteTime |
            Format-Table -AutoSize
    } else {
        Write-Host "  (no VHDX files yet on D)" -ForegroundColor DarkGray
    }
}

Write-Host "`n=== Docker AppData\Local\Docker size ===" -ForegroundColor Cyan
if (Test-Path $cRoot) {
    $m = Get-ChildItem -Path $cRoot -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum
    $gb = if ($m.Sum) { [math]::Round($m.Sum/1GB, 2) } else { 0 }
    "C:\Users\hshum\AppData\Local\Docker = {0} GB ({1} files)" -f $gb, $m.Count
} else {
    Write-Host "  (folder gone, factory reset wiped it)" -ForegroundColor Green
}
