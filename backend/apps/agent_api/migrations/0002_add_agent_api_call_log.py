# Generated manually on 2026-05-06

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("agent_api", "0001_initial"),
        ("tenants", "0004_tenant_default_language"),
    ]

    operations = [
        migrations.CreateModel(
            name="AgentAPICallLog",
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
                    "endpoint",
                    models.CharField(
                        max_length=255,
                        verbose_name="Endpoint",
                        help_text="URL path of the API call",
                    ),
                ),
                (
                    "method",
                    models.CharField(
                        max_length=10,
                        verbose_name="Método HTTP",
                    ),
                ),
                (
                    "status_code",
                    models.PositiveSmallIntegerField(
                        null=True,
                        blank=True,
                        verbose_name="Código de respuesta",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True,
                        verbose_name="Fecha de llamada",
                    ),
                ),
                (
                    "api_key",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="call_logs",
                        to="agent_api.agentapikey",
                        verbose_name="Clave de API",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="agent_api_call_logs",
                        to="tenants.tenant",
                        verbose_name="Negocio",
                    ),
                ),
            ],
            options={
                "verbose_name": "Log de llamada API (Agente)",
                "verbose_name_plural": "Logs de llamadas API (Agentes)",
                "db_table": "loyallia_agent_api_call_logs",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="agentapicalllog",
            index=models.Index(
                fields=["tenant", "created_at"],
                name="loyallia_ag_tenant__5f8caa_idx",
            ),
        ),
    ]
