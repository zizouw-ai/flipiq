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

    # Migrate: add new Product Profile columns to existing item_templates table
    _migrate_item_templates()

    # Seed default data
    db = SessionLocal()
    try:
        seed_auction_houses(db)
        seed_shipping_presets(db)
    finally:
        db.close()


def _safe_add_column(conn, table, column, col_type, default=None):
    """Add a column to an existing SQLite table if it doesn't exist."""
    import sqlite3
    try:
        default_clause = f" DEFAULT {default!r}" if default is not None else ""
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}{default_clause}")
    except Exception:
        pass  # Column already exists


def _migrate_item_templates():
    """Add new Product Profile columns to item_templates if they don't exist."""
    with engine.connect() as conn:
        _safe_add_column(conn, "item_templates", "profile_type", "TEXT", "auction")
        _safe_add_column(conn, "item_templates", "item_name", "TEXT", "")
        _safe_add_column(conn, "item_templates", "fixed_buy_price", "REAL", None)
        _safe_add_column(conn, "item_templates", "typical_sell_price", "REAL", None)
        _safe_add_column(conn, "item_templates", "ebay_category", "TEXT", "Most Categories (Default)")
        _safe_add_column(conn, "item_templates", "ebay_store_toggle", "INTEGER", 0)
        _safe_add_column(conn, "item_templates", "top_rated_toggle", "INTEGER", 0)
        _safe_add_column(conn, "item_templates", "insertion_fee_toggle", "INTEGER", 0)
        conn.commit()
