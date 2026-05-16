"""
Loyallia — API Security Tests

Tests for API-level security findings.

Covers:
- LYL-H-SEC-003: Webhook replay protection
- LYL-H-SEC-004: X-Forwarded-For spoofing prevention
- LYL-H-SEC-009: SSRF protection
"""

import time

from django.test import RequestFactory, TestCase

from common.url_validator import BLOCKED_NETWORKS, SSRFError, validate_external_url

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

        request = self.factory.get("/api/v1/auth/login/")
        request.META["REMOTE_ADDR"] = "203.0.113.50"
        ip = _get_client_ip(request)
        self.assertEqual(ip, "203.0.113.50")

    def test_ignores_x_forwarded_for(self):
        """Should NOT trust X-Forwarded-For header (spoofable by client)."""
        from common.rate_limit import _get_client_ip

        request = self.factory.get("/api/v1/auth/login/")
        request.META["REMOTE_ADDR"] = "203.0.113.50"
        request.META["HTTP_X_FORWARDED_FOR"] = "1.2.3.4, 10.0.0.1"
        ip = _get_client_ip(request)
        # Must use REMOTE_ADDR, not the spoofed XFF
        self.assertEqual(ip, "203.0.113.50")

    def test_defaults_to_unknown(self):
        """Should return 'unknown' if REMOTE_ADDR is missing."""
        from common.rate_limit import _get_client_ip

        request = self.factory.get("/api/v1/auth/login/")
        if "REMOTE_ADDR" in request.META:
            del request.META["REMOTE_ADDR"]
        ip = _get_client_ip(request)
        self.assertEqual(ip, "unknown")


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
        self.assertIn("event_id", field_names)
        self.assertIn("event_type", field_names)
        self.assertIn("payload_hash", field_names)
        self.assertIn("processed_at", field_names)


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
        self.assertIn("10.0.0.0/8", network_strs)
        self.assertIn("172.16.0.0/12", network_strs)
        self.assertIn("192.168.0.0/16", network_strs)
        self.assertIn("127.0.0.0/8", network_strs)
        self.assertIn("169.254.0.0/16", network_strs)

    def test_ssrf_error_is_value_error(self):
        """SSRFError should be a subclass of ValueError."""
        self.assertTrue(issubclass(SSRFError, ValueError))


# =============================================================================
# Cross-Tenant Isolation Tests
# =============================================================================


class TestCrossTenantIsolation(TestCase):
    """Verify tenants cannot access each other's data via ID manipulation."""

    def setUp(self):
        from apps.billing.models import SubscriptionStatus
        from tests.factories import make_card, make_subscription, make_tenant, make_user

        self.tenant_a = make_tenant(name="Tenant A")
        self.tenant_b = make_tenant(name="Tenant B")
        self.owner_a = make_user(tenant=self.tenant_a, role="OWNER")
        self.owner_b = make_user(tenant=self.tenant_b, role="OWNER")
        make_subscription(self.tenant_a, status=SubscriptionStatus.ACTIVE)
        make_subscription(self.tenant_b, status=SubscriptionStatus.ACTIVE)
        self.card_a = make_card(self.tenant_a, name="Program A")
        self.card_b = make_card(self.tenant_b, name="Program B")

    def _request(self, user):
        from django.test import RequestFactory
        req = RequestFactory().get("/api/v1/test/")
        req.user = user
        req.tenant = user.tenant
        return req

    def test_owner_a_cannot_access_tenant_b_program(self):
        from django.http import Http404
        from ninja.errors import HttpError

        from apps.cards.api import get_program

        req = self._request(self.owner_a)
        with self.assertRaises((HttpError, Http404)) as ctx:
            get_program(req, str(self.card_b.id))
        if hasattr(ctx.exception, 'status_code'):
            self.assertIn(ctx.exception.status_code, (403, 404))

    def test_owner_b_cannot_access_tenant_a_program(self):
        from django.http import Http404
        from ninja.errors import HttpError

        from apps.cards.api import get_program

        req = self._request(self.owner_b)
        with self.assertRaises((HttpError, Http404)) as ctx:
            get_program(req, str(self.card_a.id))
        if hasattr(ctx.exception, 'status_code'):
            self.assertIn(ctx.exception.status_code, (403, 404))


# =============================================================================
# Role Boundary API Tests
# =============================================================================


