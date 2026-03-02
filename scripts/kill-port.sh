#!/usr/bin/env bash
# Free PORT by stopping PM2 (so it does not restart) then killing any process on the port.
# Use with Doppler: doppler run -- ./scripts/kill-port.sh   or   PORT=3004 ./scripts/kill-port.sh
set -e
PORT="${PORT:-$1}"
if [[ -z "$PORT" ]]; then
  echo "Usage: PORT=<port> ./scripts/kill-port.sh   or   doppler run -- ./scripts/kill-port.sh"
  echo "  (Doppler sets PORT per config: dev=3004, stg=3003, prd=3002)"
  exit 1
fi
if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
  echo "Invalid port: $PORT"
  exit 1
fi

# Stop PM2 app that uses this port so it does not respawn after we kill the process
if command -v pm2 &>/dev/null; then
  case "$PORT" in
    3004) pm2 stop aibizbot-dev.gatewayglobal.ai 2>/dev/null && echo "Stopped PM2 app aibizbot-dev.gatewayglobal.ai" || true ;;
    3003) pm2 stop aibizbot-stage.gatewayglobal.ai 2>/dev/null && echo "Stopped PM2 app aibizbot-stage.gatewayglobal.ai" || true ;;
    3002) pm2 stop aibizbot.gatewayglobal.ai 2>/dev/null && echo "Stopped PM2 app aibizbot.gatewayglobal.ai" || true ;;
    *) ;;
  esac
fi

PID=""
if command -v lsof &>/dev/null; then
  PID=$(lsof -ti ":$PORT" 2>/dev/null || true)
fi
if [[ -n "$PID" ]]; then
  echo "Killing process(es) on port $PORT: $PID"
  kill -9 $PID 2>/dev/null || true
  echo "Done."
elif command -v fuser &>/dev/null; then
  if fuser "$PORT/tcp" &>/dev/null; then
    fuser -k "$PORT/tcp" 2>/dev/null || true
    echo "Done (fuser)."
  else
    echo "No process found on port $PORT."
  fi
else
  echo "No process found on port $PORT (or install lsof/fuser to detect)."
fi
