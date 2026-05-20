"""
Loyallia — Schema-only migration (formerly data migration).

Subscription plan seeding has been moved to management commands:
  python manage.py seed_subscription_plans

This migration is retained as a no-op to preserve migration history.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0007_add_rate_limit_fields"),
    ]

    operations = []
