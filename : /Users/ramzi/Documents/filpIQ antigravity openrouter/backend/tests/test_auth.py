: import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, Base, engine
from sqlalchemy.orm import Session
import os

# Set test JWT secret
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only"

client = TestClient(app)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db = Session(bind=engine)
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


def test_register(db):
    response = client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "testpassword123",
        "name": "Test User"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["name"] == "Test User"


def test_register_duplicate_email(db):
    # First registration
    client.post("/auth/register", json={
        "email": "duplicate@example.com",
        "password": "testpassword123",
        "name": "Test User"
    })
    
    # Second registration with same email
    response = client.post("/auth/register", json={
        "email": "duplicate@example.com",
        "password": "testpassword123",
        "name": "Another User"
    })
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_login_success(db):
    # Register first
    client.post("/auth/register", json={
        "email": "login@example.com",
        "password": "testpassword123",
        "name": "Login User"
    })
    
    # Then login
    response = client.post("/auth/login", json={
        "email": "login@example.com",
        "password": "testpassword123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_login_wrong_password(db):
    # Register first
    client.post("/auth/register", json={
        "email": "wrongpass@example.com",
        "password": "testpassword123",
        "name": "Wrong Password User"
    })
    
    # Login with wrong password
    response = client.post("/auth/login", json={
        "email": "wrongpass@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_protected_route_without_token():
    # Try to access a protected endpoint without token
    response = client.get("/auth/me")
    assert response.status_code == 403


def test_protected_route_with_valid_token(db):
    # Register and get token
    register_response = client.post("/auth/register", json={
        "email": "protected@example.com",
        "password": "testpassword123",
        "name": "Protected Route User"
    })
    token = register_response.json()["access_token"]
    
    # Use token to access protected endpoint
    response = client.get("/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "protected@example.com"


def test_refresh_token(db):
    # Register and get refresh token
    register_response = client.post("/auth/register", json={
        "email": "refresh@example.com",
        "password": "testpassword123",
        "name": "Refresh Token User"
    })
    refresh_token = register_response.json()["refresh_token"]
    
    # Use refresh token to get new access token
    response = client.post("/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_logout(db):
    # Register and get token
    register_response = client.post("/auth/register", json={
        "email": "logout@example.com",
        "password": "testpassword123",
        "name": "Logout User"
    })
    token = register_response.json()["access_token"]
    
    # Logout
    response = client.post("/auth/logout", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    assert "Successfully logged out" in response.json()["message"]


def test_forgot_password(db):
    response = client.post("/auth/forgot-password", json={
        "email": "forgot@example.com"
    })
    assert response.status_code == 200
    assert "mock" in response.json()["message"]


def test_reset_password(db):
    response = client.post("/auth/reset-password", json={
        "token": "dummy-reset-token",
        "new_password": "newpassword123"
    })
    assert response.status_code == 200
    assert "mock" in response.json()["message"]


def test_verify_email(db):
    response = client.get("/auth/verify-email?token=dummy-verify-token")
    assert response.status_code == 200
    assert "mock" in response.json()["message"]