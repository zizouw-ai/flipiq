"""Database reset script for Railway deployment."""
import os
import sys

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine, DATABASE_URL, SessionLocal
from app.models import User, Auction, Item, Calculation, UserSetting
from app.models import AuctionHouseConfig, ShippingPreset, ItemTemplate
from app.buy_cost import PRESET_AUCTION_HOUSES, SHIPPING_PRESETS


def reset_database():
    """Drop all tables and recreate with current schema."""
    print(f"Database URL: {DATABASE_URL}")
    print(f"Database type: {'PostgreSQL' if DATABASE_URL.startswith('postgresql') else 'SQLite'}")
    
    print("\nDropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("All tables dropped.")
    
    print("\nCreating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")
    
    print("\nSeeding default data...")
    db = SessionLocal()
    try:
        # Seed auction houses
        if db.query(AuctionHouseConfig).count() == 0:
            for preset in PRESET_AUCTION_HOUSES:
                db.add(AuctionHouseConfig(**preset))
            print(f"Seeded {len(PRESET_AUCTION_HOUSES)} auction house configs")
        
        # Seed shipping presets
        if db.query(ShippingPreset).count() == 0:
            for preset in SHIPPING_PRESETS:
                db.add(ShippingPreset(**preset))
            print(f"Seeded {len(SHIPPING_PRESETS)} shipping presets")
        
        db.commit()
        print("Default data seeded successfully.")
    finally:
        db.close()
    
    print("\nDatabase reset complete!")


if __name__ == "__main__":
    confirm = input("This will DELETE ALL DATA. Type 'yes' to continue: ")
    if confirm.lower() == 'yes':
        reset_database()
    else:
        print("Aborted.")
