"""
Loyallia Campaign SMS Integration Tests

Tests for:
  1. SMS campaign task (apps.notifications.sms.tasks.send_sms_campaign)
  2. Plan enforcement for SMS_CAMPAIGNS feature
"""

import uuid

from django.test import TestCase

from apps.billing.models import PlanFeature
from common.vault import clear_test_overrides, get_secret, set_test_override
from tests.factories import (
    make_customer,
    make_plan,
    make_subscription,
    make_tenant,
)


def _get_twilio_test_credentials():
    sid = get_secret("twilio_test_account_sid") or get_secret("twilio_account_sid")
    token = get_secret("twilio_test_auth_token") or get_secret("twilio_auth_token")
    from_number = get_secret("twilio_from_number")
    if sid and token and from_number:
        return {"sid": sid, "token": token, "from": from_number}
    return None


class SMSCampaignTaskTest(TestCase):
    """Tests for send_sms_campaign Celery task."""

    def tearDown(self):
        clear_test_overrides()

    def test_returns_error_when_twilio_not_configured(self):
        from apps.notifications.sms.tasks import send_sms_campaign

        clear_test_overrides()
        set_test_override("twilio_account_sid", "")
        set_test_override("twilio_auth_token", "")
        set_test_override("twilio_from_number", "")

        tenant = make_tenant()
        result = send_sms_campaign(
            tenant_id=str(tenant.id),
            title="Test",
            message="Hello",
        )
        self.assertFalse(result["success"])
        self.assertIn("not configured", result["error"])

        clear_test_overrides()

    def test_returns_error_for_invalid_tenant(self):
        from apps.notifications.sms.tasks import send_sms_campaign

        result = send_sms_campaign(
            tenant_id=str(uuid.uuid4()),
            title="Test",
            message="Hello",
        )
        self.assertFalse(result["success"])
        self.assertIn("not found", result["error"])

    def setUp(self):
        self.creds = _get_twilio_test_credentials()
        if self.creds:
            clear_test_overrides()
            set_test_override("twilio_use_test_mode", "true")
            set_test_override("twilio_test_account_sid", self.creds["sid"])
            set_test_override("twilio_test_auth_token", self.creds["token"])
            set_test_override("twilio_from_number", self.creds["from"])

    def test_campaign_attempts_to_send_to_customers(self):
        if not self.creds:
            self.skipTest("Twilio credentials not available in Vault")

        from apps.notifications.sms.tasks import send_sms_campaign

        tenant = make_tenant()
        make_customer(tenant, phone="+593991111111", email="c1@test.com")
        make_customer(tenant, phone="+593992222222", email="c2@test.com")
        make_customer(tenant, phone="", email="c3@test.com")  # No phone

        result = send_sms_campaign(
            tenant_id=str(tenant.id),
            title="Flash Sale",
            message="50% off everything!",
        )

        self.assertIsInstance(result, dict)
        self.assertIn("success", result)
        self.assertIn("campaign_run_id", result)

    def test_campaign_creates_campaign_run(self):
        if not self.creds:
            self.skipTest("Twilio credentials not available in Vault")

        from apps.notifications.models import CampaignRun
        from apps.notifications.sms.tasks import send_sms_campaign

        tenant = make_tenant()
        make_customer(tenant, phone="+593991111111", email="cr1@test.com")

        result = send_sms_campaign(
            tenant_id=str(tenant.id),
            title="CampaignRun Test",
            message="Should create a run",
        )

        self.assertIn("campaign_run_id", result)
        campaign_run = CampaignRun.objects.filter(
            id=uuid.UUID(result["campaign_run_id"])
        ).first()
        self.assertIsNotNone(campaign_run)


class PlanFeatureSMSTest(TestCase):
    """Tests for SMS_CAMPAIGNS plan feature."""

    def test_sms_campaigns_in_all_features(self):
        self.assertIn("sms_campaigns", PlanFeature.ALL_FEATURES)

    def test_plan_with_sms_feature(self):
        plan = make_plan(features=["sms_campaigns"], max_sms_day=100)
        self.assertIn("sms_campaigns", plan.features)
        self.assertEqual(plan.max_sms_day, 100)

    def test_plan_limit_map_includes_sms(self):
        """SubscriptionPlan.limits includes sms_day."""
        from apps.billing.models import Subscription

        plan = make_plan(max_sms_day=50)
        tenant = make_tenant()
        make_subscription(tenant, plan=plan)

        sub = Subscription.objects.get(tenant=tenant)
        limit = sub.get_limit("sms_day")
        self.assertEqual(limit, 50)

    def test_plan_default_sms_is_zero(self):
        plan = make_plan()
        self.assertEqual(plan.max_sms_day, 0)
