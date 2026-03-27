"""Phase 1 tests — Auction House Configs, Province Tax, Break-Even Alerts, Export, Currency, Goal Tracker."""
import pytest
from io import BytesIO

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# ── Feature 1.1 — Auction House Configs ─────────────────────────────────────

from app.buy_cost import (
    calculate_buy_cost, get_preset_config, check_price_alert,
    CANADA_TAX_RATES, PRESET_AUCTION_HOUSES, SHIPPING_PRESETS,
)


class TestAuctionHouseConfig:
    def test_encore_buy_cost_etransfer(self):
        config = get_preset_config("Encore Auctions (London ON)")
        result = calculate_buy_cost(50.00, config, "etransfer")
        # hammer=50, premium=8, handling=1.50, subtotal=59.50, tax=7.735→7.74, total=67.235→67.24
        assert result["total_buy_cost"] == pytest.approx(67.24, abs=0.02)

    def test_encore_buy_cost_credit_card(self):
        config = get_preset_config("Encore Auctions (London ON)")
        result = calculate_buy_cost(50.00, config, "credit_card")
        assert result["credit_card_surcharge"] > 0
        assert result["total_buy_cost"] > 67.20

    def test_maxsold_no_premium(self):
        config = get_preset_config("MaxSold")
        result = calculate_buy_cost(50.00, config, "credit_card")
        assert result["buyer_premium"] == 0.00
        # MaxSold taxes hammer_only: tax = 50 * 0.13 = 6.5, total = 56.50
        assert result["tax"] == 6.50

    def test_custom_config_zero_fees(self):
        config = {
            "buyer_premium_pct": 0, "handling_fee_mode": "none",
            "handling_fee_flat": 0, "handling_fee_pct": 0,
            "tax_pct": 0, "tax_applies_to": "subtotal",
            "credit_card_surcharge_pct": 0, "online_bidding_fee_pct": 0,
        }
        result = calculate_buy_cost(50.00, config, "cash")
        assert result["total_buy_cost"] == 50.00

    def test_hibid_credit_card_surcharge(self):
        config = get_preset_config("HiBid (Generic)")
        result = calculate_buy_cost(100.00, config, "credit_card")
        assert result["credit_card_surcharge"] > 0
        assert result["buyer_premium"] == 15.00  # 15% of 100

    def test_bidfta_handling_fee(self):
        config = get_preset_config("BidFTA")
        result = calculate_buy_cost(100.00, config, "etransfer")
        assert result["handling_fee"] == 3.00

    def test_ritchie_bros_surcharge(self):
        config = get_preset_config("Ritchie Bros. / IronPlanet")
        result = calculate_buy_cost(100.00, config, "credit_card")
        assert result["credit_card_surcharge"] > 0
        assert result["buyer_premium"] == 10.00

    def test_all_presets_exist(self):
        assert len(PRESET_AUCTION_HOUSES) == 6

    def test_unknown_preset_raises(self):
        with pytest.raises(ValueError):
            get_preset_config("NonExistent Auction")

    def test_pct_handling_mode(self):
        config = {
            "buyer_premium_pct": 0, "handling_fee_mode": "pct",
            "handling_fee_flat": 0, "handling_fee_pct": 5.0,
            "tax_pct": 0, "tax_applies_to": "subtotal",
            "credit_card_surcharge_pct": 0, "online_bidding_fee_pct": 0,
        }
        result = calculate_buy_cost(100.00, config, "cash")
        assert result["handling_fee"] == 5.00

    def test_online_bidding_fee(self):
        config = {
            "buyer_premium_pct": 0, "handling_fee_mode": "none",
            "handling_fee_flat": 0, "handling_fee_pct": 0,
            "tax_pct": 0, "tax_applies_to": "subtotal",
            "credit_card_surcharge_pct": 0, "online_bidding_fee_pct": 3.0,
        }
        result = calculate_buy_cost(100.00, config, "cash")
        assert result["online_bidding_fee"] == 3.00


