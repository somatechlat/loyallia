"""
Loyallia  Super Admin API: Platform metrics, locations map, broadcast, and plan CRUD
"""

import logging
import uuid
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone as dj_timezone
from ninja import Router
from ninja.errors import HttpError

from apps.authentication.models import User
from apps.billing.models import (
    Invoice,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)
from apps.tenants.models import Location, PlatformSetting, Tenant
from apps.tenants.super_admin_api.integration_config import (
    ALLOWED_INTEGRATION_KEYS,
    additional_integrations,
    normalize_and_validate_vault_secret,
)
from apps.tenants.super_admin_api.plan_validation import (
    plan_to_config,
    validate_plan_config,
)
from apps.tenants.super_admin_api.schemas import (
    MessageOut,
    PlanOut,
    PlanUpdateIn,
    PlatformIntegrationOut,
    PlatformMetricsOut,
    PlatformModeOut,
    PlatformModeToggleIn,
    PlatformSettingOut,
    PlatformSettingUpdateIn,
    VaultSecretUpdateIn,
)
from common.messages import get_message
from common.permissions import is_super_admin, jwt_auth

logger = logging.getLogger(__name__)

router = Router()


SENSITIVE_PLATFORM_SETTING_TOKENS = (
    "SECRET",
    "PASSWORD",
    "TOKEN",
    "PRIVATE_KEY",
    "API_KEY",
    "CLIENT_SECRET",
    "TRAN_KEY",
    "CERT",
    "CREDENTIAL",
)


def _require_super_admin(request) -> None:
    if not is_super_admin(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))


def _is_production_environment() -> bool:
    """Check if the platform is running in production mode.

    Reads PLATFORM_MODE from PlatformSetting (runtime toggle) first,
    then falls back to Django settings.ENVIRONMENT.
    """
    setting = PlatformSetting.objects.filter(key="PLATFORM_MODE").first()
    return bool((setting and setting.value == "production") or getattr(settings, "ENVIRONMENT", "") == "production")


def _is_sensitive_platform_setting_key(key: str) -> bool:
    normalized = key.upper()
    return any(token in normalized for token in SENSITIVE_PLATFORM_SETTING_TOKENS)


@router.get("/platform/mode/", auth=jwt_auth, response=PlatformModeOut)
def get_platform_mode(request):
    """Get current platform mode (development or production).

    Reads from PlatformSetting key PLATFORM_MODE.
    """
    _require_super_admin(request)
    setting = PlatformSetting.objects.filter(key="PLATFORM_MODE").first()
    mode = setting.value if setting else "production"
    return PlatformModeOut(
        mode=mode,
        updated_at=setting.updated_at if setting else None,
    )


@router.post("/platform/mode/toggle/", auth=jwt_auth, response=PlatformModeOut)
def toggle_platform_mode(request, payload: PlatformModeToggleIn):
    """Toggle platform mode between development and production.

    SEC: SUPER_ADMIN only. Audit logged.
    """
    _require_super_admin(request)

    setting, created = PlatformSetting.objects.get_or_create(
        key="PLATFORM_MODE",
        defaults={
            "value": payload.mode,
            "description": "Modo de la plataforma (development/production)",
            "category": "system",
        },
    )
    if not created:
        setting.value = payload.mode
        setting.save(update_fields=["value", "updated_at"])

 # Audit
    try:
        from apps.audit.models import AuditAction
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.UPDATE,
            resource_type="platform_mode",
            resource_id="PLATFORM_MODE",
            details={"new_mode": payload.mode},
            status="success",
        )
    except Exception:
        logger.warning("Failed to audit platform mode toggle", exc_info=True)

    return PlatformModeOut(mode=setting.value, updated_at=setting.updated_at)


