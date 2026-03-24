#!/usr/bin/env bash
#
# NemoClaw Reverse SSH Tunnel — Persistent Connection to VPS
#
# Keeps a reverse TCP tunnel alive so you can reach NemoClaw
# from your phone anywhere (gym, coffee shop, etc.)
#
# Setup (one-time):
#   1. Get a VPS ($4/mo DO, or free Oracle Cloud)
#   2. ssh-keygen -t ed25519 -f ~/.ssh/nemoclaw_key -N ""
#   3. ssh-copy-id -i ~/.ssh/nemoclaw_key user@your-vps-ip
#   4. Copy this script and set VPS_HOST below
#   5. On VPS: edit /etc/ssh/sshd_config, add:
#        GatewayPorts yes          # Allow remote port binding
#        ClientAliveInterval 30    # Server pings client every 30s
#        ClientAliveCountMax 3     # Kill after 3 missed pings
#      Then: sudo systemctl restart sshd
#
# Usage:
#   ./scripts/nemoclaw-tunnel.sh              # Start tunnel
#   ./scripts/nemoclaw-tunnel.sh --stop       # Stop tunnel
#   ./scripts/nemoclaw-tunnel.sh --status     # Check if running
#
# Then on phone: http://YOUR_VPS_IP:3100/nemoclaw?token=YOUR_TOKEN
#

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────
VPS_HOST="${NEMOCLAW_VPS_HOST:-your-vps-ip}"
VPS_USER="${NEMOCLAW_VPS_USER:-root}"
VPS_PORT="${NEMOCLAW_VPS_PORT:-22}"
SSH_KEY="${NEMOCLAW_SSH_KEY:-$HOME/.ssh/nemoclaw_key}"
LOCAL_PORT="${NEMOCLAW_LOCAL_PORT:-3100}"
REMOTE_PORT="${NEMOCLAW_REMOTE_PORT:-3100}"
PID_FILE="/tmp/nemoclaw_tunnel.pid"
LOG_FILE="/tmp/nemoclaw_tunnel.log"

# ── Functions ──────────────────────────────────────────────────────

start_tunnel() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "[nemoclaw-tunnel] Already running (PID $(cat "$PID_FILE"))"
    echo "[nemoclaw-tunnel] Access: http://$VPS_HOST:$REMOTE_PORT/nemoclaw"
    return 0
  fi

  if [ "$VPS_HOST" = "your-vps-ip" ]; then
    echo "[nemoclaw-tunnel] ERROR: Set VPS_HOST in this script or export NEMOCLAW_VPS_HOST"
    echo ""
    echo "  export NEMOCLAW_VPS_HOST=123.45.67.89"
    echo "  export NEMOCLAW_VPS_USER=root"
    echo "  ./scripts/nemoclaw-tunnel.sh"
    exit 1
  fi

  if [ ! -f "$SSH_KEY" ]; then
    echo "[nemoclaw-tunnel] SSH key not found at $SSH_KEY"
    echo "[nemoclaw-tunnel] Generating one..."
    ssh-keygen -t ed25519 -f "$SSH_KEY" -N "" -C "nemoclaw-tunnel"
    echo ""
    echo "[nemoclaw-tunnel] Now copy the key to your VPS:"
    echo "  ssh-copy-id -i $SSH_KEY $VPS_USER@$VPS_HOST"
    echo ""
    echo "Then run this script again."
    exit 1
  fi

  echo "[nemoclaw-tunnel] Starting reverse tunnel..."
  echo "[nemoclaw-tunnel] localhost:$LOCAL_PORT → $VPS_HOST:$REMOTE_PORT"

  # SSH reverse tunnel with keepalive
  # -f: background after auth
  # -N: no remote command
  # -T: no TTY
  # -R: reverse tunnel
  # ServerAliveInterval: client pings server every 30s
  # ServerAliveCountMax: reconnect after 3 missed pings (90s)
  # ExitOnForwardFailure: fail if port is already bound
  ssh -f -N -T \
    -i "$SSH_KEY" \
    -p "$VPS_PORT" \
    -o "ServerAliveInterval=30" \
    -o "ServerAliveCountMax=3" \
    -o "ExitOnForwardFailure=yes" \
    -o "StrictHostKeyChecking=accept-new" \
    -o "ConnectTimeout=10" \
    -R "0.0.0.0:$REMOTE_PORT:localhost:$LOCAL_PORT" \
    "$VPS_USER@$VPS_HOST" \
    2>"$LOG_FILE"

  # Find the SSH PID
  local pid
  pid=$(pgrep -f "ssh.*-R.*$REMOTE_PORT:localhost:$LOCAL_PORT.*$VPS_HOST" | tail -1)

  if [ -n "$pid" ]; then
    echo "$pid" > "$PID_FILE"
    echo "[nemoclaw-tunnel] Connected! PID $pid"
    echo ""
    echo "  Phone access:  http://$VPS_HOST:$REMOTE_PORT/nemoclaw?token=\$NEMOCLAW_TOKEN"
    echo "  WebSocket:     ws://$VPS_HOST:$REMOTE_PORT/nemoclaw/ws?token=\$NEMOCLAW_TOKEN"
    echo "  Screenshot:    http://$VPS_HOST:$REMOTE_PORT/nemoclaw/screen"
    echo ""
    echo "  Stop:   ./scripts/nemoclaw-tunnel.sh --stop"
    echo "  Status: ./scripts/nemoclaw-tunnel.sh --status"
  else
    echo "[nemoclaw-tunnel] ERROR: Failed to start tunnel. Check $LOG_FILE"
    cat "$LOG_FILE"
    exit 1
  fi
}

