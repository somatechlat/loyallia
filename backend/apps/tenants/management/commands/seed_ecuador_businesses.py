"""
Loyallia Seed Ecuador Businesses
Loads verified Ecuadorian business data from JSON and initializes the database.
"""

import json
import os
from datetime import timedelta
from decimal import Decimal
from typing import cast

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.authentication.models import User, UserManager, UserRole
from apps.billing.models import (
    Invoice,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)
from apps.tenants.models import Location, Tenant


class Command(BaseCommand):
    """Seed database with REAL Ecuadorian business data from JSON (DEMO ONLY)."""

    help = "Seed database with REAL Ecuadorian business data from JSON (DEMO ONLY)"

    def add_arguments(self, parser):
        """Add CLI arguments for the demo password."""
        parser.add_argument(
            "--password",
            type=str,
            required=True,
            help="Password for all seeded demo users (required)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        """Seed the database with real Ecuadorian business demo data."""
        if not settings.DEBUG:
            raise CommandError("Seed commands can only run in DEBUG mode.")

        self._seed_password = options["password"]

        self.stdout.write(self.style.WARNING("=== Seeding Loyallia with REAL Ecuadorian business data ==="))

        data = self._load_data()
        if not data:
            return

        # 1. Create Businesses
        self._seed_businesses(data.get("businesses", []))

        # 2. Update existing test tenant (Café El Ritmo)
        self._update_existing_tenant(data.get("update_cafe_el_ritmo"))

        self.stdout.write(self.style.SUCCESS("\n=== Seed complete! ==="))

    def _load_data(self):
        """Load Ecuadorian business data from the canonical JSON fixture."""
        json_path = os.path.join(os.path.dirname(__file__), "seed_data", "ecuador_businesses.json")
        try:
            with open(json_path, encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            self.stderr.write(f"ERROR loading JSON data from {json_path}: {e}")
            return None

    def _seed_businesses(self, businesses):
        """Create or update tenants and related demo data from JSON records."""
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
                Location.objects.filter(tenant=tenant).update(is_active=False)
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
                self.stdout.write(f"  [CREATED] Tenant: {tenant.name} (RUC: {tenant.ruc})")

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
        """Seed owner, manager, and staff users for a demo tenant."""
        # Owner
        owner_data = biz["owner"]
        if not User.objects.filter(email=owner_data["email"]).exists():
            cast(UserManager, User.objects).create_user(
                email=owner_data["email"],
                password=self._seed_password,
                first_name=owner_data["first_name"],
                last_name=owner_data["last_name"],
                role=UserRole.OWNER,
                tenant=tenant,
            )

        # Manager
        if "manager" in biz:
            mgr_data = biz["manager"]
            if not User.objects.filter(email=mgr_data["email"]).exists():
                cast(UserManager, User.objects).create_user(
                    email=mgr_data["email"],
                    password=self._seed_password,
                    first_name=mgr_data["first_name"],
                    last_name=mgr_data["last_name"],
                    role=UserRole.MANAGER,
                    tenant=tenant,
                )

        # Staff
        for staff_data in biz.get("staff", []):
            if not User.objects.filter(email=staff_data["email"]).exists():
                cast(UserManager, User.objects).create_user(
                    email=staff_data["email"],
                    password=self._seed_password,
                    first_name=staff_data["first_name"],
                    last_name=staff_data["last_name"],
                    role=UserRole.STAFF,
                    tenant=tenant,
                )

    def _seed_subscription_history(self, tenant, plan_obj):
        """Create a subscription and historical invoices for a demo tenant."""
        sub = Subscription.objects.create(
            tenant=tenant,
            plan=plan_obj.slug if plan_obj else "full",
            subscription_plan=plan_obj,
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
        """Update an existing test tenant with real Ecuadorian business data."""
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

            if not Location.objects.filter(tenant=tenant).filter(latitude__isnull=False, is_active=True).exists():
                Location.objects.filter(tenant=tenant).update(is_active=False)
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
            self.stdout.write(self.style.WARNING(f"Tenant {update_data['slug']} not found; skipping update"))
