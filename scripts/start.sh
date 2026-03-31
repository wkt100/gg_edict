#!/bin/bash
cd "$(dirname "$0")/.."
echo "Starting gg_edict..."
/usr/sbin/lsof -ti :3000 | xargs kill -9 2>/dev/null
sleep 1
nohup npm run dev > /tmp/gg_edict.log 2>&1 &
sleep 3
if curl -s --connect-timeout 2 http://localhost:3000 > /dev/null; then
  echo "✅ gg_edict started on http://localhost:3000"
else
  echo "❌ Failed to start. Check /tmp/gg_edict.log"
fi
