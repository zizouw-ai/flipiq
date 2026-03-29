# FlipIQ Changelog

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
