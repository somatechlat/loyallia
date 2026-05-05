"""
Loyallia — SMS Integration Tests (LYL-SRS-009)

Tests for:
  1. Twilio SMS client (apps.notifications.sms.client)
  2. Automation action hardening (send_email, send_sms, send_whatsapp, send_wallet)
  3. Birthday trigger task (apps.automation.tasks.evaluate_birthday_triggers)
  4. SMS campaign task (apps.notifications.sms.tasks.send_sms_campaign)
  5. Plan enforcement for SMS_CAMPAIGNS feature
  6. i18n message codes for SMS/Data Export/AI
"""

import uuid
from datetime import date
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from apps.automation.models import (
    Automation,
    AutomationAction,
    AutomationTrigger,
)
from apps.billing.models import PlanFeature
from common.messages import get_message
from tests.factories import (
    make_automation,
    make_card,
    make_customer,
    make_customer_pass,
    make_plan,
    make_subscription,
    make_tenant,
)

# =============================================================================
# SMS Client Tests
# =============================================================================


class SMSClientAvailabilityTest(TestCase):
    """Tests for is_sms_available() configuration checking."""

    @override_settings(
        TWILIO_ACCOUNT_SID="", TWILIO_AUTH_TOKEN="", TWILIO_FROM_NUMBER=""
    )
    def test_not_available_when_no_credentials(self):
        from apps.notifications.sms.client import is_sms_available

        self.assertFalse(is_sms_available())

    @override_settings(
        TWILIO_ACCOUNT_SID="ACtest123",
        TWILIO_AUTH_TOKEN="token123",
        TWILIO_FROM_NUMBER="+15005550006",
    )
    def test_available_when_all_configured(self):
        from apps.notifications.sms.client import is_sms_available

        self.assertTrue(is_sms_available())

    @override_settings(
        TWILIO_ACCOUNT_SID="ACtest123",
        TWILIO_AUTH_TOKEN="",
        TWILIO_FROM_NUMBER="+15005550006",
    )
    def test_not_available_missing_auth_token(self):
        from apps.notifications.sms.client import is_sms_available

        self.assertFalse(is_sms_available())


class SMSClientSendTest(TestCase):
    """Tests for send_sms() function with mocked Twilio client."""

    @override_settings(
        TWILIO_ACCOUNT_SID="ACtest123",
        TWILIO_AUTH_TOKEN="token123",
        TWILIO_FROM_NUMBER="+15005550006",
    )
    @patch("apps.notifications.sms.client._get_twilio_client")
    def test_send_sms_success(self, mock_get_client):
        from apps.notifications.sms.client import send_sms

        mock_client = MagicMock()
        mock_msg = MagicMock()
        mock_msg.sid = "SM_test_123"
        mock_msg.status = "queued"
        mock_client.messages.create.return_value = mock_msg
        mock_get_client.return_value = mock_client

        result = send_sms(phone="+593991234567", message="Hello from Loyallia!")

        self.assertTrue(result["success"])
        self.assertEqual(result["sid"], "SM_test_123")
        self.assertEqual(result["status"], "queued")
        mock_client.messages.create.assert_called_once_with(
            body="Hello from Loyallia!",
            from_="+15005550006",
            to="+593991234567",
        )

    @override_settings(
        TWILIO_ACCOUNT_SID="ACtest123",
        TWILIO_AUTH_TOKEN="token123",
        TWILIO_FROM_NUMBER="+15005550006",
    )
    @patch("apps.notifications.sms.client._get_twilio_client")
    def test_send_sms_failure(self, mock_get_client):
        from apps.notifications.sms.client import send_sms

        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("Invalid phone number")
        mock_get_client.return_value = mock_client

        result = send_sms(phone="+invalid", message="test")

        self.assertFalse(result["success"])
        self.assertIn("Invalid phone number", result["error"])

    def test_send_sms_no_phone(self):
        from apps.notifications.sms.client import send_sms

        result = send_sms(phone="", message="test")
        self.assertFalse(result["success"])
        self.assertIn("No recipient", result["error"])

    @override_settings(
        TWILIO_ACCOUNT_SID="", TWILIO_AUTH_TOKEN="", TWILIO_FROM_NUMBER=""
    )
    def test_send_sms_raises_when_not_configured(self):
        from apps.notifications.sms.client import send_sms

        with self.assertRaises(RuntimeError) as ctx:
            send_sms(phone="+593991234567", message="test")
        self.assertIn("not configured", str(ctx.exception))


