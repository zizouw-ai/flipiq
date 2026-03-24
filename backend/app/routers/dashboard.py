"""Dashboard API — KPIs and chart data aggregated from auction/item data."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.database import get_db
from app.models import Item, Auction

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/kpis")
def get_kpis(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    category: Optional[str] = None,
    auction_name: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Item).join(Auction)

    if date_from:
        query = query.filter(Auction.date >= date_from)
    if date_to:
        query = query.filter(Auction.date <= date_to)
    if category:
        query = query.filter(Item.category == category)
    if auction_name:
        query = query.filter(Auction.name.ilike(f"%{auction_name}%"))
    if status:
        query = query.filter(Item.status == status)

    items = query.all()

    total_invested = sum(i.buy_cost_total for i in items)
    sold_items = [i for i in items if i.status == "sold" and i.sold_price]
    listed_items = [i for i in items if i.status in ("listed", "sold")]
    total_revenue = sum(i.sold_price for i in sold_items)
    total_profit = sum(i.net_profit for i in sold_items if i.net_profit is not None)
    total_ebay_fees = 0
    for i in sold_items:
        if i.sold_price:
            from app.calculators import calculate_ebay_fees
            fees = calculate_ebay_fees(i.sold_price, i.shipping_charged_buyer, promoted_pct=i.promoted_pct)
            total_ebay_fees += fees["total_ebay_fees"]

    overall_roi = (total_profit / total_invested * 100) if total_invested > 0 else 0
    avg_profit = (total_profit / len(sold_items)) if sold_items else 0
    sell_through = (len(sold_items) / len(listed_items) * 100) if listed_items else 0

    # Avg days to sell — simplified (if sell_date is present)
    days_list = []
    for i in sold_items:
        if i.sell_date:
            try:
                from datetime import datetime
                auction = db.query(Auction).filter(Auction.id == i.auction_id).first()
                if auction:
                    buy_date = datetime.strptime(auction.date, "%Y-%m-%d")
                    sell_date = datetime.strptime(i.sell_date, "%Y-%m-%d")
                    days_list.append((sell_date - buy_date).days)
            except Exception:
                pass
    avg_days = (sum(days_list) / len(days_list)) if days_list else 0

    return {
        "total_invested": round(total_invested, 2),
        "total_revenue": round(total_revenue, 2),
        "total_profit": round(total_profit, 2),
        "overall_roi": round(overall_roi, 2),
        "total_ebay_fees": round(total_ebay_fees, 2),
        "avg_profit_per_item": round(avg_profit, 2),
        "sell_through_rate": round(sell_through, 2),
        "avg_days_to_sell": round(avg_days, 1),
        "total_items": len(items),
        "sold_count": len(sold_items),
        "listed_count": len(listed_items),
    }


@router.get("/charts/monthly")
def get_monthly_chart(db: Session = Depends(get_db)):
    """Monthly Revenue vs. Cost vs. Profit."""
    items = db.query(Item).join(Auction).all()
    monthly = {}
    for item in items:
        auction = db.query(Auction).filter(Auction.id == item.auction_id).first()
        if auction:
            month_key = auction.date[:7]  # YYYY-MM
            if month_key not in monthly:
                monthly[month_key] = {"month": month_key, "revenue": 0, "cost": 0, "profit": 0}
            monthly[month_key]["cost"] += item.buy_cost_total
            if item.status == "sold" and item.sold_price:
                monthly[month_key]["revenue"] += item.sold_price
                monthly[month_key]["profit"] += (item.net_profit or 0)

    data = sorted(monthly.values(), key=lambda x: x["month"])
    for d in data:
        d["revenue"] = round(d["revenue"], 2)
        d["cost"] = round(d["cost"], 2)
        d["profit"] = round(d["profit"], 2)
    return data


@router.get("/charts/roi-by-category")
def get_roi_by_category(db: Session = Depends(get_db)):
    """ROI% by category."""
    items = db.query(Item).filter(Item.status == "sold", Item.net_profit.isnot(None)).all()
    cats = {}
    for i in items:
        if i.category not in cats:
            cats[i.category] = {"category": i.category, "total_profit": 0, "total_cost": 0}
        cats[i.category]["total_profit"] += (i.net_profit or 0)
        cats[i.category]["total_cost"] += i.buy_cost_total

    result = []
    for c in cats.values():
        roi = (c["total_profit"] / c["total_cost"] * 100) if c["total_cost"] > 0 else 0
        result.append({"category": c["category"], "roi_pct": round(roi, 2)})
    return sorted(result, key=lambda x: x["roi_pct"], reverse=True)


@router.get("/charts/best-worst")
def get_best_worst(db: Session = Depends(get_db)):
    """Best and worst 10 items by net profit."""
    items = db.query(Item).filter(Item.status == "sold", Item.net_profit.isnot(None)).all()
    sorted_items = sorted(items, key=lambda x: x.net_profit or 0, reverse=True)
    best = [{"name": i.name, "net_profit": round(i.net_profit, 2)} for i in sorted_items[:10]]
    worst = [{"name": i.name, "net_profit": round(i.net_profit, 2)} for i in sorted_items[-10:]]
    return {"best": best, "worst": worst}


@router.get("/charts/fee-breakdown")
def get_fee_breakdown(db: Session = Depends(get_db)):
    """eBay fee breakdown over time."""
    from app.calculators import calculate_ebay_fees
    items = db.query(Item).join(Auction).filter(Item.status == "sold", Item.sold_price.isnot(None)).all()
    monthly = {}
    for item in items:
        auction = db.query(Auction).filter(Auction.id == item.auction_id).first()
        if auction and item.sold_price:
            month = auction.date[:7]
            fees = calculate_ebay_fees(item.sold_price, item.shipping_charged_buyer, promoted_pct=item.promoted_pct)
            if month not in monthly:
                monthly[month] = {"month": month, "fvf": 0, "processing": 0, "promoted": 0}
            monthly[month]["fvf"] += fees["fvf_amount"]
            monthly[month]["processing"] += fees["processing_fee"]
            monthly[month]["promoted"] += fees["promoted_fee"]

    data = sorted(monthly.values(), key=lambda x: x["month"])
    for d in data:
        d["fvf"] = round(d["fvf"], 2)
        d["processing"] = round(d["processing"], 2)
        d["promoted"] = round(d["promoted"], 2)
    return data


@router.get("/charts/profit-per-auction")
def get_profit_per_auction(db: Session = Depends(get_db)):
    """Profit per auction session (scatter plot data)."""
    auctions = db.query(Auction).all()
    result = []
    for a in auctions:
        items = db.query(Item).filter(Item.auction_id == a.id).all()
        total_cost = sum(i.buy_cost_total for i in items)
        total_profit = sum(i.net_profit for i in items if i.net_profit is not None)
        result.append({
            "auction_name": a.name,
            "date": a.date,
            "total_cost": round(total_cost, 2),
            "total_profit": round(total_profit, 2),
            "item_count": len(items),
        })
    return result


@router.get("/charts/cumulative-profit")
def get_cumulative_profit(db: Session = Depends(get_db)):
    """Cumulative profit over time."""
    items = db.query(Item).join(Auction).filter(
        Item.status == "sold", Item.net_profit.isnot(None)
    ).order_by(Auction.date).all()

    cumulative = 0
    data = []
    for i in items:
        auction = db.query(Auction).filter(Auction.id == i.auction_id).first()
        date = i.sell_date or (auction.date if auction else "unknown")
        cumulative += (i.net_profit or 0)
        data.append({"date": date, "cumulative_profit": round(cumulative, 2), "item": i.name})
    return data
