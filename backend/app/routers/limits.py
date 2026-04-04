"""API endpoints for plan limits and usage tracking."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Item, AuctionHouseConfig, ItemTemplate, User
from app.plan_config import PlanType, get_plan_limits
from app.middleware.limits import (
    get_item_count, get_auction_house_count, LimitError,
    check_item_limit, check_auction_house_limit, check_export_permission, check_template_permission
)
from app.auth.jwt import require_auth

router = APIRouter(prefix="/api", tags=["limits"])


@router.get("/auth/usage", response_model=dict)
def get_usage(db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Get current usage counts and plan limits for the authenticated user."""

    user_id = int(current_user.id)  # type: ignore
    # Get current counts
    item_count = get_item_count(db, user_id=user_id)
    auction_house_count = get_auction_house_count(user_id, db)
    template_count = db.query(ItemTemplate).filter(
        ItemTemplate.user_id == user_id
    ).count()

    # Get plan limits
    try:
        plan = PlanType(current_user.plan)
    except ValueError:
        plan = PlanType.FREE
    
    limits = get_plan_limits(plan)
    
    return {
        "usage": {
            "items": item_count,
            "auction_houses": auction_house_count,
            "templates": template_count
        },
        "limits": {
            "max_items": limits["max_items"],
            "max_auction_houses": limits["max_auction_houses"],
            "can_export": limits["can_export"],
            "can_use_templates": limits["can_use_templates"],
            "max_team_members": limits["max_team_members"]
        },
        "plan": {
            "type": plan.value,
            "name": limits["name"],
            "price_cad": limits["price_cad"]
        }
    }


@router.get("/auth/plan", response_model=dict)
def get_plan_details(current_user: User = Depends(require_auth)):
    """Get current plan details for the authenticated user."""

    try:
        plan = PlanType(current_user.plan)
    except ValueError:
        plan = PlanType.FREE
    
    limits = get_plan_limits(plan)
    
    return {
        "plan": {
            "type": plan.value,
            "name": limits["name"],
            "price_cad": limits["price_cad"]
        },
        "features": {
            "max_items": limits["max_items"],
            "max_auction_houses": limits["max_auction_houses"],
            "can_export": limits["can_export"],
            "can_use_templates": limits["can_use_templates"],
            "max_team_members": limits["max_team_members"]
        }
    }


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