stop_tunnel() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      rm -f "$PID_FILE"
      echo "[nemoclaw-tunnel] Stopped (PID $pid)"
    else
      rm -f "$PID_FILE"
      echo "[nemoclaw-tunnel] PID $pid already dead. Cleaned up."
    fi
  else
    # Try to find and kill any running tunnel
    local pid
    pid=$(pgrep -f "ssh.*-R.*$REMOTE_PORT:localhost:$LOCAL_PORT" 2>/dev/null | tail -1)
    if [ -n "$pid" ]; then
      kill "$pid"
      echo "[nemoclaw-tunnel] Stopped orphaned tunnel (PID $pid)"
    else
      echo "[nemoclaw-tunnel] No tunnel running."
    fi
  fi
}

status_tunnel() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "[nemoclaw-tunnel] RUNNING (PID $(cat "$PID_FILE"))"
    echo "  Target: $VPS_HOST:$REMOTE_PORT → localhost:$LOCAL_PORT"
    echo "  Access: http://$VPS_HOST:$REMOTE_PORT/nemoclaw"
  else
    echo "[nemoclaw-tunnel] NOT RUNNING"
    [ -f "$PID_FILE" ] && rm -f "$PID_FILE"
  fi
}

# ── Watchdog (auto-reconnect) ──────────────────────────────────────
#
# Run as: ./scripts/nemoclaw-tunnel.sh --watchdog &
#
# Checks every 60s if the tunnel is alive. Reconnects if dead.
# Combined with SSH keepalive, this handles:
#   - WiFi changes
#   - Laptop sleep/wake
#   - VPS restarts
#   - Network blips
#
watchdog() {
  echo "[nemoclaw-tunnel] Watchdog started. Checking every 60s."
  while true; do
    if [ ! -f "$PID_FILE" ] || ! kill -0 "$(cat "$PID_FILE" 2>/dev/null)" 2>/dev/null; then
      echo "[nemoclaw-tunnel] $(date): Tunnel down. Reconnecting..."
      start_tunnel
    fi
    sleep 60
  done
}

# ── Main ───────────────────────────────────────────────────────────

case "${1:-}" in
  --stop)     stop_tunnel ;;
  --status)   status_tunnel ;;
  --watchdog) watchdog ;;
  *)          start_tunnel ;;
esac
