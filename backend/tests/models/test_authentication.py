"""
Loyallia Authentication Model Unit Tests
Tests for User, OTP, Token, and related authentication models.
"""

import uuid
from datetime import timedelta
from typing import cast

from django.test import TestCase
from django.utils import timezone

from apps.authentication.models import RefreshToken, User, UserManager, UserRole
from tests.factories import make_user

# Authentication Model Tests


class UserModelTest(TestCase):
    """Tests for User model."""

    def test_create_user(self):
        user = make_user()
        self.assertIsNotNone(user.id)
        self.assertTrue(user.check_password(user._test_password))

    def test_user_str_shows_email_and_role(self):
        user = make_user(email="alice@test.com", role=UserRole.MANAGER)
        self.assertIn("alice@test.com", str(user))
        self.assertIn("MANAGER", str(user))

    def test_full_name_property(self):
        user = make_user(first_name="Alice", last_name="Smith")
        self.assertEqual(user.full_name, "Alice Smith")

    def test_full_name_fallback_to_email(self):
        user = make_user(first_name="", last_name="", email="bob@test.com")
        self.assertEqual(user.full_name, "bob@test.com")

    def test_is_locked_false_by_default(self):
        user = make_user()
        self.assertFalse(user.is_locked)

    def test_is_locked_true_when_locked_until_future(self):
        user = make_user()
        user.locked_until = timezone.now() + timedelta(minutes=10)
        user.save(update_fields=["locked_until"])
        user.refresh_from_db()
        self.assertTrue(user.is_locked)

    def test_is_locked_false_when_locked_until_past(self):
        user = make_user()
        user.locked_until = timezone.now() - timedelta(minutes=10)
        user.save(update_fields=["locked_until"])
        user.refresh_from_db()
        self.assertFalse(user.is_locked)

    def test_record_failed_login_increments_counter(self):
        user = make_user()
        self.assertEqual(user.failed_login_count, 0)
        user.record_failed_login()
        user.refresh_from_db()
        self.assertEqual(user.failed_login_count, 1)

    def test_record_failed_login_locks_after_5(self):
        user = make_user()
        for _ in range(5):
            user.record_failed_login()
        user.refresh_from_db()
        self.assertTrue(user.is_locked)
        self.assertEqual(user.failed_login_count, 5)

    def test_reset_failed_login_clears_lock(self):
        user = make_user()
        for _ in range(5):
            user.record_failed_login()
        user.reset_failed_login()
        user.refresh_from_db()
        self.assertEqual(user.failed_login_count, 0)
        self.assertIsNone(user.locked_until)

    def test_create_superuser(self):
        import secrets

        admin = cast(UserManager, User.objects).create_superuser(
            email="admin@test.com", password=secrets.token_urlsafe(16)
        )
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertEqual(admin.role, UserRole.SUPER_ADMIN)

    def test_user_roles_valid_choices(self):
        for role_val, _ in UserRole.choices:
            user = make_user(role=role_val)
            self.assertEqual(user.role, role_val)

    def test_user_uuid_primary_key(self):
        user = make_user()
        self.assertIsInstance(user.id, uuid.UUID)


class RefreshTokenModelTest(TestCase):
    """Tests for RefreshToken model."""

    def test_is_valid_when_not_revoked_and_not_expired(self):
        user = make_user()
        token = RefreshToken.objects.create(
            user=user,
            token_hash="abc123hash",
            expires_at=timezone.now() + timedelta(days=7),
        )
        self.assertTrue(token.is_valid)

    def test_is_valid_false_when_revoked(self):
        user = make_user()
        token = RefreshToken.objects.create(
            user=user,
            token_hash="abc123hash2",
            expires_at=timezone.now() + timedelta(days=7),
            revoked_at=timezone.now(),
        )
        self.assertFalse(token.is_valid)

    def test_is_valid_false_when_expired(self):
        user = make_user()
        token = RefreshToken.objects.create(
            user=user,
            token_hash="abc123hash3",
            expires_at=timezone.now() - timedelta(days=1),
        )
        self.assertFalse(token.is_valid)
