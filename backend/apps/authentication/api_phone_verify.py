"""
Loyallia Phone Verification API Endpoints

PUBLIC endpoints for phone verification via Twilio Verify or local OTP fallback.
No authentication required. Rate limited.
"""

import logging

from ninja import Router

from apps.authentication.otp_service import check_otp, send_otp
from apps.authentication.schemas import (
    PhoneVerifyCheckIn,
    PhoneVerifyCheckOut,
    PhoneVerifyStartIn,
    PhoneVerifyStartOut,
)
from common.messages import get_message
from common.rate_limit import check_rate_limit

logger = logging.getLogger(__name__)
router = Router()


@router.post(
    "/verify-phone/start/",
    response=PhoneVerifyStartOut,
    summary="Iniciar verificación de teléfono",
)
def verify_phone_start(request, payload: PhoneVerifyStartIn):
    """Start phone verification via Twilio Verify or local OTP fallback.

    PUBLIC endpoint. No auth required. Rate limited.
    """
    from django.core.cache import cache

    # Rate limit: max 5 starts per phone per 10 minutes
    rate_key = f"verify_phone_start:{payload.phone}"
    try:
        count = cache.incr(rate_key)
    except ValueError:
        cache.set(rate_key, 1, timeout=600)
        count = 1
    if count > 5:
        return PhoneVerifyStartOut(
            success=False,
            message=get_message("VERIFY_RATE_LIMITED", minutes=10),
        )

    try:
        result = send_otp(
            recipient=payload.phone,
            channel=payload.channel,
            purpose="phone_verification",
        )
    except Exception as exc:
        logger.error("Phone verify start failed for %s: %s", payload.phone, exc)
        return PhoneVerifyStartOut(
            success=False,
            message=get_message("VERIFY_OTP_FAILED", detail=str(exc)),
        )

    return PhoneVerifyStartOut(
        success=True,
        message=get_message("VERIFY_OTP_SENT", channel=result.get("channel", "sms")),
        sid=result.get("sid", ""),
        strategy=result.get("strategy", ""),
        channel=result.get("channel", ""),
    )


@router.post(
    "/verify-phone/check/",
    response=PhoneVerifyCheckOut,
    summary="Verificar código de teléfono",
)
def verify_phone_check(request, payload: PhoneVerifyCheckIn):
    """Check phone verification code.

    PUBLIC endpoint. No auth required.
    Rate limited to 5 attempts per phone number per 15 minutes.
    """
    phone = payload.phone.strip()
    allowed, _ = check_rate_limit(
        f"verify_phone_check:{phone}", max_requests=5, window_seconds=900
    )
    if not allowed:
        return PhoneVerifyCheckOut(
            success=False,
            message=get_message("VERIFY_RATE_LIMITED", minutes=15),
            valid=False,
        )

    try:
        is_valid = check_otp(
            recipient=payload.phone,
            code=payload.code,
            sid=payload.sid or None,
            purpose="phone_verification",
        )
    except Exception as exc:
        logger.error("Phone verify check failed for %s: %s", payload.phone, exc)
        return PhoneVerifyCheckOut(
            success=False,
            message=get_message("VERIFY_OTP_FAILED", detail=str(exc)),
            valid=False,
        )

    if is_valid:
        return PhoneVerifyCheckOut(
            success=True,
            message=get_message("VERIFY_OTP_VALID"),
            valid=True,
        )

    return PhoneVerifyCheckOut(
        success=False,
        message=get_message("VERIFY_OTP_INVALID"),
        valid=False,
    )
