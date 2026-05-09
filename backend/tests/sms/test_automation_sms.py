"""
Loyallia — Automation SMS Integration Tests (LYL-SRS-009)

Tests for:
  1. Automation action hardening (send_email, send_sms, send_wallet)
  2. Automation choices and dispatch
"""

from unittest.mock import MagicMock, patch

from django.test import TestCase

from common.vault import clear_test_overrides, set_test_override

from apps.automation.models import (
    Automation,
    AutomationAction,
    AutomationTrigger,
)
from tests.factories import (
    make_automation,
    make_card,
    make_customer,
    make_customer_pass,
    make_tenant,
)


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
        clear_test_overrides()
        set_test_override("twilio_account_sid", "ACtest")
        set_test_override("twilio_auth_token", "tok")
        set_test_override("twilio_from_number", "+15005550006")

    def tearDown(self):
        clear_test_overrides()

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

    def test_send_sms_not_configured_returns_false(self):
        clear_test_overrides()
        set_test_override("twilio_account_sid", "")
        set_test_override("twilio_auth_token", "")
        set_test_override("twilio_from_number", "")

        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_SMS,
            action_config={"message": "Test"},
        )
        result = auto._execute_send_sms(self.customer, {})
        self.assertFalse(result)

        clear_test_overrides()


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
