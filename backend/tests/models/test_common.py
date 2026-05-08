"""
Loyallia — Common / Miscellaneous Model Unit Tests
Tests for Transaction, Automation, Audit, and other remaining models.
"""

import uuid

from django.test import TestCase

from apps.automation.models import AutomationAction, AutomationTrigger
from apps.transactions.models import TransactionType
from tests.factories import (
    make_automation,
    make_full_stack,
    make_tenant,
    make_transaction,
)

# =============================================================================
# Transaction Model Tests
# =============================================================================


class TransactionModelTest(TestCase):
    """Tests for Transaction model."""

    def test_create_transaction(self):
        t, _, _, card, customer, cp = make_full_stack()
        txn = make_transaction(t, cp, TransactionType.STAMP_EARNED)
        self.assertIsNotNone(txn.id)
        self.assertEqual(txn.transaction_type, TransactionType.STAMP_EARNED)

    def test_transaction_str(self):
        t, _, _, card, customer, cp = make_full_stack()
        txn = make_transaction(t, cp, TransactionType.STAMP_EARNED)
        self.assertIn("stamp_earned", str(txn))

    def test_transaction_type_choices_all_valid(self):
        for tt_val, _ in TransactionType.choices:
            self.assertIsInstance(tt_val, str)


# =============================================================================
# Automation Model Tests
# =============================================================================


class AutomationModelTest(TestCase):
    """Tests for Automation model."""

    def test_create_automation(self):
        t = make_tenant()
        auto = make_automation(t)
        self.assertIsNotNone(auto.id)
        self.assertTrue(auto.is_active)

    def test_automation_str(self):
        t = make_tenant()
        auto = make_automation(t, name="Welcome Flow")
        self.assertIn("Welcome Flow", str(auto))

    def test_automation_trigger_choices(self):
        for trigger_val, _ in AutomationTrigger.choices:
            self.assertIsInstance(trigger_val, str)

    def test_automation_action_choices(self):
        for action_val, _ in AutomationAction.choices:
            self.assertIsInstance(action_val, str)


# =============================================================================
# Audit Model Tests
# =============================================================================


class AuditLogModelTest(TestCase):
    """Tests for AuditLog immutability."""

    def test_create_audit_log(self):
        from apps.audit.models import AuditAction, AuditLog

        log = AuditLog.objects.create(
            actor_id=uuid.uuid4(),
            actor_email="test@test.com",
            actor_role="OWNER",
            action=AuditAction.CREATE,
            resource_type="Customer",
        )
        self.assertIsNotNone(log.id)

    def test_audit_log_immutable_update_blocked(self):
        from apps.audit.models import AuditAction, AuditLog

        log = AuditLog.objects.create(
            actor_id=uuid.uuid4(),
            actor_email="test@test.com",
            actor_role="OWNER",
            action=AuditAction.CREATE,
            resource_type="Customer",
        )
        log.actor_email = "changed@test.com"
        with self.assertRaises(ValueError):
            log.save()

    def test_audit_log_immutable_delete_blocked(self):
        from apps.audit.models import AuditAction, AuditLog

        log = AuditLog.objects.create(
            actor_id=uuid.uuid4(),
            actor_email="test@test.com",
            actor_role="OWNER",
            action=AuditAction.CREATE,
            resource_type="Customer",
        )
        with self.assertRaises(ValueError):
            log.delete()

    def test_audit_log_str(self):
        from apps.audit.models import AuditAction, AuditLog

        log = AuditLog.objects.create(
            actor_id=uuid.uuid4(),
            actor_email="test@test.com",
            actor_role="OWNER",
            action=AuditAction.CREATE,
            resource_type="Customer",
        )
        self.assertIn("test@test.com", str(log))
        self.assertIn("CREATE", str(log))
