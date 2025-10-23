# Humanitarian Needs Assessment Platform

## Development

Run the app locally (client + server):

```bash
npm install
# ensure PostgreSQL is running and DATABASE_URL is configured (defaults to postgres://postgres:postgres@localhost:5432/solace_lens)
npm run dev
```

The client runs on http://localhost:8080 and proxies API requests to http://localhost:4000.

## Stack

Frontend: React + Vite + shadcn-ui + Tailwind CSS

Backend: Node.js (Express) with PostgreSQL (Sequelize ORM) for database integration

## API Endpoints

- GET `/api/health` – Health check
- POST `/api/auth/login` – Login for institutions/admins
- POST `/api/auth/family-login` – Login for families (with ID number)
- POST `/api/register` – User registration (placeholder)
- GET `/api/cases` – List cases (placeholder)

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
