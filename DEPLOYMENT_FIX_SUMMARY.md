# FlipIQ Railway Deployment Fix - Complete Summary

## Date: April 5, 2026
## Status: PRODUCTION WORKING ✅

---

## What Was Broken

After deploying to Railway, the application was completely non-functional:
- Registration failed with "API Error: 405"
- Login failed
- Auction creation failed
- All buttons that submit data didn't work
- Only dev mode was accessible but still non-functional

## Root Causes Identified

### 1. Frontend-Backend Communication Architecture Mismatch

**The Problem:**
- Frontend was trying to call API through nginx proxy (`/api/...` → backend)
- But the nginx proxy config had a path bug: `proxy_pass ${BACKEND_URL}api/;`
- When `BACKEND_URL=https://.../api`, the result was `https://.../api` + `auth/register` = `https://.../apiauth/register` (missing `/`)

**Why It Happened:**
- Original code tried to use Railway's `${RAILWAY_SERVICE_FLIPIQ_BACKEND_URL}` variable substitution
- This variable wasn't being interpolated correctly in railway.toml
- Docker build wasn't receiving `VITE_API_URL` build arg
- Frontend fell back to calling itself (same-origin requests), which nginx tried to proxy but failed

### 2. CORS Configuration Missing Frontend Origin

**The Problem:**
- Backend CORS only allowed localhost and Railway auto-detected domains
- `https://flipiq-frontend-production.up.railway.app` was not in the allowed origins list
- Browser blocked all cross-origin requests with CORS errors

### 3. Dev Mode FK Constraint Violation (PostgreSQL)

**The Problem:**
- Dev mode returned a mock user with `id=999999`
- PostgreSQL has foreign key constraints on `auctions.user_id`
- When creating an auction, the INSERT failed with:
  ```
  psycopg2.errors.ForeignKeyViolation: insert or update on table "auctions" violates foreign key constraint "auctions_user_id_fkey"
  ```

---

## Solutions Implemented

### Solution 1: Hardcoded API URL in Dockerfile

**File:** `frontend/Dockerfile.frontend`

```dockerfile
ENV VITE_API_URL=https://flipiq-backend-production-5109.up.railway.app
```

**Why This Works:**
- Vite bakes this URL into the compiled JavaScript at build time
- Frontend makes direct CORS requests to backend (no nginx proxy needed)
- Simple, reliable, no runtime configuration needed

**Trade-offs:**
- ✅ Simple and reliable
- ✅ No nginx proxy complexity
- ⚠️ Must rebuild if backend URL changes
- ⚠️ Can't easily have staging environments without separate builds

### Solution 2: Added Frontend URL to CORS Origins

**File:** `backend/app/main.py`

Added explicit CORS origin:
```python
CORS_ORIGINS.extend([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://flipiq-frontend-production.up.railway.app",  # <-- Added
])
```

### Solution 3: Fixed Dev Mode User ID

**File:** `backend/app/auth/jwt.py`

Changed dev mode user from `id=999999` to `id=1`:
```python
if token == "dev-token":
    return User(
        id=1,  # Changed from 999999 to avoid FK violation
        email="dev@local",
        name="Developer",
        plan="pro",
        is_active=1,
        is_verified=1,
    )
```

Also seeded a real dev user in database:
**File:** `backend/app/database.py`

```python
def seed_dev_user(db):
    """Seed a dev user with ID=1 for dev mode to work on PostgreSQL."""
    from app.models import User
    from app.auth.jwt import get_password_hash
    dev_user = db.query(User).filter(User.id == 1).first()
    if not dev_user:
        # Insert dev user directly with ID=1
        ...
```

### Solution 4: Simplified Nginx Config

**File:** `frontend/statics/nginx.conf`

Removed complex proxy configuration, now just serves static files:
```nginx
server {
    listen 8080 default_server;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `frontend/Dockerfile.frontend` | Hardcoded VITE_API_URL, simplified nginx setup |
| `frontend/statics/nginx.conf` | Removed proxy, serves static files only |
| `frontend/src/config.js` | Created single source of truth for API URL |
| `frontend/src/api.js` | Restored full API module, imports from config |
| `frontend/src/store/authStore.js` | Uses config.js, no hardcoded URLs |
| `backend/app/main.py` | Added frontend URL to CORS origins, logging |
| `backend/app/auth/jwt.py` | Changed dev mode user_id to 1 |
| `backend/app/database.py` | Added seed_dev_user function |
| `railway.toml` | Set build.args (syntax: `[service.flipiq-frontend.build.args]`) |

---

## Architecture Overview (Working)

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (User)                                             │
│  - Loads https://flipiq-frontend-production.up.railway.app  │
│  - Gets static HTML/JS from nginx                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ JS executes: fetch('https://flipiq-backend-production-5109.up.railway.app/api/...')
                     │ (CORS request, cross-origin)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                          │
│  - https://flipiq-backend-production-5109.up.railway.app    │
│  - PostgreSQL database                                      │
│  - CORS allows frontend origin                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Points:**
- No nginx proxy between frontend and backend
- Direct CORS requests from browser to backend
- JWT tokens for authentication
- PostgreSQL for data persistence

---

## Environment Variables (Railway)

### Backend (`flipiq-backend`)
- `DATABASE_URL` - PostgreSQL connection string (auto-set by Railway)
- `JWT_SECRET_KEY` - Set manually via CLI
- `PYTHONUNBUFFERED=1`

### Frontend (`flipiq-frontend`)
- `VITE_API_URL` - Hardcoded in Dockerfile
- `NODE_ENV=production`

---

## URLs

| Service | URL |
|---------|-----|
| Frontend | https://flipiq-frontend-production.up.railway.app |
| Backend API | https://flipiq-backend-production-5109.up.railway.app/api |

---

## Lessons Learned

1. **Nginx proxy config is fragile** - The `proxy_pass` directive behavior with trailing slashes is tricky. Using direct CORS is simpler for this architecture.

2. **Railway build args syntax** - Use `[service.flipiq-frontend.build.args]` not `buildArgs`

3. **PostgreSQL FK constraints** - Unlike SQLite, PostgreSQL enforces foreign keys strictly. Mock users need real IDs in the database.

4. **CORS must include exact origins** - Wildcards don't work with credentials. Must list exact frontend URLs.

5. **Docker layer caching** - When nginx config changes, need to invalidate cache or COPY from builder stage properly.

---

## Future Improvements

1. **Custom domain (flipiq.ca)** - Update CORS origins and hardcoded URL
2. **Staging environment** - Use build args properly or runtime config
3. **Redis for token blacklist** - Currently in-memory
4. **Production-grade secrets** - Use Railway secrets manager
5. **Monitoring/logging** - Add structured logging
6. **Nginx proxy (optional)** - Revisit if we want same-origin API calls

---

## Working Features (Verified)

- ✅ Registration
- ✅ Login
- ✅ Dev mode
- ✅ Auction CRUD
- ✅ Item management
- ✅ Calculations (all modes)
- ✅ Dashboard with charts
- ✅ Settings (auction houses, shipping presets, templates)
- ✅ Export functionality
- ✅ Currency conversion

---

## Test User

A test user has been created for development:
- **Email:** See below (created via API)
- **Password:** password123
- **Plan:** pro

See next section for Pro user credentials.

---

*Document created: April 5, 2026*
*Last updated: April 5, 2026*
