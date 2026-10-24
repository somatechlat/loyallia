"""
Plan catalog consistency tests (single source of truth for consumer catalogs).

Covers the backend guarantees that keep the plan catalog consistent across
the marketing pricing page, the tenant onboarding wizard, and the DB:

- Consumer plan listings return only status='published' AND is_active=True,
  ordered by sort_order (SubscriptionPlan.published_catalog).
- `manage.py seed_subscription_plans --check` reports orphan DB plans (not in
  the fixture), duplicate slugs and duplicate published trial-like plans
  WITHOUT modifying the database.
- `manage.py seed_subscription_plans --archive-orphans` sets status='archived'
  on orphan plans and NEVER deletes rows or touches fixture slugs.
- Running the seed command without flags keeps its historical behavior
  (idempotent seed, no archiving).
- At most one published 'trial'-like plan is allowed (model validation).
"""

import json
from decimal import Decimal
from io import StringIO

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase
from django.test.client import Client

from apps.authentication.models import UserRole
from apps.billing.billing_service import BillingService
from apps.billing.management.commands.seed_subscription_plans import (
    fixture_slugs,
    load_fixture,
)
from apps.billing.models import SubscriptionPlan
from tests.factories import make_plan, make_tenant, make_user

FIXTURE_SLUGS = fixture_slugs(load_fixture())


def _get_auth_header(user):
    """Get JWT auth header by logging in (same pattern as test_api.py)."""
    password = getattr(user, "_test_password", None)
    client = Client()
    resp = client.post(
        "/api/v1/auth/login/",
        data=json.dumps({"email": user.email, "password": password}),
        content_type="application/json",
    )
    assert resp.status_code == 200, f"login failed: {resp.content}"
    return f"Bearer {resp.json().get('access_token', '')}"


class ConsumerPlanCatalogFilteringTest(TestCase):
    """Non-superadmin consumers see only published + active plans."""

    def setUp(self):
        self.tenant = make_tenant()
        self.user = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.header = _get_auth_header(self.user)

    def test_plans_endpoint_excludes_draft_archived_and_inactive(self):
        make_plan(slug="catalog-published", status=SubscriptionPlan.Status.PUBLISHED)
        make_plan(slug="catalog-draft", status=SubscriptionPlan.Status.DRAFT)
        make_plan(slug="catalog-archived", status=SubscriptionPlan.Status.ARCHIVED)
        make_plan(slug="catalog-inactive", is_active=False)

        resp = self.client.get("/api/v1/billing/plans/", HTTP_AUTHORIZATION=self.header)
        self.assertEqual(resp.status_code, 200)
        slugs = [p["slug"] for p in resp.json()["plans"]]
        self.assertIn("catalog-published", slugs)
        self.assertNotIn("catalog-draft", slugs)
        self.assertNotIn("catalog-archived", slugs)
        self.assertNotIn("catalog-inactive", slugs)

    def test_plans_endpoint_ordered_by_sort_order(self):
        make_plan(slug="catalog-c", sort_order=30)
        make_plan(slug="catalog-a", sort_order=10)
        make_plan(slug="catalog-b", sort_order=20)

        resp = self.client.get("/api/v1/billing/plans/", HTTP_AUTHORIZATION=self.header)
        self.assertEqual(resp.status_code, 200)
        slugs = [p["slug"] for p in resp.json()["plans"]]
        self.assertListEqual(
            ["catalog-a", "catalog-b", "catalog-c"],
            [s for s in slugs if s.startswith("catalog-")],
        )

    def test_billing_service_get_plans_excludes_draft_archived(self):
        make_plan(slug="service-published", status=SubscriptionPlan.Status.PUBLISHED)
        make_plan(slug="service-draft", status=SubscriptionPlan.Status.DRAFT)
        make_plan(slug="service-archived", status=SubscriptionPlan.Status.ARCHIVED)
        make_plan(slug="service-inactive", is_active=False)

        slugs = [p["slug"] for p in BillingService.get_plans()]
        self.assertIn("service-published", slugs)
        self.assertNotIn("service-draft", slugs)
        self.assertNotIn("service-archived", slugs)
        self.assertNotIn("service-inactive", slugs)

    def test_published_catalog_orders_by_sort_order(self):
        make_plan(slug="qs-c", sort_order=30)
        make_plan(slug="qs-a", sort_order=10)
        make_plan(slug="qs-b", sort_order=20)

        slugs = list(
            SubscriptionPlan.published_catalog().values_list("slug", flat=True)
        )
        self.assertListEqual(
            ["qs-a", "qs-b", "qs-c"], [s for s in slugs if s.startswith("qs-")]
        )


