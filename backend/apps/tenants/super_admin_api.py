"""
Loyallia — Super Admin API (Django Ninja Router)
Platform-wide management. Protected by IsSuperAdmin permission only.
All tenant operations with full audit logging.

All strings via get_message() — Rule #11.
"""
import logging
import secrets
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone as dj_timezone
from django.utils.text import slugify
from ninja import Router
from ninja.errors import HttpError
from pydantic import BaseModel, EmailStr

from apps.authentication.models import User, UserRole
from apps.billing.models import Invoice, Subscription, SubscriptionPlan, SubscriptionStatus
from apps.tenants.models import Location, Plan, Tenant
from common.messages import get_message
from common.permissions import is_super_admin, jwt_auth

logger = logging.getLogger(__name__)

router = Router()


# =============================================================================
# SCHEMAS
# =============================================================================

class TenantAdminOut(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    is_active: bool
    trial_days_remaining: int
    country: str
    ruc: str
    cedula: str
    entity_type: str
    legal_name: str
    industry: str
    province: str
    city: str
    email: str
    phone: str
    created_at: datetime
    user_count: int
    location_count: int

    @classmethod
    def from_tenant(cls, t: Tenant) -> "TenantAdminOut":
        return cls(
            id=str(t.id),
            name=t.name,
            slug=t.slug,
            plan=t.plan,
            is_active=t.is_active,
            trial_days_remaining=t.trial_days_remaining,
            country=t.country,
            ruc=t.ruc,
            cedula=getattr(t, 'cedula', ''),
            entity_type=getattr(t, 'entity_type', 'juridica'),
            legal_name=t.legal_name,
            industry=t.industry,
            province=t.province,
            city=t.city,
            email=t.email,
            phone=t.phone,
            created_at=t.created_at,
            user_count=t.users.count(),
            location_count=t.locations.count(),
        )


# --- Wizard Schemas ---

class LocationIn(BaseModel):
    name: str
    address: str = ""
    city: str = ""
    latitude: float | None = None
    longitude: float | None = None
    is_primary: bool = False


class LocationOut(BaseModel):
    id: str
    name: str
    address: str
    city: str
    latitude: float | None
    longitude: float | None
    is_primary: bool
    is_active: bool

    @classmethod
    def from_location(cls, loc: Location) -> "LocationOut":
        return cls(
            id=str(loc.id),
            name=loc.name,
            address=loc.address,
            city=loc.city,
            latitude=float(loc.latitude) if loc.latitude else None,
            longitude=float(loc.longitude) if loc.longitude else None,
            is_primary=loc.is_primary,
            is_active=loc.is_active,
        )


class CreateTenantWizardIn(BaseModel):
    """Full 4-step wizard payload for creating a tenant."""
    # Step 1 — Entity Type + Company Data
    entity_type: str = "juridica"  # 'natural' or 'juridica'
    name: str
    legal_name: str = ""
    ruc: str = ""
    cedula: str = ""
    industry: str = "other"
    province: str = ""
    city: str = ""
    address: str = ""
    phone: str = ""
    email: str = ""
    website: str = ""
    # Step 2 — Owner
    owner_email: EmailStr
    owner_first_name: str
    owner_last_name: str
    owner_cedula: str = ""
    # Step 3 — Locations
    locations: list[LocationIn] = []
    # Step 4 — Plan
    plan_slug: str = "starter"
    billing_cycle: str = "monthly"


class CreateTenantOut(BaseModel):
    success: bool
    message: str
    tenant_id: str
    owner_id: str
    temp_password: str


class PlatformMetricsOut(BaseModel):
    total_tenants: int
    active_tenants: int
    trial_tenants: int
    suspended_tenants: int
    total_users: int
    total_locations: int
    total_customers: int
    mrr: float  # Monthly Recurring Revenue
    recent_tenants: list


class MessageOut(BaseModel):
    success: bool
    message: str


class ExtendTrialIn(BaseModel):
    days: int


class BroadcastIn(BaseModel):
    subject: str
    message: str


class ImpersonateOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    impersonated_tenant_id: str
    impersonated_user_id: str


# --- Plan Schemas ---

class PlanOut(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    price_monthly: float
    price_annual: float
    max_locations: int
    max_users: int
    max_customers: int
    max_programs: int
    features: list
    is_active: bool
    is_featured: bool
    trial_days: int
    sort_order: int

    @classmethod
    def from_plan(cls, p: SubscriptionPlan) -> "PlanOut":
        return cls(
            id=str(p.id),
            name=p.name,
            slug=p.slug,
            description=p.description,
            price_monthly=float(p.price_monthly),
            price_annual=float(p.price_annual),
            max_locations=p.max_locations,
            max_users=p.max_users,
            max_customers=p.max_customers,
            max_programs=p.max_programs,
            features=p.features,
            is_active=p.is_active,
            is_featured=p.is_featured,
            trial_days=p.trial_days,
            sort_order=p.sort_order,
        )


class PlanCreateIn(BaseModel):
    name: str
    slug: str
    description: str = ""
    price_monthly: float = 0
    price_annual: float = 0
    max_locations: int = 1
    max_users: int = 3
    max_customers: int = 500
    max_programs: int = 1
    features: list = []
    is_featured: bool = False
    trial_days: int = 14
    sort_order: int = 0


class PlanUpdateIn(BaseModel):
    name: str | None = None
    description: str | None = None
    price_monthly: float | None = None
    price_annual: float | None = None
    max_locations: int | None = None
    max_users: int | None = None
    max_customers: int | None = None
    max_programs: int | None = None
    features: list | None = None
    is_featured: bool | None = None
    is_active: bool | None = None
    trial_days: int | None = None
    sort_order: int | None = None


class TenantAdminUpdateIn(BaseModel):
    name: str | None = None
    legal_name: str | None = None
    ruc: str | None = None
    industry: str | None = None
    province: str | None = None
    city: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    plan: str | None = None
    is_active: bool | None = None


# --- Invoice Schema ---

class InvoiceOut(BaseModel):
    id: str
    invoice_number: str
    subtotal: float
    tax_amount: float
    total: float
    status: str
    period_start: datetime
    period_end: datetime
    paid_at: datetime | None = None
    created_at: datetime


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
# TENANT ENDPOINTS
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
        raise HttpError(400, get_message("VALIDATION_ERROR", detail="Email ya registrado en la plataforma"))

    try:
        with transaction.atomic():
            # 1. Create Tenant
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

            # 2. Create Owner
            temp_password = secrets.token_urlsafe(8)
            owner = User.objects.create_user(
                email=payload.owner_email,
                password=temp_password,
                first_name=payload.owner_first_name,
                last_name=payload.owner_last_name,
                role=UserRole.OWNER,
                tenant=tenant,
            )

            # 3. Create Locations
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

            # 4. Create Subscription
            plan_obj = SubscriptionPlan.objects.filter(slug=payload.plan_slug).first()
            sub = Subscription.objects.create(
                tenant=tenant,
                plan="full",
                billing_cycle=payload.billing_cycle,
                status=SubscriptionStatus.TRIALING,
                trial_start=dj_timezone.now(),
                trial_end=dj_timezone.now() + timedelta(
                    days=plan_obj.trial_days if plan_obj else 14
                ),
            )
            tenant.trial_end = sub.trial_end
            tenant.save(update_fields=["trial_end"])

            logger.info(
                "SUPER_ADMIN %s created tenant %s (%s) with %d locations",
                request.user.email, tenant.id, tenant.name, len(payload.locations),
            )

            return CreateTenantOut(
                success=True,
                message=get_message("TENANT_UPDATED"),
                tenant_id=str(tenant.id),
                owner_id=str(owner.id),
                temp_password=temp_password,
            )
    except Exception as e:
        logger.error(f"Tenant creation failed: {str(e)}")
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

    import json
    try:
        body = json.loads(request.body)
        payload = TenantAdminUpdateIn(**body)
    except Exception:
        raise HttpError(422, get_message("VALIDATION_ERROR", detail="Invalid request body"))

    update_fields = ["updated_at"]
    for field in [
        "name", "legal_name", "ruc", "industry", "province",
        "city", "address", "phone", "email", "website", "plan", "is_active",
    ]:
        value = getattr(payload, field, None)
        if value is not None:
            setattr(tenant, field, value.strip() if isinstance(value, str) else value)
            update_fields.append(field)

    tenant.save(update_fields=update_fields)
    logger.info("SUPER_ADMIN %s updated tenant %s fields=%s", request.user.email, tenant.name, update_fields)
    return TenantAdminOut.from_tenant(tenant)


# =============================================================================
# LOCATION ENDPOINTS
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
    summary="[SuperAdmin] Agregar ubicación a un negocio",
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
# INVOICE ENDPOINTS (per tenant)
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
# TENANT ACTIONS
# =============================================================================

@router.post(
    "/tenants/{tenant_id}/suspend/",
    auth=jwt_auth,
    response=MessageOut,
    summary="[SuperAdmin] Suspender negocio",
)
def suspend_tenant(request, tenant_id: str):
    _require_super_admin(request)
    tenant = _get_tenant_or_404(tenant_id)
    tenant.plan = Plan.SUSPENDED
    tenant.is_active = False
    tenant.save(update_fields=["plan", "is_active", "updated_at"])
    logger.warning(
        "SUPER_ADMIN %s suspended tenant %s (%s)",
        request.user.email, tenant.id, tenant.name,
    )
    return MessageOut(success=True, message=get_message("TENANT_SUSPENDED"))


@router.post(
    "/tenants/{tenant_id}/reactivate/",
    auth=jwt_auth,
    response=MessageOut,
    summary="[SuperAdmin] Reactivar negocio",
)
def reactivate_tenant(request, tenant_id: str):
    _require_super_admin(request)
    tenant = _get_tenant_or_404(tenant_id)
    tenant.plan = Plan.FULL
    tenant.is_active = True
    tenant.save(update_fields=["plan", "is_active", "updated_at"])
    logger.info(
        "SUPER_ADMIN %s reactivated tenant %s (%s)",
        request.user.email, tenant.id, tenant.name,
    )
    return MessageOut(success=True, message=get_message("TENANT_UPDATED"))


@router.post(
    "/tenants/{tenant_id}/extend-trial/",
    auth=jwt_auth,
    response=MessageOut,
    summary="[SuperAdmin] Extender período de prueba",
)
def extend_trial(request, tenant_id: str, payload: ExtendTrialIn):
    _require_super_admin(request)
    if payload.days < 1 or payload.days > 365:
        raise HttpError(400, get_message("VALIDATION_ERROR", detail="days must be between 1 and 365"))

    tenant = _get_tenant_or_404(tenant_id)
    base = max(tenant.trial_end or dj_timezone.now(), dj_timezone.now())
    tenant.trial_end = base + timedelta(days=payload.days)
    if tenant.plan == Plan.SUSPENDED:
        tenant.plan = Plan.TRIAL
        tenant.is_active = True
    tenant.save(update_fields=["trial_end", "plan", "is_active", "updated_at"])

    return MessageOut(
        success=True,
        message=get_message("TENANT_TRIAL_EXPIRING", days=tenant.trial_days_remaining),
    )


@router.post(
    "/tenants/{tenant_id}/impersonate/",
    auth=jwt_auth,
    response=ImpersonateOut,
    summary="[SuperAdmin] Impersonar propietario del negocio",
)
def impersonate_tenant(request, tenant_id: str):
    _require_super_admin(request)
    tenant = _get_tenant_or_404(tenant_id)

    try:
        owner = User.objects.get(tenant=tenant, role=UserRole.OWNER, is_active=True)
    except User.DoesNotExist:
        raise HttpError(404, get_message("NOT_FOUND"))

    from django.conf import settings

    from apps.authentication.tokens import create_access_token
    original_lifetime = settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES
    settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES = 5
    access = create_access_token(
        user_id=str(owner.id),
        tenant_id=str(tenant.id),
        role=owner.role,
    )
    settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES = original_lifetime

    logger.warning(
        "IMPERSONATION: SUPER_ADMIN %s impersonated OWNER %s of tenant %s (%s)",
        request.user.email, owner.email, tenant.id, tenant.name,
    )

    return ImpersonateOut(
        access_token=access,
        impersonated_tenant_id=str(tenant.id),
        impersonated_user_id=str(owner.id),
    )


# =============================================================================
# PLATFORM METRICS
# =============================================================================

@router.get(
    "/platform/metrics/",
    auth=jwt_auth,
    response=PlatformMetricsOut,
    summary="[SuperAdmin] Métricas de la plataforma",
)
def platform_metrics(request):
    _require_super_admin(request)

    from apps.customers.models import Customer

    total_tenants = Tenant.objects.count()
    active_tenants = Tenant.objects.filter(is_active=True).count()

    # Calculate MRR from active paid subscriptions
    Subscription.objects.filter(status=SubscriptionStatus.ACTIVE)
    mrr = float(
        Invoice.objects.filter(
            status=Invoice.InvoiceStatus.PAID,
            paid_at__gte=dj_timezone.now() - timedelta(days=60),
        ).aggregate(total=Sum("total"))["total"] or 0
    ) / 2  # Average over 2 months

    # Recent tenants
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

    # Total customers across all tenants
    try:
        total_customers = Customer.objects.count()
    except Exception:
        total_customers = 0

    return PlatformMetricsOut(
        total_tenants=total_tenants,
        active_tenants=active_tenants,
        trial_tenants=Tenant.objects.filter(plan=Plan.TRIAL).count(),
        suspended_tenants=Tenant.objects.filter(plan=Plan.SUSPENDED).count(),
        total_users=User.objects.count(),
        total_locations=Location.objects.count(),
        total_customers=total_customers,
        mrr=mrr,
        recent_tenants=recent_list,
    )


# =============================================================================
# ALL LOCATIONS (for map)
# =============================================================================

@router.get(
    "/platform/locations/",
    auth=jwt_auth,
    response=list[dict],
    summary="[SuperAdmin] Todas las ubicaciones GPS de la plataforma",
)
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


# =============================================================================
# SUBSCRIPTION PLANS CRUD
# =============================================================================

@router.get(
    "/plans/",
    auth=jwt_auth,
    response=list[PlanOut],
    summary="[SuperAdmin] Listar planes de suscripción",
)
def list_plans(request):
    _require_super_admin(request)
    return [PlanOut.from_plan(p) for p in SubscriptionPlan.objects.all()]


@router.post(
    "/plans/",
    auth=jwt_auth,
    response=PlanOut,
    summary="[SuperAdmin] Crear plan de suscripción",
)
def create_plan(request, payload: PlanCreateIn):
    _require_super_admin(request)
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
        features=payload.features,
        is_featured=payload.is_featured,
        trial_days=payload.trial_days,
        sort_order=payload.sort_order,
    )
    logger.info("SUPER_ADMIN %s created plan %s", request.user.email, plan.name)
    return PlanOut.from_plan(plan)


@router.delete(
    "/plans/{plan_id}/",
    auth=jwt_auth,
    response=MessageOut,
    summary="[SuperAdmin] Eliminar plan de suscripción",
)
def delete_plan(request, plan_id: str):
    _require_super_admin(request)
    try:
        plan = SubscriptionPlan.objects.get(id=uuid.UUID(plan_id))
    except (SubscriptionPlan.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))
    plan.is_active = False
    plan.save(update_fields=["is_active", "updated_at"])
    return MessageOut(success=True, message="Plan desactivado")


