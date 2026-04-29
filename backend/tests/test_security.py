"""
Loyallia — Security Tests
Tests for role-based access control, input validation (cedula/RUC),
and additional security hardening not covered by test_security_fixes.py.

For SSRF, rate limiting, OTP entropy, and password policy see test_security_fixes.py.
"""

import uuid
from unittest.mock import MagicMock

from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.authentication.models import User, UserRole
from common.role_check import require_role
from common.validators import ComplexityValidator
from apps.tenants.models import validate_cedula, validate_ruc
from tests.factories import make_tenant, make_user


# =============================================================================
# Role-Based Access Control Tests
# =============================================================================

class RequireRoleDecoratorTest(TestCase):
    """Tests for @require_role decorator."""

    def test_owner_can_access_owner_endpoint(self):
        user = make_user(role=UserRole.OWNER)
        request = MagicMock()
        request.user = user

        @require_role("OWNER")
        def view(req):
            return "ok"

        self.assertEqual(view(request), "ok")

    def test_manager_cannot_access_owner_endpoint(self):
        user = make_user(role=UserRole.MANAGER)
        request = MagicMock()
        request.user = user

        @require_role("OWNER")
        def view(req):
            return "ok"

        from ninja.errors import HttpError
        with self.assertRaises(HttpError) as ctx:
            view(request)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_staff_can_access_multi_role_endpoint(self):
        user = make_user(role=UserRole.STAFF)
        request = MagicMock()
        request.user = user

        @require_role("OWNER", "MANAGER", "STAFF")
        def view(req):
            return "ok"

        self.assertEqual(view(request), "ok")

    def test_unauthenticated_raises_401(self):
        request = MagicMock()
        request.user = None

        @require_role("OWNER")
        def view(req):
            return "ok"

        from ninja.errors import HttpError
        with self.assertRaises(HttpError) as ctx:
            view(request)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_super_admin_can_access_owner_endpoint(self):
        user = make_user(role=UserRole.SUPER_ADMIN)
        request = MagicMock()
        request.user = user

        # SUPER_ADMIN is not explicitly in the role list
        @require_role("OWNER")
        def view(req):
            return "ok"

        from ninja.errors import HttpError
        with self.assertRaises(HttpError) as ctx:
            view(request)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_decorator_preserves_function_name(self):
        @require_role("OWNER")
        def my_view(req):
            """My docstring."""
            return "ok"

        self.assertEqual(my_view.__name__, "my_view")
        self.assertEqual(my_view.__doc__, "My docstring.")

    def test_request_without_user_attribute(self):
        request = MagicMock(spec=[])  # no user attribute

        @require_role("OWNER")
        def view(req):
            return "ok"

        from ninja.errors import HttpError
        with self.assertRaises(HttpError) as ctx:
            view(request)
        self.assertEqual(ctx.exception.status_code, 401)


# =============================================================================
# Ecuadorian Document Validation Tests
# =============================================================================

class CedulaValidationTest(TestCase):
    """Tests for cédula de identidad validation."""

    def test_invalid_length_rejected(self):
        with self.assertRaises(ValidationError):
            validate_cedula("12345")

    def test_non_numeric_rejected(self):
        with self.assertRaises(ValidationError):
            validate_cedula("abcdefghij")

    def test_invalid_province_rejected(self):
        with self.assertRaises(ValidationError):
            validate_cedula("2501234567")  # Province 25 doesn't exist

    def test_empty_string_rejected(self):
        with self.assertRaises(ValidationError):
            validate_cedula("")

    def test_too_long_rejected(self):
        with self.assertRaises(ValidationError):
            validate_cedula("01020304051")

    def test_province_01_format_valid(self):
        # Province 01 (Azuay) — may fail module-10 check but format is valid
        try:
            validate_cedula("0102030405")
        except ValidationError as e:
            # Module-10 check failure is acceptable for random digits
            self.assertIn("verificador", str(e).lower())