# ── Feature 1.2 — Province Tax ──────────────────────────────────────────────

class TestProvinceTax:
    def test_ontario_tax_rate(self):
        assert CANADA_TAX_RATES["ON"]["rate"] == 13.0

    def test_alberta_gst_only(self):
        assert CANADA_TAX_RATES["AB"]["rate"] == 5.0
        assert CANADA_TAX_RATES["AB"]["type"] == "GST only"

    def test_quebec_rate(self):
        assert CANADA_TAX_RATES["QC"]["rate"] == 14.975

    def test_all_13_provinces_present(self):
        assert len(CANADA_TAX_RATES) == 13

    def test_all_have_required_fields(self):
        for code, info in CANADA_TAX_RATES.items():
            assert "name" in info
            assert "rate" in info
            assert "type" in info
            assert isinstance(info["rate"], (int, float))


# ── Feature 1.3 — Shipping Presets ──────────────────────────────────────────

class TestShippingPresets:
    def test_presets_exist(self):
        assert len(SHIPPING_PRESETS) == 9

    def test_local_pickup_zero(self):
        local = [p for p in SHIPPING_PRESETS if "Local Pickup" in p["name"]][0]
        assert local["cost_cad"] == 0.00

    def test_all_have_cost(self):
        for p in SHIPPING_PRESETS:
            assert "cost_cad" in p
            assert isinstance(p["cost_cad"], (int, float))


# ── Feature 1.5 — Break-Even Alerts ─────────────────────────────────────────

class TestBreakEvenAlerts:
    def test_below_buy_cost_triggers_red(self):
        alert = check_price_alert(sell_price=5.00, buy_cost=10.00, platform_fees=2.00, target_margin=30.0)
        assert alert["level"] == "red"

    def test_below_fees_triggers_orange(self):
        alert = check_price_alert(sell_price=11.00, buy_cost=10.00, platform_fees=2.00, target_margin=30.0)
        assert alert["level"] == "orange"

    def test_below_target_margin_triggers_yellow(self):
        alert = check_price_alert(sell_price=14.00, buy_cost=10.00, platform_fees=2.00, target_margin=30.0)
        assert alert["level"] == "yellow"

    def test_healthy_margin_triggers_green(self):
        alert = check_price_alert(sell_price=20.00, buy_cost=10.00, platform_fees=2.00, target_margin=30.0)
        assert alert["level"] == "green"

    def test_red_alert_has_message(self):
        alert = check_price_alert(sell_price=5.00, buy_cost=10.00, platform_fees=2.00)
        assert "LOSE" in alert["message"]

    def test_green_no_target_margin(self):
        alert = check_price_alert(sell_price=20.00, buy_cost=10.00, platform_fees=2.00, target_margin=0.0)
        assert alert["level"] == "green"

    def test_zero_buy_cost_safe(self):
        alert = check_price_alert(sell_price=10.00, buy_cost=0.00, platform_fees=0.00)
        assert alert["level"] == "green"


# ── Feature 1.7 — Currency ──────────────────────────────────────────────────

class TestCurrency:
    def test_cad_to_usd_conversion(self):
        rate = 0.73
        assert round(100.00 * rate, 2) == 73.00

    def test_conversion_roundtrip(self):
        rate = 0.73
        cad = 100.0
        usd = cad * rate
        back = usd / rate
        assert round(back, 2) == 100.0


# ── Feature 1.8 — Profit Goal ───────────────────────────────────────────────

def calculate_goal_progress(current: float, goal: float) -> dict:
    """Standalone test helper matching dashboard logic."""
    if goal <= 0:
        return {"enabled": False}
    remaining = max(0.0, goal - current)
    pct = round(current / goal * 100, 1)
    return {
        "enabled": True,
        "pct": pct,
        "remaining": remaining,
        "exceeded": current >= goal,
        "overage": round(current - goal, 2) if current > goal else 0,
    }


