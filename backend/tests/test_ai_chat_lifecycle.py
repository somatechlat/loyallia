"""
Loyallia AI Chat Conversation Lifecycle Tests

Phase 1 — conversation lifecycle:
  1. AIChatSession.bind() refresh + expiry semantics, resolve_for_tenant()
     rejection of expired / inactive / foreign contexts.
  2. GET /me/ai-chat/session/ (current conversation restore) and
     POST /me/ai-chat/end/ (idempotent end + agent-side terminate).
  3. Fresh-session retry leak fix: the abandoned agent context is terminated
     (profile-mismatch path) and its stale binding is retired, never revived.
  4. Daily cleanup task: expired contexts terminated on Agent Zero and their
     bindings deactivated (deterministic, idempotent).

Transport is stubbed with the repo's deterministic _FakeClient (no real
network); Vault credentials use the standard test overrides.
"""

import json
from datetime import timedelta
from unittest import mock

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone

import apps.tenants.services.ai_proxy as ai_proxy_module
from apps.ai.models import AIChatSession
from apps.ai.tasks import cleanup_expired_ai_chat_sessions
from apps.authentication.models import UserRole
from apps.tenants.services.ai_proxy import chat_with_ai
from common.vault import clear_test_overrides, set_test_override
from tests.factories import make_plan, make_subscription, make_tenant, make_user
from tests.test_ai_chat_session import _FakeClient, _FakeResponse
from tests.test_api_plan_limits import _get_auth_header

CHAT_URL = "/api/v1/tenants/me/ai-chat/"
SESSION_URL = "/api/v1/tenants/me/ai-chat/session/"
END_URL = "/api/v1/tenants/me/ai-chat/end/"