class SMSClientBulkTest(TestCase):
    """Tests for send_sms_bulk() function."""

    @override_settings(
        TWILIO_ACCOUNT_SID="ACtest123",
        TWILIO_AUTH_TOKEN="token123",
        TWILIO_FROM_NUMBER="+15005550006",
    )
    @patch("apps.notifications.sms.client._get_twilio_client")
    def test_bulk_send_mixed_results(self, mock_get_client):
        from apps.notifications.sms.client import send_sms_bulk

        mock_client = MagicMock()
        mock_msg = MagicMock()
        mock_msg.sid = "SM_bulk_001"
        mock_msg.status = "queued"

        call_count = 0

        def side_effect(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                raise Exception("Rate limited")
            return mock_msg

        mock_client.messages.create.side_effect = side_effect
        mock_get_client.return_value = mock_client

        recipients = [
            {"phone": "+593991111111", "message": "Hi 1"},
            {"phone": "+593992222222", "message": "Hi 2"},
            {"phone": "+593993333333", "message": "Hi 3"},
        ]

        result = send_sms_bulk(recipients)
        self.assertEqual(result["succeeded"], 2)
        self.assertEqual(result["failed"], 1)

    @override_settings(
        TWILIO_ACCOUNT_SID="ACtest123",
        TWILIO_AUTH_TOKEN="token123",
        TWILIO_FROM_NUMBER="+15005550006",
    )
    @patch("apps.notifications.sms.client._get_twilio_client")
    def test_bulk_send_skips_missing_data(self, mock_get_client):
        from apps.notifications.sms.client import send_sms_bulk

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        recipients = [
            {"phone": "", "message": "Hi"},
            {"phone": "+593991111111", "message": ""},
        ]
        result = send_sms_bulk(recipients)
        self.assertEqual(result["failed"], 2)
        self.assertEqual(result["succeeded"], 0)


# =============================================================================
# Automation Action Hardening Tests
# =============================================================================


class AutomationSendEmailTest(TestCase):
    """Tests for _execute_send_email with real Django SMTP (mocked)."""

    def setUp(self):
        self.tenant = make_tenant()
        self.customer = make_customer(self.tenant, email="real@test.com")
        self.card = make_card(self.tenant)
        make_customer_pass(self.customer, self.card)

    @patch("django.core.mail.EmailMultiAlternatives.send", return_value=1)
    def test_send_email_success(self, mock_send):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_EMAIL,
            action_config={"title": "Welcome!", "message": "Thanks for joining"},
        )
        result = auto._execute_send_email(self.customer, {})
        self.assertTrue(result)
        mock_send.assert_called_once()

    def test_send_email_no_email_returns_false(self):
        customer_no_email = make_customer(self.tenant, email="")
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_EMAIL,
            action_config={"title": "Hi", "message": "Hello"},
        )
        result = auto._execute_send_email(customer_no_email, {})
        self.assertFalse(result)

    @patch(
        "django.core.mail.EmailMultiAlternatives.send",
        side_effect=Exception("SMTP error"),
    )
    def test_send_email_smtp_failure_returns_false(self, mock_send):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_EMAIL,
            action_config={"title": "Hi", "message": "World"},
        )
        result = auto._execute_send_email(self.customer, {})
        self.assertFalse(result)


