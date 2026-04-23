# Locate Docker VHDX files (the 249 GB culprit)
$ErrorActionPreference = 'Continue'

Write-Host "=== Docker Desktop processes (should all be stopped before move) ===" -ForegroundColor Cyan
Get-Process -Name 'Docker Desktop','com.docker.backend','com.docker.build','com.docker.dev-envs','com.docker.extensions','dockerd','docker','vpnkit','vmmem','wslservice' -ErrorAction SilentlyContinue |
    Select-Object Name, Id, StartTime | Format-Table -AutoSize

Write-Host "`n=== WSL distro status ===" -ForegroundColor Cyan
wsl --list --verbose

Write-Host "`n=== Docker VHDX files on disk ===" -ForegroundColor Cyan
$dockerRoot = "$env:LOCALAPPDATA\Docker"
if (Test-Path $dockerRoot) {
    Get-ChildItem -Path $dockerRoot -Recurse -Filter '*.vhdx' -ErrorAction SilentlyContinue |
        Select-Object @{N='Path';E={$_.FullName}},
                      @{N='SizeGB';E={[math]::Round($_.Length/1GB,2)}},
                      LastWriteTime |
        Format-Table -AutoSize
} else {
    Write-Host "No $dockerRoot folder found" -ForegroundColor Yellow
}

Write-Host "`n=== Expected WSL2 Docker distro locations ===" -ForegroundColor Cyan
@(
    "$env:LOCALAPPDATA\Docker\wsl\data\ext4.vhdx",
    "$env:LOCALAPPDATA\Docker\wsl\distro\ext4.vhdx",
    "$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx",
    "$env:LOCALAPPDATA\Docker\wsl\main\ext4.vhdx"
) | ForEach-Object {
    if (Test-Path $_) {
        $size = (Get-Item $_).Length / 1GB
        "EXISTS ({0:N2} GB): {1}" -f $size, $_
    } else {
        "missing: $_"
    }
}