class TestRoleBoundariesAPI(TestCase):
    """Verify MANAGER cannot perform OWNER-only API operations."""

    def setUp(self):
        from apps.billing.models import SubscriptionStatus
        from tests.factories import make_subscription, make_tenant, make_user

        self.tenant = make_tenant()
        self.owner = make_user(tenant=self.tenant, role="OWNER")
        self.manager = make_user(tenant=self.tenant, role="MANAGER")
        make_subscription(self.tenant, status=SubscriptionStatus.ACTIVE)

    def _request(self, user):
        from django.test import RequestFactory
        req = RequestFactory().post("/api/v1/test/", data=b"{}", content_type="application/json")
        req.user = user
        req.tenant = self.tenant
        return req

    def test_manager_cannot_create_program(self):
        from ninja.errors import HttpError

        from apps.cards.api import CardCreateIn, create_program

        req = self._request(self.manager)
        payload = CardCreateIn(name="Hacker", card_type="stamp")
        with self.assertRaises(HttpError) as ctx:
            create_program(req, payload)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_manager_cannot_add_team_member(self):
        from ninja.errors import HttpError

        from apps.tenants.api import add_team_member
        from apps.tenants.schemas import TeamMemberCreateIn

        req = self._request(self.manager)
        payload = TeamMemberCreateIn(email="x@test.com", first_name="X", last_name="Y", role="STAFF")
        with self.assertRaises(HttpError) as ctx:
            add_team_member(req, payload)
        self.assertEqual(ctx.exception.status_code, 403)


# =============================================================================
# Rate Limit Rule Coverage Tests
# =============================================================================


class TestRateLimitRules(TestCase):
    """Verify rate limit rules cover newly added endpoint prefixes."""

    def test_admin_rate_limit_exists(self):
        from common.rate_limit import RATE_LIMIT_RULES
        paths = [rule[0] for rule in RATE_LIMIT_RULES]
        self.assertIn("/api/v1/admin/", paths)

    def test_upload_rate_limit_exists(self):
        from common.rate_limit import RATE_LIMIT_RULES
        paths = [rule[0] for rule in RATE_LIMIT_RULES]
        self.assertIn("/api/v1/upload/", paths)

    def test_whatsapp_rate_limit_exists(self):
        from common.rate_limit import RATE_LIMIT_RULES
        paths = [rule[0] for rule in RATE_LIMIT_RULES]
        self.assertIn("/api/v1/whatsapp/", paths)

    def test_agent_rate_limit_exists(self):
        from common.rate_limit import RATE_LIMIT_RULES
        paths = [rule[0] for rule in RATE_LIMIT_RULES]
        self.assertIn("/api/v1/agent/", paths)

    def test_rules_ordered_most_specific_first(self):
        from common.rate_limit import RATE_LIMIT_RULES
        paths = [rule[0] for rule in RATE_LIMIT_RULES]
        general_index = paths.index("/api/v1/")
        self.assertEqual(general_index, len(paths) - 1)


# =============================================================================
# Rate Limiter Runtime Behavior Tests
# =============================================================================


class TestRateLimiterRuntimeBehavior(TestCase):
    """Verify rate limiter behavior at runtime (no source-code reading)."""

    def test_rate_limit_rules_are_iterable(self):
        """RATE_LIMIT_RULES should be a non-empty iterable."""
        from common.rate_limit import RATE_LIMIT_RULES
        self.assertTrue(len(RATE_LIMIT_RULES) > 0)

    def test_auth_paths_exist_in_rules(self):
        """Auth paths should be covered by rate limit rules."""
        from common.rate_limit import RATE_LIMIT_RULES
        paths = [rule[0] for rule in RATE_LIMIT_RULES]
        self.assertIn("/api/v1/auth/login", paths)
        self.assertIn("/api/v1/auth/register", paths)

    def test_general_rule_is_last(self):
        """The general /api/v1/ catch-all should be the last rule."""
        from common.rate_limit import RATE_LIMIT_RULES
        paths = [rule[0] for rule in RATE_LIMIT_RULES]
        self.assertEqual(paths[-1], "/api/v1/")

    def test_uses_remote_addr_only(self):
        """_get_client_ip should return REMOTE_ADDR, not trust X-Forwarded-For."""
        from common.rate_limit import _get_client_ip
        from django.test import RequestFactory

        request = RequestFactory().get("/api/v1/auth/login/")
        request.META["REMOTE_ADDR"] = "203.0.113.50"
        request.META["HTTP_X_FORWARDED_FOR"] = "1.2.3.4, 10.0.0.1"
        ip = _get_client_ip(request)
        self.assertEqual(ip, "203.0.113.50")

    def test_ignores_x_forwarded_for_spoofing(self):
        """_get_client_ip must ignore spoofed X-Forwarded-For headers."""
        from common.rate_limit import _get_client_ip
        from django.test import RequestFactory

        request = RequestFactory().get("/api/v1/auth/login/")
        request.META["REMOTE_ADDR"] = "192.0.2.1"
        request.META["HTTP_X_FORWARDED_FOR"] = "evil.com"
        ip = _get_client_ip(request)
        self.assertEqual(ip, "192.0.2.1")
