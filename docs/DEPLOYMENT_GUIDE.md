# EduMatch Deployment Guide

This guide prepares EduMatch for a real online deployment while keeping local development unchanged.

## 1. Recommended Hosting

- Frontend: Vercel
- Backend: Render or Railway
- Database: Neon or Supabase PostgreSQL

Use hosted PostgreSQL for production. Do not use local PostgreSQL for production.

## 2. Database Deployment

1. Create a PostgreSQL database on Neon or Supabase.
2. Copy the production connection string.
3. Use it as the backend `DATABASE_URL`.
4. Run migrations against the hosted database:

```bash
alembic upgrade head
```

Production format:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Some providers may show a URL starting with `postgres://`. The backend normalizes that format, but `postgresql://` is preferred in environment variables and docs.

Never commit the database password or production connection string.

## 3. Backend Deployment

Use Render or Railway.

Backend root directory:

```txt
backend
```

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

If the Railway service root is the repository root instead of `backend`, use the included root `railway.json`.
It installs backend dependencies with:

```bash
cd backend && pip install -r requirements.txt
```

and starts the API with:

```bash
cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Required backend environment variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
SECRET_KEY=your_strong_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_URL=https://your-frontend-domain.vercel.app
CORS_ORIGINS=https://your-frontend-domain.vercel.app,http://localhost:5173
PAYMOB_API_KEY=your_paymob_test_api_key
PAYMOB_INTEGRATION_ID=your_paymob_integration_id
PAYMOB_IFRAME_ID=your_paymob_iframe_id
PAYMOB_HMAC_SECRET=your_paymob_hmac_secret
```

Notes:

- `SECRET_KEY` must be a strong random value.
- `FRONTEND_URL` should match the deployed Vercel domain exactly.
- `CORS_ORIGINS` supports comma-separated origins.
- Keep local origins in `CORS_ORIGINS` only if you need local frontend to call the deployed backend during testing.
- Paymob iframe checkout uses `httpx`, which is declared in `backend/requirements.txt`.
- If any Paymob iframe environment variable is set, the backend validates the full Paymob iframe configuration during startup.
- Do not commit Paymob keys or HMAC secrets.

Health check endpoint:

```txt
/health
```

Expected response:

```json
{"status":"ok","app":"EduMatch API"}
```

API docs endpoint:

```txt
/docs
```

## 4. Frontend Deployment

Use Vercel.

Frontend root directory:

```txt
frontend/EduMatch
```

Build command:

```bash
npm install && npm run build
```

Output directory:

```txt
dist
```

Required frontend environment variable:

```env
VITE_API_BASE_URL=https://your-backend-domain.com
```

The frontend uses Vite, so environment variables exposed to the browser must start with `VITE_`.

React Router refresh support is configured in:

```txt
frontend/EduMatch/vercel.json
```

It rewrites all routes to `index.html`, so direct refreshes like `/student/dashboard` and `/admin/users` work on Vercel.

## 5. Run Migrations on Production

Run migrations once after setting the production backend environment variables.

On Render or Railway, open a shell or one-time command in the backend service and run:

```bash
alembic upgrade head
```

Do not automatically run migrations on every server start unless the team explicitly chooses that deployment strategy later.

## 6. Create First Admin

Public admin registration remains blocked. Create the first admin manually with the script.

Set these environment variables:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_FULL_NAME=EduMatch Admin
ADMIN_PASSWORD=secure_password_here
```

Then run:

```bash
python scripts/create_admin.py
```

Windows PowerShell example:

```powershell
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_FULL_NAME="EduMatch Admin"
$env:ADMIN_PASSWORD="secure_password_here"
python scripts/create_admin.py
```

Use a strong password. Do not commit the admin password. The script hashes the password and does not print the password or password hash.

## 7. Post-Deployment Checklist

- Backend `/health` works.
- Backend `/docs` works.
- Frontend opens on Vercel.
- `VITE_API_BASE_URL` points to the deployed backend.
- Backend `FRONTEND_URL` points to the deployed frontend.
- CORS does not block frontend requests.
- Register/login works.
- Admin login works.
- `/admin/dashboard` works.
- `/admin/users` works for admin and is blocked for students/instructors.
- Normal request flow works.
- Group request flow works.
- Instant request flow works.
- Payment simulation works.
- Chat works.
- Notifications work.

## Manual Deployment Order

1. Create the hosted PostgreSQL database.
2. Copy the database URL and set backend environment variables.
3. Deploy the backend on Render or Railway.
4. Run `alembic upgrade head` against production.
5. Check backend `/health` and `/docs`.
6. Create the first admin with `python scripts/create_admin.py`.
7. Deploy the frontend on Vercel.
8. Set `VITE_API_BASE_URL` to the backend URL.
9. Check frontend login and role-based dashboards.
10. Test normal, group, instant, payment, chat, notification, and admin flows.
