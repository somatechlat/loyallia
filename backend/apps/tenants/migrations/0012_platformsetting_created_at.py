# Generated manually for P3 polish

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tenants", "0011_alter_location_address_alter_location_city_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="platformsetting",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                db_index=True,
                default=django.utils.timezone.now,
                help_text="Timestamp for created.",
            ),
            preserve_default=False,
        ),
    ]