@router.get("/platform/metrics/", auth=jwt_auth, response=PlatformMetricsOut)
def platform_metrics(request):
    _require_super_admin(request)

    from apps.customers.models import Customer

    total_tenants = Tenant.objects.count()
    active_tenants = Tenant.objects.filter(is_active=True).count()

    mrr = (
        float(
            Invoice.objects.filter(
                status=Invoice.InvoiceStatus.PAID,
                paid_at__gte=dj_timezone.now() - timedelta(days=60),
            ).aggregate(total=Sum("total"))["total"]
            or 0
        )
        / 2
    )

    recent = Tenant.objects.select_related("subscription__subscription_plan").order_by("-created_at")[:8]
    recent_list = [
        {
            "id": str(t.id),
            "name": t.name,
            "plan": (
                t.subscription.subscription_plan.slug
                if hasattr(t, "subscription") and t.subscription and t.subscription.subscription_plan
                else t.effective_plan
            ),
            "city": t.city,
            "created_at": t.created_at.isoformat(),
            "is_active": t.is_active,
        }
        for t in recent
    ]

    try:
        total_customers = Customer.objects.count()
    except Exception:
        total_customers = 0

    trial_tenants = Subscription.objects.filter(status=SubscriptionStatus.TRIALING).count()
    suspended_tenants = Subscription.objects.filter(status=SubscriptionStatus.SUSPENDED).count()

    return PlatformMetricsOut(
        total_tenants=total_tenants,
        active_tenants=active_tenants,
        trial_tenants=trial_tenants,
        suspended_tenants=suspended_tenants,
        total_users=User.objects.count(),
        total_locations=Location.objects.count(),
        total_customers=total_customers,
        mrr=mrr,
        recent_tenants=recent_list,
    )


@router.get("/platform/locations/", auth=jwt_auth, response=list[dict])
def all_platform_locations(request):
    """Returns all locations with GPS for the SuperAdmin map widget."""
    _require_super_admin(request)
    locations = Location.objects.select_related("tenant").filter(
        latitude__isnull=False, longitude__isnull=False, is_active=True
    )
    return [
        {
            "id": str(loc.id),
            "name": loc.name,
            "tenant_name": loc.tenant.name,
            "tenant_id": str(loc.tenant.id),
            "address": loc.address,
            "city": loc.city,
            "lat": float(loc.latitude),
            "lng": float(loc.longitude),
            "is_active": loc.is_active,
        }
        for loc in locations
    ]


@router.get(
    "/platform/integrations/",
    auth=jwt_auth,
    response=list[PlatformIntegrationOut],
)
def platform_integrations(request):
    """Return platform integration status without exposing secret values."""
    _require_super_admin(request)

    from apps.customers.pass_engine.apple_pass import (
        get_apple_wallet_diagnostics,
    )
    from apps.customers.pass_engine.google_pass import (
        get_google_wallet_diagnostics,
    )
    from common.vault import get_secret

    google_diagnostics = get_google_wallet_diagnostics()
    google_configured = (
        google_diagnostics["enabled"]
        and google_diagnostics["issuer_id_present"]
        and google_diagnostics["service_account_has_required_fields"]
    )

    apple_diagnostics = get_apple_wallet_diagnostics()
    apple_enabled = apple_diagnostics["enabled"]
    apple_configured = apple_enabled and apple_diagnostics["certs_cryptographically_valid"]

    payment_enabled = bool(getattr(settings, "PAYMENT_GATEWAY_ENABLED", False))
    payment_provider = getattr(settings, "PAYMENT_GATEWAY_PROVIDER", "manual")
    mailjet_api_key = get_secret("mailjet_api_key", default="")
    mailjet_secret_key = get_secret("mailjet_secret_key", default="")
    mailjet_sender_email = get_secret("mailjet_sender_email", default="")
    mailjet_configured = bool(mailjet_api_key and mailjet_secret_key and mailjet_sender_email)

    return [
        PlatformIntegrationOut(
            key="google_wallet",
            name="Google Wallet",
            enabled=google_diagnostics["enabled"],
            configured=google_configured,
            status="configured" if google_configured else "missing_credentials",
            detail="Google Wallet API integration",
            diagnostics=google_diagnostics,
            preview_values={
                "google_wallet_enabled": ("true" if google_diagnostics["enabled"] else "false"),
            },
        ),
        PlatformIntegrationOut(
            key="apple_wallet",
            name="Apple Wallet",
            enabled=apple_enabled,
            configured=apple_configured,
            status=("configured" if apple_configured else "disabled" if not apple_enabled else "missing_credentials"),
            detail="Apple Wallet PKPass integration",
            diagnostics=apple_diagnostics,
            preview_values={
                "apple_wallet_enabled": "true" if apple_enabled else "false",
            },
        ),
        PlatformIntegrationOut(
            key="payment_gateway",
            name="Payments",
            enabled=payment_enabled,
            configured=payment_enabled,
            status="active" if payment_enabled else "disabled",
            detail=f"Provider: {payment_provider}",
            diagnostics={},
            preview_values={
                "payment_gateway_enabled": "true" if payment_enabled else "false",
                "payment_gateway_provider": payment_provider,
            },
        ),
        PlatformIntegrationOut(
            key="mailjet",
            name="Mailjet Email",
            enabled=True,
            configured=mailjet_configured,
            status="configured" if mailjet_configured else "missing_credentials",
            detail="Mailjet SMTP mass email provider",
            diagnostics={
                "host": getattr(settings, "EMAIL_HOST", ""),
                "api_key_present": bool(mailjet_api_key),
                "secret_key_present": bool(mailjet_secret_key),
                "sender_email_present": bool(mailjet_sender_email),
            },
            preview_values={},
        ),
        *additional_integrations(),
    ]


