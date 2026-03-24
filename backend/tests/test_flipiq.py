"""
FlipIQ — Complete pytest test suite.
Tests all Encore cost formulas, eBay fee formulas, all 5 pricing modes,
edge cases, and all API endpoints.
"""
import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.calculators import (
    calculate_encore_cost,
    calculate_ebay_fees,
    calculate_net_profit,
    get_fvf_rate,
    mode1_forward_pricing,
    mode2_reverse_lookup,
    mode3_lot_splitter,
    mode4_max_ad_spend,
    mode5_price_sensitivity,
    EBAY_CATEGORIES,
)

# --- Test DB setup ---
TEST_DB_URL = "sqlite:///./test_flipiq.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# ============================================================================
# PART 1 — Encore Auction Cost Tests
# ============================================================================

class TestEncoreCost:
    def test_etransfer_basic(self):
        """Standard hammer price with e-transfer."""
        r = calculate_encore_cost(100.0, "etransfer")
        assert r["hammer_price"] == 100.0
        assert r["buyers_premium"] == 16.0  # 100 * 0.16
        assert r["handling_fee"] == 1.50
        assert r["subtotal_before_tax"] == 117.50  # 100 + 16 + 1.50
        assert r["hst"] == 15.28  # 117.50 * 0.13 = 15.275 -> 15.28
        assert r["cc_surcharge"] == 0.0
        assert r["total_buy_cost"] == 132.78  # 117.50 + 15.275 = 132.775 -> 132.78

    def test_credit_card_basic(self):
        """Standard hammer price with credit card — adds 2% surcharge."""
        r = calculate_encore_cost(100.0, "credit_card")
        assert r["cc_surcharge"] > 0
        # Total before CC = 132.775, CC surcharge = 132.775 * 0.02 = 2.6555
        assert r["total_buy_cost"] == pytest.approx(135.43, abs=0.01)

    def test_low_hammer(self):
        """Minimum viable hammer price."""
        r = calculate_encore_cost(0.01, "etransfer")
        assert r["hammer_price"] == 0.01
        assert r["buyers_premium"] == 0.0  # 0.01 * 0.16 = 0.0016 → rounds to 0.0
        assert r["handling_fee"] == 1.50
        assert r["total_buy_cost"] > 0

    def test_high_hammer(self):
        """High value item."""
        r = calculate_encore_cost(5000.0, "etransfer")
        expected_premium = 800.0  # 5000 * 0.16
        expected_subtotal = 5801.50  # 5000 + 800 + 1.50
        assert r["buyers_premium"] == expected_premium
        assert r["subtotal_before_tax"] == expected_subtotal
        assert r["total_buy_cost"] == pytest.approx(6555.70, abs=0.02)

    def test_credit_card_vs_etransfer_difference(self):
        """Credit card should always cost more than e-transfer."""
        et = calculate_encore_cost(200.0, "etransfer")
        cc = calculate_encore_cost(200.0, "credit_card")
        assert cc["total_buy_cost"] > et["total_buy_cost"]
        # Difference should be exactly 2% of the e-transfer total
        assert cc["total_buy_cost"] == pytest.approx(et["total_buy_cost"] * 1.02, abs=0.01)


# ============================================================================
# PART 2 — eBay Fee Tests
# ============================================================================

