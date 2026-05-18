"""
Loyallia  Data Migration: Seed Platform Settings (REQ-BOOT-001)

Seeds the default runtime-configurable platform settings that the system
requires to operate (trial duration, tax rate, timezone).

Idempotent: Uses get_or_create  NEVER overwrites existing user-modified values.
Reverse: noop (settings remain on rollback).

Called by: `python manage.py migrate --noinput` (automatic on every deploy).
"""

from django.db import migrations


def seed_platform_settings(apps, schema_editor):
    """Seed default platform settings if not already present."""
    PlatformSetting = apps.get_model("tenants", "PlatformSetting")

    defaults = [
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
    ]

    for item in defaults:
        PlatformSetting.objects.get_or_create(
            key=item["key"],
            defaults={
                "value": item["value"],
                "description": item["description"],
                "category": item["category"],
            },
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0007_alter_tenant_scheduled_deletion_at"),
    ]

    operations = [
        migrations.RunPython(seed_platform_settings, noop),
    ]
