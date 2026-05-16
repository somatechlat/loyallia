import json
import secrets
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.authentication.models import User, UserRole
from apps.billing.models import Subscription, SubscriptionPlan, SubscriptionStatus
from apps.tenants.models import Location, Plan, Tenant
from common.environment_guard import enforce_settings_environment

E2E_TENANT_SLUG = "e2e-development-tenant"
E2E_USERS = {
    "owner": {
        "email": "e2e-owner@loyallia.com",
        "first_name": "E2E",
        "last_name": "Owner",
        "role": UserRole.OWNER,
        "tenant": True,
        "phone_number": "+593991111111",
    },
    "manager": {
        "email": "e2e-manager@loyallia.com",
        "first_name": "E2E",
        "last_name": "Manager",
        "role": UserRole.MANAGER,
        "tenant": True,
        "phone_number": "+593992222222",
    },
    "staff": {
        "email": "e2e-staff@loyallia.com",
        "first_name": "E2E",
        "last_name": "Staff",
        "role": UserRole.STAFF,
        "tenant": True,
        "phone_number": "+593993333333",
    },
    "superadmin": {
        "email": "e2e-superadmin@loyallia.com",
        "first_name": "E2E",
        "last_name": "SuperAdmin",
        "role": UserRole.SUPER_ADMIN,
        "tenant": False,
        "phone_number": "+593994444444",
    },
}


class Command(BaseCommand):
    help = "Create/repair real RBAC E2E users in the development database only."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password-file",
            default="../frontend/.auth/e2e-credentials.json",
            help="Ignored local Playwright credential JSON file to create/update.",
        )
        parser.add_argument(
            "--generate",
            action="store_true",
            help="Generate a strong password and write it to the ignored credential file.",
        )

    def handle(self, *args, **options):
        enforce_settings_environment(mode="development", databases=settings.DATABASES)
        if not settings.DEBUG:
            raise CommandError("Refusing to provision E2E users outside DEBUG development mode.")

        password_file = (Path.cwd() / options["password_file"]).resolve()
        password = self._load_existing_password(password_file)
        if not password:
            if not options["generate"]:
                raise CommandError("No local E2E credential file exists. Re-run with --generate to create one.")
            password = secrets.token_urlsafe(24)

        with transaction.atomic():
            tenant = self._ensure_tenant()
            self._ensure_subscription(tenant)
            self._ensure_location(tenant)
            credentials = self._ensure_users(tenant, password)

        self._write_credentials(password_file, credentials)
        self.stdout.write(
            self.style.SUCCESS(f"Development RBAC E2E users are active. Credentials written to {password_file}.")
        )

    def _load_existing_password(self, password_file: Path) -> str:
        if not password_file.exists():
            return ""
        data = json.loads(password_file.read_text(encoding="utf-8"))
        users = data.get("users", {})
        owner = users.get("owner", {})
        return str(owner.get("password", ""))

    def _ensure_tenant(self) -> Tenant:
        tenant, _ = Tenant.objects.update_or_create(
            slug=E2E_TENANT_SLUG,
            defaults={
                "name": "E2E Development Tenant",
                "plan": Plan.FULL,
                "is_active": True,
                "country": "EC",
                "city": "Quito",
                "timezone": "America/Guayaquil",
                "phone": "+593990000000",
                "email": "e2e-tenant@loyallia.com",
                "address": "E2E Development Address",
                "primary_color": "#2563eb",
                "secondary_color": "#16a34a",
            },
        )
        return tenant

    def _ensure_subscription(self, tenant: Tenant) -> None:
        plan, _ = SubscriptionPlan.objects.get_or_create(
            slug="enterprise",
            defaults={
                "name": "Enterprise",
                "price_monthly": "149.00",
                "price_annual": "1490.00",
                "max_customers": 999999,
                "max_programs": 999999,
                "max_locations": 999999,
                "max_users": 999999,
                "max_notifications_month": 999999,
                "max_transactions_month": 999999,
                "max_whatsapp_day": 999999,
                "max_emails_month": 999999,
                "max_sms_day": 999999,
                "max_wallet_pushes_month": 999999,
                "max_automations": 999999,
                "features": ["automation", "advanced_analytics", "data_export"],
                "is_active": True,
            },
        )
        Subscription.objects.update_or_create(
            tenant=tenant,
            defaults={
                "subscription_plan": plan,
                "plan": plan.slug,
                "status": SubscriptionStatus.ACTIVE,
                "billing_cycle": "monthly",
            },
        )

    def _ensure_location(self, tenant: Tenant) -> None:
        Location.objects.update_or_create(
            tenant=tenant,
            name="E2E Main Location",
            defaults={
                "address": "E2E Main Street",
                "city": "Quito",
                "country": "EC",
                "is_active": True,
                "is_primary": True,
            },
        )

    def _ensure_users(self, tenant: Tenant, password: str) -> dict:
        credentials = {"users": {}}
        for role_key, config in E2E_USERS.items():
            user, _ = User.objects.update_or_create(
                email=config["email"],
                defaults={
                    "first_name": config["first_name"],
                    "last_name": config["last_name"],
                    "role": config["role"],
                    "tenant": tenant if config["tenant"] else None,
                    "is_active": True,
                    "is_staff": config["role"] == UserRole.SUPER_ADMIN,
                    "is_superuser": config["role"] == UserRole.SUPER_ADMIN,
                    "is_email_verified": True,
                    "phone_number": config["phone_number"],
                    "is_phone_verified": True,
                    "preferred_language": "es",
                },
            )
            user.set_password(password)
            user.save(update_fields=["password", "updated_at"])
            credentials["users"][role_key] = {
                "email": user.email,
                "password": password,
            }
        return credentials

    def _write_credentials(self, password_file: Path, credentials: dict) -> None:
        password_file.parent.mkdir(parents=True, exist_ok=True)
        password_file.write_text(
            json.dumps(credentials, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        password_file.chmod(0o600)
