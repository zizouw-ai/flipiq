"""
FlipIQ Core Calculation Engine
Encore Auction cost formulas + eBay Canada fee formulas + 5 pricing modes
"""

EBAY_CATEGORIES = [
    {"name": "Most Categories (Default)", "fvf_no_store": 13.6, "fvf_store": 12.7, "threshold": 7500, "fvf_above": 2.35, "per_order_low": 0.30, "per_order_high": 0.40},
    {"name": "Books / DVDs / Movies & TV / Music", "fvf_no_store": 15.3, "fvf_store": 14.6, "threshold": 7500, "fvf_above": 2.35, "per_order_low": 0.30, "per_order_high": 0.40},
    {"name": "Coins & Paper Money (excl. Bullion)", "fvf_no_store": 13.25, "fvf_store": 13.25, "threshold": 7500, "fvf_above": 2.35, "per_order_low": 0.30, "per_order_high": 0.40},
    {"name": "Bullion", "fvf_no_store": 13.6, "fvf_store": 13.6, "threshold": 7500, "fvf_above": 7.0, "per_order_low": 0.30, "per_order_high": 0.40},
    {"name": "Comics / Non-Sport Trading Cards", "fvf_no_store": 13.25, "fvf_store": 13.25, "threshold": 7500, "fvf_above": 2.35, "per_order_low": 0.30, "per_order_high": 0.40},
    {"name": "Sports Trading Cards & CCGs", "fvf_no_store": 13.25, "fvf_store": 13.25, "threshold": 7500, "fvf_above": 2.35, "per_order_low": 0.30, "per_order_high": 0.40},
    {"name": "Jewelry & Watches", "fvf_no_store": 15.0, "fvf_store": 14.55, "threshold": 5000, "fvf_above": 9.0, "per_order_low": 0.30, "per_order_high": 0.40},
    {"name": "Women's Handbags & Bags", "fvf_no_store": 15.0, "fvf_store": 14.55, "threshold": 2000, "fvf_above": 9.0, "per_order_low": 0.30, "per_order_high": 0.40},
    {"name": "Guitars & Basses", "fvf_no_store": 6.7, "fvf_store": 3.5, "threshold": 7500, "fvf_above": 2.35, "per_order_low": 0.30, "per_order_high": 0.40},
    {"name": "Athletic Shoes (under $150)", "fvf_no_store": 13.6, "fvf_store": 12.7, "threshold": 7500, "fvf_above": 2.35, "per_order_low": 0.30, "per_order_high": 0.40},
    {"name": "Athletic Shoes ($150 and over)", "fvf_no_store": 8.0, "fvf_store": 8.0, "threshold": 999999, "fvf_above": 0, "per_order_low": 0.0, "per_order_high": 0.0},
    {"name": "NFTs", "fvf_no_store": 5.0, "fvf_store": 5.0, "threshold": 999999, "fvf_above": 0, "per_order_low": 0.30, "per_order_high": 0.40},
    {"name": "Heavy Equipment (under $15,000)", "fvf_no_store": 3.0, "fvf_store": 2.5, "threshold": 15000, "fvf_above": 0.5, "per_order_low": 0.30, "per_order_high": 0.40},
]


# ---------------------------------------------------------------------------
# PART 1 — Encore Auction Cost Calculation
# ---------------------------------------------------------------------------

def calculate_encore_cost(hammer_price: float, payment_method: str = "etransfer") -> dict:
    """
    Calculate total buy cost from Encore Auctions.
    payment_method: 'etransfer' or 'credit_card'
    """
    premium = hammer_price * 0.16
    handling_fee = 1.50
    subtotal = hammer_price + premium + handling_fee
    hst = subtotal * 0.13
    total_before_cc = subtotal + hst

    if payment_method == "credit_card":
        cc_surcharge = total_before_cc * 0.02
        total_buy_cost = total_before_cc + cc_surcharge
    else:
        cc_surcharge = 0.0
        total_buy_cost = total_before_cc

    return {
        "hammer_price": round(hammer_price, 2),
        "buyers_premium": round(premium, 2),
        "handling_fee": round(handling_fee, 2),
        "subtotal_before_tax": round(subtotal, 2),
        "hst": round(hst, 2),
        "cc_surcharge": round(cc_surcharge, 2),
        "total_buy_cost": round(total_buy_cost, 2),
        "payment_method": payment_method,
    }


# ---------------------------------------------------------------------------
# PART 2 — eBay Canada Fee Calculation
# ---------------------------------------------------------------------------

