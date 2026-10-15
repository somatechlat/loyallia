"""
Seed SysAdmin-editable AI agent platform settings.

Makes the agent's runtime configuration (kill switch, default profile,
context lifetime) visible and editable under SuperAdmin → Settings →
Platform (category "agent"), effective immediately via PlatformSetting's
60s cache. The agent URL and API key stay Vault-backed integration secrets
managed in the Integrations tab (PUT /platform/integrations/ai_agent/secret/).

Generated for: AI agent SysAdmin configuration (2026-10-15).
"""

from django.db import migrations

SETTINGS = [
    (
        "ai_agent_enabled",
        "true",
        "Habilitar el asistente de IA del panel (kill switch; false = chat devuelve 503)",
        "agent",
    ),
    (
        "ai_agent_profile",
        "loyallia-help",
        "Perfil de Agent Zero para nuevas sesiones de chat del panel",
        "agent",
    ),
    (
        "ai_agent_context_lifetime_hours",
        "24",
        "Duración de las sesiones de chat de IA en horas (1-168); se refleja en el agente",
        "agent",
    ),
]


def _seed(apps, schema_editor):
    """Create the settings when absent; never overwrite an existing value."""
    PlatformSetting = apps.get_model("tenants", "PlatformSetting")
    for key, value, description, category in SETTINGS:
        PlatformSetting.objects.get_or_create(
            key=key,
            defaults={
                "value": value,
                "description": description,
                "category": category,
            },
        )


def _unseed(apps, schema_editor):
    PlatformSetting = apps.get_model("tenants", "PlatformSetting")
    PlatformSetting.objects.filter(key__in=[row[0] for row in SETTINGS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("tenants", "0013_alter_tenant_slug"),
    ]

    operations = [
        migrations.RunPython(_seed, _unseed),
    ]