@router.patch(
    "/plans/{plan_id}/",
    auth=jwt_auth,
    response=PlanOut,
    summary="[SuperAdmin] Actualizar plan de suscripción",
)
def update_plan(request, plan_id: str):
    """Updates an existing subscription plan."""
    _require_super_admin(request)
    try:
        plan = SubscriptionPlan.objects.get(id=uuid.UUID(plan_id))
    except (SubscriptionPlan.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))

    import json
    try:
        body = json.loads(request.body)
        payload = PlanUpdateIn(**body)
    except Exception:
        raise HttpError(422, get_message("VALIDATION_ERROR", detail="Invalid request body"))

    update_fields = ["updated_at"]
    for field in [
        "name", "description", "max_locations", "max_users",
        "max_customers", "max_programs", "features", "is_featured",
        "is_active", "trial_days", "sort_order",
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
# BROADCAST
# =============================================================================

@router.post(
    "/broadcast/",
    auth=jwt_auth,
    response=MessageOut,
    summary="[SuperAdmin] Enviar anuncio global a todos los negocios",
)
def broadcast_announcement(request, payload: BroadcastIn):
    _require_super_admin(request)

    if not payload.subject.strip() or not payload.message.strip():
        raise HttpError(400, get_message("VALIDATION_ERROR", detail="subject and message required"))

    owner_emails = list(
        User.objects.filter(role=UserRole.OWNER, is_active=True)
        .values_list("email", flat=True)
    )

    if not owner_emails:
        return MessageOut(success=True, message="No active owners to broadcast to.")

    from django.core.mail import send_mass_mail
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
        request.user.email, len(owner_emails), payload.subject,
    )
    return MessageOut(
        success=True,
        message=get_message("CAMPAIGN_SENT", count=len(owner_emails)),
    )
