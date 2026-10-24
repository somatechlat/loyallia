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


def send_team_member_welcome_email(user, temp_password: str, tenant, payload) -> bool:
    """Build and send a welcome HTML email to a newly added team member.

    The send is executed synchronously through the real transactional
    transport (common.email_template -> common.transactional_email).

    Args:
        user: The created User instance.
        temp_password: The temporary password generated for the user.
        tenant: The Tenant instance the user belongs to.
        payload: The TeamMemberCreateIn schema instance containing first_name, email, role.

    Returns:
        True when the email was accepted by the transport, False otherwise.

    Never raises and never logs credentials: the team-member creation flow
    must not be rolled back by a transport failure. The caller must surface
    the returned status to the API consumer instead of failing silently.
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

        sent = send_branded_email(
            subject=get_message("TEAM_INVITE_SUBJECT", tenant_name=tenant_name),
            to=[payload.email],
            title=tenant_name,
            subtitle=get_message("TEAM_INVITE_WELCOME"),
            greeting=get_message("TEAM_INVITE_GREETING", first_name=payload.first_name),
            paragraphs=[
                get_message("TEAM_INVITE_INTRO", role_label=role_label, tenant_name=tenant_name).replace(
                    "<strong>", ""
                ).replace("</strong>", "")
            ],
            credentials_email=payload.email,
            credentials_password=temp_password,
            cta_label=get_message("TEAM_INVITE_CTA"),
            cta_url=login_url,
            warning=get_message("TEAM_INVITE_PASSWORD_WARNING").replace(
                "<strong>", ""
            ).replace("</strong>", ""),
            primary_color=primary_color,
            brand_name=tenant_name,
        )
        if sent:
            logger.info("Welcome email sent to %s", payload.email)
        else:
            logger.error(
                "Welcome email NOT sent to %s (transport accepted 0 messages)",
                payload.email,
            )
        return bool(sent)
    except Exception as exc:
        # SEC: never log credentials — recipient and error only.
        logger.error("Failed to send welcome email to %s: %s", payload.email, exc)
        return False


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
            subtitle=get_message("TEAM_INVITE_WELCOME"),
            greeting=get_message("TEAM_INVITE_GREETING", first_name=owner_first_name or owner_email),
            paragraphs=[
                get_message(
                    "TENANT_WELCOME_EMAIL_BODY",
                    name=owner_first_name or owner_email,
                    tenant=tenant_name,
                    login_url=login_url,
                    email=owner_email,
                    password=temp_password,
                    trial_days=trial_days,
                )
            ],
            credentials_email=owner_email,
            credentials_password=temp_password,
            cta_label=get_message("TEAM_INVITE_CTA"),
            cta_url=login_url,
            warning=get_message("TEAM_INVITE_PASSWORD_WARNING").replace("<strong>", "").replace("</strong>", ""),
            brand_name=tenant_name,
        )
    except Exception as e:
        logger.exception("Failed to send owner welcome email to %s: %s", owner_email, e)
