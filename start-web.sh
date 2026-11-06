#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_dir"

for required_command in node npm; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    printf 'Error: %s is required but was not found in PATH.\n' "$required_command" >&2
    exit 1
  fi
done

if [[ ! -d node_modules ]]; then
  printf 'Installing dependencies from package-lock.json...\n'
  npm ci
fi

web_host="${WEB_HOST:-127.0.0.1}"
web_port="${WEB_PORT:-5173}"

printf 'Starting the web app at http://%s:%s/\n' "$web_host" "$web_port"
exec npm run dev -- --host "$web_host" --port "$web_port"