def get_fvf_rate(category: str = "Most Categories (Default)",
                 has_store: bool = False,
                 top_rated: bool = False,
                 below_standard: bool = False) -> float:
    """Get the Final Value Fee percentage for a category."""
    cat = next((c for c in EBAY_CATEGORIES if c["name"] == category), EBAY_CATEGORIES[0])
    fvf_pct = cat["fvf_store"] if has_store else cat["fvf_no_store"]

    if top_rated:
        fvf_pct *= 0.90  # 10% discount
    if below_standard:
        fvf_pct *= 1.05  # 5% surcharge

    return fvf_pct


def calculate_ebay_fees(
    sell_price: float,
    buyer_shipping_charge: float = 0.0,
    fvf_pct: float = None,
    category: str = "Most Categories (Default)",
    has_store: bool = False,
    top_rated: bool = False,
    below_standard: bool = False,
    promoted_pct: float = 0.0,
    insertion_fee: bool = False,
) -> dict:
    """Calculate all eBay Canada fees for a sale."""
    if fvf_pct is None:
        fvf_pct = get_fvf_rate(category, has_store, top_rated, below_standard)

    total_transaction = sell_price + buyer_shipping_charge
    fvf_amount = total_transaction * (fvf_pct / 100)
    processing_fee = total_transaction * 0.029 + 0.30
    promoted_fee = sell_price * (promoted_pct / 100)
    insertion = 0.35 if insertion_fee else 0.0
    total_ebay_fees = fvf_amount + processing_fee + promoted_fee + insertion

    return {
        "sell_price": round(sell_price, 2),
        "buyer_shipping_charge": round(buyer_shipping_charge, 2),
        "fvf_pct": round(fvf_pct, 4),
        "fvf_amount": round(fvf_amount, 2),
        "processing_fee": round(processing_fee, 2),
        "promoted_pct": round(promoted_pct, 4),
        "promoted_fee": round(promoted_fee, 2),
        "insertion_fee": round(insertion, 2),
        "total_ebay_fees": round(total_ebay_fees, 2),
    }


def calculate_net_profit(
    sell_price: float,
    total_buy_cost: float,
    total_ebay_fees: float,
    shipping_cost_actual: float = 0.0,
) -> dict:
    """Calculate net payout, net profit, ROI%, and margin%."""
    net_payout = sell_price - total_ebay_fees - shipping_cost_actual
    net_profit = net_payout - total_buy_cost
    roi_pct = (net_profit / total_buy_cost * 100) if total_buy_cost > 0 else 0.0
    margin_pct = (net_profit / sell_price * 100) if sell_price > 0 else 0.0

    return {
        "net_payout": round(net_payout, 2),
        "net_profit": round(net_profit, 2),
        "roi_pct": round(roi_pct, 2),
        "margin_pct": round(margin_pct, 2),
    }


# ---------------------------------------------------------------------------
# PART 3 — Pricing Calculator Modes
# ---------------------------------------------------------------------------

def mode1_forward_pricing(
    hammer_price: float,
    payment_method: str = "etransfer",
    shipping_cost_actual: float = 0.0,
    buyer_shipping_charge: float = 0.0,
    promoted_pct: float = 0.0,
    target_profit_dollar: float = None,
    target_profit_pct: float = None,
    fvf_pct: float = None,
    category: str = "Most Categories (Default)",
    has_store: bool = False,
    top_rated: bool = False,
    below_standard: bool = False,
    insertion_fee: bool = False,
) -> dict:
    """MODE 1: Forward Pricing — given buy cost, calculate required sell price."""
    encore = calculate_encore_cost(hammer_price, payment_method)
    total_buy_cost = encore["total_buy_cost"]

    if fvf_pct is None:
        fvf_pct = get_fvf_rate(category, has_store, top_rated, below_standard)

    insertion = 0.35 if insertion_fee else 0.0
    fvf_decimal = fvf_pct / 100
    promoted_decimal = promoted_pct / 100
    processing_decimal = 0.029

    denominator = 1 - fvf_decimal - processing_decimal - promoted_decimal

    if target_profit_pct is not None:
        target_decimal = target_profit_pct / 100
        denominator -= target_decimal
        if denominator <= 0:
            return {"error": "Fee rates exceed 100% — impossible to achieve target profit."}
        sell_price = (total_buy_cost + shipping_cost_actual + 0.30 + insertion) / denominator
    elif target_profit_dollar is not None:
        if denominator <= 0:
            return {"error": "Fee rates exceed 100% — impossible to calculate sell price."}
        sell_price = (total_buy_cost + shipping_cost_actual + target_profit_dollar + 0.30 + insertion) / denominator
    else:
        return {"error": "Must provide either target_profit_dollar or target_profit_pct."}

    sell_price = round(sell_price, 2)

    ebay = calculate_ebay_fees(sell_price, buyer_shipping_charge, fvf_pct,
                                category, has_store, top_rated, below_standard,
                                promoted_pct, insertion_fee)
    profit = calculate_net_profit(sell_price, total_buy_cost, ebay["total_ebay_fees"], shipping_cost_actual)

    # Break-even price (target profit = 0)
    breakeven_denom = 1 - fvf_decimal - processing_decimal - promoted_decimal
    breakeven_price = round((total_buy_cost + shipping_cost_actual + 0.30 + insertion) / breakeven_denom, 2) if breakeven_denom > 0 else 0

    return {
        "mode": "forward",
        "sell_price": sell_price,
        "breakeven_price": breakeven_price,
        "encore_breakdown": encore,
        "ebay_fees": ebay,
        "profit": profit,
    }


