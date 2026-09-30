"""
Scanner & Redemption Role/Permission Matrix Tests

Locks the operational scanner matrix:
  - every device-holding role (STAFF, MANAGER, OWNER, SUPER_ADMIN) can validate
    and transact on both v1 and v2 scanner APIs (never 403);
  - transaction history stays MANAGER+;
  - program design stays OWNER+ (SUPER_ADMIN admitted as platform operator);
  - card.redemption_rules.allowed_staff_roles remains an optional owner-set
    restriction with fixed empty / validate / SUPER_ADMIN semantics;
  - SUPER_ADMIN can redeem all 10 card types through the gateway.

NO mocks — real factories, real JWT auth, real gateway, real DB.
"""

import json
from decimal import Decimal

import pytest
from django.test import Client
from django.utils import timezone

from apps.authentication.models import UserRole
from apps.authentication.tokens import create_access_token
from apps.cards.models import CardType
from apps.redemption.command import RedemptionCommand
from apps.redemption.context import RedemptionContext
from apps.redemption.gateway import RedemptionGateway
from apps.redemption.rules import StaffRoleValidator
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

ALL_ROLES = tuple(UserRole.values)

VALIDATE_PATHS = (
    "/api/v1/scanner/validate/",
    "/api/v1/scanner/v2/validate/",
)
TRANSACT_PATHS = (
    "/api/v1/scanner/transact/",
    "/api/v1/scanner/v2/transact/",
)


def _header(user) -> dict:
    """Real JWT bearer header for the given user."""
    token = create_access_token(
        str(user.id),
        str(user.tenant_id) if user.tenant_id else None,
        user.role,
    )
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


def _make_role_user(role: str, tenant):
    factories = {
        UserRole.STAFF.value: make_staff,
        UserRole.MANAGER.value: make_manager,
        UserRole.OWNER.value: make_owner,
        UserRole.SUPER_ADMIN.value: make_superadmin,
    }
    # SUPER_ADMIN is platform-level; attach the tenant as an impersonation
    # context so tenant-scoped scanner queries resolve (the permission gate
    # itself admits SUPER_ADMIN with or without a tenant).
    return factories[role](tenant=tenant)


def _make_scan_stack(tenant):
    card = make_card(tenant)
    customer = make_customer(tenant)
    customer_pass = make_customer_pass(customer, card)
    return card, customer, customer_pass


def _context(tenant, card, customer_pass, staff_id, intent="redeem"):
    return RedemptionContext(
        tenant=tenant,
        customer_pass=customer_pass,
        card=card,
        amount=Decimal("0"),
        quantity=1,
        staff_id=staff_id,
        location_id=None,
        scanned_at=timezone.now(),
        intent=intent,
    )


class TestScannerNeverForbidden:
    """Every role that can hold a device can validate and transact (v1 + v2)."""

    @pytest.mark.parametrize("role", ALL_ROLES)
    @pytest.mark.parametrize("path", VALIDATE_PATHS)
    def test_validate_not_403(self, db, role, path):
        tenant = make_tenant()
        _card, _customer, customer_pass = _make_scan_stack(tenant)
        user = _make_role_user(role, tenant)

        resp = Client().post(
            path,
            data=json.dumps({"qr_code": customer_pass.qr_code}),
            content_type="application/json",
            **_header(user),
        )
        assert resp.status_code != 403, f"{role} got 403 on {path}"
        assert resp.status_code == 200, f"{role} got {resp.status_code} on {path}"
        assert resp.json()["is_valid"] is True

    @pytest.mark.parametrize("role", ALL_ROLES)
    @pytest.mark.parametrize("path", TRANSACT_PATHS)
    def test_transact_not_403(self, db, role, path):
        tenant = make_tenant()
        _card, _customer, customer_pass = _make_scan_stack(tenant)
        user = _make_role_user(role, tenant)

        resp = Client().post(
            path,
            data=json.dumps(
                {
                    "qr_code": customer_pass.qr_code,
                    "amount": 10,
                    "quantity": 1,
                    "intent": "earn",
                    "idempotency_key": f"perm-matrix-{role}-{path}",
                }
            ),
            content_type="application/json",
            **_header(user),
        )
        assert resp.status_code != 403, f"{role} got 403 on {path}"
        assert resp.status_code in (200, 422), (
            f"{role} got {resp.status_code} on {path}"
        )


