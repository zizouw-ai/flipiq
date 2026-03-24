"""Auction & Item CRUD API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Auction, Item
from app.schemas import (
    AuctionCreate, AuctionUpdate, AuctionResponse, AuctionListResponse,
    ItemCreate, ItemUpdate, ItemResponse,
)
from app.calculators import calculate_encore_cost, calculate_ebay_fees, calculate_net_profit

router = APIRouter(prefix="/api/auctions", tags=["auctions"])


def _recalc_item(item: Item):
    """Recalculate buy cost, net profit, and ROI for an item."""
    encore = calculate_encore_cost(item.hammer_price, item.payment_method)
    item.buy_cost_total = encore["total_buy_cost"]

    if item.sold_price and item.sold_price > 0:
        ebay = calculate_ebay_fees(
            item.sold_price,
            item.shipping_charged_buyer,
            promoted_pct=item.promoted_pct,
        )
        profit = calculate_net_profit(
            item.sold_price, item.buy_cost_total,
            ebay["total_ebay_fees"], item.shipping_cost_actual,
        )
        item.net_profit = profit["net_profit"]
        item.roi_pct = profit["roi_pct"]


# --- Auctions CRUD ---

@router.get("/", response_model=list[AuctionListResponse])
def list_auctions(db: Session = Depends(get_db)):
    auctions = db.query(Auction).order_by(Auction.date.desc()).all()
    results = []
    for a in auctions:
        item_count = db.query(Item).filter(Item.auction_id == a.id).count()
        results.append(AuctionListResponse(
            id=a.id, name=a.name, date=a.date,
            total_hammer=a.total_hammer, payment_method=a.payment_method,
            notes=a.notes, created_at=a.created_at, item_count=item_count,
        ))
    return results


@router.post("/", response_model=AuctionResponse)
def create_auction(req: AuctionCreate, db: Session = Depends(get_db)):
    auction = Auction(**req.model_dump())
    db.add(auction)
    db.commit()
    db.refresh(auction)
    return auction


@router.get("/{auction_id}", response_model=AuctionResponse)
def get_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = db.query(Auction).options(joinedload(Auction.items)).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return auction


@router.put("/{auction_id}", response_model=AuctionResponse)
def update_auction(auction_id: int, req: AuctionUpdate, db: Session = Depends(get_db)):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(auction, k, v)
    db.commit()
    db.refresh(auction)
    return auction


@router.delete("/{auction_id}")
def delete_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    db.delete(auction)
    db.commit()
    return {"ok": True}


# --- Items CRUD ---

@router.get("/{auction_id}/items", response_model=list[ItemResponse])
def list_items(auction_id: int, db: Session = Depends(get_db)):
    return db.query(Item).filter(Item.auction_id == auction_id).all()


@router.post("/{auction_id}/items", response_model=ItemResponse)
def create_item(auction_id: int, req: ItemCreate, db: Session = Depends(get_db)):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    item = Item(auction_id=auction_id, **req.model_dump())
    _recalc_item(item)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/items/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, req: ItemUpdate, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    _recalc_item(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}
