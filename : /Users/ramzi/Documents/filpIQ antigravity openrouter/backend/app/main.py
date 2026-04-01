: import logging

# Configure basic logging to stdout
logging.basicConfig(level=logging.INFO, format='%(levelname)s:     %(name)s:%(lineno)d: %(message)s')
logger = logging.getLogger(__name__)

"""FastAPI main application entry point for FlipIQ."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from app.database import init_db, get_db
from app.routers import calculator, auctions, dashboard, settings
from app.routers import auction_houses, shipping_presets, templates, exports, items as items_router
from app.routers import auth
from app.currency import router as currency_router
from app.models import User
import os


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

# Allow all RAILWAY_SERVICE_*_URL environment variables
for key, value in os.environ.items():
    if key.startswith("RAILWAY_SERVICE_") and key.endswith("_URL"):
        if value and value not in CORS_ORIGINS:
            CORS_ORIGINS.append(value)

# Filter out empty strings
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Middleware to attach user to request
@app.middleware("http")
async def attach_user_to_request(request: Request, call_next, db: Session = Depends(get_db)):
    # Extract authorization token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        from app.auth.jwt import verify_token
        token_data = verify_token(token)
        if token_data and token_data.get("type") == "access":
            user = db.query(User).filter(User.id == token_data["user_id"]).first()
            request.state.user = user
    
    response = await call_next(request)
    return response

Public endpoints that don't require authentication
PUBLIC_PATHS = ["/", "/health", "/auth/register", "/auth/login", "/auth/refresh", "/auth/forgot-password", "/auth/reset-password", "/auth/verify-email"]

@app.get("/test-log")
def test_log():
    logger.info("Test log endpoint hit!")
    return {"status": "Log message sent"}

app.include_router(auth.router)
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
