"""API endpoints for plan limits and usage tracking."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Item, AuctionHouseConfig, ItemTemplate
from app.plan_config import PlanType, get_plan_limits
from app.middleware.limits import (
    get_item_count, get_auction_house_count, LimitError,
    check_item_limit, check_auction_house_limit, check_export_permission, check_template_permission
)

router = APIRouter(prefix="/api", tags=["limits"])


class CurrentUser:
    """Mock user class for development - replace with actual auth later."""
    def __init__(self, plan: str = "free", user_id: int = 1):
        self.plan = plan
        self.user_id = user_id


def get_current_user():
    """Get current authenticated user - placeholder for JWT auth."""
    # TODO: Replace with actual JWT auth implementation
    return CurrentUser(plan="free", user_id=1)


@router.get("/auth/usage", response_model=dict)
def get_usage(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    """Get current usage counts and plan limits for the authenticated user."""
    
    # Get current counts
    item_count = get_item_count(db)
    auction_house_count = get_auction_house_count(current_user.user_id, db)
    template_count = db.query(ItemTemplate).filter(
        ItemTemplate.user_id == current_user.user_id
    ).count() if current_user.user_id else 0
    
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
def get_plan_details(current_user: CurrentUser = Depends(get_current_user)):
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