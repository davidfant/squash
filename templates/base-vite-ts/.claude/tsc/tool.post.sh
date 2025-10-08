#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="logs/tsc.watch"
TIMEOUT_SEC=2
SLEEP_STEP=0.05

# Utility: strip ANSI control chars (just in case)
clean() { sed -E 's/\x1B\[[0-9;]*[A-Za-z]//g'; }

# --- 1️⃣  Wait for the next “Found N error(s)” summary -------------------
elapsed=0
until grep -aE 'Found [0-9]+ error' "$LOG_FILE" | clean | tail -n1 >/dev/null; do
  sleep "$SLEEP_STEP"
  elapsed=$(awk "BEGIN {print $elapsed + $SLEEP_STEP}")
  (( $(awk "BEGIN {print ($elapsed >= $TIMEOUT_SEC)}") )) && {
    echo "Timed out waiting for TypeScript watcher diagnostics" >&2
    [[ -f "$LOG_FILE" ]] && clean <"$LOG_FILE" >&2
    exit 0
  }
done

# --- 2️⃣  Pull the last summary line and extract the count ---------------
summary=$(grep -aE 'Found [0-9]+ error' "$LOG_FILE" | clean | tail -n1)
errors=$(echo "$summary" | grep -oE 'Found [0-9]+' | awk '{print $2}')

# --- 3️⃣  Decide ---------------------------------------------------------
if [[ "$errors" == "0" ]]; then
  exit 0          # silent success
else
  clean <"$LOG_FILE" >&2
  exit 2          # blocking error
fi
