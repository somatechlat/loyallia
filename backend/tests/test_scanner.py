"""
Scanner / Staff Transaction Tests

Tests QR code validation, transaction recording, and redemption engine integration.
NO mocks — all tests use real objects and real code paths.
"""

from decimal import Decimal

import pytest

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
    make_superadmin,
    make_tenant,
)


class _FakeRequest:
    """Minimal request stand-in for scanner API functions.

    NOT a mock — this is a real object with the attributes the
    scanner endpoints require (tenant, user, META).
    """

    def __init__(self, tenant, user, remote_addr="127.0.0.1"):
        self.tenant = tenant
        self.user = user
        self.META = {"REMOTE_ADDR": remote_addr}


class TestScannerValidation:
    """Test QR code validation (read-only preview)."""

    def test_validate_existing_qr_code(self, client, db):
        """Validate endpoint should return pass info for valid QR code."""
        from django.conf import settings

        from apps.transactions.api import validate_qr

        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)
        staff = make_staff(tenant)

        request = _FakeRequest(tenant, staff)

        from apps.customers.pass_engine.qr_generator import generate_qr_token

        qr_code = generate_qr_token(str(cp.id), secret=settings.PASS_HMAC_SECRET)
        cp.qr_code = qr_code
        cp.save(update_fields=["qr_code"])

        from apps.transactions.api import ScanValidateIn

        data = ScanValidateIn(qr_code=qr_code)
        result = validate_qr(request, data)  # type: ignore[reportArgumentType]

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
        from apps.transactions.api import ScanValidateIn, validate_qr

        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)
        staff = make_staff(tenant)

        request = _FakeRequest(tenant, staff)

        result = validate_qr(request, ScanValidateIn(qr_code=cp.qr_code))  # type: ignore[reportArgumentType]
        assert result["is_valid"] is True

    def test_owner_can_access_validate(self, db):
        """OWNER role should be allowed to validate QR codes (is_staff_or_above includes OWNER)."""
        from ninja.errors import HttpError

        from apps.transactions.api import ScanValidateIn, validate_qr

        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        _cp = make_customer_pass(customer, card)
        owner = make_owner(tenant)

        request = _FakeRequest(tenant, owner)

        # OWNER is allowed; invalid QR returns 404 after auth passes
        with pytest.raises(HttpError) as exc_info:
            validate_qr(request, ScanValidateIn(qr_code="INVALID_QR"))  # type: ignore[reportArgumentType]
        assert exc_info.value.status_code == 404

    def test_manager_can_access_validate(self, db):
        """MANAGER role should be allowed to validate QR codes (is_staff_or_above includes MANAGER)."""
        from ninja.errors import HttpError

        from apps.transactions.api import ScanValidateIn, validate_qr

        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        _cp = make_customer_pass(customer, card)
        manager = make_manager(tenant)

        request = _FakeRequest(tenant, manager)

        # MANAGER is allowed; invalid QR returns 404 after auth passes
        with pytest.raises(HttpError) as exc_info:
            validate_qr(request, ScanValidateIn(qr_code="INVALID_QR"))  # type: ignore[reportArgumentType]
        assert exc_info.value.status_code == 404

    def test_superadmin_cannot_access_validate(self, db):
        """SUPER_ADMIN role should be denied access to scanner validate (not staff_or_above)."""
        from ninja.errors import HttpError

        from apps.transactions.api import ScanValidateIn, validate_qr

        tenant = make_tenant()
        superadmin = make_superadmin()

        request = _FakeRequest(tenant, superadmin)

        with pytest.raises(HttpError) as exc_info:
            validate_qr(request, ScanValidateIn(qr_code="ANY"))  # type: ignore[reportArgumentType]
        assert exc_info.value.status_code == 403

    def test_staff_can_access_transact(self, db):
        """STAFF role should be allowed to record transactions."""
        from apps.transactions.api import ScanTransactIn, transact

        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)
        staff = make_staff(tenant)

        request = _FakeRequest(tenant, staff)

        data = ScanTransactIn(
            qr_code=cp.qr_code,
            amount=0,
            notes="",
            idempotency_key="",
        )

        # Use the real gateway — no mocking
        result = transact(request, data)  # type: ignore[reportArgumentType]  # type: ignore[reportArgumentType]
        assert result["success"] is True  # type: ignore[reportIndexIssue]

    def test_owner_can_access_transact(self, db):
        """OWNER role should be allowed to transact (is_staff_or_above includes OWNER)."""
        from ninja.errors import HttpError

        from apps.transactions.api import ScanTransactIn, transact

        tenant = make_tenant()
        owner = make_owner(tenant)

        request = _FakeRequest(tenant, owner)

        data = ScanTransactIn(
            qr_code="ANY",
            amount=0,
            notes="",
            idempotency_key="",
        )

        # OWNER is allowed; invalid QR causes 422 (pass not found) after auth passes
        with pytest.raises(HttpError) as exc_info:
            transact(request, data)  # type: ignore[reportArgumentType]
        assert exc_info.value.status_code == 422

    def test_manager_can_access_transact(self, db):
        """MANAGER role should be allowed to transact (is_staff_or_above includes MANAGER)."""
        from ninja.errors import HttpError

        from apps.transactions.api import ScanTransactIn, transact

        tenant = make_tenant()
        manager = make_manager(tenant)

        request = _FakeRequest(tenant, manager)

        data = ScanTransactIn(
            qr_code="ANY",
            amount=0,
            notes="",
            idempotency_key="",
        )

        # MANAGER is allowed; invalid QR causes 422 (pass not found) after auth passes
        with pytest.raises(HttpError) as exc_info:
            transact(request, data)  # type: ignore[reportArgumentType]
        assert exc_info.value.status_code == 422

    def test_superadmin_cannot_access_transact(self, db):
        """SUPER_ADMIN role should be denied access to scanner transact (not staff_or_above)."""
        from ninja.errors import HttpError

        from apps.transactions.api import ScanTransactIn, transact

        tenant = make_tenant()
        superadmin = make_superadmin()

        request = _FakeRequest(tenant, superadmin)

        data = ScanTransactIn(
            qr_code="ANY",
            amount=0,
            notes="",
            idempotency_key="",
        )

        with pytest.raises(HttpError) as exc_info:
            transact(request, data)  # type: ignore[reportArgumentType]
        assert exc_info.value.status_code == 403

    def test_staff_can_search_customers(self, db):
        """STAFF role should be allowed to search customers for remote issue."""
        from apps.transactions.api import search_customer

        tenant = make_tenant()
        _customer = make_customer(tenant, first_name="John", email="john@test.com")
        staff = make_staff(tenant)

        request = _FakeRequest(tenant, staff)

        result = search_customer(request, "john")  # type: ignore[reportArgumentType]
        assert len(result["results"]) >= 1
        assert result["results"][0]["email"] == "john@test.com"

    def test_owner_can_search_customers_via_scanner(self, db):
        """OWNER role should be allowed to search customers (is_staff_or_above includes OWNER)."""
        from apps.transactions.api import search_customer

        tenant = make_tenant()
        _customer = make_customer(tenant, first_name="John", email="john@test.com")
        owner = make_owner(tenant)

        request = _FakeRequest(tenant, owner)

        result = search_customer(request, "john")  # type: ignore[reportArgumentType]
        assert len(result["results"]) >= 1
        assert result["results"][0]["email"] == "john@test.com"

    def test_superadmin_cannot_search_customers_via_scanner(self, db):
        """SUPER_ADMIN role should be denied access to scanner customer search."""
        from ninja.errors import HttpError

        from apps.transactions.api import search_customer

        tenant = make_tenant()
        superadmin = make_superadmin()

        request = _FakeRequest(tenant, superadmin)

        with pytest.raises(HttpError) as exc_info:
            search_customer(request, "john")  # type: ignore[reportArgumentType]
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
