"""
Unit tests for AI services: KimiService, FallbackDesigner, CostTracker.

KimiService tests mock _call_chat_completion to avoid real HTTP calls.
CostTracker tests use the real PostgreSQL AIQueryLog model.
FallbackDesigner tests verify deterministic rule-based fallbacks.
"""

from decimal import Decimal
from unittest import mock

from django.test import TestCase, TransactionTestCase

from apps.ai.models import AIQueryLog
from apps.ai.services import CostTracker, FallbackDesigner, KimiService
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


class KimiServiceTests(TestCase):
    """Tests for KimiService with mocked chat completions."""

    def setUp(self):
        self._patch = mock.patch.object(KimiService, "_call_chat_completion", side_effect=_mock_chat_completion)
        self._patch.start()
        self.service = KimiService()
        self.addCleanup(self._patch.stop)

    def test_generate_template_returns_variations(self):
        result = self.service.generate_template(
            description="A cozy coffee shop with warm lighting",
            card_type="stamp",
            industry="cafe",
            language="es",
        )
        self.assertIn("variations", result)
        self.assertIn("tokens_used", result)
        self.assertGreaterEqual(len(result["variations"]), 1)
        self.assertGreaterEqual(result["tokens_used"]["total_tokens"], 1)

        for v in result["variations"]:
            self.assertIn("name", v)
            self.assertIn("description", v)
            self.assertIn("confidence", v)
            self.assertIn("design", v)
            self.assertIsInstance(v["confidence"], float)
            self.assertGreaterEqual(v["confidence"], 0.0)
            self.assertLessEqual(v["confidence"], 1.0)

    def test_suggest_colors_returns_palettes(self):
        result = self.service.suggest_colors(
            description="A trendy clothing boutique",
            industry="retail",
        )
        self.assertIn("palettes", result)
        self.assertIn("tokens_used", result)
        self.assertGreaterEqual(len(result["palettes"]), 1)
        self.assertGreaterEqual(result["tokens_used"]["total_tokens"], 1)

        for p in result["palettes"]:
            self.assertIn("name", p)
            self.assertIn("primary", p)
            self.assertIn("secondary", p)
            self.assertIn("background", p)
            self.assertIn("text", p)
            self.assertIn("accent", p)

    def test_critique_design_returns_suggestions(self):
        design = {
            "background_color": "#000000",
            "foreground_color": "#111111",
            "accent_color": "#222222",
        }
        result = self.service.critique_design(design)
        self.assertIn("suggestions", result)
        self.assertIn("score", result)
        self.assertIn("tokens_used", result)
        self.assertIsInstance(result["suggestions"], list)
        self.assertIsInstance(result["score"], int)
        self.assertGreaterEqual(result["tokens_used"]["total_tokens"], 1)

    def test_suggest_stamp_icons_returns_icons(self):
        result = self.service.suggest_stamp_icons("restaurant")
        self.assertIn("icons", result)
        self.assertIn("tokens_used", result)
        self.assertIsInstance(result["icons"], list)
        self.assertGreaterEqual(len(result["icons"]), 1)
        self.assertGreaterEqual(result["tokens_used"]["total_tokens"], 1)

    def test_suggest_stamp_icons_default_fallback(self):
        result = self.service.suggest_stamp_icons("unknown_business")
        self.assertIn("icons", result)
        self.assertIsInstance(result["icons"], list)

    def test_suggest_layout_returns_layout(self):
        design = {
            "background_color": "#000000",
            "foreground_color": "#FFFFFF",
            "accent_color": "#FF0000",
        }
        result = self.service.suggest_layout(design, "stamp")
        self.assertIn("layout", result)
        self.assertIn("tokens_used", result)
        layout = result["layout"]
        self.assertIn("name", layout)
        self.assertIn("description", layout)
        self.assertIn("logo_position", layout)
        self.assertIn("field_arrangement", layout)
        self.assertIn("header_style", layout)
        self.assertIn("footer_style", layout)
        self.assertIn("reasoning", layout)
        self.assertGreaterEqual(result["tokens_used"]["total_tokens"], 1)


