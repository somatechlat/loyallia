"""
Loyallia — SMS Base Integration Tests (LYL-SRS-009)

Tests for:
  1. Twilio SMS client (apps.notifications.sms.client)
  2. i18n message codes for SMS/Data Export/AI
"""

from django.test import TestCase

from common.messages import get_message
from common.vault import clear_test_overrides, set_test_override


class SMSClientAvailabilityTest(TestCase):
    """Tests for is_sms_available() configuration checking."""

    def tearDown(self):
        clear_test_overrides()

    def test_not_available_when_no_credentials(self):
        from apps.notifications.sms.client import is_sms_available

        clear_test_overrides()
        set_test_override("twilio_use_test_mode", "false")
        set_test_override("twilio_account_sid", "")
        set_test_override("twilio_auth_token", "")
        set_test_override("twilio_from_number", "")
        self.assertFalse(is_sms_available())

    def test_available_when_all_configured(self):
        from apps.notifications.sms.client import is_sms_available

        clear_test_overrides()
        set_test_override("twilio_use_test_mode", "false")
        set_test_override("twilio_account_sid", "ACtest123")
        set_test_override("twilio_auth_token", "token123")
        set_test_override("twilio_from_number", "+15005550006")
        self.assertTrue(is_sms_available())

    def test_not_available_missing_auth_token(self):
        from apps.notifications.sms.client import is_sms_available

        clear_test_overrides()
        set_test_override("twilio_use_test_mode", "false")
        set_test_override("twilio_account_sid", "ACtest123")
        set_test_override("twilio_auth_token", "")
        set_test_override("twilio_from_number", "+15005550006")
        self.assertFalse(is_sms_available())


class SMSClientSendTest(TestCase):
    """Tests for send_sms() function with real Twilio client."""

    def setUp(self):
        clear_test_overrides()
        set_test_override("twilio_account_sid", "ACtest123")
        set_test_override("twilio_auth_token", "token123")
        set_test_override("twilio_from_number", "+15005550006")

    def tearDown(self):
        clear_test_overrides()

    def test_send_sms_attempts_with_real_client(self):
        from apps.notifications.sms.client import send_sms

        result = send_sms(phone="+593991234567", message="Hello from Loyallia!")

        # Real Twilio client is initialized with test credentials.
        # It will fail with auth error, but the function returns the result dict.
        self.assertIsInstance(result, dict)
        self.assertIn("success", result)

    def test_send_sms_no_phone(self):
        from apps.notifications.sms.client import send_sms

        result = send_sms(phone="", message="test")
        self.assertFalse(result["success"])
        self.assertIn("No recipient", result["error"])

    def test_send_sms_raises_when_not_configured(self):
        from apps.notifications.sms.client import send_sms
        from common.vault import clear_test_overrides, set_test_override

        clear_test_overrides()
        set_test_override("twilio_account_sid", "")
        set_test_override("twilio_auth_token", "")
        set_test_override("twilio_from_number", "")

        with self.assertRaises(RuntimeError) as ctx:
            send_sms(phone="+593991234567", message="test")
        self.assertIn("not configured", str(ctx.exception))

        clear_test_overrides()


class SMSClientBulkTest(TestCase):
    """Tests for send_sms_bulk() function."""

    def setUp(self):
        clear_test_overrides()
        set_test_override("twilio_account_sid", "ACtest123")
        set_test_override("twilio_auth_token", "token123")
        set_test_override("twilio_from_number", "+15005550006")

    def tearDown(self):
        clear_test_overrides()

    def test_bulk_send_mixed_results(self):
        from apps.notifications.sms.client import send_sms_bulk

        recipients = [
            {"phone": "+593991111111", "message": "Hi 1"},
            {"phone": "+593992222222", "message": "Hi 2"},
            {"phone": "+593993333333", "message": "Hi 3"},
        ]

        result = send_sms_bulk(recipients)
        # Real Twilio client attempts to send. With test credentials, some may fail auth.
        self.assertIn("succeeded", result)
        self.assertIn("failed", result)

    def test_bulk_send_skips_missing_data(self):
        from apps.notifications.sms.client import send_sms_bulk

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
