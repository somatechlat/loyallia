"""
Loyallia Super Admin API: Seed Demo Data and Factory Reset
"""

import logging
from typing import cast

from django.conf import settings
from django.db import transaction
from django.http import HttpRequest
from ninja import Router
from ninja.errors import HttpError

from apps.authentication.models import User, UserRole
from apps.tenants.models import Location, Tenant
from apps.tenants.super_admin_api.schemas import (
    FactoryResetConfirmIn,
    MessageOut,
    SeedDemoDataOut,
)
from common.email_config import get_default_from_email
from common.messages import get_message
from common.permissions import jwt_auth

logger = logging.getLogger(__name__)
router = Router()


def _require_super_admin(request) -> None:
    from common.permissions import is_super_admin

    if not is_super_admin(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))


def _request_user(request: HttpRequest) -> User:
    return cast(User, request.user)


def _is_production_environment() -> bool:
    from apps.tenants.models import PlatformSetting

    setting = PlatformSetting.objects.filter(key="PLATFORM_MODE").first()
    return bool(setting and setting.value == "production")


@router.post(
    "/platform/seed-demo-data/",
    auth=jwt_auth,
    response=SeedDemoDataOut,
    summary="Cargar datos de demostración",
)
def seed_demo_data(request: HttpRequest) -> SeedDemoDataOut:
    """Load demo data (tenants, customers, transactions) for demonstration.

    SUPER_ADMIN only. Calls the seed_test_data management command.
    Demo data can be loaded at any time from the SysAdmin settings panel.
    """
    _require_super_admin(request)

    if _is_production_environment():
        raise HttpError(403, get_message("ADMIN_FACTORY_PRODUCTION_BLOCKED"))

    from io import StringIO

    from django.core.management import call_command

    # Audit
    try:
        from apps.audit.models import AuditAction
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.SEED_DEMO,
            resource_type="platform",
            resource_id="system",
            details={"triggered_by": _request_user(request).email},
            status="success",
        )
    except Exception as e:
        logger.warning("Failed to audit demo seed: %s", e, exc_info=True)

    output = StringIO()
    call_command("seed_development_data", generate=True, stdout=output, stderr=output)

    # DEMO ONLY: Seed real Ecuadorian business data
    import secrets

    demo_password = secrets.token_urlsafe(16)
    call_command(
        "seed_ecuador_businesses",
        password=demo_password,
        stdout=output,
        stderr=output,
    )

    logger.info("SUPER_ADMIN %s triggered demo data seed", _request_user(request).email)
    return SeedDemoDataOut(
        success=True,
        message=get_message("ADMIN_DEMO_SEEDED"),
        output=output.getvalue() + f"\n\nDemo accounts password: {demo_password}",
    )


