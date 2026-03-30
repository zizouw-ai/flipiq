# FlipIQ AI Routing Master File
# Read this file every session. Follow all routing rules automatically.

## How CCR Routes (Zero Input From You)

| Claude behavior            | CCR route    | Model              |
|----------------------------|--------------|--------------------|
| Normal reply               | default      | Kimi K2.5          |
| Silent file scanning       | background   | DeepSeek R1        |
| Uses extended thinking     | think        | Claude Sonnet 4.6  |
| Context over 60K tokens    | longContext  | Gemini 2.5 Pro     |
| 2 specific tasks only      | manual       | Claude Opus 4.6    |

OPUS RULE: Never auto-use Opus. Only for 2 tasks below.
When those tasks come up, output exactly:
"OPUS NEEDED: run /model openrouter,anthropic/claude-opus-4-6"
Then stop and wait.

---

## Phase 2 — Deployment (Railway CLI)

Platform: Railway Hobby $5/month
Deploy method: railway CLI — git push triggers auto-build
Two services: flipiq-backend (FastAPI) + flipiq-frontend (React)

| Task                                          | Behavior              | Model         |
|-----------------------------------------------|-----------------------|---------------|
| railway.toml backend service config           | Normal reply          | Kimi K2.5     |
| railway.toml frontend static build config     | Normal reply          | Kimi K2.5     |
| Procfile for FastAPI (uvicorn startup)        | Normal reply          | Kimi K2.5     |
| railway variables set / env config            | Normal reply          | Kimi K2.5     |
| Railway Volume for SQLite at /data/flipiq.db  | Extended thinking     | Sonnet 4.6    |
| /health endpoint FastAPI                      | Normal reply          | Kimi K2.5     |
| CORS config for Railway-assigned domains      | Extended thinking     | Sonnet 4.6    |
| Railway PostgreSQL plugin setup               | Extended thinking     | Sonnet 4.6    |
| railway logs / railway run debugging          | Extended thinking     | Sonnet 4.6    |
| Railway Cron Job for backups                  | Normal reply          | Kimi K2.5     |
| DEPLOY.md Railway CLI guide                   | Normal reply          | Kimi K2.5     |
| Multi-file infra refactor (5+ files)          | Open all files first  | Gemini 2.5 Pro|

Railway CLI cheat sheet (reference only):
  railway login
  railway init
  railway up          ← deploy current dir
  railway logs        ← tail live logs
  railway run <cmd>   ← run cmd with env vars injected
  railway variables   ← manage env vars

---

## Phase 3 — SaaS Launch

| Task                                          | Behavior              | Model         |
|-----------------------------------------------|-----------------------|---------------|
| JWT auth (register, login, sessions)          | Extended thinking     | Sonnet 4.6    |
| Email verify + password reset                 | Normal reply          | Kimi K2.5     |
| Plan tiers + usage limits server-side         | Extended thinking     | Sonnet 4.6    |
| Stripe billing + webhooks                     | Extended thinking     | Sonnet 4.6    |
| Admin dashboard (users, MRR, churn)           | Normal reply          | Kimi K2.5     |
| Landing page flipiq.ca                        | Normal reply          | Kimi K2.5     |
| SQLite to PostgreSQL migration                | Extended thinking     | Sonnet 4.6    |

---

## Phase 4 — Growth Features

| Task                                          | Behavior              | Model         |
|-----------------------------------------------|-----------------------|---------------|
| eBay Sold Comps (Browse API)                  | Extended thinking     | Sonnet 4.6    |
| Bulk Price Calculator CSV upload              | Normal reply          | Kimi K2.5     |
| Tax Report PDF reportlab CRA format           | Open all files first  | Gemini 2.5 Pro|
| Onboarding flow                               | Normal reply          | Kimi K2.5     |
| Mobile responsive UI polish                   | Normal reply          | Kimi K2.5     |

---

## Phase 5 — Power Platform

| Task                                          | Behavior              | Model         |
|-----------------------------------------------|-----------------------|---------------|
| Team shared inventory multi-user DB           | STOP → request Opus   | Opus 4.6      |
| Role-based access RBAC                        | Extended thinking     | Sonnet 4.6    |
| Auto-repricer alerts eBay API polling         | Extended thinking     | Sonnet 4.6    |
| eBay listing creation from FlipIQ             | STOP → request Opus   | Opus 4.6      |
| Affiliate referral program                    | Normal reply          | Kimi K2.5     |

---

## General Rules (Every Session)

- File scanning, indexing, autocomplete = background (DeepSeek R1)
- Refactor touching 5+ files = open all first (Gemini 2.5 Pro)
- Bug fixes, CSS, tests, docs, scripts = normal reply (Kimi K2.5)
- Auth, security, APIs, CORS, schemas = extended thinking (Sonnet 4.6)
- When unsure = extended thinking (Sonnet 4.6)
- Opus = only the 2 tasks above, never anything else

---

## Project Context

Stack: FastAPI + React, SQLite → PostgreSQL in Phase 3
Tests: 164 passing at v0.4.0
Deployment: Railway Hobby $5/month
  Service 1: flipiq-backend (FastAPI, Railway Volume at /data)
  Service 2: flipiq-frontend (React static build)
SSL + routing: handled automatically by Railway
Domain: flipiq.ca
Market: Canadian auction reseller SaaS