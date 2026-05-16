"""
Validate Loyallia runtime environment separation.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from common.environment_guard import (
    enforce_settings_environment,
    validate_production_database_state,
)


class Command(BaseCommand):
    help = "Validate settings, Vault path, database, and production-only guardrails."

    def add_arguments(self, parser):
        parser.add_argument(
            "--mode",
            choices=("development", "production"),
            required=True,
            help="Runtime mode to validate.",
        )

    def handle(self, *args, **options):
        mode = options["mode"]
        enforce_settings_environment(mode=mode, databases=settings.DATABASES)

        if mode == "production":
            errors = validate_production_database_state()
            if errors:
                raise CommandError("; ".join(error.message for error in errors))

        self.stdout.write(self.style.SUCCESS(f"{mode} runtime environment is valid."))
