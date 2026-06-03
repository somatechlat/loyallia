# Generated manually for P3 polish

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("transactions", "0009_enrollment_loyallia_en_custome_e849dd_idx_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="transaction",
            name="location",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="transactions",
                to="tenants.location",
                verbose_name="Ubicación",
                help_text="Physical location where the action took place.",
            ),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="staff",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="transactions",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Personal",
                help_text="The staff member who performed this action.",
            ),
        ),
    ]