class TestTransactionHistoryGate:
    """List / detail transactions is MANAGER+ (SUPER_ADMIN included)."""

    def test_staff_cannot_list_transactions(self, db):
        tenant = make_tenant()
        user = make_staff(tenant=tenant)
        resp = Client().get("/api/v1/transactions/", **_header(user))
        assert resp.status_code == 403

    @pytest.mark.parametrize(
        "role",
        (UserRole.MANAGER.value, UserRole.OWNER.value, UserRole.SUPER_ADMIN.value),
    )
    def test_manager_plus_can_list_transactions(self, db, role):
        tenant = make_tenant()
        user = _make_role_user(role, tenant)
        resp = Client().get("/api/v1/transactions/", **_header(user))
        assert resp.status_code == 200
        assert "transactions" in resp.json()

    def test_staff_cannot_read_transaction_detail(self, db):
        tenant = make_tenant()
        user = make_staff(tenant=tenant)
        resp = Client().get(
            "/api/v1/transactions/00000000-0000-0000-0000-000000000001/",
            **_header(user),
        )
        assert resp.status_code == 403


class TestProgramDesignGate:
    """Program update is OWNER+ (SUPER_ADMIN admitted)."""

    def test_manager_cannot_update_program(self, db):
        tenant = make_tenant()
        card = make_card(tenant)
        user = make_manager(tenant=tenant)
        resp = Client().patch(
            f"/api/v1/programs/{card.id}/",
            data=json.dumps({"name": "Blocked rename"}),
            content_type="application/json",
            **_header(user),
        )
        assert resp.status_code == 403

    @pytest.mark.parametrize(
        "role", (UserRole.OWNER.value, UserRole.SUPER_ADMIN.value)
    )
    def test_owner_and_superadmin_can_update_program(self, db, role):
        tenant = make_tenant()
        card = make_card(tenant)
        user = _make_role_user(role, tenant)
        resp = Client().patch(
            f"/api/v1/programs/{card.id}/",
            data=json.dumps({"name": "Allowed rename"}),
            content_type="application/json",
            **_header(user),
        )
        assert resp.status_code == 200, resp.content
        assert resp.json()["name"] == "Allowed rename"


class TestPermissionHelpers:
    """Direct role-helper coverage (includes SUPER_ADMIN admission)."""

    def test_scanner_operator_admits_all_four_roles(self, db):
        from common.permissions import is_scanner_operator

        tenant = make_tenant()
        for role in ALL_ROLES:
            user = _make_role_user(role, tenant)
            request = type("R", (), {"user": user, "tenant": tenant, "META": {}})()
            assert is_scanner_operator(request) is True, role

    def test_manager_or_owner_admits_superadmin(self, db):
        from common.permissions import is_manager_or_owner

        tenant = make_tenant()
        user = make_superadmin(tenant=tenant)
        request = type("R", (), {"user": user, "tenant": tenant, "META": {}})()
        assert is_manager_or_owner(request) is True

    def test_owner_admits_superadmin(self, db):
        from common.permissions import is_owner

        tenant = make_tenant()
        user = make_superadmin(tenant=tenant)
        request = type("R", (), {"user": user, "tenant": tenant, "META": {}})()
        assert is_owner(request) is True

    def test_staff_is_not_owner(self, db):
        from common.permissions import is_owner

        tenant = make_tenant()
        user = make_staff(tenant=tenant)
        request = type("R", (), {"user": user, "tenant": tenant, "META": {}})()
        assert is_owner(request) is False


