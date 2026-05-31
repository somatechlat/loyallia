# Account deletion scheduling.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0005_add_platform_settings"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="scheduled_deletion_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When set, tenant is deactivated and queued for irreversible cascade deletion.",
                null=True,
                verbose_name="Eliminación programada",
            ),
        ),
    ]
