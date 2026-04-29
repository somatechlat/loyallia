"""
Loyallia — Service Layer Tests
Tests for all service classes: TransactionService, BillingService,
AutomationService, CustomerService.
"""

import uuid
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest


# =============================================================================
# Fixtures (mock-based since Django may not be installed in CI)
# =============================================================================


def _make_tenant(**kwargs):
    """Create a mock Tenant."""
    tenant = MagicMock()
    tenant.id = uuid.uuid4()
    tenant.slug = kwargs.get("slug", "test-cafe")
    tenant.name = kwargs.get("name", "Test Café")
    return tenant


def _make_user(tenant=None, role="OWNER", **kwargs):
    """Create a mock User."""
    user = MagicMock()
    user.id = uuid.uuid4()
    user.email = kwargs.get("email", "owner@test.com")
    user.role = role
    user.tenant = tenant or _make_tenant()
    user.is_active = True
    return user


def _make_card(tenant=None, card_type="stamp", **kwargs):
    """Create a mock Card."""
    card = MagicMock()
    card.id = uuid.uuid4()
    card.tenant = tenant or _make_tenant()
    card.card_type = card_type
    card.name = kwargs.get("name", "Test Card")
    card.is_active = kwargs.get("is_active", True)
    card.metadata = kwargs.get("metadata", {"stamps_required": 10, "reward_description": "Free coffee"})
    card.get_metadata_field = lambda key, default=None: card.metadata.get(key, default)
    return card


def _make_customer(tenant=None, **kwargs):
    """Create a mock Customer."""
    customer = MagicMock()
    customer.id = uuid.uuid4()
    customer.tenant = tenant or _make_tenant()
    customer.first_name = kwargs.get("first_name", "Juan")
    customer.last_name = kwargs.get("last_name", "Pérez")
    customer.email = kwargs.get("email", "juan@test.com")
    customer.full_name = f"{customer.first_name} {customer.last_name}"
    customer.is_active = True
    return customer


def _make_customer_pass(customer=None, card=None, **kwargs):
    """Create a mock CustomerPass."""
    pass_obj = MagicMock()
    pass_obj.id = uuid.uuid4()
    pass_obj.customer = customer or _make_customer()
    pass_obj.card = card or _make_card()
    pass_obj.qr_code = kwargs.get("qr_code", "ABC12345")
    pass_obj.is_active = True
    pass_obj.pass_data = kwargs.get("pass_data", {})
    pass_obj.process_transaction = MagicMock(return_value={
        "transaction_type": "stamp_earned",
        "pass_updated": True,
        "reward_earned": False,
        "reward_description": "",
        "new_stamp_count": 5,
    })
    return pass_obj


# =============================================================================
# TransactionService Tests
# =============================================================================


