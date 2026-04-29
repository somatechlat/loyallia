"""
Management command to validate environment variables.
Usage: python manage.py validate_env [--production]
"""

import os

from django.core.management.base import BaseCommand

from common.env_validation import validate_environment


class Command(BaseCommand):
    help = "Validate required environment variables"

    def add_arguments(self, parser):
        parser.add_argument(
            "--production",
            action="store_true",
            help="Also validate production-specific variables",
        )

    def handle(self, *args, **options):
        is_production = options["production"]
        errors = validate_environment(is_production=is_production)

        if not errors:
            self.stdout.write(self.style.SUCCESS("✓ All environment variables are valid"))
            return

        self.stderr.write(self.style.ERROR(f"✗ Found {len(errors)} validation error(s):"))
        for err in errors:
            self.stderr.write(f"  • {err.message}")

        raise SystemExit(1)