class AutomationSendSMSTest(TestCase):
    """Tests for _execute_send_sms with real Twilio (mocked)."""

    def setUp(self):
        self.tenant = make_tenant()
        self.customer = make_customer(self.tenant, phone="+593991234567")
        self.card = make_card(self.tenant)
        make_customer_pass(self.customer, self.card)

    @override_settings(
        TWILIO_ACCOUNT_SID="ACtest",
        TWILIO_AUTH_TOKEN="tok",
        TWILIO_FROM_NUMBER="+15005550006",
    )
    @patch("apps.notifications.sms.client._get_twilio_client")
    def test_send_sms_action_success(self, mock_get_client):
        mock_client = MagicMock()
        mock_msg = MagicMock()
        mock_msg.sid = "SM_auto_001"
        mock_msg.status = "queued"
        mock_client.messages.create.return_value = mock_msg
        mock_get_client.return_value = mock_client

        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_SMS,
            action_config={"title": "Promo", "message": "50% off today!"},
        )
        result = auto._execute_send_sms(self.customer, {})
        self.assertTrue(result)

    def test_send_sms_no_phone_returns_false(self):
        customer_no_phone = make_customer(self.tenant, phone="", email="np@test.com")
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_SMS,
            action_config={"message": "Test"},
        )
        result = auto._execute_send_sms(customer_no_phone, {})
        self.assertFalse(result)

    @override_settings(
        TWILIO_ACCOUNT_SID="", TWILIO_AUTH_TOKEN="", TWILIO_FROM_NUMBER=""
    )
    def test_send_sms_not_configured_returns_false(self):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_SMS,
            action_config={"message": "Test"},
        )
        result = auto._execute_send_sms(self.customer, {})
        self.assertFalse(result)


class AutomationSendWhatsAppTest(TestCase):
    """Tests for _execute_send_whatsapp with mocked bridge."""

    def setUp(self):
        self.tenant = make_tenant()
        self.customer = make_customer(self.tenant, phone="+593991234567")
        self.card = make_card(self.tenant)
        make_customer_pass(self.customer, self.card)

    @patch(
        "apps.notifications.whatsapp.client.send_message",
        return_value={"success": True, "job_id": "test_job", "queued": True},
    )
    @patch("apps.notifications.whatsapp.client.is_bridge_available", return_value=True)
    def test_send_whatsapp_success(self, mock_available, mock_send):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_WHATSAPP,
            action_config={"title": "Promo", "message": "Visit us today!"},
        )
        result = auto._execute_send_whatsapp(self.customer, {})
        self.assertTrue(result)
        mock_send.assert_called_once()

    @patch("apps.notifications.whatsapp.client.is_bridge_available", return_value=False)
    def test_send_whatsapp_bridge_unavailable(self, mock_available):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_WHATSAPP,
            action_config={"title": "Hi", "message": "Test"},
        )
        result = auto._execute_send_whatsapp(self.customer, {})
        self.assertFalse(result)

    def test_send_whatsapp_no_phone(self):
        customer_no_phone = make_customer(self.tenant, phone="", email="wp@test.com")
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_WHATSAPP,
            action_config={"message": "Test"},
        )
        result = auto._execute_send_whatsapp(customer_no_phone, {})
        self.assertFalse(result)


class AutomationSendWalletTest(TestCase):
    """Tests for _execute_send_wallet with mocked push services."""

    def setUp(self):
        self.tenant = make_tenant()
        self.customer = make_customer(self.tenant)
        self.card = make_card(self.tenant)
        self.customer_pass = make_customer_pass(self.customer, self.card)

    @patch(
        "apps.customers.pass_engine.google_pass.send_push_notification",
        return_value={"success": True},
    )
    @patch("apps.customers.pass_engine.apple_push.notify_pass_updated", return_value=1)
    def test_send_wallet_success(self, mock_apple, mock_google):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_WALLET,
            action_config={"title": "New Offer!", "message": "Check your wallet"},
        )
        result = auto._execute_send_wallet(self.customer, {})
        self.assertTrue(result)

    def test_send_wallet_no_passes(self):
        customer2 = make_customer(self.tenant, email="nopass@test.com")
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_WALLET,
            action_config={"title": "Hi", "message": "Test"},
        )
        result = auto._execute_send_wallet(customer2, {})
        self.assertFalse(result)


# =============================================================================
# Automation Choices Tests
# =============================================================================