class TestEbayFees:
    def test_basic_fees(self):
        """Basic fee calculation with default category."""
        r = calculate_ebay_fees(100.0, 0.0)
        # FVF: 100 * 0.136 = 13.6
        assert r["fvf_amount"] == 13.6
        # Processing: 100 * 0.029 + 0.30 = 3.2
        assert r["processing_fee"] == 3.2
        assert r["promoted_fee"] == 0.0
        assert r["insertion_fee"] == 0.0
        assert r["total_ebay_fees"] == 16.8

    def test_with_buyer_shipping(self):
        """FVF and processing apply to sell price + buyer shipping."""
        r = calculate_ebay_fees(100.0, 15.0)
        # FVF: 115 * 0.136 = 15.64
        assert r["fvf_amount"] == 15.64
        # Processing: 115 * 0.029 + 0.30 = 3.635 → rounds to 3.63 or 3.64
        assert r["processing_fee"] == pytest.approx(3.64, abs=0.02)

    def test_with_promoted_listing(self):
        """Promoted listing fee applies to sell price only."""
        r = calculate_ebay_fees(100.0, 0.0, promoted_pct=5.0)
        assert r["promoted_fee"] == 5.0  # 100 * 5%

    def test_with_insertion_fee(self):
        """Insertion fee is $0.35 when toggled on."""
        r = calculate_ebay_fees(100.0, 0.0, insertion_fee=True)
        assert r["insertion_fee"] == 0.35

    def test_top_rated_discount(self):
        """Top Rated Seller gets 10% discount on FVF."""
        rate_normal = get_fvf_rate("Most Categories (Default)", False, False, False)
        rate_top = get_fvf_rate("Most Categories (Default)", False, True, False)
        assert rate_top == pytest.approx(rate_normal * 0.90, abs=0.01)

    def test_below_standard_surcharge(self):
        """Below Standard gets 5% surcharge on FVF."""
        rate_normal = get_fvf_rate("Most Categories (Default)", False, False, False)
        rate_below = get_fvf_rate("Most Categories (Default)", False, False, True)
        assert rate_below == pytest.approx(rate_normal * 1.05, abs=0.01)

    def test_guitars_category(self):
        """Guitars & Basses has lower FVF."""
        rate = get_fvf_rate("Guitars & Basses", False, False, False)
        assert rate == 6.7

    def test_guitars_with_store(self):
        """Guitars & Basses with store has even lower FVF."""
        rate = get_fvf_rate("Guitars & Basses", True, False, False)
        assert rate == 3.5


class TestNetProfit:
    def test_basic_profit(self):
        r = calculate_net_profit(100.0, 50.0, 16.8, 10.0)
        # Net payout = 100 - 16.8 - 10 = 73.2
        assert r["net_payout"] == 73.2
        # Net profit = 73.2 - 50 = 23.2
        assert r["net_profit"] == 23.2
        # ROI = 23.2 / 50 * 100 = 46.4
        assert r["roi_pct"] == 46.4
        # Margin = 23.2 / 100 * 100 = 23.2
        assert r["margin_pct"] == 23.2

    def test_zero_buy_cost(self):
        r = calculate_net_profit(100.0, 0.0, 16.8, 0.0)
        assert r["roi_pct"] == 0.0  # Division by zero handled

    def test_zero_sell_price(self):
        r = calculate_net_profit(0.0, 50.0, 0.0, 0.0)
        assert r["margin_pct"] == 0.0  # Division by zero handled


# ============================================================================
# PART 3 — Pricing Mode Tests
# ============================================================================

class TestMode1Forward:
    def test_target_dollar(self):
        """Forward pricing with target profit in dollars."""
        r = mode1_forward_pricing(100.0, "etransfer", 15.0, 0.0, 0.0,
                                   target_profit_dollar=50.0)
        assert "error" not in r
        assert r["sell_price"] > 0
        # Net profit should be close to target
        assert r["profit"]["net_profit"] == pytest.approx(50.0, abs=1.0)

    def test_target_percent(self):
        """Forward pricing with target profit percentage."""
        r = mode1_forward_pricing(100.0, "etransfer", 15.0, 0.0, 0.0,
                                   target_profit_pct=30.0)
        assert "error" not in r
        assert r["sell_price"] > 0

    def test_breakeven_price(self):
        """Break-even price should yield ~$0 profit."""
        r = mode1_forward_pricing(50.0, "etransfer", 10.0, 0.0, 0.0,
                                   target_profit_dollar=0.0)
        assert r["breakeven_price"] > 0
        assert r["sell_price"] == pytest.approx(r["breakeven_price"], abs=0.01)

    def test_no_target_error(self):
        """Must provide either dollar or percent target."""
        r = mode1_forward_pricing(100.0, "etransfer")
        assert "error" in r

    def test_with_promoted(self):
        """Higher promoted % should require higher sell price."""
        r1 = mode1_forward_pricing(100.0, "etransfer", 15.0, 0.0, 0.0,
                                    target_profit_dollar=50.0)
        r2 = mode1_forward_pricing(100.0, "etransfer", 15.0, 0.0, 5.0,
                                    target_profit_dollar=50.0)
        assert r2["sell_price"] > r1["sell_price"]


