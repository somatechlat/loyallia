"""
Loyallia Tenant Email Services (apps.tenants.services.email)

Business logic for sending tenant-related emails.
Called by: apps.tenants.api (team management endpoints)
"""

import logging

from django.conf import settings as django_settings

from apps.tenants.models import PlatformSetting
from common.email_template import send_branded_email
from common.messages import get_message

logger = logging.getLogger(__name__)


def send_team_member_welcome_email(user, temp_password: str, tenant, payload) -> None:
    """Build and send a welcome HTML email to a newly added team member.

    Args:
        user: The created User instance.
        temp_password: The temporary password generated for the user.
        tenant: The Tenant instance the user belongs to.
        payload: The TeamMemberCreateIn schema instance containing first_name, email, role.

    Raises:
        Exception: Logs the error but does not re-raise so the caller flow continues.
    """
    try:
        role_key = {
            "MANAGER": "TEAM_ROLE_MANAGER",
            "STAFF": "TEAM_ROLE_STAFF",
        }.get(payload.role, "")
        role_label: str = get_message(role_key) if role_key else (payload.role or "")
        tenant_name = tenant.name

        dashboard_url = PlatformSetting.get(
            "dashboard_url", django_settings.FRONTEND_URL
        )
        login_url = dashboard_url.rstrip("/") + "/login"
        primary_color: str = getattr(tenant, "primary_color", "#6366f1") or "#6366f1"

        send_branded_email(
            subject=get_message("TEAM_INVITE_SUBJECT", tenant_name=tenant_name),
            to=[payload.email],
            title=tenant_name,
            subtitle=get_message("TEAM_INVITE_WELCOME"),
            greeting=get_message("TEAM_INVITE_GREETING", first_name=payload.first_name),
            paragraphs=[
                get_message("TEAM_INVITE_BODY", tenant=tenant_name, role=role_label)
            ],
            credentials_email=payload.email,
            credentials_password=temp_password,
            cta_label=get_message("TEAM_INVITE_CTA"),
            cta_url=login_url,
            warning=get_message("TEAM_INVITE_SECURITY_NOTE"),
            primary_color=primary_color,
            brand_name=tenant_name,
        )
        logger.info("Welcome email sent to %s", payload.email)
    except Exception as exc:
        logger.error("Failed to send welcome email to %s: %s", payload.email, exc)


def send_owner_welcome_email(
    owner_email: str,
    owner_first_name: str,
    tenant_name: str,
    temp_password: str,
    trial_days: int,
) -> None:
    """Send welcome email to a newly created tenant owner.

    Args:
        owner_email: The owner's email address.
        owner_first_name: The owner's first name (falls back to email).
        tenant_name: The tenant/business name.
        temp_password: The temporary password for first login.
        trial_days: Number of trial days granted.

    Raises:
        Exception: Logs the error but does not re-raise.
    """
    try:
        dashboard_url = PlatformSetting.get(
            "dashboard_url", django_settings.FRONTEND_URL
        )
        login_url = f"{dashboard_url.rstrip('/')}/login"
        send_branded_email(
            subject=get_message("TENANT_WELCOME_EMAIL_SUBJECT"),
            to=[owner_email],
            title=tenant_name,
            subtitle="Bienvenido a Loyallia",
            greeting=f"Hola {owner_first_name or owner_email},",
            paragraphs=[
                f"Tu cuenta de {tenant_name} está lista. Tienes {trial_days} días de prueba.",
                "Usa las credenciales para ingresar al panel.",
            ],
            credentials_email=owner_email,
            credentials_password=temp_password,
            cta_label="Iniciar sesión",
            cta_url=login_url,
            warning="Guarda esta contraseña en un lugar seguro. Puedes cambiarla después de iniciar sesión.",
            brand_name=tenant_name,
        )
    except Exception as e:
        logger.exception("Failed to send owner welcome email to %s: %s", owner_email, e)
