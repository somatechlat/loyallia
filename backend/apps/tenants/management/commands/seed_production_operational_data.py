from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand

from common.environment_guard import enforce_settings_environment


class Command(BaseCommand):
    help = "Seed production operational data only. Does not create demo/E2E users."

    def handle(self, *args, **options):
        enforce_settings_environment(mode="production", databases=settings.DATABASES)
        call_command("seed_subscription_plans", stdout=self.stdout, stderr=self.stderr)
        call_command("seed_platform_settings", stdout=self.stdout, stderr=self.stderr)
        self.stdout.write(self.style.SUCCESS("Production operational data is ready."))
