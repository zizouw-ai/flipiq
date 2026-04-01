"""Authentication router for FlipIQ."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.auth.jwt import (
    create_access_token,
    create_refresh_token,
    verify_token,
    get_password_hash,
    verify_password,
    get_current_user,
    blacklist_token,
)
from app.auth.schemas import (
    UserRegister,
    UserLogin,
    Token,
    UserResponse,
    RefreshTokenRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    EmailVerifyRequest,
    MessageResponse,
    UserUpdate,
    PasswordUpdate,
    PlanResponse,
)
from app.plan_config import PlanType, get_plan_limits


class TokenWithUser(Token):
    """Token response with user data."""
    user: UserResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user account.

    Creates a new user with the provided email, password, and optional name.
    Returns access and refresh tokens upon successful registration.
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        name=user_data.name,
        plan="free",
        is_verified=0,
        is_active=1,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create tokens
    token_data = {"sub": new_user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.post("/login", response_model=TokenWithUser)
def login(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login with email and password.

    Authenticates a user and returns access and refresh tokens.
    Use JSON with email and password fields.
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()

    # Verify credentials
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if user.is_active != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    # Create tokens
    token_data = {"sub": user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenWithUser(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            plan=user.plan,
            is_verified=bool(user.is_verified),
            created_at=user.created_at
        )
    )


@router.post("/refresh", response_model=Token)
def refresh_token(refresh_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Refresh access token using a refresh token.

    Returns a new access token. The refresh token remains valid.
    """
    # Verify refresh token
    payload = verify_token(refresh_data.refresh_token, token_type="refresh")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user exists and is active
    user = db.query(User).filter(User.email == email).first()
    if not user or user.is_active != 1:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create new access token
    token_data = {"sub": user.email}
    access_token = create_access_token(token_data)

    return Token(
        access_token=access_token,
        refresh_token=refresh_data.refresh_token,  # Return same refresh token
        token_type="bearer"
    )


@router.post("/logout", response_model=MessageResponse)
def logout(refresh_data: RefreshTokenRequest):
    """
    Logout and invalidate the refresh token.

    Adds the refresh token to a blacklist (in-memory for now).
    """
    # Verify the token first
    payload = verify_token(refresh_data.refresh_token)
    if payload:
        # Add to blacklist
        blacklist_token(refresh_data.refresh_token)

    return MessageResponse(message="Successfully logged out")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: Optional[User] = Depends(get_current_user)):
    """
    Get current user information.

    Returns the profile of the currently authenticated user.
    """
    if current_user is None:
        # Return a mock user for development/testing
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        plan=current_user.plan,
        is_verified=bool(current_user.is_verified),
        created_at=current_user.created_at
    )


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(request: PasswordResetRequest):
    """
    Request a password reset email.

    Mock implementation - returns success message.
    In production, this would send an email with a reset link.
    """
    # TODO: Implement actual password reset email
    # For now, just return success (don't reveal if email exists)
    return MessageResponse(
        message="If an account exists with this email, a password reset link has been sent"
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(request: PasswordResetConfirm):
    """
    Reset password using a reset token.

    Mock implementation - returns success message.
    In production, this would validate the token and update the password.
    """
    # TODO: Implement actual password reset
    return MessageResponse(
        message="Password reset functionality coming soon"
    )


@router.get("/verify-email", response_model=MessageResponse)
def verify_email(token: str):
    """
    Verify email address using a verification token.

    Mock implementation - returns success message.
    In production, this would validate the token and mark email as verified.
    """
    # TODO: Implement actual email verification
    return MessageResponse(
        message="Email verification functionality coming soon"
    )


@router.put("/me", response_model=UserResponse)
def update_profile(
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update current user profile (name and/or email).
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Update email if provided and different
    if update_data.email and update_data.email != current_user.email:
        # Check if email is already taken
        existing = db.query(User).filter(User.email == update_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        current_user.email = update_data.email
    
    # Update name if provided
    if update_data.name is not None:
        current_user.name = update_data.name
    
    db.commit()
    db.refresh(current_user)
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        plan=current_user.plan,
        is_verified=bool(current_user.is_verified),
        created_at=current_user.created_at
    )


@router.put("/password", response_model=MessageResponse)
def change_password(
    password_data: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Change current user's password.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update to new password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    
    return MessageResponse(message="Password updated successfully")


@router.get("/plan", response_model=PlanResponse)
def get_plan(current_user: User = Depends(get_current_user)):
    """
    Get current user's plan and limits.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    plan = PlanType(current_user.plan) if current_user.plan in [p.value for p in PlanType] else PlanType.FREE
    limits = get_plan_limits(plan)
    
    plan_names = {
        PlanType.FREE: "Free",
        PlanType.STARTER: "Starter",
        PlanType.PRO: "Pro",
        PlanType.TEAM: "Team"
    }
    
    return PlanResponse(
        plan=current_user.plan,
        plan_name=plan_names.get(plan, "Free"),
        limits=limits
    )
