"""
Loyallia — Schema-only migration (formerly data migration).

SUPER_ADMIN user creation has been moved to management commands:
  python manage.py recover_admin_access --email admin@loyallia.com --password <secret>

This migration is retained as a no-op to preserve migration history.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0004_user_security_pin_hash"),
    ]

    operations = []