class TestMode2Reverse:
    def test_profitable_sale(self):
        """Sold at a profit — verdict should be positive."""
        r = mode2_reverse_lookup(200.0, 50.0, "etransfer", 15.0, 0.0, 0.0)
        assert r["profit"]["net_profit"] > 0
        assert "❌" not in r["verdict"]

    def test_loss_sale(self):
        """Sold at a loss — verdict should be negative."""
        r = mode2_reverse_lookup(30.0, 50.0, "etransfer", 15.0, 0.0, 0.0)
        assert r["profit"]["net_profit"] < 0
        assert "❌" in r["verdict"]


class TestMode3LotSplitter:
    def test_basic_split(self):
        """Split a lot into units and auto-calculate."""
        r = mode3_lot_splitter(100.0, 5, "etransfer", target_profit_dollar=10.0)
        assert r["num_items"] == 5
        assert r["per_unit_hammer"] == 20.0
        assert len(r["items"]) == 5

    def test_zero_items_error(self):
        """Zero items should return error."""
        r = mode3_lot_splitter(100.0, 0, "etransfer")
        assert "error" in r

    def test_with_sell_price(self):
        """Per-item sell price triggers reverse mode."""
        r = mode3_lot_splitter(100.0, 4, "etransfer", per_item_sell_price=50.0)
        assert len(r["items"]) == 4
        assert r["items"][0]["mode"] == "reverse"


class TestMode4MaxAdSpend:
    def test_positive_budget(self):
        """Should return a positive max promoted %."""
        r = mode4_max_ad_spend(200.0, 50.0, "etransfer", 15.0, 0.0,
                                target_profit_dollar=20.0)
        assert r["max_promoted_pct"] > 0

    def test_negative_budget(self):
        """When sell price too low, max promoted should be negative with alert."""
        r = mode4_max_ad_spend(50.0, 100.0, "etransfer", 15.0, 0.0,
                                target_profit_dollar=50.0)
        assert r["max_promoted_pct"] < 0
        assert "alert" in r
        assert "alternative_sell_prices" in r


class TestMode5Sensitivity:
    def test_data_points(self):
        """Should return correct number of data points."""
        r = mode5_price_sensitivity(100.0, "etransfer", num_points=20)
        assert len(r["data_points"]) == 20
        assert r["breakeven_price"] > 0

    def test_profit_increases_with_price(self):
        """Higher sell price should mean higher profit."""
        r = mode5_price_sensitivity(50.0, "etransfer", num_points=10)
        profits = [dp["net_profit"] for dp in r["data_points"]]
        # First point should be near zero (breakeven), last should be positive
        assert profits[-1] > profits[0]


# ============================================================================
# Edge Cases
# ============================================================================

class TestEdgeCases:
    def test_penny_hammer(self):
        """Hammer price of $0.01."""
        r = calculate_encore_cost(0.01, "etransfer")
        assert r["total_buy_cost"] > 0

    def test_sell_below_breakeven(self):
        """Selling below break-even should show negative profit."""
        r = mode2_reverse_lookup(5.0, 100.0, "etransfer", 15.0)
        assert r["profit"]["net_profit"] < 0

    def test_zero_promoted(self):
        """Zero promoted listing fee."""
        r = calculate_ebay_fees(100.0, 0.0, promoted_pct=0.0)
        assert r["promoted_fee"] == 0.0

    def test_negative_max_ad_spend(self):
        """Max ad spend negative when margins are too thin."""
        r = mode4_max_ad_spend(60.0, 50.0, "etransfer", 15.0, 0.0,
                                target_profit_dollar=10.0)
        assert r["max_promoted_pct"] < 0


