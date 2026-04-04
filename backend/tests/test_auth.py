"""Authentication tests for FlipIQ."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.auth.jwt import get_password_hash
from app.models import User
from app.main import app

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_auth.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
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
    """Create fresh tables before each test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_register_user():
    """Test user registration."""
    response = client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123",
        "name": "Test User"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert "id" in data


def test_register_duplicate_email():
    """Test registration with duplicate email."""
    # First registration
    client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123",
        "name": "Test User"
    })
    # Duplicate registration
    response = client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "anotherpassword",
        "name": "Another User"
    })
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


def test_login_success():
    """Test successful login."""
    # Register user
    client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123",
        "name": "Test User"
    })
    # Login
    response = client.post("/auth/login", data={
        "username": "test@example.com",
        "password": "securepassword123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials():
    """Test login with invalid credentials."""
    # Register user
    client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123",
        "name": "Test User"
    })
    # Login with wrong password
    response = client.post("/auth/login", data={
        "username": "test@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


def test_login_nonexistent_user():
    """Test login with non-existent user."""
    response = client.post("/auth/login", data={
        "username": "nonexistent@example.com",
        "password": "somepassword"
    })
    assert response.status_code == 401


def test_protected_route_without_auth():
    """Test accessing protected route without authentication."""
    response = client.get("/api/settings/")
    assert response.status_code == 401


def test_protected_route_with_auth():
    """Test accessing protected route with authentication."""
    # Register and login
    client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123",
        "name": "Test User"
    })
    login_response = client.post("/auth/login", data={
        "username": "test@example.com",
        "password": "securepassword123"
    })
    token = login_response.json()["access_token"]
    # Access protected route
    response = client.get("/api/settings/", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200


def test_protected_route_with_invalid_token():
    """Test accessing protected route with invalid token."""
    response = client.get("/api/settings/", headers={
        "Authorization": "Bearer invalidtoken"
    })
    assert response.status_code == 401


def test_refresh_token():
    """Test token refresh."""
    # Register and login
    client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123",
        "name": "Test User"
    })
    login_response = client.post("/auth/login", data={
        "username": "test@example.com",
        "password": "securepassword123"
    })
    refresh_token = login_response.json()["refresh_token"]
    # Refresh token
    response = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


def test_logout():
    """Test logout revokes token."""
    # Register and login
    client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123",
        "name": "Test User"
    })
    login_response = client.post("/auth/login", data={
        "username": "test@example.com",
        "password": "securepassword123"
    })
    token = login_response.json()["access_token"]
    # Logout
    response = client.post("/auth/logout", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    # Try to use revoked token
    response = client.get("/api/settings/", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 401
    assert "revoked" in response.json()["detail"].lower()


def test_get_current_user():
    """Test getting current user info."""
    # Register and login
    client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123",
        "name": "Test User"
    })
    login_response = client.post("/auth/login", data={
        "username": "test@example.com",
        "password": "securepassword123"
    })
    token = login_response.json()["access_token"]
    # Get current user
    response = client.get("/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"


def test_shipping_presets_user_scoped():
    """Test shipping presets are user-scoped."""
    # Register and login user1
    client.post("/auth/register", json={
        "email": "user1@example.com",
        "password": "password123",
        "name": "User One"
    })
    login1 = client.post("/auth/login", data={
        "username": "user1@example.com",
        "password": "password123"
    })
    token1 = login1.json()["access_token"]

    # Register and login user2
    client.post("/auth/register", json={
        "email": "user2@example.com",
        "password": "password123",
        "name": "User Two"
    })
    login2 = client.post("/auth/login", data={
        "username": "user2@example.com",
        "password": "password123"
    })
    token2 = login2.json()["access_token"]

    # User1 creates a preset
    response = client.post("/api/shipping-presets/", headers={
        "Authorization": f"Bearer {token1}"
    }, json={
        "name": "User1 Preset",
        "carrier": "Canada Post",
        "cost_cad": 15.0
    })
    assert response.status_code == 201
    preset_id = response.json()["id"]

    # User1 can see the preset
    response = client.get("/api/shipping-presets/", headers={
        "Authorization": f"Bearer {token1}"
    })
    assert response.status_code == 200
    presets = response.json()
    assert any(p["id"] == preset_id for p in presets)

    # User2 cannot modify User1's preset
    response = client.put(f"/api/shipping-presets/{preset_id}", headers={
        "Authorization": f"Bearer {token2}"
    }, json={
        "name": "Modified by User2"
    })
    assert response.status_code == 404

    # User2 cannot delete User1's preset
    response = client.delete(f"/api/shipping-presets/{preset_id}", headers={
        "Authorization": f"Bearer {token2}"
    })
    assert response.status_code == 404
