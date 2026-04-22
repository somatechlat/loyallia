"""
Loyallia — Seed Subscription Plans (REQ-PLAN-001)
Creates the default 4-tier plan structure: Trial, Starter, Professional, Enterprise.
Idempotent — safe to run multiple times.

Usage:
    python manage.py seed_subscription_plans
"""

from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.billing.models import PlanFeature, SubscriptionPlan


class Command(BaseCommand):
    help = "Seed default subscription plans (Trial, Starter, Professional, Enterprise)"

    def handle(self, *args, **options):
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
                "features": PlanFeature.ALL_FEATURES,
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
                "features": [
                    PlanFeature.DATA_EXPORT,
                ],
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
                "features": [
                    PlanFeature.GEO_FENCING,
                    PlanFeature.AUTOMATION,
                    PlanFeature.ADVANCED_ANALYTICS,
                    PlanFeature.PRIORITY_SUPPORT,
                    PlanFeature.CUSTOM_BRANDING,
                    PlanFeature.DATA_EXPORT,
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
                "features": PlanFeature.ALL_FEATURES,
                "trial_days": 5,
                "sort_order": 3,
                "is_featured": False,
            },
        ]

        created_count = 0
        updated_count = 0

        for plan_data in plans:
            slug = plan_data.pop("slug")
            obj, created = SubscriptionPlan.objects.update_or_create(
                slug=slug,
                defaults=plan_data,
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"  ✅ Created: {obj.name}"))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f"  🔄 Updated: {obj.name}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone: {created_count} created, {updated_count} updated."
            )
        )