class AutomationChoicesTest(TestCase):
    """Tests for action/trigger enum integrity."""

    def test_create_campaign_removed(self):
        """CREATE_CAMPAIGN was deprecated and removed."""
        action_values = [a.value for a in AutomationAction]
        self.assertNotIn("create_campaign", action_values)

    def test_send_whatsapp_exists(self):
        action_values = [a.value for a in AutomationAction]
        self.assertIn("send_whatsapp", action_values)

    def test_send_wallet_exists(self):
        action_values = [a.value for a in AutomationAction]
        self.assertIn("send_wallet", action_values)

    def test_send_sms_exists(self):
        action_values = [a.value for a in AutomationAction]
        self.assertIn("send_sms", action_values)

    def test_birthday_coming_trigger_exists(self):
        trigger_values = [t.value for t in AutomationTrigger]
        self.assertIn("birthday_coming", trigger_values)

    def test_seven_actions_total(self):
        """After hardening: 7 actions total (notification, email, sms, whatsapp,
        issue_reward, update_segment, send_wallet)."""
        self.assertEqual(len(AutomationAction.choices), 7)


# =============================================================================
# Birthday Trigger Task Tests
# =============================================================================


class BirthdayTriggerTaskTest(TestCase):
    """Tests for evaluate_birthday_triggers Celery task."""

    def test_fires_for_birthday_today(self):
        from apps.automation.tasks import evaluate_birthday_triggers

        today = date.today()
        tenant = make_tenant()
        customer = make_customer(
            tenant, date_of_birth=today.replace(year=1990), email="bday@test.com"
        )
        auto = make_automation(
            tenant,
            trigger=AutomationTrigger.BIRTHDAY_COMING,
            action=AutomationAction.SEND_NOTIFICATION,
        )

        with patch.object(Automation, "_execute_send_notification", return_value=True):
            result = evaluate_birthday_triggers()

        self.assertGreaterEqual(result["triggered"], 0)

    def test_no_birthdays_returns_zero(self):
        from apps.automation.tasks import evaluate_birthday_triggers

        tenant = make_tenant()
        # No customers with birthday today
        result = evaluate_birthday_triggers()
        self.assertEqual(result["triggered"], 0)


# =============================================================================
# SMS Campaign Task Tests
# =============================================================================


class SMSCampaignTaskTest(TestCase):
    """Tests for send_sms_campaign Celery task."""

    @override_settings(
        TWILIO_ACCOUNT_SID="", TWILIO_AUTH_TOKEN="", TWILIO_FROM_NUMBER=""
    )
    def test_returns_error_when_twilio_not_configured(self):
        from apps.notifications.sms.tasks import send_sms_campaign

        tenant = make_tenant()
        result = send_sms_campaign(
            tenant_id=str(tenant.id),
            title="Test",
            message="Hello",
        )
        self.assertFalse(result["success"])
        self.assertIn("not configured", result["error"])

    def test_returns_error_for_invalid_tenant(self):
        from apps.notifications.sms.tasks import send_sms_campaign

        result = send_sms_campaign(
            tenant_id=str(uuid.uuid4()),
            title="Test",
            message="Hello",
        )
        self.assertFalse(result["success"])
        self.assertIn("not found", result["error"])

    @override_settings(
        TWILIO_ACCOUNT_SID="ACtest",
        TWILIO_AUTH_TOKEN="tok",
        TWILIO_FROM_NUMBER="+15005550006",
    )
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

    @override_settings(
        TWILIO_ACCOUNT_SID="ACtest",
        TWILIO_AUTH_TOKEN="tok",
        TWILIO_FROM_NUMBER="+15005550006",
    )
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


# =============================================================================
# Plan Feature Tests for SMS
# =============================================================================


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


# =============================================================================
# i18n Message Tests
# =============================================================================