class AIChatSessionModelTest(TestCase):
    """bind() refresh/expiry and resolve_for_tenant() rejection semantics."""

    def setUp(self):
        self.tenant = make_tenant()
        self.other_tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)

    def test_bind_creates_session_with_expiry_and_count(self):
        session = AIChatSession.bind(
            tenant=self.tenant,
            context_id="ctx-bind",
            agent_profile="loyallia-help",
            created_by_id=self.user.id,
            lifetime_hours=6,
        )
        assert session is not None
        self.assertTrue(session.is_active)
        self.assertEqual(session.message_count, 1)
        self.assertEqual(session.tenant_id, self.tenant.id)
        self.assertGreater(session.expires_at, timezone.now() + timedelta(hours=5))
        self.assertLessEqual(session.expires_at, timezone.now() + timedelta(hours=7))

    def test_bind_refreshes_expiry_and_counts_messages(self):
        session = AIChatSession.bind(
            tenant=self.tenant,
            context_id="ctx-refresh",
            agent_profile="loyallia-help",
            created_by_id=self.user.id,
            lifetime_hours=1,
        )
        assert session is not None
        # Simulate a session close to expiry: a re-bind must extend it.
        AIChatSession.objects.filter(pk=session.pk).update(
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        rebound = AIChatSession.bind(
            tenant=self.tenant,
            context_id="ctx-refresh",
            agent_profile="loyallia-help",
            created_by_id=self.user.id,
            lifetime_hours=24,
        )
        assert rebound is not None
        self.assertEqual(rebound.pk, session.pk)
        self.assertEqual(rebound.message_count, 2)
        self.assertGreater(rebound.expires_at, timezone.now() + timedelta(hours=23))
        self.assertEqual(AIChatSession.objects.count(), 1)

    def test_bind_refuses_cross_tenant_adoption(self):
        AIChatSession.bind(
            tenant=self.tenant,
            context_id="ctx-shared",
            agent_profile="loyallia-help",
            created_by_id=self.user.id,
        )
        adopted = AIChatSession.bind(
            tenant=self.other_tenant,
            context_id="ctx-shared",
            agent_profile="loyallia-help",
        )
        self.assertIsNone(adopted)
        row = AIChatSession.objects.get(context_id="ctx-shared")
        self.assertEqual(row.tenant_id, self.tenant.id)

    def test_resolve_rejects_expired_context(self):
        AIChatSession.bind(
            tenant=self.tenant,
            context_id="ctx-expired",
            agent_profile="loyallia-help",
            created_by_id=self.user.id,
        )
        AIChatSession.objects.filter(context_id="ctx-expired").update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        self.assertIsNone(
            AIChatSession.resolve_for_tenant(self.tenant, "ctx-expired")
        )

    def test_resolve_rejects_inactive_context(self):
        AIChatSession.bind(
            tenant=self.tenant,
            context_id="ctx-off",
            agent_profile="loyallia-help",
            created_by_id=self.user.id,
        )
        AIChatSession.objects.filter(context_id="ctx-off").update(is_active=False)
        self.assertIsNone(AIChatSession.resolve_for_tenant(self.tenant, "ctx-off"))

    def test_resolve_rejects_foreign_and_missing_contexts(self):
        AIChatSession.bind(
            tenant=self.other_tenant,
            context_id="ctx-foreign",
            agent_profile="loyallia-help",
        )
        self.assertIsNone(
            AIChatSession.resolve_for_tenant(self.tenant, "ctx-foreign")
        )
        self.assertIsNone(AIChatSession.resolve_for_tenant(self.tenant, None))
        self.assertIsNone(AIChatSession.resolve_for_tenant(self.tenant, ""))

    def test_resolve_accepts_active_unexpired_context(self):
        AIChatSession.bind(
            tenant=self.tenant,
            context_id="ctx-live",
            agent_profile="loyallia-help",
            created_by_id=self.user.id,
        )
        session = AIChatSession.resolve_for_tenant(self.tenant, "ctx-live")
        assert session is not None
        self.assertEqual(session.context_id, "ctx-live")


class _AgentHTTPTestCase(TestCase):
    """Shared plumbing: Vault test overrides + deterministic HTTP stub."""

    def setUp(self):
        cache.clear()
        _FakeClient.calls = []
        _FakeClient.queue = []
        set_test_override("ai_agent_api_key", "test-key-abc123")
        set_test_override("ai_agent_base_url", "http://ai-agent:80/")

    def tearDown(self):
        clear_test_overrides()
        _FakeClient.calls = []
        _FakeClient.queue = []

    def _post_json(self, url, payload, header):
        return self.client.post(
            url,
            data=json.dumps(payload),
            content_type="application/json",
            HTTP_AUTHORIZATION=header,
        )


class AIChatSessionEndpointTest(_AgentHTTPTestCase):
    """GET /me/ai-chat/session/ (restore) and POST /me/ai-chat/end/."""

    def setUp(self):
        super().setUp()
        self.tenant = make_tenant()
        self.other_tenant = make_tenant()
        # Endpoints are gated on the ai_assistant plan feature (same gate as the
        # message proxy) — the happy-path tests run on plans that include it.
        make_subscription(
            self.tenant,
            plan=make_plan(features=["ai_assistant"], max_ai_queries_month=50),
        )
        make_subscription(
            self.other_tenant,
            plan=make_plan(features=["ai_assistant"], max_ai_queries_month=50),
        )
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.colleague = make_user(tenant=self.tenant, role=UserRole.MANAGER)
        self.other_user = make_user(tenant=self.other_tenant, role=UserRole.OWNER)
        self.staff = make_user(tenant=self.tenant, role=UserRole.STAFF)
        self.header = _get_auth_header(self.user)
        self.colleague_header = _get_auth_header(self.colleague)
        self.other_header = _get_auth_header(self.other_user)
        self.staff_header = _get_auth_header(self.staff)

    def _bind(self, context_id, *, tenant=None, user=None, **kwargs):
        return AIChatSession.bind(
            tenant=tenant or self.tenant,
            context_id=context_id,
            agent_profile="loyallia-help",
            created_by_id=(user or self.user).id,
            **kwargs,
        )

    # ── GET /me/ai-chat/session/ ─────────────────────────────────────────

    def test_session_returns_bound_context(self):
        self._bind("ctx-restore")
        resp = self.client.get(SESSION_URL, HTTP_AUTHORIZATION=self.header)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["context_id"], "ctx-restore")
        self.assertEqual(data["agent_profile"], "loyallia-help")
        self.assertEqual(data["message_count"], 1)
        self.assertTrue(data["expires_at"])
        self.assertTrue(data["created_at"])
        self.assertIsNotNone(data["last_message_at"])

    def test_session_returns_latest_active_session(self):
        self._bind("ctx-older")
        AIChatSession.objects.filter(context_id="ctx-older").update(
            updated_at=timezone.now() - timedelta(hours=2)
        )
        self._bind("ctx-newest")
        resp = self.client.get(SESSION_URL, HTTP_AUTHORIZATION=self.header)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["context_id"], "ctx-newest")

    def test_session_no_data_returns_204(self):
        resp = self.client.get(SESSION_URL, HTTP_AUTHORIZATION=self.header)
        self.assertEqual(resp.status_code, 204)

    def test_session_expired_or_inactive_returns_204(self):
        self._bind("ctx-expired")
        AIChatSession.objects.filter(context_id="ctx-expired").update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        self.assertEqual(
            self.client.get(SESSION_URL, HTTP_AUTHORIZATION=self.header).status_code,
            204,
        )
        self._bind("ctx-off")
        AIChatSession.objects.filter(context_id="ctx-off").update(is_active=False)
        self.assertEqual(
            self.client.get(SESSION_URL, HTTP_AUTHORIZATION=self.header).status_code,
            204,
        )

    def test_session_is_scoped_to_requesting_user(self):
        self._bind("ctx-mine")
        # A colleague's conversation on the same tenant is not exposed.
        resp = self.client.get(SESSION_URL, HTTP_AUTHORIZATION=self.colleague_header)
        self.assertEqual(resp.status_code, 204)
        # Nor is another tenant's (direct negative oracle: the foreign row is
        # never visible — the caller keeps seeing only their own session).
        self._bind("ctx-theirs", tenant=self.other_tenant, user=self.other_user)
        resp = self.client.get(SESSION_URL, HTTP_AUTHORIZATION=self.header)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["context_id"], "ctx-mine")
        resp = self.client.get(SESSION_URL, HTTP_AUTHORIZATION=self.colleague_header)
        self.assertEqual(resp.status_code, 204)
        resp = self.client.get(SESSION_URL, HTTP_AUTHORIZATION=self.other_header)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["context_id"], "ctx-theirs")

    def test_session_and_end_require_ai_assistant_plan_feature(self):
        limited_tenant = make_tenant()
        make_subscription(limited_tenant, plan=make_plan(features=["basic"]))
        limited_header = _get_auth_header(
            make_user(tenant=limited_tenant, role=UserRole.OWNER)
        )
        self.assertEqual(
            self.client.get(SESSION_URL, HTTP_AUTHORIZATION=limited_header).status_code,
            403,
        )
        resp = self.client.post(
            END_URL,
            data=json.dumps({}),
            content_type="application/json",
            HTTP_AUTHORIZATION=limited_header,
        )
        self.assertEqual(resp.status_code, 403)

    def test_endpoints_require_a_subscription(self):
        bare_header = _get_auth_header(
            make_user(tenant=make_tenant(), role=UserRole.OWNER)
        )
        self.assertEqual(
            self.client.get(SESSION_URL, HTTP_AUTHORIZATION=bare_header).status_code,
            402,
        )

    def test_session_requires_manager_role(self):
        resp = self.client.get(SESSION_URL, HTTP_AUTHORIZATION=self.staff_header)
        self.assertEqual(resp.status_code, 403)

    # ── POST /me/ai-chat/end/ ────────────────────────────────────────────

    def test_end_terminates_agent_context_and_deactivates_session(self):
        self._bind("ctx-end")
        _FakeClient.queue = [_FakeResponse(200, {"success": True})]
        with mock.patch.object(ai_proxy_module.httpx, "Client", _FakeClient):
            resp = self._post_json(END_URL, {}, self.header)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["ended"])

        self.assertEqual(len(_FakeClient.calls), 1)
        call = _FakeClient.calls[0]
        self.assertTrue(call["url"].endswith("/api/api_terminate_chat"))
        self.assertEqual(call["body"]["context_id"], "ctx-end")
        self.assertIn("user", call["body"])
        self.assertEqual(call["headers"]["X-API-KEY"], "test-key-abc123")
        self.assertEqual(call["headers"]["X-Tenant-ID"], str(self.tenant.id))

        row = AIChatSession.objects.get(context_id="ctx-end")
        self.assertFalse(row.is_active)

    def test_end_is_idempotent(self):
        self._bind("ctx-twice")
        _FakeClient.queue = [_FakeResponse(200, {"success": True})]
        with mock.patch.object(ai_proxy_module.httpx, "Client", _FakeClient):
            first = self._post_json(END_URL, {}, self.header)
            second = self._post_json(END_URL, {}, self.header)
        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.json()["ended"])
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.json()["success"])
        self.assertFalse(second.json()["ended"])
        # The agent is contacted exactly once — the second end is a no-op.
        self.assertEqual(len(_FakeClient.calls), 1)

    def test_end_accepts_explicit_context_id_and_no_body(self):
        self._bind("ctx-explicit")
        _FakeClient.queue = [_FakeResponse(200, {"success": True})]
        with mock.patch.object(ai_proxy_module.httpx, "Client", _FakeClient):
            resp = self._post_json(
                END_URL, {"context_id": "ctx-explicit"}, self.header
            )
            no_body = self.client.post(
                END_URL, content_type="application/json", HTTP_AUTHORIZATION=self.header
            )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["ended"])
        self.assertEqual(_FakeClient.calls[0]["body"]["context_id"], "ctx-explicit")
        # No body at all: ends the current session — already ended, no-op ok.
        self.assertEqual(no_body.status_code, 200)
        self.assertTrue(no_body.json()["success"])

    def test_end_agent_failure_still_ends_locally(self):
        self._bind("ctx-flaky")
        _FakeClient.queue = [_FakeResponse(500, {"error": "internal"})]
        with mock.patch.object(ai_proxy_module.httpx, "Client", _FakeClient):
            resp = self._post_json(END_URL, {}, self.header)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["ended"])
        self.assertFalse(AIChatSession.objects.get(context_id="ctx-flaky").is_active)

    def test_end_with_nothing_to_end_is_success_noop(self):
        with mock.patch.object(ai_proxy_module.httpx, "Client", _FakeClient):
            resp = self._post_json(END_URL, {}, self.header)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["success"])
        self.assertFalse(resp.json()["ended"])
        self.assertEqual(len(_FakeClient.calls), 0)

    def test_end_never_touches_foreign_session(self):
        self._bind("ctx-foreign", tenant=self.other_tenant, user=self.other_user)
        with mock.patch.object(ai_proxy_module.httpx, "Client", _FakeClient):
            resp = self._post_json(END_URL, {"context_id": "ctx-foreign"}, self.header)
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["ended"])
        row = AIChatSession.objects.get(context_id="ctx-foreign")
        self.assertTrue(row.is_active)
        self.assertEqual(len(_FakeClient.calls), 0)

    def test_end_requires_manager_role(self):
        resp = self._post_json(END_URL, {}, self.staff_header)
        self.assertEqual(resp.status_code, 403)