@router.post(
    "/platform/factory-reset/request/",
    auth=jwt_auth,
    response=MessageOut,
    summary="Solicitar código para restaurar de fábrica",
)
def factory_reset_request(request: HttpRequest) -> MessageOut:
    """Send OTP to SUPER_ADMIN for factory reset verification.

    Step 1 of 2: Uses OTP strategy (Twilio Verify when enabled,
    local OTP + Twilio SMS fallback otherwise). Sends via email
    as secondary notification. Stores verification SID for confirmation.
    """
    _require_super_admin(request)

    from apps.authentication.otp_service import send_otp

    phone = getattr(request.user, "phone_number", "")
    user = _request_user(request)
    recipient = phone if phone else user.email

    if not recipient:
        raise HttpError(400, get_message("ADMIN_FACTORY_NO_CONTACT"))

    result = send_otp(
        recipient=recipient,
        purpose="factory_reset",
        custom_friendly_name="Loyallia Platform",
    )

    # Store verification SID in Redis for confirm step
    from django.core.cache import cache

    cache.set(
        f"factory_reset:sid:{user.email}",
        result.get("sid", ""),
        timeout=settings.CACHE_TTL_FACTORY_RESET_SID,
    )

    # Secondary: Email notification (always sent, regardless of Verify)
    from django.core.mail import send_mail

    try:
        strategy = result.get("strategy", "local")
        if strategy == "verify":
            msg_body = (
                "Se ha enviado un código de verificación para restaurar de fábrica "
                f"via {result.get('channel', 'SMS')}.\n\n"
                "Ingrese el código recibido en la plataforma.\n\n"
                "Expira en 5 minutos."
            )
        else:
            msg_body = (
                f"Su código de verificación es: {result.get('code', 'N/A')}\n\n"
                "Expira en 5 minutos.\n\n"
                "Si no solicitó esto, ignore este mensaje."
            )

        send_mail(
            subject="Loyallia Código de Verificación para Restaurar de Fábrica",
            message=msg_body,
            from_email=get_default_from_email(),
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception as e:
        logger.error(
            "Failed to send factory reset OTP email to %s: %s",
            user.email,
            e,
            exc_info=True,
        )

    logger.warning(
        "FACTORY RESET requested by %s (strategy=%s channel=%s)",
        user.email,
        result.get("strategy"),
        result.get("channel", "email"),
    )
    return MessageOut(
        success=True,
        message=get_message(
            "FACTORY_RESET_VERIFY_SENT", channel=result.get("channel", "SMS")
        ),
    )


@router.post(
    "/platform/factory-reset/confirm/",
    auth=jwt_auth,
    response=MessageOut,
    summary="Confirmar restauración de fábrica con código OTP",
)
def factory_reset_confirm(
    request: HttpRequest, payload: FactoryResetConfirmIn
) -> MessageOut:
    """Verify OTP and execute factory reset. IRREVERSIBLE.

    Step 2 of 2: Validates the OTP from step 1, then wipes ALL tenant data
    in a single atomic transaction. Re-seeds vital boot data (plans, settings).
    The SUPER_ADMIN user is preserved.
    """
    _require_super_admin(request)

    if _is_production_environment():
        raise HttpError(403, get_message("ADMIN_FACTORY_PRODUCTION_BLOCKED"))

    from io import StringIO

    from django.core.cache import cache

    from apps.authentication.otp_service import check_otp

    user = _request_user(request)
    sid = cache.get(f"factory_reset:sid:{user.email}", "")
    recipient = getattr(user, "phone_number", "") or user.email

    if not check_otp(
        recipient=recipient, code=payload.otp, sid=sid or None, purpose="factory_reset"
    ):
        raise HttpError(403, get_message("ADMIN_FACTORY_OTP_INVALID"))

    # Audit BEFORE wipe (so the log entry is created before data is deleted)
    try:
        from apps.audit.models import AuditAction
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.FACTORY_RESET,
            resource_type="platform",
            resource_id="system",
            details={"triggered_by": user.email},
            status="success",
        )
    except Exception as e:
        logger.warning("Failed to audit factory reset: %s", e, exc_info=True)

    with transaction.atomic():
        # Wipe order: deepest dependencies first to avoid FK violations
        from apps.authentication.models import RefreshToken
        from apps.automation.models import Automation, AutomationExecution
        from apps.billing.models import Subscription
        from apps.billing.payment_models import Invoice, WebhookEvent
        from apps.cards.models import Card
        from apps.customers.models import Customer, CustomerPass
        from apps.notifications.models import CampaignDeliveryLog, CampaignRun
        from apps.notifications.models.misc import Notification
        from apps.transactions.models import Enrollment, Transaction

        Notification.objects.all().delete()
        CampaignDeliveryLog.objects.all().delete()
        CampaignRun.objects.all().delete()
        AutomationExecution.objects.all().delete()
        Automation.objects.all().delete()
        CustomerPass.objects.all().delete()
        Enrollment.objects.all().delete()
        Transaction.objects.all().delete()
        Customer.objects.all().delete()
        Card.objects.all().delete()
        Invoice.objects.all().delete()
        WebhookEvent.objects.all().delete()
        Subscription.objects.all().delete()
        RefreshToken.objects.all().delete()
        Location.objects.all().delete()
        User.objects.exclude(role=UserRole.SUPER_ADMIN).delete()
        Tenant.objects.all().delete()

    # Re-seed vital data (plans + settings)
    from django.core.management import call_command

    call_command("seed_subscription_plans", stdout=StringIO())
    call_command("seed_platform_settings", stdout=StringIO())

    # Flush Redis cache (kill all sessions)
    from django.core.cache import cache

    try:
        cache.clear()
    except Exception as e:
        logger.warning("Failed to clear Redis cache during factory reset: %s", e)

    logger.critical("FACTORY RESET executed by %s", user.email)
    return MessageOut(
        success=True,
        message=get_message("ADMIN_FACTORY_RESET_DONE"),
    )
