"""Plan tier configuration for FlipIQ SaaS plans."""
from enum import Enum
from typing import Dict, Any


class PlanType(str, Enum):
    """Plan tier enumeration."""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    TEAM = "team"


PLAN_LIMITS: Dict[PlanType, Dict[str, Any]] = {
    PlanType.FREE: {
        "max_items": 50,
        "max_auction_houses": 3,
        "can_export": False,
        "can_use_templates": False,
        "max_team_members": 1,
        "price_cad": 0,
        "name": "Free"
    },
    PlanType.STARTER: {
        "max_items": 500,
        "max_auction_houses": 100,  # Essentially unlimited for practical purposes
        "can_export": True,
        "can_use_templates": True,
        "max_team_members": 1,
        "price_cad": 9,
        "name": "Starter"
    },
    PlanType.PRO: {
        "max_items": None,  # Unlimited
        "max_auction_houses": None,  # Unlimited
        "can_export": True,
        "can_use_templates": True,
        "max_team_members": 1,
        "price_cad": 19,
        "name": "Pro"
    },
    PlanType.TEAM: {
        "max_items": None,  # Unlimited
        "max_auction_houses": None,  # Unlimited
        "can_export": True,
        "can_use_templates": True,
        "max_team_members": 5,
        "price_cad": 49,
        "name": "Team"
    }
}


def get_plan_limits(plan: PlanType) -> Dict[str, Any]:
    """Get limits configuration for a specific plan."""
    return PLAN_LIMITS.get(plan, PLAN_LIMITS[PlanType.FREE])


def can_add_item(current_count: int, plan: PlanType) -> bool:
    """Check if user can add another item based on plan limits."""
    limits = get_plan_limits(plan)
    max_items = limits["max_items"]
    return max_items is None or current_count < max_items


def can_add_auction_house(current_count: int, plan: PlanType) -> bool:
    """Check if user can add another auction house based on plan limits."""
    limits = get_plan_limits(plan)
    max_houses = limits["max_auction_houses"]
    return max_houses is None or current_count < max_houses
