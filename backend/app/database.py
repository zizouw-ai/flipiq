from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import logging

logger = logging.getLogger(__name__)

# Railway Volume is mounted at /data - use that for persistence
# Local development falls back to project root
RAILWAY_VOLUME_MOUNT = os.getenv("RAILWAY_VOLUME_MOUNT_PATH", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL:
    # Use provided DATABASE_URL (PostgreSQL or explicit SQLite)
    logger.info(f"Using DATABASE_URL from environment")
elif RAILWAY_VOLUME_MOUNT:
    # Railway with volume mount at /data
    DATABASE_URL = f"sqlite:///{RAILWAY_VOLUME_MOUNT}/flipiq.db"
    logger.info(f"Using Railway Volume at {RAILWAY_VOLUME_MOUNT}")
else:
    # Local development - fallback to current directory
    DATABASE_URL = "sqlite:///./flipiq.db"
    logger.info("Using local SQLite database")

logger.info(f"Database path: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")

# SQLite requires check_same_thread=False for FastAPI multi-threading
# Only apply if DATABASE_URL starts with "sqlite"
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_auction_houses(db):
    """Seed preset auction house configs if table is empty."""
    from app.models import AuctionHouseConfig
    from app.buy_cost import PRESET_AUCTION_HOUSES
    if db.query(AuctionHouseConfig).count() == 0:
        for preset in PRESET_AUCTION_HOUSES:
            db.add(AuctionHouseConfig(**preset))
        db.commit()


def seed_shipping_presets(db):
    """Seed shipping presets if table is empty."""
    from app.models import ShippingPreset
    from app.buy_cost import SHIPPING_PRESETS
    if db.query(ShippingPreset).count() == 0:
        for preset in SHIPPING_PRESETS:
            db.add(ShippingPreset(**preset))
        db.commit()


def init_db():
    from sqlalchemy import inspect
    from app.models import (  # noqa
        User, Auction, Item, Calculation, UserSetting,
        AuctionHouseConfig, ShippingPreset, ItemTemplate,
    )

    # Create tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")

    # Verify tables exist
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    logger.info(f"Database tables: {tables}")

    # Seed default data on startup
    db = SessionLocal()
    try:
        seed_auction_houses(db)
        seed_shipping_presets(db)
        logger.info("Default data seeded")
    finally:
        db.close()
