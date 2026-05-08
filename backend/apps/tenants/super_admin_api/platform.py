"""
Loyallia — Super Admin API: Platform metrics, locations map, broadcast, and plan CRUD
"""

import logging
import uuid
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.mail import send_mass_mail
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone as dj_timezone
from ninja import Router
from ninja.errors import HttpError

from apps.authentication.models import User, UserRole
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
)
from apps.tenants.super_admin_api.plan_validation import (
    plan_to_config,
    validate_plan_config,
)
from apps.tenants.super_admin_api.schemas import (
    BroadcastIn,
    MessageOut,
    PlanCreateIn,
    PlanOut,
    PlanUpdateIn,
    PlatformIntegrationOut,
    PlatformMetricsOut,
    PlatformSettingOut,
    PlatformSettingUpdateIn,
    VaultSecretUpdateIn,
)
from common.messages import get_message
from common.permissions import is_super_admin, jwt_auth

logger = logging.getLogger(__name__)

router = Router()


def _require_super_admin(request) -> None:
    if not is_super_admin(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))


# =============================================================================
# PLATFORM METRICS
# =============================================================================


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

    recent = Tenant.objects.order_by("-created_at")[:8]
    recent_list = [
        {
            "id": str(t.id),
            "name": t.name,
            "plan": t.plan,
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

    trial_tenants = Subscription.objects.filter(
        status=SubscriptionStatus.TRIALING
    ).count()
    suspended_tenants = Subscription.objects.filter(
        status=SubscriptionStatus.SUSPENDED
    ).count()

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


# =============================================================================
# ALL LOCATIONS (map widget)
# =============================================================================


@router.get("/platform/locations/", auth=jwt_auth, response=list[dict])
def all_platform_locations(request):
    """Returns all locations with GPS for the SuperAdmin map widget."""
    _require_super_admin(request)
    locations = Location.objects.select_related("tenant").filter(
        latitude__isnull=False, longitude__isnull=False, is_active=True
    )
    integrations = [
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
    integrations.extend(additional_integrations())
    return integrations


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
    apple_configured = (
        apple_enabled and apple_diagnostics["certs_cryptographically_valid"]
    )

    payment_enabled = bool(getattr(settings, "PAYMENT_GATEWAY_ENABLED", False))
    payment_provider = getattr(settings, "PAYMENT_GATEWAY_PROVIDER", "manual")
    email_user = get_secret(
        "email_host_user", env_fallback="EMAIL_HOST_USER", default=""
    )
    email_pass = get_secret(
        "email_host_password", env_fallback="EMAIL_HOST_PASSWORD", default=""
    )
    email_configured = bool(email_user and email_pass)

    # Preview values: non-secret fields only, for pre-populating the UI
    google_issuer_id = get_secret("google_wallet_issuer_id", default="")
    google_oauth_client_id = get_secret("google_oauth_client_id", default="")
    apple_pass_type_id = get_secret("apple_pass_type_identifier", default="")
    apple_team_id = get_secret("apple_team_identifier", default="")
    payment_login = get_secret("payment_gateway_login", default="")

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
                "google_wallet_enabled": (
                    "true" if google_diagnostics["enabled"] else "false"
                ),
                "google_wallet_issuer_id": google_issuer_id,
                "google_oauth_client_id": google_oauth_client_id,
            },
        ),
        PlatformIntegrationOut(
            key="apple_wallet",
            name="Apple Wallet",
            enabled=apple_enabled,
            configured=apple_configured,
            status=(
                "configured"
                if apple_configured
                else "disabled" if not apple_enabled else "missing_credentials"
            ),
            detail="Apple Wallet PKPass integration",
            diagnostics=apple_diagnostics,
            preview_values={
                "apple_wallet_enabled": "true" if apple_enabled else "false",
                "apple_pass_type_identifier": apple_pass_type_id,
                "apple_team_identifier": apple_team_id,
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
                "payment_gateway_login": payment_login,
            },
        ),
        PlatformIntegrationOut(
            key="email",
            name="Email SMTP",
            enabled=True,
            configured=email_configured,
            status="configured" if email_configured else "missing_credentials",
            detail=f"Host: {getattr(settings, 'EMAIL_HOST', '')}",
            diagnostics={
                "host": getattr(settings, "EMAIL_HOST", ""),
                "user_present": bool(email_user),
                "pass_present": bool(email_pass),
            },
            preview_values={
                "email_host_user": email_user,
            },
        ),
    ]


# =============================================================================
# SUBSCRIPTION PLANS CRUD
# =============================================================================


@router.get("/plans/", auth=jwt_auth, response=list[PlanOut])
def list_plans(request):
    _require_super_admin(request)
    return [PlanOut.from_plan(p) for p in SubscriptionPlan.objects.all()]


