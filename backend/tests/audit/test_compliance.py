"""
Tests for compliance-related audit fixes audit findings
Uses Django's TestCase with PostgreSQL.
"""

import uuid
from datetime import timedelta
from typing import cast

from django.test import TestCase
from django.utils import timezone

# Helpers


def _make_tenant(**kwargs):
    from apps.tenants.models import Tenant

    defaults = {"name": "Test Tenant", "slug": f"test-{uuid.uuid4().hex[:8]}"}
    defaults.update(kwargs)
    return Tenant.objects.create(**defaults)


def _make_user(tenant, **kwargs):
    from apps.authentication.models import User, UserManager

    defaults = {
        "email": f"user-{uuid.uuid4().hex[:6]}@test.com",
        "first_name": "Test",
        "last_name": "User",
        "role": "OWNER",
    }
    defaults.update(kwargs)
    import secrets

    password = defaults.pop("password", None) or secrets.token_urlsafe(16)
    user = cast(UserManager, User.objects).create_user(password=password, **defaults)
    if tenant:
        user.tenant = tenant
        user.save(update_fields=["tenant"])
    return user


def _make_card(tenant, card_type="stamp", metadata=None, **kwargs):
    from apps.cards.models import Card

    type_defaults = {
        "stamp": {"stamps_required": 10, "reward_description": "Free coffee"},
        "coupon": {
            "discount_type": "special_promo",
            "promo_text": "Free coffee",
            "usage_limit_per_customer": 1,
            "coupon_description": "Free coffee",
        },
        "referral_pass": {
            "referrer_reward": "Free item",
            "referee_reward": "10% off",
            "max_referrals_per_customer": 0,
        },
        "cashback": {
            "cashback_percentage": 5,
            "minimum_purchase": 0,
            "credit_expiry_days": 365,
        },
        "discount": {
            "tiers": [
                {"tier_name": "Silver", "threshold": 0, "discount_percentage": 5},
                {"tier_name": "Gold", "threshold": 100, "discount_percentage": 10},
            ],
        },
    }
    merged_metadata = dict(type_defaults.get(card_type, {}))
    merged_metadata.update(metadata or {})
    defaults = {
        "name": f"Test Card {uuid.uuid4().hex[:6]}",
        "card_type": card_type,
        "is_active": True,
        "metadata": merged_metadata,
    }
    defaults.update(kwargs)
    return Card.objects.create(tenant=tenant, **defaults)


def _make_customer(tenant, **kwargs):
    from apps.customers.models import Customer

    defaults = {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": f"jane-{uuid.uuid4().hex[:6]}@test.com",
    }
    defaults.update(kwargs)
    return Customer.objects.create(tenant=tenant, **defaults)


def _make_pass(customer, card):
    from apps.customers.models import CustomerPass

    return CustomerPass.objects.create(customer=customer, card=card)


#


class AutomationMaxExecutionsPerDayTest(TestCase):
    """Verify automation enforces max_executions_per_day."""

    def setUp(self):
        self.tenant = _make_tenant()
        self.customer = _make_customer(self.tenant)
        self.card = _make_card(self.tenant, card_type="stamp")
        _make_pass(self.customer, self.card)

        from apps.automation.models import (
            Automation,
            AutomationAction,
            AutomationTrigger,
        )

        self.automation = Automation.objects.create(
            tenant=self.tenant,
            name="Test Automation",
            trigger=AutomationTrigger.CUSTOMER_ENROLLED,
            action=AutomationAction.UPDATE_SEGMENT,
            action_config={"new_segment": "vip"},
            max_executions_per_day=2,
            cooldown_hours=0,
            is_active=True,
        )

    def test_execution_blocked_after_max(self):
        from apps.automation.models import AutomationExecution

        # Create 2 executions today
        for _ in range(2):
            AutomationExecution.objects.create(
                automation=self.automation,
                customer=self.customer,
                trigger_event="customer_enrolled",
                success=True,
            )

        # Third execution should be blocked
        result = self.automation.execute(self.customer)
        self.assertFalse(result)

    def test_execution_allowed_below_max(self):
        from apps.automation.models import AutomationExecution

        # Create 1 execution today
        AutomationExecution.objects.create(
            automation=self.automation,
            customer=self.customer,
            trigger_event="customer_enrolled",
            success=True,
        )

        # Real can_execute_for_customer checks cooldown (no prior execution for this customer = True)
        # Real _execute_send_notification creates a notification
        result = self.automation.execute(self.customer)
        self.assertTrue(result)

    def test_no_limit_when_max_is_none(self):
        """When max_executions_per_day is None, no limit is enforced."""
        self.automation.max_executions_per_day = None
        self.automation.save(update_fields=["max_executions_per_day"])

        # Real methods run without patches
        result = self.automation.execute(self.customer)
        self.assertTrue(result)

    def test_old_executions_not_counted(self):
        """Executions from yesterday should not count toward today's limit."""
        from apps.automation.models import AutomationExecution

        # Create 2 executions yesterday
        yesterday = timezone.now() - timedelta(days=1)
        for _ in range(2):
            exec_obj = AutomationExecution.objects.create(
                automation=self.automation,
                customer=self.customer,
                trigger_event="customer_enrolled",
                success=True,
            )
            AutomationExecution.objects.filter(pk=exec_obj.pk).update(
                executed_at=yesterday
            )

        # Should still be allowed today real methods run
        result = self.automation.execute(self.customer)
        self.assertTrue(result)
