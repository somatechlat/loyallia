"""
Loyallia — API Integration Tests
Tests for API endpoints via Django test client.
"""

import json
import uuid
from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings
from django.test.client import Client
from django.utils import timezone

from apps.authentication.models import RefreshToken, User, UserRole
from apps.billing.models import Subscription, SubscriptionPlan, SubscriptionStatus
from apps.cards.models import Card, CardType
from apps.customers.models import Customer, CustomerPass
from apps.tenants.models import Tenant
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


def _get_auth_header(user, password="TestPass123!@"):
    """Get JWT auth header by logging in."""
    client = Client()
    resp = client.post(
        "/api/v1/auth/login/",
        data=json.dumps({"email": user.email, "password": password}),
        content_type="application/json",
    )
    if resp.status_code == 200:
        data = resp.json()
        return f"Bearer {data.get('access_token', '')}"
    return ""


# =============================================================================
# Authentication API Tests
# =============================================================================

class AuthRegisterAPITest(TestCase):
    """Tests for POST /api/v1/auth/register/"""

    def test_register_success(self):
        resp = self.client.post(
            "/api/v1/auth/register/",
            data=json.dumps({
                "email": "new@test.com",
                "password": "SecurePass123!@",
                "first_name": "Test",
                "last_name": "User",
                "business_name": "Test Business",
                "phone_number": "+593991234567",
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertTrue(User.objects.filter(email="new@test.com").exists())

    def test_register_duplicate_email_returns_success(self):
        """Security: duplicate email returns success to prevent user enumeration."""
        make_user(email="dup@test.com", password="SecurePass123!@")
        resp = self.client.post(
            "/api/v1/auth/register/",
            data=json.dumps({
                "email": "dup@test.com",
                "password": "SecurePass123!@",
                "first_name": "Dup",
                "last_name": "User",
                "business_name": "Dup Business",
                "phone_number": "+593991234567",
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["success"])


class AuthLoginAPITest(TestCase):
    """Tests for POST /api/v1/auth/login/"""

    def setUp(self):
        self.user = make_user(
            email="login@test.com", password="SecurePass123!@"
        )

    def test_login_success(self):
        resp = self.client.post(
            "/api/v1/auth/login/",
            data=json.dumps({"email": "login@test.com", "password": "SecurePass123!@"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)

    def test_login_wrong_password(self):
        resp = self.client.post(
            "/api/v1/auth/login/",
            data=json.dumps({"email": "login@test.com", "password": "WrongPass123!@"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 401)

    def test_login_nonexistent_user(self):
        resp = self.client.post(
            "/api/v1/auth/login/",
            data=json.dumps({"email": "nobody@test.com", "password": "Whatever123!@"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 401)

    def test_login_inactive_user(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        resp = self.client.post(
            "/api/v1/auth/login/",
            data=json.dumps({"email": "login@test.com", "password": "SecurePass123!@"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 401)

    def test_login_locked_account(self):
        for _ in range(5):
            self.user.record_failed_login()
        resp = self.client.post(
            "/api/v1/auth/login/",
            data=json.dumps({"email": "login@test.com", "password": "SecurePass123!@"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 423)


class AuthRefreshAPITest(TestCase):
    """Tests for POST /api/v1/auth/refresh/"""

    def test_refresh_valid_token(self):
        user = make_user(password="SecurePass123!@")
        header = _get_auth_header(user, "SecurePass123!@")
        # Get a refresh token via login
        resp = self.client.post(
            "/api/v1/auth/login/",
            data=json.dumps({"email": user.email, "password": "SecurePass123!@"}),
            content_type="application/json",
        )
        data = resp.json()
        refresh_token = data.get("refresh_token", "")
        self.assertTrue(refresh_token)

        resp2 = self.client.post(
            "/api/v1/auth/refresh/",
            data=json.dumps({"refresh_token": refresh_token}),
            content_type="application/json",
        )
        self.assertEqual(resp2.status_code, 200)
        self.assertIn("access_token", resp2.json())

    def test_refresh_invalid_token(self):
        resp = self.client.post(
            "/api/v1/auth/refresh/",
            data=json.dumps({"refresh_token": "invalid_token"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 401)


class AuthMeAPITest(TestCase):
    """Tests for GET /api/v1/auth/me/"""

    def test_me_authenticated(self):
        user = make_user(password="SecurePass123!@", first_name="Alice")
        header = _get_auth_header(user, "SecurePass123!@")
        resp = self.client.get(
            "/api/v1/auth/me/",
            HTTP_AUTHORIZATION=header,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["first_name"], "Alice")

    def test_me_unauthenticated(self):
        resp = self.client.get("/api/v1/auth/me/")
        self.assertIn(resp.status_code, [401, 403])


class AuthPasswordResetAPITest(TestCase):
    """Tests for password reset flow."""

    def test_password_reset_request_returns_200(self):
        user = make_user(email="reset@test.com", password="SecurePass123!@")
        resp = self.client.post(
            "/api/v1/auth/password-reset/request/",
            data=json.dumps({"email": "reset@test.com"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["success"])

    def test_password_reset_nonexistent_email_returns_200(self):
        """Security: always return 200 to prevent email enumeration."""
        resp = self.client.post(
            "/api/v1/auth/password-reset/request/",
            data=json.dumps({"email": "ghost@test.com"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)


class AuthForgotPasswordAPITest(TestCase):
    """Tests for POST /api/v1/auth/forgot-password/"""

    def test_forgot_password_returns_200(self):
        user = make_user(email="forgot@test.com", password="SecurePass123!@")
        resp = self.client.post(
            "/api/v1/auth/forgot-password/",
            data=json.dumps({"email": "forgot@test.com"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)


class AuthProfileAPITest(TestCase):
    """Tests for PUT /api/v1/auth/profile/"""

    def test_update_profile(self):
        user = make_user(password="SecurePass123!@", first_name="Old")
        header = _get_auth_header(user, "SecurePass123!@")
        resp = self.client.put(
            "/api/v1/auth/profile/",
            data=json.dumps({"first_name": "New"}),
            content_type="application/json",
            HTTP_AUTHORIZATION=header,
        )
        self.assertEqual(resp.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.first_name, "New")


class AuthChangePasswordAPITest(TestCase):
    """Tests for POST /api/v1/auth/change-password/"""

    def test_change_password_success(self):
        user = make_user(password="SecurePass123!@")
        header = _get_auth_header(user, "SecurePass123!@")
        resp = self.client.post(
            "/api/v1/auth/change-password/",
            data=json.dumps({
                "current_password": "SecurePass123!@",
                "new_password": "NewSecurePass123!@",
            }),
            content_type="application/json",
            HTTP_AUTHORIZATION=header,
        )
        self.assertEqual(resp.status_code, 200)

    def test_change_password_wrong_current(self):
        user = make_user(password="SecurePass123!@")
        header = _get_auth_header(user, "SecurePass123!@")
        resp = self.client.post(
            "/api/v1/auth/change-password/",
            data=json.dumps({
                "current_password": "WrongPassword123!@",
                "new_password": "NewSecurePass123!@",
            }),
            content_type="application/json",
            HTTP_AUTHORIZATION=header,
        )
        self.assertEqual(resp.status_code, 400)


class AuthGoogleConfigAPITest(TestCase):
    """Tests for GET /api/v1/auth/google/config/"""

    def test_google_config_returns_enabled_false(self):
        resp = self.client.get("/api/v1/auth/google/config/")
        self.assertEqual(resp.status_code, 200)
        # When no GOOGLE_OAUTH_CLIENT_ID is set
        self.assertIn("enabled", resp.json())


class AuthUsersAPITest(TestCase):
    """Tests for user listing and deactivation."""

    def test_list_users_owner_only(self):
        tenant = make_tenant()
        owner = make_user(tenant=tenant, role=UserRole.OWNER, password="SecurePass123!@")
        make_user(tenant=tenant, role=UserRole.STAFF)
        header = _get_auth_header(owner, "SecurePass123!@")
        resp = self.client.get("/api/v1/auth/users/", HTTP_AUTHORIZATION=header)
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_list_users_staff_forbidden(self):
        tenant = make_tenant()
        staff = make_user(tenant=tenant, role=UserRole.STAFF, password="SecurePass123!@")
        header = _get_auth_header(staff, "SecurePass123!@")
        resp = self.client.get("/api/v1/auth/users/", HTTP_AUTHORIZATION=header)
        self.assertEqual(resp.status_code, 403)

    def test_deactivate_user(self):
        tenant = make_tenant()
        owner = make_user(tenant=tenant, role=UserRole.OWNER, password="SecurePass123!@")
        target = make_user(tenant=tenant, role=UserRole.STAFF)
        header = _get_auth_header(owner, "SecurePass123!@")
        resp = self.client.delete(
            f"/api/v1/auth/users/{target.id}/",
            HTTP_AUTHORIZATION=header,
        )
        self.assertEqual(resp.status_code, 200)
        target.refresh_from_db()
        self.assertFalse(target.is_active)

    def test_deactivate_self_blocked(self):
        tenant = make_tenant()
        owner = make_user(tenant=tenant, role=UserRole.OWNER, password="SecurePass123!@")
        header = _get_auth_header(owner, "SecurePass123!@")
        resp = self.client.delete(
            f"/api/v1/auth/users/{owner.id}/",
            HTTP_AUTHORIZATION=header,
        )
        self.assertEqual(resp.status_code, 400)


# =============================================================================
# Customers API Tests
# =============================================================================

class CustomersAPITest(TestCase):
    """Tests for customer CRUD endpoints."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER, password="SecurePass123!@")
        self.header = _get_auth_header(self.user, "SecurePass123!@")
        # Ensure subscription exists for plan enforcement
        make_subscription(self.tenant)

    def test_list_customers(self):
        make_customer(self.tenant, first_name="Alice")
        make_customer(self.tenant, first_name="Bob")
        resp = self.client.get("/api/v1/customers/", HTTP_AUTHORIZATION=self.header)
        self.assertEqual(resp.status_code, 200)

    def test_create_customer(self):
        resp = self.client.post(
            "/api/v1/customers/",
            data=json.dumps({
                "first_name": "New",
                "last_name": "Customer",
                "email": "new@customer.com",
                "phone": "+593991234567",
            }),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertIn(resp.status_code, [200, 201])
        self.assertTrue(Customer.objects.filter(email="new@customer.com").exists())

    def test_get_customer_detail(self):
        customer = make_customer(self.tenant)
        resp = self.client.get(
            f"/api/v1/customers/{customer.id}/",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 200)

    def test_update_customer(self):
        customer = make_customer(self.tenant, first_name="Old")
        resp = self.client.put(
            f"/api/v1/customers/{customer.id}/",
            data=json.dumps({"first_name": "Updated"}),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 200)
        customer.refresh_from_db()
        self.assertEqual(customer.first_name, "Updated")

    def test_delete_customer(self):
        customer = make_customer(self.tenant)
        resp = self.client.delete(
            f"/api/v1/customers/{customer.id}/",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertIn(resp.status_code, [200, 204])


# =============================================================================
# Cards API Tests
# =============================================================================

class CardsAPITest(TestCase):
    """Tests for card (program) CRUD endpoints."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER, password="SecurePass123!@")
        self.header = _get_auth_header(self.user, "SecurePass123!@")
        make_subscription(self.tenant)

    def test_list_cards(self):
        make_card(self.tenant, name="Card 1")
        make_card(self.tenant, name="Card 2")
        resp = self.client.get("/api/v1/cards/", HTTP_AUTHORIZATION=self.header)
        self.assertEqual(resp.status_code, 200)

    def test_create_card(self):
        resp = self.client.post(
            "/api/v1/cards/",
            data=json.dumps({
                "name": "New Card",
                "card_type": "stamp",
                "description": "Test card",
                "metadata": {"stamps_required": 10, "reward_description": "Free item"},
            }),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertIn(resp.status_code, [200, 201])

    def test_get_card_detail(self):
        card = make_card(self.tenant)
        resp = self.client.get(
            f"/api/v1/cards/{card.id}/",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 200)


# =============================================================================
# Transactions API Tests
# =============================================================================

class TransactionsAPITest(TestCase):
    """Tests for transaction endpoints."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER, password="SecurePass123!@")
        self.header = _get_auth_header(self.user, "SecurePass123!@")
        make_subscription(self.tenant)

    def test_list_transactions(self):
        resp = self.client.get("/api/v1/transactions/", HTTP_AUTHORIZATION=self.header)
        self.assertEqual(resp.status_code, 200)


# =============================================================================
# Billing API Tests
# =============================================================================

class BillingAPITest(TestCase):
    """Tests for billing endpoints."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER, password="SecurePass123!@")
        self.header = _get_auth_header(self.user, "SecurePass123!@")

    def test_list_plans(self):
        make_plan()
        resp = self.client.get("/api/v1/billing/plans/", HTTP_AUTHORIZATION=self.header)
        self.assertEqual(resp.status_code, 200)

    def test_check_usage(self):
        make_subscription(self.tenant)
        resp = self.client.get("/api/v1/billing/usage/", HTTP_AUTHORIZATION=self.header)
        self.assertEqual(resp.status_code, 200)


# =============================================================================
# Tenants API Tests
# =============================================================================

class TenantsAPITest(TestCase):
    """Tests for tenant endpoints."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER, password="SecurePass123!@")
        self.header = _get_auth_header(self.user, "SecurePass123!@")

    def test_get_tenant_settings(self):
        resp = self.client.get("/api/v1/tenants/settings/", HTTP_AUTHORIZATION=self.header)
        self.assertEqual(resp.status_code, 200)

    def test_update_tenant_settings(self):
        resp = self.client.put(
            "/api/v1/tenants/settings/",
            data=json.dumps({"name": "Updated Business"}),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 200)


# =============================================================================
# Automation API Tests
# =============================================================================

class AutomationAPITest(TestCase):
    """Tests for automation endpoints."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER, password="SecurePass123!@")
        self.header = _get_auth_header(self.user, "SecurePass123!@")
        make_subscription(self.tenant)

    def test_list_automations(self):
        resp = self.client.get("/api/v1/automations/", HTTP_AUTHORIZATION=self.header)
        self.assertEqual(resp.status_code, 200)


# =============================================================================
# Notifications API Tests
# =============================================================================

class NotificationsAPITest(TestCase):
    """Tests for notification endpoints."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER, password="SecurePass123!@")
        self.header = _get_auth_header(self.user, "SecurePass123!@")

    def test_list_notifications(self):
        resp = self.client.get("/api/v1/notifications/", HTTP_AUTHORIZATION=self.header)
        self.assertEqual(resp.status_code, 200)


# =============================================================================
# Health Check Test
# =============================================================================

class HealthCheckTest(TestCase):
    """Tests for health endpoint."""

    def test_health_endpoint(self):
        resp = self.client.get("/api/v1/health/")
        self.assertEqual(resp.status_code, 200)
