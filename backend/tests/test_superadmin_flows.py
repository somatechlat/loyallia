"""Focused SuperAdmin flow regressions."""

import json
import secrets

from django.core.cache import cache
from django.test import RequestFactory, TestCase
from ninja.errors import HttpError

from apps.authentication.models import UserRole
from apps.authentication.tokens import decode_access_token
from apps.billing.models import PlanFeature, Subscription, SubscriptionStatus
from apps.tenants.models import Tenant
from apps.tenants.super_admin_api.impersonation import impersonate_tenant
from apps.tenants.super_admin_api.integration_config import (
    normalize_and_validate_vault_secret,
)
from apps.tenants.super_admin_api.plan_validation import validate_plan_config
from apps.tenants.super_admin_api.schemas import CreateTenantWizardIn, ImpersonateIn
from apps.tenants.super_admin_api.tenants import create_tenant
from tests.factories import make_plan, make_user


class SuperAdminTenantCreationTest(TestCase):
    def test_create_tenant_links_selected_subscription_plan(self):
        request = RequestFactory().post(
            "/api/v1/admin/tenants/",
            data=json.dumps({}),
            content_type="application/json",
        )
        request.user = make_user(tenant=None, role=UserRole.SUPER_ADMIN)
        plan = make_plan(
            slug="enterprise-test", features=[PlanFeature.SMS_CAMPAIGNS], max_sms_day=50
        )

        payload = CreateTenantWizardIn(
            name="Plan Linked Tenant",
            legal_name="Plan Linked Tenant SA",
            ruc="1790012345001",
            city="Quito",
            owner_email="owner-plan-linked@example.com",
            owner_first_name="Owner",
            owner_last_name="Linked",
            plan_slug=plan.slug,
            locations=[
                {
                    "name": "Sede Principal",
                    "address": "Av. Siempre Viva",
                    "city": "Quito",
                    "is_primary": True,
                }
            ],  # type: ignore[reportArgumentType]
        )

        response = create_tenant(request, payload)

        tenant = Tenant.objects.get(id=response.tenant_id)
        subscription = Subscription.objects.select_related("subscription_plan").get(
            tenant=tenant
        )
        self.assertEqual(subscription.subscription_plan, plan)
        self.assertEqual(subscription.plan, plan.slug)
        self.assertEqual(subscription.status, SubscriptionStatus.ACTIVE)
        self.assertEqual(response.owner_email, "owner-plan-linked@example.com")


class PlanValidationTest(TestCase):
    def test_partial_patch_limit_without_features_uses_existing_features(self):
        validate_plan_config(
            {
                "features": [PlanFeature.WHATSAPP_CAMPAIGNS],
                "max_whatsapp_day": 101,
                "max_emails_month": 0,
                "max_sms_day": 0,
                "max_wallet_pushes_month": 0,
                "max_automations": 0,
                "max_automation_executions_day": 0,
                "max_ai_queries_month": 0,
                "max_api_calls_day": 0,
                "max_exports_month": 0,
            },
            changed_fields={"max_whatsapp_day"},
        )

    def test_disabled_feature_rejects_nonzero_limit(self):
        with self.assertRaises(HttpError):
            validate_plan_config(
                {
                    "features": [],
                    "max_whatsapp_day": 0,
                    "max_emails_month": 1,
                    "max_sms_day": 0,
                    "max_wallet_pushes_month": 0,
                    "max_automations": 0,
                    "max_automation_executions_day": 0,
                    "max_ai_queries_month": 0,
                    "max_api_calls_day": 0,
                    "max_exports_month": 0,
                }
            )


class BackupConfigValidationTest(TestCase):
    def test_backup_config_values_are_normalized(self):
        self.assertEqual(
            normalize_and_validate_vault_secret("system_mode", "Production"),
            "production",
        )
        self.assertEqual(
            normalize_and_validate_vault_secret("backup_frequency", "15days"), "15days"
        )
        self.assertEqual(
            normalize_and_validate_vault_secret("backup_retention", "31"), "31"
        )
        self.assertEqual(normalize_and_validate_vault_secret("cron_hour", "5"), "5")
        self.assertEqual(
            normalize_and_validate_vault_secret(
                "vault_thresholds", '{"max_secret_ttl_days": 90}'
            ),
            '{"max_secret_ttl_days":90}',
        )

    def test_backup_config_rejects_invalid_values(self):
        invalid_inputs = [
            ("system_mode", "staging"),
            ("backup_frequency", "hourly"),
            ("backup_retention", "366"),
            ("cron_hour", "24"),
            ("vault_thresholds", "[]"),
        ]
        for key, value in invalid_inputs:
            with self.subTest(key=key), self.assertRaises(HttpError):
                normalize_and_validate_vault_secret(key, value)


