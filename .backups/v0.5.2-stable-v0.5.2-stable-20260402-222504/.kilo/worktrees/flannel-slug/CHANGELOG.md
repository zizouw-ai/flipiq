# FlipIQ Changelog

## v0.5.1 — 2026-03-31
- **FIX**: Attempted fixes for Railway deployment configuration for both frontend and backend services.
  - Consolidated Railway service configuration into a single `railway.toml` at the project root.
  - Corrected Dockerfile paths and root directories for `flipiq-backend` and `flipiq-frontend` services.
  - Addressed `uvicorn: command not found` error on frontend service by ensuring correct Dockerfile is used.
  - Updated CORS configuration in backend to allow all origins temporarily for debugging.
  - Ensured `VITE_API_URL` build variable in frontend points to the correct backend public domain.
- **BUG**: Frontend 'Save Auction' functionality (POST /api/auctions/) returns 405 Method Not Allowed error on Railway.
- **BUG**: Pricing Calculator functionality reported not working on Railway.
- **DIAGNOSIS**: 405 error is likely due to Railway's internal proxy/ingress blocking POST requests before they reach the FastAPI application. Backend API calls via `curl` directly succeed.

## v0.5.2 — 2026-04-01
### ✅ COMPLETE - Phase 3 SaaS Implementation

**Authentication System:**
- JWT-based authentication with access tokens (24h) and refresh tokens (7d)
- User registration, login, logout endpoints
- Password hashing with bcrypt
- Protected route middleware
- Dev Mode for local testing without authentication

**Frontend Auth Integration:**
- Login and Register pages with forms
- Auth store with Zustand for state management
- Automatic token handling in API requests
- Dev Mode button for local development
- Logout functionality in sidebar

**Plan Tiers & Usage Limits:**
- Free: 50 items max, 3 auction houses, no exports
- Starter ($9/mo): 500 items, all features
- Pro ($19/mo): Unlimited items, all features
- Team ($49/mo): Unlimited + 5 team members
- Server-side limit enforcement with HTTP 402 responses
- Usage tracking endpoints

**Stripe Billing (Backend Ready):**
- Checkout session creation
- Webhook handling for subscription events
- Customer portal integration
- Automatic plan synchronization

**Railway Deployment Fixes:**
- Fixed 405 Method Not Allowed errors
- nginx proxy_pass configuration for API routing
- Environment variable configuration
- Frontend .env setup for local development

**All Features Working:**
- ✅ Pricing Calculator (all 5 modes)
- ✅ eBay Category dropdown
- ✅ Auction Tracker (create, edit, delete)
- ✅ All Items page with search/filters
- ✅ Dashboard with charts
- ✅ Export functionality (auction, inventory, dashboard, tax)
- ✅ Settings pages
- ✅ Login/Register with Dev Mode

## v0.5.0 — 2026-03-29
- Switched deployment target to Railway ($5/month Hobby plan)
- Created railway.toml for backend service with SQLite volume support
- Created railway.frontend.toml for React static build
- Updated CORS to auto-detect Railway domains via RAILWAY_STATIC_URL
- Updated frontend api.js to use VITE_API_URL environment variable
- Created RAILWAY_DEPLOY.md deployment guide
- Created Procfile for alternative deployment method
- Ready for Railway deployment

## v0.4.0 — 2026-03-28
- Phase 2 deployment infrastructure complete
- Added Docker setup (backend + frontend containers)
- Added nginx reverse proxy configuration
- Added healthcheck endpoint (/health)
- Created deployment scripts (deploy.sh, setup-ssl.sh, backup.sh)
- Created run-local.sh for local development
- Added .env.example for environment configuration
- DEPLOY.md guide created
- All 164 tests passing

## v0.3.0 — 2026-03-28
- Phase 1 COMPLETE: All 8 features verified and working
- Confirmed profit recalculation on hammer price change (tests passing)
- Ready for Phase 2: Deployment preparation

## v0.2.0 — 2026-03-28
- Verified all Phase 1 features complete: shipping presets, break-even alerts, Excel export, product profiles, item form wiring
- Fixed export tests by adding openpyxl dependency
- 164 tests passing

## v0.1.0 — 2026-03-28
- Project initialized with Phase 1 features
