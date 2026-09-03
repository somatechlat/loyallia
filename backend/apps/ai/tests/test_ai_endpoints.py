"""
Integration tests for AI API endpoints.

Requires Django test database. Authenticates via JWT tokens.
Makes REAL HTTP calls to the Groq API.
"""

import json
from unittest import mock

from django.core.cache import cache
from django.test import Client, TestCase, override_settings
from django.urls import reverse

from apps.ai.services import KimiService
from apps.authentication.models import User
from apps.authentication.tokens import create_access_token
from apps.billing.models import Subscription, SubscriptionPlan
from apps.tenants.models import Tenant


def _mock_chat_completion(system_prompt, user_prompt, json_schema, temperature=0.7):
    """Mock chat completion returning realistic responses for all schemas."""
    return {
        "variations": [
            {
                "name": "Test Variation",
                "description": "Test description",
                "confidence": 0.9,
                "design": {
                    "background_color": "#000000",
                    "foreground_color": "#FFFFFF",
                    "accent_color": "#FF0000",
                    "header_image": "",
                    "logo_position": "top",
                    "fields_layout": "standard",
                    "font_family": "system",
                },
            }
        ],
        "palettes": [
            {
                "name": "Test Palette",
                "primary": "#000000",
                "secondary": "#FFFFFF",
                "background": "#000000",
                "text": "#FFFFFF",
                "accent": "#FF0000",
            }
        ],
        "suggestions": ["Increase contrast", "Add logo"],
        "score": 75,
        "icons": ["coffee", "star", "heart", "gift", "badge", "crown"],
        "layout": {
            "name": "Standard",
            "description": "Standard layout",
            "logo_position": "top",
            "field_arrangement": "grid",
            "header_style": "banner",
            "footer_style": "minimal",
            "reasoning": "Standard layout works best",
        },
        "_tokens_used": {
            "prompt_tokens": 100,
            "completion_tokens": 200,
            "total_tokens": 300,
            "cached_tokens": 0,
        },
    }


