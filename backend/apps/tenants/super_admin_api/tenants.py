"""
Loyallia Super Admin API: Tenant + Location + Invoice endpoints
"""

import json
import logging
import secrets
import uuid
from datetime import timedelta
from typing import cast

from django.db import transaction
from django.utils import timezone as dj_timezone
from django.utils.text import slugify
from ninja import Router
from ninja.errors import HttpError

from apps.authentication.models import User, UserManager, UserRole
from apps.billing.models import (
    Invoice,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)
from apps.tenants.models import Location, PlatformSetting, Tenant
from apps.tenants.super_admin_api.schemas import (
    CreateTenantOut,
    CreateTenantWizardIn,
    ExtendTrialIn,
    InvoiceOut,
    LocationIn,
    LocationOut,
    MessageOut,
    TenantAdminOut,
    TenantAdminUpdateIn,
)
from common.messages import get_message
from common.permissions import is_super_admin, jwt_auth

logger = logging.getLogger(__name__)

router = Router()

# HELPERS


def _require_super_admin(request) -> None:
    if not is_super_admin(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))


def _get_tenant_or_404(tenant_id: str) -> Tenant:
    try:
        return Tenant.objects.get(id=uuid.UUID(tenant_id))
    except (Tenant.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))


# TENANT CRUD


@router.get(
    "/tenants/",
    auth=jwt_auth,
    response=list[TenantAdminOut],
    summary="[SuperAdmin] Listar todos los negocios",
)
def list_all_tenants(request, plan: str | None = None, is_active: bool | None = None):
    """Lists all tenants on the platform. SUPER_ADMIN only."""
    _require_super_admin(request)
    qs = (
        Tenant.objects.select_related("subscription__subscription_plan")
        .prefetch_related("users", "locations")
        .order_by("-created_at")
    )
    #
    if plan:
        from apps.billing.models import Subscription, SubscriptionStatus

        plan_status_map = {
            "trial": SubscriptionStatus.TRIALING,
            "full": SubscriptionStatus.ACTIVE,
            "suspended": SubscriptionStatus.SUSPENDED,
        }
        target_status = plan_status_map.get(plan)
        if target_status:
            tenant_ids = Subscription.objects.filter(status=target_status).values_list(
                "tenant_id", flat=True
            )
            qs = qs.filter(id__in=tenant_ids)
        else:
            qs = qs.filter(plan=plan)
    if is_active is not None:
        qs = qs.filter(is_active=is_active)
    # Hide tenants scheduled for deletion (cascade delete in progress)
    qs = qs.filter(scheduled_deletion_at__isnull=True)
    return [TenantAdminOut.from_tenant(t) for t in qs]


