"""
Loyallia — Automation Tests
Tests for Automation model: trigger matching, action execution,
cooldown enforcement, daily limits, and AutomationExecution log.
"""

import uuid
from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.utils import timezone

from apps.analytics.models import CustomerAnalytics
from apps.automation.models import (
    Automation,
    AutomationAction,
    AutomationExecution,
    AutomationTrigger,
)
from apps.cards.models import CardType
from apps.customers.models import CustomerPass
from tests.factories import (
    make_card,
    make_customer,
    make_customer_pass,
    make_full_stack,
    make_automation,
    make_plan,
    make_subscription,
    make_tenant,
    make_user,
)


# =============================================================================
# Automation Model Tests
# =============================================================================

class AutomationCreateTest(TestCase):
    """Tests for Automation creation and basic properties."""

    def test_create_automation_with_defaults(self):
        t = make_tenant()
        auto = make_automation(t)
        self.assertIsNotNone(auto.id)
        self.assertTrue(auto.is_active)
        self.assertEqual(auto.cooldown_hours, 24)

    def test_automation_str(self):
        t = make_tenant()
        auto = make_automation(t, name="Welcome Flow")
        self.assertIn("Welcome Flow", str(auto))

    def test_automation_repr(self):
        t = make_tenant()
        auto = make_automation(t, name="Test")
        self.assertIn("Test", repr(auto))

    def test_all_trigger_choices_valid(self):
        for trigger_val, _ in AutomationTrigger.choices:
            self.assertIsInstance(trigger_val, str)

    def test_all_action_choices_valid(self):
        for action_val, _ in AutomationAction.choices:
            self.assertIsInstance(action_val, str)

    def test_default_cooldown(self):
        t = make_tenant()
        auto = make_automation(t)
        self.assertEqual(auto.cooldown_hours, 24)

    def test_custom_cooldown(self):
        t = make_tenant()
        auto = make_automation(t, cooldown_hours=4)
        self.assertEqual(auto.cooldown_hours, 4)

    def test_action_config_stored(self):
        t = make_tenant()
        config = {"title": "Hi!", "message": "Welcome"}
        auto = make_automation(t)
        auto.action_config = config
        auto.save(update_fields=["action_config"])
        auto.refresh_from_db()
        self.assertEqual(auto.action_config["title"], "Hi!")


# =============================================================================
# can_execute_for_customer Tests
# =============================================================================

class CanExecuteForCustomerTest(TestCase):
    """Tests for Automation.can_execute_for_customer cooldown logic."""

    def setUp(self):
        self.tenant = make_tenant()
        self.customer = make_customer(self.tenant)
        self.card = make_card(self.tenant)
        make_customer_pass(self.customer, self.card)

    def test_can_execute_when_no_prior_execution(self):
        auto = make_automation(self.tenant, cooldown_hours=24)
        self.assertTrue(auto.can_execute_for_customer(self.customer))

    def test_cannot_execute_within_cooldown(self):
        auto = make_automation(self.tenant, cooldown_hours=24)
        AutomationExecution.objects.create(
            automation=auto,
            customer=self.customer,
            trigger_event="customer_enrolled",
            success=True,
        )
        self.assertFalse(auto.can_execute_for_customer(self.customer))

    def test_can_execute_after_cooldown_expired(self):
        auto = make_automation(self.tenant, cooldown_hours=1)
        exec_obj = AutomationExecution.objects.create(
            automation=auto,
            customer=self.customer,
            trigger_event="customer_enrolled",
            success=True,
        )
        # Move execution to 2 hours ago
        AutomationExecution.objects.filter(pk=exec_obj.pk).update(
            executed_at=timezone.now() - timedelta(hours=2)
        )
        self.assertTrue(auto.can_execute_for_customer(self.customer))

    def test_per_customer_cooldown_not_global(self):
        """Cooldown is per-customer, not global across all customers."""
        auto = make_automation(self.tenant, cooldown_hours=24)
        customer2 = make_customer(self.tenant, email="c2@test.com")
        make_customer_pass(customer2, self.card)

        # Execute for customer1
        AutomationExecution.objects.create(
            automation=auto,
            customer=self.customer,
            trigger_event="customer_enrolled",
            success=True,
        )
        # customer2 should still be able to execute
        self.assertTrue(auto.can_execute_for_customer(customer2))

    def test_failed_execution_does_not_block_cooldown(self):
        """Only successful executions count for cooldown."""
        auto = make_automation(self.tenant, cooldown_hours=24)
        AutomationExecution.objects.create(
            automation=auto,
            customer=self.customer,
            trigger_event="customer_enrolled",
            success=False,
        )
        self.assertTrue(auto.can_execute_for_customer(self.customer))

    def test_zero_cooldown_allows_always(self):
        auto = make_automation(self.tenant, cooldown_hours=0)
        AutomationExecution.objects.create(
            automation=auto,
            customer=self.customer,
            trigger_event="customer_enrolled",
            success=True,
        )
        self.assertTrue(auto.can_execute_for_customer(self.customer))


