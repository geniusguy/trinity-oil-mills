#!/bin/bash
# Run this ON THE SERVER from the app root (e.g. /var/www/trinityoil-api or /var/www/trinityoil-api/oil-shop-web)
# Fixes the "> 2 seconds" JSX parse error in admin/performance page.
# Usage: cd /var/www/trinityoil-api && bash scripts/fix-server-build.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# App root: parent of scripts/
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

echo "[fix] App root: $ROOT"

# 1. Fix admin/performance page - "> 2 seconds" must be "{'>'} 2 seconds" in JSX
PERF="$ROOT/src/app/admin/performance/page.tsx"
if [ -f "$PERF" ]; then
  if grep -q '> 2 seconds' "$PERF" 2>/dev/null; then
    sed -i.bak 's/> 2 seconds/{'\''>'\''} 2 seconds/g' "$PERF" 2>/dev/null || true
    # Fallback for macOS
    if grep -q '> 2 seconds' "$PERF" 2>/dev/null; then
      sed -i '' 's/> 2 seconds/{'\''>'\''} 2 seconds/g' "$PERF" 2>/dev/null || true
    fi
    echo "[fix] Updated: $PERF"
  else
    echo "[fix] OK (already fixed or different): $PERF"
  fi
else
  echo "[fix] Not found: $PERF"
fi

echo ""
echo "If you still see SecurityEventType / SecuritySeverity or orderStatusHistory / productionBatches errors,"
echo "copy these files from your LOCAL oil-shop-web to the server (overwrite):"
echo "  - src/config/security.ts"
echo "  - src/db/schema.ts"
echo ""
echo "Then run: npm run build"
