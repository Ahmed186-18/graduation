# Vercel Deployment Guide for Solace Lens

## Project Structure
This project is now configured for Vercel deployment with the following structure:

- **Frontend**: React + Vite application (builds to `dist/`)
- **Backend**: Express.js API routes in `api/` directory
- **Configuration**: `vercel.json` handles routing and build settings

## Deployment Steps

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
vercel
```

### 4. Environment Variables
Set these environment variables in your Vercel dashboard:

#### Required Environment Variables:
- `NODE_ENV=production`
- `DATABASE_URL` (if using a database)
- `JWT_SECRET` (for authentication)
- `CORS_ORIGIN` (your Vercel domain)

#### Optional Environment Variables:
- `PORT` (defaults to 3000)
- Any other environment variables your application needs

### 5. Custom Domain (Optional)
- Go to your Vercel dashboard
- Select your project
- Go to Settings > Domains
- Add your custom domain

## API Endpoints

The following API endpoints are available:

- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/register` - User registration
- `GET /api/cases` - Get cases (placeholder)

## Build Configuration

- **Frontend Build**: Uses Vite to build React app to `dist/`
- **API Functions**: Each file in `api/` becomes a serverless function
- **Routing**: All `/api/*` requests go to API functions, everything else serves the React app

## Development vs Production

- **Development**: Run `npm run dev` for local development
- **Production**: Deploy to Vercel for production hosting

## Troubleshooting

1. **Build Errors**: Check that all dependencies are in `package.json`
2. **API Errors**: Verify API functions are properly exported
3. **CORS Issues**: Update CORS origins in API functions
4. **Environment Variables**: Ensure all required env vars are set in Vercel dashboard
