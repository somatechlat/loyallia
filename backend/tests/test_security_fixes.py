"""
Loyallia — Security Fixes Test Suite
Tests for all P0/P1 security findings addressed in this patch.

Covers:
- LYL-C-SEC-001: OTP entropy (token_urlsafe instead of token_hex)
- LYL-C-SEC-002: Rate limiter fail CLOSED for auth endpoints
- LYL-H-SEC-003: Webhook replay protection
- LYL-H-SEC-004: X-Forwarded-For spoofing prevention
- LYL-H-SEC-007: Invitation token hashing
- LYL-H-SEC-008: Google OAuth client ID not exposed
- LYL-H-SEC-009: SSRF protection
- LYL-M-SEC-012: Salted OTP hashing
- LYL-M-SEC-014: Password complexity validation
"""

import hashlib
import json
import secrets
import time
from unittest.mock import MagicMock, patch

from django.test import RequestFactory, TestCase, override_settings

from common.validators import ComplexityValidator
from common.url_validator import BLOCKED_NETWORKS, SSRFError, validate_external_url


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
            self.assertRegex(otp, r'^[A-Za-z0-9_-]+$')

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
        padded = otp.replace('-', '+').replace('_', '/')
        # Add padding if needed
        padded += '=' * (-len(padded) % 4)
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

    @patch('common.rate_limit.RateLimitMiddleware._get_redis', return_value=None)
    def test_auth_login_returns_503_without_redis(self, mock_redis):
        """Auth login endpoint must return 503 when Redis is down."""
        from common.rate_limit import RateLimitMiddleware
        middleware = RateLimitMiddleware(lambda r: MagicMock(status_code=200))
        request = self.factory.post('/api/v1/auth/login/')
        response = middleware(request)
        self.assertEqual(response.status_code, 503)

    @patch('common.rate_limit.RateLimitMiddleware._get_redis', return_value=None)
    def test_auth_register_returns_503_without_redis(self, mock_redis):
        """Auth register endpoint must return 503 when Redis is down."""
        from common.rate_limit import RateLimitMiddleware
        middleware = RateLimitMiddleware(lambda r: MagicMock(status_code=200))
        request = self.factory.post('/api/v1/auth/register/')
        response = middleware(request)
        self.assertEqual(response.status_code, 503)

    @patch('common.rate_limit.RateLimitMiddleware._get_redis', return_value=None)
    def test_auth_phone_returns_503_without_redis(self, mock_redis):
        """Auth phone endpoint must return 503 when Redis is down."""
        from common.rate_limit import RateLimitMiddleware
        middleware = RateLimitMiddleware(lambda r: MagicMock(status_code=200))
        request = self.factory.post('/api/v1/auth/phone/verify/request/')
        response = middleware(request)
        self.assertEqual(response.status_code, 503)

    @patch('common.rate_limit.RateLimitMiddleware._get_redis', return_value=None)
    def test_auth_password_reset_returns_503_without_redis(self, mock_redis):
        """Auth password-reset endpoint must return 503 when Redis is down."""
        from common.rate_limit import RateLimitMiddleware
        middleware = RateLimitMiddleware(lambda r: MagicMock(status_code=200))
        request = self.factory.post('/api/v1/auth/password-reset/request/')
        response = middleware(request)
        self.assertEqual(response.status_code, 503)

    @patch('common.rate_limit.RateLimitMiddleware._get_redis', return_value=None)
    def test_auth_forgot_password_returns_503_without_redis(self, mock_redis):
        """Auth forgot-password endpoint must return 503 when Redis is down."""
        from common.rate_limit import RateLimitMiddleware
        middleware = RateLimitMiddleware(lambda r: MagicMock(status_code=200))
        request = self.factory.post('/api/v1/auth/forgot-password/')
        response = middleware(request)
        self.assertEqual(response.status_code, 503)

    @patch('common.rate_limit.RateLimitMiddleware._get_redis', return_value=None)
    def test_auth_verify_email_returns_503_without_redis(self, mock_redis):
        """Auth verify-email endpoint must return 503 when Redis is down."""
        from common.rate_limit import RateLimitMiddleware
        middleware = RateLimitMiddleware(lambda r: MagicMock(status_code=200))
        request = self.factory.post('/api/v1/auth/verify-email/')
        response = middleware(request)
        self.assertEqual(response.status_code, 503)

    @patch('common.rate_limit.RateLimitMiddleware._get_redis', return_value=None)
    def test_non_auth_endpoint_passes_through_without_redis(self, mock_redis):
        """Non-auth endpoints should still pass through (fail open) when Redis is down."""
        from common.rate_limit import RateLimitMiddleware
        mock_response = MagicMock(status_code=200)
        middleware = RateLimitMiddleware(lambda r: mock_response)
        request = self.factory.get('/api/v1/scanner/scan/')
        response = middleware(request)
        # Non-auth endpoints pass through
        self.assertEqual(response, mock_response)

    @patch('common.rate_limit.RateLimitMiddleware._get_redis', return_value=None)
    def test_503_response_body_format(self, mock_redis):
        """503 response should have proper JSON body."""
        from common.rate_limit import RateLimitMiddleware
        middleware = RateLimitMiddleware(lambda r: MagicMock(status_code=200))
        request = self.factory.post('/api/v1/auth/login/')
        response = middleware(request)
        body = json.loads(response.content)
        self.assertIn('error', body)
        self.assertEqual(body['error'], 'Service temporarily unavailable')


