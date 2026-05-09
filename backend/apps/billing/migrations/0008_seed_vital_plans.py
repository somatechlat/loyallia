"""
Loyallia — Data Migration: Seed Vital Subscription Plans (REQ-BOOT-001)

Seeds the 4-tier plan structure (Trial, Starter, Professional, Enterprise)
that the platform requires to function. Without plans, no tenant can
register or subscribe.

Idempotent: Uses update_or_create on slug — safe on repeated migrations.
Reverse: noop (plans remain on rollback).

Called by: `python manage.py migrate --noinput` (automatic on every deploy).
"""

from decimal import Decimal

from django.db import migrations


def seed_plans(apps, schema_editor):
    """Seed default subscription plans if not already present."""
    SubscriptionPlan = apps.get_model("billing", "SubscriptionPlan")

    ALL_FEATURES = [
        "geo_fencing",
        "automation",
        "advanced_analytics",
        "priority_support",
        "custom_branding",
        "multi_language",
        "api_access",
        "webhook_events",
        "data_export",
        "white_label",
        "ai_assistant",
        "agent_access",
        "whatsapp_campaigns",
        "email_campaigns",
        "wallet_campaigns",
        "sms_campaigns",
    ]

    plans = [
        {
            "slug": "trial",
            "name": "Trial",
            "description": "Prueba gratuita con todas las funcionalidades desbloqueadas.",
            "price_monthly": Decimal("0.00"),
            "price_annual": Decimal("0.00"),
            "max_locations": 999999,
            "max_users": 999999,
            "max_customers": 999999,
            "max_programs": 999999,
            "max_notifications_month": 999999,
            "max_transactions_month": 999999,
            "max_whatsapp_day": 200,
            "max_emails_month": 10000,
            "max_sms_day": 500,
            "max_wallet_pushes_month": 10000,
            "features": ALL_FEATURES,
            "trial_days": 5,
            "sort_order": 0,
            "is_featured": False,
        },
        {
            "slug": "starter",
            "name": "Starter",
            "description": "Ideal para negocios que inician su programa de fidelización.",
            "price_monthly": Decimal("29.00"),
            "price_annual": Decimal("290.00"),
            "max_locations": 1,
            "max_users": 3,
            "max_customers": 500,
            "max_programs": 3,
            "max_notifications_month": 1000,
            "max_transactions_month": 5000,
            "max_whatsapp_day": 0,
            "max_emails_month": 100,
            "max_sms_day": 0,
            "max_wallet_pushes_month": 0,
            "features": ["data_export"],
            "trial_days": 5,
            "sort_order": 1,
            "is_featured": False,
        },
        {
            "slug": "professional",
            "name": "Professional",
            "description": "Para negocios en crecimiento con múltiples sucursales.",
            "price_monthly": Decimal("75.00"),
            "price_annual": Decimal("750.00"),
            "max_locations": 5,
            "max_users": 10,
            "max_customers": 10000,
            "max_programs": 10,
            "max_notifications_month": 10000,
            "max_transactions_month": 50000,
            "max_whatsapp_day": 50,
            "max_emails_month": 1000,
            "max_sms_day": 50,
            "max_wallet_pushes_month": 500,
            "features": [
                "geo_fencing",
                "automation",
                "advanced_analytics",
                "priority_support",
                "custom_branding",
                "data_export",
            ],
            "trial_days": 5,
            "sort_order": 2,
            "is_featured": True,
        },
        {
            "slug": "enterprise",
            "name": "Enterprise",
            "description": "Todas las funcionalidades incluyendo IA y acceso de agentes.",
            "price_monthly": Decimal("149.00"),
            "price_annual": Decimal("1490.00"),
            "max_locations": 50,
            "max_users": 50,
            "max_customers": 999999,
            "max_programs": 50,
            "max_notifications_month": 999999,
            "max_transactions_month": 999999,
            "max_whatsapp_day": 200,
            "max_emails_month": 10000,
            "max_sms_day": 500,
            "max_wallet_pushes_month": 10000,
            "features": ALL_FEATURES,
            "trial_days": 5,
            "sort_order": 3,
            "is_featured": False,
        },
    ]

    for plan_data in plans:
        slug = plan_data.pop("slug")
        SubscriptionPlan.objects.update_or_create(
            slug=slug,
            defaults=plan_data,
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0007_add_rate_limit_fields"),
    ]

    operations = [
        migrations.RunPython(seed_plans, noop),
    ]
