#!/usr/bin/env bash
set -euo pipefail

# Usage: ./deploy_frontend.sh /path/to/frontend
FRONTEND_DIR=${1:-"/opt/ax-frontend-src"}
DEST_DIR=${2:-"/var/www/ax-frontend"}

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "Frontend dir $FRONTEND_DIR not found" >&2
  exit 1
fi

cd "$FRONTEND_DIR"

npm ci
npm run build

sudo mkdir -p "$DEST_DIR"
sudo rsync -a --delete build/ "$DEST_DIR"/

sudo systemctl reload nginx

echo "Frontend deployed to $DEST_DIR"