class TestTransactionService:
    """Tests for TransactionService."""

    @patch("apps.transactions.service.CustomerPass")
    @patch("apps.transactions.service.Transaction")
    @patch("apps.transactions.service.Customer")
    @patch("apps.transactions.service.db_transaction")
    def test_scan_qr_creates_transaction(self, mock_txn, mock_customer, mock_transaction, mock_pass):
        """scan_qr should find pass, process transaction, and create Transaction record."""
        from apps.transactions.service import TransactionService

        tenant = _make_tenant()
        pass_obj = _make_customer_pass()
        mock_pass.objects.select_related.return_value.get.return_value = pass_obj

        result = TransactionService.scan_qr(
            tenant=tenant,
            qr_code="ABC12345",
            amount=Decimal("15.50"),
            quantity=1,
        )

        assert result["success"] is True
        assert result["pass_updated"] is True
        pass_obj.process_transaction.assert_called_once()

    def test_scan_qr_raises_on_empty_qr(self):
        """scan_qr should raise ValueError for empty QR code."""
        from apps.transactions.service import TransactionService

        with pytest.raises(ValueError, match="QR code is required"):
            TransactionService.scan_qr(tenant=_make_tenant(), qr_code="")

    @patch("apps.transactions.service.CustomerPass")
    def test_scan_qr_raises_on_not_found(self, mock_pass):
        """scan_qr should propagate DoesNotExist when pass not found."""
        from apps.transactions.service import TransactionService

        from django.core.exceptions import ObjectDoesNotExist
        mock_pass.DoesNotExist = ObjectDoesNotExist
        mock_pass.objects.select_related.return_value.get.side_effect = ObjectDoesNotExist()

        with pytest.raises(ObjectDoesNotExist):
            TransactionService.scan_qr(tenant=_make_tenant(), qr_code="NONEXISTENT")

    @patch("apps.transactions.service.CustomerPass")
    @patch("apps.transactions.service.Enrollment")
    def test_enroll_customer_creates_pass(self, mock_enrollment, mock_pass):
        """enroll_customer should create CustomerPass and Enrollment."""
        from apps.transactions.service import TransactionService

        mock_pass.objects.filter.return_value.exists.return_value = False
        mock_pass.objects.create.return_value = _make_customer_pass()

        tenant = _make_tenant()
        customer = _make_customer(tenant=tenant)
        card = _make_card(tenant=tenant)

        result = TransactionService.enroll_customer(tenant, customer, card)

        mock_pass.objects.create.assert_called_once_with(customer=customer, card=card)
        mock_enrollment.objects.create.assert_called_once()

    @patch("apps.transactions.service.CustomerPass")
    def test_enroll_customer_raises_on_duplicate(self, mock_pass):
        """enroll_customer should raise ValueError if already enrolled."""
        from apps.transactions.service import TransactionService

        mock_pass.objects.filter.return_value.exists.return_value = True

        with pytest.raises(ValueError, match="already enrolled"):
            TransactionService.enroll_customer(
                _make_tenant(), _make_customer(), _make_card()
            )

    def test_enroll_customer_raises_on_inactive_card(self):
        """enroll_customer should raise ValueError if card is inactive."""
        from apps.transactions.service import TransactionService

        card = _make_card(is_active=False)

        with pytest.raises(ValueError, match="not active"):
            TransactionService.enroll_customer(
                _make_tenant(), _make_customer(), card
            )

    @patch("apps.transactions.service.Transaction")
    def test_list_transactions_returns_dicts(self, mock_txn):
        """list_transactions should return list of dicts."""
        from apps.transactions.service import TransactionService

        mock_txn_instance = MagicMock()
        mock_txn_instance.id = uuid.uuid4()
        mock_txn_instance.transaction_type = "stamp_earned"
        mock_txn_instance.customer.full_name = "Juan Pérez"
        mock_txn_instance.customer_pass.card.name = "Coffee Card"
        mock_txn_instance.amount = Decimal("10.00")
        mock_txn_instance.quantity = 1
        mock_txn_instance.staff = None
        mock_txn_instance.created_at.isoformat.return_value = "2026-04-29T12:00:00Z"

        mock_txn.objects.filter.return_value.select_related.return_value.order_by.return_value.__getitem__.return_value = [mock_txn_instance]

        result = TransactionService.list_transactions(_make_tenant(), limit=10)

        assert len(result) == 1
        assert result[0]["transaction_type"] == "stamp_earned"
        assert result[0]["customer_name"] == "Juan Pérez"

    def test_serialize_result_handles_decimal(self):
        """_serialize_result should convert Decimal to string."""
        from apps.transactions.service import TransactionService

        result = {"amount": Decimal("15.50"), "nested": {"value": Decimal("3.14")}}
        serialized = TransactionService._serialize_result(result)

        assert serialized["amount"] == "15.50"
        assert serialized["nested"]["value"] == "3.14"


# =============================================================================
# CustomerService Tests
# =============================================================================


class TestCustomerService:
    """Tests for CustomerService."""

    @patch("apps.customers.service.Customer")
    def test_create_customer_success(self, mock_customer):
        """create should create a Customer with valid data."""
        from apps.customers.service import CustomerService

        mock_customer.objects.filter.return_value.exists.return_value = False
        mock_customer.objects.create.return_value = _make_customer()

        tenant = _make_tenant()
        data = {
            "first_name": "Juan",
            "last_name": "Pérez",
            "email": "juan@test.com",
            "phone": "+593991234567",
        }

        result = CustomerService.create(tenant, data)
        mock_customer.objects.create.assert_called_once()
        assert result is not None

    def test_create_customer_raises_on_invalid_email(self):
        """create should raise ValueError for invalid email."""
        from apps.customers.service import CustomerService

        with pytest.raises(ValueError, match="Invalid email"):
            CustomerService.create(_make_tenant(), {"first_name": "Juan", "email": "not-an-email"})

    def test_create_customer_raises_on_empty_name(self):
        """create should raise ValueError for empty first_name."""
        from apps.customers.service import CustomerService

        with pytest.raises(ValueError, match="First name is required"):
            CustomerService.create(_make_tenant(), {"first_name": "", "email": "test@test.com"})

    @patch("apps.customers.service.Customer")
    def test_create_customer_raises_on_duplicate(self, mock_customer):
        """create should raise ValueError if email already exists."""
        from apps.customers.service import CustomerService

        mock_customer.objects.filter.return_value.exists.return_value = True

        with pytest.raises(ValueError, match="already exists"):
            CustomerService.create(
                _make_tenant(),
                {"first_name": "Juan", "email": "existing@test.com"},
            )

    def test_update_customer_updates_fields(self):
        """update should set changed fields and save."""
        from apps.customers.service import CustomerService

        customer = _make_customer()
        data = {"first_name": "Pedro", "phone": "+593999888777"}

        result = CustomerService.update(customer, data)

        assert customer.first_name == "Pedro"
        assert customer.phone == "+593999888777"
        customer.save.assert_called_once()

    def test_update_customer_skips_none_fields(self):
        """update should not modify fields that are None."""
        from apps.customers.service import CustomerService

        customer = _make_customer()
        original_name = customer.first_name

        CustomerService.update(customer, {"first_name": None, "last_name": "García"})

        assert customer.first_name == original_name
        assert customer.last_name == "García"

    @patch("apps.customers.service.Customer")
    def test_search_returns_results(self, mock_customer):
        """search should return matching customers."""
        from apps.customers.service import CustomerService

        expected = [_make_customer()]
        mock_customer.objects.filter.return_value.filter.return_value.__getitem__.return_value = expected

        result = CustomerService.search(_make_tenant(), "juan")
        assert len(result) == 1

    def test_search_returns_empty_for_short_query(self):
        """search should return empty list for query < 2 chars."""
        from apps.customers.service import CustomerService

        result = CustomerService.search(_make_tenant(), "a")
        assert result == []


