"""FastAPI main application entry point for FlipIQ."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import calculator, auctions, dashboard, settings
from app.routers import auction_houses, shipping_presets, templates, exports
from app.currency import router as currency_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="FlipIQ",
    description="Multi-Channel Reseller Profit & Pricing Calculator API",
    version="2.0.0",
    lifespan=lifespan,
)

import os

# CORS: Allow Railway domains + local dev
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
# Also allow any Railway app domain
RAILWAY_DOMAIN = os.getenv("RAILWAY_STATIC_URL", "")
if RAILWAY_DOMAIN:
    CORS_ORIGINS.append(RAILWAY_DOMAIN)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calculator.router)
app.include_router(auctions.router)
app.include_router(dashboard.router)
app.include_router(settings.router)
app.include_router(auction_houses.router)
app.include_router(shipping_presets.router)
app.include_router(templates.router)
app.include_router(exports.router)
app.include_router(currency_router)


@app.get("/")
def root():
    return {"app": "FlipIQ", "version": "2.0.0", "status": "running"}


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "v0.4.0"}
