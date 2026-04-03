"""Auction House Config CRUD API."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuctionHouseConfig
from app.buy_cost import calculate_buy_cost, CANADA_TAX_RATES

router = APIRouter(prefix="/api/auction-houses", tags=["auction_houses"])


@router.get("/")
def list_configs(db: Session = Depends(get_db)):
    return db.query(AuctionHouseConfig).order_by(AuctionHouseConfig.is_default.desc()).all()


@router.get("/provinces")
def get_provinces():
    """Feature 1.2 — return all Canadian province tax rates."""
    return CANADA_TAX_RATES


@router.get("/{config_id}")
def get_config(config_id: int, db: Session = Depends(get_db)):
    cfg = db.query(AuctionHouseConfig).filter(AuctionHouseConfig.id == config_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Config not found")
    return cfg


@router.post("/")
def create_config(data: dict, db: Session = Depends(get_db)):
    cfg = AuctionHouseConfig(**data)
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.put("/{config_id}")
def update_config(config_id: int, data: dict, db: Session = Depends(get_db)):
    cfg = db.query(AuctionHouseConfig).filter(AuctionHouseConfig.id == config_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Config not found")
    for k, v in data.items():
        if hasattr(cfg, k) and k not in ("id", "created_at"):
            setattr(cfg, k, v)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.delete("/{config_id}")
def delete_config(config_id: int, db: Session = Depends(get_db)):
    cfg = db.query(AuctionHouseConfig).filter(AuctionHouseConfig.id == config_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Config not found")
    db.delete(cfg)
    db.commit()
    return {"ok": True}


@router.put("/{config_id}/set-default")
def set_default(config_id: int, db: Session = Depends(get_db)):
    # Clear all defaults
    db.query(AuctionHouseConfig).update({AuctionHouseConfig.is_default: 0})
    cfg = db.query(AuctionHouseConfig).filter(AuctionHouseConfig.id == config_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Config not found")
    cfg.is_default = 1
    db.commit()
    return cfg


@router.post("/preview")
def preview_buy_cost(data: dict):
    """Live preview: given hammer + config + payment_method, return buy cost breakdown."""
    hammer = data.get("hammer", 50.0)
    payment_method = data.get("payment_method", "etransfer")
    config = {k: v for k, v in data.items() if k not in ("hammer", "payment_method")}
    # Set defaults for missing config fields
    config.setdefault("buyer_premium_pct", 0)
    config.setdefault("handling_fee_flat", 0)
    config.setdefault("handling_fee_pct", 0)
    config.setdefault("handling_fee_mode", "none")
    config.setdefault("tax_pct", 13.0)
    config.setdefault("tax_applies_to", "subtotal")
    config.setdefault("credit_card_surcharge_pct", 0)
    config.setdefault("online_bidding_fee_pct", 0)
    return calculate_buy_cost(hammer, config, payment_method)