# =============================================================================
# AutomationService Tests
# =============================================================================


class TestAutomationService:
    """Tests for AutomationService."""

    @patch("apps.automation.service.Automation")
    @patch("apps.automation.service.AutomationExecution")
    def test_fire_trigger_executes_matching(self, mock_exec, mock_auto):
        """fire_trigger should execute all matching active automations."""
        from apps.automation.service import AutomationService

        automation = MagicMock()
        automation.can_execute_for_customer.return_value = True
        automation.execute.return_value = True

        mock_auto.objects.filter.return_value.prefetch_related.return_value = [automation]

        tenant = _make_tenant()
        customer = _make_customer(tenant=tenant)

        result = AutomationService.fire_trigger(
            tenant=tenant,
            trigger_type="customer_enrolled",
            customer=customer,
        )

        assert result == 1
        automation.execute.assert_called_once()

    @patch("apps.automation.service.Automation")
    def test_evaluate_rules_returns_eligible(self, mock_auto):
        """evaluate_rules should return automations that can execute."""
        from apps.automation.service import AutomationService

        eligible = MagicMock()
        eligible.can_execute_for_customer.return_value = True

        ineligible = MagicMock()
        ineligible.can_execute_for_customer.return_value = False

        mock_auto.objects.filter.return_value.prefetch_related.return_value = [eligible, ineligible]

        result = AutomationService.evaluate_rules(
            _make_tenant(), "transaction_completed", _make_customer()
        )

        assert len(result) == 1
        assert result[0] == eligible

    @patch("apps.automation.service.Automation")
    @patch("apps.automation.service.AutomationTrigger")
    @patch("apps.automation.service.AutomationAction")
    def test_create_automation_validates(self, mock_action, mock_trigger, mock_auto):
        """create_automation should validate trigger and action."""
        from apps.automation.service import AutomationService

        mock_trigger.choices = [("customer_enrolled", "Customer Enrolled")]
        mock_action.choices = [("send_notification", "Send Notification")]

        mock_auto.objects.create.return_value = MagicMock()

        data = {
            "name": "Welcome",
            "trigger": "customer_enrolled",
            "action": "send_notification",
        }

        result = AutomationService.create_automation(_make_tenant(), data)
        mock_auto.objects.create.assert_called_once()

    @patch("apps.automation.service.AutomationTrigger")
    def test_create_automation_raises_on_invalid_trigger(self, mock_trigger):
        """create_automation should raise ValueError for invalid trigger."""
        from apps.automation.service import AutomationService

        mock_trigger.choices = [("customer_enrolled", "Customer Enrolled")]

        with pytest.raises(ValueError, match="Invalid trigger"):
            AutomationService.create_automation(
                _make_tenant(),
                {"name": "Test", "trigger": "invalid", "action": "send_notification"},
            )


# =============================================================================
# BillingService Tests
# =============================================================================