@router.post(
    "/tenants/",
    auth=jwt_auth,
    response=CreateTenantOut,
    summary="[SuperAdmin] Crear negocio (Wizard completo)",
)
def create_tenant(request, payload: CreateTenantWizardIn):
    """Creates a new Tenant with Owner, Locations, and Subscription via 4-step wizard."""
    _require_super_admin(request)
    if User.objects.filter(email=payload.owner_email).exists():
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR", detail="Email ya registrado en la plataforma"
            ),
        )

    try:
        with transaction.atomic():
            plan_obj = SubscriptionPlan.objects.filter(slug=payload.plan_slug).first()
            if plan_obj is None:
                raise HttpError(
                    400,
                    get_message(
                        "VALIDATION_ERROR",
                        detail=f"Plan '{payload.plan_slug}' no encontrado",
                    ),
                )
            if not plan_obj.is_active:
                raise HttpError(
                    400,
                    get_message(
                        "VALIDATION_ERROR", detail="Plan seleccionado no está activo"
                    ),
                )
            # SEC-H5: Validate plan capacity — prevent over-subscription
            active_sub_count = Subscription.objects.filter(
                subscription_plan=plan_obj,
                status__in=[SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE],
            ).count()
            plan_capacity = PlatformSetting.get_int(
                f"PLAN_CAPACITY_{plan_obj.slug.upper()}", 0
            )
            if plan_capacity > 0 and active_sub_count >= plan_capacity:
                raise HttpError(
                    400,
                    get_message(
                        "VALIDATION_ERROR",
                        detail=f"Capacidad máxima alcanzada para plan '{plan_obj.name}'",
                    ),
                )
            trial_days = plan_obj.trial_days
            plan_slug = plan_obj.slug

            if payload.billing_cycle not in ["monthly", "annual"]:
                raise HttpError(
                    400,
                    get_message(
                        "VALIDATION_ERROR",
                        detail="billing_cycle must be 'monthly' or 'annual'",
                    ),
                )

            tenant = Tenant.objects.create(
                name=payload.name,
                legal_name=payload.legal_name,
                ruc=payload.ruc,
                cedula=payload.cedula,
                entity_type=payload.entity_type,
                slug=slugify(payload.name)[:100] or f"tenant-{uuid.uuid4().hex[:8]}",
                industry=payload.industry,
                province=payload.province,
                city=payload.city,
                address=payload.address,
                phone=payload.phone,
                email=payload.email,
                website=payload.website,
                country="EC",
                plan=plan_slug,  #
                is_active=True,
            )
            temp_password = secrets.token_urlsafe(8)
            owner = cast(UserManager, User.objects).create_user(
                email=payload.owner_email,
                password=temp_password,
                first_name=payload.owner_first_name,
                last_name=payload.owner_last_name,
                role=UserRole.OWNER,
                tenant=tenant,
            )
            for i, loc in enumerate(payload.locations):
                Location.objects.create(
                    tenant=tenant,
                    name=loc.name,
                    address=loc.address,
                    city=loc.city,
                    country="EC",
                    latitude=loc.latitude,
                    longitude=loc.longitude,
                    is_primary=loc.is_primary or (i == 0),
                )

            sub_status = (
                SubscriptionStatus.TRIALING
                if plan_slug == "trial"
                else SubscriptionStatus.ACTIVE
            )
            is_trial = sub_status == SubscriptionStatus.TRIALING

            sub = Subscription.objects.create(
                tenant=tenant,
                subscription_plan=plan_obj,
                plan=plan_slug,
                billing_cycle=payload.billing_cycle,
                status=sub_status,
                trial_start=dj_timezone.now() if is_trial else None,
                trial_end=(
                    dj_timezone.now() + timedelta(days=trial_days) if is_trial else None
                ),
                current_period_start=dj_timezone.now() if not is_trial else None,
                current_period_end=(
                    dj_timezone.now()
                    + timedelta(days=365 if payload.billing_cycle == "annual" else 30)
                    if not is_trial
                    else None
                ),
            )
            tenant.trial_end = sub.trial_end
            tenant.save(update_fields=["trial_end"])

            from apps.tenants.services.email import send_owner_welcome_email

            def _send_owner_welcome() -> None:
                send_owner_welcome_email(
                    owner_email=owner.email,
                    owner_first_name=owner.first_name or owner.email,
                    tenant_name=tenant.name,
                    temp_password=temp_password,
                    trial_days=trial_days,
                )

            transaction.on_commit(_send_owner_welcome)

            logger.info(
                "SUPER_ADMIN %s created tenant %s (%s) with %d locations",
                request.user.email,
                tenant.id,
                tenant.name,
                len(payload.locations),
            )
            return CreateTenantOut(
                success=True,
                message=get_message("TENANT_UPDATED"),
                tenant_id=str(tenant.id),
                owner_id=str(owner.id),
                owner_email=owner.email,
            )
    except Exception as e:
        logger.error("Tenant creation failed: %s", e)
        raise HttpError(500, get_message("ADMIN_TENANT_CREATION_FAILED", detail=str(e)))


@router.get(
    "/tenants/{tenant_id}/",
    auth=jwt_auth,
    response=TenantAdminOut,
    summary="[SuperAdmin] Detalle de negocio",
)
def get_tenant_detail(request, tenant_id: str):
    """Retrieve full tenant details for the SuperAdmin dashboard."""
    _require_super_admin(request)
    return TenantAdminOut.from_tenant(_get_tenant_or_404(tenant_id))


@router.patch(
    "/tenants/{tenant_id}/",
    auth=jwt_auth,
    response=TenantAdminOut,
    summary="[SuperAdmin] Actualizar negocio",
)
def update_tenant_admin(request, tenant_id: str):
    """Updates tenant details from SuperAdmin dashboard."""
    _require_super_admin(request)
    tenant = _get_tenant_or_404(tenant_id)
    try:
        body = json.loads(request.body)
        payload = TenantAdminUpdateIn(**body)
    except Exception as e:
        logger.error("Invalid request body: %s", e)
        raise HttpError(
            422, get_message("VALIDATION_ERROR", detail="Invalid request body")
        )

    update_fields = ["updated_at"]
    #
    # Tenant.plan is a denormalized cache; Subscription is authoritative.
    for field in [
        "name",
        "legal_name",
        "ruc",
        "industry",
        "province",
        "city",
        "address",
        "phone",
        "email",
        "website",
        "is_active",
    ]:
        value = getattr(payload, field, None)
        if value is not None:
            setattr(tenant, field, value.strip() if isinstance(value, str) else value)
            update_fields.append(field)
    tenant.save(update_fields=update_fields)
    logger.info(
        "SUPER_ADMIN %s updated tenant %s fields=%s",
        request.user.email,
        tenant.name,
        update_fields,
    )
    return TenantAdminOut.from_tenant(tenant)


# LOCATIONS


