"""
FlipIQ — Configurable Buy-Cost Engine, Province Tax Rates, and Break-Even Alerts.
Features 1.1, 1.2, 1.5.
"""

# ── FEATURE 1.2 — Canadian Province Tax Rates (hardcoded) ──────────────────

CANADA_TAX_RATES = {
    "AB": {"name": "Alberta",                  "rate": 5.0,   "type": "GST only"},
    "BC": {"name": "British Columbia",          "rate": 12.0,  "type": "GST+PST"},
    "MB": {"name": "Manitoba",                  "rate": 12.0,  "type": "GST+PST"},
    "NB": {"name": "New Brunswick",             "rate": 15.0,  "type": "HST"},
    "NL": {"name": "Newfoundland & Labrador",   "rate": 15.0,  "type": "HST"},
    "NS": {"name": "Nova Scotia",               "rate": 15.0,  "type": "HST"},
    "NT": {"name": "Northwest Territories",     "rate": 5.0,   "type": "GST only"},
    "NU": {"name": "Nunavut",                   "rate": 5.0,   "type": "GST only"},
    "ON": {"name": "Ontario",                   "rate": 13.0,  "type": "HST"},
    "PE": {"name": "Prince Edward Island",      "rate": 15.0,  "type": "HST"},
    "QC": {"name": "Quebec",                    "rate": 14.975, "type": "GST+QST"},
    "SK": {"name": "Saskatchewan",              "rate": 11.0,  "type": "GST+PST"},
    "YT": {"name": "Yukon",                     "rate": 5.0,   "type": "GST only"},
}


# ── FEATURE 1.1 — Preset Auction House Configs ─────────────────────────────

PRESET_AUCTION_HOUSES = [
    {
        "name": "Encore Auctions (London ON)",
        "buyer_premium_pct": 16.0,
        "handling_fee_flat": 1.50,
        "handling_fee_pct": 0.0,
        "handling_fee_mode": "flat",
        "tax_pct": 13.0,
        "tax_applies_to": "subtotal",
        "credit_card_surcharge_pct": 2.0,
        "online_bidding_fee_pct": 0.0,
        "payment_methods": "etransfer,credit_card",
        "lot_handling": "per_item",
        "currency": "CAD",
        "notes": "",
        "is_default": 1,
    },
    {
        "name": "HiBid (Generic)",
        "buyer_premium_pct": 15.0,
        "handling_fee_flat": 0.0,
        "handling_fee_pct": 0.0,
        "handling_fee_mode": "none",
        "tax_pct": 13.0,
        "tax_applies_to": "subtotal",
        "credit_card_surcharge_pct": 3.0,
        "online_bidding_fee_pct": 0.0,
        "payment_methods": "credit_card,etransfer",
        "currency": "CAD",
        "notes": "",
        "is_default": 0,
    },
    {
        "name": "MaxSold",
        "buyer_premium_pct": 0.0,
        "handling_fee_flat": 0.0,
        "handling_fee_pct": 0.0,
        "handling_fee_mode": "none",
        "tax_pct": 13.0,
        "tax_applies_to": "hammer_only",
        "credit_card_surcharge_pct": 0.0,
        "online_bidding_fee_pct": 0.0,
        "payment_methods": "credit_card",
        "currency": "CAD",
        "notes": "",
        "is_default": 0,
    },
    {
        "name": "BidFTA",
        "buyer_premium_pct": 16.0,
        "handling_fee_flat": 3.00,
        "handling_fee_pct": 0.0,
        "handling_fee_mode": "flat",
        "tax_pct": 13.0,
        "tax_applies_to": "subtotal",
        "credit_card_surcharge_pct": 0.0,
        "online_bidding_fee_pct": 0.0,
        "payment_methods": "credit_card,cash",
        "currency": "CAD",
        "notes": "",
        "is_default": 0,
    },
    {
        "name": "Ritchie Bros. / IronPlanet",
        "buyer_premium_pct": 10.0,
        "handling_fee_flat": 0.0,
        "handling_fee_pct": 0.0,
        "handling_fee_mode": "none",
        "tax_pct": 13.0,
        "tax_applies_to": "subtotal",
        "credit_card_surcharge_pct": 2.5,
        "online_bidding_fee_pct": 0.0,
        "payment_methods": "wire,credit_card",
        "currency": "CAD",
        "notes": "",
        "is_default": 0,
    },
    {
        "name": "Custom Auction House",
        "buyer_premium_pct": 0.0,
        "handling_fee_flat": 0.0,
        "handling_fee_pct": 0.0,
        "handling_fee_mode": "none",
        "tax_pct": 13.0,
        "tax_applies_to": "subtotal",
        "credit_card_surcharge_pct": 0.0,
        "online_bidding_fee_pct": 0.0,
        "payment_methods": "cash",
        "currency": "CAD",
        "notes": "",
        "is_default": 0,
    },
]


def get_preset_config(name: str) -> dict:
    """Get a preset auction house config by name."""
    for preset in PRESET_AUCTION_HOUSES:
        if preset["name"] == name:
            return preset
    raise ValueError(f"Unknown preset: {name}")


