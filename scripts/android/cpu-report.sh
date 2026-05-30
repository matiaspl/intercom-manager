#!/usr/bin/env bash
# Summarize one or more CPU profile CSVs; optionally compare two runs.
#
# Usage:
#   ./scripts/android/cpu-report.sh profiles/android/cpu-*.csv
#   ./scripts/android/cpu-report.sh --compare baseline.csv optimized.csv

set -euo pipefail

COMPARE=0
FILES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --compare) COMPARE=1; shift ;;
    -h|--help)
      sed -n '2,5p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) FILES+=("$1"); shift ;;
  esac
done

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "error: pass at least one .csv profile" >&2
  exit 1
fi

if [[ "$COMPARE" == "1" && ${#FILES[@]} -ne 2 ]]; then
  echo "error: --compare requires exactly two CSV files" >&2
  exit 1
fi

summarize_csv() {
  local file="$1"
  awk -F, '
    function is_num(x) { return x ~ /^[0-9]+(\.[0-9]+)?$/ }
    function sort_arr(a, n,    i, j, t) {
      for (i = 2; i <= n; i++) {
        t = a[i]
        j = i - 1
        while (j >= 1 && a[j] > t) {
          a[j + 1] = a[j]
          j--
        }
        a[j + 1] = t
      }
    }
    /^#/ {
      if ($0 ~ /^# package=/) pkg=$0
      if ($0 ~ /^# device=/) dev=$0
      if ($0 ~ /^# note=/) note=$0
      if ($0 ~ /^# duration_sec=/) dur=$0
      next
    }
    $1 == "timestamp_local" { next }
    {
      cpu=$2
      if (!is_num(cpu)) next
      n++
      sum+=cpu
      if (n==1 || cpu<min) min=cpu
      if (n==1 || cpu>max) max=cpu
      a[n]=cpu+0
      if (cpu >= 25) hi25++
      if (cpu >= 50) hi50++
      if (cpu >= 80) hi80++
    }
    END {
      if (n==0) {
        print "  (no numeric samples)"
        exit
      }
      sort_arr(a, n)
      p50=a[int((n+1)/2)]
      p95=a[int(n*0.95+0.5)]
      if (p95 < 1) p95=a[n]
      avg=sum/n
      printf "  file: %s\n", FILENAME
      if (pkg!="") printf "  %s\n", pkg
      if (dev!="") printf "  %s\n", dev
      if (note!="") printf "  %s\n", note
      if (dur!="") printf "  %s\n", dur
      printf "  samples: %d\n", n
      printf "  cpu%%  avg=%.1f  min=%.1f  p50=%.1f  p95=%.1f  max=%.1f\n", avg, min, p50, p95, max
      printf "  spikes: >=25%%=%d  >=50%%=%d  >=80%%=%d\n", hi25+0, hi50+0, hi80+0
    }
  ' "$file"
}

if [[ "$COMPARE" == "1" ]]; then
  echo "=== Baseline ==="
  summarize_csv "${FILES[0]}"
  echo ""
  echo "=== Candidate ==="
  summarize_csv "${FILES[1]}"
  echo ""
  echo "=== Delta (candidate − baseline avg) ==="
  awk -F, -v f1="${FILES[0]}" -v f2="${FILES[1]}" '
    function avg_cpu(file,    n, sum, cpu) {
      while ((getline line < file) > 0) {
        split(line, c, ",")
        if (line ~ /^#/ || line ~ /^timestamp/) continue
        cpu=c[2]
        if (cpu !~ /^[0-9]+(\.[0-9]+)?$/) continue
        n++
        sum+=cpu+0
      }
      close(file)
      if (n==0) return -1
      return sum/n
    }
    BEGIN {
      a=avg_cpu(f1)
      b=avg_cpu(f2)
      if (a<0 || b<0) { print "  unable to compare (missing samples)"; exit }
      printf "  avg cpu%%: %.1f → %.1f (%+.1f)\n", a, b, b-a
    }
  '
else
  for f in "${FILES[@]}"; do
    echo "=== $(basename "$f") ==="
    summarize_csv "$f"
    echo ""
  done
fi
