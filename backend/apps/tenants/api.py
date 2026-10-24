"""
Loyallia Tenants API (Django Ninja Router)
Handles: current tenant profile, branding update, location management.

All strings via get_message() — Rule #11.
All endpoints require JWT auth with tenant scope.
"""

import logging
import uuid
from typing import cast

from django.db import transaction
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from apps.ai.chat_api import router as ai_chat_router  # noqa: E402
from apps.ai.models import AIChatSession, AIQueryLog  # noqa: E402
from apps.ai.services.cost_tracker import CostTracker  # noqa: E402
from apps.audit.models import AuditAction, AuditStatus  # noqa: E402
from apps.audit.service import log_action  # noqa: E402
from apps.tenants.models import Location
from apps.tenants.schemas import (
    AIChatIn,
    LocationCreateIn,
    LocationOut,
    LocationUpdateIn,
    MessageOut,
    TeamMemberCreateIn,
    TeamMemberOut,
    TeamMemberUpdateIn,
    TenantOut,
    TenantUpdateIn,
)
from apps.tenants.services.ai_proxy import (
    AIProxyConfigError,
    AIProxyRequestError,
    chat_with_ai,
)
from apps.tenants.services.email import send_team_member_welcome_email
from common.messages import get_message  # noqa: E402
from common.permissions import is_manager_or_owner, is_owner, jwt_auth  # noqa: E402
from common.plan_enforcement import (  # noqa: E402
    check_feature_access,
    check_plan_limit,
    get_current_usage,
    get_tenant_limits,
    require_active_subscription,
)
from common.platform_config import (  # noqa: E402
    get_platform_config,
    get_platform_config_bool,
    get_platform_config_int,
)

logger = logging.getLogger(__name__)

router = Router()

# AI chat session lifecycle: /me/ai-chat/session/ and /me/ai-chat/end/.
router.add_router("", ai_chat_router)

# PLAN FEATURES ENDPOINT


@router.get(
    "/me/plan-features/",
    auth=jwt_auth,
    summary="Features y límites del plan actual",
)
def get_plan_features(request):
    """Returns the tenant's plan features, limits, and current usage.

    (WhatsApp wizard, Campaign channel selector, etc.)
    MANAGER+ only.
    """
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = request.tenant
    from apps.billing.models import PlanFeature, Subscription

    subscription = Subscription.objects.filter(tenant=tenant).first()

    plan_name = get_message("PLAN_NAME_NONE")
    features: list[str] = []
    limits: dict = {}
    usage: dict = {}

    if subscription:
        plan = subscription.subscription_plan
        plan_name = plan.name if plan else get_message("PLAN_NAME_TRIAL")

        if subscription.is_trial_active and not plan:
            features = PlanFeature.ALL_FEATURES
        elif plan:
            features = plan.features or []

        limits = get_tenant_limits(tenant)

        usage = {
            "whatsapp_today": get_current_usage(tenant, "whatsapp_day"),
            "emails_this_month": get_current_usage(tenant, "emails_month"),
            "sms_today": get_current_usage(tenant, "sms_day"),
            "wallet_pushes_this_month": get_current_usage(
                tenant, "wallet_pushes_month"
            ),
            "customers": get_current_usage(tenant, "customers"),
        }

    return {
        "plan_name": plan_name,
        "features": features,
        "limits": limits,
        "usage": usage,
    }


# TENANT ENDPOINTS


@router.get(
    "/me/", auth=jwt_auth, response=TenantOut, summary="Perfil del negocio actual"
)
def get_tenant(request):
    return TenantOut.from_tenant(request.tenant)


@router.patch(
    "/me/", auth=jwt_auth, response=TenantOut, summary="Actualizar perfil del negocio"
)
def update_tenant(request, payload: TenantUpdateIn):
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    tenant = request.tenant
    update_fields = ["updated_at"]

    if payload.name is not None:
        tenant.name = payload.name.strip()
        update_fields.append("name")
    if payload.logo_url is not None:
        tenant.logo_url = payload.logo_url
        update_fields.append("logo_url")
    if payload.primary_color is not None:
        tenant.primary_color = payload.primary_color
        update_fields.append("primary_color")
    if payload.secondary_color is not None:
        tenant.secondary_color = payload.secondary_color
        update_fields.append("secondary_color")
    if payload.phone is not None:
        tenant.phone = payload.phone
        update_fields.append("phone")
    if payload.website is not None:
        tenant.website = payload.website
        update_fields.append("website")
    if payload.address is not None:
        tenant.address = payload.address
        update_fields.append("address")
    if payload.timezone is not None:
        tenant.timezone = payload.timezone
        update_fields.append("timezone")

    tenant.save(update_fields=update_fields)
    return TenantOut.from_tenant(tenant)


