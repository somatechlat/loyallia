"""
Loyallia  Twilio Verify Service Management (LYL-SRS-VERIFY-001)

REAL PRODUCTION CODE. NO MOCKS. NO BYPASSES.

Provides CRUD operations for Twilio Verify Services:
    - Create a new Verify Service
    - List all Verify Services
    - Fetch a specific Service
    - Update Service configuration
    - Delete a Service

This allows the platform to auto-provision a Verify Service if one does not exist,
or manage multiple services for different tenants/regions.

Refs:
    https://www.twilio.com/docs/verify/api/service
"""

import logging
from typing import Any

from .client import VerifyClient, VerifyServiceError

logger = logging.getLogger(__name__)

try:
    from twilio.rest import Client as TwilioClient
except ImportError:  # pragma: no cover
    TwilioClient = None  # type: ignore[misc,assignment]


class VerifyServiceManager:
    """Manager for Twilio Verify Service resources.

    Uses the same credential resolution as VerifyClient.
    """

    def __init__(self) -> None:
        self._client: Any = None

    def _get_twilio_client(self) -> Any:
        if self._client is not None:
            return self._client
        if TwilioClient is None:
            raise VerifyServiceError("twilio Python SDK not installed", code=503)

        username, password = VerifyClient._get_credentials()
        self._client = TwilioClient(username, password)
        return self._client

 # Service CRUD


    def create_service(
        self,
        friendly_name: str = "Loyallia Verify",
        code_length: int = 6,
        lookup_enabled: bool = False,
        psd2_enabled: bool = False,
        skip_sms_to_landlines: bool = False,
        dtmf_input_required: bool = False,
        do_not_share_warning_enabled: bool = True,
        custom_code_enabled: bool = True,
        default_template_sid: str | None = None,
        msg_service_sid: str | None = None,
        whatsapp_from: str | None = None,
        totp_issuer: str | None = None,
        totp_time_step: int = 30,
        totp_code_length: int = 6,
        totp_skew: int = 1,
    ) -> dict[str, Any]:
        """Create a new Twilio Verify Service.

        REAL API CALL. Hits POST https://verify.twilio.com/v2/Services

        Args:
            friendly_name: Human-readable name (max 32 chars, no PII).
            code_length: OTP length (4-10, default 6).
            lookup_enabled: Perform phone number lookup before sending.
            psd2_enabled: Enable PSD2 transaction parameters.
            skip_sms_to_landlines: Skip SMS to landlines (requires lookup_enabled).
            dtmf_input_required: Require DTMF press before voice code delivery.
            do_not_share_warning_enabled: Add fraud warning to SMS.
            custom_code_enabled: Allow sending pre-generated codes.
            default_template_sid: Default message template (HJ...).
            msg_service_sid: Messaging Service SID for WhatsApp (MG...).
            whatsapp_from: WhatsApp sender number (E.164).
            totp_issuer: TOTP URI issuer name.
            totp_time_step: TOTP code generation interval (20-60 sec).
            totp_code_length: TOTP digits (3-8).
            totp_skew: Valid time-steps past/future (0-2).

        Returns:
            Dict with created service details including `sid` (VA...).
        """
        client = self._get_twilio_client()

        payload: dict[str, Any] = {
            "friendly_name": friendly_name,
            "code_length": code_length,
            "lookup_enabled": lookup_enabled,
            "psd2_enabled": psd2_enabled,
            "skip_sms_to_landlines": skip_sms_to_landlines,
            "dtmf_input_required": dtmf_input_required,
            "do_not_share_warning_enabled": do_not_share_warning_enabled,
            "custom_code_enabled": custom_code_enabled,
        }

        if default_template_sid:
            payload["default_template_sid"] = default_template_sid
        if msg_service_sid:
            payload["messaging_service_sid"] = msg_service_sid
        if whatsapp_from:
            payload["whatsapp_from"] = whatsapp_from
        if totp_issuer:
            payload["totp_issuer"] = totp_issuer
        if totp_time_step != 30:
            payload["totp_time_step"] = totp_time_step
        if totp_code_length != 6:
            payload["totp_code_length"] = totp_code_length
        if totp_skew != 1:
            payload["totp_skew"] = totp_skew

        try:
            service = client.verify.v2.services.create(**payload)
        except Exception as exc:
            logger.error("Twilio Verify create_service failed: %s", exc)
            raise VerifyServiceError(
                f"Failed to create Verify Service: {exc}",
                code=getattr(exc, "status", 500),
            ) from exc

        result = self._service_to_dict(service)
        logger.info(
            "Verify Service created: sid=%s friendly_name=%s",
            result.get("sid"),
            result.get("friendly_name"),
        )
        return result

    def list_services(self, limit: int = 20) -> list[dict[str, Any]]:
        """List all Twilio Verify Services for the account.

        REAL API CALL. Hits GET https://verify.twilio.com/v2/Services
        """
        client = self._get_twilio_client()

        try:
            services = client.verify.v2.services.list(limit=limit)
        except Exception as exc:
            logger.error("Twilio Verify list_services failed: %s", exc)
            raise VerifyServiceError(
                f"Failed to list Verify Services: {exc}",
                code=getattr(exc, "status", 500),
            ) from exc

        return [self._service_to_dict(s) for s in services]

    def fetch_service(self, service_sid: str) -> dict[str, Any]:
        """Fetch a specific Verify Service by SID.

        REAL API CALL. Hits GET https://verify.twilio.com/v2/Services/{Sid}
        """
        client = self._get_twilio_client()

        try:
            service = client.verify.v2.services(service_sid).fetch()
        except Exception as exc:
            logger.error("Twilio Verify fetch_service failed: %s", exc)
            raise VerifyServiceError(
                f"Failed to fetch Verify Service: {exc}",
                code=getattr(exc, "status", 500),
            ) from exc

        return self._service_to_dict(service)

    def update_service(
        self,
        service_sid: str,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Update an existing Verify Service.

        REAL API CALL. Hits POST https://verify.twilio.com/v2/Services/{Sid}

        Args:
            service_sid: The VA... SID to update.
            **kwargs: Any valid service parameter (friendly_name, code_length, etc.)
        """
        client = self._get_twilio_client()

        try:
            service = client.verify.v2.services(service_sid).update(**kwargs)
        except Exception as exc:
            logger.error("Twilio Verify update_service failed: %s", exc)
            raise VerifyServiceError(
                f"Failed to update Verify Service: {exc}",
                code=getattr(exc, "status", 500),
            ) from exc

        result = self._service_to_dict(service)
        logger.info("Verify Service updated: sid=%s", result.get("sid"))
        return result

    def delete_service(self, service_sid: str) -> bool:
        """Delete a Verify Service.

        REAL API CALL. Hits DELETE https://verify.twilio.com/v2/Services/{Sid}

        Returns:
            True on success.
        """
        client = self._get_twilio_client()

        try:
            client.verify.v2.services(service_sid).delete()
        except Exception as exc:
            logger.error("Twilio Verify delete_service failed: %s", exc)
            raise VerifyServiceError(
                f"Failed to delete Verify Service: {exc}",
                code=getattr(exc, "status", 500),
            ) from exc

        logger.info("Verify Service deleted: sid=%s", service_sid)
        return True

    def auto_provision_service(
        self,
        friendly_name: str = "Loyallia Verify",
    ) -> dict[str, Any]:
        """Auto-provision a Verify Service if none exists.

        1. List existing services.
        2. If a service named `friendly_name` exists, return it.
        3. Otherwise, create one and return it.
        4. Store the SID in Vault for future use.

        Returns:
            The existing or newly created service dict.
        """
        existing = self.list_services(limit=50)
        for svc in existing:
            if svc.get("friendly_name") == friendly_name:
                logger.info("Reusing existing Verify Service: sid=%s", svc.get("sid"))
                return svc

        logger.info("Creating new Verify Service: %s", friendly_name)
        service = self.create_service(friendly_name=friendly_name)

 # Store SID in Vault for automatic discovery
        from common.vault import put_secret

        sid = service.get("sid", "")
        if sid:
            put_secret("twilio_verify_service_sid", sid)
            logger.info("Stored Verify Service SID in Vault: %s", sid)

        return service

 # Helpers


    @staticmethod
    def _service_to_dict(service) -> dict[str, Any]:
        """Serialize a Twilio Service resource to a plain dict."""
        if isinstance(service, dict):
            return service

        result: dict[str, Any] = {}
        for attr in (
            "sid",
            "account_sid",
            "friendly_name",
            "code_length",
            "lookup_enabled",
            "psd2_enabled",
            "skip_sms_to_landlines",
            "dtmf_input_required",
            "tts_name",
            "do_not_share_warning_enabled",
            "custom_code_enabled",
            "push",
            "totp",
            "whatsapp",
            "passkeys",
            "default_template_sid",
            "verify_event_subscription_enabled",
            "date_created",
            "date_updated",
            "url",
        ):
            val = getattr(service, attr, None)
            if val is not None:
                result[attr] = val
        return result
