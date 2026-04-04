import logging
import os

# Configure basic logging to stdout
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(name)s:%(lineno)d: %(message)s')
logger = logging.getLogger(__name__)

"""FastAPI main application entry point for FlipIQ."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, DATABASE_URL, RAILWAY_VOLUME_MOUNT
from app.routers import calculator, auctions, dashboard, settings, limits
from app.routers import auction_houses, shipping_presets, templates, exports
from app.routers import items as items_router
from app.routers import auth
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


@app.get("/test-log")
def test_log():
    logger.info("Test log endpoint hit!")
    return {"status": "Log message sent"}


@app.get("/debug/status")
def debug_status():
    """Debug endpoint to check application status."""
    import os
    from sqlalchemy import inspect
    from app.database import engine, SessionLocal
    from app.models import User, Auction

    # Check database file status
    db_file_exists = False
    db_file_path = None
    if DATABASE_URL.startswith("sqlite"):
        db_path = DATABASE_URL.replace("sqlite:///", "")
        db_file_exists = os.path.exists(db_path)
        db_file_path = db_path

    # Check tables exist
    tables = []
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
    except Exception as e:
        logger.error(f"Error inspecting database: {e}")

    # Get counts
    user_count = 0
    auction_count = 0
    try:
        db = SessionLocal()
        user_count = db.query(User).count()
        auction_count = db.query(Auction).count()
        db.close()
    except Exception as e:
        logger.error(f"Error counting records: {e}")

    return {
        "app": "FlipIQ",
        "version": "2.0.0",
        "status": "running",
        "environment": {
            "railway_volume_mount": RAILWAY_VOLUME_MOUNT or "NOT_SET",
            "database_url_type": "postgresql" if DATABASE_URL.startswith("postgresql") else "sqlite",
            "database_path": db_file_path,
            "db_file_exists": db_file_exists,
            "jwt_secret_set": bool(os.getenv("JWT_SECRET_KEY")),
            "cors_origins_count": len(CORS_ORIGINS),
            "cors_origins": CORS_ORIGINS,
        },
        "database": {
            "tables": tables,
            "user_count": user_count,
            "auction_count": auction_count,
        }
    }


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
app.include_router(limits.router)
app.include_router(auth.router)


@app.get("/")
def root():
    return {"app": "FlipIQ", "version": "2.0.0", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}
