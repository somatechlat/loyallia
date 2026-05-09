"""
Loyallia — Campaign SMS Integration Tests (LYL-SRS-009)

Tests for:
  1. SMS campaign task (apps.notifications.sms.tasks.send_sms_campaign)
  2. Plan enforcement for SMS_CAMPAIGNS feature
"""

import uuid
from unittest.mock import MagicMock, patch

from django.test import TestCase

from common.vault import clear_test_overrides, set_test_override

from apps.billing.models import PlanFeature
from tests.factories import (
    make_customer,
    make_plan,
    make_subscription,
    make_tenant,
)


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
        clear_test_overrides()
        set_test_override("twilio_account_sid", "ACtest")
        set_test_override("twilio_auth_token", "tok")
        set_test_override("twilio_from_number", "+15005550006")

    @patch("apps.notifications.sms.client._get_twilio_client")
    def test_campaign_sends_to_customers(self, mock_get_client):
        from apps.notifications.sms.tasks import send_sms_campaign

        mock_client = MagicMock()
        mock_msg = MagicMock()
        mock_msg.sid = "SM_campaign_001"
        mock_msg.status = "queued"
        mock_client.messages.create.return_value = mock_msg
        mock_get_client.return_value = mock_client

        tenant = make_tenant()
        make_customer(tenant, phone="+593991111111", email="c1@test.com")
        make_customer(tenant, phone="+593992222222", email="c2@test.com")
        make_customer(tenant, phone="", email="c3@test.com")  # No phone

        result = send_sms_campaign(
            tenant_id=str(tenant.id),
            title="Flash Sale",
            message="50% off everything!",
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["succeeded"], 2)
        self.assertEqual(
            result["failed"], 0
        )  # Empty-phone customer filtered by queryset
        self.assertEqual(result["attempted"], 2)  # Only customers with phone

    @patch("apps.notifications.sms.client._get_twilio_client")
    def test_campaign_creates_campaign_run(self, mock_get_client):
        from apps.notifications.models import CampaignRun, CampaignStatus
        from apps.notifications.sms.tasks import send_sms_campaign

        mock_client = MagicMock()
        mock_msg = MagicMock()
        mock_msg.sid = "SM_cr_001"
        mock_msg.status = "queued"
        mock_client.messages.create.return_value = mock_msg
        mock_get_client.return_value = mock_client

        tenant = make_tenant()
        make_customer(tenant, phone="+593991111111", email="cr1@test.com")

        result = send_sms_campaign(
            tenant_id=str(tenant.id),
            title="CampaignRun Test",
            message="Should create a run",
        )

        self.assertTrue(result["success"])
        campaign_run = CampaignRun.objects.get(id=uuid.UUID(result["campaign_run_id"]))
        self.assertEqual(campaign_run.status, CampaignStatus.COMPLETED)
        self.assertEqual(campaign_run.sent_count, 1)


class PlanFeatureSMSTest(TestCase):
    """Tests for SMS_CAMPAIGNS plan feature."""

    def test_sms_campaigns_in_all_features(self):
        self.assertIn("sms_campaigns", PlanFeature.ALL_FEATURES)

    def test_plan_with_sms_feature(self):
        plan = make_plan(features=["sms_campaigns"], max_sms_day=100)
        self.assertIn("sms_campaigns", plan.features)
        self.assertEqual(plan.max_sms_day, 100)

    def test_plan_limit_map_includes_sms(self):
        """The limit_map in Subscription.get_limit includes sms_day."""
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
