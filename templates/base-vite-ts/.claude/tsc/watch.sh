#!/usr/bin/env sh
set -eu  # exit on error / unset vars

LOG_DIR="logs"
LOG_FILE="$LOG_DIR/tsc.watch"

# Create the log directory and start with a clean file
mkdir -p "$LOG_DIR"
: >"$LOG_FILE"

# Replace this shell with the tsc watcher, piping both stdout and stderr
# into the log file.  Because we use `exec`, there’s no child process and
# thus no need for a PID file or manual cleanup.
exec pnpm tsc --noEmit --watch --preserveWatchOutput >>"$LOG_FILE" 2>&1