@router.get(
    "/tenants/{tenant_id}/locations/",
    auth=jwt_auth,
    response=list[LocationOut],
    summary="[SuperAdmin] Ubicaciones de un negocio",
)
def list_tenant_locations(request, tenant_id: str):
    """List all locations belonging to a tenant."""
    _require_super_admin(request)
    tenant = _get_tenant_or_404(tenant_id)
    return [
        LocationOut.from_location(loc) for loc in Location.objects.filter(tenant=tenant)
    ]


@router.post(
    "/tenants/{tenant_id}/locations/",
    auth=jwt_auth,
    response=LocationOut,
    summary="[SuperAdmin] Agregar ubicacion a un negocio",
)
def add_tenant_location(request, tenant_id: str, payload: LocationIn):
    """Add a new location to an existing tenant."""
    _require_super_admin(request)
    tenant = _get_tenant_or_404(tenant_id)
    loc = Location.objects.create(
        tenant=tenant,
        name=payload.name,
        address=payload.address,
        city=payload.city,
        country="EC",
        latitude=payload.latitude,
        longitude=payload.longitude,
        is_primary=payload.is_primary,
    )
    return LocationOut.from_location(loc)


# INVOICES


@router.get(
    "/tenants/{tenant_id}/invoices/",
    auth=jwt_auth,
    response=list[InvoiceOut],
    summary="[SuperAdmin] Facturas de un negocio",
)
def list_tenant_invoices(request, tenant_id: str):
    """List all invoices for a specific tenant."""
    _require_super_admin(request)
    tenant = _get_tenant_or_404(tenant_id)
    invoices = Invoice.objects.filter(tenant=tenant).order_by("-created_at")
    return [
        InvoiceOut(
            id=str(inv.id),
            invoice_number=inv.invoice_number,
            subtotal=float(inv.subtotal),
            tax_amount=float(inv.tax_amount),
            total=float(inv.total),
            status=inv.status,
            period_start=inv.period_start,
            period_end=inv.period_end,
            paid_at=inv.paid_at,
            created_at=inv.created_at,
        )
        for inv in invoices
    ]


# TENANT ACTIONS (Suspend, Reactivate, Extend Trial, Impersonate)


@router.post("/tenants/{tenant_id}/suspend/", auth=jwt_auth, response=MessageOut)
def suspend_tenant(request, tenant_id: str):
    """Suspend a tenant and mark its subscription as suspended."""
    _require_super_admin(request)
    tenant = _get_tenant_or_404(tenant_id)
    tenant.is_active = False
    tenant.save(update_fields=["is_active", "updated_at"])

    # Update Subscription as authoritative plan state
    subscription = Subscription.objects.filter(tenant=tenant).first()
    if subscription:
        subscription.status = SubscriptionStatus.SUSPENDED
        subscription.save(update_fields=["status", "updated_at"])

    logger.warning(
        "SUPER_ADMIN %s suspended tenant %s (%s)",
        request.user.email,
        tenant.id,
        tenant.name,
    )
    return MessageOut(success=True, message=get_message("TENANT_SUSPENDED"))


@router.delete("/tenants/{tenant_id}/", auth=jwt_auth, response=MessageOut)
def delete_tenant(request, tenant_id: str):
    """SuperAdmin hard-delete: synchronously delete all tenant data with audit."""
    _require_super_admin(request)
    tenant = _get_tenant_or_404(tenant_id)

    # Prevent deleting tenants already scheduled for deletion
    if tenant.scheduled_deletion_at is not None:
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR",
                detail="El negocio ya está programado para eliminación",
            ),
        )

    # Require justification
    try:
        body = json.loads(request.body) if request.body else {}
    except (ValueError, TypeError):
        body = {}
    justification = body.get("justification", "").strip()
    if len(justification) < 10:
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR",
                detail="Justificación requerida (mínimo 10 caracteres)",
            ),
        )

    tenant_name = tenant.name
    tenant_id_str = str(tenant.id)

    # SYNCHRONOUS hard delete data is gone before response returns
    from apps.tenants.tasks import hard_delete_tenant

    hard_delete_tenant(tenant_id_str, require_scheduled_deletion=False)

    # Audit log with ACTUAL SuperAdmin identity
    try:
        from apps.audit.models import AuditAction, AuditStatus
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.DELETE,
            resource_type="tenant",
            resource_id=tenant_id_str,
            justification=justification,
            details={
                "tenant_name": tenant_name,
                "deletion_type": "superadmin_hard_delete",
            },
            status=AuditStatus.SUCCESS,
        )
    except Exception as e:
        logger.warning("Failed to log deletion audit: %s", e, exc_info=True)

    logger.warning(
        "SUPER_ADMIN %s hard-deleted tenant %s (%s)",
        request.user.email,
        tenant_id_str,
        tenant_name,
    )
    return MessageOut(success=True, message=get_message("TENANT_DELETED"))


