"""Tests for plan limits and usage tracking."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database import init_db, get_db
from app.models import Item, Auction, AuctionHouseConfig, ItemTemplate
from app.auth.jwt import require_auth


class MockFreeUser:
    """Mock authenticated user with Free plan for testing."""
    def __init__(self):
        self.plan = "free"
        self.id = 1
        self.email = "free@example.com"
        self.name = "Free User"
        self.is_active = 1
        self.is_verified = 1


@pytest.fixture(autouse=True)
def setup_database():
    """Setup fresh database for each test."""
    init_db()
    # Clear existing data
    db = next(get_db())
    db.query(Item).delete()
    db.query(Auction).delete()
    db.query(AuctionHouseConfig).delete()
    db.query(ItemTemplate).delete()
    db.commit()


@pytest.fixture
def free_client():
    """Provide a test client with Free tier access."""
    # Override to use free plan
    original_override = app.dependency_overrides.get(require_auth)

    def override_get_free_user():
        return MockFreeUser()

    app.dependency_overrides[require_auth] = override_get_free_user

    with TestClient(app) as test_client:
        yield test_client

    # Restore original override
    if original_override:
        app.dependency_overrides[require_auth] = original_override
    else:
        app.dependency_overrides.pop(require_auth, None)


@pytest.fixture
def client():
    """Provide a test client with Pro tier access (default)."""
    with TestClient(app) as test_client:
        yield test_client


def test_get_usage_free_plan(free_client):
    """Test usage endpoint returns correct counts for free plan."""
    response = free_client.get("/api/auth/usage")
    assert response.status_code == 200
    data = response.json()
    assert "usage" in data
    assert "limits" in data
    assert "plan" in data
    assert data["plan"]["type"] == "free"


def test_get_plan_free_plan(free_client):
    """Test plan endpoint returns correct plan details for free plan."""
    response = free_client.get("/api/auth/plan")
    assert response.status_code == 200
    data = response.json()
    assert data["plan"]["type"] == "free"
    assert "features" in data