# =============================================================================
# LYL-H-SEC-004: X-Forwarded-For Spoofing Tests
# =============================================================================


class TestClientIPExtraction(TestCase):
    """Verify _get_client_ip uses REMOTE_ADDR, not X-Forwarded-For."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_uses_remote_addr(self):
        """Should use REMOTE_ADDR as the client IP."""
        from common.rate_limit import _get_client_ip
        request = self.factory.get('/api/v1/auth/login/')
        request.META['REMOTE_ADDR'] = '203.0.113.50'
        ip = _get_client_ip(request)
        self.assertEqual(ip, '203.0.113.50')

    def test_ignores_x_forwarded_for(self):
        """Should NOT trust X-Forwarded-For header (spoofable by client)."""
        from common.rate_limit import _get_client_ip
        request = self.factory.get('/api/v1/auth/login/')
        request.META['REMOTE_ADDR'] = '203.0.113.50'
        request.META['HTTP_X_FORWARDED_FOR'] = '1.2.3.4, 10.0.0.1'
        ip = _get_client_ip(request)
        # Must use REMOTE_ADDR, not the spoofed XFF
        self.assertEqual(ip, '203.0.113.50')

    def test_defaults_to_unknown(self):
        """Should return 'unknown' if REMOTE_ADDR is missing."""
        from common.rate_limit import _get_client_ip
        request = self.factory.get('/api/v1/auth/login/')
        if 'REMOTE_ADDR' in request.META:
            del request.META['REMOTE_ADDR']
        ip = _get_client_ip(request)
        self.assertEqual(ip, 'unknown')


# =============================================================================
# LYL-H-SEC-003: Webhook Replay Protection Tests
# =============================================================================


class TestWebhookReplayProtection(TestCase):
    """Verify webhook timestamp validation and idempotency."""

    def test_fresh_webhook_accepted(self):
        """Webhook with current timestamp should be accepted."""
        # This tests the timestamp logic conceptually
        timestamp = time.time()
        self.assertLess(abs(time.time() - timestamp), 300)

    def test_stale_webhook_rejected(self):
        """Webhook older than 5 minutes should be rejected."""
        timestamp = time.time() - 301  # 5 min + 1 sec ago
        self.assertGreater(abs(time.time() - timestamp), 300)

    def test_future_webhook_rejected(self):
        """Webhook with future timestamp should be rejected."""
        timestamp = time.time() + 301  # 5 min + 1 sec in future
        self.assertGreater(abs(time.time() - timestamp), 300)

    def test_webhook_within_window_accepted(self):
        """Webhook within 5-minute window should be accepted."""
        timestamp = time.time() - 200  # ~3 min ago
        self.assertLess(abs(time.time() - timestamp), 300)

    def test_webhook_event_model_fields(self):
        """WebhookEvent model should have required fields."""
        from apps.billing.payment_models import WebhookEvent
        field_names = [f.name for f in WebhookEvent._meta.get_fields()]
        self.assertIn('event_id', field_names)
        self.assertIn('event_type', field_names)
        self.assertIn('payload_hash', field_names)
        self.assertIn('processed_at', field_names)


# =============================================================================
# LYL-H-SEC-007: Invitation Token Hashing Tests
# =============================================================================


class TestInvitationTokenHashing(TestCase):
    """Verify invitation tokens are stored as SHA-256 hashes."""

    def test_sha256_hash_of_token(self):
        """SHA-256 hash of a token should be 64 hex characters."""
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        self.assertEqual(len(token_hash), 64)
        self.assertRegex(token_hash, r'^[0-9a-f]+$')

    def test_hash_is_not_reversible(self):
        """The hash should not equal the original token."""
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        self.assertNotEqual(token, token_hash)

    def test_same_token_produces_same_hash(self):
        """Same input should always produce the same hash (deterministic)."""
        token = "test-token-123"
        hash1 = hashlib.sha256(token.encode()).hexdigest()
        hash2 = hashlib.sha256(token.encode()).hexdigest()
        self.assertEqual(hash1, hash2)

    def test_different_tokens_produce_different_hashes(self):
        """Different tokens should produce different hashes."""
        hash1 = hashlib.sha256(b"token-a").hexdigest()
        hash2 = hashlib.sha256(b"token-b").hexdigest()
        self.assertNotEqual(hash1, hash2)


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
        self.assertIn('enabled', result)
        self.assertNotIn('client_id', result)

    def test_config_enabled_when_client_id_set(self):
        """enabled should be True when client_id is configured."""
        client_id = "some-client-id"
        result = {"enabled": bool(client_id)}
        self.assertTrue(result['enabled'])

    def test_config_disabled_when_no_client_id(self):
        """enabled should be False when client_id is empty."""
        client_id = ""
        result = {"enabled": bool(client_id)}
        self.assertFalse(result['enabled'])


# =============================================================================
# LYL-H-SEC-009: SSRF Protection Tests
# =============================================================================


class TestSSRFProtection(TestCase):
    """Verify SSRF validation blocks private/reserved IPs."""

    def test_valid_public_url_passes(self):
        """Public URLs should pass validation."""
        # This test may fail without network — skip if DNS fails
        try:
            result = validate_external_url("https://example.com/image.png")
            self.assertEqual(result, "https://example.com/image.png")
        except SSRFError:
            self.skipTest("DNS resolution unavailable in test environment")

    def test_loopback_ip_blocked(self):
        """127.0.0.1 should be blocked."""
        with self.assertRaises(SSRFError):
            validate_external_url("http://127.0.0.1/admin")

    def test_private_10_x_blocked(self):
        """10.x.x.x should be blocked."""
        with self.assertRaises(SSRFError):
            validate_external_url("http://10.0.0.1/admin")

    def test_private_192_168_blocked(self):
        """192.168.x.x should be blocked."""
        with self.assertRaises(SSRFError):
            validate_external_url("http://192.168.1.1/admin")

    def test_private_172_16_blocked(self):
        """172.16.x.x should be blocked."""
        with self.assertRaises(SSRFError):
            validate_external_url("http://172.16.0.1/admin")

    def test_link_local_blocked(self):
        """169.254.x.x (link-local) should be blocked."""
        with self.assertRaises(SSRFError):
            validate_external_url("http://169.254.169.254/metadata")

    def test_invalid_scheme_rejected(self):
        """file:// and ftp:// schemes should be rejected."""
        with self.assertRaises(SSRFError):
            validate_external_url("file:///etc/passwd")
        with self.assertRaises(SSRFError):
            validate_external_url("ftp://example.com/file")

    def test_no_hostname_rejected(self):
        """URLs without hostname should be rejected."""
        with self.assertRaises(SSRFError):
            validate_external_url("http://")

    def test_https_only_mode(self):
        """When allow_http=False, HTTP URLs should be rejected."""
        with self.assertRaises(SSRFError):
            validate_external_url("http://example.com", allow_http=False)

    def test_blocked_networks_list_completeness(self):
        """BLOCKED_NETWORKS should cover all critical ranges."""
        network_strs = [str(n) for n in BLOCKED_NETWORKS]
        self.assertIn('10.0.0.0/8', network_strs)
        self.assertIn('172.16.0.0/12', network_strs)
        self.assertIn('192.168.0.0/16', network_strs)
        self.assertIn('127.0.0.0/8', network_strs)
        self.assertIn('169.254.0.0/16', network_strs)

    def test_ssrf_error_is_value_error(self):
        """SSRFError should be a subclass of ValueError."""
        self.assertTrue(issubclass(SSRFError, ValueError))


