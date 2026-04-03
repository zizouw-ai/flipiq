: """Billing API endpoints for Stripe subscription management."""

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import Dict, Optional, Any
import json
from app.database import get_db
from app.models import User
from app.plan_config import PlanType
from app.billing.stripe_service import (
    initialize_stripe, create_customer, create_checkout_session, 
    create_portal_session, handle_webhook, update_user_plan, 
    get_subscription, get_customer_subscription, get_plan_from_price
)
from app.middleware.limits import CurrentUser, get_current_user

router = APIRouter(prefix="/api", tags=["billing"])

# Initialize Stripe
try:
    initialize_stripe()
except ValueError as e:
    print(f"Warning: Stripe not initialized: {e}")

# Request schemas
class CreateCheckoutRequest(BaseModel):
    plan: str

class CheckoutResponse(BaseModel):
    session_id: str
    url: str

class PortalResponse(BaseModel):
    url: str

class BillingStatusResponse(BaseModel):
    plan: str
    status: str
    current_period_end: Optional[int]
    subscription_id: Optional[str]

@router.post("/billing/create-checkout", response_model=CheckoutResponse)
async def create_checkout(
    request: CreateCheckoutRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a Stripe Checkout session for subscription."""
    if request.plan not in ["starter", "pro", "team"]:
        raise HTTPException(status_code=400, detail="Invalid plan selected")
    
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.stripe_customer_id:
        customer = create_customer(user_email=user.email, user_name=user.email.split("@")[0])
        user.stripe_customer_id = customer.id
        db.commit()
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    success_url = f"{frontend_url}/billing/success"
    cancel_url = f"{frontend_url}/billing/cancel"
    
    try:
        checkout_session = create_checkout_session(
            customer_id=user.stripe_customer_id,
            plan=request.plan,
            success_url=success_url,
            cancel_url=cancel_url
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")
    
    return {
        "session_id": checkout_session.id,
        "url": checkout_session.url
    }

@router.post("/billing/webhook")
async def webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature")
):
    """Handle Stripe webhook events for subscription changes."""
    payload = await request.body()
    
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")
    
    from app.billing.stripe_service import WEBHOOK_SECRET
    
    try:
        event = handle_webhook(payload, stripe_signature, WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook processing error: {str(e)}")
    
    event_type = event["type"]
    db = next(get_db())
    
    try:
        if event_type == "invoice.payment_succeeded":
            invoice = event["data"]["object"]
            subscription_id = invoice.get("subscription")
            
            if subscription_id:
                subscription = get_subscription(subscription_id)
                if subscription and subscription["status"] == "active":
                    customer_id = subscription["customer"]
                    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
                    
                    if user and user.stripe_subscription_id:
                        plan = get_plan_from_price(subscription["items"]["data"][0]["price"]["id"])
                        if plan:
                            update_user_plan(db, user.id, plan, subscription_id)
        
        elif event_type == "customer.subscription.updated":
            subscription = event["data"]["object"]
            customer_id = subscription["customer"]
            
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
            if user:
                plan = get_plan_from_price(subscription["items"]["data"][0]["price"]["id"])
                if plan:
                    update_user_plan(db, user.id, plan, subscription["id"])
        
        elif event_type == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            customer_id = subscription["customer"]
            
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
            if user:
                update_user_plan(db, user.id, "free", None)
                user.stripe_subscription_id = None
                db.commit()
    finally:
        db.close()
    
    return {"status": "success"}

@router.get("/billing/portal", response_model=PortalResponse)
async def get_portal_url(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create and return Stripe Customer Portal URL for managing subscription."""
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer found")
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return_url = f"{frontend_url}/billing"
    
    try:
        portal_session = create_portal_session(
            customer_id=user.stripe_customer_id,
            return_url=return_url
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create portal session: {str(e)}")
    
    return {"url": portal_session.url}

@router.get("/billing/status", response_model=BillingStatusResponse)
async def get_billing_status(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get current billing status and subscription details for the user."""
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    subscription_id = user.stripe_subscription_id
    status = "active"
    current_period_end = None
    
    if subscription_id:
        subscription = get_subscription(subscription_id)
        if subscription:
            status = subscription["status"]
            if subscription.get("current_period_end"):
                current_period_end = subscription["current_period_end"]
        else:
            user.stripe_subscription_id = None
            db.commit()
            status = "inactive"
    else:
        status = "inactive"
    
    return {
        "plan": user.plan or "free",
        "status": status,
        "current_period_end": current_period_end,
        "subscription_id": subscription_id
    }