class SeedCommandCheckModeTest(TestCase):
    """--check reports catalog drift and never modifies the database."""

    def _run(self, *args):
        out = StringIO()
        call_command("seed_subscription_plans", *args, stdout=out)
        return out.getvalue()

    def test_check_reports_orphans_and_missing_without_changes(self):
        orphan = make_plan(
            slug="legacy-orphan-plan", status=SubscriptionPlan.Status.DRAFT
        )
        plan_count_before = SubscriptionPlan.objects.count()

        output = self._run("--check")

        self.assertIn("ORPHAN (in DB, not in fixture)", output)
        self.assertIn("legacy-orphan-plan", output)
        self.assertIn("MISSING (in fixture, not in DB): starter", output)
        self.assertIn("No database changes were made", output)

        # Nothing was created, updated, archived or deleted.
        self.assertEqual(SubscriptionPlan.objects.count(), plan_count_before)
        orphan.refresh_from_db()
        self.assertEqual(orphan.status, SubscriptionPlan.Status.DRAFT)
        self.assertFalse(SubscriptionPlan.objects.filter(slug="starter").exists())

    def test_check_reports_duplicate_published_trial_like_plans(self):
        make_plan(slug="trial", price_monthly=Decimal("0.00"))
        make_plan(slug="free-forever", price_monthly=Decimal("0.00"))

        output = self._run("--check")

        self.assertIn("multiple published trial-like plans", output)
        self.assertIn("trial", output)
        self.assertIn("free-forever", output)

    def test_check_reports_ok_for_single_trial_plan(self):
        make_plan(slug="trial", price_monthly=Decimal("0.00"))

        output = self._run("--check")

        self.assertIn("Published trial-like plans: OK", output)

    def test_check_with_archive_flag_still_makes_no_changes(self):
        orphan = make_plan(slug="legacy-orphan-plan")

        output = self._run("--check", "--archive-orphans")

        self.assertIn("would set status='archived' on: legacy-orphan-plan", output)
        orphan.refresh_from_db()
        self.assertEqual(orphan.status, SubscriptionPlan.Status.PUBLISHED)
        self.assertTrue(orphan.is_active)


class SeedCommandArchiveOrphansTest(TestCase):
    """--archive-orphans archives orphans (status only) and never deletes."""

    def _run(self, *args):
        out = StringIO()
        call_command("seed_subscription_plans", *args, stdout=out)
        return out.getvalue()

    def test_archive_orphans_sets_archived_and_never_deletes(self):
        make_plan(slug="legacy-orphan-plan")

        output = self._run("--archive-orphans")

        self.assertIn("Archived orphan: legacy-orphan-plan", output)
        self.assertIn("No rows deleted", output)

        # The row still exists — archived, not deleted.
        plan = SubscriptionPlan.objects.get(slug="legacy-orphan-plan")
        self.assertEqual(plan.status, SubscriptionPlan.Status.ARCHIVED)

        # Canonical fixture plans were seeded and NOT archived.
        for slug in FIXTURE_SLUGS:
            self.assertEqual(
                SubscriptionPlan.objects.get(slug=slug).status,
                SubscriptionPlan.Status.PUBLISHED,
                f"fixture plan '{slug}' must remain published",
            )

    def test_archive_orphans_never_touches_fixture_slugs(self):
        fixture_plan = make_plan(slug="starter", status=SubscriptionPlan.Status.DRAFT)

        self._run("--archive-orphans")

        # 'starter' is a fixture slug: seeded (skipped, already exists) and
        # never archived, even though its status differs from the fixture.
        fixture_plan.refresh_from_db()
        self.assertEqual(fixture_plan.status, SubscriptionPlan.Status.DRAFT)

    def test_default_run_keeps_existing_behavior_and_leaves_orphans_alone(self):
        orphan = make_plan(
            slug="legacy-orphan-plan", status=SubscriptionPlan.Status.DRAFT
        )

        output = self._run()

        self.assertIn("Done:", output)
        self.assertNotIn("Archived orphan", output)

        orphan.refresh_from_db()
        self.assertEqual(orphan.status, SubscriptionPlan.Status.DRAFT)
        self.assertTrue(orphan.is_active)
        self.assertTrue(SubscriptionPlan.objects.filter(slug="trial").exists())
        self.assertTrue(SubscriptionPlan.objects.filter(slug="starter").exists())


class SinglePublishedTrialPlanValidationTest(TestCase):
    """At most one published 'trial'-like plan (non-breaking validation)."""

    def test_second_published_trial_like_plan_fails_validation(self):
        make_plan(slug="trial", price_monthly=Decimal("0.00"))
        duplicate = make_plan(slug="free-plan", price_monthly=Decimal("0.00"))

        with self.assertRaises(ValidationError):
            duplicate.full_clean()

    def test_draft_trial_like_plan_does_not_conflict(self):
        make_plan(slug="trial", price_monthly=Decimal("0.00"))
        draft_duplicate = make_plan(
            slug="draft-free-plan",
            price_monthly=Decimal("0.00"),
            status=SubscriptionPlan.Status.DRAFT,
        )

        draft_duplicate.full_clean()  # must not raise

    def test_regular_plan_passes_validation(self):
        plan = make_plan(slug="regular-plan", price_monthly=Decimal("29.00"))

        plan.full_clean()  # must not raise

    def test_updating_existing_trial_plan_does_not_conflict_with_itself(self):
        plan = make_plan(slug="trial", price_monthly=Decimal("0.00"))

        plan.name = "Trial Updated"
        plan.full_clean()  # must not raise (excludes itself)
