"""
Tests for compliance-related audit fixes — audit findings LYL-H-ARCH-004, LYL-H-API-010.
Uses Django's TestCase with PostgreSQL.
"""

import uuid
from datetime import timedelta
from typing import cast
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


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
    password = defaults.pop("password", "[REDACTED]")
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


# ===========================================================================
# FIX 7 — LYL-H-ARCH-004: Hardcoded passwords in seed files
# ===========================================================================


class HardcodedPasswordsTest(TestCase):
    """Verify seed files don't contain hardcoded passwords."""

    def test_seed_sweet_coffee_no_hardcoded_password(self):
        import os

        seed_path = os.path.join(
            os.path.dirname(__file__), "..", "seed_sweet_coffee.py"
        )
        if not os.path.exists(seed_path):
            self.skipTest("seed_sweet_coffee.py not found")

        with open(seed_path) as f:
            content = f.read()

        self.assertNotIn('"Admin1234!"', content)
        self.assertNotIn("'Admin1234!'", content)
        self.assertIn("secrets.token_urlsafe", content)

    def test_adrian_passes_no_hardcoded_password(self):
        import os

        seed_path = os.path.join(os.path.dirname(__file__), "..", "adrian_passes.py")
        if not os.path.exists(seed_path):
            self.skipTest("adrian_passes.py not found")

        with open(seed_path) as f:
            content = f.read()

        # adrian_passes.py is a diagnostic script, should not have passwords
        dangerous = ["password", "make_password", "Admin1234"]
        for term in dangerous:
            self.assertNotIn(
                term,
                content.lower() if term == term.lower() else content,
                f"Found '{term}' in adrian_passes.py",
            )


# ===========================================================================
# FIX 10 — LYL-H-API-010: Automation max_executions_per_day
# ===========================================================================


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
            action=AutomationAction.SEND_NOTIFICATION,
            action_config={"title": "Welcome!", "message": "Hello"},
            max_executions_per_day=2,
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

        # Mock can_execute_for_customer to return True
        with patch.object(
            self.automation, "can_execute_for_customer", return_value=True
        ), patch.object(
            self.automation, "_execute_send_notification", return_value=True
        ):
            result = self.automation.execute(self.customer)
            self.assertTrue(result)

    def test_no_limit_when_max_is_none(self):
        """When max_executions_per_day is None, no limit is enforced."""
        self.automation.max_executions_per_day = None
        self.automation.save(update_fields=["max_executions_per_day"])

        with patch.object(
            self.automation, "can_execute_for_customer", return_value=True
        ), patch.object(
            self.automation, "_execute_send_notification", return_value=True
        ):
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

        # Should still be allowed today
        with patch.object(
            self.automation, "can_execute_for_customer", return_value=True
        ), patch.object(
            self.automation, "_execute_send_notification", return_value=True
        ):
            result = self.automation.execute(self.customer)
            self.assertTrue(result)