def calculate_buy_cost(hammer: float, config: dict, payment_method: str) -> dict:
    """
    Feature 1.1 — Dynamic buy-cost formula driven by auction house config.
    """
    premium = hammer * (config["buyer_premium_pct"] / 100)

    if config["handling_fee_mode"] == "flat":
        handling = config["handling_fee_flat"]
    elif config["handling_fee_mode"] == "pct":
        handling = hammer * (config["handling_fee_pct"] / 100)
    else:
        handling = 0.0

    online_fee = hammer * (config.get("online_bidding_fee_pct", 0) / 100)

    if config["tax_applies_to"] == "subtotal":
        taxable = hammer + premium + handling + online_fee
    elif config["tax_applies_to"] == "hammer_only":
        taxable = hammer
    else:
        taxable = hammer + premium + handling + online_fee

    tax = taxable * (config["tax_pct"] / 100)
    subtotal = hammer + premium + handling + online_fee + tax

    cc_surcharge = 0.0
    if payment_method == "credit_card":
        cc_surcharge = subtotal * (config.get("credit_card_surcharge_pct", 0) / 100)

    total = subtotal + cc_surcharge

    return {
        "hammer": round(hammer, 2),
        "buyer_premium": round(premium, 2),
        "handling_fee": round(handling, 2),
        "online_bidding_fee": round(online_fee, 2),
        "taxable_amount": round(taxable, 2),
        "tax": round(tax, 2),
        "subtotal_before_surcharge": round(subtotal, 2),
        "credit_card_surcharge": round(cc_surcharge, 2),
        "total_buy_cost": round(total, 2),
    }


# ── FEATURE 1.5 — Break-Even Price Alert Logic ──────────────────────────────

def check_price_alert(
    sell_price: float,
    buy_cost: float,
    platform_fees: float,
    target_margin: float = 0.0,
) -> dict:
    """
    Returns alert level and message based on sell price vs buy cost + fees.
    Levels: 'red', 'orange', 'yellow', 'green'.
    """
    breakeven_with_fees = buy_cost + platform_fees
    net_profit = sell_price - breakeven_with_fees
    roi_pct = (net_profit / buy_cost * 100) if buy_cost > 0 else 0.0
    margin_pct = (net_profit / sell_price * 100) if sell_price > 0 else 0.0

    if sell_price < buy_cost:
        loss = buy_cost - sell_price
        return {
            "level": "red",
            "message": f"🚨 Below Break-Even — You will LOSE ${loss:.2f} at this price. Minimum to break even: ${buy_cost:.2f}",
            "net_profit": round(net_profit, 2),
            "roi_pct": round(roi_pct, 2),
            "breakeven_price": round(buy_cost, 2),
            "breakeven_with_fees": round(breakeven_with_fees, 2),
        }

    if sell_price < breakeven_with_fees:
        return {
            "level": "orange",
            "message": f"⚠️ Thin Margin — After fees you make ${net_profit:.2f} (ROI: {roi_pct:.1f}%). Break-even with fees: ${breakeven_with_fees:.2f}",
            "net_profit": round(net_profit, 2),
            "roi_pct": round(roi_pct, 2),
            "breakeven_price": round(buy_cost, 2),
            "breakeven_with_fees": round(breakeven_with_fees, 2),
        }

    if target_margin > 0 and margin_pct < target_margin:
        # Calculate recommended price to hit target margin
        # target_margin = (sell - breakeven_with_fees) / sell * 100
        # sell * target_margin/100 = sell - breakeven_with_fees
        # sell * (1 - target_margin/100) = breakeven_with_fees
        denom = 1 - (target_margin / 100)
        recommended_price = breakeven_with_fees / denom if denom > 0 else breakeven_with_fees
        return {
            "level": "yellow",
            "message": f"📉 Below Your Target — You wanted {target_margin:.0f}% margin, this gives you {margin_pct:.1f}%. Recommended price: ${recommended_price:.2f}",
            "net_profit": round(net_profit, 2),
            "roi_pct": round(roi_pct, 2),
            "breakeven_price": round(buy_cost, 2),
            "breakeven_with_fees": round(breakeven_with_fees, 2),
        }

    max_ad_pct = ((sell_price - breakeven_with_fees) / sell_price * 100) if sell_price > 0 else 0
    return {
        "level": "green",
        "message": f"✅ Healthy Margin — Net profit: ${net_profit:.2f} | ROI: {roi_pct:.1f}% | Ad budget available: {max_ad_pct:.1f}%",
        "net_profit": round(net_profit, 2),
        "roi_pct": round(roi_pct, 2),
        "breakeven_price": round(buy_cost, 2),
        "breakeven_with_fees": round(breakeven_with_fees, 2),
    }


# ── Shipping Presets (Feature 1.3) ──────────────────────────────────────────

SHIPPING_PRESETS = [
    {"name": "Canada Post – Small Packet (under 500g)",   "carrier": "Canada Post", "max_weight_kg": 0.5,  "cost_cad": 9.50},
    {"name": "Canada Post – Small Packet (500g–1kg)",     "carrier": "Canada Post", "max_weight_kg": 1.0,  "cost_cad": 12.00},
    {"name": "Canada Post – Expedited Parcel (under 2kg)","carrier": "Canada Post", "max_weight_kg": 2.0,  "cost_cad": 15.50},
    {"name": "Canada Post – Expedited Parcel (2–5kg)",    "carrier": "Canada Post", "max_weight_kg": 5.0,  "cost_cad": 19.00},
    {"name": "Canada Post – Expedited Parcel (5–10kg)",   "carrier": "Canada Post", "max_weight_kg": 10.0, "cost_cad": 24.00},
    {"name": "UPS Ground (under 2kg)",                    "carrier": "UPS",         "max_weight_kg": 2.0,  "cost_cad": 14.00},
    {"name": "UPS Ground (2–5kg)",                        "carrier": "UPS",         "max_weight_kg": 5.0,  "cost_cad": 18.00},
    {"name": "FedEx Ground (under 5kg)",                  "carrier": "FedEx",       "max_weight_kg": 5.0,  "cost_cad": 16.00},
    {"name": "Local Pickup – No Shipping",                "carrier": "None",        "max_weight_kg": None, "cost_cad": 0.00},
]
