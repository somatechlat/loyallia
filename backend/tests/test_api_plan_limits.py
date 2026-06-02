"""
Loyallia API Plan Limit & Feature Gating Tests

Tests that API endpoints correctly return 402/403 when:
- Subscription is inactive or missing
- Plan feature is not included in subscription
- Resource usage has reached plan limit

These are Django test-client integration tests that hit actual endpoints.
"""

import json

from django.test import TestCase
from django.test.client import Client

from apps.authentication.models import UserRole
from apps.billing.models import SubscriptionStatus
from tests.factories import (
    make_card,
    make_customer,
    make_location,
    make_plan,
    make_subscription,
    make_tenant,
    make_user,
)


def _get_auth_header(user, password=None):
    """Get JWT auth header by logging in."""
    password = password or user._test_password
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


# ──────────────────────────────────────────────────────────────
# CAMPAIGN PLAN LIMIT TESTS
# ──────────────────────────────────────────────────────────────


class CampaignFeatureGatingTest(TestCase):
    """Tests for campaign creation blocked by missing feature flags."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.header = _get_auth_header(self.user)
        # Plan with NO campaign features
        self.plan = make_plan(
            features=["data_export"],
            max_emails_month=100,
            max_whatsapp_day=50,
            max_sms_day=50,
            max_wallet_pushes_month=500,
            max_notifications_month=1000,
        )
        make_subscription(self.tenant, plan=self.plan)

    def test_email_campaign_feature_missing_returns_403(self):
        resp = self.client.post(
            "/api/v1/notifications/campaigns/",
            data=json.dumps(
                {
                    "title": "Test Email Campaign",
                    "channel": "email",
                    "message": "Test content",
                    "segment_id": "all",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 403)
        data = resp.json()
        self.assertIn("no está disponible", data.get("error", "").lower())

    def test_whatsapp_campaign_feature_missing_returns_403(self):
        resp = self.client.post(
            "/api/v1/notifications/campaigns/",
            data=json.dumps(
                {
                    "title": "Test WA Campaign",
                    "channel": "whatsapp",
                    "message": "Test content",
                    "segment_id": "all",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 403)

    def test_wallet_campaign_feature_missing_returns_403(self):
        resp = self.client.post(
            "/api/v1/notifications/campaigns/",
            data=json.dumps(
                {
                    "title": "Test Wallet Campaign",
                    "channel": "wallet",
                    "message": "Test content",
                    "segment_id": "all",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 403)

    def test_sms_campaign_feature_missing_returns_403(self):
        resp = self.client.post(
            "/api/v1/notifications/campaigns/",
            data=json.dumps(
                {
                    "title": "Test SMS Campaign",
                    "channel": "sms",
                    "message": "Test content",
                    "segment_id": "all",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 403)


class CampaignLimitReachedTest(TestCase):
    """Tests for campaign creation blocked by reached resource limits.

    Note: Campaign delivery counts (emails_month, sms_day, etc.) are tracked
    asynchronously via CampaignDeliveryLog, so we test limit=0 (feature
    disabled) which blocks immediately in check_plan_limit.
    """

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.header = _get_auth_header(self.user)

    def test_email_campaign_limit_zero_returns_403(self):
        # Plan with email campaigns enabled but max_emails_month=0
        plan = make_plan(
            features=["email_campaigns", "data_export"],
            max_emails_month=0,
            max_notifications_month=1000,
        )
        make_subscription(self.tenant, plan=plan)

        resp = self.client.post(
            "/api/v1/notifications/campaigns/",
            data=json.dumps(
                {
                    "title": "Test Campaign",
                    "channel": "email",
                    "message": "Test content",
                    "segment_id": "all",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 403)
        data = resp.json()
        self.assertIn("no está disponible", data.get("error", "").lower())

    def test_notifications_month_limit_zero_returns_403(self):
        # Plan with max_notifications_month=0 (disabled)
        plan = make_plan(
            features=["email_campaigns"],
            max_emails_month=100,
            max_notifications_month=0,
        )
        make_subscription(self.tenant, plan=plan)

        resp = self.client.post(
            "/api/v1/notifications/campaigns/",
            data=json.dumps(
                {
                    "title": "Test Campaign",
                    "channel": "email",
                    "message": "Test content",
                    "segment_id": "all",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        # notifications_month limit=0 should block any campaign
        self.assertEqual(resp.status_code, 403)


# ──────────────────────────────────────────────────────────────
# AUTOMATION PLAN LIMIT TESTS
# ──────────────────────────────────────────────────────────────


class AutomationFeatureGatingTest(TestCase):
    """Tests for automation creation blocked by missing feature or limit."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.header = _get_auth_header(self.user)

    def test_automation_feature_missing_returns_403(self):
        # Plan WITHOUT automation feature
        plan = make_plan(features=["data_export"], max_automations=10)
        make_subscription(self.tenant, plan=plan)

        resp = self.client.post(
            "/api/v1/automation/",
            data=json.dumps(
                {
                    "name": "Test Automation",
                    "trigger": "customer_enrolled",
                    "action": "send_notification",
                    "action_config": {"title": "Welcome!", "message": "Hello!"},
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 403)
        data = resp.json()
        self.assertIn("no está disponible", data.get("error", "").lower())

    def test_automation_limit_reached_returns_403(self):
        # Plan WITH automation feature but limit of 1
        plan = make_plan(
            features=["automation", "data_export"],
            max_automations=1,
            max_automation_executions_day=100,
        )
        make_subscription(self.tenant, plan=plan)

        # Create first automation (should succeed)
        resp1 = self.client.post(
            "/api/v1/automation/",
            data=json.dumps(
                {
                    "name": "First Automation",
                    "trigger": "customer_enrolled",
                    "action": "send_notification",
                    "action_config": {"title": "Welcome!", "message": "Hello!"},
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertIn(resp1.status_code, [200, 201])

        # Create second automation (should fail)
        resp2 = self.client.post(
            "/api/v1/automation/",
            data=json.dumps(
                {
                    "name": "Second Automation",
                    "trigger": "customer_enrolled",
                    "action": "send_notification",
                    "action_config": {"title": "Welcome!", "message": "Hello!"},
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp2.status_code, 403)
        data = resp2.json()
        self.assertIn("límite", data.get("error", "").lower())


# ──────────────────────────────────────────────────────────────
# CORE RESOURCE LIMIT TESTS
# ──────────────────────────────────────────────────────────────


class CustomerLimitTest(TestCase):
    """Tests for customer creation blocked by plan limit."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.header = _get_auth_header(self.user)

    def test_create_customer_at_limit_returns_403(self):
        # Plan with max_customers=1
        plan = make_plan(max_customers=1)
        make_subscription(self.tenant, plan=plan)
        # Create one customer to reach limit
        make_customer(self.tenant)

        resp = self.client.post(
            "/api/v1/customers/",
            data=json.dumps(
                {
                    "first_name": "Over",
                    "last_name": "Limit",
                    "email": "over@limit.com",
                    "phone": "+593991234567",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 403)
        data = resp.json()
        self.assertIn("límite", data.get("error", "").lower())


class ProgramLimitTest(TestCase):
    """Tests for program (card) creation blocked by plan limit."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.header = _get_auth_header(self.user)

    def test_create_program_at_limit_returns_403(self):
        # Plan with max_programs=1
        plan = make_plan(max_programs=1)
        make_subscription(self.tenant, plan=plan)
        # Create one program to reach limit
        make_card(self.tenant)

        resp = self.client.post(
            "/api/v1/cards/",
            data=json.dumps(
                {
                    "name": "Over Limit Card",
                    "card_type": "stamp",
                    "description": "Test",
                    "metadata": {
                        "stamps_required": 10,
                        "reward_description": "Free item",
                    },
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 403)


class LocationLimitTest(TestCase):
    """Tests for location creation blocked by plan limit or missing feature."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.header = _get_auth_header(self.user)

    def test_create_location_at_limit_returns_403(self):
        # Plan with max_locations=1 and geo_fencing feature
        plan = make_plan(max_locations=1, features=["geo_fencing", "data_export"])
        make_subscription(self.tenant, plan=plan)
        # Create one location to reach limit
        make_location(self.tenant)

        resp = self.client.post(
            "/api/v1/tenants/locations/",
            data=json.dumps(
                {
                    "name": "Over Limit Location",
                    "address": "123 Test St",
                    "city": "Quito",
                    "country": "EC",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 403)

    def test_create_location_feature_missing_returns_403(self):
        # Plan WITHOUT geo_fencing feature
        plan = make_plan(max_locations=10, features=["data_export"])
        make_subscription(self.tenant, plan=plan)

        resp = self.client.post(
            "/api/v1/tenants/locations/",
            data=json.dumps(
                {
                    "name": "Test Location",
                    "address": "123 Test St",
                    "city": "Quito",
                    "country": "EC",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 403)


class TeamMemberLimitTest(TestCase):
    """Tests for team member creation blocked by plan limit."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.header = _get_auth_header(self.user)

    def test_add_team_member_at_limit_returns_403(self):
        # Plan with max_users=2 (OWNER + 1 member)
        plan = make_plan(max_users=2)
        make_subscription(self.tenant, plan=plan)
        # Create one member to reach limit
        make_user(tenant=self.tenant, role=UserRole.MANAGER, email="member@test.com")

        resp = self.client.post(
            "/api/v1/tenants/team/",
            data=json.dumps(
                {
                    "email": "newmember@test.com",
                    "first_name": "New",
                    "last_name": "Member",
                    "role": "MANAGER",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 403)


# ──────────────────────────────────────────────────────────────
# FEATURE GATING TESTS (Analytics, AI)
# ──────────────────────────────────────────────────────────────


class AdvancedAnalyticsFeatureGatingTest(TestCase):
    """Tests for analytics endpoints blocked by missing feature."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.header = _get_auth_header(self.user)

    def test_analytics_feature_missing_returns_403(self):
        # Plan WITHOUT advanced_analytics feature
        plan = make_plan(features=["data_export"])
        make_subscription(self.tenant, plan=plan)

        resp = self.client.get(
            "/api/v1/analytics/overview/",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 403)
        data = resp.json()
        self.assertIn("no está disponible", data.get("error", "").lower())

    def test_analytics_feature_present_returns_200(self):
        # Plan WITH advanced_analytics feature
        plan = make_plan(features=["advanced_analytics", "data_export"])
        make_subscription(self.tenant, plan=plan)

        resp = self.client.get(
            "/api/v1/analytics/overview/",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 200)


class AIAssistantFeatureGatingTest(TestCase):
    """Tests for AI chat endpoint blocked by missing feature."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.header = _get_auth_header(self.user)

    def test_ai_chat_feature_missing_returns_403(self):
        # Plan WITHOUT ai_assistant feature
        plan = make_plan(features=["data_export"])
        make_subscription(self.tenant, plan=plan)

        resp = self.client.post(
            "/api/v1/tenants/me/ai-chat/",
            data=json.dumps({"message": "Hello AI"}),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 403)
        data = resp.json()
        self.assertIn("no está disponible", data.get("error", "").lower())


# ──────────────────────────────────────────────────────────────
# SUBSCRIPTION STATUS TESTS
# ──────────────────────────────────────────────────────────────


class SubscriptionStatusTest(TestCase):
    """Tests for endpoints blocked by inactive subscription."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.header = _get_auth_header(self.user)

    def test_create_automation_inactive_subscription_returns_402(self):
        plan = make_plan(features=["automation"], max_automations=10)
        sub = make_subscription(self.tenant, plan=plan)
        sub.status = SubscriptionStatus.SUSPENDED
        sub.save(update_fields=["status"])

        resp = self.client.post(
            "/api/v1/automation/",
            data=json.dumps(
                {
                    "name": "Test Automation",
                    "trigger": "customer_enrolled",
                    "action": "send_notification",
                    "action_config": {"title": "Welcome!", "message": "Hello!"},
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 402)
        data = resp.json()
        self.assertIn("suscripción", data.get("error", "").lower())

    def test_create_campaign_inactive_subscription_returns_402(self):
        plan = make_plan(
            features=["email_campaigns"],
            max_emails_month=100,
            max_notifications_month=1000,
        )
        sub = make_subscription(self.tenant, plan=plan)
        sub.status = SubscriptionStatus.SUSPENDED
        sub.save(update_fields=["status"])

        resp = self.client.post(
            "/api/v1/notifications/campaigns/",
            data=json.dumps(
                {
                    "title": "Test Campaign",
                    "channel": "email",
                    "message": "Test content",
                    "segment_id": "all",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 402)

    def test_add_team_member_inactive_subscription_returns_402(self):
        plan = make_plan(max_users=10)
        sub = make_subscription(self.tenant, plan=plan)
        sub.status = SubscriptionStatus.SUSPENDED
        sub.save(update_fields=["status"])

        resp = self.client.post(
            "/api/v1/tenants/team/",
            data=json.dumps(
                {
                    "email": "newmember@test.com",
                    "first_name": "New",
                    "last_name": "Member",
                    "role": "MANAGER",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )
        self.assertEqual(resp.status_code, 402)
