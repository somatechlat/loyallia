"""
Loyallia — SMS Base Integration Tests (LYL-SRS-009)

Tests for:
  1. Twilio SMS client (apps.notifications.sms.client)
  2. i18n message codes for SMS/Data Export/AI
"""

from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from common.messages import get_message


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
