#!/usr/bin/env bash
# Record periodic CPU/memory samples for the Intercom Android app.
#
# Usage:
#   ./scripts/android/cpu-record.sh [-d 60] [-i 2] [-o path.csv] [--launch] [--note "in call"]
#
# Environment:
#   ANDROID_PACKAGE  (default: com.eyevinn.intercom)
#   ANDROID_SERIAL   (optional adb -s target)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

DURATION=60
INTERVAL=2
OUTPUT=""
LAUNCH=0
NOTE=""

usage() {
  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--duration) DURATION="$2"; shift 2 ;;
    -i|--interval) INTERVAL="$2"; shift 2 ;;
    -o|--output) OUTPUT="$2"; shift 2 ;;
    --launch) LAUNCH=1; shift ;;
    --note) NOTE="$2"; shift 2 ;;
    -h|--help) usage 0 ;;
    *) echo "unknown argument: $1" >&2; usage 1 ;;
  esac
done

require_adb

[[ -z "$OUTPUT" ]] && OUTPUT="$(default_output_csv)"
mkdir -p "$(dirname "$OUTPUT")"

PID="$(ensure_app_running "$LAUNCH")"
DEVICE="$(device_label)"
ABI="$(device_prop ro.product.cpu.abi)"
ANDROID_VER="$(device_prop ro.build.version.release)"
SAMPLES=$(( (DURATION + INTERVAL - 1) / INTERVAL ))

{
  echo "# intercom-android-cpu-profile v1"
  echo "# package=$ANDROID_PACKAGE"
  echo "# pid=$PID"
  echo "# device=$DEVICE"
  echo "# abi=$ABI"
  echo "# android=$ANDROID_VER"
  echo "# duration_sec=$DURATION"
  echo "# interval_sec=$INTERVAL"
  echo "# note=$NOTE"
  echo "# started_utc=$(iso_timestamp)"
  echo "timestamp_local,cpu_percent,mem_percent,rss,threads"
} >"$OUTPUT"

echo "Recording $SAMPLES samples every ${INTERVAL}s → $OUTPUT" >&2
echo "  package=$ANDROID_PACKAGE pid=$PID device=$DEVICE" >&2
[[ -n "$NOTE" ]] && echo "  note=$NOTE" >&2

for ((n = 1; n <= SAMPLES; n++)); do
  sample_process "$PID"
  printf '%s,%s,%s,%s,%s\n' \
    "$(local_timestamp)" \
    "${SAMPLE_CPU:-}" \
    "${SAMPLE_MEM:-}" \
    "${SAMPLE_RSS:-}" \
    "${SAMPLE_THREADS:-}" >>"$OUTPUT"

  if [[ "$n" -lt "$SAMPLES" ]]; then
    sleep "$INTERVAL"
  fi
done

{
  echo "# ended_utc=$(iso_timestamp)"
} >>"$OUTPUT"

echo "done: $OUTPUT" >&2
echo "$OUTPUT"
