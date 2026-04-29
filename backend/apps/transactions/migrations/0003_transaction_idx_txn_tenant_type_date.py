"""
Add composite index on loyallia_transactions (tenant_id, transaction_type, created_at)
for efficient analytics queries and tenant-scoped transaction filtering.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("transactions", "0002_enrollment_idx_enroll_tnt_cust_card_and_more"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="transaction",
            index=models.Index(
                fields=["tenant", "transaction_type", "created_at"],
                name="idx_txn_tenant_type_date",
            ),
        ),
    ]
