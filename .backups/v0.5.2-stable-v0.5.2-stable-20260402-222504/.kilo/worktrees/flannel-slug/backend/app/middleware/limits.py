"""Middleware for enforcing plan limits and permissions."""
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Item, Auction, AuctionHouseConfig, ItemTemplate
from app.plan_config import PlanType, get_plan_limits, can_add_item, can_add_auction_house
from typing import Optional


class LimitError(Exception):
    """Custom exception for plan limit violations."""
    def __init__(self, error_code: str, message: str, upgrade_url: str = "/pricing"):
        self.error_code = error_code
        self.message = message
        self.upgrade_url = upgrade_url
        super().__init__(message)


def get_current_usage(user_id: int, db: Session) -> dict:
    """Get current usage counts for a user."""
    item_count = db.query(Item).count()
    auction_house_count = db.query(AuctionHouseConfig).filter(
        AuctionHouseConfig.user_id == user_id
    ).count() if user_id else 0
    
    return {
        "items": item_count,
        "auction_houses": auction_house_count
    }


def check_item_limit(user_plan: str, current_item_count: int) -> None:
    """Check if user can add another item based on plan limits.
    
    Args:
        user_plan: The user's current plan (free, starter, pro, team)
        current_item_count: Current number of items the user has
        
    Raises:
        HTTPException: With 402 status if limit exceeded
    """
    try:
        plan = PlanType(user_plan)
    except ValueError:
        plan = PlanType.FREE
    
    if not can_add_item(current_item_count, plan):
        limits = get_plan_limits(plan)
        max_items = limits["max_items"]
        raise LimitError(
            error_code="plan_limit",
            message=f"Item limit reached. Your {plan.value} plan allows maximum {max_items} items.",
            upgrade_url="/pricing"
        )


def check_auction_house_limit(user_plan: str, current_house_count: int) -> None:
    """Check if user can add another auction house based on plan limits.
    
    Args:
        user_plan: The user's current plan (free, starter, pro, team)
        current_house_count: Current number of auction houses the user has
        
    Raises:
        HTTPException: With 402 status if limit exceeded
    """
    try:
        plan = PlanType(user_plan)
    except ValueError:
        plan = PlanType.FREE
    
    if not can_add_auction_house(current_house_count, plan):
        limits = get_plan_limits(plan)
        max_houses = limits["max_auction_houses"]
        raise LimitError(
            error_code="plan_limit",
            message=f"Auction house limit reached. Your {plan.value} plan allows maximum {max_houses} auction houses.",
            upgrade_url="/pricing"
        )


def check_export_permission(user_plan: str) -> None:
    """Check if user can export data based on plan.
    
    Args:
        user_plan: The user's current plan (free, starter, pro, team)
        
    Raises:
        HTTPException: With 402 status if not allowed
    """
    try:
        plan = PlanType(user_plan)
    except ValueError:
        plan = PlanType.FREE
    
    limits = get_plan_limits(plan)
    if not limits["can_export"]:
        raise LimitError(
            error_code="feature_blocked",
            message=f"Export feature is not available on your {plan.value} plan. Upgrade to access exports.",
            upgrade_url="/pricing"
        )


def check_template_permission(user_plan: str) -> None:
    """Check if user can use templates based on plan.
    
    Args:
        user_plan: The user's current plan (free, starter, pro, team)
        
    Raises:
        HTTPException: With 402 status if not allowed
    """
    try:
        plan = PlanType(user_plan)
    except ValueError:
        plan = PlanType.FREE
    
    limits = get_plan_limits(plan)
    if not limits["can_use_templates"]:
        raise LimitError(
            error_code="feature_blocked",
            message=f"Templates feature is not available on your {plan.value} plan. Upgrade to access templates.",
            upgrade_url="/pricing"
        )


def get_item_count(db: Session) -> int:
    """Get the total count of items."""
    return db.query(Item).count()


def get_auction_house_count(user_id: Optional[int], db: Session) -> int:
    """Get the count of auction houses for a user."""
    if user_id is None:
        return 0
    return db.query(AuctionHouseConfig).filter(
        AuctionHouseConfig.user_id == user_id
    ).count()

# Helper function to convert LimitError to HTTPException
def raise_http_error_from_limit_error(limit_error: LimitError):
    raise HTTPException(
        status_code=402,
        detail={
            "error": limit_error.error_code,
            "message": limit_error.message,
            "upgrade_url": limit_error.upgrade_url
        }
    )
