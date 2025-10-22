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

Backend: Node.js (Express), PostgreSQL (Sequelize ORM)

## Environment

Create `server/.env` based on:

```
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/solace_lens
JWT_SECRET=change_me
```

## API Endpoints (early)

- POST `/api/register` – submit family registration
- POST `/api/auth/login` – login for institutions/admins
- GET `/api/cases` – list cases (filtering to be added)

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/59f14ed1-5c2b-4ea0-8aac-114913b5b9aa) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
