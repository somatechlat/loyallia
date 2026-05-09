"""
Loyallia — Data Migration: Repair legacy SUPER_ADMIN (REQ-BOOT-001)

Older seed scripts assigned a tenant to the SUPER_ADMIN and did not set
is_staff/is_superuser flags. This migration repairs any such legacy user.

Idempotent: Re-running has no effect if the user is already correct.
Reverse: noop.
"""

from django.db import migrations


def repair_superadmin(apps, schema_editor):
    """Fix legacy SUPER_ADMIN that was altered by old seed scripts."""
    User = apps.get_model("authentication", "User")

    admin = User.objects.filter(role="SUPER_ADMIN").first()
    if admin is None:
        return

    needs_save = False
    update_fields = []

    if admin.tenant_id is not None:
        admin.tenant = None
        needs_save = True
        update_fields.append("tenant")

    if not admin.is_staff:
        admin.is_staff = True
        needs_save = True
        update_fields.append("is_staff")

    if not admin.is_superuser:
        admin.is_superuser = True
        needs_save = True
        update_fields.append("is_superuser")

    if admin.email != "admin@loyallia.com":
        admin.email = "admin@loyallia.com"
        needs_save = True
        update_fields.append("email")

    # Reset password to canonical default via model method
    admin.set_password("Loyallia@Admin2026!")
    needs_save = True
    update_fields.append("password")

    if needs_save:
        admin.save(update_fields=update_fields)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0005_ensure_superadmin"),
    ]

    operations = [
        migrations.RunPython(repair_superadmin, noop),
    ]
