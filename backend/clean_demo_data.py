#!/usr/bin/env python
"""
Surgical cleanup script: removes ALL demo, test, and synthetic data
while preserving the minimal operational infrastructure needed to boot Loyallia.

PRESERVED (operational infrastructure):
  - SUPER_ADMIN user (admin@loyallia.com)
  - 4 SubscriptionPlans: trial, starter, professional, enterprise
  - PlatformSettings (TRIAL_DAYS, TAX_RATE_ECUADOR, DEFAULT_TIMEZONE)
  - Django internals: auth.Permission, contenttypes.ContentType
  - Celery Beat schedules (they are operational infrastructure)

DELETED (demo + test pollution):
  - All tenants (there should be 0 tenants in a clean system)
  - All users except SUPER_ADMIN
  - All customers, transactions, cards, customer passes
  - All notifications, campaign runs, delivery logs, WhatsApp sessions
  - All automations, analytics (daily/customer/program)
  - All audit logs
  - All subscriptions, invoices, payment methods
  - All non-operational subscription plans (E2E test plans, rate limit test plans)
"""

import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings")

import django
django.setup()

from django.db import transaction

# Operational models
from apps.authentication.models import User, UserRole
from apps.billing.models import SubscriptionPlan
from apps.tenants.models import PlatformSetting

# Data to be deleted
from apps.authentication.models import RefreshToken
from apps.tenants.models import Tenant, Location
from apps.cards.models import Card
from apps.customers.models import Customer, CustomerPass
from apps.transactions.models import Transaction
from apps.notifications.models import (
    CampaignRun,
    CampaignDeliveryLog,
    Notification,
    WhatsAppSession,
)
from apps.automation.models import Automation
from apps.analytics.models import CustomerAnalytics, DailyAnalytics, ProgramAnalytics
from apps.billing.models import Subscription, Invoice, PaymentMethod
from apps.audit.models import AuditLog


# =============================================================================
# Operational identifiers (NEVER delete these)
# =============================================================================
OPERATIONAL_PLAN_SLUGS = {"trial", "starter", "professional", "enterprise"}
SUPERADMIN_EMAIL = "admin@loyallia.com"


def delete_model_qs(qs, description):
    """Helper to delete a queryset and report counts."""
    count = qs.count()
    if count:
        qs.delete()
        print(f"  ✓ Deleted {count} {description}")
        return count
    else:
        print(f"  - No {description} to delete")
        return 0


