"""
FlipIQ Multi-Channel Fee Calculator
Supports: eBay, Facebook Local, Facebook Shipped, Poshmark, Kijiji, Other
"""

VALID_CHANNELS = ["ebay", "facebook_local", "facebook_shipped", "poshmark", "kijiji", "other"]

CHANNEL_LABELS = {
    "ebay": "eBay",
    "facebook_local": "Facebook Marketplace – Local Pickup",
    "facebook_shipped": "Facebook Marketplace – Shipped",
    "poshmark": "Poshmark",
    "kijiji": "Kijiji",
    "other": "Other (no fees)",
}


def calculate_fees(
    sale_price: float,
    channel: str,
    your_shipping_cost: float,
    total_buy_cost: float,
    ebay_fees: float = 0.0,
) -> dict:
    """
    Calculate platform fees, net profit, ROI, and margin for any sales channel.
    """
    if channel == "ebay":
        platform_fee = ebay_fees
        shipping_deduction = your_shipping_cost

    elif channel == "facebook_local":
        platform_fee = 0.00
        shipping_deduction = 0.00

    elif channel == "facebook_shipped":
        platform_fee = max(sale_price * 0.10, 0.80)
        shipping_deduction = your_shipping_cost

    elif channel == "poshmark":
        platform_fee = 3.95 if sale_price < 20 else sale_price * 0.20
        shipping_deduction = 0.00

    elif channel == "kijiji":
        platform_fee = 0.00
        shipping_deduction = 0.00

    elif channel == "other":
        platform_fee = 0.00
        shipping_deduction = your_shipping_cost

    else:
        raise ValueError(f"Unknown channel: {channel}")

    net_profit = sale_price - platform_fee - shipping_deduction - total_buy_cost
    roi = (net_profit / total_buy_cost) * 100 if total_buy_cost > 0 else 0.0
    margin = (net_profit / sale_price) * 100 if sale_price > 0 else 0.0

    return {
        "net_profit": round(net_profit, 2),
        "roi_pct": round(roi, 2),
        "margin_pct": round(margin, 2),
        "platform_fee": round(platform_fee, 2),
        "shipping_deduction": round(shipping_deduction, 2),
        "channel": channel,
    }
