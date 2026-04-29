"""
Add composite index on loyallia_customer_passes (card_id, is_active)
for efficient scanner lookups and pass filtering by program.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("customers", "0003_customer_idx_cust_tenant_created_and_more"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="customerpass",
            index=models.Index(
                fields=["card", "is_active"],
                name="idx_pass_card_active",
            ),
        ),
    ]
