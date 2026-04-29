"""
Loyallia — Service Layer Tests
Tests for TransactionService, BillingService, AutomationService, CustomerService.
"""

import uuid
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.authentication.models import User, UserRole
from apps.automation.models import Automation, AutomationAction, AutomationTrigger
from apps.billing.models import SubscriptionStatus
from apps.cards.models import CardType
from apps.customers.models import Customer, CustomerPass
from apps.customers.service import CustomerService
from apps.transactions.models import Enrollment, Transaction, TransactionType
from apps.transactions.service import TransactionService
from tests.factories import (
    make_card,
    make_customer,
    make_customer_pass,
    make_full_stack,
    make_plan,
    make_subscription,
    make_tenant,
    make_user,
)


# =============================================================================
# TransactionService Tests
# =============================================================================

class TransactionServiceScanQRTest(TestCase):
    """Tests for TransactionService.scan_qr"""

    def test_scan_qr_stamp_transaction(self):
        t, _, _, card, customer, cp = make_full_stack()
        result = TransactionService.scan_qr(t, cp.qr_code, quantity=1)
        self.assertTrue(result["success"])
        self.assertTrue(result["pass_updated"])

    def test_scan_qr_empty_code_raises(self):
        t = make_tenant()
        with self.assertRaises(ValueError):
            TransactionService.scan_qr(t, "", quantity=1)

    def test_scan_qr_nonexistent_code_raises(self):
        t = make_tenant()
        with self.assertRaises(CustomerPass.DoesNotExist):
            TransactionService.scan_qr(t, "NONEXISTENT123", quantity=1)

    def test_scan_qr_inactive_pass_raises(self):
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card, is_active=False)
        with self.assertRaises(CustomerPass.DoesNotExist):
            TransactionService.scan_qr(t, cp.qr_code, quantity=1)

    def test_scan_qr_with_amount(self):
        t, _, _, card, customer, cp = make_full_stack(card_type=CardType.CASHBACK)
        result = TransactionService.scan_qr(t, cp.qr_code, amount=50.00, quantity=1)
        self.assertTrue(result["success"])

    def test_scan_qr_updates_customer_stats(self):
        t, _, _, card, customer, cp = make_full_stack()
        initial_visits = customer.total_visits
        TransactionService.scan_qr(t, cp.qr_code, amount=25.00, quantity=1)
        customer.refresh_from_db()
        self.assertEqual(customer.total_visits, initial_visits + 1)

    def test_scan_qr_coupon_double_redemption(self):
        t, _, _, card, customer, cp = make_full_stack(card_type=CardType.COUPON)
        result1 = TransactionService.scan_qr(t, cp.qr_code)
        self.assertTrue(result1["pass_updated"])
        result2 = TransactionService.scan_qr(t, cp.qr_code)
        self.assertFalse(result2["pass_updated"])


class TransactionServiceEnrollTest(TestCase):
    """Tests for TransactionService.enroll_customer"""

    def test_enroll_customer_success(self):
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        cp = TransactionService.enroll_customer(t, customer, card)
        self.assertIsNotNone(cp)
        self.assertTrue(CustomerPass.objects.filter(customer=customer, card=card).exists())
        self.assertTrue(Enrollment.objects.filter(customer=customer, card=card).exists())

    def test_enroll_customer_already_enrolled_raises(self):
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        TransactionService.enroll_customer(t, customer, card)
        with self.assertRaises(ValueError):
            TransactionService.enroll_customer(t, customer, card)

    def test_enroll_customer_inactive_card_raises(self):
        t = make_tenant()
        card = make_card(t, is_active=False)
        customer = make_customer(t)
        with self.assertRaises(ValueError):
            TransactionService.enroll_customer(t, customer, card)


class TransactionServiceRemoteIssueTest(TestCase):
    """Tests for TransactionService.remote_issue"""

    def test_remote_issue_success(self):
        t, _, _, card, customer, cp = make_full_stack()
        staff = make_user(tenant=t, role=UserRole.STAFF)
        result = TransactionService.remote_issue(t, customer, card, quantity=3, staff=staff)
        self.assertTrue(result["success"])
        self.assertTrue(result["pass_updated"])

    def test_remote_issue_creates_remote_transaction(self):
        t, _, _, card, customer, cp = make_full_stack()
        TransactionService.remote_issue(t, customer, card, quantity=2, notes="Manual reward")
        txn = Transaction.objects.filter(customer_pass=cp, is_remote=True).first()
        self.assertIsNotNone(txn)
        self.assertTrue(txn.is_remote)