class FreshRetryRebindTest(TestCase):
    """Endpoint-level: a superseded context's binding is retired, not revived."""

    def setUp(self):
        cache.clear()
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.header = _get_auth_header(self.user)
        make_subscription(
            self.tenant,
            plan=make_plan(features=["ai_assistant"], max_ai_queries_month=50),
        )

    def _post(self, payload):
        return self.client.post(
            CHAT_URL,
            data=json.dumps(payload),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )

    def test_superseded_context_is_retired_and_new_context_bound(self):
        AIChatSession.bind(
            tenant=self.tenant,
            context_id="ctx-old",
            agent_profile="loyallia-help",
            created_by_id=self.user.id,
        )
        with mock.patch("apps.tenants.api.chat_with_ai") as transport:
            transport.return_value = {
                "context_id": "ctx-new",
                "response": "ok",
                "superseded_context_id": "ctx-old",
            }
            resp = self._post({"message": "hola", "context_id": "ctx-old"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["context_id"], "ctx-new")

        old_row = AIChatSession.objects.get(context_id="ctx-old")
        self.assertFalse(old_row.is_active, "the stale binding must be retired")
        new_row = AIChatSession.objects.get(context_id="ctx-new")
        self.assertTrue(new_row.is_active)
        self.assertEqual(new_row.tenant_id, self.tenant.id)

    def test_fallback_never_resurrects_superseded_context(self):
        AIChatSession.bind(
            tenant=self.tenant,
            context_id="ctx-old",
            agent_profile="loyallia-help",
            created_by_id=self.user.id,
        )
        with mock.patch("apps.tenants.api.chat_with_ai") as transport:
            # Agent answered without a context_id after abandoning ctx-old:
            # the dead context must NOT be re-bound as the current one.
            transport.return_value = {
                "response": "ok",
                "superseded_context_id": "ctx-old",
            }
            resp = self._post({"message": "hola", "context_id": "ctx-old"})
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.json()["context_id"])
        self.assertFalse(AIChatSession.objects.get(context_id="ctx-old").is_active)
        self.assertEqual(AIChatSession.objects.filter(is_active=True).count(), 0)