@router.delete("/plans/{plan_id}/", auth=jwt_auth, response=MessageOut)
def delete_plan(request, plan_id: str):
    _require_super_admin(request)
    try:
        plan = SubscriptionPlan.objects.get(id=uuid.UUID(plan_id))
    except (SubscriptionPlan.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))

    active_subs = Subscription.objects.filter(
        subscription_plan=plan,
        status__in=[SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE],
    ).count()
    if active_subs > 0:
        raise HttpError(
            409,
            get_message(
                "ADMIN_PLAN_HAS_SUBSCRIPTIONS",
                name=plan.name,
                count=active_subs,
            ),
        )

    plan.is_active = False
    plan.status = SubscriptionPlan.Status.ARCHIVED
    plan.save(update_fields=["is_active", "status", "updated_at"])
    return MessageOut(success=True, message=get_message("ADMIN_PLAN_DEACTIVATED"))


@router.patch("/plans/{plan_id}/", auth=jwt_auth, response=PlanOut)
def update_plan(request, plan_id: str, payload: PlanUpdateIn):
    """Updates an existing subscription plan."""
    _require_super_admin(request)
    try:
        plan = SubscriptionPlan.objects.get(id=uuid.UUID(plan_id))
    except (SubscriptionPlan.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))

    updates = payload.model_dump(exclude_none=True)
    candidate = plan_to_config(plan)
    candidate.update(updates)
    validate_plan_config(candidate, changed_fields=set(updates))

    update_fields = ["updated_at"]
    for field in [
        "name",
        "description",
        "max_locations",
        "max_users",
        "max_customers",
        "max_programs",
        "max_notifications_month",
        "max_transactions_month",
        "max_whatsapp_day",
        "max_emails_month",
        "max_sms_day",
        "max_wallet_pushes_month",
        "max_automations",
        "max_automation_executions_day",
        "max_ai_queries_month",
        "max_api_calls_day",
        "max_exports_month",
        "features",
        "is_featured",
        "status",
        "is_active",
        "trial_days",
        "sort_order",
    ]:
        value = getattr(payload, field, None)
        if value is not None:
            setattr(plan, field, value)
            update_fields.append(field)

    if payload.price_monthly is not None:
        plan.price_monthly = Decimal(str(payload.price_monthly))
        update_fields.append("price_monthly")
    if payload.price_annual is not None:
        plan.price_annual = Decimal(str(payload.price_annual))
        update_fields.append("price_annual")

    plan.save(update_fields=update_fields)
    logger.info("SUPER_ADMIN %s updated plan %s", request.user.email, plan.name)
    return PlanOut.from_plan(plan)


