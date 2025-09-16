#!/usr/bin/env bash
set -euo pipefail

# List all Fly.io apps, skip the header line, and extract just the app names
apps=$(flyctl apps list --json | jq -r '.[].Name')

for app in $apps; do
  if [[ "$app" == "squash-template" ]]; then
    echo "Skipping $app"
  else
    echo "Deleting $app..."
    flyctl apps destroy "$app" --yes
  fi
done