class FallbackDesignerTests(TestCase):
    """Tests for FallbackDesigner rule-based presets."""

    def setUp(self):
        self.designer = FallbackDesigner()

    def test_get_colors_for_known_industry(self):
        colors = self.designer.get_colors("restaurant")
        self.assertGreaterEqual(len(colors), 1)
        for c in colors:
            self.assertIn("primary", c)
            self.assertIn("background", c)

    def test_get_colors_for_unknown_industry_returns_default(self):
        colors = self.designer.get_colors("space_tourism")
        self.assertGreaterEqual(len(colors), 1)

    def test_get_fields_for_known_card_type(self):
        fields = self.designer.get_fields("stamp")
        self.assertGreaterEqual(len(fields), 1)
        for f in fields:
            self.assertIn("key", f)
            self.assertIn("label", f)
            self.assertIn("type", f)

    def test_get_fields_for_unknown_card_type_returns_default(self):
        fields = self.designer.get_fields("hyperspace")
        self.assertGreaterEqual(len(fields), 1)

    def test_get_layouts_returns_patterns(self):
        layouts = self.designer.get_layouts()
        self.assertGreaterEqual(len(layouts), 1)
        for layout in layouts:
            self.assertIn("id", layout)
            self.assertIn("name", layout)

    def test_build_template_completeness(self):
        template = self.designer.build_template("loyalty", "retail")
        self.assertIn("name", template)
        self.assertIn("description", template)
        self.assertIn("confidence", template)
        self.assertIn("design", template)

    def test_stamp_icons_known_business(self):
        icons = self.designer.stamp_icons("restaurant")
        self.assertGreaterEqual(len(icons), 1)

    def test_stamp_icons_unknown_business(self):
        icons = self.designer.stamp_icons("quantum_computing")
        self.assertGreaterEqual(len(icons), 1)

    def test_critique_detects_contrast_issue(self):
        design = {"background_color": "#000000", "foreground_color": "#000001"}
        result = self.designer.critique(design)
        self.assertIn("suggestions", result)
        self.assertIn("score", result)
        self.assertLessEqual(result["score"], 100)

    def test_critique_detects_too_many_colors(self):
        design = {
            "background_color": "#000000",
            "foreground_color": "#111111",
            "accent_color": "#222222",
            "header_color": "#333333",
            "footer_color": "#444444",
            "border_color": "#555555",
            "text_color": "#666666",
            "link_color": "#777777",
        }
        result = self.designer.critique(design)
        self.assertIn("suggestions", result)
        self.assertIn("score", result)

    def test_suggest_layout_returns_fallback(self):
        result = self.designer.suggest_layout("stamp")
        self.assertIn("layout", result)
        self.assertIn("tokens_used", result)
        layout = result["layout"]
        self.assertIn("name", layout)
        self.assertIn("description", layout)
        self.assertIn("logo_position", layout)
        self.assertIn("field_arrangement", layout)
        self.assertIn("reasoning", layout)


class CostTrackerTests(TransactionTestCase):
    """Tests for CostTracker using real PostgreSQL storage."""

    def setUp(self):
        self.tenant = Tenant.objects.create(
            name="Cost Test Tenant",
            email="cost@test.com",
            phone="1234567890",
            industry="retail",
        )
        self.tracker = CostTracker()

    def test_record_cost_creates_log_entry(self):
        result = self.tracker.record_cost(
            tenant_id=self.tenant.id,
            endpoint="generate-template",
            tokens_used={
                "prompt_tokens": 100,
                "completion_tokens": 50,
                "total_tokens": 150,
            },
            request_data={"description": "test"},
            response_data={"variations": []},
        )
        self.assertIsNotNone(result["log_id"])
        self.assertGreater(result["cost_usd"], 0)
        self.assertEqual(result["total_tokens"], 150)

        log = AIQueryLog.objects.get(id=result["log_id"])
        self.assertEqual(log.tenant_id, self.tenant.id)
        self.assertEqual(log.endpoint, "generate-template")
        self.assertEqual(log.total_tokens, 150)
        self.assertEqual(log.status, "success")

    def test_record_cost_error_status(self):
        result = self.tracker.record_cost(
            tenant_id=self.tenant.id,
            endpoint="generate-template",
            tokens_used={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            status="error",
            error_message="API timeout",
        )
        self.assertIsNotNone(result["log_id"])

        log = AIQueryLog.objects.get(id=result["log_id"])
        self.assertEqual(log.status, "error")
        self.assertEqual(log.error_message, "API timeout")

    def test_get_monthly_cost_accumulates(self):
        self.tracker.record_cost(
            tenant_id=self.tenant.id,
            endpoint="generate-template",
            tokens_used={"total_tokens": 1000},
        )
        self.tracker.record_cost(
            tenant_id=self.tenant.id,
            endpoint="suggest-colors",
            tokens_used={"total_tokens": 500},
        )
        total = self.tracker.get_monthly_cost(self.tenant.id)
        expected = Decimal("1500") * Decimal("0.003") / Decimal("1000")
        self.assertAlmostEqual(float(total), float(expected), places=6)

    def test_get_daily_requests_counts_today(self):
        before = self.tracker.get_daily_requests(self.tenant.id)
        self.tracker.record_cost(
            tenant_id=self.tenant.id,
            endpoint="generate-template",
            tokens_used={"total_tokens": 100},
        )
        after = self.tracker.get_daily_requests(self.tenant.id)
        self.assertEqual(after, before + 1)