@router.post("/tenants/{tenant_id}/reactivate/", auth=jwt_auth, response=MessageOut)
def reactivate_tenant(request, tenant_id: str):
    """Reactivate a tenant and restore its subscription to active."""
    _require_super_admin(request)
    tenant = _get_tenant_or_404(tenant_id)
    tenant.is_active = True
    tenant.save(update_fields=["is_active", "updated_at"])

    # Update Subscription as authoritative plan state
    subscription = Subscription.objects.filter(tenant=tenant).first()
    if subscription:
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.save(update_fields=["status", "updated_at"])

    logger.info(
        "SUPER_ADMIN %s reactivated tenant %s (%s)",
        request.user.email,
        tenant.id,
        tenant.name,
    )
    return MessageOut(success=True, message=get_message("TENANT_UPDATED"))


@router.post("/tenants/{tenant_id}/extend-trial/", auth=jwt_auth, response=MessageOut)
def extend_trial(request, tenant_id: str, payload: ExtendTrialIn):
    """Extend a tenant's trial period by a given number of days.

    Capped at 90 days from the initial trial start to prevent unlimited trials.
    """

    _require_super_admin(request)
    if payload.days < 1 or payload.days > 365:
        raise HttpError(
            400,
            get_message("VALIDATION_ERROR", detail="days must be between 1 and 365"),
        )
    tenant = _get_tenant_or_404(tenant_id)

    # Prevent unlimited trial extensions
    # Cap total trial period at 90 days from first trial start
    subscription = Subscription.objects.filter(tenant=tenant).first()
    if subscription and subscription.trial_start:
        max_trial_end = subscription.trial_start + timedelta(days=90)
        proposed_end = max(
            subscription.trial_end or dj_timezone.now(), dj_timezone.now()
        ) + timedelta(days=payload.days)
        if proposed_end > max_trial_end:
            raise HttpError(
                400,
                get_message(
                    "VALIDATION_ERROR",
                    detail="Trial period cannot exceed 90 days from initial trial start",
                ),
            )

    base_trial_end = subscription.trial_end if subscription else tenant.trial_end
    base = max(base_trial_end or dj_timezone.now(), dj_timezone.now())

    new_trial_end = base + timedelta(days=payload.days)

    tenant.trial_end = new_trial_end
    tenant.is_active = True
    tenant.save(update_fields=["trial_end", "is_active", "updated_at"])

    # Update Subscription trial_end
    if subscription:
        subscription.trial_end = new_trial_end
        subscription.status = SubscriptionStatus.TRIALING
        subscription.save(update_fields=["trial_end", "status", "updated_at"])

    return MessageOut(
        success=True,
        message=get_message("TENANT_TRIAL_EXPIRING", days=tenant.trial_days_remaining),
    )


# WHATSAPP OVERRIDE


@router.patch(
    "/tenants/{tenant_id}/whatsapp-override/",
    auth=jwt_auth,
    response=MessageOut,
    summary="[SuperAdmin] Override WA daily limit para un negocio",
)
def set_whatsapp_override(request, tenant_id: str):
    """Set per-tenant WhatsApp daily limit override.

    specific tenant independently of their subscription plan.
    Set to 0 to revert to the plan default.

    SEC: Hard cap at 200 to prevent WhatsApp bans (Baileys anti-ban).
    """
    _require_super_admin(request)
    tenant = _get_tenant_or_404(tenant_id)

    try:
        body = json.loads(request.body)
        from apps.tenants.super_admin_api.schemas import WhatsAppOverrideIn

        payload = WhatsAppOverrideIn(**body)
    except Exception as e:
        logger.error("Invalid request body: %s", e)
        raise HttpError(
            422, get_message("VALIDATION_ERROR", detail="Invalid request body")
        )

    if payload.daily_limit_override < 0 or payload.daily_limit_override > 200:
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR",
                detail="daily_limit_override debe estar entre 0 y 200",
            ),
        )

    from apps.notifications.models import WhatsAppSession

    session, created = WhatsAppSession.objects.get_or_create(tenant=tenant)
    session.daily_limit_override = payload.daily_limit_override
    session.save(update_fields=["daily_limit_override", "updated_at"])

    logger.info(
        "SUPER_ADMIN %s set WA override for tenant %s (%s) to %d",
        request.user.email,
        tenant.id,
        tenant.name,
        payload.daily_limit_override,
    )

    if payload.daily_limit_override == 0:
        msg = get_message("ADMIN_WA_OVERRIDE_REMOVED")
    else:
        msg = get_message("ADMIN_WA_OVERRIDE_SET", limit=payload.daily_limit_override)

    return MessageOut(success=True, message=msg)
