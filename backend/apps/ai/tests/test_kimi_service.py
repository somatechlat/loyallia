"""
Unit tests for AI services: KimiService, FallbackDesigner, CostTracker.
"""

from django.test import TestCase
from django.core.cache import cache

from apps.ai.services import CostTracker, FallbackDesigner, KimiService


class KimiServiceTests(TestCase):
    """Tests for KimiService mock implementations."""

    def setUp(self):
        self.service = KimiService()

    def test_generate_template_returns_variations(self):
        result = self.service.generate_template(
            description="A cozy coffee shop with warm lighting",
            card_type="stamp",
            industry="cafe",
            language="es",
        )
        self.assertIn("variations", result)
        self.assertIn("tokens_used", result)
        self.assertEqual(len(result["variations"]), 3)

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

    def test_suggest_stamp_icons_returns_icons(self):
        result = self.service.suggest_stamp_icons("restaurant")
        self.assertIn("icons", result)
        self.assertIn("tokens_used", result)
        self.assertIsInstance(result["icons"], list)
        self.assertGreaterEqual(len(result["icons"]), 1)

    def test_suggest_stamp_icons_default_fallback(self):
        result = self.service.suggest_stamp_icons("unknown_business")
        self.assertIn("icons", result)
        self.assertIsInstance(result["icons"], list)


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
        for l in layouts:
            self.assertIn("id", l)
            self.assertIn("name", l)
            self.assertIn("structure", l)

    def test_build_template_completeness(self):
        template = self.designer.build_template("stamp", "cafe")
        self.assertIn("name", template)
        self.assertIn("design", template)
        self.assertIn("fields", template)
        self.assertIn("layout", template)
        self.assertEqual(template["source"], "fallback")


class CostTrackerTests(TestCase):
    """Tests for CostTracker in-memory/cached tracking."""

    def setUp(self):
        self.tracker = CostTracker()
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_track_request_and_get_daily_cost(self):
        self.tracker.track_request("tenant-1", "generate-template", tokens_used=1000)
        cost = self.tracker.get_daily_cost("tenant-1")
        self.assertGreater(cost, 0.0)

    def test_track_request_and_get_monthly_cost(self):
        self.tracker.track_request("tenant-1", "suggest-colors", tokens_used=2000)
        cost = self.tracker.get_monthly_cost("tenant-1")
        self.assertGreater(cost, 0.0)

    def test_get_daily_cost_zero_when_no_requests(self):
        cost = self.tracker.get_daily_cost("tenant-empty")
        self.assertEqual(cost, 0.0)

    def test_get_monthly_cost_zero_when_no_requests(self):
        cost = self.tracker.get_monthly_cost("tenant-empty")
        self.assertEqual(cost, 0.0)

    def test_multiple_requests_accumulate(self):
        self.tracker.track_request("tenant-2", "generate-template", tokens_used=1000)
        self.tracker.track_request("tenant-2", "generate-template", tokens_used=1000)
        daily = self.tracker.get_daily_requests("tenant-2")
        self.assertEqual(daily, 2)

    def test_explicit_cost_override(self):
        self.tracker.track_request("tenant-3", "generate-template", tokens_used=0, cost_usd=1.5)
        self.assertEqual(self.tracker.get_daily_cost("tenant-3"), 1.5)