def main():
    print("=" * 70)
    print("LOYALLIA SURGICAL CLEANUP: Removing all demo & test data")
    print("=" * 70)
    print()

    total_deleted = 0
    superadmin_id = User.objects.filter(email=SUPERADMIN_EMAIL).values_list("id", flat=True).first()

    with transaction.atomic():
        # =====================================================================
        # Phase 1: Delete child records with FK dependencies FIRST
        # =====================================================================
        print("[Phase 1] Deleting child records with foreign key dependencies...")
        print()

        # 1. RefreshToken → FK to User
        total_deleted += delete_model_qs(
            RefreshToken.objects.exclude(user_id=superadmin_id),
            "refresh tokens"
        )

        # 2. CampaignDeliveryLog → FK to CampaignRun, Customer
        total_deleted += delete_model_qs(CampaignDeliveryLog.objects.all(), "campaign delivery logs")

        # 3. Notification → FK to Customer, Tenant
        total_deleted += delete_model_qs(Notification.objects.all(), "notifications")

        # 4. CampaignRun → FK to Tenant
        total_deleted += delete_model_qs(CampaignRun.objects.all(), "campaign runs")

        # 5. WhatsAppSession → OneToOne to Tenant
        total_deleted += delete_model_qs(WhatsAppSession.objects.all(), "WhatsApp sessions")

        # 6. Transaction → FK to CustomerPass, Location, User
        total_deleted += delete_model_qs(Transaction.objects.all(), "transactions")

        # 7. CustomerPass → FK to Customer, Card
        total_deleted += delete_model_qs(CustomerPass.objects.all(), "customer passes")

        # 8. CustomerAnalytics → FK to Customer, Tenant
        total_deleted += delete_model_qs(CustomerAnalytics.objects.all(), "customer analytics")

        # 9. ProgramAnalytics → FK to Card, Tenant
        total_deleted += delete_model_qs(ProgramAnalytics.objects.all(), "program analytics")

        # 10. DailyAnalytics → FK to Tenant
        total_deleted += delete_model_qs(DailyAnalytics.objects.all(), "daily analytics")

        # 11. Automation → FK to Tenant
        total_deleted += delete_model_qs(Automation.objects.all(), "automations")

        # 12. AuditLog (has tenant_id UUID but no FK constraint)
        total_deleted += delete_model_qs(AuditLog.objects.all(), "audit logs")

        # 13. Invoice → FK to Subscription
        total_deleted += delete_model_qs(Invoice.objects.all(), "invoices")

        # 14. PaymentMethod → FK to Subscription
        total_deleted += delete_model_qs(PaymentMethod.objects.all(), "payment methods")

        # 15. Subscription → FK to Tenant, SubscriptionPlan
        total_deleted += delete_model_qs(Subscription.objects.all(), "subscriptions")

        print()
        print("[Phase 2] Deleting tenant-scoped entities...")
        print()

        # 16. Customer → FK to Tenant
        total_deleted += delete_model_qs(Customer.objects.all(), "customers")

        # 17. Card → FK to Tenant
        total_deleted += delete_model_qs(Card.objects.all(), "cards/programs")

        # 18. Location → FK to Tenant
        total_deleted += delete_model_qs(Location.objects.all(), "locations")

        # 19. User (non-SUPER_ADMIN) → FK to Tenant (nullable)
        total_deleted += delete_model_qs(
            User.objects.exclude(email=SUPERADMIN_EMAIL),
            "non-SUPER_ADMIN users"
        )

        # 20. Tenant
        total_deleted += delete_model_qs(Tenant.objects.all(), "tenants")

        print()
        print("[Phase 3] Deleting non-operational subscription plans...")
        print()

        # 21. Non-operational SubscriptionPlans
        total_deleted += delete_model_qs(
            SubscriptionPlan.objects.exclude(slug__in=OPERATIONAL_PLAN_SLUGS),
            "non-operational subscription plans"
        )

    # =====================================================================
    # Verification
    # =====================================================================
    print()
    print("=" * 70)
    print("VERIFICATION: Remaining data after cleanup")
    print("=" * 70)
    print()

    users = User.objects.all()
    print(f"Users: {users.count()} (expected: 1)")
    for u in users:
        print(f"  → {u.email} (role={u.role})")

    plans = SubscriptionPlan.objects.all().order_by("slug")
    print(f"SubscriptionPlans: {plans.count()} (expected: 4)")
    for p in plans:
        print(f"  → {p.name} (slug={p.slug})")

    settings = PlatformSetting.objects.all()
    print(f"PlatformSettings: {settings.count()} (expected: 3)")
    for s in settings:
        print(f"  → {s.key}")

    print(f"Tenants: {Tenant.objects.count()} (expected: 0)")
    print(f"Customers: {Customer.objects.count()} (expected: 0)")
    print(f"Transactions: {Transaction.objects.count()} (expected: 0)")
    print(f"Cards: {Card.objects.count()} (expected: 0)")
    print(f"Notifications: {Notification.objects.count()} (expected: 0)")
    print(f"CampaignRuns: {CampaignRun.objects.count()} (expected: 0)")
    print(f"AuditLogs: {AuditLog.objects.count()} (expected: 0)")
    print(f"Subscriptions: {Subscription.objects.count()} (expected: 0)")

    print()
    print("=" * 70)
    print(f"Cleanup complete. Total record groups deleted: verified above")
    print("=" * 70)

    # Final health check
    errors = []
    if users.count() != 1:
        errors.append(f"Expected 1 user, found {users.count()}")
    if plans.count() != 4:
        errors.append(f"Expected 4 plans, found {plans.count()}")
    if settings.count() != 3:
        errors.append(f"Expected 3 platform settings, found {settings.count()}")
    if Tenant.objects.count() != 0:
        errors.append(f"Expected 0 tenants, found {Tenant.objects.count()}")
    if Customer.objects.count() != 0:
        errors.append(f"Expected 0 customers, found {Customer.objects.count()}")
    if Transaction.objects.count() != 0:
        errors.append(f"Expected 0 transactions, found {Transaction.objects.count()}")

    if errors:
        print()
        print("ERRORS:")
        for e in errors:
            print(f"  ✗ {e}")
        sys.exit(1)
    else:
        print()
        print("✅ System is clean. Only operational infrastructure remains.")
        sys.exit(0)


if __name__ == "__main__":
    main()
