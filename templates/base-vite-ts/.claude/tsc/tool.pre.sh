#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="logs"
LOG_FILE="$LOG_DIR/tsc.watch"

# Ensure path exists and then truncate
mkdir -p "$LOG_DIR"
: >"$LOG_FILE"

exit 0