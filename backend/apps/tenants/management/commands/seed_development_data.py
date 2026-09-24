from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from common.environment_guard import enforce_settings_environment


class Command(BaseCommand):
    help = "Seed development-only RBAC E2E users and local demo prerequisites."

    def add_arguments(self, parser):
        parser.add_argument(
            "--generate",
            action="store_true",
            help="Generate local ignored E2E credentials.",
        )

    def handle(self, *args, **options):
        enforce_settings_environment(mode="development", databases=settings.DATABASES)
        if not settings.DEBUG:
            raise CommandError(
                "seed_development_data can only run in DEBUG development mode."
            )

        call_command(
            "provision_development_rbac_test_users",
            generate=options["generate"],
            stdout=self.stdout,
            stderr=self.stderr,
        )
        call_command("seed_platform_settings", stdout=self.stdout, stderr=self.stderr)
        self.stdout.write(self.style.SUCCESS("Development data is ready."))
