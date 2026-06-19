#!/usr/bin/env bash
# Free a TCP listen port (macOS / Linux). Used before dev:stack so uvicorn can bind.
set -u
PORT="${1:-8001}"
if ! command -v lsof >/dev/null 2>&1; then
  echo "free-port: lsof not found; skip freeing port $PORT" >&2
  exit 0
fi
PIDS=$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)
if [ -z "${PIDS}" ]; then
  exit 0
fi
echo "free-port: port $PORT in use by PID(s): $PIDS — stopping so dev API can start"
# shellcheck disable=SC2086
kill -TERM $PIDS 2>/dev/null || true
sleep 1
STILL=$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)
if [ -n "${STILL}" ]; then
  echo "free-port: still listening — SIGKILL $STILL"
  # shellcheck disable=SC2086
  kill -KILL $STILL 2>/dev/null || true
  sleep 0.5
fi
exit 0