class FreshRetryTerminateTest(_AgentHTTPTestCase):
    """Transport-level: the abandoned agent context is terminated on retry."""

    def _call(self, **kwargs):
        defaults = {
            "tenant_id": "11111111-2222-3333-4444-555555555555",
            "user_id": "99999999-8888-7777-6666-555555555555",
            "agent_profile": "loyallia-help",
            "lifetime_hours": 24,
        }
        defaults.update(kwargs)
        with mock.patch.object(ai_proxy_module.httpx, "Client", _FakeClient):
            return chat_with_ai(**{"message": "hello", **defaults})

    def test_profile_mismatch_terminates_abandoned_context_before_retry(self):
        _FakeClient.queue = [
            _FakeResponse(
                400, {"error": "Cannot override agent profile on existing context"}
            ),
            _FakeResponse(200, {"success": True}),
            _FakeResponse(200, {"context_id": "ctx-recreated", "response": "ok"}),
        ]
        result = self._call(context_id="ctx-old-profile")

        self.assertEqual(result["context_id"], "ctx-recreated")
        self.assertEqual(result["superseded_context_id"], "ctx-old-profile")
        urls = [call["url"] for call in _FakeClient.calls]
        self.assertEqual(
            urls,
            [
                "http://ai-agent:80/api/api_message",
                "http://ai-agent:80/api/api_terminate_chat",
                "http://ai-agent:80/api/api_message",
            ],
        )
        terminate_call = _FakeClient.calls[1]
        self.assertEqual(terminate_call["body"]["context_id"], "ctx-old-profile")
        self.assertIn("user", terminate_call["body"])
        self.assertEqual(
            terminate_call["headers"]["X-User-ID"],
            "99999999-8888-7777-6666-555555555555",
        )
        self.assertNotIn("context_id", _FakeClient.calls[2]["body"])

    def test_terminate_failure_does_not_block_fresh_retry(self):
        import httpx

        _FakeClient.queue = [
            _FakeResponse(
                400, {"error": "Cannot override agent profile on existing context"}
            ),
            httpx.TimeoutException("deadline"),
            _FakeResponse(200, {"context_id": "ctx-after-timeout", "response": "ok"}),
        ]
        result = self._call(context_id="ctx-unterminatable")
        self.assertEqual(result["context_id"], "ctx-after-timeout")
        self.assertEqual(result["superseded_context_id"], "ctx-unterminatable")
        self.assertEqual(len(_FakeClient.calls), 3)

    def test_404_retry_does_not_call_terminate(self):
        # The agent already dropped the context — no agent-side leak to clean.
        _FakeClient.queue = [
            _FakeResponse(404, {"error": "Context not found"}),
            _FakeResponse(200, {"context_id": "ctx-fresh", "response": "ok"}),
        ]
        result = self._call(context_id="ctx-gone")
        self.assertEqual(result["context_id"], "ctx-fresh")
        self.assertEqual(result["superseded_context_id"], "ctx-gone")
        urls = [call["url"] for call in _FakeClient.calls]
        self.assertEqual(len(urls), 2)
        self.assertNotIn("api_terminate_chat", urls[1])

    def test_no_retry_means_no_superseded_context(self):
        _FakeClient.queue = [
            _FakeResponse(200, {"context_id": "ctx-1", "response": "ok"})
        ]
        result = self._call(context_id="ctx-1")
        self.assertNotIn("superseded_context_id", result)
        self.assertEqual(len(_FakeClient.calls), 1)


