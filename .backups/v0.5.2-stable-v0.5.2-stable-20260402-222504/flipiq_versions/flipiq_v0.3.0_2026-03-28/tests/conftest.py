"""Shared test database setup — all test files use the same override."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

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


@pytest.fixture(autouse=True)
def setup_db():
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