@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class AIEndpointTests(TestCase):
    """Tests for /api/v1/ai/* endpoints with mocked chat completions."""

    def setUp(self):
        self.client = Client()
        cache.clear()

        self._patch = mock.patch.object(KimiService, "_call_chat_completion", side_effect=_mock_chat_completion)
        self._patch.start()

        self.tenant = Tenant.objects.create(
            name="AI Test Cafe",
            email="ai-test@cafe.com",
            phone="1234567890",
            industry="cafe",
        )
        self.plan = SubscriptionPlan.objects.create(
            name="Pro",
            slug="pro",
            features=["ai_assistant"],
            max_ai_queries_month=100,
        )
        self.subscription = Subscription.objects.create(
            tenant=self.tenant,
            subscription_plan=self.plan,
            status="active",
        )
        self.user = User.objects.create_user(
            email="ai-tester@cafe.com",
            password="testpass123",
            tenant=self.tenant,
            role="owner",
            is_active=True,
        )
        self.token = create_access_token(
            user_id=str(self.user.id),
            tenant_id=str(self.tenant.id),
            role=self.user.role,
        )
        self.auth_header = f"Bearer {self.token}"

    def tearDown(self):
        cache.clear()
        self._patch.stop()

    def _post(self, url_name, payload):
        """Helper to POST JSON with JWT auth."""
        return self.client.post(
            reverse(url_name),
            data=json.dumps(payload),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.auth_header,
        )

    def test_generate_template_success(self):
        response = self._post(
            "ai_generate_template",
            {
                "description": "A cozy coffee shop",
                "card_type": "stamp",
                "industry": "cafe",
                "language": "es",
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("data", data)
        self.assertIn("tokens_used", data)
        self.assertGreaterEqual(data["tokens_used"]["total_tokens"], 1)

    def test_generate_template_missing_description(self):
        response = self._post(
            "ai_generate_template",
            {"card_type": "stamp", "industry": "cafe"},
        )
        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertFalse(data["success"])

    def test_suggest_colors_success(self):
        response = self._post(
            "ai_suggest_colors",
            {"description": "A trendy boutique", "industry": "retail"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIsInstance(data["data"], list)
        self.assertGreaterEqual(data["tokens_used"]["total_tokens"], 1)

    def test_critique_design_success(self):
        response = self._post(
            "ai_critique_design",
            {
                "design_data": {
                    "background_color": "#000000",
                    "foreground_color": "#FFFFFF",
                }
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIsInstance(data["data"], list)
        self.assertGreaterEqual(data["tokens_used"]["total_tokens"], 1)

    def test_suggest_stamp_icons_success(self):
        response = self._post(
            "ai_suggest_stamp_icons",
            {"business_type": "restaurant"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIsInstance(data["data"], list)
        self.assertGreaterEqual(data["tokens_used"]["total_tokens"], 1)

    def test_suggest_layout_success(self):
        response = self._post(
            "ai_suggest_layout",
            {
                "design_data": {
                    "background_color": "#000000",
                    "foreground_color": "#FFFFFF",
                },
                "card_type": "stamp",
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIsInstance(data["data"], dict)
        self.assertIn("name", data["data"])
        self.assertIn("reasoning", data["data"])
        self.assertGreaterEqual(data["tokens_used"]["total_tokens"], 1)

    def test_suggest_layout_missing_design_data(self):
        response = self._post(
            "ai_suggest_layout",
            {"card_type": "stamp"},
        )
        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertFalse(data["success"])

    def test_quota_returned_in_response(self):
        response = self._post(
            "ai_generate_template",
            {
                "description": "A cozy coffee shop",
                "card_type": "stamp",
                "industry": "cafe",
                "language": "es",
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("quota", data)
        self.assertIsInstance(data["quota"]["used"], int)
        self.assertIsInstance(data["quota"]["limit"], int)
        self.assertEqual(data["quota"]["limit"], 100)

    def test_unauthenticated_request_fails(self):
        response = self.client.post(
            reverse("ai_generate_template"),
            data=json.dumps({"description": "x", "card_type": "stamp", "industry": "cafe"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_invalid_token_fails(self):
        response = self.client.post(
            reverse("ai_generate_template"),
            data=json.dumps({"description": "x", "card_type": "stamp", "industry": "cafe"}),
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer invalidtoken",
        )
        self.assertEqual(response.status_code, 401)

    def test_plan_feature_required(self):
        """Users without ai_assistant feature should be blocked."""
        self.plan.features = []
        self.plan.save()
        response = self._post(
            "ai_generate_template",
            {"description": "x", "card_type": "stamp", "industry": "cafe"},
        )
        self.assertEqual(response.status_code, 403)
        data = response.json()
        self.assertIn("error", data)

    def test_rate_limit_hourly(self):
        """After 10 requests in the same hour, the 11th should be rate-limited."""
        payload = {"description": "x", "card_type": "stamp", "industry": "cafe"}
        for _ in range(10):
            resp = self._post("ai_generate_template", payload)
            self.assertEqual(resp.status_code, 200)

        # 11th request should be blocked
        resp = self._post("ai_generate_template", payload)
        self.assertEqual(resp.status_code, 429)
        data = resp.json()
        self.assertEqual(data["error"], "RATE_LIMIT_EXCEEDED")
        self.assertIn("retry_after", data)
        self.assertEqual(resp["Retry-After"], str(data["retry_after"]))

    def test_rate_limit_daily(self):
        """Simulate daily limit by pre-seeding the daily counter."""
        import hashlib

        from apps.ai.middleware import AI_DAILY_LIMIT

        # Seed the daily counter at the limit
        # NOTE: DRF force_authenticate sets user inside view, not middleware.
        # Middleware falls back to hashing the Authorization header.
        token_hash = hashlib.sha256(self.auth_header.encode()).hexdigest()[:16]
        daily_key = f"ai:rl:daily:token:{token_hash}"
        cache.set(daily_key, AI_DAILY_LIMIT, 86400)

        resp = self._post(
            "ai_generate_template",
            {"description": "x", "card_type": "stamp", "industry": "cafe"},
        )
        self.assertEqual(resp.status_code, 429)
        data = resp.json()
        self.assertEqual(data["limit"], "daily")

    def test_cost_tracking_increments(self):
        """Cost tracker should record usage after a successful call."""
        from apps.ai.services import CostTracker

        tracker = CostTracker()
        before = tracker.get_daily_requests(self.tenant.id)
        self._post(
            "ai_generate_template",
            {"description": "x", "card_type": "stamp", "industry": "cafe"},
        )
        after = tracker.get_daily_requests(self.tenant.id)
        self.assertEqual(after, before + 1)

    def test_invalid_json_body(self):
        response = self.client.post(
            reverse("ai_generate_template"),
            data="not json",
            content_type="application/json",
            HTTP_AUTHORIZATION=self.auth_header,
        )
        self.assertEqual(response.status_code, 422)

    def test_get_method_not_allowed(self):
        response = self.client.get(
            reverse("ai_generate_template"),
            HTTP_AUTHORIZATION=self.auth_header,
        )
        self.assertEqual(response.status_code, 405)
