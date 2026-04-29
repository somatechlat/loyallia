"""
Add composite index on loyallia_notifications (tenant_id, notification_type)
for efficient tenant-scoped notification type queries.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0001_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(
                fields=["tenant", "notification_type"],
                name="idx_notif_tenant_type",
            ),
        ),
    ]
