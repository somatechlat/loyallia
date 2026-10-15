"""
Loyallia AI Chat Session Isolation & Transport Contract Tests

Part 1 — tenant/session isolation (endpoint level):
  A context_id owned by another tenant (or expired) is NEVER forwarded to the
  agent, so no cross-tenant conversation content can flow.

Part 2 — transport contract (ai_proxy level):
  POST {ai_agent_base_url}/api/api_message with X-API-KEY, tenant identity
  headers, agent_profile, lifetime_hours, server-side PII masking, and the
  documented error mapping (401 => config, 404 => fresh-session retry,
  timeout => unavailable).
"""

import json
from unittest import mock

from django.core.cache import cache
from django.test import TestCase

import apps.tenants.services.ai_proxy as ai_proxy_module
from apps.ai.models import AIChatSession
from apps.authentication.models import UserRole
from apps.tenants.services.ai_proxy import (
    AIProxyConfigError,
    AIProxyRequestError,
    chat_with_ai,
)
from common.vault import clear_test_overrides, set_test_override
from tests.factories import make_plan, make_subscription, make_tenant, make_user
from tests.test_api_plan_limits import _get_auth_header

CHAT_URL = "/api/v1/tenants/me/ai-chat/"


class _FakeResponse:
    def __init__(self, status_code=200, json_data=None):
        self.status_code = status_code
        self._json = json_data
        self.text = json.dumps(json_data or {})

    def json(self):
        if self._json is None:
            raise ValueError("no body")
        return self._json


class _FakeClient:
    """Deterministic httpx.Client stand-in that records every call."""

    calls: list = []
    queue: list = []

    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def post(self, url, json=None, headers=None):
        _FakeClient.calls.append(
            {"url": url, "body": dict(json or {}), "headers": dict(headers or {})}
        )
        item = _FakeClient.queue.pop(0) if _FakeClient.queue else _FakeResponse()
        if isinstance(item, Exception):
            raise item
        return item


class ChatSessionIsolationTest(TestCase):
    """Endpoint-level tenant binding for AIChatSession."""

    def setUp(self):
        cache.clear()
        self.tenant_a = make_tenant()
        self.tenant_b = make_tenant()
        self.user_a = make_user(tenant=self.tenant_a, role=UserRole.OWNER)
        self.user_b = make_user(tenant=self.tenant_b, role=UserRole.OWNER)
        self.header_a = _get_auth_header(self.user_a)
        self.header_b = _get_auth_header(self.user_b)
        for tenant in (self.tenant_a, self.tenant_b):
            make_subscription(tenant, plan=make_plan(
                features=["ai_assistant"], max_ai_queries_month=50
            ))

    def _post(self, header, payload):
        return self.client.post(
            CHAT_URL,
            data=json.dumps(payload),
            content_type="application/json",
            HTTP_AUTHORIZATION=header,
        )

    def test_foreign_context_is_never_forwarded(self):
        """Tenant B presenting tenant A's context starts a fresh session."""
        AIChatSession.bind(
            tenant=self.tenant_a,
            context_id="ctx-AAAA-owned-by-A",
            agent_profile="loyallia-help",
            created_by_id=self.user_a.id,
        )
        with mock.patch("apps.tenants.api.chat_with_ai") as transport:
            transport.return_value = {
                "context_id": "ctx-fresh-for-B",
                "response": "hola",
            }
            resp = self._post(self.header_b, {"message": "¿De qué trata esto?"})

        self.assertEqual(resp.status_code, 200)
        kwargs = transport.call_args.kwargs
        self.assertIsNone(
            kwargs["context_id"],
            "a foreign context_id must never reach the agent",
        )

        # Tenant A's binding is untouched; the new context belongs to B.
        a_session = AIChatSession.objects.get(context_id="ctx-AAAA-owned-by-A")
        self.assertEqual(a_session.tenant_id, self.tenant_a.id)
        self.assertEqual(a_session.message_count, 1)
        b_session = AIChatSession.objects.get(context_id="ctx-fresh-for-B")
        self.assertEqual(b_session.tenant_id, self.tenant_b.id)

    def test_foreign_context_from_second_party_not_visible_to_first(self):
        """The mirror case: A cannot resume the context issued to B."""
        AIChatSession.bind(
            tenant=self.tenant_b,
            context_id="ctx-BBBB-owned-by-B",
            agent_profile="loyallia-help",
            created_by_id=self.user_b.id,
        )
        with mock.patch("apps.tenants.api.chat_with_ai") as transport:
            transport.return_value = {
                "context_id": "ctx-fresh-for-A",
                "response": "ok",
            }
            resp = self._post(self.header_a, {"message": "hola"})
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(transport.call_args.kwargs["context_id"])

    def test_own_context_is_forwarded_and_session_resumes(self):
        AIChatSession.bind(
            tenant=self.tenant_a,
            context_id="ctx-AAAA-owned-by-A",
            agent_profile="loyallia-help",
            created_by_id=self.user_a.id,
        )
        with mock.patch("apps.tenants.api.chat_with_ai") as transport:
            transport.return_value = {
                "context_id": "ctx-AAAA-owned-by-A",
                "response": "ok",
            }
            resp = self._post(
                self.header_a, {"message": "sigue", "context_id": "ctx-AAAA-owned-by-A"}
            )
        self.assertEqual(resp.status_code, 200)
        kwargs = transport.call_args.kwargs
        self.assertEqual(kwargs["context_id"], "ctx-AAAA-owned-by-A")
        self.assertEqual(kwargs["agent_profile"], "loyallia-help")

        session = AIChatSession.objects.get(context_id="ctx-AAAA-owned-by-A")
        self.assertEqual(session.tenant_id, self.tenant_a.id)
        self.assertEqual(session.message_count, 2)

    def test_expired_context_starts_fresh_session(self):
        from datetime import timedelta

        from django.utils import timezone

        AIChatSession.bind(
            tenant=self.tenant_a,
            context_id="ctx-expired",
            agent_profile="loyallia-help",
            created_by_id=self.user_a.id,
        )
        AIChatSession.objects.filter(context_id="ctx-expired").update(
            expires_at=timezone.now() - timedelta(hours=1)
        )
        with mock.patch("apps.tenants.api.chat_with_ai") as transport:
            transport.return_value = {"context_id": "ctx-new", "response": "ok"}
            resp = self._post(
                self.header_a, {"message": "hola", "context_id": "ctx-expired"}
            )
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(transport.call_args.kwargs["context_id"])


