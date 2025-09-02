#!/usr/bin/env bash
set -euo pipefail

# Usage: ./deploy_backend.sh /path/to/backend .env
BACKEND_DIR=${1:-"/opt/ax-backend"}
ENV_FILE=${2:-".env"}

if [ ! -d "$BACKEND_DIR" ]; then
  echo "Backend dir $BACKEND_DIR not found" >&2
  exit 1
fi

cd "$BACKEND_DIR"

# Install deps and build
npm ci
npm run build

# Prisma
npx prisma generate
npx prisma migrate deploy

# Ensure env present
if [ ! -f "$ENV_FILE" ]; then
  echo ".env file $ENV_FILE not found in $BACKEND_DIR" >&2
  exit 2
fi

# Restart service
sudo systemctl restart ax-backend.service
sudo systemctl status ax-backend.service --no-pager -l
