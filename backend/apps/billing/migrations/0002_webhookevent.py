"""
Migration: Add WebhookEvent model for webhook replay protection (LYL-H-SEC-003).
"""

import django.core.validators
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="WebhookEvent",
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
                    "event_id",
                    models.CharField(
                        help_text="Unique identifier from the payment gateway (or SHA-256 of payload)",
                        max_length=200,
                        unique=True,
                        verbose_name="Event ID",
                    ),
                ),
                (
                    "event_type",
                    models.CharField(
                        max_length=100,
                        verbose_name="Event type",
                    ),
                ),
                (
                    "processed_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "payload_hash",
                    models.CharField(
                        help_text="SHA-256 hash of the raw webhook body for deduplication",
                        max_length=64,
                        verbose_name="Payload SHA-256",
                    ),
                ),
            ],
            options={
                "verbose_name": "Webhook Event",
                "verbose_name_plural": "Webhook Events",
                "db_table": "lyl_webhook_events",
                "ordering": ["-processed_at"],
            },
        ),
        migrations.AddIndex(
            model_name="webhookevent",
            index=models.Index(
                fields=["event_id"],
                name="lyl_webhook_event_id_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="webhookevent",
            index=models.Index(
                fields=["processed_at"],
                name="lyl_webhook_processed_idx",
            ),
        ),
    ]
