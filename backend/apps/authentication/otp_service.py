"""
Loyallia  OTP Service Strategy Pattern (LYL-SRS-VERIFY-001)

REAL PRODUCTION CODE. NO MOCKS. NO BYPASSES.

Provides runtime-selectable OTP delivery:
    - VerifyOTPStrategy: Uses Twilio Verify v2 (all channels)
    - LocalOTPStrategy: Uses local secrets + Twilio direct SMS fallback

Selection is dynamic based on Vault config (no server restart).

Usage:
    strategy = get_otp_strategy()
    result = strategy.send("+593991234567", channel="sms")
    valid = strategy.verify("+593991234567", code="123456", sid=result["sid"])
"""

import logging
import secrets
from abc import ABC, abstractmethod
from typing import Any

from django.core.cache import cache

from apps.notifications.sms.client import send_sms
from apps.notifications.twilio_verify.client import VerifyClient, VerifyServiceError
from common.messages import get_message
from common.vault import get_secret

logger = logging.getLogger(__name__)

OTP_REDIS_PREFIX = "otp:"
OTP_TTL_SECONDS = 300  # 5 minutes
OTP_MAX_ATTEMPTS = 3
OTP_ATTEMPT_WINDOW = 3600  # 1 hour


class OTPStrategy(ABC):
    """Abstract base for OTP strategies."""

    @abstractmethod
    def send(self, recipient: str, channel: str | None = None, **kwargs: Any) -> dict[str, Any]:
        """Send OTP to recipient.

        Returns:
            {"sid": str, "status": str, "strategy": str, ...}
        """

    @abstractmethod
    def verify(self, recipient: str, code: str, sid: str | None = None, **kwargs: Any) -> bool:
        """Verify OTP code.

        Returns:
            True if valid, False otherwise.
        """

    def _check_rate_limit(self, recipient: str) -> None:
        """Check if recipient has exceeded max attempts.

        Raises:
            VerifyServiceError: If rate limited.
        """
        key = f"{OTP_REDIS_PREFIX}attempts:{recipient}"
        attempts = cache.get(key, 0)
        if attempts >= OTP_MAX_ATTEMPTS:
            raise VerifyServiceError(
                get_message("VERIFY_RATE_LIMITED", minutes=OTP_ATTEMPT_WINDOW // 60),
                code=429,
            )

    def _increment_attempts(self, recipient: str) -> None:
        """Increment attempt counter for recipient."""
        key = f"{OTP_REDIS_PREFIX}attempts:{recipient}"
        try:
            cache.incr(key)
        except ValueError:
            cache.set(key, 1, timeout=OTP_ATTEMPT_WINDOW)

    def _reset_attempts(self, recipient: str) -> None:
        """Reset attempt counter for recipient."""
        key = f"{OTP_REDIS_PREFIX}attempts:{recipient}"
        cache.delete(key)


class VerifyOTPStrategy(OTPStrategy):
    """Twilio Verify v2 OTP strategy.

    Uses Twilio Verify API for code generation and validation.
    Supports all channels: sms, whatsapp, voice, email, sna, auto.
    """

    def __init__(self) -> None:
        self._client: VerifyClient | None = None

    @property
    def client(self) -> VerifyClient:
        if self._client is None:
            self._client = VerifyClient()
        return self._client

    def send(self, recipient: str, channel: str | None = None, **kwargs: Any) -> dict[str, Any]:
        """Start a Twilio Verify verification.

        Args:
            recipient: Phone (E.164) or email to verify.
            channel: Verify channel. Defaults to Vault config.
            **kwargs: Additional Verify params (custom_code, template_sid, etc.)
        """
        self._check_rate_limit(recipient)

        if not channel:
            channel = get_secret("twilio_verify_default_channel", default="sms")

        result = self.client.start_verification(
            to=recipient,
            channel=channel,
            **kwargs,
        )
        result["strategy"] = "verify"
        self._increment_attempts(recipient)
        return result

    def verify(self, recipient: str, code: str, sid: str | None = None, **kwargs: Any) -> bool:
        """Check a Twilio Verify code.

        Args:
            recipient: Phone or email that received the code.
            code: The OTP entered by the user.
            sid: Optional Verify Service SID override.
        """
        try:
            result = self.client.check_verification(
                to=recipient,
                code=code,
                service_sid=sid or None,
            )
        except VerifyServiceError:
            self._increment_attempts(recipient)
            return False

        is_valid = result.get("status") == "approved" and result.get("valid") is True
        if is_valid:
            self._reset_attempts(recipient)
        else:
            self._increment_attempts(recipient)
        return is_valid


class LocalOTPStrategy(OTPStrategy):
    """Local OTP generation with multi-channel delivery.

    Generates a 6-digit code using Python secrets, stores in Redis.
    Delivery priority:
        1. Twilio direct SMS (if recipient is E.164 phone)
        2. Email OTP via Django send_mail (fallback, or if recipient is email)
        3. Code stored in Redis regardless  always verifiable

    This strategy activates when Twilio Verify is disabled in Vault,
    enabling dynamic enable/disable control for phone verification.
    """

    def _generate_code(self) -> str:
        """Generate a cryptographically secure 6-digit OTP."""
        return str(secrets.randbelow(900000) + 100000)

    def _store_code(self, recipient: str, code: str) -> None:
        """Store OTP in Redis with TTL."""
        key = f"{OTP_REDIS_PREFIX}code:{recipient}"
        cache.set(key, code, timeout=OTP_TTL_SECONDS)

    def _get_stored_code(self, recipient: str) -> str | None:
        """Retrieve OTP from Redis."""
        key = f"{OTP_REDIS_PREFIX}code:{recipient}"
        return cache.get(key)

    def _send_otp_email(self, email: str, code: str) -> dict[str, Any]:
        """Send OTP code via email using Django's SMTP backend (Mailjet).

        Args:
            email: Recipient email address.
            code: The 6-digit OTP code.

        Returns:
            {"success": bool, "error": str | None}
        """
        from django.conf import settings
        from django.core.mail import send_mail

        try:
            result = send_mail(
                subject="Loyallia  Código de verificación",
                message=(
                    f"Tu código de verificación Loyallia es: {code}\n\n"
                    f"Este código expira en {OTP_TTL_SECONDS // 60} minutos.\n"
                    f"No compartas este código con nadie.\n\n"
                    f" Loyallia"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            logger.info("OTP email sent to %s: result=%s", email, result)
            return {"success": bool(result), "error": None}
        except Exception as exc:
            logger.error("OTP email send failed for %s: %s", email, exc)
            return {"success": False, "error": str(exc)}

    def send(self, recipient: str, channel: str | None = None, **kwargs: Any) -> dict[str, Any]:
        """Generate and send local OTP.

        Args:
            recipient: Phone number (E.164) or email address.
            channel: Hint for delivery. Ignored for SMS; used to detect email.
            **kwargs: Optional 'email' key for fallback email delivery when
                      recipient is a phone number.
        """
        self._check_rate_limit(recipient)

        code = self._generate_code()
        self._store_code(recipient, code)

        delivery_channel = "none"
        delivery_success = False
        delivery_error: str | None = None

 # Determine if recipient is a phone or email
        is_phone = recipient.startswith("+")
        fallback_email = kwargs.get("email", "")

        if is_phone:
 # Try Twilio direct SMS first
            try:
                sms_result = send_sms(
                    phone=recipient,
                    message=f"Tu código de verificación Loyallia es: {code}. No lo compartas con nadie.",
                )
                delivery_success = sms_result.get("success", False)
                delivery_error = sms_result.get("error")
                delivery_channel = "sms"
            except Exception as exc:
                logger.error("Local OTP SMS send failed: %s", exc)
                delivery_error = str(exc)

 # If SMS failed and we have a fallback email, send via email
            if not delivery_success and fallback_email:
                logger.info("SMS failed, falling back to email OTP for %s", fallback_email)
                email_result = self._send_otp_email(fallback_email, code)
                delivery_success = email_result["success"]
                delivery_error = email_result.get("error")
                delivery_channel = "email"
        else:
 # Recipient is an email address send directly
            email_result = self._send_otp_email(recipient, code)
            delivery_success = email_result["success"]
            delivery_error = email_result.get("error")
            delivery_channel = "email"

        self._increment_attempts(recipient)

        return {
            "sid": f"local:{recipient}",
            "status": "pending",
            "strategy": "local",
            "channel": delivery_channel,
            "delivery_success": delivery_success,
            "delivery_error": delivery_error,
        }

    def verify(self, recipient: str, code: str, sid: str | None = None, **kwargs: Any) -> bool:
        """Check local OTP against stored value."""
        stored = self._get_stored_code(recipient)
        if stored is None:
            return False

 # Use constant-time comparison to prevent timing attacks
        import hmac

        is_valid = hmac.compare_digest(stored, code)
        if is_valid:
            self._reset_attempts(recipient)
 # Delete used code
            cache.delete(f"{OTP_REDIS_PREFIX}code:{recipient}")
        else:
            self._increment_attempts(recipient)
        return is_valid


def get_otp_strategy() -> OTPStrategy:
    """Return the active OTP strategy based on current Vault config.

    Priority:
        1. Twilio Verify if enabled + Service SID configured
        2. Local OTP fallback otherwise

    Returns:
        OTPStrategy instance.
    """
    try:
        if VerifyClient.is_verify_configured():
            logger.debug("Using VerifyOTPStrategy")
            return VerifyOTPStrategy()
    except Exception as exc:
        logger.warning("Verify check failed, falling back to local: %s", exc)

    logger.debug("Using LocalOTPStrategy")
    return LocalOTPStrategy()


def send_otp(
    recipient: str,
    channel: str | None = None,
    purpose: str = "verification",
    **kwargs: Any,
) -> dict[str, Any]:
    """High-level OTP send  auto-selects strategy.

    Args:
        recipient: Phone (E.164) or email.
        channel: Override default channel.
        purpose: Context for logging ("factory_reset", "registration", etc.)
        **kwargs: Extra params passed to strategy.send()

    Returns:
        Dict with sid, status, strategy, etc.
    """
    strategy = get_otp_strategy()
    result = strategy.send(recipient, channel=channel, **kwargs)
    logger.info(
        "OTP sent: recipient=%s purpose=%s strategy=%s status=%s",
        recipient,
        purpose,
        result.get("strategy"),
        result.get("status"),
    )
    return result


def check_otp(
    recipient: str,
    code: str,
    sid: str | None = None,
    purpose: str = "verification",
    **kwargs: Any,
) -> bool:
    """High-level OTP verify  auto-selects strategy.

    Args:
        recipient: Phone or email.
        code: OTP entered by user.
        sid: Optional verification SID (for Verify strategy).
        purpose: Context for logging.
        **kwargs: Extra params passed to strategy.verify()

    Returns:
        True if valid.
    """
    strategy = get_otp_strategy()
    is_valid = strategy.verify(recipient, code=code, sid=sid, **kwargs)
    logger.info(
        "OTP checked: recipient=%s purpose=%s strategy=%s valid=%s",
        recipient,
        purpose,
        type(strategy).__name__,
        is_valid,
    )
    return is_valid