@router.get(
    "/settings/", auth=jwt_auth, response=TenantOut, summary="Configuración del negocio"
)
def get_tenant_settings(request):
    return get_tenant(request)


@router.put(
    "/settings/",
    auth=jwt_auth,
    response=TenantOut,
    summary="Actualizar configuración del negocio",
)
def update_tenant_settings(request, payload: TenantUpdateIn):
    return update_tenant(request, payload)


# LOCATION ENDPOINTS


@router.get(
    "/locations/",
    auth=jwt_auth,
    response=list[LocationOut],
    summary="Listar ubicaciones del negocio",
)
def list_locations(request):
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    locations = Location.objects.filter(tenant=request.tenant)
    return [LocationOut.from_location(loc) for loc in locations]


@router.post(
    "/locations/",
    auth=jwt_auth,
    response=LocationOut,
    summary="Crear ubicación",
)
def create_location(request, payload: LocationCreateIn):
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    check_plan_limit(request.tenant, "locations", write=True)
    check_feature_access(request.tenant, "geo_fencing")

    loc = Location.objects.create(
        tenant=request.tenant,
        name=payload.name.strip(),
        address=payload.address,
        city=payload.city,
        country=payload.country,
        latitude=payload.latitude,
        longitude=payload.longitude,
        phone=payload.phone,
        is_primary=payload.is_primary,
    )

    if payload.is_primary:
        Location.objects.filter(tenant=request.tenant).exclude(id=loc.id).update(
            is_primary=False
        )

    return LocationOut.from_location(loc)


@router.patch(
    "/locations/{location_id}/",
    auth=jwt_auth,
    response=LocationOut,
    summary="Actualizar ubicación",
)
def update_location(request, location_id: str):
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    try:
        loc = Location.objects.get(id=uuid.UUID(location_id), tenant=request.tenant)
    except (Location.DoesNotExist, ValueError):
        raise HttpError(404, get_message("LOCATION_NOT_FOUND"))

    import json

    try:
        body = json.loads(request.body)
        payload = LocationUpdateIn(**body)
    except Exception as e:
        logger.error("Invalid request body: %s", e)
        raise HttpError(
            422, get_message("VALIDATION_ERROR", detail="Invalid request body")
        )

    update_fields = ["updated_at"]

    if payload.name is not None:
        loc.name = payload.name.strip()
        update_fields.append("name")
    if payload.address is not None:
        loc.address = payload.address
        update_fields.append("address")
    if payload.city is not None:
        loc.city = payload.city
        update_fields.append("city")
    if payload.latitude is not None:
        loc.latitude = payload.latitude
        update_fields.append("latitude")
    if payload.longitude is not None:
        loc.longitude = payload.longitude
        update_fields.append("longitude")
    if payload.phone is not None:
        loc.phone = payload.phone
        update_fields.append("phone")
    if payload.is_active is not None:
        loc.is_active = payload.is_active
        update_fields.append("is_active")
    if payload.is_primary is not None:
        loc.is_primary = payload.is_primary
        update_fields.append("is_primary")
        if payload.is_primary:
            Location.objects.filter(tenant=request.tenant).exclude(id=loc.id).update(
                is_primary=False
            )

    loc.save(update_fields=update_fields)
    return LocationOut.from_location(loc)


@router.delete(
    "/locations/{location_id}/",
    auth=jwt_auth,
    response=MessageOut,
    summary="Eliminar ubicación",
)
def delete_location(request, location_id: str):
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    try:
        loc = Location.objects.get(id=uuid.UUID(location_id), tenant=request.tenant)
    except (Location.DoesNotExist, ValueError):
        raise HttpError(404, get_message("LOCATION_NOT_FOUND"))

    loc.delete()

    from django.http import HttpResponse

    return HttpResponse(status=204)


# TEAM ENDPOINTS


@router.get(
    "/team/",
    auth=jwt_auth,
    response=list[TeamMemberOut],
    summary="Listar miembros del equipo",
)
def list_team(request):
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    from apps.authentication.models import User

    users = (
        User.objects.filter(tenant=request.tenant)
        .exclude(role="SUPER_ADMIN")
        .order_by("-date_joined")
    )
    return [TeamMemberOut.from_user(u) for u in users]


