"""
Loyallia — Seed Ecuador Businesses
Loads verified Ecuadorian business data from JSON and initializes the database.
"""

import json
import os
from datetime import timedelta
from decimal import Decimal

from decouple import config
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.authentication.models import User, UserRole
from apps.billing.models import (
    Invoice,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)
from apps.tenants.models import Location, Tenant

# Configurable default password for seeded users (Zero-Secret compliance)
SEED_USER_PASSWORD = config("SEED_USER_PASSWORD", default="SeedPass123!@")


class Command(BaseCommand):
    help = "Seed database with REAL Ecuadorian business data from JSON"

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            self.stderr.write("ERROR: Seed commands can only run in DEBUG mode.")
            return

        self.stdout.write(
            self.style.WARNING(
                "=== Seeding Loyallia with REAL Ecuadorian business data ==="
            )
        )

        data = self._load_data()
        if not data:
            return

        # 1. Create Subscription Plans
        self._seed_plans(data.get("plans", []))

        # 2. Create Businesses
        self._seed_businesses(data.get("businesses", []))

        # 3. Update existing test tenant (Café El Ritmo)
        self._update_existing_tenant(data.get("update_cafe_el_ritmo"))

        self.stdout.write(self.style.SUCCESS("\n=== Seed complete! ==="))

    def _load_data(self):
        json_path = os.path.join(
            os.path.dirname(__file__), "seed_data", "ecuador_businesses.json"
        )
        try:
            with open(json_path, encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            self.stderr.write(f"ERROR loading JSON data from {json_path}: {e}")
            return None

    def _seed_plans(self, plans):
        self.stdout.write("\n--- Creating Subscription Plans ---")
        for plan_data in plans:
            # Convert string prices back to Decimal
            plan_data["price_monthly"] = Decimal(plan_data["price_monthly"])
            plan_data["price_annual"] = Decimal(plan_data["price_annual"])

            obj, created = SubscriptionPlan.objects.update_or_create(
                slug=plan_data["slug"],
                defaults=plan_data,
            )
            status = "CREATED" if created else "UPDATED"
            self.stdout.write(
                f"  [{status}] Plan: {obj.name} — ${obj.price_monthly}/mes"
            )

    def _seed_businesses(self, businesses):
        self.stdout.write("\n--- Creating Ecuadorian Businesses ---")
        for biz in businesses:
            tenant = Tenant.objects.filter(slug=biz["slug"]).first()
            if tenant:
                # Update existing with real data
                tenant.legal_name = biz["legal_name"]
                tenant.ruc = biz["ruc"]
                tenant.industry = biz["industry"]
                tenant.province = biz["province"]
                tenant.city = biz["city"]
                tenant.phone = biz["phone"]
                tenant.email = biz.get("email", "")
                tenant.website = biz.get("website", "")
                tenant.address = biz["address"]
                tenant.save()
                self.stdout.write(f"  [UPDATED] {tenant.name} (RUC: {tenant.ruc})")
                tenant.locations.all().update(is_active=False)
            else:
                tenant = Tenant.objects.create(
                    name=biz["name"],
                    legal_name=biz["legal_name"],
                    ruc=biz["ruc"],
                    slug=biz["slug"],
                    industry=biz["industry"],
                    province=biz["province"],
                    city=biz["city"],
                    phone=biz["phone"],
                    email=biz.get("email", ""),
                    website=biz.get("website", ""),
                    address=biz["address"],
                    plan="full",
                    is_active=True,
                )
                self.stdout.write(
                    f"  [CREATED] Tenant: {tenant.name} (RUC: {tenant.ruc})"
                )

            plan_obj = SubscriptionPlan.objects.filter(slug=biz["plan_slug"]).first()

            # Create Users (Owner, Manager, Staff)
            self._seed_users(tenant, biz)

            # Create/update Locations
            for i, loc in enumerate(biz.get("locations", [])):
                Location.objects.update_or_create(
                    tenant=tenant,
                    name=loc["name"],
                    defaults={
                        "address": loc["address"],
                        "city": loc["city"],
                        "country": "EC",
                        "latitude": loc["lat"],
                        "longitude": loc["lng"],
                        "is_primary": (i == 0),
                        "is_active": True,
                    },
                )

            # Subscription + Invoices
            if plan_obj and not Subscription.objects.filter(tenant=tenant).exists():
                self._seed_subscription_history(tenant, plan_obj)

    def _seed_users(self, tenant, biz):
        # Owner
        owner_data = biz["owner"]
        if not User.objects.filter(email=owner_data["email"]).exists():
            User.objects.create_user(
                email=owner_data["email"],
                password=SEED_USER_PASSWORD,
                first_name=owner_data["first_name"],
                last_name=owner_data["last_name"],
                role=UserRole.OWNER,
                tenant=tenant,
            )

        # Manager
        if "manager" in biz:
            mgr_data = biz["manager"]
            if not User.objects.filter(email=mgr_data["email"]).exists():
                User.objects.create_user(
                    email=mgr_data["email"],
                    password=SEED_USER_PASSWORD,
                    first_name=mgr_data["first_name"],
                    last_name=mgr_data["last_name"],
                    role=UserRole.MANAGER,
                    tenant=tenant,
                )

        # Staff
        for staff_data in biz.get("staff", []):
            if not User.objects.filter(email=staff_data["email"]).exists():
                User.objects.create_user(
                    email=staff_data["email"],
                    password=SEED_USER_PASSWORD,
                    first_name=staff_data["first_name"],
                    last_name=staff_data["last_name"],
                    role=UserRole.STAFF,
                    tenant=tenant,
                )

    def _seed_subscription_history(self, tenant, plan_obj):
        sub = Subscription.objects.create(
            tenant=tenant,
            plan="full",
            status=SubscriptionStatus.ACTIVE,
            current_period_start=timezone.now() - timedelta(days=30),
            current_period_end=timezone.now() + timedelta(days=30),
            last_payment_at=timezone.now() - timedelta(days=2),
        )
        for month_ago in [3, 2, 1]:
            inv = Invoice(
                tenant=tenant,
                subscription=sub,
                invoice_number=Invoice.generate_invoice_number(tenant),
                subtotal=plan_obj.price_monthly,
                tax_rate=Decimal("0.1500"),
                period_start=timezone.now() - timedelta(days=30 * month_ago),
                period_end=timezone.now() - timedelta(days=30 * (month_ago - 1)),
            )
            inv.calculate_amounts()
            inv.status = Invoice.InvoiceStatus.PAID
            inv.paid_at = timezone.now() - timedelta(days=30 * (month_ago - 1) + 2)
            inv.save()

    def _update_existing_tenant(self, update_data):
        if not update_data:
            return
        self.stdout.write("\n--- Updating existing test tenant ---")
        try:
            tenant = Tenant.objects.get(slug=update_data["slug"])
            tenant.legal_name = update_data["legal_name"]
            tenant.ruc = update_data["ruc"]
            tenant.industry = update_data["industry"]
            tenant.province = update_data["province"]
            tenant.city = update_data["city"]
            tenant.email = update_data["email"]
            tenant.save()

            if not tenant.locations.filter(
                latitude__isnull=False, is_active=True
            ).exists():
                tenant.locations.all().update(is_active=False)
                for loc in update_data["locations"]:
                    Location.objects.create(
                        tenant=tenant,
                        name=loc["name"],
                        address=loc["address"],
                        city=loc["city"],
                        country="EC",
                        latitude=loc["lat"],
                        longitude=loc["lng"],
                        is_active=True,
                    )
            self.stdout.write(f"  [UPDATED] {tenant.name}")
        except Tenant.DoesNotExist:
            pass
