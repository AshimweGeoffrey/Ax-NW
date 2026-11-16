#!/usr/bin/env bash
# AX one-command Docker setup: MySQL (seeded from AX_STOCK.sql) + backend + frontend.
set -euo pipefail
cd "$(dirname "$0")"

command -v docker >/dev/null || { echo "Docker is required"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 is required"; exit 1; }

mkdir -p backend/logs backend/uploads

if [ ! -f .env ]; then
  cp .env.example .env
  sed -i.bak "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/; s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$(openssl rand -hex 32)/" .env && rm -f .env.bak
  echo "Created .env with fresh JWT secrets"
fi

docker compose up -d --build

echo "Waiting for API..."
for _ in $(seq 1 60); do
  curl -fs http://localhost:3001/health >/dev/null 2>&1 && break
  sleep 3
done

cat <<MSG

Frontend: http://localhost:3000
API:      http://localhost:3001  (docs: /api-docs, health: /health)
Sample users from the dump all use password: ChangeMe123!  (change it!)
Create a fresh admin:  docker compose exec backend npm run db:seed
Logs: docker compose logs -f   Stop: docker compose down   Reset DB: docker compose down -v
MSG
