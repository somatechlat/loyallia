"""
Loyallia — Super Admin API: Tenant + Location + Invoice endpoints
"""

import json
import logging
import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone as dj_timezone
from django.utils.text import slugify
from ninja import Router
from ninja.errors import HttpError

from apps.authentication.models import User, UserRole
from apps.billing.models import (
    Invoice,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)
from apps.tenants.models import Location, Plan, Tenant
from apps.tenants.super_admin_api.schemas import (
    CreateTenantOut,
    CreateTenantWizardIn,
    ExtendTrialIn,
    ImpersonateOut,
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


# =============================================================================
# HELPERS
# =============================================================================


def _require_super_admin(request) -> None:
    if not is_super_admin(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))


def _get_tenant_or_404(tenant_id: str) -> Tenant:
    try:
        return Tenant.objects.get(id=uuid.UUID(tenant_id))
    except (Tenant.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))


# =============================================================================
# TENANT CRUD
# =============================================================================


@router.get(
    "/tenants/",
    auth=jwt_auth,
    response=list[TenantAdminOut],
    summary="[SuperAdmin] Listar todos los negocios",
)
def list_all_tenants(request, plan: str | None = None, is_active: bool | None = None):
    """Lists all tenants on the platform. SUPER_ADMIN only."""
    _require_super_admin(request)
    qs = Tenant.objects.prefetch_related("users", "locations").order_by("-created_at")
    if plan:
        qs = qs.filter(plan=plan)
    if is_active is not None:
        qs = qs.filter(is_active=is_active)
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
                plan="full",
                is_active=True,
            )
            temp_password = secrets.token_urlsafe(8)
            owner = User.objects.create_user(
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
            plan_obj = SubscriptionPlan.objects.filter(slug=payload.plan_slug).first()
            sub = Subscription.objects.create(
                tenant=tenant,
                plan="full",
                billing_cycle=payload.billing_cycle,
                status=SubscriptionStatus.TRIALING,
                trial_start=dj_timezone.now(),
                trial_end=dj_timezone.now()
                + timedelta(days=plan_obj.trial_days if plan_obj else 14),
            )
            tenant.trial_end = sub.trial_end
            tenant.save(update_fields=["trial_end"])

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
            )
    except Exception as e:
        logger.error("Tenant creation failed: %s", e)
        raise HttpError(500, str(e))


@router.get(
    "/tenants/{tenant_id}/",
    auth=jwt_auth,
    response=TenantAdminOut,
    summary="[SuperAdmin] Detalle de negocio",
)
def get_tenant_detail(request, tenant_id: str):
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
    except Exception:
        raise HttpError(
            422, get_message("VALIDATION_ERROR", detail="Invalid request body")
        )

    update_fields = ["updated_at"]
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
        "plan",
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


# =============================================================================
# LOCATIONS
# =============================================================================


@router.get(
    "/tenants/{tenant_id}/locations/",
    auth=jwt_auth,
    response=list[LocationOut],
    summary="[SuperAdmin] Ubicaciones de un negocio",
)
def list_tenant_locations(request, tenant_id: str):
    _require_super_admin(request)
    tenant = _get_tenant_or_404(tenant_id)
    return [LocationOut.from_location(loc) for loc in tenant.locations.all()]


@router.post(
    "/tenants/{tenant_id}/locations/",
    auth=jwt_auth,
    response=LocationOut,
    summary="[SuperAdmin] Agregar ubicacion a un negocio",
)
def add_tenant_location(request, tenant_id: str, payload: LocationIn):
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


# =============================================================================
# INVOICES
# =============================================================================


@router.get(
    "/tenants/{tenant_id}/invoices/",
    auth=jwt_auth,
    response=list[InvoiceOut],
    summary="[SuperAdmin] Facturas de un negocio",
)
def list_tenant_invoices(request, tenant_id: str):
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


# =============================================================================
# TENANT ACTIONS (Suspend, Reactivate, Extend Trial, Impersonate)
# =============================================================================


@router.post("/tenants/{tenant_id}/suspend/", auth=jwt_auth, response=MessageOut)
def suspend_tenant(request, tenant_id: str):
    """LYL-H-ARCH-011: Suspend tenant — Subscription is authoritative source."""
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


@router.post("/tenants/{tenant_id}/reactivate/", auth=jwt_auth, response=MessageOut)
def reactivate_tenant(request, tenant_id: str):
    """LYL-H-ARCH-011: Reactivate tenant — Subscription is authoritative source."""
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
    """LYL-H-ARCH-011: Extend trial — Subscription is authoritative source.
    LYL-H-API-013: Limit total trial extensions to prevent unlimited trials.
    """
    _require_super_admin(request)
    if payload.days < 1 or payload.days > 365:
        raise HttpError(
            400,
            get_message("VALIDATION_ERROR", detail="days must be between 1 and 365"),
        )
    tenant = _get_tenant_or_404(tenant_id)

    # LYL-H-API-013: Prevent unlimited trial extensions
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

    base = max(tenant.trial_end or dj_timezone.now(), dj_timezone.now())
    tenant.trial_end = base + timedelta(days=payload.days)
    tenant.is_active = True
    tenant.save(update_fields=["trial_end", "is_active", "updated_at"])

    # Update Subscription trial_end
    if subscription:
        subscription.trial_end = tenant.trial_end
        subscription.status = SubscriptionStatus.TRIALING
        subscription.save(update_fields=["trial_end", "status", "updated_at"])

    return MessageOut(
        success=True,
        message=get_message("TENANT_TRIAL_EXPIRING", days=tenant.trial_days_remaining),
    )


@router.post(
    "/tenants/{tenant_id}/impersonate/", auth=jwt_auth, response=ImpersonateOut
)
def impersonate_tenant(request, tenant_id: str):
    _require_super_admin(request)
    tenant = _get_tenant_or_404(tenant_id)
    try:
        owner = User.objects.get(tenant=tenant, role=UserRole.OWNER, is_active=True)
    except User.DoesNotExist:
        raise HttpError(404, get_message("NOT_FOUND"))

    import jwt as pyjwt
    from datetime import UTC, datetime, timedelta

    # Short-lived impersonation token — no global settings mutation
    now = datetime.now(tz=UTC)
    payload = {
        "user_id": str(owner.id),
        "tenant_id": str(tenant.id),
        "role": owner.role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=5)).timestamp()),
        "type": "access",
        "impersonated_by": str(request.user.id),
        "impersonated": True,
    }
    access = pyjwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    logger.warning(
        "IMPERSONATION: SUPER_ADMIN %s impersonated OWNER %s of tenant %s (%s)",
        request.user.email,
        owner.email,
        tenant.id,
        tenant.name,
    )
    return ImpersonateOut(
        access_token=access,
        impersonated_tenant_id=str(tenant.id),
        impersonated_user_id=str(owner.id),
    )