class CleanupTaskTest(_AgentHTTPTestCase):
    """Daily cleanup: expired contexts terminated on the agent, then retired."""

    def setUp(self):
        super().setUp()
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)

    def _bind(self, context_id, **kwargs):
        return AIChatSession.bind(
            tenant=self.tenant,
            context_id=context_id,
            agent_profile="loyallia-help",
            created_by_id=self.user.id,
            **kwargs,
        )

    def test_cleanup_task_registered_in_beat_schedule(self):
        # Regression guard: the daily 3 AM schedule lives in
        # loyallia/celery.py beat_entries — losing the registration would
        # silently stop the leak sweep.
        from loyallia.celery import app as celery_app

        entry = celery_app.conf.beat_schedule.get("cleanup-expired-ai-chat-sessions")
        self.assertIsNotNone(entry)
        self.assertEqual(entry["task"], "apps.ai.tasks.cleanup_expired_ai_chat_sessions")

    def test_cleanup_terminates_expired_and_deactivates(self):
        self._bind("ctx-expired")
        AIChatSession.objects.filter(context_id="ctx-expired").update(
            expires_at=timezone.now() - timedelta(hours=1)
        )
        self._bind("ctx-live")
        self._bind("ctx-dead")
        AIChatSession.objects.filter(context_id="ctx-dead").update(
            expires_at=timezone.now() - timedelta(hours=2), is_active=False
        )

        _FakeClient.queue = [_FakeResponse(200, {"success": True})]
        with mock.patch.object(ai_proxy_module.httpx, "Client", _FakeClient):
            result = cleanup_expired_ai_chat_sessions()

        self.assertEqual(result["processed"], 1)
        self.assertEqual(result["terminated"], 1)
        self.assertEqual(result["terminate_failed"], 0)
        self.assertEqual(len(_FakeClient.calls), 1)
        self.assertTrue(
            _FakeClient.calls[0]["url"].endswith("/api/api_terminate_chat")
        )
        self.assertEqual(_FakeClient.calls[0]["body"]["context_id"], "ctx-expired")

        self.assertFalse(AIChatSession.objects.get(context_id="ctx-expired").is_active)
        self.assertTrue(AIChatSession.objects.get(context_id="ctx-live").is_active)
        self.assertFalse(AIChatSession.objects.get(context_id="ctx-dead").is_active)

    def test_cleanup_is_idempotent(self):
        self._bind("ctx-expired")
        AIChatSession.objects.filter(context_id="ctx-expired").update(
            expires_at=timezone.now() - timedelta(hours=1)
        )
        _FakeClient.queue = [_FakeResponse(200, {"success": True})]
        with mock.patch.object(ai_proxy_module.httpx, "Client", _FakeClient):
            first = cleanup_expired_ai_chat_sessions()
            second = cleanup_expired_ai_chat_sessions()
        self.assertEqual(first["processed"], 1)
        self.assertEqual(second["processed"], 0)
        self.assertEqual(len(_FakeClient.calls), 1)

    def test_cleanup_agent_failure_still_deactivates(self):
        self._bind("ctx-expired")
        AIChatSession.objects.filter(context_id="ctx-expired").update(
            expires_at=timezone.now() - timedelta(hours=1)
        )
        import httpx

        _FakeClient.queue = [httpx.TimeoutException("deadline")]
        with mock.patch.object(ai_proxy_module.httpx, "Client", _FakeClient):
            result = cleanup_expired_ai_chat_sessions()
        self.assertEqual(result["processed"], 1)
        self.assertEqual(result["terminated"], 0)
        self.assertEqual(result["terminate_failed"], 1)
        self.assertFalse(AIChatSession.objects.get(context_id="ctx-expired").is_active)
