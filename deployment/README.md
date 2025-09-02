# AX Stock - Traditional Deployment

This folder contains scripts and configs for deploying the app on a small VPS without Docker.

Contents

- backend.service: systemd unit to run Node backend as a service
- frontend_build/: sample Nginx config + steps to serve the React build
- scripts/: helper scripts for provisioning and updates

High-level Steps

1. Provision server packages

- Node.js LTS, npm
- MySQL client (optional), unzip, curl, git
- Nginx (to serve frontend and reverse-proxy backend)

2. Backend

- Copy `backend/` to server (or clone repo on server)
- Create `.env` inside backend with DATABASE_URL, JWT_SECRET, etc.
- Run: npm ci && npm run build && npx prisma migrate deploy && npx prisma generate
- Start with systemd (backend.service included)

3. Frontend

- In `frontend/`: npm ci && npm run build
- Copy `frontend/build/` to /var/www/ax-frontend
- Enable nginx site from nginx/frontend.conf

4. Nginx

- Serves React build on port 80
- Proxies /api to backend http://127.0.0.1:3001

See files in this folder for exact configs.
