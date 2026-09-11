#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js needs to be installed first."
  echo
  echo "  1. Go to https://nodejs.org"
  echo "  2. Click the big download button and run the installer"
  echo "  3. Double-click this Setup file again"
  echo
  read -n 1 -s -r -p "Press any key to close…"
  exit 1
fi

node scripts/setup.mjs
