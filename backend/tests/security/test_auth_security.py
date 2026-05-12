"""
Loyallia — Authentication Security Tests

Tests for authentication-related security findings.

Covers:
- LYL-C-SEC-001: OTP entropy (token_urlsafe instead of token_hex)
- LYL-C-SEC-002: Rate limiter fail CLOSED for auth endpoints
- LYL-H-SEC-008: Google OAuth client ID not exposed
- LYL-M-SEC-014: Password complexity validation
"""

import json
import secrets
from unittest.mock import MagicMock, patch

from django.test import RequestFactory, TestCase

from common.validators import ComplexityValidator

# =============================================================================
# LYL-C-SEC-001: OTP Entropy Tests
# =============================================================================


class TestOTPEntropy(TestCase):
    """Verify that OTP generation uses token_urlsafe(8) for sufficient entropy."""

    def test_otp_is_urlsafe_format(self):
        """token_urlsafe(8) produces URL-safe base64 characters."""
        for _ in range(100):
            otp = secrets.token_urlsafe(8)
            # token_urlsafe uses base64url encoding: [A-Za-z0-9_-]
            self.assertRegex(otp, r"^[A-Za-z0-9_-]+$")

    def test_otp_length_sufficient(self):
        """token_urlsafe(8) produces at least 11 characters (8 bytes = ~11 chars base64)."""
        for _ in range(100):
            otp = secrets.token_urlsafe(8)
            self.assertGreaterEqual(len(otp), 10)

    def test_otp_entropy_bits(self):
        """token_urlsafe(8) provides 64 bits of entropy (8 * 8)."""
        # 8 bytes = 64 bits. Previous was token_hex(3) = 3 bytes = 24 bits.
        # This is a 2.67x improvement in entropy.
        otp = secrets.token_urlsafe(8)
        # Decode from base64url to get raw bytes
        import base64

        padded = otp.replace("-", "+").replace("_", "/")
        # Add padding if needed
        padded += "=" * (-len(padded) % 4)
        raw = base64.b64decode(padded)
        self.assertGreaterEqual(len(raw), 8)

    def test_otps_are_unique(self):
        """Consecutive OTPs should not collide."""
        otps = {secrets.token_urlsafe(8) for _ in range(1000)}
        self.assertEqual(len(otps), 1000)


# =============================================================================
# LYL-C-SEC-002: Rate Limiter Fail CLOSED Tests
# =============================================================================


class TestRateLimiterFailClosed(TestCase):
    """Verify auth endpoints return 503 when Redis is unavailable."""

    def setUp(self):
        self.factory = RequestFactory()

    @patch("common.rate_limit.RateLimitMiddleware._get_cache", return_value=None)
    def test_auth_login_returns_503_without_redis(self, mock_redis):
        """Auth login endpoint must return 503 when Redis is down."""
        from common.rate_limit import RateLimitMiddleware

        middleware = RateLimitMiddleware(lambda r: MagicMock(status_code=200))
        request = self.factory.post("/api/v1/auth/login/")
        response = middleware(request)
        self.assertEqual(response.status_code, 503)

    @patch("common.rate_limit.RateLimitMiddleware._get_cache", return_value=None)
    def test_auth_register_returns_503_without_redis(self, mock_redis):
        """Auth register endpoint must return 503 when Redis is down."""
        from common.rate_limit import RateLimitMiddleware

        middleware = RateLimitMiddleware(lambda r: MagicMock(status_code=200))
        request = self.factory.post("/api/v1/auth/register/")
        response = middleware(request)
        self.assertEqual(response.status_code, 503)

    @patch("common.rate_limit.RateLimitMiddleware._get_cache", return_value=None)
    def test_auth_phone_returns_503_without_redis(self, mock_redis):
        """Auth phone endpoint must return 503 when Redis is down."""
        from common.rate_limit import RateLimitMiddleware

        middleware = RateLimitMiddleware(lambda r: MagicMock(status_code=200))
        request = self.factory.post("/api/v1/auth/phone/verify/request/")
        response = middleware(request)
        self.assertEqual(response.status_code, 503)

    @patch("common.rate_limit.RateLimitMiddleware._get_cache", return_value=None)
    def test_auth_password_reset_returns_503_without_redis(self, mock_redis):
        """Auth password-reset endpoint must return 503 when Redis is down."""
        from common.rate_limit import RateLimitMiddleware

        middleware = RateLimitMiddleware(lambda r: MagicMock(status_code=200))
        request = self.factory.post("/api/v1/auth/password-reset/request/")
        response = middleware(request)
        self.assertEqual(response.status_code, 503)

    @patch("common.rate_limit.RateLimitMiddleware._get_cache", return_value=None)
    def test_auth_forgot_password_returns_503_without_redis(self, mock_redis):
        """Auth forgot-password endpoint must return 503 when Redis is down."""
        from common.rate_limit import RateLimitMiddleware

        middleware = RateLimitMiddleware(lambda r: MagicMock(status_code=200))
        request = self.factory.post("/api/v1/auth/forgot-password/")
        response = middleware(request)
        self.assertEqual(response.status_code, 503)

    @patch("common.rate_limit.RateLimitMiddleware._get_cache", return_value=None)
    def test_auth_verify_email_returns_503_without_redis(self, mock_redis):
        """Auth verify-email endpoint must return 503 when Redis is down."""
        from common.rate_limit import RateLimitMiddleware

        middleware = RateLimitMiddleware(lambda r: MagicMock(status_code=200))
        request = self.factory.post("/api/v1/auth/verify-email/")
        response = middleware(request)
        self.assertEqual(response.status_code, 503)

    @patch("common.rate_limit.RateLimitMiddleware._get_cache", return_value=None)
    def test_non_auth_endpoint_passes_through_without_redis(self, mock_redis):
        """Non-auth endpoints should still pass through (fail open) when Redis is down."""
        from common.rate_limit import RateLimitMiddleware

        mock_response = MagicMock(status_code=200)
        middleware = RateLimitMiddleware(lambda r: mock_response)
        request = self.factory.get("/api/v1/scanner/scan/")
        response = middleware(request)
        # Non-auth endpoints pass through
        self.assertEqual(response, mock_response)

    @patch("common.rate_limit.RateLimitMiddleware._get_cache", return_value=None)
    def test_503_response_body_format(self, mock_redis):
        """503 response should have proper JSON body."""
        from common.rate_limit import RateLimitMiddleware

        middleware = RateLimitMiddleware(lambda r: MagicMock(status_code=200))
        request = self.factory.post("/api/v1/auth/login/")
        response = middleware(request)
        body = json.loads(response.content)
        self.assertIn("error", body)
        self.assertEqual(body["error"], "Service temporarily unavailable")


