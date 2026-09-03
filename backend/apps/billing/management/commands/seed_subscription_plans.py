"""
Loyallia Seed Subscription Plans (REQ-PLAN-001)
Creates the default 4-tier plan structure from canonical JSON fixture.
Idempotent  safe to run multiple times.

Usage:
    python manage.py seed_subscription_plans
    python manage.py seed_subscription_plans --update-existing
"""

import json
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.billing.models import SubscriptionPlan

FIXTURE_PATH = Path(__file__).parent.parent.parent / "fixtures" / "subscription_plans.json"


class Command(BaseCommand):
    """Management command to seed default subscription plans from fixture."""

    help = "Seed default subscription plans (Trial, Starter, Professional, Enterprise)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--update-existing",
            action="store_true",
            help="Update existing plans with fixture values (default: skip existing)",
        )

    def handle(self, *args, **options):
        if not FIXTURE_PATH.exists():
            self.stdout.write(self.style.ERROR(f"Fixture not found: {FIXTURE_PATH}"))
            return

        with open(FIXTURE_PATH) as f:
            fixture = json.load(f)

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for item in fixture:
            fields = item["fields"]
            slug = fields.pop("slug")

            # Convert Decimal strings to Decimal objects
            for key in ("price_monthly", "price_annual"):
                if key in fields:
                    fields[key] = Decimal(str(fields[key]))

            obj, created = (
                SubscriptionPlan.objects.update_or_create(
                    slug=slug,
                    defaults=fields if options["update_existing"] else {},
                )
                if options["update_existing"]
                else SubscriptionPlan.objects.get_or_create(
                    slug=slug,
                    defaults=fields,
                )
            )

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"   Created: {obj.name}"))
            elif options["update_existing"]:
                updated_count += 1
                self.stdout.write(self.style.NOTICE(f"  Updated: {obj.name}"))
            else:
                skipped_count += 1
                self.stdout.write(self.style.NOTICE(f"  Skipped: {obj.name} (already exists)"))

        self.stdout.write(
            self.style.SUCCESS(f"\nDone: {created_count} created, {updated_count} updated, {skipped_count} skipped.")
        )