class TestStaffRoleValidator:
    """Optional card.redemption_rules.allowed_staff_roles semantics."""

    def test_absent_allows(self, db):
        tenant = make_tenant()
        card, _customer, customer_pass = _make_scan_stack(tenant)
        staff = make_staff(tenant=tenant)
        violations = StaffRoleValidator().validate(
            _context(tenant, card, customer_pass, str(staff.id)), {}
        )
        assert violations == []

    def test_none_allows(self, db):
        tenant = make_tenant()
        card, _customer, customer_pass = _make_scan_stack(tenant)
        staff = make_staff(tenant=tenant)
        violations = StaffRoleValidator().validate(
            _context(tenant, card, customer_pass, str(staff.id)),
            {"allowed_staff_roles": None},
        )
        assert violations == []

    def test_empty_list_allows(self, db):
        tenant = make_tenant()
        card, _customer, customer_pass = _make_scan_stack(tenant)
        staff = make_staff(tenant=tenant)
        violations = StaffRoleValidator().validate(
            _context(tenant, card, customer_pass, str(staff.id)),
            {"allowed_staff_roles": []},
        )
        assert violations == []

    def test_non_list_allows(self, db):
        tenant = make_tenant()
        card, _customer, customer_pass = _make_scan_stack(tenant)
        staff = make_staff(tenant=tenant)
        violations = StaffRoleValidator().validate(
            _context(tenant, card, customer_pass, str(staff.id)),
            {"allowed_staff_roles": UserRole.STAFF.value},
        )
        assert violations == []

    def test_uppercase_allows_staff_denies_manager(self, db):
        tenant = make_tenant()
        card, _customer, customer_pass = _make_scan_stack(tenant)
        staff = make_staff(tenant=tenant)
        manager = make_manager(tenant=tenant)
        rules = {"allowed_staff_roles": [UserRole.STAFF.value]}

        assert (
            StaffRoleValidator().validate(
                _context(tenant, card, customer_pass, str(staff.id)), rules
            )
            == []
        )
        violations = StaffRoleValidator().validate(
            _context(tenant, card, customer_pass, str(manager.id)), rules
        )
        assert len(violations) == 1
        assert violations[0].rule_code == "allowed_staff_roles"

    def test_lowercase_staff_allows_staff(self, db):
        tenant = make_tenant()
        card, _customer, customer_pass = _make_scan_stack(tenant)
        staff = make_staff(tenant=tenant)
        violations = StaffRoleValidator().validate(
            _context(tenant, card, customer_pass, str(staff.id)),
            {"allowed_staff_roles": [UserRole.STAFF.value.lower()]},
        )
        assert violations == []

    def test_spanish_label_personal_allows_staff(self, db):
        """Spanish UI label 'Personal' must not silently deny everyone."""
        tenant = make_tenant()
        card, _customer, customer_pass = _make_scan_stack(tenant)
        staff = make_staff(tenant=tenant)
        manager = make_manager(tenant=tenant)
        rules = {"allowed_staff_roles": ["Personal"]}

        assert (
            StaffRoleValidator().validate(
                _context(tenant, card, customer_pass, str(staff.id)), rules
            )
            == []
        )
        # Manager is outside the normalized set — denied, not everyone denied.
        violations = StaffRoleValidator().validate(
            _context(tenant, card, customer_pass, str(manager.id)), rules
        )
        assert len(violations) == 1
        assert violations[0].rule_code == "allowed_staff_roles"

    def test_unknown_labels_do_not_deny_everyone(self, db):
        tenant = make_tenant()
        card, _customer, customer_pass = _make_scan_stack(tenant)
        staff = make_staff(tenant=tenant)
        violations = StaffRoleValidator().validate(
            _context(tenant, card, customer_pass, str(staff.id)),
            {"allowed_staff_roles": ["Empleado", "Nivel X"]},
        )
        assert violations == []

    def test_validate_intent_always_allows(self, db):
        tenant = make_tenant()
        card, _customer, customer_pass = _make_scan_stack(tenant)
        manager = make_manager(tenant=tenant)
        violations = StaffRoleValidator().validate(
            _context(
                tenant, card, customer_pass, str(manager.id), intent="validate"
            ),
            {"allowed_staff_roles": [UserRole.STAFF.value]},
        )
        assert violations == []

    def test_superadmin_always_allows(self, db):
        tenant = make_tenant()
        card, _customer, customer_pass = _make_scan_stack(tenant)
        admin = make_superadmin(tenant=tenant)
        violations = StaffRoleValidator().validate(
            _context(tenant, card, customer_pass, str(admin.id)),
            {"allowed_staff_roles": [UserRole.STAFF.value]},
        )
        assert violations == []

    def test_missing_staff_id_denies_when_restricted(self, db):
        tenant = make_tenant()
        card, _customer, customer_pass = _make_scan_stack(tenant)
        violations = StaffRoleValidator().validate(
            _context(tenant, card, customer_pass, None),
            {"allowed_staff_roles": [UserRole.STAFF.value]},
        )
        assert len(violations) == 1
        assert violations[0].rule_code == "allowed_staff_roles"

    def test_unknown_staff_id_denies_when_restricted(self, db):
        tenant = make_tenant()
        card, _customer, customer_pass = _make_scan_stack(tenant)
        violations = StaffRoleValidator().validate(
            _context(
                tenant,
                card,
                customer_pass,
                "00000000-0000-0000-0000-000000000099",
            ),
            {"allowed_staff_roles": [UserRole.STAFF.value]},
        )
        assert len(violations) == 1
        assert violations[0].rule_code == "allowed_staff_roles"