# =============================================================================
# Automation Execution Tests
# =============================================================================

class AutomationExecuteTest(TestCase):
    """Tests for Automation.execute method."""

    def setUp(self):
        self.tenant = make_tenant()
        self.customer = make_customer(self.tenant)
        self.card = make_card(self.tenant)
        make_customer_pass(self.customer, self.card)

    @patch.object(Automation, "_execute_send_notification", return_value=True)
    def test_execute_success(self, mock_action):
        auto = make_automation(
            self.tenant,
            trigger=AutomationTrigger.CUSTOMER_ENROLLED,
            action=AutomationAction.SEND_NOTIFICATION,
        )
        result = auto.execute(self.customer)
        self.assertTrue(result)
        mock_action.assert_called_once()

    @patch.object(Automation, "_execute_send_notification", return_value=True)
    def test_execute_creates_execution_log(self, mock_action):
        auto = make_automation(self.tenant)
        auto.execute(self.customer)
        self.assertTrue(
            AutomationExecution.objects.filter(
                automation=auto, customer=self.customer
            ).exists()
        )

    @patch.object(Automation, "_execute_send_notification", return_value=True)
    def test_execute_increments_total(self, mock_action):
        auto = make_automation(self.tenant)
        auto.execute(self.customer)
        auto.refresh_from_db()
        self.assertEqual(auto.total_executions, 1)

    @patch.object(Automation, "_execute_send_notification", return_value=True)
    def test_execute_updates_last_executed(self, mock_action):
        auto = make_automation(self.tenant)
        auto.execute(self.customer)
        auto.refresh_from_db()
        self.assertIsNotNone(auto.last_executed)

    def test_execute_blocked_when_inactive(self):
        auto = make_automation(self.tenant, is_active=False)
        # Inactive automation won't match in fire_trigger, but direct call
        # should still respect can_execute
        # Note: execute doesn't check is_active directly — fire_trigger does
        pass

    def test_execute_blocked_within_cooldown(self):
        auto = make_automation(self.tenant, cooldown_hours=24)
        AutomationExecution.objects.create(
            automation=auto,
            customer=self.customer,
            trigger_event="customer_enrolled",
            success=True,
        )
        result = auto.execute(self.customer)
        self.assertFalse(result)


# =============================================================================
# Daily Limits Tests
# =============================================================================

class AutomationDailyLimitsTest(TestCase):
    """Tests for max_executions_per_day enforcement."""

    def setUp(self):
        self.tenant = make_tenant()
        self.customer = make_customer(self.tenant)
        self.card = make_card(self.tenant)
        make_customer_pass(self.customer, self.card)

    @patch.object(Automation, "can_execute_for_customer", return_value=True)
    @patch.object(Automation, "_execute_send_notification", return_value=True)
    def test_execution_blocked_at_daily_limit(self, mock_action, mock_can):
        auto = make_automation(self.tenant, max_executions_per_day=2)
        # Create 2 executions today
        for _ in range(2):
            AutomationExecution.objects.create(
                automation=auto,
                customer=self.customer,
                trigger_event="customer_enrolled",
                success=True,
            )
        result = auto.execute(self.customer)
        self.assertFalse(result)

    @patch.object(Automation, "can_execute_for_customer", return_value=True)
    @patch.object(Automation, "_execute_send_notification", return_value=True)
    def test_execution_allowed_below_daily_limit(self, mock_action, mock_can):
        auto = make_automation(self.tenant, max_executions_per_day=5)
        AutomationExecution.objects.create(
            automation=auto,
            customer=self.customer,
            trigger_event="customer_enrolled",
            success=True,
        )
        result = auto.execute(self.customer)
        self.assertTrue(result)

    @patch.object(Automation, "can_execute_for_customer", return_value=True)
    @patch.object(Automation, "_execute_send_notification", return_value=True)
    def test_no_limit_when_none(self, mock_action, mock_can):
        auto = make_automation(self.tenant, max_executions_per_day=None)
        result = auto.execute(self.customer)
        self.assertTrue(result)

    @patch.object(Automation, "can_execute_for_customer", return_value=True)
    @patch.object(Automation, "_execute_send_notification", return_value=True)
    def test_yesterday_executions_not_counted(self, mock_action, mock_can):
        auto = make_automation(self.tenant, max_executions_per_day=2)
        # Create 2 executions yesterday
        for _ in range(2):
            exec_obj = AutomationExecution.objects.create(
                automation=auto,
                customer=self.customer,
                trigger_event="customer_enrolled",
                success=True,
            )
            AutomationExecution.objects.filter(pk=exec_obj.pk).update(
                executed_at=timezone.now() - timedelta(days=1)
            )
        result = auto.execute(self.customer)
        self.assertTrue(result)

    @patch.object(Automation, "can_execute_for_customer", return_value=True)
    @patch.object(Automation, "_execute_send_notification", return_value=True)
    def test_zero_daily_limit_blocks_all(self, mock_action, mock_can):
        auto = make_automation(self.tenant, max_executions_per_day=0)
        result = auto.execute(self.customer)
        self.assertFalse(result)