# ============================================================================
# API Endpoint Tests
# ============================================================================

class TestAPICalculator:
    def test_get_categories(self):
        r = client.get("/api/calculator/categories")
        assert r.status_code == 200
        assert len(r.json()) == len(EBAY_CATEGORIES)

    def test_encore_cost_endpoint(self):
        r = client.post("/api/calculator/encore-cost", json={
            "hammer_price": 100.0, "payment_method": "etransfer"
        })
        assert r.status_code == 200
        assert r.json()["total_buy_cost"] > 0

    def test_mode1_endpoint(self):
        r = client.post("/api/calculator/mode1", json={
            "hammer_price": 100.0,
            "target_profit_dollar": 50.0,
        })
        assert r.status_code == 200
        assert r.json()["sell_price"] > 0

    def test_mode2_endpoint(self):
        r = client.post("/api/calculator/mode2", json={
            "sold_price": 200.0,
            "hammer_price": 100.0,
        })
        assert r.status_code == 200
        assert "profit" in r.json()

    def test_mode3_endpoint(self):
        r = client.post("/api/calculator/mode3", json={
            "total_hammer_price": 100.0,
            "num_items": 5,
            "target_profit_dollar": 10.0,
        })
        assert r.status_code == 200
        assert len(r.json()["items"]) == 5

    def test_mode4_endpoint(self):
        r = client.post("/api/calculator/mode4", json={
            "sell_price": 200.0,
            "hammer_price": 100.0,
            "target_profit_dollar": 20.0,
        })
        assert r.status_code == 200
        assert "max_promoted_pct" in r.json()

    def test_mode5_endpoint(self):
        r = client.post("/api/calculator/mode5", json={
            "hammer_price": 100.0,
            "num_points": 10,
        })
        assert r.status_code == 200
        assert len(r.json()["data_points"]) == 10


class TestAPIAuctions:
    def test_create_auction(self):
        r = client.post("/api/auctions/", json={
            "name": "Test Auction", "date": "2025-01-15",
            "total_hammer": 500.0, "payment_method": "etransfer",
        })
        assert r.status_code == 200
        assert r.json()["name"] == "Test Auction"

    def test_list_auctions(self):
        client.post("/api/auctions/", json={
            "name": "Test", "date": "2025-01-15",
        })
        r = client.get("/api/auctions/")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_get_auction(self):
        cr = client.post("/api/auctions/", json={
            "name": "Detail Test", "date": "2025-02-01",
        })
        aid = cr.json()["id"]
        r = client.get(f"/api/auctions/{aid}")
        assert r.status_code == 200
        assert r.json()["name"] == "Detail Test"

    def test_update_auction(self):
        cr = client.post("/api/auctions/", json={
            "name": "Old Name", "date": "2025-03-01",
        })
        aid = cr.json()["id"]
        r = client.put(f"/api/auctions/{aid}", json={"name": "New Name"})
        assert r.status_code == 200
        assert r.json()["name"] == "New Name"

    def test_delete_auction(self):
        cr = client.post("/api/auctions/", json={
            "name": "Delete Me", "date": "2025-04-01",
        })
        aid = cr.json()["id"]
        r = client.delete(f"/api/auctions/{aid}")
        assert r.status_code == 200
        r2 = client.get(f"/api/auctions/{aid}")
        assert r2.status_code == 404

    def test_create_item(self):
        cr = client.post("/api/auctions/", json={
            "name": "Item Auction", "date": "2025-05-01",
        })
        aid = cr.json()["id"]
        r = client.post(f"/api/auctions/{aid}/items", json={
            "name": "Test Item", "hammer_price": 50.0,
        })
        assert r.status_code == 200
        assert r.json()["buy_cost_total"] > 0

    def test_update_item(self):
        cr = client.post("/api/auctions/", json={
            "name": "Item Update", "date": "2025-06-01",
        })
        aid = cr.json()["id"]
        ir = client.post(f"/api/auctions/{aid}/items", json={
            "name": "Item", "hammer_price": 30.0,
        })
        iid = ir.json()["id"]
        r = client.put(f"/api/auctions/items/{iid}", json={
            "sold_price": 100.0, "status": "sold",
        })
        assert r.status_code == 200
        assert r.json()["net_profit"] is not None

    def test_delete_item(self):
        cr = client.post("/api/auctions/", json={
            "name": "Item Delete", "date": "2025-07-01",
        })
        aid = cr.json()["id"]
        ir = client.post(f"/api/auctions/{aid}/items", json={
            "name": "Del Item", "hammer_price": 20.0,
        })
        iid = ir.json()["id"]
        r = client.delete(f"/api/auctions/items/{iid}")
        assert r.status_code == 200

    def test_item_not_found(self):
        r = client.put("/api/auctions/items/99999", json={"name": "X"})
        assert r.status_code == 404

    def test_auction_not_found(self):
        r = client.get("/api/auctions/99999")
        assert r.status_code == 404


