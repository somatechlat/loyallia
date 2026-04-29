"""
Loyallia — Test Data Factories
Reusable factory functions for creating test data across all test modules.
Each factory creates minimal valid objects with sensible defaults.
"""

import uuid
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from apps.authentication.models import User, UserRole
from apps.automation.models import Automation, AutomationAction, AutomationTrigger
from apps.billing.models import Subscription, SubscriptionPlan, SubscriptionStatus
from apps.cards.models import Card, CardType
from apps.customers.models import Customer, CustomerPass
from apps.tenants.models import Location, Tenant
from apps.transactions.models import Enrollment, Transaction, TransactionType


def make_tenant(**kwargs):
    """Create a Tenant with sensible defaults."""
    defaults = {
        "name": f"Test Business {uuid.uuid4().hex[:6]}",
        "slug": f"test-{uuid.uuid4().hex[:8]}",
        "plan": "trial",
        "is_active": True,
        "country": "EC",
        "default_language": "es",
    }
    defaults.update(kwargs)
    return Tenant.objects.create(**defaults)


def make_user(tenant=None, role=UserRole.OWNER, password="TestPass123!@", **kwargs):
    """Create a User with sensible defaults."""
    defaults = {
        "email": f"user-{uuid.uuid4().hex[:6]}@test.com",
        "first_name": "Test",
        "last_name": "User",
        "role": role,
        "is_active": True,
        "is_email_verified": True,
    }
    defaults.update(kwargs)
    pwd = defaults.pop("password", password)
    user = User.objects.create_user(password=pwd, **defaults)
    if tenant:
        user.tenant = tenant
        user.save(update_fields=["tenant"])
    return user


def make_card(tenant, card_type=CardType.STAMP, metadata=None, **kwargs):
    """Create a Card with sensible defaults for the given card type."""
    type_defaults = {
        CardType.STAMP: {"stamps_required": 10, "reward_description": "Free coffee"},
        CardType.CASHBACK: {
            "cashback_percentage": 5,
            "minimum_purchase": 0,
            "credit_expiry_days": 365,
        },
        CardType.COUPON: {
            "discount_type": "percentage",
            "discount_value": 20,
            "usage_limit_per_customer": 1,
            "coupon_description": "20% off",
        },
        CardType.DISCOUNT: {
            "tiers": [
                {"tier_name": "Silver", "threshold": 0, "discount_percentage": 5},
                {"tier_name": "Gold", "threshold": 100, "discount_percentage": 10},
            ],
        },
        CardType.GIFT_CERTIFICATE: {
            "denominations": [10, 25, 50],
            "expiry_days": 365,
        },
        CardType.VIP_MEMBERSHIP: {
            "membership_name": "Gold VIP",
            "monthly_fee": 29.99,
            "annual_fee": 299.99,
            "validity_period": "monthly",
        },
        CardType.REFERRAL_PASS: {
            "referrer_reward": "Free item",
            "referee_reward": "10% off",
            "max_referrals_per_customer": 5,
        },
        CardType.MULTIPASS: {"bundle_size": 10, "bundle_price": 50.00},
    }
    meta = metadata or type_defaults.get(card_type, {})
    defaults = {
        "name": f"Test Program {uuid.uuid4().hex[:6]}",
        "card_type": card_type,
        "is_active": True,
        "metadata": meta,
    }
    defaults.update(kwargs)
    return Card.objects.create(tenant=tenant, **defaults)


def make_customer(tenant, **kwargs):
    """Create a Customer with sensible defaults."""
    uid = uuid.uuid4().hex[:6]
    defaults = {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": f"customer-{uid}@test.com",
        "phone": "+593991234567",
        "is_active": True,
    }
    defaults.update(kwargs)
    return Customer.objects.create(tenant=tenant, **defaults)


def make_customer_pass(customer, card, pass_data=None, **kwargs):
    """Create a CustomerPass (enrollment) with sensible defaults."""
    defaults = {
        "is_active": True,
        "pass_data": pass_data or {},
    }
    defaults.update(kwargs)
    return CustomerPass.objects.create(customer=customer, card=card, **defaults)


