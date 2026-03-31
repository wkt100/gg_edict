#!/bin/bash
cd "$(dirname "$0")/.."
echo "Restarting gg_edict..."
/usr/sbin/lsof -ti :3000 | xargs kill -9 2>/dev/null
sleep 1
nohup npm run dev > /tmp/gg_edict.log 2>&1 &
sleep 4
if curl -s --connect-timeout 3 http://localhost:3000 > /dev/null; then
  echo "✅ gg_edict restarted on http://localhost:3000"
else
  echo "❌ Failed to restart. Check /tmp/gg_edict.log"
fi
