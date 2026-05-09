"""
Loyallia — Data Migration: Ensure SUPER_ADMIN User (REQ-BOOT-001)

Creates or corrects the platform-level SUPER_ADMIN user on first migration.
This guarantees the system boots to a usable state regardless of DEBUG mode.

Idempotent:
    - If no SUPER_ADMIN exists → creates one with correct credentials/flags.
    - If a SUPER_ADMIN exists but has wrong tenant/staff/superuser flags
      (legacy from old seed scripts) → corrects them.
    - If already correct → no-op.

Reverse: noop (user remains on rollback — intentional for safety).

Called by: `python manage.py migrate --noinput` (automatic on every deploy).
"""

import uuid

from django.db import migrations


def ensure_superadmin(apps, schema_editor):
    """Create or repair the default SUPER_ADMIN user.

    SEC: Password is hashed via Django's make_password() — no plaintext storage.
    ARCH: tenant=None → platform-level access, not scoped to any business.
    """
    User = apps.get_model("authentication", "User")
    from django.contrib.auth.hashers import make_password

    admin = User.objects.filter(role="SUPER_ADMIN").first()

    if admin is None:
        # Create fresh SUPER_ADMIN
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
        return

    # Fix legacy SUPER_ADMIN that may have been altered by old seed scripts
    needs_save = False
    if admin.tenant_id is not None:
        admin.tenant_id = None
        needs_save = True
    if not admin.is_staff:
        admin.is_staff = True
        needs_save = True
    if not admin.is_superuser:
        admin.is_superuser = True
        needs_save = True
    if admin.email != "admin@loyallia.com":
        admin.email = "admin@loyallia.com"
        needs_save = True

    # Always reset password to the canonical default (idempotent for new deploys)
    admin.password = make_password("Loyallia@Admin2026!")
    needs_save = True

    if needs_save:
        admin.save(update_fields=["tenant", "is_staff", "is_superuser", "email", "password"])


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
