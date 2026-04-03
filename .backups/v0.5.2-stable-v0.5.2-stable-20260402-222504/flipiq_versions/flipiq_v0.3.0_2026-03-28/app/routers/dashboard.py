"""Dashboard API — KPIs and chart data with multi-channel support."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Item, Auction
from app.fees import calculate_fees, CHANNEL_LABELS
from app.calculators import calculate_ebay_fees

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _get_item_fees(item):
    """Get platform fees for an item based on its channel."""
    channel = item.sale_channel or "ebay"
    if not item.sold_price:
        return 0.0
    if channel == "ebay":
        ebay = calculate_ebay_fees(item.sold_price, item.shipping_charged_buyer, promoted_pct=item.promoted_pct)
        return ebay["total_ebay_fees"]
    result = calculate_fees(item.sold_price, channel, item.shipping_cost_actual, item.buy_cost_total)
    return result["platform_fee"]


def _apply_filters(query, date_from, date_to, category, auction_name, channel, db):
    if date_from:
        query = query.filter(Auction.date >= date_from)
    if date_to:
        query = query.filter(Auction.date <= date_to)
    if category:
        query = query.filter(Item.category == category)
    if auction_name:
        query = query.filter(Auction.name.ilike(f"%{auction_name}%"))
    if channel and channel != "all":
        query = query.filter(Item.sale_channel == channel)
    return query


@router.get("/kpis")
def get_kpis(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    category: Optional[str] = None,
    auction_name: Optional[str] = None,
    status: Optional[str] = None,
    channel: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Item).join(Auction)
    query = _apply_filters(query, date_from, date_to, category, auction_name, channel, db)
    if status:
        query = query.filter(Item.status == status)

    items = query.all()

    total_invested = sum(i.buy_cost_total for i in items)
    sold_items = [i for i in items if i.status == "sold" and i.sold_price]
    listed_items = [i for i in items if i.status in ("listed", "sold")]
    total_revenue = sum(i.sold_price for i in sold_items)
    total_profit = sum(i.net_profit for i in sold_items if i.net_profit is not None)
    total_platform_fees = sum(_get_item_fees(i) for i in sold_items)

    overall_roi = (total_profit / total_invested * 100) if total_invested > 0 else 0
    avg_profit = (total_profit / len(sold_items)) if sold_items else 0
    sell_through = (len(sold_items) / len(listed_items) * 100) if listed_items else 0

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

    # Feature 1.8 — Goal progress
    from app.models import UserSetting
    import calendar
    goal_setting = db.query(UserSetting).filter(UserSetting.key == "monthly_profit_goal_cad").first()
    goal_amount = float(goal_setting.value) if goal_setting else 0.0
    goal_progress = None
    if goal_amount > 0:
        from datetime import datetime
        now = datetime.now()
        current_month = now.strftime("%Y-%m")
        month_items = [i for i in sold_items if i.sell_date and i.sell_date.startswith(current_month)]
        month_profit = sum(i.net_profit for i in month_items if i.net_profit is not None)
        days_in_month = calendar.monthrange(now.year, now.month)[1]
        days_left = days_in_month - now.day
        remaining = max(0, goal_amount - month_profit)
        per_day = remaining / days_left if days_left > 0 else remaining
        pct = round(month_profit / goal_amount * 100, 1) if goal_amount > 0 else 0
        goal_progress = {
            "enabled": True,
            "goal": goal_amount,
            "current": round(month_profit, 2),
            "pct": pct,
            "remaining": round(remaining, 2),
            "days_left": days_left,
            "per_day_needed": round(per_day, 2),
            "exceeded": month_profit >= goal_amount,
            "overage": round(month_profit - goal_amount, 2) if month_profit > goal_amount else 0,
        }

    return {
        "total_invested": round(total_invested, 2),
        "total_revenue": round(total_revenue, 2),
        "total_profit": round(total_profit, 2),
        "overall_roi": round(overall_roi, 2),
        "total_ebay_fees": round(total_platform_fees, 2),
        "avg_profit_per_item": round(avg_profit, 2),
        "sell_through_rate": round(sell_through, 2),
        "avg_days_to_sell": round(avg_days, 1),
        "total_items": len(items),
        "sold_count": len(sold_items),
        "listed_count": len(listed_items),
        "goal_progress": goal_progress,
    }


@router.get("/charts/by-channel")
def get_channel_summary(db: Session = Depends(get_db)):
    """Revenue, profit, ROI, items sold grouped by channel."""
    items = db.query(Item).filter(Item.status == "sold", Item.sold_price.isnot(None)).all()
    channels = {}
    for i in items:
        ch = i.sale_channel or "ebay"
        if ch not in channels:
            channels[ch] = {"channel": ch, "label": CHANNEL_LABELS.get(ch, ch),
                            "revenue": 0, "profit": 0, "cost": 0, "fees": 0, "count": 0}
        channels[ch]["revenue"] += i.sold_price
        channels[ch]["profit"] += (i.net_profit or 0)
        channels[ch]["cost"] += i.buy_cost_total
        channels[ch]["fees"] += _get_item_fees(i)
        channels[ch]["count"] += 1

    result = []
    for c in channels.values():
        c["avg_roi"] = round((c["profit"] / c["cost"] * 100) if c["cost"] > 0 else 0, 2)
        c["revenue"] = round(c["revenue"], 2)
        c["profit"] = round(c["profit"], 2)
        c["fees"] = round(c["fees"], 2)
        result.append(c)
    return sorted(result, key=lambda x: x["revenue"], reverse=True)


@router.get("/charts/monthly")
def get_monthly_chart(channel: Optional[str] = None, db: Session = Depends(get_db)):
    """Monthly Revenue vs. Cost vs. Profit with optional channel filter."""
    query = db.query(Item).join(Auction)
    if channel and channel != "all":
        query = query.filter(Item.sale_channel == channel)
    items = query.all()
    monthly = {}
    for item in items:
        auction = db.query(Auction).filter(Auction.id == item.auction_id).first()
        if auction:
            month_key = auction.date[:7]
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
    items = db.query(Item).filter(Item.status == "sold", Item.net_profit.isnot(None)).all()
    sorted_items = sorted(items, key=lambda x: x.net_profit or 0, reverse=True)
    best = [{"name": i.name, "net_profit": round(i.net_profit, 2), "channel": i.sale_channel or "ebay"} for i in sorted_items[:10]]
    worst = [{"name": i.name, "net_profit": round(i.net_profit, 2), "channel": i.sale_channel or "ebay"} for i in sorted_items[-10:]]
    return {"best": best, "worst": worst}


@router.get("/charts/fee-breakdown")
def get_fee_breakdown(db: Session = Depends(get_db)):
    """Fee breakdown over time — now grouped by channel type."""
    items = db.query(Item).join(Auction).filter(Item.status == "sold", Item.sold_price.isnot(None)).all()
    monthly = {}
    for item in items:
        auction = db.query(Auction).filter(Auction.id == item.auction_id).first()
        if auction and item.sold_price:
            month = auction.date[:7]
            ch = item.sale_channel or "ebay"
            if month not in monthly:
                monthly[month] = {"month": month, "ebay": 0, "facebook_shipped": 0, "poshmark": 0, "no_fees": 0}
            fee = _get_item_fees(item)
            if ch == "ebay":
                monthly[month]["ebay"] += fee
            elif ch == "facebook_shipped":
                monthly[month]["facebook_shipped"] += fee
            elif ch == "poshmark":
                monthly[month]["poshmark"] += fee
            else:
                monthly[month]["no_fees"] += 0  # Kijiji, FB Local, Other = $0

    data = sorted(monthly.values(), key=lambda x: x["month"])
    for d in data:
        d["ebay"] = round(d["ebay"], 2)
        d["facebook_shipped"] = round(d["facebook_shipped"], 2)
        d["poshmark"] = round(d["poshmark"], 2)
        d["no_fees"] = round(d["no_fees"], 2)
    return data


@router.get("/charts/profit-per-auction")
def get_profit_per_auction(db: Session = Depends(get_db)):
    auctions = db.query(Auction).all()
    result = []
    for a in auctions:
        items = db.query(Item).filter(Item.auction_id == a.id).all()
        total_cost = sum(i.buy_cost_total for i in items)
        total_profit = sum(i.net_profit for i in items if i.net_profit is not None)
        result.append({
            "auction_name": a.name, "date": a.date,
            "total_cost": round(total_cost, 2), "total_profit": round(total_profit, 2),
            "item_count": len(items),
        })
    return result


@router.get("/charts/cumulative-profit")
def get_cumulative_profit(channel: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Item).join(Auction).filter(Item.status == "sold", Item.net_profit.isnot(None))
    if channel and channel != "all":
        query = query.filter(Item.sale_channel == channel)
    items = query.order_by(Auction.date).all()
    cumulative = 0
    data = []
    for i in items:
        auction = db.query(Auction).filter(Auction.id == i.auction_id).first()
        date = i.sell_date or (auction.date if auction else "unknown")
        cumulative += (i.net_profit or 0)
        data.append({"date": date, "cumulative_profit": round(cumulative, 2), "item": i.name})
    return data
