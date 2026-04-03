
"""
Stripe Billing Service for FlipIQ Subscription Management

This service handles all Stripe-related operations including:
- Customer creation and management
- Checkout session creation
- Subscription management
- Webhook processing
- Customer portal sessions
"""

import os
import stripe
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import User
from app.plan_config import PlanType


# Initialize Stripe with API key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Stripe Price IDs from environment
STRIPE_PRICES = {
    "starter": os.getenv("STRIPE_PRICE_STARTER"),
    "pro": os.getenv("STRIPE_PRICE_PRO"),
    "team": os.getenv("STRIPE_PRICE_TEAM"),
}

# Webhook secret for signature verification
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")


def initialize_stripe():
    """Ensure Stripe is properly initialized."""
    if not stripe.api_key:
        raise ValueError("STRIPE_SECRET_KEY environment variable is not set")
    if not WEBHOOK_SECRET:
        raise ValueError("STRIPE_WEBHOOK_SECRET environment variable is not set")
    
    # Validate price IDs
    for plan, price_id in STRIPE_PRICES.items():
        if not price_id:
            raise ValueError(f"STRIPE_PRICE_{plan.upper()} environment variable is not set")


def create_customer(user_email: str, user_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new Stripe Customer for a user.
    
    Args:
        user_email: User's email address
        user_name: Optional user name
    
    Returns:
        Stripe Customer object
    """
    customer_data = {
        "email": user_email,
    }
    
    if user_name:
        customer_data["name"] = user_name
    
    customer = stripe.Customer.create(**customer_data)
    return customer


def create_checkout_session(customer_id: str, plan: str, success_url: str, cancel_url: str) -> Dict[str, Any]:
    """
    Create a Stripe Checkout Session for subscription.
    
    Args:
        customer_id: Stripe Customer ID
        plan: Plan type (starter, pro, team)
        success_url: URL to redirect on successful payment
        cancel_url: URL to redirect on cancellation
    
    Returns:
        Stripe Checkout Session object
    """
    if plan not in STRIPE_PRICES:
        raise ValueError(f"Invalid plan: {plan}")
    
    price_id = STRIPE_PRICES[plan]
    
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{
            "price": price_id,
            "quantity": 1,
        }],
        mode="subscription",
        success_url=f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=cancel_url,
        subscription_data={
            "metadata": {
                "plan": plan,
            }
        }
    )
    
    return session


def create_portal_session(customer_id: str, return_url: str) -> Dict[str, Any]:
    """
    Create a Stripe Customer Portal Session.
    
    Args:
        customer_id: Stripe Customer ID
        return_url: URL to return to after portal actions
    
    Returns:
        Stripe Portal Session object
    """
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    
    return session


def handle_webhook(payload: bytes, sig_header: str, endpoint_secret: str) -> Optional[Dict[str, Any]]:
    """
    Handle Stripe webhook events with signature verification.
    
    Args:
        payload: Raw request body
        sig_header: Stripe signature header
        endpoint_secret: Webhook endpoint secret
    
    Returns:
        Event object if valid, None if no action needed
    
    Raises:
        stripe.error.SignatureVerificationError: If signature is invalid
    """
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except stripe.error.SignatureVerificationError:
        raise
    except Exception as e:
        # Handle other webhook errors
        raise ValueError(f"Webhook error: {str(e)}")
    
    return event


def get_subscription(subscription_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve a subscription from Stripe.
    
    Args:
        subscription_id: Stripe Subscription ID
    
    Returns:
        Subscription object or None if not found
    """
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        return subscription
    except stripe.error.StripeError:
        return None


def cancel_subscription(subscription_id: str) -> bool:
    """
    Cancel a subscription at period end.
    
    Args:
        subscription_id: Stripe Subscription ID
    
    Returns:
        True if successful
    """
    try:
        stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )
        return True
    except stripe.error.StripeError:
        return False


def update_user_plan(db: Session, user_id: int, plan: str, subscription_id: Optional[str] = None) -> bool:
    """
    Update user's plan and subscription in database.
    
    Args:
        db: Database session
        user_id: User ID
        plan: New plan type
        subscription_id: Optional subscription ID
    
    Returns:
        True if update successful
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False
    
    user.plan = plan
    if subscription_id:
        user.stripe_subscription_id = subscription_id
    
    db.commit()
    return True


def get_customer_subscription(customer_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the active subscription for a customer.
    
    Args:
        customer_id: Stripe Customer ID
    
    Returns:
        Active subscription object or None
    """
    try:
        subscriptions = stripe.Subscription.list(
            customer=customer_id,
            status="active",
            limit=1
        )
        
        if subscriptions.data:
            return subscriptions.data[0]
        return None
    except stripe.error.StripeError:
        return None


def get_plan_from_price(price_id: str) -> Optional[str]:
    """
    Determine plan type from Stripe Price ID.
    
    Args:
        price_id: Stripe Price ID
    
    Returns:
        Plan type string or None
    """
    for plan, pid in STRIPE_PRICES.items():
        if pid == price_id:
            return plan
    return None