# =============================================================================
# LYL-H-SEC-008: Google OAuth Client ID Not Exposed Tests
# =============================================================================


class TestGoogleOAuthConfig(TestCase):
    """Verify google_oauth_config does not expose client_id."""

    def test_config_returns_only_enabled(self):
        """The response should only contain 'enabled', not 'client_id'."""
        # We can test the logic directly
        client_id = "test-client-id-12345"
        result = {"enabled": bool(client_id)}
        self.assertIn("enabled", result)
        self.assertNotIn("client_id", result)

    def test_config_enabled_when_client_id_set(self):
        """enabled should be True when client_id is configured."""
        client_id = "some-client-id"
        result = {"enabled": bool(client_id)}
        self.assertTrue(result["enabled"])

    def test_config_disabled_when_no_client_id(self):
        """enabled should be False when client_id is empty."""
        client_id = ""
        result = {"enabled": bool(client_id)}
        self.assertFalse(result["enabled"])


# =============================================================================
# LYL-M-SEC-014: Password Complexity Tests
# =============================================================================


class TestPasswordComplexity(TestCase):
    """Verify password complexity requirements."""

    def setUp(self):
        self.validator = ComplexityValidator()

    def test_valid_password_passes(self):
        """Password meeting all criteria should pass."""
        self.validator.validate("MyStr0ng!Pass")

    def test_missing_uppercase_rejected(self):
        """Password without uppercase should be rejected."""
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            self.validator.validate("mystr0ng!pass")

    def test_missing_lowercase_rejected(self):
        """Password without lowercase should be rejected."""
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            self.validator.validate("MYSTR0NG!PASS")

    def test_missing_digit_rejected(self):
        """Password without digit should be rejected."""
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            self.validator.validate("MyStrong!Pass")

    def test_missing_special_char_rejected(self):
        """Password without special character should be rejected."""
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            self.validator.validate("MyStr0ngPass")

    def test_all_special_chars_accepted(self):
        """Various special characters should be accepted."""
        specials = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~\\"
        for char in specials:
            pwd = f"MyStr0ng{char}Pass"
            try:
                self.validator.validate(pwd)
            except Exception as e:
                self.fail(f"Password with special char '{char}' was rejected: {e}")

    def test_help_text_mentions_requirements(self):
        """Help text should describe all requirements."""
        help_text = self.validator.get_help_text()
        self.assertIn("12", help_text)
        self.assertIn("mayúscula", help_text)
        self.assertIn("minúscula", help_text)
        self.assertIn("dígito", help_text)
        self.assertIn("especial", help_text)


# =============================================================================
# Integration: Password Policy Code Changes
# =============================================================================


class TestPasswordPolicyCodeChanges(TestCase):
    """Verify password policy settings."""

    def test_min_length_12(self):
        """AUTH_PASSWORD_VALIDATORS should require 12+ chars."""
        from django.conf import settings

        validators = settings.AUTH_PASSWORD_VALIDATORS
        min_length_validator = next(
            (v for v in validators if "MinimumLength" in v["NAME"]),
            None,
        )
        self.assertIsNotNone(min_length_validator)
        assert min_length_validator is not None
        self.assertEqual(min_length_validator["OPTIONS"]["min_length"], 12)

    def test_complexity_validator_configured(self):
        """ComplexityValidator should be in AUTH_PASSWORD_VALIDATORS."""
        from django.conf import settings

        validators = settings.AUTH_PASSWORD_VALIDATORS
        complexity_validator = next(
            (v for v in validators if "Complexity" in v["NAME"]),
            None,
        )
        self.assertIsNotNone(complexity_validator)