class SuperAdminImpersonationTest(TestCase):
    def setUp(self):
        cache.clear()
        self.request = RequestFactory().post(
            "/api/v1/admin/tenants/tenant-id/impersonate/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.request.user = make_user(tenant=None, role=UserRole.SUPER_ADMIN)
        self.tenant = Tenant.objects.create(
            name="Impersonation Tenant",
            slug="impersonation-tenant",
            is_active=True,
            country="EC",
        )
        self.owner = make_user(
            tenant=self.tenant,
            role=UserRole.OWNER,
            email="owner-impersonation@example.com",
        )

    def _payload(self, pin=None):
        if pin is None:
            pin = secrets.token_hex(3)
        return ImpersonateIn(
            owner_pin=pin, justification="Support diagnosis for owner account"
        )

    def test_owner_without_pin_is_rejected(self):
        with self.assertRaises(HttpError) as ctx:
            impersonate_tenant(self.request, str(self.tenant.id), self._payload())

        self.assertEqual(ctx.exception.status_code, 400)

    def test_invalid_pin_is_rejected(self):
        valid_pin = "123456"
        self.owner.set_security_pin(valid_pin)

        with self.assertRaises(HttpError) as ctx:
            impersonate_tenant(
                self.request, str(self.tenant.id), self._payload("000000")
            )

        self.assertEqual(ctx.exception.status_code, 403)

    def test_invalid_pin_lockout_after_three_failures(self):
        valid_pin = "123456"
        self.owner.set_security_pin(valid_pin)

        for _ in range(3):
            with self.assertRaises(HttpError):
                impersonate_tenant(
                    self.request, str(self.tenant.id), self._payload("000000")
                )

        with self.assertRaises(HttpError) as ctx:
            impersonate_tenant(
                self.request, str(self.tenant.id), self._payload(valid_pin)
            )

        self.assertEqual(ctx.exception.status_code, 429)

    def test_success_returns_impersonated_owner_token(self):
        valid_pin = "123456"
        self.owner.set_security_pin(valid_pin)

        response = impersonate_tenant(
            self.request, str(self.tenant.id), self._payload(valid_pin)
        )
        decoded = decode_access_token(response.access_token)

        self.assertEqual(response.impersonated_tenant_id, str(self.tenant.id))
        self.assertEqual(response.impersonated_user_id, str(self.owner.id))
        self.assertEqual(decoded["user_id"], str(self.owner.id))
        self.assertEqual(decoded["tenant_id"], str(self.tenant.id))
        self.assertTrue(decoded["impersonated"])
        self.assertEqual(decoded["impersonated_by"], str(self.request.user.id))


class FactoryResetGuardrailsTest(TestCase):
    """Factory reset and seed demo must be blocked in production and require SUPER_ADMIN."""

    def setUp(self):
        self.request = RequestFactory().post(
            "/api/v1/admin/platform/factory-reset/confirm/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.request.user = make_user(tenant=None, role=UserRole.SUPER_ADMIN)

    def test_factory_reset_blocked_in_production(self):
        from ninja.errors import HttpError

        from apps.tenants.models import PlatformSetting
        from apps.tenants.super_admin_api.platform_reset import factory_reset_confirm
        from apps.tenants.super_admin_api.schemas import FactoryResetConfirmIn

        PlatformSetting.objects.create(key="PLATFORM_MODE", value="production")
        with self.assertRaises(HttpError) as ctx:
            factory_reset_confirm(self.request, FactoryResetConfirmIn(otp="000000"))
        self.assertEqual(ctx.exception.status_code, 403)

    def test_seed_demo_blocked_in_production(self):
        from ninja.errors import HttpError

        from apps.tenants.models import PlatformSetting
        from apps.tenants.super_admin_api.platform_reset import seed_demo_data

        PlatformSetting.objects.create(key="PLATFORM_MODE", value="production")
        with self.assertRaises(HttpError) as ctx:
            seed_demo_data(self.request)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_non_superadmin_cannot_factory_reset(self):
        from ninja.errors import HttpError

        from apps.tenants.super_admin_api.platform_reset import factory_reset_request

        owner = make_user(
            tenant=Tenant.objects.create(
                name="Owner Tenant", slug="owner-tenant", is_active=True, country="EC"
            ),
            role=UserRole.OWNER,
        )
        req = RequestFactory().post(
            "/api/v1/admin/platform/factory-reset/request/",
            data=json.dumps({}),
            content_type="application/json",
        )
        req.user = owner
        with self.assertRaises(HttpError) as ctx:
            factory_reset_request(req)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_non_superadmin_cannot_seed_demo(self):
        from ninja.errors import HttpError

        from apps.tenants.super_admin_api.platform_reset import seed_demo_data

        owner = make_user(
            tenant=Tenant.objects.create(
                name="Owner Tenant 2",
                slug="owner-tenant-2",
                is_active=True,
                country="EC",
            ),
            role=UserRole.OWNER,
        )
        req = RequestFactory().post(
            "/api/v1/admin/platform/seed-demo-data/",
            data=json.dumps({}),
            content_type="application/json",
        )
        req.user = owner
        with self.assertRaises(HttpError) as ctx:
            seed_demo_data(req)
        self.assertEqual(ctx.exception.status_code, 403)
