"""
Add composite index on loyallia_cards (tenant_id, is_active)
for efficient tenant-scoped active card lookups.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cards", "0003_card_barcode_type"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="card",
            index=models.Index(
                fields=["tenant", "is_active"],
                name="idx_card_tenant_active",
            ),
        ),
    ]