def mode2_reverse_lookup(
    sold_price: float,
    hammer_price: float,
    payment_method: str = "etransfer",
    shipping_cost_actual: float = 0.0,
    buyer_shipping_charge: float = 0.0,
    promoted_pct: float = 0.0,
    fvf_pct: float = None,
    category: str = "Most Categories (Default)",
    has_store: bool = False,
    top_rated: bool = False,
    below_standard: bool = False,
    insertion_fee: bool = False,
) -> dict:
    """MODE 2: Reverse Lookup — given sold price, calculate actual profit."""
    encore = calculate_encore_cost(hammer_price, payment_method)
    total_buy_cost = encore["total_buy_cost"]

    ebay = calculate_ebay_fees(sold_price, buyer_shipping_charge, fvf_pct,
                                category, has_store, top_rated, below_standard,
                                promoted_pct, insertion_fee)
    profit = calculate_net_profit(sold_price, total_buy_cost, ebay["total_ebay_fees"], shipping_cost_actual)

    verdict = "Great flip! 🎉" if profit["roi_pct"] >= 50 else \
              "Decent profit 👍" if profit["roi_pct"] >= 20 else \
              "Marginal — barely worth it 😐" if profit["roi_pct"] >= 0 else \
              "Loss — not worth it ❌"

    return {
        "mode": "reverse",
        "sold_price": sold_price,
        "encore_breakdown": encore,
        "ebay_fees": ebay,
        "profit": profit,
        "verdict": verdict,
    }


def mode3_lot_splitter(
    total_hammer_price: float,
    num_items: int,
    payment_method: str = "etransfer",
    per_item_sell_price: float = None,
    shipping_cost_actual: float = 0.0,
    buyer_shipping_charge: float = 0.0,
    promoted_pct: float = 0.0,
    target_profit_dollar: float = None,
    target_profit_pct: float = None,
    fvf_pct: float = None,
    category: str = "Most Categories (Default)",
    has_store: bool = False,
    top_rated: bool = False,
    below_standard: bool = False,
    insertion_fee: bool = False,
) -> dict:
    """MODE 3: Lot Splitter — split a lot into per-unit costs and pricing."""
    if num_items <= 0:
        return {"error": "Number of items must be greater than 0."}

    per_unit_hammer = total_hammer_price / num_items
    encore = calculate_encore_cost(total_hammer_price, payment_method)
    per_unit_buy_cost = round(encore["total_buy_cost"] / num_items, 2)

    per_unit_encore = calculate_encore_cost(per_unit_hammer, payment_method)

    items = []
    for i in range(num_items):
        if per_item_sell_price is not None:
            # Reverse mode for each item
            item_result = mode2_reverse_lookup(
                per_item_sell_price, per_unit_hammer, payment_method,
                shipping_cost_actual, buyer_shipping_charge, promoted_pct,
                fvf_pct, category, has_store, top_rated, below_standard, insertion_fee
            )
        else:
            # Forward mode for each item
            item_result = mode1_forward_pricing(
                per_unit_hammer, payment_method, shipping_cost_actual,
                buyer_shipping_charge, promoted_pct, target_profit_dollar,
                target_profit_pct, fvf_pct, category, has_store, top_rated,
                below_standard, insertion_fee
            )
        items.append(item_result)

    return {
        "mode": "lot_splitter",
        "total_hammer_price": total_hammer_price,
        "num_items": num_items,
        "per_unit_hammer": round(per_unit_hammer, 2),
        "per_unit_buy_cost": per_unit_buy_cost,
        "lot_encore_breakdown": encore,
        "per_unit_encore_breakdown": per_unit_encore,
        "items": items,
    }