class TransportContractTest(TestCase):
    """ai_proxy must speak the verified Agent Zero contract exactly."""

    def setUp(self):
        _FakeClient.calls = []
        _FakeClient.queue = []
        set_test_override("ai_agent_api_key", "test-key-abc123")
        set_test_override("ai_agent_base_url", "http://ai-agent:80/")

    def tearDown(self):
        clear_test_overrides()
        _FakeClient.calls = []
        _FakeClient.queue = []

    def _call(self, **kwargs):
        defaults = {
            "tenant_id": "11111111-2222-3333-4444-555555555555",
            "user_id": "99999999-8888-7777-6666-555555555555",
            "agent_profile": "loyallia-help",
            "lifetime_hours": 24,
        }
        defaults.update(kwargs)
        with mock.patch.object(
            ai_proxy_module.httpx, "Client", _FakeClient
        ):
            return chat_with_ai(**{"message": "hello", **defaults})

    def test_posts_to_verified_agent_zero_route_with_contract_fields(self):
        _FakeClient.queue = [
            _FakeResponse(200, {"context_id": "ctx-1", "response": "ok"})
        ]
        self._call(context_id="ctx-0")
        call = _FakeClient.calls[0]
        self.assertEqual(call["url"], "http://ai-agent:80/api/api_message")
        self.assertEqual(call["headers"]["X-API-KEY"], "test-key-abc123")
        self.assertEqual(call["headers"]["X-Tenant-ID"], "11111111-2222-3333-4444-555555555555")
        self.assertEqual(call["headers"]["X-User-ID"], "99999999-8888-7777-6666-555555555555")
        self.assertEqual(call["body"]["context_id"], "ctx-0")
        self.assertEqual(call["body"]["agent_profile"], "loyallia-help")
        self.assertEqual(call["body"]["lifetime_hours"], 24.0)
        self.assertIn("message", call["body"])

    def test_pii_is_masked_before_egress(self):
        _FakeClient.queue = [
            _FakeResponse(200, {"context_id": "ctx-1", "response": "ok"})
        ]
        self._call(message="Escríbeme a juan.perez@example.com o +593987654321")
        sent = _FakeClient.calls[0]["body"]["message"]
        self.assertNotIn("juan.perez@example.com", sent)
        self.assertIn("j***@example.com", sent)
        self.assertNotIn("+593987654321", sent)

    def test_404_context_retries_once_without_context(self):
        _FakeClient.queue = [
            _FakeResponse(404, {"error": "Context not found"}),
            _FakeResponse(200, {"context_id": "ctx-fresh", "response": "ok"}),
        ]
        result = self._call(context_id="ctx-gone")
        self.assertEqual(result["context_id"], "ctx-fresh")
        self.assertEqual(len(_FakeClient.calls), 2)
        self.assertIn("context_id", _FakeClient.calls[0]["body"])
        self.assertNotIn("context_id", _FakeClient.calls[1]["body"])

    def test_profile_mismatch_retries_once_without_context(self):
        _FakeClient.queue = [
            _FakeResponse(400, {"error": "Cannot override agent profile on existing context"}),
            _FakeResponse(200, {"context_id": "ctx-recreated", "response": "ok"}),
        ]
        result = self._call(context_id="ctx-old-profile")
        self.assertEqual(result["context_id"], "ctx-recreated")
        self.assertEqual(len(_FakeClient.calls), 2)
        self.assertNotIn("context_id", _FakeClient.calls[1]["body"])

    def test_401_maps_to_config_error(self):
        _FakeClient.queue = [
            _FakeResponse(401, {"error": "Invalid API key"})
        ]
        with self.assertRaises(AIProxyConfigError):
            self._call()

    def test_agent_5xx_normalised_to_502(self):
        _FakeClient.queue = [
            _FakeResponse(500, {"error": "internal"})
        ]
        with self.assertRaises(AIProxyRequestError) as ctx:
            self._call()
        self.assertEqual(ctx.exception.status_code, 502)

    def test_timeout_maps_to_unavailable_without_status(self):
        import httpx

        _FakeClient.queue = [httpx.TimeoutException("deadline")]
        with self.assertRaises(AIProxyRequestError) as ctx:
            self._call()
        self.assertIsNone(ctx.exception.status_code)

    def test_non_json_response_maps_to_unavailable(self):
        _FakeClient.queue = [_FakeResponse(200, None)]
        with self.assertRaises(AIProxyRequestError):
            self._call()