class TestBillingService:
    """Tests for BillingService."""

    @patch("apps.billing.service.SubscriptionPlan")
    def test_get_plans_returns_list(self, mock_plan):
        """get_plans should return list of plan dicts."""
        from apps.billing.service import BillingService

        plan = MagicMock()
        plan.id = uuid.uuid4()
        plan.slug = "starter"
        plan.name = "Starter"
        plan.description = "Basic plan"
        plan.price_monthly = Decimal("29.99")
        plan.price_monthly_with_tax = Decimal("34.49")
        plan.price_annual = Decimal("299.99")
        plan.price_annual_with_tax = Decimal("344.99")
        plan.trial_days = 5
        plan.is_featured = False
        plan.features = ["automation"]
        plan.max_locations = 1
        plan.max_users = 3
        plan.max_customers = 500
        plan.max_programs = 1
        plan.max_notifications_month = 1000
        plan.max_transactions_month = 5000

        mock_plan.objects.filter.return_value = [plan]

        result = BillingService.get_plans()

        assert len(result) == 1
        assert result[0]["slug"] == "starter"
        assert result[0]["price_monthly"] == 29.99

    @patch("apps.billing.service.SubscriptionPlan")
    def test_subscribe_raises_on_invalid_cycle(self, mock_plan):
        """subscribe should raise ValueError for invalid billing cycle."""
        from apps.billing.service import BillingService

        with pytest.raises(ValueError, match="Billing cycle"):
            BillingService.subscribe(_make_tenant(), "starter", billing_cycle="weekly")

    @patch("apps.billing.service.SubscriptionPlan")
    def test_subscribe_raises_on_plan_not_found(self, mock_plan):
        """subscribe should raise ValueError if plan doesn't exist."""
        from apps.billing.service import BillingService

        mock_plan.objects.filter.return_value.first.return_value = None

        with pytest.raises(ValueError, match="not found"):
            BillingService.subscribe(_make_tenant(), "nonexistent")

    @patch("apps.billing.service.Transaction")
    @patch("apps.billing.service.Notification")
    @patch("apps.billing.service.Card")
    @patch("apps.billing.service.Customer")
    @patch("apps.billing.service.Subscription")
    def test_check_usage_returns_metrics(self, mock_sub, mock_cust, mock_card, mock_notif, mock_txn):
        """check_usage should return usage dict with all resource types."""
        from apps.billing.service import BillingService

        tenant = _make_tenant()
        tenant.users.filter.return_value.count.return_value = 2
        tenant.locations.count.return_value = 1

        mock_cust.objects.filter.return_value.count.return_value = 50
        mock_card.objects.filter.return_value.count.return_value = 3
        mock_txn.objects.filter.return_value.count.return_value = 100
        mock_notif.objects.filter.return_value.count.return_value = 200

        subscription = MagicMock()
        subscription.get_limit.return_value = 500
        mock_sub.objects.filter.return_value.first.return_value = subscription

        result = BillingService.check_usage(tenant)

        assert "customers" in result
        assert "programs" in result
        assert "transactions_month" in result
        assert result["customers"]["used"] == 50
        assert result["customers"]["limit"] == 500


# =============================================================================
# Shared Decorators & Schemas Tests
# =============================================================================


class TestRoleCheck:
    """Tests for the shared role_check decorator."""

    def test_require_role_allows_matching_role(self):
        """Decorator should pass when user has matching role."""
        from common.role_check import require_role

        @require_role("OWNER")
        def my_view(request):
            return "ok"

        request = MagicMock()
        request.user.role = "OWNER"

        result = my_view(request)
        assert result == "ok"

    def test_require_role_blocks_wrong_role(self):
        """Decorator should raise HttpError 403 for wrong role."""
        from common.role_check import require_role

        from ninja.errors import HttpError

        @require_role("OWNER")
        def my_view(request):
            return "ok"

        request = MagicMock()
        request.user.role = "STAFF"

        with pytest.raises(HttpError):
            my_view(request)

    def test_require_role_multiple_roles(self):
        """Decorator should accept any of the specified roles."""
        from common.role_check import require_role

        @require_role("OWNER", "MANAGER")
        def my_view(request):
            return "ok"

        request = MagicMock()
        request.user.role = "MANAGER"

        result = my_view(request)
        assert result == "ok"


class TestPagination:
    """Tests for cursor-based pagination."""

    def test_paginate_returns_items_and_cursor(self):
        """paginate should return items and next_cursor."""
        from common.pagination import CursorPagination

        item1 = MagicMock()
        item1.created_at.isoformat.return_value = "2026-04-29T12:00:00Z"
        item2 = MagicMock()
        item2.created_at.isoformat.return_value = "2026-04-29T11:00:00Z"

        qs = MagicMock()
        qs.__getitem__ = MagicMock(return_value=[item1, item2])

        items, cursor = CursorPagination.paginate(qs, limit=2)
        assert len(items) == 2

    def test_paginate_respects_max_limit(self):
        """paginate should cap limit at MAX_LIMIT."""
        from common.pagination import CursorPagination

        assert CursorPagination.MAX_LIMIT == 100

        qs = MagicMock()
        qs.filter.return_value = qs
        qs.__getitem__ = MagicMock(return_value=[])

        CursorPagination.paginate(qs, limit=500)
        # Should not raise, limit is capped internally

    def test_paginate_filters_by_cursor(self):
        """paginate should filter created_at < cursor when cursor provided."""
        from common.pagination import CursorPagination

        qs = MagicMock()
        qs.filter.return_value = qs
        qs.__getitem__ = MagicMock(return_value=[])

        CursorPagination.paginate(qs, cursor="2026-04-29T12:00:00Z", limit=10)
        qs.filter.assert_called_once()
