"""Calculator API endpoints — all 5 pricing modes with multi-channel support."""
import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Calculation
from app.schemas import (
    EncoreCostRequest, EbayFeesRequest,
    Mode1Request, Mode2Request, Mode3Request, Mode4Request, Mode5Request,
    AlertRequest,
)
from app.calculators import (
    calculate_encore_cost, calculate_ebay_fees, EBAY_CATEGORIES,
    mode1_forward_pricing, mode2_reverse_lookup, mode3_lot_splitter,
    mode4_max_ad_spend, mode5_price_sensitivity, calculate_net_profit,
)
from app.fees import calculate_fees
from app.buy_cost import check_price_alert

router = APIRouter(prefix="/api/calculator", tags=["calculator"])


@router.get("/categories")
def get_categories():
    return EBAY_CATEGORIES


@router.post("/encore-cost")
def calc_encore_cost(req: EncoreCostRequest):
    return calculate_encore_cost(req.hammer_price, req.payment_method)


@router.post("/ebay-fees")
def calc_ebay_fees(req: EbayFeesRequest):
    return calculate_ebay_fees(
        req.sell_price, req.buyer_shipping_charge, req.fvf_pct,
        req.category, req.has_store, req.top_rated, req.below_standard,
        req.promoted_pct, req.insertion_fee,
    )


def _save_calculation(db: Session, mode: str, input_data: dict, output_data: dict):
    calc = Calculation(
        mode=mode,
        input_json=json.dumps(input_data),
        output_json=json.dumps(output_data),
    )
    db.add(calc)
    db.commit()


def _calc_channel_result(sell_price: float, channel: str, encore: dict,
                         shipping_cost_actual: float, buyer_shipping_charge: float,
                         promoted_pct: float, mode_name: str):
    """For non-eBay channels, produce a simplified result using calculate_fees."""
    total_buy_cost = encore["total_buy_cost"]
    result = calculate_fees(sell_price, channel, shipping_cost_actual, total_buy_cost)
    return {
        "mode": mode_name,
        "sell_price": sell_price,
        "channel": channel,
        "encore_breakdown": encore,
        "channel_fees": result,
        "profit": {
            "net_payout": round(sell_price - result["platform_fee"] - result["shipping_deduction"], 2),
            "net_profit": result["net_profit"],
            "roi_pct": result["roi_pct"],
            "margin_pct": result["margin_pct"],
        },
    }


@router.post("/mode1")
def calc_mode1(req: Mode1Request, db: Session = Depends(get_db)):
    data = req.model_dump()
    channel = data.pop("sale_channel", "ebay")

    if channel != "ebay":
        encore = calculate_encore_cost(data["hammer_price"], data["payment_method"])
        total_buy_cost = encore["total_buy_cost"]
        # For non-eBay: sell_price = buy_cost + shipping + target_profit (no platform fees for kijiji/fb_local, simple fee for others)
        target = data.get("target_profit_dollar") or 0
        if data.get("target_profit_pct"):
            target = total_buy_cost * (data["target_profit_pct"] / 100)
        base_sell = total_buy_cost + data.get("shipping_cost_actual", 0) + target

        # Adjust for platform fee
        if channel in ("facebook_shipped",):
            # fee = max(sell * 0.10, 0.80), so sell = (cost + target + shipping) / 0.90
            base_sell = max(base_sell / 0.90, base_sell + 0.80)
        elif channel == "poshmark":
            # fee = 20% if >= $20, flat $3.95 if < $20
            if base_sell >= 20:
                base_sell = base_sell / 0.80
            else:
                base_sell = base_sell + 3.95

        sell_price = round(base_sell, 2)
        r = _calc_channel_result(sell_price, channel, encore,
                                  data.get("shipping_cost_actual", 0),
                                  data.get("buyer_shipping_charge", 0),
                                  data.get("promoted_pct", 0), "forward")
        r["breakeven_price"] = round(total_buy_cost + data.get("shipping_cost_actual", 0), 2)
        _save_calculation(db, "forward", req.model_dump(), r)
        return r

    result = mode1_forward_pricing(**data)
    _save_calculation(db, "forward", req.model_dump(), result)
    return result


