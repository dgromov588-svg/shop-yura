#!/usr/bin/env bash
# ==================================================================
#  КРОК 1 · ВСТАНОВЛЕННЯ (macOS / Linux, один раз)
#     bash install.sh
#  Далі: змінили сайт → bash deploy.sh
# ==================================================================
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "▸ Встановлюю Node.js (програма для збірки сайту)…"
    brew install node
  else
    echo "✗ Встановіть Node.js (версія LTS) з https://nodejs.org і запустіть ще раз."
    exit 1
  fi
fi

chmod +x deploy.sh 2>/dev/null || true
exec node deploy.mjs --setup "$@"
