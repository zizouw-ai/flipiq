from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./flipiq.db")

# Railway volume mount path - use /data for persistent storage if available
if os.path.exists("/data") and DATABASE_URL.startswith("sqlite:///./"):
    DATABASE_URL = "sqlite:///data/flipiq.db"

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
    from app.models import (  # noqa
        User, Auction, Item, Calculation, UserSetting,
        AuctionHouseConfig, ShippingPreset, ItemTemplate,
    )
    Base.metadata.create_all(bind=engine)

    # These _migrate functions are SQLite specific and should be removed for PostgreSQL
    # _migrate_item_templates()
    # _migrate_items()
    # _migrate_auctions()

    # Seed default data on startup
    db = SessionLocal()
    try:
        seed_auction_houses(db)
        seed_shipping_presets(db)
    finally:
        db.close()

