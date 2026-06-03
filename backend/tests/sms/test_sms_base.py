"""
Loyallia SMS Base Integration Tests

Tests for:
  1. Twilio SMS client (apps.notifications.sms.client)
  2. i18n message codes for SMS/Data Export/AI

SECURITY: Twilio credentials are SYSTEM secrets stored in Vault.
No fake credentials. Tests skip if Vault credentials are unavailable.
"""

from django.test import TestCase

from common.messages import get_message
from common.vault import get_secret


def _get_twilio_test_credentials():
    """Fetch Twilio credentials that the code will ACTUALLY use. Returns dict or None."""
    from_number = get_secret("twilio_from_number")
    if not from_number:
        return None

    use_test = (get_secret("twilio_use_test_mode") or "").strip().lower() in {"1", "true", "yes", "on"}
    if use_test:
        sid = get_secret("twilio_test_account_sid")
        token = get_secret("twilio_test_auth_token")
    else:
        sid = get_secret("twilio_account_sid")
        token = get_secret("twilio_auth_token")

    if sid and token and from_number:
        return {"sid": sid, "token": token, "from": from_number}
    return None


class SMSClientAvailabilityTest(TestCase):
    """Tests for is_sms_available() with real Vault state."""

    def test_available_when_credentials_present(self):
        """If Vault has Twilio credentials, SMS is available."""
        from apps.notifications.sms.client import is_sms_available

        creds = _get_twilio_test_credentials()
        if not creds:
            self.skipTest("Twilio credentials not available in Vault")
        self.assertTrue(is_sms_available())


class SMSClientSendTest(TestCase):
    """Tests for send_sms() function with real Twilio client."""

    def test_send_sms_with_real_client(self):
        """Send SMS using real Twilio client with Vault credentials."""
        creds = _get_twilio_test_credentials()
        if not creds:
            self.skipTest("Twilio credentials not available in Vault")

        from apps.notifications.sms.client import send_sms

        result = send_sms(phone="+593991234567", message="Hello from Loyallia!")
        self.assertIsInstance(result, dict)
        self.assertIn("success", result)

    def test_send_sms_no_phone(self):
        """Empty phone should fail without calling Twilio."""
        from apps.notifications.sms.client import send_sms

        result = send_sms(phone="", message="test")
        self.assertFalse(result["success"])
        self.assertIn("No recipient", result["error"])


class SMSClientBulkTest(TestCase):
    """Tests for send_sms_bulk() function."""

    def test_bulk_send_mixed_results(self):
        creds = _get_twilio_test_credentials()
        if not creds:
            self.skipTest("Twilio credentials not available in Vault")

        from apps.notifications.sms.client import send_sms_bulk

        recipients = [
            {"phone": "+593991111111", "message": "Hi 1"},
            {"phone": "+593992222222", "message": "Hi 2"},
            {"phone": "+593993333333", "message": "Hi 3"},
        ]

        result = send_sms_bulk(recipients)
        self.assertIn("succeeded", result)
        self.assertIn("failed", result)


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