def mode4_max_ad_spend(
    sell_price: float,
    hammer_price: float,
    payment_method: str = "etransfer",
    shipping_cost_actual: float = 0.0,
    buyer_shipping_charge: float = 0.0,
    target_profit_dollar: float = None,
    target_profit_pct: float = None,
    fvf_pct: float = None,
    category: str = "Most Categories (Default)",
    has_store: bool = False,
    top_rated: bool = False,
    below_standard: bool = False,
    insertion_fee: bool = False,
) -> dict:
    """MODE 4: Max Ad Spend Calculator."""
    encore = calculate_encore_cost(hammer_price, payment_method)
    total_buy_cost = encore["total_buy_cost"]

    if fvf_pct is None:
        fvf_pct = get_fvf_rate(category, has_store, top_rated, below_standard)

    total_transaction = sell_price + buyer_shipping_charge
    fvf_amount = total_transaction * (fvf_pct / 100)
    processing_fee = total_transaction * 0.029 + 0.30
    insertion = 0.35 if insertion_fee else 0.0
    base_fees = fvf_amount + processing_fee + insertion

    if target_profit_pct is not None:
        target_profit = sell_price * (target_profit_pct / 100)
    elif target_profit_dollar is not None:
        target_profit = target_profit_dollar
    else:
        target_profit = 0.0

    remaining_budget = sell_price - total_buy_cost - shipping_cost_actual - base_fees - target_profit
    max_promoted_pct = (remaining_budget / sell_price * 100) if sell_price > 0 else 0.0

    result = {
        "mode": "max_ad_spend",
        "sell_price": sell_price,
        "encore_breakdown": encore,
        "base_fees": round(base_fees, 2),
        "target_profit": round(target_profit, 2),
        "remaining_budget": round(remaining_budget, 2),
        "max_promoted_pct": round(max_promoted_pct, 2),
    }

    if max_promoted_pct < 0:
        # Show alternative sell prices for 2%, 5%, 10%
        alternatives = {}
        for ad_pct in [2, 5, 10]:
            fvf_decimal = fvf_pct / 100
            processing_decimal = 0.029
            ad_decimal = ad_pct / 100
            denom = 1 - fvf_decimal - processing_decimal - ad_decimal
            if target_profit_pct is not None:
                denom -= (target_profit_pct / 100)
            if denom > 0:
                needed_price = (total_buy_cost + shipping_cost_actual + 0.30 + insertion +
                               (target_profit_dollar or 0)) / denom
                alternatives[f"{ad_pct}%"] = round(needed_price, 2)
            else:
                alternatives[f"{ad_pct}%"] = None
        result["alert"] = "You cannot hit your target AND run ads — reprice first."
        result["alternative_sell_prices"] = alternatives

    return result


def mode5_price_sensitivity(
    hammer_price: float,
    payment_method: str = "etransfer",
    shipping_cost_actual: float = 0.0,
    buyer_shipping_charge: float = 0.0,
    promoted_pct: float = 0.0,
    fvf_pct: float = None,
    category: str = "Most Categories (Default)",
    has_store: bool = False,
    top_rated: bool = False,
    below_standard: bool = False,
    insertion_fee: bool = False,
    num_points: int = 50,
) -> dict:
    """MODE 5: Price Sensitivity — generate data points from breakeven to 3× buy cost."""
    encore = calculate_encore_cost(hammer_price, payment_method)
    total_buy_cost = encore["total_buy_cost"]

    if fvf_pct is None:
        fvf_pct = get_fvf_rate(category, has_store, top_rated, below_standard)

    fvf_decimal = fvf_pct / 100
    processing_decimal = 0.029
    promoted_decimal = promoted_pct / 100
    insertion = 0.35 if insertion_fee else 0.0

    denom = 1 - fvf_decimal - processing_decimal - promoted_decimal
    breakeven = (total_buy_cost + shipping_cost_actual + 0.30 + insertion) / denom if denom > 0 else total_buy_cost
    max_price = total_buy_cost * 3

    if max_price <= breakeven:
        max_price = breakeven * 3

    step = (max_price - breakeven) / max(num_points - 1, 1)
    data_points = []

    for i in range(num_points):
        sp = breakeven + (step * i)
        sp = round(sp, 2)
        ebay = calculate_ebay_fees(sp, buyer_shipping_charge, fvf_pct,
                                    category, has_store, top_rated, below_standard,
                                    promoted_pct, insertion_fee)
        profit = calculate_net_profit(sp, total_buy_cost, ebay["total_ebay_fees"], shipping_cost_actual)

        # Max ad spend at this price
        total_transaction = sp + buyer_shipping_charge
        base_fees = total_transaction * (fvf_pct / 100) + total_transaction * 0.029 + 0.30 + insertion
        remaining = sp - total_buy_cost - shipping_cost_actual - base_fees
        max_ad_pct = round((remaining / sp * 100) if sp > 0 else 0, 2)

        data_points.append({
            "sell_price": sp,
            "net_profit": profit["net_profit"],
            "roi_pct": profit["roi_pct"],
            "margin_pct": profit["margin_pct"],
            "max_ad_pct": max_ad_pct,
        })

    return {
        "mode": "price_sensitivity",
        "encore_breakdown": encore,
        "breakeven_price": round(breakeven, 2),
        "max_price": round(max_price, 2),
        "data_points": data_points,
    }
