"""
Fix existing Card image URLs that use relative /assets/... paths.

Converts them to absolute URLs using PUBLIC_BASE_URL so wallet pass
generation can fetch them without HTTP round-trips.
"""

import logging

from django.core.management.base import BaseCommand

from common.platform_config import get_platform_config

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Convert relative /assets/ image URLs on Cards to absolute URLs"

    def handle(self, *args, **options):
        from django.conf import settings

        from apps.cards.models import Card

        public_base = get_platform_config("public_base_url", getattr(settings, "PUBLIC_BASE_URL", "")).rstrip("/")

        if not public_base:
            self.stderr.write(
                self.style.ERROR(
                    "PUBLIC_BASE_URL is not set. Cannot convert relative URLs. "
                    "Set it in PlatformSetting or environment first."
                )
            )
            return

        updated = 0
        url_fields = ["logo_url", "icon_url", "strip_image_url"]

        for card in Card.objects.all():
            changes = []
            for field in url_fields:
                value = getattr(card, field, "")
                if value and value.startswith("/assets/"):
                    new_value = f"{public_base}{value}"
                    setattr(card, field, new_value)
                    changes.append(f"{field}: {value} → {new_value}")

            if changes:
                card.save(update_fields=url_fields + ["updated_at"])
                updated += 1
                self.stdout.write(f"Fixed card '{card.name}' ({card.id}):")
                for c in changes:
                    self.stdout.write(f"  {c}")

        self.stdout.write(self.style.SUCCESS(f"\nDone. Updated {updated} card(s) with absolute image URLs."))