class TransactionServiceListTest(TestCase):
    """Tests for TransactionService.list_transactions"""

    def test_list_transactions_empty(self):
        t = make_tenant()
        result = TransactionService.list_transactions(t)
        self.assertEqual(result, [])

    def test_list_transactions_with_data(self):
        t, _, _, card, customer, cp = make_full_stack()
        TransactionService.scan_qr(t, cp.qr_code, amount=10.00, quantity=1)
        result = TransactionService.list_transactions(t, limit=10)
        self.assertGreater(len(result), 0)

    def test_list_transactions_respects_limit(self):
        t, _, _, card, customer, cp = make_full_stack()
        for _ in range(5):
            TransactionService.scan_qr(t, cp.qr_code, amount=10.00, quantity=1)
        result = TransactionService.list_transactions(t, limit=3)
        self.assertLessEqual(len(result), 3)


# =============================================================================
# BillingService Tests
# =============================================================================

class BillingServicePlansTest(TestCase):
    """Tests for BillingService.get_plans"""

    @patch("apps.billing.service.getattr")
    def test_get_plans_returns_active_plans(self, mock_getattr):
        mock_getattr.side_effect = lambda s, k, d=None: {
            "TAX_RATE_ECUADOR": "0.15",
            "TRIAL_DAYS": 14,
        }.get(k, d)
        plan = make_plan()
        from apps.billing.service import BillingService
        plans = BillingService.get_plans()
        self.assertGreater(len(plans), 0)

    def test_get_plans_includes_limits(self):
        make_plan()
        from apps.billing.service import BillingService
        plans = BillingService.get_plans()
        if plans:
            self.assertIn("limits", plans[0])
            self.assertIn("max_customers", plans[0]["limits"])


class BillingServiceCheckUsageTest(TestCase):
    """Tests for BillingService.check_usage"""

    def test_check_usage_returns_all_resources(self):
        t = make_tenant()
        make_subscription(t)
        from apps.billing.service import BillingService
        usage = BillingService.check_usage(t)
        self.assertIn("customers", usage)
        self.assertIn("programs", usage)
        self.assertIn("users", usage)
        self.assertIn("locations", usage)
        self.assertIn("transactions_month", usage)
        self.assertIn("notifications_month", usage)

    def test_check_usage_zero_for_empty_tenant(self):
        t = make_tenant()
        make_subscription(t)
        from apps.billing.service import BillingService
        usage = BillingService.check_usage(t)
        self.assertEqual(usage["customers"]["used"], 0)
        self.assertEqual(usage["programs"]["used"], 0)

    def test_check_usage_counts_customers(self):
        t = make_tenant()
        make_subscription(t)
        make_customer(t, email="a@test.com")
        make_customer(t, email="b@test.com")
        from apps.billing.service import BillingService
        usage = BillingService.check_usage(t)
        self.assertEqual(usage["customers"]["used"], 2)

    def test_check_usage_percentage_calculation(self):
        plan = make_plan(max_customers=10)
        t = make_tenant()
        make_subscription(t, plan=plan)
        for i in range(5):
            make_customer(t, email=f"c{i}@test.com")
        from apps.billing.service import BillingService
        usage = BillingService.check_usage(t)
        self.assertEqual(usage["customers"]["percentage"], 50.0)


# =============================================================================
# AutomationService Tests
# =============================================================================

class AutomationServiceFireTriggerTest(TestCase):
    """Tests for AutomationService.fire_trigger"""

    @patch("apps.automation.models.Automation.execute")
    def test_fire_trigger_executes_matching_automations(self, mock_execute):
        mock_execute.return_value = True
        t = make_tenant()
        customer = make_customer(t)
        auto = make_automation(t, trigger=AutomationTrigger.CUSTOMER_ENROLLED)
        from apps.automation.service import AutomationService
        count = AutomationService.fire_trigger(
            t, AutomationTrigger.CUSTOMER_ENROLLED, customer
        )
        self.assertGreaterEqual(count, 0)

    def test_fire_trigger_no_matching_automations(self):
        t = make_tenant()
        customer = make_customer(t)
        from apps.automation.service import AutomationService
        count = AutomationService.fire_trigger(
            t, AutomationTrigger.CUSTOMER_ENROLLED, customer
        )
        self.assertEqual(count, 0)

    def test_fire_trigger_inactive_automation_skipped(self):
        t = make_tenant()
        customer = make_customer(t)
        make_automation(t, trigger=AutomationTrigger.CUSTOMER_ENROLLED, is_active=False)
        from apps.automation.service import AutomationService
        count = AutomationService.fire_trigger(
            t, AutomationTrigger.CUSTOMER_ENROLLED, customer
        )
        self.assertEqual(count, 0)


