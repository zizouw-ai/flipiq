# FlipIQ Deployment Guide (Railway)

This guide covers deploying FlipIQ to Railway using the Railway CLI.

## Prerequisites

1. Railway CLI installed: `npm install -g @railway/cli`
2. Railway account: https://railway.app
3. Git repository with your code

## Step 1: Login to Railway

```bash
railway login
```

## Step 2: Initialize Project

```bash
railway init
```

Select "Empty project" and name it `flipiq`.

## Step 3: Create Services

Create two services from your mono-repo:

```bash
# Backend service
railway service create flipiq-backend

# Frontend service
railway service create flipiq-frontend
```

## Step 4: Configure Services

### Backend Service Settings

1. **Root Directory**: Set to root `.`
2. **Dockerfile**: `Dockerfile.backend`
3. **Start Command**: `./start.sh`
4. **Health Check Path**: `/health`
5. **Volume**: Add volume mounted at `/data`

### Frontend Service Settings

1. **Root Directory**: Set to `frontend`
2. **Dockerfile**: `Dockerfile.frontend`
3. **Environment Variables**:
   - `BACKEND_URL` = URL of your backend service
   - `NODE_ENV` = `production`

## Step 5: Set Environment Variables

### Backend Variables

```bash
railway service flipiq-backend --variables
```

Add these:
- `DATABASE_URL` = `sqlite:////data/flipiq.db` (uses the Railway Volume)
- `CORS_ORIGINS` = URL of your frontend service (e.g., `https://your-frontend.up.railway.app`)
- `SECRET_KEY` = Generate a secure random key
- `STRIPE_SECRET_KEY` = (for billing - optional)
- `STRIPE_WEBHOOK_SECRET` = (for billing - optional)

### Frontend Variables

```bash
railway service flipiq-frontend --variables
```

Add:
- `BACKEND_URL` = Backend service URL with `/api` suffix (e.g., `https://your-backend.up.railway.app/api`)
- `VITE_API_URL` = Same as BACKEND_URL

## Step 6: Deploy

Deploy both services:

```bash
railway up
```

Or deploy specific services:

```bash
railway up --service flipiq-backend
railway up --service flipiq-frontend
```

## Step 7: Verify Deployment

Check logs:

```bash
railway logs --service flipiq-backend
railway logs --service flipiq-frontend
```

Test endpoints:
- Backend: `https://your-backend.up.railway.app/health`
- Frontend: `https://your-frontend.up.railway.app`

## Step 8: Custom Domain (flipiq.ca)

1. Go to Railway Dashboard → Your Service → Settings → Domain
2. Add custom domain: `flipiq.ca`
3. Follow DNS instructions (usually a CNAME record)
4. Update CORS_ORIGINS to include `https://flipiq.ca`

## Monitoring

- **Logs**: `railway logs --service <service-name>`
- **Metrics**: Railway Dashboard
- **Health Check**: `/health` endpoint on backend

## Database Persistence

The SQLite database is stored in a Railway Volume at `/data/flipiq.db`. This persists across deployments and restarts.

## Troubleshooting

### Database not persisting
- Verify the volume is mounted at `/data`
- Check `DATABASE_URL` is set to `sqlite:////data/flipiq.db`

### CORS errors
- Add your frontend domain to `CORS_ORIGINS`
- Check `RAILWAY_*` environment variables are being used

### Frontend can't reach backend
- Verify `BACKEND_URL` is set correctly in frontend service
- Check nginx.conf has the correct proxy_pass

## Deployment Summary

Files changed for deployment:
- `backend/app/database.py` - Uses Railway Volume path
- `start.sh` - Creates /data directory
- `frontend/statics/nginx.conf` - Dynamic backend URL
- `frontend/statics/entrypoint.sh` - Env substitution for BACKEND_URL
- `railway.toml` - Service configuration