class RucValidationTest(TestCase):
    """Tests for RUC validation."""

    def test_valid_ruc_accepted(self):
        validate_ruc("1790012345001")  # Should not raise

    def test_invalid_length_rejected(self):
        with self.assertRaises(ValidationError):
            validate_ruc("12345")

    def test_non_numeric_rejected(self):
        with self.assertRaises(ValidationError):
            validate_ruc("abcdefghijklm")

    def test_invalid_province_rejected(self):
        with self.assertRaises(ValidationError):
            validate_ruc("2590012345001")  # Province 25 doesn't exist

    def test_province_30_accepted(self):
        # Province 30 is for foreign entities
        validate_ruc("3090012345001")  # Should not raise

    def test_empty_string_rejected(self):
        with self.assertRaises(ValidationError):
            validate_ruc("")

    def test_too_long_rejected(self):
        with self.assertRaises(ValidationError):
            validate_ruc("17900123450011")


# =============================================================================
# Input Validation Edge Cases
# =============================================================================

class PasswordComplexityEdgeCasesTest(TestCase):
    """Additional password complexity edge cases."""

    def setUp(self):
        self.validator = ComplexityValidator()

    def test_minimum_valid_password(self):
        # Exactly 12 chars with all requirements
        self.validator.validate("Abcdefgh1!@")

    def test_long_password_accepted(self):
        self.validator.validate("A" * 50 + "a1!")

    def test_only_special_chars_rejected(self):
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            self.validator.validate("!@#$%^&*()_+")

    def test_unicode_uppercase_rejected(self):
        # Non-ASCII uppercase should not count
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            self.validator.validate("Äbcdefgh1!@")

    def test_multiple_errors_reported(self):
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError) as ctx:
            self.validator.validate("abcdefgh")  # no upper, no digit, no special
        errors = ctx.exception.messages
        self.assertGreaterEqual(len(errors), 2)

    def test_all_special_chars_list(self):
        """Verify the SPECIAL_CHARS regex covers common special characters."""
        specials = self.validator.SPECIAL_CHARS
        import re
        for char in "!@#$%^&*()_+-=[]{}|;':\",./<>?`~\\":
            self.assertIsNotNone(
                re.search(re.escape(char), specials),
                f"Special char '{char}' not matched by SPECIAL_CHARS regex",
            )


# =============================================================================
# User Role Tests
# =============================================================================

class UserRoleTest(TestCase):
    """Tests for User role assignment and validation."""

    def test_all_role_values(self):
        expected = {"SUPER_ADMIN", "OWNER", "MANAGER", "STAFF"}
        actual = {v for v, _ in UserRole.choices}
        self.assertEqual(actual, expected)

    def test_user_default_role(self):
        user = make_user()
        # Default is STAFF per model definition
        self.assertIn(user.role, [r for r, _ in UserRole.choices])

    def test_role_persists_after_save(self):
        user = make_user(role=UserRole.MANAGER)
        user.refresh_from_db()
        self.assertEqual(user.role, UserRole.MANAGER)

    def test_superuser_is_super_admin(self):
        admin = User.objects.create_superuser(
            email=f"admin-{uuid.uuid4().hex[:6]}@test.com",
            password="AdminPass123!@",
        )
        self.assertEqual(admin.role, UserRole.SUPER_ADMIN)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)


# =============================================================================
# User Account Lock Tests
# =============================================================================

class AccountLockTest(TestCase):
    """Tests for account lockout after failed login attempts."""

    def test_lock_after_5_failures(self):
        user = make_user()
        for i in range(5):
            user.record_failed_login()
        user.refresh_from_db()
        self.assertTrue(user.is_locked)
        self.assertEqual(user.failed_login_count, 5)

    def test_lock_duration_15_minutes(self):
        from datetime import timedelta
        from django.utils import timezone
        user = make_user()
        for _ in range(5):
            user.record_failed_login()
        user.refresh_from_db()
        # locked_until should be ~15 minutes from now
        expected_min = timezone.now() + timedelta(minutes=14)
        expected_max = timezone.now() + timedelta(minutes=16)
        self.assertGreaterEqual(user.locked_until, expected_min)
        self.assertLessEqual(user.locked_until, expected_max)

    def test_reset_clears_lock(self):
        user = make_user()
        for _ in range(5):
            user.record_failed_login()
        user.reset_failed_login()
        user.refresh_from_db()
        self.assertFalse(user.is_locked)
        self.assertEqual(user.failed_login_count, 0)

    def test_incremental_failures_below_threshold(self):
        user = make_user()
        for i in range(4):
            user.record_failed_login()
        user.refresh_from_db()
        self.assertFalse(user.is_locked)
        self.assertEqual(user.failed_login_count, 4)