@router.post("/mode2")
def calc_mode2(req: Mode2Request, db: Session = Depends(get_db)):
    data = req.model_dump()
    channel = data.pop("sale_channel", "ebay")

    if channel != "ebay":
        encore = calculate_encore_cost(data["hammer_price"], data["payment_method"])
        r = _calc_channel_result(data["sold_price"], channel, encore,
                                  data.get("shipping_cost_actual", 0),
                                  data.get("buyer_shipping_charge", 0),
                                  data.get("promoted_pct", 0), "reverse")
        roi = r["profit"]["roi_pct"]
        r["verdict"] = ("Great flip! 🎉" if roi >= 50 else
                        "Decent profit 👍" if roi >= 20 else
                        "Marginal — barely worth it 😐" if roi >= 0 else
                        "Loss — not worth it ❌")
        _save_calculation(db, "reverse", req.model_dump(), r)
        return r

    result = mode2_reverse_lookup(**data)
    _save_calculation(db, "reverse", req.model_dump(), result)
    return result


@router.post("/mode3")
def calc_mode3(req: Mode3Request, db: Session = Depends(get_db)):
    data = req.model_dump()
    channel = data.pop("sale_channel", "ebay")
    if channel != "ebay":
        data["sale_channel"] = "ebay"  # Internally process as eBay since lot_splitter calls mode1/mode2
    result = mode3_lot_splitter(**data)
    if channel != "ebay":
        result["channel"] = channel
    _save_calculation(db, "lot_splitter", req.model_dump(), result)
    return result


@router.post("/mode4")
def calc_mode4(req: Mode4Request, db: Session = Depends(get_db)):
    result = mode4_max_ad_spend(**req.model_dump())
    _save_calculation(db, "max_ad_spend", req.model_dump(), result)
    return result


@router.post("/mode5")
def calc_mode5(req: Mode5Request, db: Session = Depends(get_db)):
    data = req.model_dump()
    channel = data.pop("sale_channel", "ebay")

    if channel != "ebay":
        encore = calculate_encore_cost(data["hammer_price"], data["payment_method"])
        total_buy_cost = encore["total_buy_cost"]
        shipping = data.get("shipping_cost_actual", 0)
        breakeven = total_buy_cost + shipping
        max_price = total_buy_cost * 3
        if max_price <= breakeven:
            max_price = breakeven * 3
        num_points = data.get("num_points", 50)
        step = (max_price - breakeven) / max(num_points - 1, 1)
        data_points = []
        for i in range(num_points):
            sp = round(breakeven + (step * i), 2)
            r = calculate_fees(sp, channel, shipping, total_buy_cost)
            data_points.append({
                "sell_price": sp,
                "net_profit": r["net_profit"],
                "roi_pct": r["roi_pct"],
                "margin_pct": r["margin_pct"],
                "max_ad_pct": 0.0,
            })
        result = {
            "mode": "price_sensitivity",
            "channel": channel,
            "encore_breakdown": encore,
            "breakeven_price": round(breakeven, 2),
            "max_price": round(max_price, 2),
            "data_points": data_points,
        }
        _save_calculation(db, "price_sensitivity", req.model_dump(), result)
        return result

    result = mode5_price_sensitivity(**data)
    _save_calculation(db, "price_sensitivity", req.model_dump(), result)
    return result


@router.post("/alert")
def calc_alert(req: AlertRequest):
    """Feature 1.5 — Break-even alert: returns level + message based on sell price vs costs."""
    encore = calculate_encore_cost(req.hammer_price, req.payment_method)
    total_buy_cost = encore["total_buy_cost"]

    channel = req.channel or "ebay"
    if channel == "ebay":
        ebay = calculate_ebay_fees(
            req.sell_price, req.buyer_shipping_charge,
            promoted_pct=req.promoted_pct, category=req.category,
        )
        ebay_fees = ebay["total_ebay_fees"]
    else:
        ebay_fees = 0.0

    fees_result = calculate_fees(
        sale_price=req.sell_price, channel=channel,
        your_shipping_cost=req.shipping_cost,
        total_buy_cost=total_buy_cost, ebay_fees=ebay_fees,
    )
    alert = check_price_alert(
        sell_price=req.sell_price,
        buy_cost=total_buy_cost,
        platform_fees=fees_result["platform_fee"],
        target_margin=req.target_margin_pct,
    )
    return alert
