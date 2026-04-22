"""
Loyallia — Super Admin API: Platform metrics, locations map, broadcast, and plan CRUD
"""

import json
import logging
import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.mail import send_mass_mail
from django.db.models import Sum
from django.utils import timezone as dj_timezone
from ninja import Router
from ninja.errors import HttpError

from apps.authentication.models import User, UserRole
from apps.billing.models import Invoice, SubscriptionPlan
from apps.tenants.models import Location, Plan, Tenant
from apps.tenants.super_admin_api.schemas import (
    BroadcastIn,
    MessageOut,
    PlanCreateIn,
    PlanOut,
    PlanUpdateIn,
    PlatformMetricsOut,
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
# ALL LOCATIONS (map widget)
# =============================================================================


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


@router.delete("/plans/{plan_id}/", auth=jwt_auth, response=MessageOut)
def delete_plan(request, plan_id: str):
    _require_super_admin(request)
    try:
        plan = SubscriptionPlan.objects.get(id=uuid.UUID(plan_id))
    except (SubscriptionPlan.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))
    plan.is_active = False
    plan.save(update_fields=["is_active", "updated_at"])
    return MessageOut(success=True, message="Plan desactivado")


@router.patch("/plans/{plan_id}/", auth=jwt_auth, response=PlanOut)
def update_plan(request, plan_id: str):
    """Updates an existing subscription plan."""
    _require_super_admin(request)
    try:
        plan = SubscriptionPlan.objects.get(id=uuid.UUID(plan_id))
    except (SubscriptionPlan.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))

    try:
        body = json.loads(request.body)
        payload = PlanUpdateIn(**body)
    except Exception:
        raise HttpError(
            422, get_message("VALIDATION_ERROR", detail="Invalid request body")
        )

    update_fields = ["updated_at"]
    for field in [
        "name",
        "description",
        "max_locations",
        "max_users",
        "max_customers",
        "max_programs",
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
        return MessageOut(success=True, message="No active owners to broadcast to.")

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
