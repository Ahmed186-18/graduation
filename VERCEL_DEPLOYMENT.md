# Vercel Deployment Guide for Solace Lens

## Project Structure
This project is configured for Vercel deployment of the frontend only. The backend is handled separately.

- **Frontend**: React + Vite application (builds to `dist/`)
- **Backend**: Express.js server in `server/` directory (deploy separately, e.g., to Heroku, Railway, or another platform)
- **Configuration**: `vercel.json` handles routing and build settings for the frontend

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
Set these environment variables in your Vercel dashboard if needed for the frontend (e.g., API base URL):

#### Optional Environment Variables:
- `VITE_API_BASE_URL` (URL of your separately deployed backend, e.g., https://your-backend.herokuapp.com)
- Any other frontend-specific environment variables your application needs

### 5. Custom Domain (Optional)
- Go to your Vercel dashboard
- Select your project
- Go to Settings > Domains
- Add your custom domain

## API Endpoints

The API endpoints are handled by the separate backend deployment. Refer to the backend documentation for available endpoints.

## Build Configuration

- **Frontend Build**: Uses Vite to build React app to `dist/`
- **Routing**: All requests serve the React app (SPA routing)

## Development vs Production

- **Development**: Run `npm run dev` for local development
- **Production**: Deploy to Vercel for production hosting

## Troubleshooting

1. **Build Errors**: Check that all dependencies are in `package.json`
2. **API Errors**: Ensure the backend is deployed separately and the frontend is configured to point to the correct API URL
3. **CORS Issues**: Configure CORS in your separate backend deployment
4. **Environment Variables**: Ensure any frontend-specific env vars are set in Vercel dashboard
