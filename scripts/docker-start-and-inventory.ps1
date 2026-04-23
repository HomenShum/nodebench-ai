# Start Docker Desktop and wait for daemon, then show inventory.
$ErrorActionPreference = 'Continue'

function Test-DockerReady {
    try {
        $null = docker version --format '{{.Server.Version}}' 2>$null
        return ($LASTEXITCODE -eq 0)
    } catch { return $false }
}

# Find Docker Desktop exe
$dockerExe = $null
$candidates = @(
    'C:\Program Files\Docker\Docker\Docker Desktop.exe',
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
)
foreach ($c in $candidates) {
    if (Test-Path $c) { $dockerExe = $c; break }
}
if (-not $dockerExe) {
    Write-Host "ERROR: Docker Desktop executable not found. Install path unexpected." -ForegroundColor Red
    exit 1
}

Write-Host "=== Starting Docker Desktop ===" -ForegroundColor Cyan
Write-Host "Exe: $dockerExe"

if (-not (Test-DockerReady)) {
    Write-Host "Launching..."
    Start-Process -FilePath $dockerExe
    Write-Host "Waiting for daemon (max 3 min)..."
    $deadline = (Get-Date).AddMinutes(3)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 5
        if (Test-DockerReady) {
            Write-Host "Docker daemon is ready." -ForegroundColor Green
            break
        }
        Write-Host "  ...still starting" -ForegroundColor DarkGray
    }
    if (-not (Test-DockerReady)) {
        Write-Host "ERROR: Docker daemon did not become ready within 3 minutes." -ForegroundColor Red
        Write-Host "Check Docker Desktop window for errors, then re-run this script." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Docker daemon already responsive." -ForegroundColor Green
}

Write-Host "`n=== docker version ===" -ForegroundColor Cyan
docker version --format 'Server: {{.Server.Version}}  |  Client: {{.Client.Version}}'

Write-Host "`n=== docker system df (space usage) ===" -ForegroundColor Cyan
docker system df

Write-Host "`n=== docker system df -v (detailed) ===" -ForegroundColor Cyan
docker system df -v

Write-Host "`n=== Containers (all) ===" -ForegroundColor Cyan
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Size}}'

Write-Host "`n=== Images ===" -ForegroundColor Cyan
docker images --format 'table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}'

Write-Host "`n=== Volumes ===" -ForegroundColor Cyan
docker volume ls

Write-Host "`n=== Current VHDX size on disk ===" -ForegroundColor Cyan
$vhdx = "$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx"
if (Test-Path $vhdx) {
    $sz = (Get-Item $vhdx).Length / 1GB
    "docker_data.vhdx = {0:N2} GB" -f $sz
}
