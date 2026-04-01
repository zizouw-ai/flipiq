"""Tests for plan limits and usage tracking."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database import init_db, get_db
from app.models import Item, Auction, AuctionHouseConfig, ItemTemplate
from app.routers.limits import get_current_user


class MockFreeUser:
    """Mock authenticated user with Free plan for testing."""
    def __init__(self):
        self.plan = "free"
        self.user_id = 1


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
    original_override = app.dependency_overrides.get(get_current_user)
    
    def override_get_free_user():
        return MockFreeUser()
    
    app.dependency_overrides[get_current_user] = override_get_free_user
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Restore original override
    if original_override:
        app.dependency_overrides[get_current_user] = original_override
    else:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def client():
    """Provide a test client with Pro tier access (default)."""
    with TestClient(app) as test_client:
        yield test_client


"""Tests for plan limits and usage tracking."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database import init_db, get_db
from app.models import Item, Auction, AuctionHouseConfig, ItemTemplate
from app.routers.limits import get_current_user


class MockFreeUser:
    """Mock authenticated user with Free plan for testing."""
    def __init__(self):
        self.plan = "free"
        self.user_id = 1


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
    original_override = app.dependency_overrides.get(get_current_user)
    
    def override_get_free_user():
        return MockFreeUser()
    
    app.dependency_overrides[get_current_user] = override_get_free_user
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Restore original override
    if original_override:
        app.dependency_overrides[get_current_user] = original_override
    else:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def client():
    """Provide a test client with Pro tier access (default)."""
    with TestClient(app) as test_client:
        yield test_client