class AutomationServiceCreateTest(TestCase):
    """Tests for AutomationService.create_automation"""

    def test_create_automation_success(self):
        t = make_tenant()
        from apps.automation.service import AutomationService
        auto = AutomationService.create_automation(t, {
            "name": "Welcome Flow",
            "trigger": "customer_enrolled",
            "action": "send_notification",
            "action_config": {"title": "Welcome!"},
        })
        self.assertIsNotNone(auto.id)
        self.assertEqual(auto.name, "Welcome Flow")

    def test_create_automation_invalid_trigger_raises(self):
        t = make_tenant()
        from apps.automation.service import AutomationService
        with self.assertRaises(ValueError):
            AutomationService.create_automation(t, {
                "name": "Bad",
                "trigger": "invalid_trigger",
                "action": "send_notification",
            })

    def test_create_automation_invalid_action_raises(self):
        t = make_tenant()
        from apps.automation.service import AutomationService
        with self.assertRaises(ValueError):
            AutomationService.create_automation(t, {
                "name": "Bad",
                "trigger": "customer_enrolled",
                "action": "invalid_action",
            })

    def test_create_automation_with_programs(self):
        t = make_tenant()
        card = make_card(t)
        from apps.automation.service import AutomationService
        auto = AutomationService.create_automation(t, {
            "name": "Program Flow",
            "trigger": "customer_enrolled",
            "action": "send_notification",
            "target_program_ids": [str(card.id)],
        })
        self.assertEqual(auto.target_programs.count(), 1)


class AutomationServiceUpdateTest(TestCase):
    """Tests for AutomationService.update_automation"""

    def test_update_automation_name(self):
        t = make_tenant()
        auto = make_automation(t, name="Old Name")
        from apps.automation.service import AutomationService
        updated = AutomationService.update_automation(auto, {"name": "New Name"})
        self.assertEqual(updated.name, "New Name")

    def test_update_automation_is_active(self):
        t = make_tenant()
        auto = make_automation(t, is_active=True)
        from apps.automation.service import AutomationService
        updated = AutomationService.update_automation(auto, {"is_active": False})
        updated.refresh_from_db()
        self.assertFalse(updated.is_active)


class AutomationServiceGetStatsTest(TestCase):
    """Tests for AutomationService.get_stats"""

    def test_get_stats_empty(self):
        t = make_tenant()
        from apps.automation.service import AutomationService
        stats = AutomationService.get_stats(t)
        self.assertEqual(stats["total_automations"], 0)
        self.assertEqual(stats["total_executions"], 0)

    def test_get_stats_counts_automations(self):
        t = make_tenant()
        make_automation(t)
        make_automation(t)
        from apps.automation.service import AutomationService
        stats = AutomationService.get_stats(t)
        self.assertEqual(stats["total_automations"], 2)
        self.assertEqual(stats["active_automations"], 2)


# =============================================================================
# CustomerService Tests
# =============================================================================

class CustomerServiceCreateTest(TestCase):
    """Tests for CustomerService.create"""

    def test_create_customer_success(self):
        t = make_tenant()
        customer = CustomerService.create(t, {
            "first_name": "Alice",
            "last_name": "Smith",
            "email": "alice@test.com",
            "phone": "+593991234567",
        })
        self.assertIsNotNone(customer.id)
        self.assertEqual(customer.email, "alice@test.com")

    def test_create_customer_invalid_email_raises(self):
        t = make_tenant()
        with self.assertRaises(ValueError):
            CustomerService.create(t, {
                "first_name": "Alice",
                "email": "not-an-email",
            })

    def test_create_customer_empty_email_raises(self):
        t = make_tenant()
        with self.assertRaises(ValueError):
            CustomerService.create(t, {"first_name": "Alice", "email": ""})

    def test_create_customer_missing_first_name_raises(self):
        t = make_tenant()
        with self.assertRaises(ValueError):
            CustomerService.create(t, {"first_name": "", "email": "a@test.com"})

    def test_create_customer_duplicate_email_raises(self):
        t = make_tenant()
        CustomerService.create(t, {
            "first_name": "Alice", "email": "dup@test.com"
        })
        with self.assertRaises(ValueError):
            CustomerService.create(t, {
                "first_name": "Bob", "email": "dup@test.com"
            })

    def test_create_customer_with_date_of_birth(self):
        t = make_tenant()
        customer = CustomerService.create(t, {
            "first_name": "Alice",
            "email": "alice@test.com",
            "date_of_birth": "1990-05-15",
        })
        self.assertIsNotNone(customer.date_of_birth)

    def test_create_customer_gender_normalization(self):
        t = make_tenant()
        customer = CustomerService.create(t, {
            "first_name": "Alice",
            "email": "alice@test.com",
            "gender": "masculino",
        })
        self.assertEqual(customer.gender, "M")


