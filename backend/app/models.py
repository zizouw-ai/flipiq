from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class Auction(Base):
    __tablename__ = "auctions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    date = Column(String, nullable=False)
    total_hammer = Column(Float, default=0.0)
    payment_method = Column(String, default="etransfer")  # etransfer | credit_card
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    items = relationship("Item", back_populates="auction", cascade="all, delete-orphan")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
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
    notes = Column(Text, default="")

    auction = relationship("Auction", back_populates="items")


class Calculation(Base):
    __tablename__ = "calculations"

    id = Column(Integer, primary_key=True, index=True)
    mode = Column(String, nullable=False)
    input_json = Column(Text, nullable=False)
    output_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
