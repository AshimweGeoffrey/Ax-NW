# AX

Full‑stack inventory and sales management system. Backend: Express + TypeScript + Prisma (MySQL). Frontend: React + TypeScript + MUI. Dockerized for local development. Timezone aligned to Africa/Kigali. Currency displayed as RWF.

## Contents

- Stack
- Features
- Screens
- Quick start (Docker)
- Manual setup (local dev)
- Environment variables
- API and URLs
- RBAC
- Project structure
- Troubleshooting

## Stack

- Backend
  - Node.js 18, Express, TypeScript
  - Prisma ORM (MySQL 8), mysql2
  - JWT auth (access + refresh), Helmet, CORS, Compression, Morgan
  - Validation with Zod/Joi
  - Socket.IO (in app, ready for realtime use)
  - Swagger (dev only)
- Frontend
  - React 18 + TypeScript, React Router v6
  - Material UI (MUI v5), Recharts
  - Axios (interceptors), Zustand (auth + notifications)
  - react‑hot‑toast
- Dev/Infra
  - Docker Compose: mysql, backend, frontend
  - Nginx config included for production (folder `nginx/`)
  - No Redis (removed)

## Features

- Authentication + RBAC
  - JWT login/logout; protected routes
  - Roles: Administrator and standard users (staff)
- Inventory
  - CRUD, category assignment
  - Update quantity via positive increment; admin‑only destructive edits/deletes
  - Tracks recent_entry and recent_entry_at
- Sales
  - CRUD with payment methods: Cash, Mobile Money, Card
  - RWF currency formatting everywhere
- Outgoing stock
  - Record and list outgoing movements; admin‑only delete
- Categories, Branches, Users basic management
- Analytics
  - Weekly (Mon–Sun) normalization, items_count and revenue
  - Excel export for reports
- Notices
  - Post/read notices using the remark table
- Timezone
  - Server and DB aligned to Africa/Kigali (+02:00)
- Notification Center (Dashboard)
  - Captures all toast messages and persists in the browser (localStorage)
  - Filter by type; mobile‑friendly header (title/bell hidden on small screens; counter hidden on xs)
- UI/UX
  - Dark accent color #40c793; responsive pages; polished tables/forms

## Screens

- Login
- Dashboard: KPIs, Quick Actions, Low Stock, Notification Center
- Inventory: list, create, adjust (increment), delete (admin‑only)
- Sales: create and list; summary endpoints power KPIs
- Outgoing: record and list; delete (admin‑only)
- Analytics: weekly trends (admin‑only)
- Notices: post and view

## Quick start (Docker)

Prereqs: Docker + Docker Compose.

```bash
# From project root
./setup.sh
# Then visit
# Frontend: http://localhost:3000
# API:      http://localhost:3001
# Swagger:  http://localhost:3001/api-docs
# Health:   http://localhost:3001/health
```

Default credentials

- Username: admin
- Password: admin123

The compose stack runs:

- mysql (port 3306)
- backend (port 3001)
- frontend (port 3000)

## Manual setup (local dev)

Prereqs: Node.js 18+, MySQL 8+.

1. Environment

- Copy and edit `.env` in project root (or run `./setup.sh` to generate one)
- Ensure backend `.env` exists as well (created by you or the script)

2. Backend

```bash
cd backend
npm install
npx prisma generate
# create DB and run migrations
npx prisma migrate deploy
# optional: seed
npx prisma db seed
npm run dev
```

3. Frontend

```bash
cd frontend
npm install
npm start
```

## Environment variables

Common (root or backend/.env)

- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- DATABASE_URL (Prisma)
- JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN
- NODE_ENV, PORT, FRONTEND_URL, API_VERSION (default v1)
- MAX_FILE_SIZE, UPLOAD_PATH
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (optional notices/mail)
- TZ/APP_TZ and DB_TZ_OFFSET are set via Docker to Africa/Kigali

Frontend

- REACT_APP_API_URL (e.g. http://localhost:3001/api/v1)
- REACT_APP_WS_URL (e.g. ws://localhost:3001)

Note: Redis was removed; no REDIS_URL is required.

## API and URLs

Base URL: `http://localhost:3001/api/v1`

- Auth: `/auth`
- Inventory: `/inventory`
- Sales: `/sales`
- Outgoing: `/outgoing`
- Analytics: `/analytics` (admin‑only)
- Users: `/users`
- Categories: `/categories`
- Branches: `/branches`
- Notices: `/remarks`
  Docs (dev): `http://localhost:3001/api-docs`

## RBAC

- Administrator: full access (including delete and admin analytics)
- Standard users: restricted (cannot perform destructive operations on inventory/outgoing; analytics access limited)

## Project structure

```
.
├─ docker-compose.yml
├─ setup.sh
├─ backend/
│  ├─ Dockerfile
│  ├─ package.json
│  ├─ prisma/
│  │  └─ schema.prisma
│  └─ src/
│     ├─ app.ts
│     ├─ routes/ (auth, inventory, sales, outgoing, analytics, users, branches, categories, remarks)
│     ├─ middleware/ (auth, errorHandler, notFound, requestLogger)
│     └─ utils/ (database, logger, socketIO)
├─ frontend/
│  ├─ Dockerfile
│  ├─ package.json
│  └─ src/
│     ├─ pages/ (Dashboard, Inventory, Sales, Outgoing, Analytics, Notices, auth/Login)
│     ├─ services/ (api, inventory, sales, outgoing, categories, remarks)
│     ├─ store/ (authStore, notificationStore)
│     └─ components/, utils/
└─ nginx/
   ├─ nginx.conf
   └─ frontend.conf
```

## Troubleshooting

- File watcher limits (Linux): if you hit ENOSPC while running dev servers
  - Increase inotify watches: `echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p`
  - Or run with polling: `CHOKIDAR_USEPOLLING=true`
- Timezone: ensure host and containers use Africa/Kigali to keep dates consistent
- Ports in use: stop conflicting services or change exposed ports in docker‑compose

## Docker (external MySQL)

This compose runs frontend and backend only. Point DATABASE*URL (and DB*\* vars) to your external MySQL 8 instance.

1. Prepare env in project root `.env`:

```
DB_HOST=your.mysql.host
DB_PORT=3306
DB_NAME=AX_STOCK_ALX_PROJECT1
DB_USER=ax_user
DB_PASSWORD=your_password
DATABASE_URL="mysql://ax_user:your_password@your.mysql.host:3306/AX_STOCK_ALX_PROJECT1"
API_VERSION=v1
```

2. Start containers

```
docker-compose up -d --build
```

3. Run migrations/seeds (inside backend container)

```
docker-compose exec backend npx prisma migrate deploy
# optional
docker-compose exec backend npx prisma db seed
```

---

This README reflects the current codebase: no Redis, Docker dev stack with MySQL + Backend + Frontend, RBAC in place, weekly analytics (Mon–Sun), RWF currency, Recent Entry fields, Notices, and a browser‑persisted Notification Center on the Dashboard.