@router.post(
    "/team/",
    auth=jwt_auth,
    response=dict,
    summary="Agregar miembro al equipo",
)
@require_active_subscription
def add_team_member(request, payload: TeamMemberCreateIn):
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    check_plan_limit(request.tenant, "users", write=True)

    import secrets

    from apps.authentication.models import User, UserManager, UserRole

    if payload.role not in (UserRole.MANAGER, UserRole.STAFF):
        raise HttpError(
            400, get_message("VALIDATION_ERROR", detail="Role must be MANAGER or STAFF")
        )

    if User.objects.filter(email=payload.email, tenant=request.tenant).exists():
        raise HttpError(
            400, get_message("VALIDATION_ERROR", detail="Email ya registrado")
        )

    temp_password = secrets.token_urlsafe(8)
    user = cast(UserManager, User.objects).create_user(
        email=payload.email,
        password=temp_password,
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=payload.role,
        tenant=request.tenant,
    )

    logger.info(
        "OWNER %s added team member %s (%s) to tenant %s",
        request.user.email, user.email, user.role, request.tenant.name,
    )

    # email_sent=False means the welcome email was NOT delivered (disabled by the
    # caller or transport failure) — surfaced to the consumer, never silent.
    email_sent = getattr(payload, "send_email", True) and send_team_member_welcome_email(
        user, temp_password, request.tenant, payload
    )

    try:
        log_action(
            request=request,
            action=AuditAction.CREATE,
            resource_type="user",
            resource_id=str(user.id),
            tenant_id=request.tenant.id,
            details={"email": user.email, "role": user.role},
            status=AuditStatus.SUCCESS,
        )
    except Exception as e:
        logger.exception("Failed to log add_team_member audit action: %s", e)

    return {
        "success": True,
        "message": get_message(
            "TEAM_MEMBER_ADDED", default="Miembro del equipo añadido con éxito"
        ),
        "user_id": str(user.id),
        "email_sent": email_sent,
    }


@router.post("/me/ai-chat/", auth=jwt_auth, summary="Proxy to AI Agent via Vault")
def ai_chat_proxy(request, payload: AIChatIn):
    """Dashboard AI chat — plan-gated, quota-metered, tenant/session-scoped.

    Pipeline:
      1. MANAGER+ role, plan feature ``ai_assistant``, SysAdmin kill switch
         (``ai_agent_enabled``).
      2. Monthly AI quota ``ai_queries_month`` enforced inside a transaction
         with the usage row pre-inserted — concurrent requests serialize on
         the subscription row, so the check and the meter commit together
         (no TOCTOU) and failed upstream calls are never charged.
      3. ``context_id`` resolved through ``AIChatSession`` (tenant binding);
         a context owned by another tenant is never forwarded to the agent.
      4. Transport via ``ai_proxy`` (Vault key, server-side PII mask, tenant
         identity headers, one fresh-session retry if the agent dropped the
         context).
      5. Session bind + usage finalization + audit entry.
    """
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    check_feature_access(request.tenant, "ai_assistant")
    if not get_platform_config_bool("ai_agent_enabled", True):
        raise HttpError(503, get_message("AI_ASSISTANT_UNAVAILABLE"))

    session = AIChatSession.resolve_for_tenant(
        tenant=request.tenant, context_id=payload.context_id
    )
    # Existing sessions keep the profile they were created with (the agent
    # rejects profile changes on a live context); new sessions take the
    # SysAdmin-configured default.
    agent_profile = (
        session.agent_profile
        if session
        else get_platform_config("ai_agent_profile", "loyallia-help")
    )
    lifetime_hours = max(
        1,
        min(get_platform_config_int("ai_agent_context_lifetime_hours", 24), 24 * 7),
    )

    cost_tracker = CostTracker()
    with transaction.atomic():
        check_plan_limit(request.tenant, "ai_queries_month", write=True)
        usage = cost_tracker.record_cost(
            tenant_id=request.tenant.id,
            endpoint=AIQueryLog.Endpoint.CHAT,
            tokens_used={
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
            },
            # SEC: metadata only — chat content never enters the usage log.
            request_data={
                "message_chars": len(payload.message),
                "agent_profile": agent_profile,
            },
        )

    try:
        result = chat_with_ai(
            message=payload.message,
            tenant_id=request.tenant.id,
            user_id=request.user.id,
            context_id=session.context_id if session else None,
            agent_profile=agent_profile,
            lifetime_hours=lifetime_hours,
        )
    except AIProxyConfigError as exc:
        cost_tracker.discard_cost(
            log_id=usage.get("log_id"), tenant_id=request.tenant.id
        )
        raise HttpError(503, str(exc)) from exc
    except AIProxyRequestError as exc:
        cost_tracker.discard_cost(
            log_id=usage.get("log_id"), tenant_id=request.tenant.id
        )
        raise HttpError(exc.status_code or 503, str(exc)) from exc

    superseded_context = result.get("superseded_context_id") or ""
    if superseded_context:
        # A fresh-session retry abandoned this context (the proxy terminated
        # its agent-side copy): the stale binding must never be resurrected.
        AIChatSession.objects.filter(
            tenant=request.tenant, context_id=superseded_context, is_active=True
        ).update(is_active=False, updated_at=timezone.now())

    new_context = result.get("context_id")
    if not new_context and session and session.context_id != superseded_context:
        new_context = session.context_id
    if new_context:
        bound = AIChatSession.bind(
            tenant=request.tenant,
            context_id=new_context,
            agent_profile=agent_profile,
            created_by_id=request.user.id,
            lifetime_hours=lifetime_hours,
        )
        if bound is None:
            # Defensive: context already bound to another tenant — never expose it.
            new_context = None

    response_text = result.get("response") or ""
    cost_tracker.finalize_cost(
        log_id=usage.get("log_id"),
        tenant_id=request.tenant.id,
        response_data={
            "context_id": new_context,
            "response_chars": len(response_text),
            "agent_profile": agent_profile,
        },
    )
    log_action(
        request=request,
        action=AuditAction.READ,
        resource_type="ai_chat",
        resource_id=new_context or "",
        details={
            "agent_profile": agent_profile,
            "message_chars": len(payload.message),
            "response_chars": len(response_text),
        },
        status=AuditStatus.SUCCESS,
    )
    return {"response": response_text, "context_id": new_context}