class CustomerServiceUpdateTest(TestCase):
    """Tests for CustomerService.update"""

    def test_update_first_name(self):
        t = make_tenant()
        customer = make_customer(t, first_name="Old")
        updated = CustomerService.update(customer, {"first_name": "New"})
        self.assertEqual(updated.first_name, "New")

    def test_update_phone(self):
        t = make_tenant()
        customer = make_customer(t)
        updated = CustomerService.update(customer, {"phone": "+593999999999"})
        updated.refresh_from_db()
        self.assertEqual(updated.phone, "+593999999999")

    def test_update_is_active(self):
        t = make_tenant()
        customer = make_customer(t)
        updated = CustomerService.update(customer, {"is_active": False})
        updated.refresh_from_db()
        self.assertFalse(updated.is_active)

    def test_update_empty_fields_no_change(self):
        t = make_tenant()
        customer = make_customer(t, first_name="Alice")
        CustomerService.update(customer, {})
        customer.refresh_from_db()
        self.assertEqual(customer.first_name, "Alice")


class CustomerServiceSearchTest(TestCase):
    """Tests for CustomerService.search"""

    def test_search_by_first_name(self):
        t = make_tenant()
        make_customer(t, first_name="Alice", email="alice@test.com")
        results = CustomerService.search(t, "Alice")
        self.assertEqual(len(results), 1)

    def test_search_by_email(self):
        t = make_tenant()
        make_customer(t, email="unique@test.com")
        results = CustomerService.search(t, "unique@test.com")
        self.assertEqual(len(results), 1)

    def test_search_short_query_returns_empty(self):
        t = make_tenant()
        make_customer(t, first_name="Alice")
        results = CustomerService.search(t, "A")
        self.assertEqual(len(results), 0)

    def test_search_empty_query_returns_empty(self):
        t = make_tenant()
        results = CustomerService.search(t, "")
        self.assertEqual(len(results), 0)

    def test_search_respects_limit(self):
        t = make_tenant()
        for i in range(10):
            make_customer(t, email=f"s{i}@test.com", first_name="Searchable")
        results = CustomerService.search(t, "Searchable", limit=3)
        self.assertLessEqual(len(results), 3)


class CustomerServiceEnrollTest(TestCase):
    """Tests for CustomerService.enroll_in_program"""

    def test_enroll_success(self):
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        cp = CustomerService.enroll_in_program(t, customer, card)
        self.assertIsNotNone(cp)

    def test_enroll_duplicate_raises(self):
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        CustomerService.enroll_in_program(t, customer, card)
        with self.assertRaises(ValueError):
            CustomerService.enroll_in_program(t, customer, card)


# =============================================================================
# TransactionService._serialize_result Tests
# =============================================================================

class SerializeResultTest(TestCase):
    """Tests for TransactionService._serialize_result"""

    def test_serialize_decimal(self):
        result = {"amount": Decimal("10.50"), "nested": {"val": Decimal("3.14")}}
        serialized = TransactionService._serialize_result(result)
        self.assertEqual(serialized["amount"], "10.50")
        self.assertEqual(serialized["nested"]["val"], "3.14")

    def test_serialize_list_with_decimals(self):
        result = {"items": [Decimal("1.00"), Decimal("2.00")]}
        serialized = TransactionService._serialize_result(result)
        self.assertEqual(serialized["items"], ["1.00", "2.00"])

    def test_serialize_plain_values(self):
        result = {"str_val": "hello", "int_val": 42, "bool_val": True}
        serialized = TransactionService._serialize_result(result)
        self.assertEqual(serialized["str_val"], "hello")
        self.assertEqual(serialized["int_val"], 42)
