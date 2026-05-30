#!/usr/bin/env bash
# Live CPU/memory watch for the Intercom Android app (TTY dashboard).
#
# Usage:
#   ./scripts/android/cpu-watch.sh [-i 2] [--launch] [--threads]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

INTERVAL=2
LAUNCH=0
SHOW_THREADS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -i|--interval) INTERVAL="$2"; shift 2 ;;
    --launch) LAUNCH=1; shift ;;
    --threads) SHOW_THREADS=1; shift ;;
    -h|--help)
      sed -n '2,5p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown argument: $1" >&2; exit 1 ;;
  esac
done

require_adb
PID="$(ensure_app_running "$LAUNCH")"

echo "Watching $ANDROID_PACKAGE (pid=$PID) every ${INTERVAL}s — Ctrl+C to stop"
echo "device: $(device_label)  abi: $(device_prop ro.product.cpu.abi)"
echo ""
printf '%-19s %6s %6s %8s %8s\n' "TIME" "CPU%" "MEM%" "RSS" "THREADS"
printf '%-19s %6s %6s %8s %8s\n' "-------------------" "------" "------" "--------" "--------"

trap 'echo ""; exit 0' INT TERM

while true; do
  sample_process "$PID"
  printf '%-19s %6s %6s %8s %8s\n' \
    "$(local_timestamp)" \
    "${SAMPLE_CPU:-?}" \
    "${SAMPLE_MEM:-?}" \
    "${SAMPLE_RSS:-?}" \
    "${SAMPLE_THREADS:-?}"

  if [[ "$SHOW_THREADS" == "1" ]]; then
    echo "  top threads:"
    adb_cmd shell top -H -b -n 1 -d 1 -p "$PID" 2>/dev/null \
      | awk 'NR>1 && $9+0>=1.0 { printf "    %6s%%  %s\n", $9, $NF }' \
      | head -8
    echo ""
  fi

  sleep "$INTERVAL"
done
