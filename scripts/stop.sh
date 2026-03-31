#!/bin/bash
cd "$(dirname "$0")/.."
echo "Stopping gg_edict..."
pids=$(/usr/sbin/lsof -ti :3000 2>/dev/null)
if [ -n "$pids" ]; then
  echo "$pids" | xargs kill -9 2>/dev/null
  echo "✅ gg_edict stopped (PID: $pids)"
else
  echo "⚠️  No process found on port 3000"
fi
