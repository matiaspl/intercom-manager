#!/usr/bin/env bash
# One-shot snapshot of per-thread CPU for the Intercom app (WebView / audio / network).
#
# Usage:
#   ./scripts/android/cpu-threads.sh [--launch] [-n 20]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

LAUNCH=0
LIMIT=20

while [[ $# -gt 0 ]]; do
  case "$1" in
    --launch) LAUNCH=1; shift ;;
    -n) LIMIT="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,4p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown argument: $1" >&2; exit 1 ;;
  esac
done

require_adb
PID="$(ensure_app_running "$LAUNCH")"

echo "Threads for $ANDROID_PACKAGE (pid=$PID) — $(local_timestamp)"
echo "device: $(device_label)"
echo ""
adb_cmd shell top -H -b -n 1 -d 1 -p "$PID" 2>/dev/null | head -n 8
echo ""
echo "Top threads by CPU%:"
adb_cmd shell top -H -b -n 1 -d 1 -p "$PID" 2>/dev/null \
  | awk -v limit="$LIMIT" '
    NR <= 5 { next }
    {
      cpu=$(NF-3)
      if (cpu+0 < 0.5) next
      printf "%6s%%  %s\n", cpu, $NF
    }
  ' | head -n "$LIMIT"
