"""Bootstrap runtime-configurable platform settings.

Run with:
    docker compose exec api python manage.py seed_platform_settings

Idempotent — safe to run multiple times; existing keys are skipped.
"""

from django.core.management.base import BaseCommand

from apps.tenants.models import PlatformSetting

DEFAULTS = [
    {
        "key": "TRIAL_DAYS",
        "value": "5",
        "description": "Días de prueba por defecto para nuevos tenants",
        "category": "billing",
    },
    {
        "key": "TAX_RATE_ECUADOR",
        "value": "0.15",
        "description": "Tasa de IVA Ecuador (0.15 = 15%)",
        "category": "billing",
    },
    {
        "key": "DEFAULT_TIMEZONE",
        "value": "America/Guayaquil",
        "description": "Zona horaria por defecto de la plataforma",
        "category": "system",
    },
    {
        "key": "PLATFORM_MODE",
        "value": "production",
        "description": "Modo de la plataforma (development/production)",
        "category": "system",
    },
]


class Command(BaseCommand):
    help = "Seed default platform settings (idempotent)"

    def handle(self, *args, **options):
        created_count = 0
        for item in DEFAULTS:
            setting, created = PlatformSetting.objects.get_or_create(
                key=item["key"],
                defaults={
                    "value": item["value"],
                    "description": item["description"],
                    "category": item["category"],
                },
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created {setting.key} = {setting.value}"))
                created_count += 1
            else:
                self.stdout.write(self.style.NOTICE(f"Skipped {setting.key} (already exists)"))

        self.stdout.write(
            self.style.SUCCESS(f"\nDone. {created_count} setting(s) created, {len(DEFAULTS) - created_count} skipped.")
        )
