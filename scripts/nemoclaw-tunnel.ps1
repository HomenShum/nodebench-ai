#
# NemoClaw Reverse Tunnel — Windows PowerShell version
#
# Usage:
#   .\scripts\nemoclaw-tunnel.ps1                    # Start tunnel
#   .\scripts\nemoclaw-tunnel.ps1 -Action Stop       # Stop tunnel
#   .\scripts\nemoclaw-tunnel.ps1 -Action Status     # Check status
#   .\scripts\nemoclaw-tunnel.ps1 -Action Watchdog   # Auto-reconnect loop
#
# First time setup:
#   $env:NEMOCLAW_VPS_HOST = "your-vps-ip"
#   $env:NEMOCLAW_TOKEN = "your-secret-token"
#   ssh-keygen -t ed25519 -f "$HOME\.ssh\nemoclaw_key" -N '""'
#   ssh-copy-id -i "$HOME\.ssh\nemoclaw_key" root@your-vps-ip
#

param(
    [ValidateSet("Start", "Stop", "Status", "Watchdog")]
    [string]$Action = "Start"
)

$VPS_HOST    = $env:NEMOCLAW_VPS_HOST ?? "your-vps-ip"
$VPS_USER    = $env:NEMOCLAW_VPS_USER ?? "root"
$VPS_PORT    = $env:NEMOCLAW_VPS_PORT ?? "22"
$SSH_KEY     = $env:NEMOCLAW_SSH_KEY ?? "$HOME\.ssh\nemoclaw_key"
$LOCAL_PORT  = $env:NEMOCLAW_LOCAL_PORT ?? "3100"
$REMOTE_PORT = $env:NEMOCLAW_REMOTE_PORT ?? "3100"
$PID_FILE    = "$env:TEMP\nemoclaw_tunnel.pid"

function Start-Tunnel {
    if ($VPS_HOST -eq "your-vps-ip") {
        Write-Host "[nemoclaw-tunnel] ERROR: Set NEMOCLAW_VPS_HOST first" -ForegroundColor Red
        Write-Host '  $env:NEMOCLAW_VPS_HOST = "123.45.67.89"'
        Write-Host '  .\scripts\nemoclaw-tunnel.ps1'
        return
    }

    if (-not (Test-Path $SSH_KEY)) {
        Write-Host "[nemoclaw-tunnel] Generating SSH key..." -ForegroundColor Yellow
        ssh-keygen -t ed25519 -f $SSH_KEY -N '""' -C "nemoclaw-tunnel"
        Write-Host "[nemoclaw-tunnel] Copy key to VPS:" -ForegroundColor Yellow
        Write-Host "  type $SSH_KEY.pub | ssh $VPS_USER@$VPS_HOST `"cat >> ~/.ssh/authorized_keys`""
        return
    }

    # Check if already running
    if (Test-Path $PID_FILE) {
        $pid = Get-Content $PID_FILE
        if (Get-Process -Id $pid -ErrorAction SilentlyContinue) {
            Write-Host "[nemoclaw-tunnel] Already running (PID $pid)" -ForegroundColor Green
            return
        }
    }

    Write-Host "[nemoclaw-tunnel] Starting reverse tunnel..."
    Write-Host "[nemoclaw-tunnel] localhost:$LOCAL_PORT -> ${VPS_HOST}:$REMOTE_PORT"

    $proc = Start-Process -PassThru -WindowStyle Hidden ssh @(
        "-N", "-T",
        "-i", $SSH_KEY,
        "-p", $VPS_PORT,
        "-o", "ServerAliveInterval=30",
        "-o", "ServerAliveCountMax=3",
        "-o", "ExitOnForwardFailure=yes",
        "-o", "StrictHostKeyChecking=accept-new",
        "-R", "0.0.0.0:${REMOTE_PORT}:localhost:${LOCAL_PORT}",
        "${VPS_USER}@${VPS_HOST}"
    )

    $proc.Id | Out-File $PID_FILE
    Write-Host "[nemoclaw-tunnel] Connected! PID $($proc.Id)" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Phone: http://${VPS_HOST}:${REMOTE_PORT}/nemoclaw?token=$env:NEMOCLAW_TOKEN"
    Write-Host "  Stop:  .\scripts\nemoclaw-tunnel.ps1 -Action Stop"
}

function Stop-Tunnel {
    if (Test-Path $PID_FILE) {
        $pid = Get-Content $PID_FILE
        Stop-Process -Id $pid -ErrorAction SilentlyContinue
        Remove-Item $PID_FILE
        Write-Host "[nemoclaw-tunnel] Stopped (PID $pid)"
    } else {
        Write-Host "[nemoclaw-tunnel] No tunnel running"
    }
}

function Get-TunnelStatus {
    if (Test-Path $PID_FILE) {
        $pid = Get-Content $PID_FILE
        if (Get-Process -Id $pid -ErrorAction SilentlyContinue) {
            Write-Host "[nemoclaw-tunnel] RUNNING (PID $pid)" -ForegroundColor Green
            Write-Host "  ${VPS_HOST}:${REMOTE_PORT} -> localhost:${LOCAL_PORT}"
        } else {
            Write-Host "[nemoclaw-tunnel] DEAD (stale PID file)" -ForegroundColor Red
            Remove-Item $PID_FILE
        }
    } else {
        Write-Host "[nemoclaw-tunnel] NOT RUNNING" -ForegroundColor Yellow
    }
}

function Start-Watchdog {
    Write-Host "[nemoclaw-tunnel] Watchdog started. Checking every 60s."
    while ($true) {
        $running = $false
        if (Test-Path $PID_FILE) {
            $pid = Get-Content $PID_FILE
            $running = [bool](Get-Process -Id $pid -ErrorAction SilentlyContinue)
        }
        if (-not $running) {
            Write-Host "[nemoclaw-tunnel] $(Get-Date): Tunnel down. Reconnecting..."
            Start-Tunnel
        }
        Start-Sleep -Seconds 60
    }
}

switch ($Action) {
    "Start"    { Start-Tunnel }
    "Stop"     { Stop-Tunnel }
    "Status"   { Get-TunnelStatus }
    "Watchdog" { Start-Watchdog }
}