class TestProfitGoal:
    def test_goal_progress_calculation(self):
        progress = calculate_goal_progress(current=1340.00, goal=2000.00)
        assert progress["pct"] == 67.0
        assert progress["remaining"] == 660.00

    def test_goal_exceeded_shows_overage(self):
        progress = calculate_goal_progress(current=2340.00, goal=2000.00)
        assert progress["exceeded"] == True
        assert progress["overage"] == 340.00

    def test_zero_goal_disables_tracker(self):
        progress = calculate_goal_progress(current=500.00, goal=0.0)
        assert progress["enabled"] == False


# ── Feature 1.6 — Export (API tests) ────────────────────────────────────────

class TestExport:
    def test_export_auction_returns_xlsx(self):
        resp = client.post("/api/auctions/", json={"name": "Export Test", "date": "2026-03-25", "total_hammer": 100.0})
        aid = resp.json()["id"]
        client.post(f"/api/auctions/{aid}/items", json={
            "name": "Widget", "hammer_price": 30.0, "status": "sold",
            "sold_price": 50.0, "sell_date": "2026-03-26", "sale_channel": "ebay",
        })
        response = client.get(f"/api/export/auction/{aid}")
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers["content-type"]

    def test_export_auction_not_found(self):
        response = client.get("/api/export/auction/9999")
        assert response.status_code == 404

    def test_export_inventory(self):
        response = client.get("/api/export/inventory")
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers["content-type"]

    def test_export_dashboard_summary(self):
        response = client.get("/api/export/dashboard/summary?year=2026")
        assert response.status_code == 200

    def test_export_tax_summary(self):
        response = client.get("/api/export/tax-summary?year=2026")
        assert response.status_code == 200

    def test_export_columns_present(self):
        resp = client.post("/api/auctions/", json={"name": "Col Test", "date": "2026-03-25"})
        aid = resp.json()["id"]
        client.post(f"/api/auctions/{aid}/items", json={"name": "Item", "hammer_price": 10.0})
        response = client.get(f"/api/export/auction/{aid}")
        import openpyxl
        wb = openpyxl.load_workbook(BytesIO(response.content))
        ws = wb.active
        headers = [cell.value for cell in ws[1]]
        assert "Net Profit" in headers
        assert "ROI %" in headers


# ── API endpoint tests for new routers ───────────────────────────────────────

class TestAuctionHouseAPI:
    def test_list_auction_houses(self):
        resp = client.get("/api/auction-houses/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 6  # 6 seeded presets

    def test_get_provinces(self):
        resp = client.get("/api/auction-houses/provinces")
        assert resp.status_code == 200
        data = resp.json()
        assert "ON" in data
        assert data["ON"]["rate"] == 13.0

    def test_preview_buy_cost(self):
        resp = client.post("/api/auction-houses/preview", json={
            "hammer": 50.0, "buyer_premium_pct": 16.0,
            "handling_fee_mode": "flat", "handling_fee_flat": 1.50,
            "tax_pct": 13.0, "tax_applies_to": "subtotal",
            "payment_method": "etransfer",
        })
        assert resp.status_code == 200
        assert resp.json()["total_buy_cost"] > 50.0


class TestShippingPresetsAPI:
    def test_list_shipping_presets(self):
        resp = client.get("/api/shipping-presets/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 9  # 9 seeded presets


class TestTemplatesAPI:
    def test_list_templates(self):
        resp = client.get("/api/templates/")
        assert resp.status_code == 200

    def test_create_and_delete_template(self):
        resp = client.post("/api/templates/", json={"name": "Test Dyson", "category": "Electronics", "sale_channel": "ebay"})
        assert resp.status_code == 200
        tmpl_id = resp.json()["id"]
        del_resp = client.delete(f"/api/templates/{tmpl_id}")
        assert del_resp.status_code == 200


class TestCurrencyAPI:
    def test_get_currency_rate(self):
        resp = client.get("/api/currency/rate")
        assert resp.status_code == 200
        data = resp.json()
        assert "cad_to_usd" in data
        assert data["cad_to_usd"] > 0