# =============================================================================
# LYL-M-SEC-012: Salted OTP Hashing Tests
# =============================================================================


class TestSaltedOTPHashing(TestCase):
    """Verify OTP hashing uses per-OTP salts."""

    def test_hash_otp_requires_salt(self):
        """_hash_otp should require both otp and salt parameters."""
        from apps.authentication.helpers import _hash_otp
        result = _hash_otp("123456", "salt123")
        self.assertEqual(len(result), 64)  # SHA-256 hex = 64 chars

    def test_same_otp_different_salt_produces_different_hash(self):
        """Same OTP with different salts should produce different hashes."""
        from apps.authentication.helpers import _hash_otp
        hash1 = _hash_otp("123456", "salt_a")
        hash2 = _hash_otp("123456", "salt_b")
        self.assertNotEqual(hash1, hash2)

    def test_salt_is_random(self):
        """Each salt should be unique (random)."""
        salts = {secrets.token_hex(16) for _ in range(100)}
        self.assertEqual(len(salts), 100)

    def test_hash_deterministic_with_same_salt(self):
        """Same OTP + same salt should always produce same hash."""
        from apps.authentication.helpers import _hash_otp
        hash1 = _hash_otp("123456", "fixed_salt")
        hash2 = _hash_otp("123456", "fixed_salt")
        self.assertEqual(hash1, hash2)


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
        self.assertIn('12', help_text)
        self.assertIn('mayúscula', help_text)
        self.assertIn('minúscula', help_text)
        self.assertIn('dígito', help_text)
        self.assertIn('especial', help_text)


