# Android profiling tools

Scripts to record and compare CPU/memory usage of the Capacitor Intercom app on a device connected via `adb`.

## Prerequisites

- Phone or emulator with USB debugging
- `adb` on your PATH
- App installed (`npm run android:build` + Gradle assemble, or your usual flow)

## Quick start

```bash
# Live dashboard (2s refresh)
npm run android:cpu:watch

# Record 60s to profiles/android/cpu-<device>-<timestamp>.csv
npm run android:cpu:record

# Summarize a capture
npm run android:cpu:report -- profiles/android/cpu-*.csv

# Compare baseline vs after a change
npm run android:cpu:report -- --compare profiles/android/before.csv profiles/android/after.csv

# Thread snapshot (WebView, AudioRecord, OkHttp, …)
npm run android:cpu:threads
```

## Recording workflow (before/after optimizations)

1. Join a call on the device (same scenario each run).
2. Baseline: `npm run android:cpu:record -- -d 120 --note "active call baseline"`
3. Apply your change, rebuild, reinstall APK.
4. Again: `npm run android:cpu:record -- -d 120 --note "active call after fix"`
5. `npm run android:cpu:report -- --compare profiles/android/<before>.csv profiles/android/<after>.csv`

## Options

| Script           | Flags                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| `cpu-record.sh`  | `-d` duration (default 60), `-i` interval (default 2), `-o` output path, `--launch`, `--note "..."` |
| `cpu-watch.sh`   | `-i` interval, `--launch`, `--threads` (print hot threads each tick)                                |
| `cpu-report.sh`  | `--compare` with two CSV paths                                                                      |
| `cpu-threads.sh` | `--launch`, `-n` max lines                                                                          |

## Environment

| Variable          | Default                                                 |
| ----------------- | ------------------------------------------------------- |
| `ANDROID_PACKAGE` | `com.eyevinn.intercom`                                  |
| `ANDROID_SERIAL`  | (first device) — set when multiple devices are attached |

## CSV format

Metadata lines start with `#`. Data columns:

`timestamp_local,cpu_percent,mem_percent,rss,threads`

Profiles are written under `profiles/android/` (CSV files are gitignored).
