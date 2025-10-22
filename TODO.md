# Database Integration for Vercel Deployment

## Tasks
- [x] Create `api/db.js` with Sequelize database connection (adapted from `server/src/db.ts`)
- [x] Create `api/models.js` with Sequelize model definitions (adapted from `server/src/models.ts`)
- [x] Update `api/index.js` to use database for authentication (family login, admin login)
- [x] Add password hashing/verification using bcryptjs
- [x] Update VERCEL_DEPLOYMENT.md with environment variable setup instructions

## Followup Steps
- [x] Fixed serverless database connection issue by using ensureDatabaseConnection() per request
- [ ] Deploy to Vercel and verify environment variables are set
- [ ] Test login endpoints on deployed version
