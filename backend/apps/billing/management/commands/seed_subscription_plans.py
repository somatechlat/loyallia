"""
Loyallia Seed Subscription Plans (REQ-PLAN-001)
Creates the default 4-tier plan structure from canonical JSON fixture.
Idempotent  safe to run multiple times.

Usage:
    python manage.py seed_subscription_plans
    python manage.py seed_subscription_plans --update-existing
    python manage.py seed_subscription_plans --check
    python manage.py seed_subscription_plans --archive-orphans

Flags:
    --check            Report-only catalog audit (orphans, duplicate slugs,
                       duplicate published trial-like plans, fixture gaps).
                       NEVER modifies the database. When combined with
                       --archive-orphans it only reports what would be archived.
    --archive-orphans  After the normal seed run, set status='archived' on DB
                       plans whose slug is NOT in the fixture. NEVER deletes
                       rows and never touches fixture slugs. Only the 'status'
                       field is changed.
"""

import json
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db.models import Count, Q

from apps.billing.models import SubscriptionPlan

FIXTURE_PATH = (
    Path(__file__).parent.parent.parent / "fixtures" / "subscription_plans.json"
)


def load_fixture() -> list[dict]:
    """Load the canonical plan fixture (shared by seed and report modes)."""
    with open(FIXTURE_PATH) as f:
        return json.load(f)


def fixture_slugs(fixture: list[dict]) -> list[str]:
    """Return the canonical slugs defined by the fixture."""
    return [item["fields"]["slug"] for item in fixture]


class Command(BaseCommand):
    """Management command to seed default subscription plans from fixture."""

    help = "Seed default subscription plans (Trial, Starter, Professional, Enterprise)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--update-existing",
            action="store_true",
            help="Update existing plans with fixture values (default: skip existing)",
        )
        parser.add_argument(
            "--check",
            action="store_true",
            help=(
                "Report-only catalog audit: list DB plans not in the fixture "
                "(orphans), duplicate slugs, and duplicate published trial-like "
                "plans. Makes NO database changes."
            ),
        )
        parser.add_argument(
            "--archive-orphans",
            action="store_true",
            help=(
                "Set status='archived' on DB plans whose slug is not in the "
                "fixture. Never deletes anything and never touches fixture "
                "slugs. Ignored when --check is given."
            ),
        )

    def handle(self, *args, **options):
        if not FIXTURE_PATH.exists():
            self.stdout.write(self.style.ERROR(f"Fixture not found: {FIXTURE_PATH}"))
            return

        fixture = load_fixture()
        canonical_slugs = fixture_slugs(fixture)

        if options["check"]:
            self._report(canonical_slugs, archive_would_run=options["archive_orphans"])
            return

        self._seed(fixture, update_existing=options["update_existing"])

        if options["archive_orphans"]:
            self._archive_orphans(canonical_slugs)

    # ── Seed (existing behavior) ─────────────────────────────────────────

    def _seed(self, fixture: list[dict], *, update_existing: bool) -> None:
        created_count = 0
        updated_count = 0
        skipped_count = 0

        for item in fixture:
            fields = dict(item["fields"])
            slug = fields.pop("slug")

            # Convert Decimal strings to Decimal objects
            for key in ("price_monthly", "price_annual"):
                if key in fields:
                    fields[key] = Decimal(str(fields[key]))

            obj, created = (
                SubscriptionPlan.objects.update_or_create(
                    slug=slug,
                    defaults=fields if update_existing else {},
                )
                if update_existing
                else SubscriptionPlan.objects.get_or_create(
                    slug=slug,
                    defaults=fields,
                )
            )

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"   Created: {obj.name}"))
            elif update_existing:
                updated_count += 1
                self.stdout.write(self.style.NOTICE(f"  Updated: {obj.name}"))
            else:
                skipped_count += 1
                self.stdout.write(
                    self.style.NOTICE(f"  Skipped: {obj.name} (already exists)")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone: {created_count} created, {updated_count} updated, {skipped_count} skipped."
            )
        )

    # ── Report mode (--check): never modifies the database ───────────────

    def _report(self, canonical_slugs: list[str], *, archive_would_run: bool) -> None:
        db_plans = SubscriptionPlan.objects.all()
        orphans = db_plans.exclude(slug__in=canonical_slugs).order_by("slug")
        missing = [s for s in canonical_slugs if not db_plans.filter(slug=s).exists()]

        self.stdout.write("Plan catalog check (report only, no changes made)")
        self.stdout.write(f"  Fixture plans: {len(canonical_slugs)}")
        self.stdout.write(f"  DB plans: {db_plans.count()}")

        if missing:
            for slug in missing:
                self.stdout.write(f"  MISSING (in fixture, not in DB): {slug}")
        else:
            self.stdout.write("  MISSING (in fixture, not in DB): none")

        if orphans.exists():
            for plan in orphans:
                self.stdout.write(
                    f"  ORPHAN (in DB, not in fixture): slug={plan.slug} "
                    f'name="{plan.name}" status={plan.status} is_active={plan.is_active}'
                )
        else:
            self.stdout.write("  ORPHAN (in DB, not in fixture): none")

        duplicates = (
            db_plans.values("slug").annotate(cnt=Count("id")).filter(cnt__gt=1)
        )
        if duplicates.exists():
            for row in duplicates:
                self.stdout.write(
                    f"  DUPLICATE SLUG: {row['slug']} ({row['cnt']} rows)"
                )
        else:
            self.stdout.write(
                "  DUPLICATE SLUG: none (slug column is unique at DB level)"
            )

        trial_like = db_plans.filter(
            Q(slug="trial") | Q(price_monthly=0),
            status=SubscriptionPlan.Status.PUBLISHED,
            is_active=True,
        ).order_by("slug")
        if trial_like.count() > 1:
            slugs = ", ".join(p.slug for p in trial_like)
            self.stdout.write(
                f"  WARNING multiple published trial-like plans: {slugs} "
                "(only one published 'trial'-like plan is allowed)"
            )
        else:
            self.stdout.write("  Published trial-like plans: OK (at most one)")

        if archive_would_run:
            if orphans.exists():
                slugs = ", ".join(p.slug for p in orphans)
                self.stdout.write(
                    f"  --archive-orphans would set status='archived' on: {slugs}"
                )
            else:
                self.stdout.write("  --archive-orphans would archive: none")

        self.stdout.write("Check complete. No database changes were made.")

    # ── Orphan archiving (--archive-orphans): never deletes ──────────────

    def _archive_orphans(self, canonical_slugs: list[str]) -> None:
        orphans = SubscriptionPlan.objects.exclude(slug__in=canonical_slugs).order_by(
            "slug"
        )
        archived_count = 0
        for plan in orphans:
            if plan.status == SubscriptionPlan.Status.ARCHIVED:
                continue
            previous_status = plan.status
            plan.status = SubscriptionPlan.Status.ARCHIVED
            plan.save(update_fields=["status", "updated_at"])
            archived_count += 1
            self.stdout.write(
                self.style.WARNING(
                    f"  Archived orphan: {plan.slug} (was status={previous_status})"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nArchived {archived_count} orphan plan(s). No rows deleted."
            )
        )