@router.post("/plans/", auth=jwt_auth, response=PlanOut)
def create_plan(request, payload: PlanCreateIn):
    _require_super_admin(request)
    validate_plan_config(payload.model_dump())
    plan = SubscriptionPlan.objects.create(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        price_monthly=Decimal(str(payload.price_monthly)),
        price_annual=Decimal(str(payload.price_annual)),
        max_locations=payload.max_locations,
        max_users=payload.max_users,
        max_customers=payload.max_customers,
        max_programs=payload.max_programs,
        max_notifications_month=payload.max_notifications_month,
        max_transactions_month=payload.max_transactions_month,
        max_whatsapp_day=payload.max_whatsapp_day,
        max_emails_month=payload.max_emails_month,
        max_sms_day=payload.max_sms_day,
        max_wallet_pushes_month=payload.max_wallet_pushes_month,
        max_automations=payload.max_automations,
        max_automation_executions_day=payload.max_automation_executions_day,
        max_ai_queries_month=payload.max_ai_queries_month,
        max_api_calls_day=payload.max_api_calls_day,
        max_exports_month=payload.max_exports_month,
        features=payload.features,
        is_featured=payload.is_featured,
        trial_days=payload.trial_days,
        sort_order=payload.sort_order,
    )
    logger.info("SUPER_ADMIN %s created plan %s", request.user.email, plan.name)
    return PlanOut.from_plan(plan)


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
    plan.save(update_fields=["is_active", "updated_at"])
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


# =============================================================================
# VAULT SECRET MANAGEMENT (Wallet / Integration credentials)
# =============================================================================


@router.put(
    "/platform/integrations/{integration_key}/secret/",
    auth=jwt_auth,
    response=MessageOut,
)
def update_integration_secret(
    request, integration_key: str, payload: VaultSecretUpdateIn
):
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

    success = put_secret(payload.key, payload.value)
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
        message=get_message(
            "ADMIN_PLAN_UPDATED", name=f"{integration_key}.{payload.key}"
        ),
    )


# =============================================================================
# BILLING CONFIRMATION
# =============================================================================


@router.post("/platform/billing/confirm-payment/{invoice_id}/", auth=jwt_auth, response=MessageOut)
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
            from common.audit import AuditLog
            AuditLog.objects.create(
                tenant=invoice.tenant,
                actor_email=request.user.email,
                action="UPDATE",
                resource="subscription",
                resource_id=str(subscription.id),
                ip_address=request.META.get("REMOTE_ADDR", ""),
                details={"action": "manual_payment_confirmed", "invoice_id": str(invoice.id)},
            )
        except Exception:
            logger.warning("Failed to log manual payment audit", exc_info=True)

    logger.info(
        "SUPER_ADMIN %s confirmed payment for invoice %s",
        request.user.email,
        invoice.invoice_number,
    )
    return MessageOut(success=True, message=get_message("BILLING_SUBSCRIBED"))


# =============================================================================
# BROADCAST
# =============================================================================


@router.post("/broadcast/", auth=jwt_auth, response=MessageOut)
def broadcast_announcement(request, payload: BroadcastIn):
    _require_super_admin(request)
    if not payload.subject.strip() or not payload.message.strip():
        raise HttpError(
            400, get_message("VALIDATION_ERROR", detail="subject and message required")
        )

    owner_emails = list(
        User.objects.filter(role=UserRole.OWNER, is_active=True).values_list(
            "email", flat=True
        )
    )
    if not owner_emails:
        return MessageOut(
            success=True, message=get_message("ADMIN_BROADCAST_NO_RECIPIENTS")
        )

    messages = tuple(
        (payload.subject, payload.message, "noreply@loyallia.com", [email])
        for email in owner_emails
    )
    try:
        send_mass_mail(messages, fail_silently=True)
    except Exception as exc:
        logger.error("Broadcast email failed: %s", exc)

    logger.info(
        "SUPER_ADMIN %s broadcast to %d owners: %s",
        request.user.email,
        len(owner_emails),
        payload.subject,
    )
    return MessageOut(
        success=True,
        message=get_message("CAMPAIGN_SENT", count=len(owner_emails)),
    )


# =============================================================================
# PLATFORM SETTINGS — Runtime configuration without restart
# =============================================================================


@router.get("/platform/settings/", auth=jwt_auth, response=list[PlatformSettingOut])
def list_platform_settings(request):
    """List all runtime-configurable platform settings.

    Returns every PlatformSetting row grouped by category.
    Values take effect immediately — no container restart required
    (unless `requires_restart` is true for a specific setting).
    """
    _require_super_admin(request)
    settings = PlatformSetting.objects.all().order_by("category", "key")
    return [
        PlatformSettingOut(
            key=s.key,
            value=s.value,
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
