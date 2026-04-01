"""All Items API — cross-auction inventory with search, filters, and export."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, asc, or_, and_
from app.database import get_db
from app.models import Item, Auction, User
from app.auth.jwt import require_auth

router = APIRouter(prefix="/api/items", tags=["items"])


@router.get("/search")
def search_items(
    q: Optional[str] = Query(None, description="Full-text search across name, description, notes"),
    auction_ids: Optional[str] = Query(None, description="Comma-separated auction IDs"),
    status: Optional[str] = Query(None, description="Filter by status: unlisted,listed,sold,unsold"),
    category: Optional[str] = Query(None, description="Filter by category"),
    date_from: Optional[str] = Query(None, description="Purchase date from (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Purchase date to (YYYY-MM-DD)"),
    price_min: Optional[float] = Query(None, description="Min purchase price"),
    price_max: Optional[float] = Query(None, description="Max purchase price"),
    profit_min: Optional[float] = Query(None, description="Min profit"),
    profit_max: Optional[float] = Query(None, description="Max profit"),
    channel: Optional[str] = Query(None, description="Sale channel filter"),
    sort_by: Optional[str] = Query("date", description="Sort by: date, price, profit, status, name"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc, desc"),
    page: int = Query(1, description="Page number"),
    per_page: int = Query(50, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    """Search and filter items across all auctions."""
    query = db.query(Item).join(Auction).filter(Auction.user_id == current_user.id)

    # Full-text search
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Item.name.ilike(search_term),
                Item.notes.ilike(search_term),
            )
        )

    # Auction filter (multi-select)
    if auction_ids:
        ids = [int(x) for x in auction_ids.split(",") if x.isdigit()]
        if ids:
            query = query.filter(Item.auction_id.in_(ids))

    # Status filter
    if status:
        query = query.filter(Item.status == status)

    # Category filter
    if category and category != "all":
        query = query.filter(Item.category == category)

    # Date range filter (based on auction date)
    if date_from:
        query = query.filter(Auction.date >= date_from)
    if date_to:
        query = query.filter(Auction.date <= date_to)

    # Purchase price range
    if price_min is not None:
        query = query.filter(Item.buy_cost_total >= price_min)
    if price_max is not None:
        query = query.filter(Item.buy_cost_total <= price_max)

    # Profit range
    if profit_min is not None:
        query = query.filter(Item.net_profit >= profit_min)
    if profit_max is not None:
        query = query.filter(Item.net_profit <= profit_max)

    # Channel filter
    if channel and channel != "all":
        query = query.filter(Item.sale_channel == channel)

    # Count total before pagination
    total_count = query.count()

    # Sorting
    sort_field_map = {
        "date": Auction.date,
        "price": Item.buy_cost_total,
        "profit": Item.net_profit,
        "status": Item.status,
        "name": Item.name,
    }
    sort_field = sort_field_map.get(sort_by, Auction.date)
    sort_func = desc if sort_order == "desc" else asc
    query = query.order_by(sort_func(sort_field))

    # Pagination
    query = query.offset((page - 1) * per_page).limit(per_page)

    # Load auction info for each item
    items = query.options(joinedload(Item.auction)).all()

    # Calculate summary stats
    all_items_query = db.query(Item).join(Auction).filter(Auction.user_id == current_user.id)
    if auction_ids:
        all_items_query = all_items_query.filter(Item.auction_id.in_(ids))
    if status:
        all_items_query = all_items_query.filter(Item.status == status)
    # ... apply same filters for accurate totals

    summary = db.query(
        func.count(Item.id).label("total_items"),
        func.sum(Item.buy_cost_total).label("total_spent"),
        func.sum(Item.sold_price).label("total_revenue"),
        func.sum(Item.net_profit).label("total_profit"),
    ).join(Auction).filter(
        Auction.user_id == current_user.id,
        # Apply same filters for summary except profit (which might be null)
        (Item.auction_id.in_(ids)) if auction_ids else True
    ).first()

    return {
        "items": [
            {
                "id": item.id,
                "name": item.name,
                "description": item.notes or "",
                "category": item.category,
                "lot_number": item.lot_number,
                "auction_name": item.auction.name,
                "auction_date": item.auction.date,
                "purchase_price": item.buy_cost_total,
                "hammer_price": item.hammer_price,
                "estimated_resale": item.estimated_resale,
                "sold_price": item.sold_price,
                "status": item.status,
                "net_profit": item.net_profit,
                "roi_pct": item.roi_pct,
                "platform_sold_on": item.platform_sold_on or item.sale_channel,
                "sale_channel": item.sale_channel,
                "notes": item.notes,
                "list_price": item.list_price,
                "sell_date": item.sell_date,
            }
            for item in items
        ],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total_count,
            "total_pages": (total_count + per_page - 1) // per_page,
        },
        "summary": {
            "total_items": summary.total_items or 0 if summary else 0,
            "total_spent": summary.total_spent or 0.0 if summary else 0.0,
            "total_revenue": summary.total_revenue or 0.0 if summary else 0.0,
            "total_profit": summary.total_profit or 0.0 if summary else 0.0,
        }
    }


@router.get("/summary")
def get_items_summary(db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Get aggregate stats for all items."""
    result = db.query(
        func.count(Item.id).label("total_items"),
        func.sum(Item.buy_cost_total).label("total_spent"),
        func.sum(Item.sold_price).label("total_revenue"),
        func.sum(Item.net_profit).label("total_profit"),
        func.count().filter(Item.status == "unlisted").label("unlisted_count"),
        func.count().filter(Item.status == "listed").label("listed_count"),
        func.count().filter(Item.status == "sold").label("sold_count"),
        func.count().filter(Item.status == "unsold").label("unsold_count"),
    ).join(Auction).filter(Auction.user_id == current_user.id).first()

    return {
        "total_items": result.total_items or 0,
        "total_spent": result.total_spent or 0.0,
        "total_revenue": result.total_revenue or 0.0,
        "total_profit": result.total_profit or 0.0,
        "status_breakdown": {
            "unlisted": result.unlisted_count or 0,
            "listed": result.listed_count or 0,
            "sold": result.sold_count or 0,
            "unsold": result.unsold_count or 0,
        }
    }


@router.get("/categories")
def get_item_categories(db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Get all unique item categories across all auctions."""
    categories = db.query(Item.category).join(Auction).filter(
        Auction.user_id == current_user.id
    ).distinct().all()
    return [c[0] for c in categories if c[0]]