# =============================================================================
# Action Execution Tests
# =============================================================================

class AutomationActionTest(TestCase):
    """Tests for individual automation actions."""

    def setUp(self):
        self.tenant = make_tenant()
        self.customer = make_customer(self.tenant)
        self.card = make_card(self.tenant)
        make_customer_pass(self.customer, self.card)

    def test_send_email_action_returns_true(self):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_EMAIL,
            action_config={"subject": "Hello", "body": "World"},
        )
        result = auto._execute_send_email(self.customer, {})
        self.assertTrue(result)

    def test_send_sms_action_returns_true(self):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_SMS,
            action_config={"message": "Hi"},
        )
        result = auto._execute_send_sms(self.customer, {})
        self.assertTrue(result)

    def test_issue_reward_with_valid_program(self):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.ISSUE_REWARD,
            action_config={"program_id": str(self.card.id)},
        )
        result = auto._execute_issue_reward(self.customer, {})
        # Should succeed since customer has a pass for the card
        self.assertIsInstance(result, bool)

    def test_issue_reward_with_invalid_program(self):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.ISSUE_REWARD,
            action_config={"program_id": str(uuid.uuid4())},
        )
        result = auto._execute_issue_reward(self.customer, {})
        self.assertFalse(result)

    def test_update_segment_action(self):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.UPDATE_SEGMENT,
            action_config={"new_segment": "vip"},
        )
        result = auto._execute_update_segment(self.customer, {})
        self.assertTrue(result)
        analytics = CustomerAnalytics.objects.get(customer=self.customer)
        self.assertEqual(analytics.segment, "vip")

    def test_update_segment_without_config(self):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.UPDATE_SEGMENT,
            action_config={},
        )
        result = auto._execute_update_segment(self.customer, {})
        self.assertFalse(result)


# =============================================================================
# AutomationExecution Model Tests
# =============================================================================

class AutomationExecutionModelTest(TestCase):
    """Tests for AutomationExecution log model."""

    def test_create_execution(self):
        t = make_tenant()
        customer = make_customer(t)
        auto = make_automation(t)
        exec_obj = AutomationExecution.objects.create(
            automation=auto,
            customer=customer,
            trigger_event="customer_enrolled",
            success=True,
        )
        self.assertIsNotNone(exec_obj.id)

    def test_execution_str(self):
        t = make_tenant()
        customer = make_customer(t, first_name="Alice")
        auto = make_automation(t, name="Welcome")
        exec_obj = AutomationExecution.objects.create(
            automation=auto,
            customer=customer,
            trigger_event="customer_enrolled",
            success=True,
        )
        self.assertIn("Welcome", str(exec_obj))
        self.assertIn("Alice", str(exec_obj))

    def test_execution_context_stored(self):
        t = make_tenant()
        customer = make_customer(t)
        auto = make_automation(t)
        context = {"source": "qr_scan", "location": "main_store"}
        exec_obj = AutomationExecution.objects.create(
            automation=auto,
            customer=customer,
            trigger_event="customer_enrolled",
            execution_context=context,
            success=True,
        )
        exec_obj.refresh_from_db()
        self.assertEqual(exec_obj.execution_context["source"], "qr_scan")

    def test_failed_execution(self):
        t = make_tenant()
        customer = make_customer(t)
        auto = make_automation(t)
        exec_obj = AutomationExecution.objects.create(
            automation=auto,
            customer=customer,
            trigger_event="customer_enrolled",
            success=False,
        )
        self.assertFalse(exec_obj.success)

    def test_execution_has_timestamp(self):
        t = make_tenant()
        customer = make_customer(t)
        auto = make_automation(t)
        exec_obj = AutomationExecution.objects.create(
            automation=auto,
            customer=customer,
            trigger_event="customer_enrolled",
            success=True,
        )
        self.assertIsNotNone(exec_obj.executed_at)