@router.patch(
    "/team/{user_id}/",
    auth=jwt_auth,
    response=dict,
    summary="Actualizar miembro del equipo",
)
def update_team_member(request, user_id: str, payload: TeamMemberUpdateIn):
    """Updates a team member's role or active status. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    from apps.authentication.models import User, UserRole

    try:
        member = User.objects.get(id=uuid.UUID(user_id), tenant=request.tenant)
    except (User.DoesNotExist, ValueError):
        raise HttpError(404, get_message("USER_NOT_FOUND"))

    # Cannot edit self
    if member.id == request.user.id:
        raise HttpError(400, get_message("TEAM_CANNOT_EDIT_SELF"))

    update_fields = ["updated_at"]

    if payload.role is not None:
        if payload.role not in (UserRole.MANAGER, UserRole.STAFF):
            raise HttpError(
                400,
                get_message("VALIDATION_ERROR", detail="Role must be MANAGER or STAFF"),
            )
        member.role = payload.role
        update_fields.append("role")

    if payload.is_active is not None:
        member.is_active = payload.is_active
        update_fields.append("is_active")

    member.save(update_fields=update_fields)

    logger.info(
        "OWNER %s updated team member %s (role=%s, active=%s) in tenant %s",
        request.user.email,
        member.email,
        member.role,
        member.is_active,
        request.tenant.name,
    )

    try:
        log_action(
            request=request,
            action=AuditAction.UPDATE,
            resource_type="user",
            resource_id=str(member.id),
            tenant_id=request.tenant.id,
            details={
                "email": member.email,
                "role": member.role,
                "is_active": member.is_active,
            },
            status=AuditStatus.SUCCESS,
        )
    except Exception as e:
        logger.exception("Failed to log update_team_member audit action: %s", e)

    return {"success": True, "message": get_message("TEAM_MEMBER_UPDATED")}


@router.delete(
    "/team/{user_id}/",
    auth=jwt_auth,
    response=dict,
    summary="Eliminar miembro del equipo",
)
def delete_team_member(request, user_id: str):
    """Removes a team member from the tenant. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    from apps.authentication.models import User

    try:
        member = User.objects.get(id=uuid.UUID(user_id), tenant=request.tenant)
    except (User.DoesNotExist, ValueError):
        raise HttpError(404, get_message("USER_NOT_FOUND"))

    if member.id == request.user.id:
        raise HttpError(400, get_message("TEAM_CANNOT_DELETE_SELF"))

    email = member.email
    member_id = str(member.id)
    member.delete()

    logger.info(
        "OWNER %s removed team member %s from tenant %s",
        request.user.email,
        email,
        request.tenant.name,
    )

    try:
        log_action(
            request=request,
            action=AuditAction.DELETE,
            resource_type="user",
            resource_id=member_id,
            tenant_id=request.tenant.id,
            details={"email": email},
            status=AuditStatus.SUCCESS,
        )
    except Exception as e:
        logger.exception("Failed to log delete_team_member audit action: %s", e)

    return {"success": True, "message": get_message("TEAM_MEMBER_REMOVED")}
