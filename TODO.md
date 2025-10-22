# TODO: Deploy to Vercel

## Tasks
- [x] Create vercel.json configuration
- [x] Create API serverless functions (health, auth/login, auth/family-login, register, cases, welcome, hello)
- [x] Remove local proxy from vite.config.ts
- [x] Create API middleware for database connection
- [x] Update package.json with vercel-build script
- [x] Create api/package.json for serverless dependencies
- [x] Create server/vercel-env.js for environment setup
- [x] Update middleware to load environment variables

## Next Steps
- [ ] Set up Vercel project and connect repository
- [ ] Configure environment variables in Vercel dashboard (DATABASE_URL, JWT_SECRET)
- [ ] Deploy the application
- [ ] Test API endpoints after deployment
- [ ] Update frontend API calls to use production URLs if needed

## Notes
- Backend has been converted to Vercel serverless functions
- Frontend proxy removed, will call /api endpoints directly
- Database connection handled in middleware
- Environment variables loaded from server/.env in development and Vercel env vars in production