class TestAPISettings:
    def test_get_all_settings(self):
        r = client.get("/api/settings/")
        assert r.status_code == 200
        # Should have default settings
        assert len(r.json()) > 0

    def test_update_setting(self):
        r = client.put("/api/settings/", json={
            "key": "default_target_profit_pct", "value": "25",
        })
        assert r.status_code == 200
        assert r.json()["value"] == "25"

    def test_get_single_setting(self):
        client.put("/api/settings/", json={
            "key": "currency", "value": "CAD",
        })
        r = client.get("/api/settings/currency")
        assert r.status_code == 200
        assert r.json()["value"] == "CAD"

    def test_bulk_update(self):
        r = client.put("/api/settings/bulk", json=[
            {"key": "store_tier", "value": "premium"},
            {"key": "top_rated_seller", "value": "true"},
        ])
        assert r.status_code == 200
        assert len(r.json()) == 2


class TestAPIDashboard:
    def test_kpis_empty(self):
        r = client.get("/api/dashboard/kpis")
        assert r.status_code == 200
        assert r.json()["total_invested"] == 0

    def test_kpis_with_data(self):
        # Create auction + sold item
        cr = client.post("/api/auctions/", json={
            "name": "KPI Test", "date": "2025-01-01",
        })
        aid = cr.json()["id"]
        client.post(f"/api/auctions/{aid}/items", json={
            "name": "Sold Item", "hammer_price": 50.0,
        })
        # Get the item and mark as sold
        items = client.get(f"/api/auctions/{aid}/items").json()
        iid = items[0]["id"]
        client.put(f"/api/auctions/items/{iid}", json={
            "status": "sold", "sold_price": 100.0,
        })
        r = client.get("/api/dashboard/kpis")
        assert r.status_code == 200
        assert r.json()["total_invested"] > 0
        assert r.json()["total_revenue"] > 0

    def test_chart_endpoints(self):
        """All chart endpoints should return 200."""
        for endpoint in [
            "/api/dashboard/charts/monthly",
            "/api/dashboard/charts/roi-by-category",
            "/api/dashboard/charts/best-worst",
            "/api/dashboard/charts/fee-breakdown",
            "/api/dashboard/charts/profit-per-auction",
            "/api/dashboard/charts/cumulative-profit",
        ]:
            r = client.get(endpoint)
            assert r.status_code == 200, f"Failed: {endpoint}"
