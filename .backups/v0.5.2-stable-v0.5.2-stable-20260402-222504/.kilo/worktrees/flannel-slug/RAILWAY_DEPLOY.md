# FlipIQ Railway Deployment Guide

## Railway Hobby Plan ($5/month)

Railway provides:
- Automatic SSL/HTTPS
- Custom domains (flipiq.ca)
- Git-based deployments (push to deploy)
- Managed volumes for SQLite
- Automatic service discovery

---

## Prerequisites

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login
```

---

## Deployment Steps

### 1. Initialize Project

```bash
cd /path/to/flipiq

# Create new Railway project (or link to existing)
railway init --name flipiq
```

### 2. Create Services

Create TWO services in Railway dashboard:

#### Service 1: Backend (FastAPI)

```bash
# In Railway dashboard:
# New Service → GitHub Repo → Select flipiq
# Builder: Dockerfile
# Dockerfile path: Dockerfile.backend

# Or via CLI:
railway add --service flipiq-backend
```

**Configure Backend:**
- Go to Service Settings → Deploy
- Set Healthcheck Path: `/health`
- Add Volume: Mount `/data` → Create new volume "flipiq-db"
- Add Variables:
  ```
  DATABASE_URL=sqlite:///data/flipiq.db
  PYTHONUNBUFFERED=1
  ```

#### Service 2: Frontend (React)

```bash
# In Railway dashboard:
# New Service → GitHub Repo → Select flipiq
# Builder: Nixpacks

# Or via CLI:
railway add --service flipiq-frontend
```

**Configure Frontend:**
- Root Directory: `frontend/`
- Build Command: `npm install && npm run build`
- Start Command: `npx serve -s dist -l $PORT`
- Add Variables:
  ```
  VITE_API_URL=${{flipiq-backend.RAILWAY_STATIC_URL}}/api
  NODE_ENV=production
  ```

### 3. Deploy

```bash
# Deploy both services
railway up

# View logs
railway logs

# View backend logs specifically
railway logs --service flipiq-backend
```

---

## Custom Domain (flipiq.ca)

1. In Railway Dashboard → Frontend Service → Settings → Domains
2. Click "Add Domain"
3. Enter: `flipiq.ca`
4. Copy the CNAME target
5. Go to your domain registrar → Add CNAME record
6. Wait for DNS propagation

---

## Environment Variables

### Backend Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `sqlite:///data/flipiq.db` | SQLite path in volume |
| `PYTHONUNBUFFERED` | `1` | For logging |
| `RAILWAY_STATIC_URL` | Auto-set | Service URL |

### Frontend Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `${{flipiq-backend.RAILWAY_STATIC_URL}}/api` | Backend API URL |
| `NODE_ENV` | `production` | Production mode |

---

## Backup Strategy

Railway volumes are automatically backed up. For additional backups:

```bash
# Create backup script in scripts/railway-backup.sh
# Run locally or via Railway Cron (Pro plan)
```

---

## Troubleshooting

### Database Not Persisting
- Ensure Volume is mounted at `/data`
- Verify `DATABASE_URL=sqlite:///data/flipiq.db`

### CORS Errors
- Backend auto-detects Railway domains via `RAILWAY_STATIC_URL`
- Check CORS_ORIGINS variable if needed

### Frontend Can't Reach API
- Verify `VITE_API_URL` points to backend service
- Use Railway's service discovery: `${{service-name.RAILWAY_STATIC_URL}}`

---

## Railway CLI Commands

```bash
railway login          # Authenticate
railway init           # Initialize project
railway up             # Deploy
railway logs           # View logs
railway logs --service <name>  # Specific service logs
railway variables      # Manage env vars
railway status         # Check deployment status
railway open           # Open dashboard
```

---

## Migration from Hetzner

If you have existing SQLite data:

```bash
# Download current DB
scp root@hetzner:/opt/flipiq/data/flipiq.db ./

# Upload to Railway
railway run --service flipiq-backend "cat > /data/flipiq.db" < flipiq.db
```