class TestSuperAdminAllCardTypes:
    """SUPER_ADMIN can redeem every card type through the gateway."""

    def test_superadmin_redeems_all_ten_card_types(self, db):
        tenant = make_tenant()
        admin = make_superadmin(tenant=tenant)
        gateway = RedemptionGateway()

        for card_type in CardType.values:
            card = make_card(tenant, card_type=card_type)
            # Restrict to OWNER — SUPER_ADMIN must still bypass.
            card.redemption_rules = {"allowed_staff_roles": [UserRole.OWNER.value]}
            card.save(update_fields=["redemption_rules", "updated_at"])
            customer = make_customer(tenant)
            customer_pass = make_customer_pass(customer, card)

            command = RedemptionCommand(
                tenant_id=str(tenant.id),
                qr_code=customer_pass.qr_code,
                intent="auto",
                amount=Decimal("25.00"),
                quantity=1,
                staff_id=str(admin.id),
            )
            result = gateway.process(command, tenant)
            assert "staff_role_denied" not in result.denial_reasons, (
                f"{card_type}: {result.denial_reasons}"
            )

    def test_staff_is_denied_when_roles_restricted(self, db):
        """Control: the optional restriction still bites non-allowed roles."""
        tenant = make_tenant()
        staff = make_staff(tenant=tenant)
        card = make_card(tenant)
        card.redemption_rules = {"allowed_staff_roles": [UserRole.OWNER.value]}
        card.save(update_fields=["redemption_rules", "updated_at"])
        customer = make_customer(tenant)
        customer_pass = make_customer_pass(customer, card)

        command = RedemptionCommand(
            tenant_id=str(tenant.id),
            qr_code=customer_pass.qr_code,
            intent="earn",
            amount=Decimal("0"),
            quantity=1,
            staff_id=str(staff.id),
        )
        result = RedemptionGateway().process(command, tenant)
        assert result.success is False
        assert "staff_role_denied" in result.denial_reasons
        assert UserRole(staff.role) is UserRole.STAFF
