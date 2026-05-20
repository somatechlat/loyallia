"""
Loyallia — Schema-only migration (formerly data migration).

Platform setting seeding has been moved to management commands:
  python manage.py seed_platform_settings

This migration is retained as a no-op to preserve migration history.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0007_alter_tenant_scheduled_deletion_at"),
    ]

    operations = []
