"""
FlipIQ Multi-Channel Fee Tests
Tests for Kijiji, Facebook Local, Facebook Shipped, Poshmark, and edge cases.
"""
import pytest
from app.fees import calculate_fees

BUY_COST = 10.00


# ── KIJIJI ──────────────────────────────────────────────────────────────
class TestKijiji:
    def test_zero_fees(self):
        result = calculate_fees(50.00, "kijiji", 0.00, BUY_COST)
        assert result["platform_fee"] == 0.00

    def test_zero_shipping(self):
        result = calculate_fees(50.00, "kijiji", 5.00, BUY_COST)
        assert result["shipping_deduction"] == 0.00  # shipping ignored on Kijiji

    def test_net_profit_equals_sale_minus_buy(self):
        result = calculate_fees(50.00, "kijiji", 0.00, BUY_COST)
        assert result["net_profit"] == 40.00

    def test_roi(self):
        result = calculate_fees(50.00, "kijiji", 0.00, BUY_COST)
        assert result["roi_pct"] == 400.00

    def test_margin(self):
        result = calculate_fees(50.00, "kijiji", 0.00, BUY_COST)
        assert result["margin_pct"] == 80.00


# ── FACEBOOK LOCAL ───────────────────────────────────────────────────────
class TestFacebookLocal:
    def test_zero_fee(self):
        result = calculate_fees(40.00, "facebook_local", 0.00, BUY_COST)
        assert result["platform_fee"] == 0.00

    def test_profit_equals_sale_minus_buy(self):
        result = calculate_fees(40.00, "facebook_local", 0.00, BUY_COST)
        assert result["net_profit"] == 30.00

    def test_ignores_shipping_input(self):
        result = calculate_fees(40.00, "facebook_local", 9.99, BUY_COST)
        assert result["shipping_deduction"] == 0.00
        assert result["net_profit"] == 30.00


# ── FACEBOOK SHIPPED ─────────────────────────────────────────────────────
class TestFacebookShipped:
    def test_minimum_fee(self):
        result = calculate_fees(8.00, "facebook_shipped", 0.00, BUY_COST)
        assert result["platform_fee"] == 0.80   # max(0.80, 10%) = $0.80

    def test_standard_fee(self):
        result = calculate_fees(50.00, "facebook_shipped", 0.00, BUY_COST)
        assert result["platform_fee"] == 5.00   # 10% of $50

    def test_with_shipping(self):
        result = calculate_fees(50.00, "facebook_shipped", 8.00, BUY_COST)
        assert result["net_profit"] == round(50.00 - 5.00 - 8.00 - BUY_COST, 2)

    def test_small_item_minimum_applies(self):
        result = calculate_fees(3.00, "facebook_shipped", 0.00, BUY_COST)
        assert result["platform_fee"] == 0.80   # 10% = $0.30, minimum $0.80 applies


# ── POSHMARK ─────────────────────────────────────────────────────────────
class TestPoshmark:
    def test_flat_fee_under_20(self):
        result = calculate_fees(12.00, "poshmark", 0.00, BUY_COST)
        assert result["platform_fee"] == 3.95

    def test_percentage_at_20(self):
        result = calculate_fees(20.00, "poshmark", 0.00, BUY_COST)
        assert result["platform_fee"] == 4.00   # 20% of $20

    def test_percentage_at_100(self):
        result = calculate_fees(100.00, "poshmark", 0.00, BUY_COST)
        assert result["platform_fee"] == 20.00  # 20% of $100

    def test_zero_shipping_deduction(self):
        result = calculate_fees(50.00, "poshmark", 9.99, BUY_COST)
        assert result["shipping_deduction"] == 0.00  # Poshmark covers label

    def test_profit_at_100(self):
        result = calculate_fees(100.00, "poshmark", 0.00, BUY_COST)
        assert result["net_profit"] == 70.00    # $100 - $20 fee - $10 buy


# ── EBAY PASSTHROUGH ──────────────────────────────────────────────────────
class TestEbayChannel:
    def test_ebay_uses_provided_fees(self):
        result = calculate_fees(100.00, "ebay", 5.00, BUY_COST, ebay_fees=15.00)
        assert result["platform_fee"] == 15.00
        assert result["shipping_deduction"] == 5.00
        assert result["net_profit"] == round(100 - 15 - 5 - 10, 2)

    def test_ebay_with_zero_ebay_fees(self):
        result = calculate_fees(100.00, "ebay", 0.00, BUY_COST, ebay_fees=0.0)
        assert result["platform_fee"] == 0.0
        assert result["net_profit"] == 90.00


# ── OTHER CHANNEL ─────────────────────────────────────────────────────────
class TestOtherChannel:
    def test_other_zero_fee(self):
        result = calculate_fees(50.00, "other", 5.00, BUY_COST)
        assert result["platform_fee"] == 0.00
        assert result["shipping_deduction"] == 5.00

    def test_other_net_profit(self):
        result = calculate_fees(50.00, "other", 5.00, BUY_COST)
        assert result["net_profit"] == 35.00


# ── INVALID CHANNEL ───────────────────────────────────────────────────────
class TestInvalidChannel:
    def test_invalid_channel_raises(self):
        with pytest.raises(ValueError, match="Unknown channel"):
            calculate_fees(50.00, "amazon", 0.00, BUY_COST)


# ── EDGE CASES ────────────────────────────────────────────────────────────
class TestEdgeCases:
    def test_zero_buy_cost_no_division_error(self):
        result = calculate_fees(50.00, "kijiji", 0.00, 0.00)
        assert result["roi_pct"] == 0.0         # guard against divide by zero

    def test_zero_sale_price_no_division_error(self):
        result = calculate_fees(0.00, "kijiji", 0.00, BUY_COST)
        assert result["margin_pct"] == 0.0      # guard against divide by zero

    def test_channel_field_returned(self):
        for ch in ["ebay", "facebook_local", "facebook_shipped", "poshmark", "kijiji", "other"]:
            result = calculate_fees(50.00, ch, 0.00, BUY_COST)
            assert result["channel"] == ch


# ── PARAMETRIZED ACROSS ALL CHANNELS ──────────────────────────────────────
ALL_CHANNELS = ["ebay", "facebook_local", "facebook_shipped", "poshmark", "kijiji", "other"]


@pytest.mark.parametrize("channel", ALL_CHANNELS)
def test_all_channels_return_required_keys(channel):
    result = calculate_fees(50.00, channel, 5.00, BUY_COST, ebay_fees=10.0)
    assert "net_profit" in result
    assert "roi_pct" in result
    assert "margin_pct" in result
    assert "platform_fee" in result
    assert "shipping_deduction" in result
    assert "channel" in result


@pytest.mark.parametrize("channel", ALL_CHANNELS)
def test_all_channels_return_numeric_values(channel):
    result = calculate_fees(50.00, channel, 5.00, BUY_COST, ebay_fees=10.0)
    for key in ["net_profit", "roi_pct", "margin_pct", "platform_fee", "shipping_deduction"]:
        assert isinstance(result[key], (int, float)), f"{key} should be numeric for {channel}"
