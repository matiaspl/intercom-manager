#!/usr/bin/env bash
# Shared helpers for Android device profiling scripts.

ANDROID_PACKAGE="${ANDROID_PACKAGE:-com.eyevinn.intercom}"
ADB="${ADB:-adb}"

adb_cmd() {
  if [[ -n "${ANDROID_SERIAL:-}" ]]; then
    "$ADB" -s "$ANDROID_SERIAL" "$@"
  else
    "$ADB" "$@"
  fi
}

require_adb() {
  if ! command -v "$ADB" >/dev/null 2>&1; then
    echo "error: adb not found in PATH" >&2
    exit 1
  fi
  local count
  count="$(adb_cmd devices | awk 'NR>1 && $2=="device" { c++ } END { print c+0 }')"
  if [[ "$count" -eq 0 ]]; then
    echo "error: no adb device in 'device' state (plug in phone or start emulator)" >&2
    exit 1
  fi
  if [[ "$count" -gt 1 && -z "${ANDROID_SERIAL:-}" ]]; then
    echo "warn: multiple devices; set ANDROID_SERIAL to pick one" >&2
    adb_cmd devices >&2
  fi
}

device_prop() {
  adb_cmd shell getprop "$1" 2>/dev/null | tr -d '\r'
}

device_label() {
  local model manufacturer
  model="$(device_prop ro.product.model)"
  manufacturer="$(device_prop ro.product.manufacturer)"
  echo "${manufacturer:-unknown}-${model:-device}"
}

resolve_pid() {
  local pid
  pid="$(adb_cmd shell pidof "$ANDROID_PACKAGE" 2>/dev/null | tr -d '\r' | awk '{print $1}')"
  echo "$pid"
}

launch_app() {
  adb_cmd shell monkey -p "$ANDROID_PACKAGE" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&2
}

ensure_app_running() {
  local launch="${1:-0}"
  local pid
  pid="$(resolve_pid)"
  if [[ -n "$pid" ]]; then
    echo "$pid"
    return 0
  fi
  if [[ "$launch" == "1" ]]; then
    echo "launching $ANDROID_PACKAGE ..." >&2
    launch_app
    sleep 2
    pid="$(resolve_pid)"
  fi
  if [[ -z "$pid" ]]; then
    echo "error: $ANDROID_PACKAGE is not running (use --launch or open the app)" >&2
    exit 1
  fi
  echo "$pid"
}

thread_count() {
  local pid="$1"
  adb_cmd shell "ls /proc/$pid/task 2>/dev/null | wc -l" 2>/dev/null | tr -d ' \r'
}

# Parse one `top -b -n 1 -p <pid>` process line.
# Sets: TOP_CPU TOP_MEM TOP_RSS (empty if line missing)
parse_top_line() {
  local line="$1"
  TOP_CPU=""
  TOP_MEM=""
  TOP_RSS=""
  [[ -z "$line" ]] && return 1
  TOP_CPU="$(echo "$line" | awk '{print $(NF-3)}')"
  TOP_MEM="$(echo "$line" | awk '{print $(NF-2)}')"
  TOP_RSS="$(echo "$line" | awk '{print $(NF-6)}')"
}

sample_process() {
  local pid="$1"
  local line
  line="$(adb_cmd shell top -b -n 1 -d 1 -p "$pid" 2>/dev/null | tail -1 | tr -d '\r')"
  parse_top_line "$line"
  SAMPLE_THREADS="$(thread_count "$pid")"
  SAMPLE_CPU="$TOP_CPU"
  SAMPLE_MEM="$TOP_MEM"
  SAMPLE_RSS="$TOP_RSS"
}

iso_timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

local_timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

profiles_dir() {
  local root
  root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  echo "$root/profiles/android"
}

default_output_csv() {
  local dir label
  dir="$(profiles_dir)"
  mkdir -p "$dir"
  label="$(device_label | tr ' ' '_' | tr '[:upper:]' '[:lower:]')"
  echo "$dir/cpu-${label}-$(date +%Y%m%d-%H%M%S).csv"
}
