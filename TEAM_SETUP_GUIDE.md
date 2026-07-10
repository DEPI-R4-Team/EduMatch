# EduMatch Team Setup Guide

## 1. Prerequisites

Install these tools before running the project:

- Git
- Node.js LTS
- npm
- Python 3.12 recommended
- PostgreSQL 17 or compatible
- VS Code or preferred editor

## 2. Clone the Repository

```cmd
git clone <REPOSITORY_URL>
cd LinkedWith
```

Replace `<REPOSITORY_URL>` with the real GitHub repository URL.

## 3. Project Structure

Important folders:

```txt
backend/
frontend/EduMatch/
docs/
```

- `backend/` contains the FastAPI API, SQLAlchemy models, routers, services, schemas, and Alembic migrations.
- `frontend/EduMatch/` contains the React/Vite frontend.
- `docs/` contains project documentation.

## 4. Backend Setup

Go to the backend folder:

```cmd
cd backend
```

Create and activate a virtual environment:

```cmd
python -m venv .venv
.venv\Scripts\activate
```

Install backend dependencies:

```cmd
python -m pip install -r requirements.txt
```

Verify the Paymob HTTP client dependency is installed in the same virtual environment:

```cmd
python -c "import httpx; print(httpx.__version__)"
```

## 5. PostgreSQL Setup

Install PostgreSQL, then create a local database named `edumatch`.

Using `psql`:

```cmd
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE edumatch;"
```

If the database already exists, PostgreSQL may show an error. That is fine; continue if `edumatch` already exists.

You can also create the database manually in pgAdmin:

- Open pgAdmin.
- Connect to your local PostgreSQL server.
- Right-click `Databases`.
- Choose `Create` then `Database`.
- Name it `edumatch`.
- Save.

## 6. Backend Environment File

Create `backend/.env` from the example file:

```cmd
copy .env.example .env
```

Open `backend/.env` and set your local values.

Use this `DATABASE_URL` format:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/edumatch
```

Do not commit `.env`.

Do not share real passwords in GitHub, chat, screenshots, or documentation.

## 7. Run Database Migrations

From the `backend` folder, run:

```cmd
alembic upgrade head
```

This creates/updates the required PostgreSQL tables.

## 8. Start the Backend

From the `backend` folder:

```cmd
python -m uvicorn app.main:app --reload
```

Backend URLs:

- Health check: `http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`

## 9. Frontend Setup

Open a new terminal and go to the frontend folder:

```cmd
cd frontend\EduMatch
```

Install frontend dependencies:

```cmd
npm install
```

Create a frontend environment file if needed:

```cmd
copy .env.example .env
```

Set the API URL:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 10. Start the Frontend

From `frontend/EduMatch`:

```cmd
npm.cmd run dev
```

The frontend usually runs at:

```txt
http://localhost:5173
```

If that port is busy, Vite may choose another port. Use the URL shown in the terminal.

## 11. Recommended Local Run Order

1. Start PostgreSQL.
2. Start backend:

```cmd
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload
```

3. Start frontend in a second terminal:

```cmd
cd frontend\EduMatch
npm.cmd run dev
```

4. Open the frontend URL in the browser.

## 12. Testing the Setup

Backend:

- Visit `http://localhost:8000/health`
- Visit `http://localhost:8000/docs`

Frontend:

- Visit `http://localhost:5173`
- Register or login with a test account.
- Test student, instructor, and admin routes using valid accounts.

## 13. Common Commands

Backend compile check:

```cmd
cd backend
python -m compileall app alembic
```

Frontend production build:

```cmd
cd frontend\EduMatch
npm.cmd run build
```

Apply latest migrations:

```cmd
cd backend
alembic upgrade head
```

## 14. Important Notes for Teammates

- Do not commit `.env`.
- Do not hardcode real passwords.
- Do not add fake/mock data to production pages.
- Do not delete migrations.
- Do not reset the shared database without asking the team.
- Payments are simulated only.
- Instant Requests are future work and are not completed yet.
- WebSockets, push notifications, email notifications, SMS notifications, deployment, and real payment gateways are not part of the current completed MVP.

## 15. Troubleshooting

If backend cannot connect to PostgreSQL:

- Make sure PostgreSQL is running.
- Make sure the `edumatch` database exists.
- Check `DATABASE_URL` in `backend/.env`.
- Make sure the password is correct.

If frontend cannot call the API:

- Make sure backend is running on `http://localhost:8000`.
- Check `VITE_API_BASE_URL` in the frontend `.env`.
- Restart the Vite dev server after editing `.env`.

If migrations fail:

- Confirm you are inside the `backend` folder.
- Confirm the virtual environment is activated.
- Confirm `DATABASE_URL` points to the correct PostgreSQL database.
