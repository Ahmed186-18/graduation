# Solace Lens - Humanitarian Needs Assessment Platform

## Project info

**URL**: https://lovable.dev/projects/59f14ed1-5c2b-4ea0-8aac-114913b5b9aa

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

## Environment

Create `server/.env` for local development and set environment variables in Vercel for production:

```
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/solace_lens
JWT_SECRET=change_me
CORS_ORIGIN=http://localhost:8080
```

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

## How can I deploy this project?

For Vercel deployment, see `VERCEL_DEPLOYMENT.md` for detailed instructions.

For Lovable deployment, simply open [Lovable](https://lovable.dev/projects/59f14ed1-5c2b-4ea0-8aac-114913b5b9aa) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
