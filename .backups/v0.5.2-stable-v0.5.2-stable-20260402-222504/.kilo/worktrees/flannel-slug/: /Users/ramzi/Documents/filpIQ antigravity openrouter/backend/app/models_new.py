: from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base
import uuid



class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    plan = Column(String, default="free", nullable=False)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)

    # Relationships
    auctions = relationship("Auction", back_populates="user")
    calculations = relationship("Calculation", back_populates="user")
    item_templates = relationship("ItemTemplate", back_populates="user")
    shipping_presets = relationship("ShippingPreset", back_populates="user")
    settings = relationship("UserSetting", back_populates="user")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"

class Auction(Base):
    __tablename__ = "auctions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    date = Column(String, nullable=False)
    total_hammer = Column(Float, default=0.0)
    payment_method = Column(String, default="etransfer")  # etransfer | credit_card
    auction_house_config_id = Column(Integer, ForeignKey("auction_house_configs.id"), nullable=True)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="auctions")
    items = relationship("Item", back_populates="auction", cascade="all, delete-orphan")
    auction_house_config = relationship("AuctionHouseConfig", back_populates="auctions")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    auction_id = Column(Integer, ForeignKey("auctions.id"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, default="Most Categories (Default)")
    hammer_price = Column(Float, nullable=False)
    payment_method = Column(String, default="etransfer")
    buy_cost_total = Column(Float, default=0.0)
    status = Column(String, default="unlisted")  # unlisted | listed | sold | unsold
    list_price = Column(Float, nullable=True)
    sold_price = Column(Float, nullable=True)
    sell_date = Column(String, nullable=True)
    shipping_cost_actual = Column(Float, default=0.0)
    shipping_charged_buyer = Column(Float, default=0.0)
    promoted_pct = Column(Float, default=0.0)
    net_profit = Column(Float, nullable=True)
    roi_pct = Column(Float, nullable=True)
    sale_channel = Column(String, default="ebay")  # ebay | facebook_local | facebook_shipped | poshmark | kijiji | other
    fb_sale_type = Column(String, nullable=True)  # local | shipped — only for facebook channels
    lot_number = Column(String, nullable=True)  # Lot number from auction
    estimated_resale = Column(Float, nullable=True)  # Estimated resale value
    platform_sold_on = Column(String, nullable=True)  # Where actually sold (may differ from intended sale_channel)
    notes = Column(Text, default="")

    user = relationship("User", back_populates="items")
    auction = relationship("Auction", back_populates="items")


class Calculation(Base):
    __tablename__ = "calculations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    mode = Column(String, nullable=False)
    input_json = Column(Text, nullable=False)
    output_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="calculations")


class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)

    user = relationship("User", back_populates="settings")


# ── Feature 1.1 — Auction House Configs ────────────────────────────────────

class AuctionHouseConfig(Base):
    __tablename__ = "auction_house_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)         # NULL = system default
    name = Column(String, nullable=False)
    buyer_premium_pct = Column(Float, default=0.0)
    handling_fee_flat = Column(Float, default=0.0)
    handling_fee_pct = Column(Float, default=0.0)
    handling_fee_mode = Column(String, default="flat")   # flat | pct | none
    tax_pct = Column(Float, default=13.0)
    tax_applies_to = Column(String, default="subtotal")  # subtotal | hammer_only | all
    credit_card_surcharge_pct = Column(Float, default=0.0)
    online_bidding_fee_pct = Column(Float, default=0.0)
    payment_methods = Column(String, default="etransfer,credit_card,cash")
    lot_handling = Column(String, default="per_item")    # per_item | per_lot | none
    currency = Column(String, default="CAD")
    notes = Column(Text, default="")
    is_default = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="auction_house_configs")
    auctions = relationship("Auction", back_populates="auction_house_config")


# ── Feature 1.3 — Shipping Presets ──────────────────────────────────────────

class ShippingPreset(Base):
    __tablename__ = "shipping_presets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    carrier = Column(String, default="")
    max_weight_kg = Column(Float, nullable=True)
    max_length_cm = Column(Float, nullable=True)
    cost_cad = Column(Float, nullable=False)
    notes = Column(Text, default="")
    is_default = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="shipping_presets")


# ── Feature 1.4 — Product Profiles (was Item Templates) ────────────────────

class ItemTemplate(Base):
    __tablename__ = "item_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)           # internal/legacy name
    profile_type = Column(String, default="auction")  # 'auction' | 'fixed'
    item_name = Column(String, default="")            # product name e.g. "Dyson V8"
    category = Column(String, default="")
    sale_channel = Column(String, default="ebay")
    buyer_shipping_charge = Column(Float, default=0.0)
    promoted_listing_pct = Column(Float, default=0.0)
    target_margin_pct = Column(Float, default=0.0)
    target_profit_flat = Column(Float, default=0.0)
    target_mode = Column(String, default="pct")       # pct | flat
    fixed_buy_price = Column(Float, nullable=True)    # only for 'fixed' profiles
    typical_sell_price = Column(Float, nullable=True)  # reference hint
    ebay_category = Column(String, default="Most Categories (Default)")
    ebay_store_toggle = Column(Integer, default=0)
    top_rated_toggle = Column(Integer, default=0)
    insertion_fee_toggle = Column(Integer, default=0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="item_templates")
