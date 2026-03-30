import logging

# Configure basic logging to stdout
logging.basicConfig(level=logging.INFO, format='%(levelname)s:     %(name)s:%(lineno)d: %(message)s')
logger = logging.getLogger(__name__)

"""FastAPI main application entry point for FlipIQ."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import calculator, auctions, dashboard, settings
from app.routers import auction_houses, shipping_presets, templates, exports
from app.routers import items as items_router
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
# Allow Railway public domains (both frontend and backend)
RAILWAY_PUBLIC_DOMAIN = os.getenv("RAILWAY_PUBLIC_DOMAIN", "")
if RAILWAY_PUBLIC_DOMAIN:
    CORS_ORIGINS.append(f"https://{RAILWAY_PUBLIC_DOMAIN}")
# Allow Railway URL (frontend service)
RAILWAY_URL = os.getenv("RAILWAY_URL", "")
if RAILWAY_URL:
    CORS_ORIGINS.append(RAILWAY_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/test-log")
def test_log():
    logger.info("Test log endpoint hit!")
    return {"status": "Log message sent"}

app.include_router(calculator.router)
app.include_router(auctions.router)
app.include_router(dashboard.router)
app.include_router(settings.router)
app.include_router(auction_houses.router)
app.include_router(shipping_presets.router)
app.include_router(templates.router)
app.include_router(exports.router)
app.include_router(currency_router)
app.include_router(items_router.router)


@app.get("/")
def root():
    return {"app": "FlipIQ", "version": "2.0.0", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
