# Generated manually for WalletPassOperationLog model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("wallet", "0001_initial"),
        ("tenants", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WalletPassOperationLog",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "operation_type",
                    models.CharField(
                        max_length=30,
                        choices=[
                            ("template_create", "Template Create"),
                            ("template_update", "Template Update"),
                            ("template_delete", "Template Delete"),
                            ("template_use", "Template Use"),
                            ("ai_design", "AI Design"),
                        ],
                    ),
                ),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="wallet_operation_logs",
                        to="tenants.tenant",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="wallet_operation_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "wallet_pass_operation_logs",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="walletpassoperationlog",
            index=models.Index(
                fields=["tenant", "operation_type", "created_at"],
                name="wallet_oplog_tenant_type_created_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="walletpassoperationlog",
            index=models.Index(
                fields=["tenant", "created_at"], name="wallet_oplog_tenant_created_idx"
            ),
        ),
    ]