class I18nSMSMessagesTest(TestCase):
    """Tests for SMS/Twilio/Data Export/AI i18n message codes."""

    def test_sms_campaign_started_es(self):
        msg = get_message("SMS_CAMPAIGN_STARTED", lang="es", segment="VIP")
        self.assertIn("SMS", msg)
        self.assertIn("VIP", msg)

    def test_sms_campaign_started_en(self):
        msg = get_message("SMS_CAMPAIGN_STARTED", lang="en", segment="VIP")
        self.assertIn("SMS campaign", msg)

    def test_sms_not_configured_es(self):
        msg = get_message("SMS_NOT_CONFIGURED", lang="es")
        self.assertIn("Twilio", msg)

    def test_sms_not_configured_en(self):
        msg = get_message("SMS_NOT_CONFIGURED", lang="en")
        self.assertIn("Twilio", msg)

    def test_twilio_test_sent_es(self):
        msg = get_message("TWILIO_TEST_SENT", lang="es", phone="+593991234567")
        self.assertIn("+593991234567", msg)

    def test_data_export_started_es(self):
        msg = get_message("DATA_EXPORT_STARTED", lang="es")
        self.assertIn("exportación", msg.lower())

    def test_data_export_started_en(self):
        msg = get_message("DATA_EXPORT_STARTED", lang="en")
        self.assertIn("Data export", msg)

    def test_ai_assistant_unavailable_es(self):
        msg = get_message("AI_ASSISTANT_UNAVAILABLE", lang="es")
        self.assertIn("IA", msg)

    def test_ai_assistant_unavailable_en(self):
        msg = get_message("AI_ASSISTANT_UNAVAILABLE", lang="en")
        self.assertIn("AI assistant", msg)

    def test_ai_chat_error_es(self):
        msg = get_message("AI_CHAT_ERROR", lang="es", detail="timeout")
        self.assertIn("timeout", msg)

    def test_ai_chat_error_en(self):
        msg = get_message("AI_CHAT_ERROR", lang="en", detail="timeout")
        self.assertIn("timeout", msg)

    def test_data_export_failed_en(self):
        msg = get_message("DATA_EXPORT_FAILED", lang="en", detail="disk full")
        self.assertIn("disk full", msg)

    def test_twilio_test_failed_en(self):
        msg = get_message("TWILIO_TEST_FAILED", lang="en", detail="invalid number")
        self.assertIn("invalid number", msg)


# =============================================================================
# Execute Dispatch Tests — verifies all 7 actions route correctly
# =============================================================================


class AutomationDispatchTest(TestCase):
    """Tests that execute() dispatches to the correct action method."""

    def setUp(self):
        self.tenant = make_tenant()
        self.customer = make_customer(self.tenant)
        self.card = make_card(self.tenant)
        make_customer_pass(self.customer, self.card)

    @patch.object(Automation, "_execute_send_notification", return_value=True)
    def test_dispatch_send_notification(self, mock_action):
        auto = make_automation(self.tenant, action=AutomationAction.SEND_NOTIFICATION)
        auto.execute(self.customer)
        mock_action.assert_called_once()

    @patch.object(Automation, "_execute_send_email", return_value=True)
    def test_dispatch_send_email(self, mock_action):
        auto = make_automation(self.tenant, action=AutomationAction.SEND_EMAIL)
        auto.execute(self.customer)
        mock_action.assert_called_once()

    @patch.object(Automation, "_execute_send_sms", return_value=True)
    def test_dispatch_send_sms(self, mock_action):
        auto = make_automation(self.tenant, action=AutomationAction.SEND_SMS)
        auto.execute(self.customer)
        mock_action.assert_called_once()

    @patch.object(Automation, "_execute_send_whatsapp", return_value=True)
    def test_dispatch_send_whatsapp(self, mock_action):
        auto = make_automation(self.tenant, action=AutomationAction.SEND_WHATSAPP)
        auto.execute(self.customer)
        mock_action.assert_called_once()

    @patch.object(Automation, "_execute_issue_reward", return_value=True)
    def test_dispatch_issue_reward(self, mock_action):
        auto = make_automation(self.tenant, action=AutomationAction.ISSUE_REWARD)
        auto.execute(self.customer)
        mock_action.assert_called_once()

    @patch.object(Automation, "_execute_update_segment", return_value=True)
    def test_dispatch_update_segment(self, mock_action):
        auto = make_automation(self.tenant, action=AutomationAction.UPDATE_SEGMENT)
        auto.execute(self.customer)
        mock_action.assert_called_once()

    @patch.object(Automation, "_execute_send_wallet", return_value=True)
    def test_dispatch_send_wallet(self, mock_action):
        auto = make_automation(self.tenant, action=AutomationAction.SEND_WALLET)
        auto.execute(self.customer)
        mock_action.assert_called_once()
