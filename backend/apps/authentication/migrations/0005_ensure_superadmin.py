"""
Loyallia — Data Migration: Ensure SUPER_ADMIN User (REQ-BOOT-001)

Creates the platform-level SUPER_ADMIN user on first migration.
This guarantees the system boots to a usable state regardless of DEBUG mode.

Idempotent: Skips if any SUPER_ADMIN user already exists.
Reverse: noop (user remains on rollback — intentional for safety).

Called by: `python manage.py migrate --noinput` (automatic on every deploy).
"""

import uuid

from django.db import migrations


def ensure_superadmin(apps, schema_editor):
    """Create default SUPER_ADMIN user if none exists.

    SEC: Password is hashed via Django's make_password() — no plaintext storage.
    ARCH: tenant=None → platform-level access, not scoped to any business.
    """
    User = apps.get_model("authentication", "User")
    if User.objects.filter(role="SUPER_ADMIN").exists():
        return

    from django.contrib.auth.hashers import make_password

    User.objects.create(
        id=uuid.uuid4(),
        email="admin@loyallia.com",
        password=make_password("Loyallia@Admin2026!"),
        first_name="Sistema",
        last_name="Admin",
        role="SUPER_ADMIN",
        tenant=None,
        is_staff=True,
        is_superuser=True,
        is_active=True,
    )


def noop(apps, schema_editor):
    """Reverse migration is a no-op — SUPER_ADMIN user stays on rollback."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0004_user_security_pin_hash"),
    ]

    operations = [
        migrations.RunPython(ensure_superadmin, noop),
    ]