@router.put(
    "/platform/integrations/{integration_key}/secret/",
    auth=jwt_auth,
    response=MessageOut,
)
def update_integration_secret(request, integration_key: str, payload: VaultSecretUpdateIn):
    """Update a Vault secret for an integration (Google Wallet, Apple Wallet, etc.).

    Only SUPER_ADMIN can write secrets. The value is stored in HashiCorp Vault KV v2
    and is never logged or returned in API responses.
    """
    _require_super_admin(request)

    from common.vault import put_secret

    allowed = ALLOWED_INTEGRATION_KEYS.get(integration_key, [])
    if payload.key not in allowed:
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR",
                detail=f"Key '{payload.key}' is not allowed for integration '{integration_key}'",
            ),
        )

    value = normalize_and_validate_vault_secret(payload.key, payload.value)
    success = put_secret(payload.key, value)
    if not success:
        raise HttpError(500, get_message("SERVER_ERROR"))

 # SEC: Audit log for Vault secret writes (who changed what)
    from apps.audit.models import AuditAction, AuditStatus
    from apps.audit.service import log_action

    log_action(
        request=request,
        action=AuditAction.UPDATE,
        resource_type="vault_secret",
        resource_id=f"{integration_key}.{payload.key}",
        details={"integration": integration_key, "key_name": payload.key},
        status=AuditStatus.SUCCESS,
    )

    logger.info(
        "SUPER_ADMIN %s updated Vault secret '%s' for integration '%s'",
        request.user.email,
        payload.key,
        integration_key,
    )
    return MessageOut(
        success=True,
        message=get_message("ADMIN_PLAN_UPDATED", name=f"{integration_key}.{payload.key}"),
    )


@router.post(
    "/platform/billing/confirm-payment/{invoice_id}/",
    auth=jwt_auth,
    response=MessageOut,
)
def confirm_payment(request, invoice_id: str):
    """Manually activate a subscription after receiving external payment."""
    _require_super_admin(request)

    try:
        invoice = Invoice.objects.select_related("subscription").get(id=uuid.UUID(invoice_id))
    except (Invoice.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))

    if invoice.status == Invoice.InvoiceStatus.PAID:
        raise HttpError(400, get_message("VALIDATION_ERROR", detail="Invoice is already paid."))

    with transaction.atomic():
        invoice.status = Invoice.InvoiceStatus.PAID
        invoice.paid_at = dj_timezone.now()
        invoice.save(update_fields=["status", "paid_at", "updated_at"])

        subscription = invoice.subscription
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.save(update_fields=["status", "updated_at"])

 # SEC: Audit log manual payment confirmation
        try:
            from apps.audit.models import AuditAction, AuditStatus
            from apps.audit.service import log_action

            log_action(
                request=request,
                action=AuditAction.UPDATE,
                resource_type="subscription",
                resource_id=str(subscription.id),
                details={
                    "action": "manual_payment_confirmed",
                    "invoice_id": str(invoice.id),
                },
                status=AuditStatus.SUCCESS,
            )
        except Exception:
            logger.warning("Failed to log manual payment audit", exc_info=True)

    logger.info(
        "SUPER_ADMIN %s confirmed payment for invoice %s",
        request.user.email,
        invoice.invoice_number,
    )
    return MessageOut(success=True, message=get_message("BILLING_SUBSCRIBED"))


@router.get("/platform/settings/", auth=jwt_auth, response=list[PlatformSettingOut])
def list_platform_settings(request):
    """List all runtime-configurable platform settings.

    Returns every PlatformSetting row grouped by category.
    Values take effect immediately  no container restart required
    (unless `requires_restart` is true for a specific setting).
    """
    _require_super_admin(request)
    settings = PlatformSetting.objects.all().order_by("category", "key")
    return [
        PlatformSettingOut(
            key=s.key,
            value="<redacted>" if _is_sensitive_platform_setting_key(s.key) else s.value,
            description=s.description,
            category=s.category,
            requires_restart=s.requires_restart,
            updated_at=s.updated_at,
        )
        for s in settings
    ]


@router.put("/platform/settings/{key}/", auth=jwt_auth, response=MessageOut)
def update_platform_setting(request, key: str, payload: PlatformSettingUpdateIn):
    """Update a single platform setting value.

    The change is written to the DB, Redis cache is invalidated,
    and the new value is active immediately for code that reads
    via `PlatformSetting.get(key)`.
    """
    _require_super_admin(request)

    if _is_sensitive_platform_setting_key(key):
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR",
                detail="Secret-like platform settings must be stored via the Vault integration settings endpoint.",
            ),
        )

    setting, created = PlatformSetting.objects.get_or_create(
        key=key,
        defaults={
            "value": payload.value,
            "description": "",
            "category": "general",
        },
    )
    if not created:
        setting.value = payload.value
        setting.save()

    logger.info("SUPER_ADMIN %s updated platform setting '%s'", request.user.email, key)

    msg = f"Setting '{key}' updated"
    if setting.requires_restart:
        msg += " (restart required for full effect)"

    return MessageOut(success=True, message=msg)


# SYSADMIN OPERATIONS (LYL-BOOT-001)

