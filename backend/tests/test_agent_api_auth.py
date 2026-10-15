"""
Loyallia Agent API Authentication Tests

Verifies the enterprise auth contract of `/api/v1/agent/*`:
  - precise HTTP codes: 401 unknown/expired key, 403 plan/quota-disabled,
    429 daily quota exceeded and repeated authentication failures
  - quota accounting through AgentAPICallLog (source of truth)
  - per-IP failed-attempt throttling (brute-force protection)
  - audit entries for known-key denials (AuditStatus.DENIED)
  - raw key material never appears in log output
"""

import json
from datetime import timedelta

from django.core.cache import cache
from django.test import TestCase
from django.test.client import Client
from django.utils import timezone

from apps.agent_api.models import AgentAPICallLog, AgentAPIKey
from apps.audit.models import AuditAction, AuditLog, AuditStatus
from apps.authentication.models import UserRole
from tests.factories import make_plan, make_subscription, make_tenant, make_user

AGENT_CONTEXT_URL = "/api/v1/agent/context/"


class AgentApiAuthTestBase(TestCase):
    """Shared setup: tenant + raw key + helpers."""

    def setUp(self):
        # Rate-limit counters are cache-backed: reset between tests.
        cache.clear()
        self.tenant = make_tenant()
        self.owner = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.raw_key, key_hash = AgentAPIKey.generate_key()
        self.key = AgentAPIKey.objects.create(
            tenant=self.tenant,
            name="test-agent-key",
            key_hash=key_hash,
            key_prefix=self.raw_key[:8],
            created_by_id=self.owner.id,
        )

    def _subscribe(self, **plan_kwargs):
        plan = make_plan(**plan_kwargs)
        return make_subscription(self.tenant, plan=plan)

    def _get(self, raw_key: str | None = None):
        client = Client()
        token = self.raw_key if raw_key is None else raw_key
        return client.get(
            AGENT_CONTEXT_URL, HTTP_AUTHORIZATION=f"Bearer {token}"
        )


class AgentApiAuthCodesTest(AgentApiAuthTestBase):
    """HTTP semantics for every rejection reason."""

    def test_missing_authorization_returns_401(self):
        resp = Client().get(AGENT_CONTEXT_URL)
        self.assertEqual(resp.status_code, 401)

    def test_unknown_key_returns_401_with_agent_message(self):
        self._subscribe(features=["agent_api"], max_api_calls_day=10)
        resp = self._get("lyl_definitely_not_a_real_key")
        self.assertEqual(resp.status_code, 401)
        self.assertIn("inválida", resp.json().get("error", "").lower())

    def test_unknown_key_failure_never_logs_key_material(self):
        self._subscribe(features=["agent_api"], max_api_calls_day=10)
        attempted = "lyl_supersecrettokenvalue1234567890"
        with self.assertLogs("loyallia.agent_api", level="WARNING") as captured:
            resp = self._get(attempted)
        self.assertEqual(resp.status_code, 401)
        for line in captured.output:
            self.assertNotIn("supersecrettokenvalue", line)

    def test_expired_key_returns_401(self):
        self._subscribe(features=["agent_api"], max_api_calls_day=10)
        self.key.expires_at = timezone.now() - timedelta(days=1)
        self.key.save(update_fields=["expires_at"])
        resp = self._get()
        self.assertEqual(resp.status_code, 401)
        self.assertIn("expirada", resp.json().get("error", "").lower())
        # The denial for a known key is audited with DENIED status.
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.API_ACCESS,
                status=AuditStatus.DENIED,
                resource_id="expired_key",
            ).exists()
        )

    def test_plan_without_agent_api_feature_returns_403(self):
        # make_plan defaults contain no `agent_api` feature.
        self._subscribe(max_api_calls_day=10)
        resp = self._get()
        self.assertEqual(resp.status_code, 403)
        self.assertTrue(
            AuditLog.objects.filter(
                status=AuditStatus.DENIED, resource_id="plan_feature"
            ).exists()
        )

    def test_quota_disabled_returns_403(self):
        self._subscribe(features=["agent_api"], max_api_calls_day=0)
        resp = self._get()
        self.assertEqual(resp.status_code, 403)
        self.assertIn("límite", resp.json().get("error", "").lower())
        self.assertTrue(
            AuditLog.objects.filter(
                status=AuditStatus.DENIED, resource_id="quota_disabled"
            ).exists()
        )

    def test_daily_quota_exceeded_returns_429(self):
        self._subscribe(features=["agent_api"], max_api_calls_day=1)
        AgentAPICallLog.objects.create(
            tenant=self.tenant,
            api_key=self.key,
            endpoint=AGENT_CONTEXT_URL,
            method="GET",
            status_code=200,
        )
        resp = self._get()
        self.assertEqual(resp.status_code, 429)
        self.assertTrue(
            AuditLog.objects.filter(
                status=AuditStatus.DENIED, resource_id="quota_exceeded"
            ).exists()
        )

    def test_valid_key_returns_200_and_records_call(self):
        self._subscribe(features=["agent_api"], max_api_calls_day=10)
        resp = self._get()
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["tenant"]["slug"], self.tenant.slug)

        log = AgentAPICallLog.objects.get(tenant=self.tenant)
        self.assertEqual(log.status_code, 200)
        self.assertEqual(log.endpoint, AGENT_CONTEXT_URL)
        self.assertEqual(log.api_key_id, self.key.id)

        self.key.refresh_from_db()
        self.assertIsNotNone(self.key.last_used_at)

    def test_repeated_failures_throttled_to_429(self):
        self._subscribe(features=["agent_api"], max_api_calls_day=10)
        for attempt in range(10):
            resp = self._get(f"lyl_bogus_key_{attempt}")
            self.assertEqual(resp.status_code, 401, f"attempt {attempt}")
        resp = self._get("lyl_bogus_key_final")
        self.assertEqual(resp.status_code, 429)

    def test_quota_check_and_insert_share_one_transaction_window(self):
        """A single admitted call consumes exactly one unit of daily quota."""
        self._subscribe(features=["agent_api"], max_api_calls_day=2)
        self.assertEqual(self._get().status_code, 200)
        self.assertEqual(self._get().status_code, 200)
        self.assertEqual(AgentAPICallLog.objects.count(), 2)
        # Third call is refused — the count came from the same rows it writes.
        self.assertEqual(self._get().status_code, 429)
        self.assertEqual(AgentAPICallLog.objects.count(), 2)


class AgentApiAuthConfigTest(TestCase):
    """Config-level guards that do not depend on the shared fixture."""

    def tearDown(self):
        cache.clear()

    def test_response_body_is_json_error_contract(self):
        resp = Client().get(
            AGENT_CONTEXT_URL, HTTP_AUTHORIZATION="Bearer lyl_invalid"
        )
        self.assertEqual(resp.status_code, 401)
        body = json.loads(resp.content)
        self.assertIn("error", body)
        self.assertFalse(body.get("success", True))
