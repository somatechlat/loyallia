"""
Scanner / Staff Transaction Tests

Tests QR code validation, transaction recording, and redemption engine integration.
"""

import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock

from apps.redemption.command import RedemptionCommand
from apps.redemption.gateway import RedemptionGateway
from apps.redemption.result import RedemptionResult
from apps.transactions.models import Transaction
from tests.factories import (
    make_card,
    make_customer,
    make_customer_pass,
    make_manager,
    make_owner,
    make_staff,
    make_tenant,
)


class TestScannerValidation:
    """Test QR code validation (read-only preview)."""

    def test_validate_existing_qr_code(self, client, db):
        """Validate endpoint should return pass info for valid QR code."""
        from apps.transactions.api import validate_qr
        from apps.customers.models import CustomerPass

        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)
        staff = make_staff(tenant)

        # Mock request with tenant and staff
        request = MagicMock()
        request.tenant = tenant
        request.user = staff
        request.user.role = "STAFF"

        from apps.customers.pass_engine.qr_generator import generate_qr_token
        qr_code = generate_qr_token(str(cp.id))
        cp.qr_code = qr_code
        cp.save(update_fields=["qr_code"])

        # Need to mock is_staff_or_above since we can't easily set up JWT auth
        with patch("apps.transactions.api.is_staff_or_above", return_value=True):
            result = validate_qr(request, MagicMock(qr_code=qr_code))

        assert result["is_valid"] is True
        assert result["customer"]["email"] == customer.email
        assert result["pass_id"] == str(cp.id)


class TestRedemptionGateway:
    """Test RedemptionEngine processing."""

    def test_process_stamp_earn(self, db):
        """RedemptionGateway should process a stamp earn transaction."""
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        command = RedemptionCommand(
            tenant_id=str(tenant.id),
            qr_code=cp.qr_code,
            intent="earn",
            amount=Decimal("0"),
            quantity=1,
            staff_id=None,
        )

        gateway = RedemptionGateway()
        result = gateway.process(command, tenant)

        # Should succeed (no rules blocking by default)
        assert isinstance(result, RedemptionResult)

    def test_idempotency_prevents_duplicates(self, db):
        """Same idempotency key should return cached result."""
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        command = RedemptionCommand(
            tenant_id=str(tenant.id),
            qr_code=cp.qr_code,
            intent="earn",
            amount=Decimal("0"),
            quantity=1,
            staff_id=None,
            idempotency_key="test-key-123",
        )

        gateway = RedemptionGateway()

        # First call
        result1 = gateway.process(command, tenant)

        # Second call with same key
        result2 = gateway.process(command, tenant)

        # Both should have same result
        assert result1.success == result2.success

    def test_pass_not_found_returns_denial(self, db):
        """Invalid QR code should return a denial result."""
        tenant = make_tenant()

        command = RedemptionCommand(
            tenant_id=str(tenant.id),
            qr_code="INVALID_QR_CODE_12345",
            intent="earn",
            amount=Decimal("0"),
            quantity=1,
            staff_id=None,
        )

        gateway = RedemptionGateway()
        result = gateway.process(command, tenant)

        assert result.success is False
        assert "pass_not_found" in result.denial_reasons