def make_subscription(tenant, plan=None, status=SubscriptionStatus.ACTIVE, **kwargs):
    """Create a Subscription with sensible defaults."""
    if plan is None:
        plan = make_plan()
    now = timezone.now()
    defaults = {
        "subscription_plan": plan,
        "plan": plan.slug if plan else "trial",
        "status": status,
        "billing_cycle": "monthly",
        "current_period_start": now,
        "current_period_end": now + timedelta(days=30),
    }
    defaults.update(kwargs)
    sub, _ = Subscription.objects.get_or_create(tenant=tenant, defaults=defaults)
    return sub


def make_plan(**kwargs):
    """Create a SubscriptionPlan with sensible defaults."""
    uid = uuid.uuid4().hex[:6]
    defaults = {
        "name": f"Test Plan {uid}",
        "slug": f"test-plan-{uid}",
        "price_monthly": Decimal("75.00"),
        "price_annual": Decimal("750.00"),
        "max_locations": 10,
        "max_users": 5,
        "max_customers": 1000,
        "max_programs": 10,
        "max_notifications_month": 5000,
        "max_transactions_month": 10000,
        "features": [
            "geo_fencing",
            "automation",
            "advanced_analytics",
            "data_export",
        ],
        "is_active": True,
        "trial_days": 14,
    }
    defaults.update(kwargs)
    return SubscriptionPlan.objects.create(**defaults)


def make_location(tenant, **kwargs):
    """Create a Location with sensible defaults."""
    defaults = {
        "name": f"Location {uuid.uuid4().hex[:6]}",
        "address": "123 Test Street",
        "city": "Quito",
        "country": "EC",
        "is_active": True,
        "is_primary": True,
    }
    defaults.update(kwargs)
    return Location.objects.create(tenant=tenant, **defaults)


def make_automation(tenant, trigger=AutomationTrigger.CUSTOMER_ENROLLED,
                    action=AutomationAction.SEND_NOTIFICATION, **kwargs):
    """Create an Automation with sensible defaults."""
    defaults = {
        "name": f"Test Automation {uuid.uuid4().hex[:6]}",
        "trigger": trigger,
        "action": action,
        "action_config": {"title": "Welcome!", "message": "Thanks for joining!"},
        "is_active": True,
        "cooldown_hours": 24,
    }
    defaults.update(kwargs)
    return Automation.objects.create(tenant=tenant, **defaults)


def make_enrollment(tenant, customer, card, **kwargs):
    """Create an Enrollment record."""
    defaults = {"enrollment_method": "manual"}
    defaults.update(kwargs)
    return Enrollment.objects.create(tenant=tenant, customer=customer, card=card, **defaults)


def make_transaction(tenant, customer_pass, transaction_type=TransactionType.STAMP_EARNED,
                     amount=None, **kwargs):
    """Create a Transaction record."""
    defaults = {
        "transaction_type": transaction_type,
        "amount": amount,
        "quantity": 1,
    }
    defaults.update(kwargs)
    return Transaction.objects.create(tenant=tenant, customer_pass=customer_pass, **defaults)


def make_full_stack(tenant=None, plan_kwargs=None, card_type=CardType.STAMP,
                    card_kwargs=None, pass_data=None):
    """Create a full tenant → user → subscription → card → customer → pass stack.
    Returns (tenant, user, subscription, card, customer, customer_pass).
    """
    tenant = tenant or make_tenant()
    user = make_user(tenant=tenant, role=UserRole.OWNER)
    plan = make_plan(**(plan_kwargs or {}))
    subscription = make_subscription(tenant, plan=plan)
    card = make_card(tenant, card_type=card_type, **(card_kwargs or {}))
    customer = make_customer(tenant)
    customer_pass = make_customer_pass(customer, card, pass_data=pass_data or {})
    return tenant, user, subscription, card, customer, customer_pass
