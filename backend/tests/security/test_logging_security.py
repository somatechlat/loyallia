"""
Logging Security Tests

Verifies PII masking and secret-pattern masking in log output.
LYL-SEC-004: Defense-in-depth against accidental secret logging.

All test values are clearly fake placeholder strings, not real credentials.
"""

from django.test import TestCase

from common.logging_utils import JsonFormatter, mask_pii


class TestPIIMasking(TestCase):
    """Verify PII masking covers emails and phone numbers."""

    def test_mask_email(self):
        result = mask_pii("User john@example.com logged in")
        self.assertIn("***@example.com", result)
        self.assertNotIn("john@", result)

    def test_mask_phone(self):
        result = mask_pii("Call +593991234567 for info")
        self.assertIn("***", result)
        self.assertNotIn("1234567", result)

    def test_mask_multiple_emails(self):
        result = mask_pii("From alice@x.com to bob@y.com")
        self.assertNotIn("alice@", result)
        self.assertNotIn("bob@", result)


class TestSecretPatternMasking(TestCase):
    """Verify secret-pattern masking catches API keys, tokens, JWTs, hex strings."""

    def test_mask_openai_key(self):
        # Use a clearly fake key pattern
        result = mask_pii("Using key sk-fakeFAKEfakeFAKEfakeFAKEfakeFAKEfake")
        self.assertIn("***", result)
        # The key should be partially masked (first 11 chars preserved)
        self.assertNotIn("fakeFAKEfakeFAKEfake", result.split("***")[1] if "***" in result else "")

    def test_mask_loyallia_agent_key(self):
        # Use a clearly fake agent key pattern
        result = mask_pii("Agent key: lyl_fakeFAKEfakeFAKEfakeFAKEfakeFAKEfake")
        self.assertIn("***", result)
        self.assertNotIn("fakeFAKEfakeFAKEfake", result.split("***")[1] if "***" in result else "")

    def test_mask_twilio_account_sid(self):
        # Use a clearly fake SID pattern (not a real Twilio SID)
        result = mask_pii("Twilio SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
        self.assertIn("***", result)
        # The SID should be partially masked (first 10 chars preserved)
        self.assertIn("ACxxxxxxxx", result)

    def test_mask_bearer_token(self):
        # Use a clearly fake JWT-like token
        result = mask_pii("Authorization: Bearer FAKEpayloadFAKEpayloadFAKEpayloadFAKE")
        self.assertIn("***", result)

    def test_mask_jwt_token(self):
        # Use a clearly fake JWT
        result = mask_pii("Token: FAKEjwtFAKEjwtFAKEjwtFAKEjwtFAKEjwtFAKEjwtFAKEjwt")
        self.assertIn("***", result)

    def test_mask_long_hex_string(self):
        # Use a clearly fake hex string
        result = mask_pii("Hash: deadbeef0000deadbeef0000deadbeef0000deadbeef0000")
        self.assertIn("***", result)

    def test_no_mask_short_hex(self):
        """Short hex strings (< 32 chars) should NOT be masked."""
        result = mask_pii("Color: #ff00ff")
        self.assertIn("#ff00ff", result)

    def test_mask_preserves_normal_text(self):
        result = mask_pii("Customer John Doe purchased item #12345")
        self.assertIn("John Doe", result)
        self.assertIn("#12345", result)


class TestJsonFormatterSecretMasking(TestCase):
    """Verify JsonFormatter applies secret masking to log records."""

    def test_formatter_masks_api_key_in_message(self):
        import logging

        formatter = JsonFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="Connecting with key sk-fakeFAKEfakeFAKEfakeFAKEfakeFAKEfake",
            args=(),
            exc_info=None,
        )
        output = formatter.format(record)
        self.assertIn("***", output)
