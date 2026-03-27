from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./flipiq.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
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
        Auction, Item, Calculation, UserSetting,
        AuctionHouseConfig, ShippingPreset, ItemTemplate,
    )
    Base.metadata.create_all(bind=engine)
    # Seed default data
    db = SessionLocal()
    try:
        seed_auction_houses(db)
        seed_shipping_presets(db)
    finally:
        db.close()