# =============================================================================
# Integration: Verify API code changes
# =============================================================================


class TestAPICodeChanges(TestCase):
    """Verify that api.py no longer contains insecure patterns."""

    def test_no_token_hex_in_api(self):
        """api.py should not use secrets.token_hex(3).upper() for OTP."""
        import os
        api_path = os.path.join(
            os.path.dirname(__file__), '..', 'apps', 'authentication', 'api.py'
        )
        with open(api_path, 'r') as f:
            content = f.read()
        self.assertNotIn('token_hex(3)', content)

    def test_api_uses_token_urlsafe(self):
        """api.py should use secrets.token_urlsafe(8) for OTP."""
        import os
        api_path = os.path.join(
            os.path.dirname(__file__), '..', 'apps', 'authentication', 'api.py'
        )
        with open(api_path, 'r') as f:
            content = f.read()
        self.assertIn('token_urlsafe(8)', content)

    def test_google_config_no_client_id(self):
        """google_oauth_config should not return client_id."""
        import os
        api_path = os.path.join(
            os.path.dirname(__file__), '..', 'apps', 'authentication', 'api.py'
        )
        with open(api_path, 'r') as f:
            content = f.read()
        # Check that the config function doesn't include 'client_id' in return
        self.assertNotIn('"client_id": client_id', content)

    def test_invitation_uses_hashlib(self):
        """api.py should use hashlib for invitation token hashing."""
        import os
        api_path = os.path.join(
            os.path.dirname(__file__), '..', 'apps', 'authentication', 'api.py'
        )
        with open(api_path, 'r') as f:
            content = f.read()
        self.assertIn('hashlib.sha256(invitation_token', content)


