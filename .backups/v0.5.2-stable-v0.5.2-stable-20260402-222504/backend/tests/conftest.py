"""Shared test database setup — all test files use the same override."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, get_db
from app.routers.limits import get_current_user

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


class MockProUser:
    """Mock authenticated user with Pro plan for testing."""
    def __init__(self):
        self.plan = "pro"
        self.user_id = 1


def override_get_current_user():
    """Override to provide mock Pro user during tests."""
    return MockProUser()


app.dependency_overrides[get_current_user] = override_get_current_user


@pytest.fixture(autouse=True)
def setup_db():
    """Setup database with seeded data for each test."""
    Base.metadata.create_all(bind=engine)
    # Seed new tables
    from app.database import seed_auction_houses, seed_shipping_presets
    db = TestingSessionLocal()
    try:
        seed_auction_houses(db)
        seed_shipping_presets(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    """Provide a test client with Pro tier access."""
    return TestClient(app)


@pytest.fixture
def pro_user():
    """Provide a mock Pro user fixture."""
    return MockProUser()