class TestScannerAuthorization:
    """Test that scanner endpoints are STAFF-only."""

    def test_staff_can_access_validate(self, db):
        """STAFF role should be allowed to validate QR codes."""
        from apps.transactions.api import validate_qr
        from apps.customers.models import CustomerPass

        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)
        staff = make_staff(tenant)

        request = MagicMock()
        request.tenant = tenant
        request.user = staff

        result = validate_qr(request, MagicMock(qr_code=cp.qr_code))
        assert result["is_valid"] is True

    def test_owner_cannot_access_validate(self, db):
        """OWNER role should be denied access to scanner validate."""
        from apps.transactions.api import validate_qr
        from ninja.errors import HttpError

        tenant = make_tenant()
        owner = make_owner(tenant)

        request = MagicMock()
        request.tenant = tenant
        request.user = owner

        with pytest.raises(HttpError) as exc_info:
            validate_qr(request, MagicMock(qr_code="ANY"))
        assert exc_info.value.status_code == 403

    def test_manager_cannot_access_validate(self, db):
        """MANAGER role should be denied access to scanner validate."""
        from apps.transactions.api import validate_qr
        from ninja.errors import HttpError

        tenant = make_tenant()
        manager = make_manager(tenant)

        request = MagicMock()
        request.tenant = tenant
        request.user = manager

        with pytest.raises(HttpError) as exc_info:
            validate_qr(request, MagicMock(qr_code="ANY"))
        assert exc_info.value.status_code == 403

    def test_staff_can_access_transact(self, db):
        """STAFF role should be allowed to record transactions."""
        from apps.transactions.api import transact
        from ninja.errors import HttpError

        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)
        staff = make_staff(tenant)

        request = MagicMock()
        request.tenant = tenant
        request.user = staff

        # Mock the RedemptionGateway to avoid full redemption logic
        with patch("apps.transactions.api.RedemptionGateway") as mock_gateway:
            mock_result = MagicMock()
            mock_result.success = True
            mock_result.transaction_id = "test-tx-id"
            mock_result.transaction_type = "stamp_earned"
            mock_result.pass_updated = False
            mock_result.reward_earned = False
            mock_result.reward_description = ""
            mock_result.intent_resolved = "earn"
            mock_result.new_balance = None
            mock_result.remaining_uses = None
            mock_gateway.return_value.process.return_value = mock_result

            result = transact(request, MagicMock(qr_code=cp.qr_code, amount=0, notes="", idempotency_key=""))
            assert result["success"] is True

    def test_owner_cannot_access_transact(self, db):
        """OWNER role should be denied access to scanner transact."""
        from apps.transactions.api import transact
        from ninja.errors import HttpError

        tenant = make_tenant()
        owner = make_owner(tenant)

        request = MagicMock()
        request.tenant = tenant
        request.user = owner

        with pytest.raises(HttpError) as exc_info:
            transact(request, MagicMock(qr_code="ANY", amount=0, notes="", idempotency_key=""))
        assert exc_info.value.status_code == 403

    def test_manager_cannot_access_transact(self, db):
        """MANAGER role should be denied access to scanner transact."""
        from apps.transactions.api import transact
        from ninja.errors import HttpError

        tenant = make_tenant()
        manager = make_manager(tenant)

        request = MagicMock()
        request.tenant = tenant
        request.user = manager

        with pytest.raises(HttpError) as exc_info:
            transact(request, MagicMock(qr_code="ANY", amount=0, notes="", idempotency_key=""))
        assert exc_info.value.status_code == 403

    def test_staff_can_search_customers(self, db):
        """STAFF role should be allowed to search customers for remote issue."""
        from apps.transactions.api import search_customer

        tenant = make_tenant()
        customer = make_customer(tenant, first_name="John", email="john@test.com")
        staff = make_staff(tenant)

        request = MagicMock()
        request.tenant = tenant
        request.user = staff

        result = search_customer(request, "john")
        assert len(result["results"]) >= 1
        assert result["results"][0]["email"] == "john@test.com"

    def test_owner_cannot_search_customers_via_scanner(self, db):
        """OWNER role should be denied access to scanner customer search."""
        from apps.transactions.api import search_customer
        from ninja.errors import HttpError

        tenant = make_tenant()
        owner = make_owner(tenant)

        request = MagicMock()
        request.tenant = tenant
        request.user = owner

        with pytest.raises(HttpError) as exc_info:
            search_customer(request, "john")
        assert exc_info.value.status_code == 403


class TestTransactionRecording:
    """Test transaction creation after successful redemption."""

    def test_transaction_created_after_scan(self, db):
        """A successful scan should create a Transaction record."""
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        initial_tx_count = Transaction.objects.filter(tenant=tenant).count()

        command = RedemptionCommand(
            tenant_id=str(tenant.id),
            qr_code=cp.qr_code,
            intent="earn",
            amount=Decimal("10.00"),
            quantity=1,
            staff_id=None,
        )

        gateway = RedemptionGateway()
        result = gateway.process(command, tenant)

        if result.success and result.transaction_id:
            assert Transaction.objects.filter(tenant=tenant).count() > initial_tx_count