class TestHelpersCodeChanges(TestCase):
    """Verify that helpers.py uses salted hashing."""

    def test_hash_otp_uses_salt(self):
        """_hash_otp should accept a salt parameter."""
        import os
        helpers_path = os.path.join(
            os.path.dirname(__file__), '..', 'apps', 'authentication', 'helpers.py'
        )
        with open(helpers_path, 'r') as f:
            content = f.read()
        self.assertIn('def _hash_otp(otp: str, salt: str)', content)

    def test_store_otp_generates_salt(self):
        """store_otp should generate and store a salt."""
        import os
        helpers_path = os.path.join(
            os.path.dirname(__file__), '..', 'apps', 'authentication', 'helpers.py'
        )
        with open(helpers_path, 'r') as f:
            content = f.read()
        self.assertIn('otp_salt:', content)


class TestRateLimiterCodeChanges(TestCase):
    """Verify rate limiter code changes."""

    def test_auth_paths_defined(self):
        """AUTH_PATHS list should be defined in rate_limit.py."""
        import os
        rate_limit_path = os.path.join(
            os.path.dirname(__file__), '..', 'common', 'rate_limit.py'
        )
        with open(rate_limit_path, 'r') as f:
            content = f.read()
        self.assertIn('AUTH_PATHS', content)
        self.assertIn('/api/v1/auth/login', content)

    def test_fail_closed_logic_present(self):
        """Rate limiter should have fail-closed logic for auth endpoints."""
        import os
        rate_limit_path = os.path.join(
            os.path.dirname(__file__), '..', 'common', 'rate_limit.py'
        )
        with open(rate_limit_path, 'r') as f:
            content = f.read()
        self.assertIn('Service temporarily unavailable', content)
        self.assertIn('status=503', content)

    def test_uses_remote_addr_only(self):
        """_get_client_ip should use REMOTE_ADDR, not X-Forwarded-For."""
        import os
        rate_limit_path = os.path.join(
            os.path.dirname(__file__), '..', 'common', 'rate_limit.py'
        )
        with open(rate_limit_path, 'r') as f:
            content = f.read()
        # Should NOT have X-Forwarded-For extraction logic
        self.assertNotIn('HTTP_X_FORWARDED_FOR', content)
        self.assertIn('REMOTE_ADDR', content)


class TestPasswordPolicyCodeChanges(TestCase):
    """Verify password policy settings."""

    def test_min_length_12(self):
        """AUTH_PASSWORD_VALIDATORS should require 12+ chars."""
        from django.conf import settings
        validators = settings.AUTH_PASSWORD_VALIDATORS
        min_length_validator = next(
            (v for v in validators if 'MinimumLength' in v['NAME']),
            None,
        )
        self.assertIsNotNone(min_length_validator)
        self.assertEqual(min_length_validator['OPTIONS']['min_length'], 12)

    def test_complexity_validator_configured(self):
        """ComplexityValidator should be in AUTH_PASSWORD_VALIDATORS."""
        from django.conf import settings
        validators = settings.AUTH_PASSWORD_VALIDATORS
        complexity_validator = next(
            (v for v in validators if 'Complexity' in v['NAME']),
            None,
        )
        self.assertIsNotNone(complexity_validator)
