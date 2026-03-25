"""Pydantic schemas for FlipIQ API request/response models."""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# ---------------------------------------------------------------------------
# Calculator Schemas
# ---------------------------------------------------------------------------

class EncoreCostRequest(BaseModel):
    hammer_price: float
    payment_method: str = "etransfer"


class EbayFeesRequest(BaseModel):
    sell_price: float
    buyer_shipping_charge: float = 0.0
    fvf_pct: Optional[float] = None
    category: str = "Most Categories (Default)"
    has_store: bool = False
    top_rated: bool = False
    below_standard: bool = False
    promoted_pct: float = 0.0
    insertion_fee: bool = False


class Mode1Request(BaseModel):
    hammer_price: float
    payment_method: str = "etransfer"
    shipping_cost_actual: float = 0.0
    buyer_shipping_charge: float = 0.0
    promoted_pct: float = 0.0
    target_profit_dollar: Optional[float] = None
    target_profit_pct: Optional[float] = None
    fvf_pct: Optional[float] = None
    category: str = "Most Categories (Default)"
    has_store: bool = False
    top_rated: bool = False
    below_standard: bool = False
    insertion_fee: bool = False
    sale_channel: str = "ebay"


class Mode2Request(BaseModel):
    sold_price: float
    hammer_price: float
    payment_method: str = "etransfer"
    shipping_cost_actual: float = 0.0
    buyer_shipping_charge: float = 0.0
    promoted_pct: float = 0.0
    fvf_pct: Optional[float] = None
    category: str = "Most Categories (Default)"
    has_store: bool = False
    top_rated: bool = False
    below_standard: bool = False
    insertion_fee: bool = False
    sale_channel: str = "ebay"


class Mode3Request(BaseModel):
    total_hammer_price: float
    num_items: int
    payment_method: str = "etransfer"
    per_item_sell_price: Optional[float] = None
    shipping_cost_actual: float = 0.0
    buyer_shipping_charge: float = 0.0
    promoted_pct: float = 0.0
    target_profit_dollar: Optional[float] = None
    target_profit_pct: Optional[float] = None
    fvf_pct: Optional[float] = None
    category: str = "Most Categories (Default)"
    has_store: bool = False
    top_rated: bool = False
    below_standard: bool = False
    insertion_fee: bool = False
    sale_channel: str = "ebay"


class Mode4Request(BaseModel):
    sell_price: float
    hammer_price: float
    payment_method: str = "etransfer"
    shipping_cost_actual: float = 0.0
    buyer_shipping_charge: float = 0.0
    target_profit_dollar: Optional[float] = None
    target_profit_pct: Optional[float] = None
    fvf_pct: Optional[float] = None
    category: str = "Most Categories (Default)"
    has_store: bool = False
    top_rated: bool = False
    below_standard: bool = False
    insertion_fee: bool = False


class Mode5Request(BaseModel):
    hammer_price: float
    payment_method: str = "etransfer"
    shipping_cost_actual: float = 0.0
    buyer_shipping_charge: float = 0.0
    promoted_pct: float = 0.0
    fvf_pct: Optional[float] = None
    category: str = "Most Categories (Default)"
    has_store: bool = False
    top_rated: bool = False
    below_standard: bool = False
    insertion_fee: bool = False
    num_points: int = 50
    sale_channel: str = "ebay"


# ---------------------------------------------------------------------------
# Auction & Item Schemas
# ---------------------------------------------------------------------------

class ItemCreate(BaseModel):
    name: str
    category: str = "Most Categories (Default)"
    hammer_price: float
    payment_method: str = "etransfer"
    status: str = "unlisted"
    list_price: Optional[float] = None
    sold_price: Optional[float] = None
    sell_date: Optional[str] = None
    shipping_cost_actual: float = 0.0
    shipping_charged_buyer: float = 0.0
    promoted_pct: float = 0.0
    sale_channel: str = "ebay"
    fb_sale_type: Optional[str] = None
    notes: str = ""


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    hammer_price: Optional[float] = None
    payment_method: Optional[str] = None
    status: Optional[str] = None
    list_price: Optional[float] = None
    sold_price: Optional[float] = None
    sell_date: Optional[str] = None
    shipping_cost_actual: Optional[float] = None
    shipping_charged_buyer: Optional[float] = None
    promoted_pct: Optional[float] = None
    sale_channel: Optional[str] = None
    fb_sale_type: Optional[str] = None
    notes: Optional[str] = None


class ItemResponse(BaseModel):
    id: int
    auction_id: int
    name: str
    category: str
    hammer_price: float
    payment_method: str
    buy_cost_total: float
    status: str
    list_price: Optional[float]
    sold_price: Optional[float]
    sell_date: Optional[str]
    shipping_cost_actual: float
    shipping_charged_buyer: float
    promoted_pct: float
    net_profit: Optional[float]
    roi_pct: Optional[float]
    sale_channel: str = "ebay"
    fb_sale_type: Optional[str] = None
    notes: str

    class Config:
        from_attributes = True


class AuctionCreate(BaseModel):
    name: str
    date: str
    total_hammer: float = 0.0
    payment_method: str = "etransfer"
    notes: str = ""


class AuctionUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[str] = None
    total_hammer: Optional[float] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class AuctionResponse(BaseModel):
    id: int
    name: str
    date: str
    total_hammer: float
    payment_method: str
    notes: str
    created_at: Optional[datetime]
    items: List[ItemResponse] = []

    class Config:
        from_attributes = True


class AuctionListResponse(BaseModel):
    id: int
    name: str
    date: str
    total_hammer: float
    payment_method: str
    notes: str
    created_at: Optional[datetime]
    item_count: int = 0

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Settings Schemas
# ---------------------------------------------------------------------------

class SettingUpdate(BaseModel):
    key: str
    value: str


class SettingResponse(BaseModel):
    id: int
    key: str
    value: str

    class Config:
        from_attributes = True
