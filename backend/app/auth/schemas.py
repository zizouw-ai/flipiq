"""Pydantic schemas for FlipIQ authentication."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    """Schema for user registration."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (min 8 characters)")
    name: Optional[str] = Field(None, description="User's full name")

    model_config = {"json_schema_extra": {
        "example": {
            "email": "user@example.com",
            "password": "securepassword123",
            "name": "John Doe"
        }
    }}


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")

    model_config = {"json_schema_extra": {
        "example": {
            "email": "user@example.com",
            "password": "securepassword123"
        }
    }}


class Token(BaseModel):
    """Schema for token response."""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")

    model_config = {"json_schema_extra": {
        "example": {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "bearer"
        }
    }}


class TokenData(BaseModel):
    """Schema for token payload data."""
    email: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request."""
    refresh_token: str = Field(..., description="JWT refresh token")


class UserResponse(BaseModel):
    """Schema for user response (public profile)."""
    id: int
    email: EmailStr
    name: Optional[str]
    plan: str
    is_verified: bool
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 1,
                "email": "user@example.com",
                "name": "John Doe",
                "plan": "free",
                "is_verified": False,
                "created_at": "2024-01-01T00:00:00Z"
            }
        }
    }


class PasswordResetRequest(BaseModel):
    """Schema for password reset request."""
    email: EmailStr = Field(..., description="User email address")


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation."""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password")


class EmailVerifyRequest(BaseModel):
    """Schema for email verification request."""
    token: str = Field(..., description="Email verification token")


class MessageResponse(BaseModel):
    """Generic message response schema."""
    message: str

    model_config = {"json_schema_extra": {
        "example": {"message": "Operation completed successfully"}
    }}
