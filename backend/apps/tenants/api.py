"""
Loyallia Tenants API (Django Ninja Router)
Handles: current tenant profile, branding update, location management.

All strings via get_message() — Rule #11.
All endpoints require JWT auth with tenant scope.
"""

import html
import logging
import uuid
from typing import cast

from ninja import Router, Schema
from ninja.errors import HttpError

from apps.tenants.models import Location
from apps.tenants.schemas import (
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


class AIChatIn(Schema):
    message: str
    context_id: str | None = None


from common.messages import get_message  # noqa: E402
from common.permissions import is_manager_or_owner, is_owner, jwt_auth  # noqa: E402
from common.plan_enforcement import (  # noqa: E402
    check_feature_access,
    check_plan_limit,
    get_current_usage,
    get_tenant_limits,
    require_active_subscription,
)

logger = logging.getLogger(__name__)

router = Router()

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

    plan_name = "Sin plan"
    features: list[str] = []
    limits: dict = {}
    usage: dict = {}

    if subscription:
        plan = subscription.subscription_plan
        plan_name = plan.name if plan else "Trial"

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

    if User.objects.filter(email=payload.email).exists():
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
        request.user.email,
        user.email,
        user.role,
        request.tenant.name,
    )

    if getattr(payload, "send_email", True):
        try:
            from django.conf import settings as django_settings
            from django.core.mail import EmailMultiAlternatives

            role_labels = {
                "MANAGER": "Gerente",
                "STAFF": "Personal / Cajero",
            }
            role_label = role_labels.get(payload.role, payload.role)
            tenant_name = request.tenant.name
            from apps.tenants.models import PlatformSetting

            dashboard_url = PlatformSetting.get(
                "dashboard_url", django_settings.FRONTEND_URL
            )
            login_url = dashboard_url.rstrip("/") + "/login"
            from common.email_config import get_default_from_email

            from_email = get_default_from_email()
            primary_color = (
                getattr(request.tenant, "primary_color", "#6366f1") or "#6366f1"
            )

            from datetime import datetime as _dt

            current_year = _dt.now().year

            html_content = f"""<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f8;color:#1e293b;}}.container{{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}}.header{{background:linear-gradient(135deg,{html.escape(primary_color)} 0%,#312e81 100%);padding:32px 24px;text-align:center;color:#fff;}}.header h1{{margin:0 0 4px;font-size:22px;font-weight:700;}}.header p{{margin:0;font-size:13px;opacity:0.8;}}.body{{padding:28px 24px;}}.body h2{{margin:0 0 8px;font-size:18px;font-weight:700;color:#1e293b;}}.body p{{margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;}}.cred-box{{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;}}.cred-box .label{{font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:600;margin-bottom:4px;}}.cred-box .value{{font-size:16px;font-weight:700;color:#1e293b;font-family:monospace;}}.cta{{display:inline-block;margin:20px 0;padding:14px 28px;background:{html.escape(primary_color)};color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;}}.warning{{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin:16px 0;}}.warning p{{margin:0;font-size:12px;color:#92400e;}}.footer{{padding:20px 24px;text-align:center;background:#f8fafc;border-top:1px solid #f1f5f9;}}.footer p{{margin:0;font-size:11px;color:#94a3b8;}}.footer a{{color:{html.escape(primary_color)};text-decoration:none;}}</style></head><body><div class="container"><div class="header"><h1>{html.escape(tenant_name)}</h1><p>Bienvenido al equipo</p></div><div class="body"><h2>Hola {html.escape(payload.first_name)}</h2><p>Has sido invitado como <strong>{html.escape(role_label)}</strong> en <strong>{html.escape(tenant_name)}</strong>. A continuación encontrarás tus credenciales de acceso:</p><div class="cred-box"><div class="label">Email de acceso</div><div class="value">{html.escape(payload.email)}</div></div><div class="cred-box"><div class="label">Contraseña temporal</div><div class="value">{html.escape(temp_password)}</div></div><div class="warning"><p><strong>Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña al iniciar sesión por primera vez.</p></div><center><a href="{html.escape(login_url)}" class="cta">Iniciar Sesión →</a></center><p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:20px;">Si no reconoces esta invitación, puedes ignorar este correo.</p></div><div class="footer"><p>Powered by <a href="https://loyallia.com">Loyallia</a> Intelligent Rewards</p><p style="margin-top:4px;">© {html.escape(str(current_year))} {html.escape(tenant_name)}. Todos los derechos reservados.</p></div></div></body></html>"""# noqa: E501

            msg = EmailMultiAlternatives(
                subject=f"Bienvenido al equipo de {tenant_name}",
                from_email=from_email,
                to=[payload.email],
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=True)
            logger.info("Welcome email sent to %s", payload.email)
        except Exception as exc:
            logger.error("Failed to send welcome email to %s: %s", payload.email, exc)

    return {
        "success": True,
        "message": get_message(
            "TEAM_MEMBER_ADDED", default="Miembro del equipo añadido con éxito"
        ),
        "user_id": str(user.id),
        "temp_password": temp_password,
    }


@router.post("/me/ai-chat/", auth=jwt_auth, summary="Proxy to AI Agent via Vault")
def ai_chat_proxy(request, payload: AIChatIn):
    """
    Proxies chat requests to the external AI Agent.
    Injects the Vault-backed AI_AGENT_API_KEY to ensure zero frontend exposure.
    MANAGER+ only.
    """
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    check_feature_access(request.tenant, "ai_assistant")
    import httpx
    from django.conf import settings

    from common.vault import get_secret

    api_key = get_secret("ai_agent_api_key")
    if not api_key:
        logger.error("AI_AGENT_API_KEY not found in Vault.")
        raise HttpError(503, "AI agent service is not configured correctly.")

    agent_base_url = get_secret("ai_agent_base_url")
    if not agent_base_url:
        agent_base_url = getattr(settings, "AI_AGENT_BASE_URL", "")
    if not agent_base_url:
        logger.error("AI_AGENT_BASE_URL not configured.")
        raise HttpError(503, "AI agent service is not configured correctly.")

    request_data = {
        "message": payload.message,
        "lifetime_hours": 24,
    }
    if payload.context_id:
        request_data["context_id"] = payload.context_id

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{agent_base_url}/api_message",
                json=request_data,
                headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            )
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        logger.error(
            f"AI Agent returned status {e.response.status_code}: {e.response.text}"
        )
        raise HttpError(e.response.status_code, "Failed to fetch from AI agent")
    except Exception as e:
        logger.error(f"Error calling AI agent: {str(e)}")
        raise HttpError(500, "Internal server error while contacting AI agent")


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
    member.delete()

    logger.info(
        "OWNER %s removed team member %s from tenant %s",
        request.user.email,
        email,
        request.tenant.name,
    )

    return {"success": True, "message": get_message("TEAM_MEMBER_REMOVED")}
