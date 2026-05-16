"""
Loyallia — WhatsApp Bridge API Routes (LYL-SRS-006)

Django Ninja router for WhatsApp session management and delivery webhooks.
Endpoints:
    GET  /qr/{tenant_id}/         — QR code for pairing
    GET  /status/{tenant_id}/     — Connection status
    POST /disconnect/{tenant_id}/ — Disconnect session
    POST /webhook/delivery/       — Delivery status from bridge
    POST /webhook/session/        — Session state changes from bridge
"""

import logging

from django.db import models
from django.utils import timezone
from ninja import Router, Schema
from ninja.errors import HttpError

from apps.notifications.models import (
    CampaignDeliveryLog,
    CampaignRun,
    DeliveryStatus,
    WhatsAppSession,
)
from apps.notifications.whatsapp import client as wa_client
from common.messages import get_message
from common.permissions import jwt_auth
from common.plan_enforcement import require_feature
from common.vault import get_secret

logger = logging.getLogger(__name__)

router = Router()


# =============================================================================
# SCHEMAS
# =============================================================================


class QROut(Schema):
    qr: str | None
    connected: bool
    phone: str = ""


class StatusOut(Schema):
    connected: bool
    qr: str | None = None
    phone: str = ""
    messages_sent_today: int = 0
    daily_limit: int = 200
    messages_remaining: int = 200


class MessageOut(Schema):
    success: bool
    message: str = ""


class DeliveryWebhookIn(Schema):
    tenant_id: str
    message_id: str | None = None
    delivery_log_id: str | None = None
    campaign_run_id: str | None = None
    status: str  # "sent", "delivered", "read", "failed"
    error: str | None = None
    error_message: str | None = None
    timestamp: str | None = None


class SessionWebhookIn(Schema):
    tenant_id: str
    event: str  # "connected", "disconnected"
    phone: str | None = None


# =============================================================================
# SESSION MANAGEMENT (authenticated — owner only)
# =============================================================================


def _require_tenant(request):
    """Get the tenant from the authenticated user. OWNER only.

    SEC: WhatsApp session management is restricted to OWNER role.
    MANAGER and STAFF must not be able to pair/disconnect sessions.
    """
    from common.permissions import is_owner

    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    user = request.user
    if not hasattr(user, "tenant") or not user.tenant:
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    return user.tenant


@router.get("/qr/{tenant_id}/", auth=jwt_auth, response=QROut)
@require_feature("whatsapp_campaigns")
def get_qr_code(request, tenant_id: str):
    """Generate or retrieve QR code for WhatsApp pairing.

    The business owner scans this QR with their WhatsApp app to link
    their number to the Loyallia bridge.
    """
    tenant = _require_tenant(request)
    if str(tenant.id) != tenant_id:
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    try:
        result = wa_client.get_qr(tenant_id)

        # Update session record
        session, _ = WhatsAppSession.objects.get_or_create(tenant=tenant)
        session.last_qr_at = timezone.now()
        session.save(update_fields=["last_qr_at", "updated_at"])

        return QROut(
            qr=result.get("qr"),
            connected=result.get("connected", False),
            phone=result.get("phone", ""),
        )
    except Exception as exc:
        logger.error("WhatsApp QR request failed for %s: %s", tenant_id, exc)
        raise HttpError(502, get_message("WHATSAPP_BRIDGE_UNAVAILABLE"))


@router.get("/status/{tenant_id}/", auth=jwt_auth, response=StatusOut)
@require_feature("whatsapp_campaigns")
def get_session_status(request, tenant_id: str):
    """Get current WhatsApp connection status for the tenant."""
    tenant = _require_tenant(request)
    if str(tenant.id) != tenant_id:
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    try:
        result = wa_client.get_status(tenant_id)
    except Exception:
        result = {"connected": False, "qr": None, "phone": ""}

    # Merge with local session data
    try:
        session = WhatsAppSession.objects.get(tenant=tenant)
        return StatusOut(
            connected=result.get("connected", False),
            qr=result.get("qr"),
            phone=result.get("phone", session.phone_number),
            messages_sent_today=session.messages_sent_today,
            daily_limit=session.effective_daily_limit,
            messages_remaining=session.messages_remaining_today,
        )
    except WhatsAppSession.DoesNotExist:
        return StatusOut(
            connected=result.get("connected", False),
            qr=result.get("qr"),
            phone=result.get("phone", ""),
        )


@router.post("/disconnect/{tenant_id}/", auth=jwt_auth, response=MessageOut)
@require_feature("whatsapp_campaigns")
def disconnect_session(request, tenant_id: str):
    """Disconnect the tenant's WhatsApp session."""
    tenant = _require_tenant(request)
    if str(tenant.id) != tenant_id:
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    try:
        wa_client.disconnect(tenant_id)

        # Update local session
        WhatsAppSession.objects.filter(tenant=tenant).update(
            is_connected=False, phone_number=""
        )

        logger.info("WhatsApp disconnected for tenant %s", tenant_id)
        return MessageOut(success=True, message="WhatsApp desconectado")
    except Exception as exc:
        logger.error("WhatsApp disconnect failed for %s: %s", tenant_id, exc)
        raise HttpError(502, get_message("WHATSAPP_BRIDGE_UNAVAILABLE"))


# =============================================================================
# WEBHOOKS (bridge → Django, API key authenticated)
# =============================================================================


def _verify_bridge_api_key(request) -> None:
    """Verify the bridge API key from the request header.

    SEC: Webhooks are called by the bridge service, not by users.
    Authentication via shared API key instead of JWT.
    """
    expected_key = get_secret(
        "whatsapp_bridge_api_key",
        default="",
    )
    if not expected_key:
        return  # Dev mode — no key configured

    auth = request.headers.get("Authorization", "")
    key = auth.replace("Bearer ", "").strip()
    if key != expected_key:
        raise HttpError(401, "Unauthorized")


@router.post("/webhook/delivery/")
def delivery_webhook(request, payload: DeliveryWebhookIn):
    """Receive delivery status updates from the WhatsApp bridge.

    Updates CampaignDeliveryLog and increments CampaignRun counters.
    Called after each message is sent, delivered, read, or failed.
    """
    _verify_bridge_api_key(request)

    # Update specific delivery log if ID provided
    if payload.delivery_log_id:
        try:
            log = CampaignDeliveryLog.objects.get(id=payload.delivery_log_id)
            now = timezone.now()

            if payload.status == "sent":
                log.status = DeliveryStatus.SENT
                log.sent_at = now
                log.external_message_id = payload.message_id or ""
                log.save(
                    update_fields=[
                        "status",
                        "sent_at",
                        "external_message_id",
                    ]
                )
                # Increment campaign run counter
                CampaignRun.objects.filter(id=log.campaign_run_id).update(
                    sent_count=models.F("sent_count") + 1
                )

            elif payload.status == "delivered":
                log.status = DeliveryStatus.DELIVERED
                log.delivered_at = now
                log.save(update_fields=["status", "delivered_at"])
                CampaignRun.objects.filter(id=log.campaign_run_id).update(
                    delivered_count=models.F("delivered_count") + 1
                )

            elif payload.status == "read":
                log.status = DeliveryStatus.READ
                log.read_at = now
                log.save(update_fields=["status", "read_at"])
                CampaignRun.objects.filter(id=log.campaign_run_id).update(
                    read_count=models.F("read_count") + 1
                )

            elif payload.status == "failed":
                log.status = DeliveryStatus.FAILED
                log.failed_at = now
                log.error_code = payload.error or ""
                log.error_message = payload.error_message or ""
                log.save(
                    update_fields=[
                        "status",
                        "failed_at",
                        "error_code",
                        "error_message",
                    ]
                )
                CampaignRun.objects.filter(id=log.campaign_run_id).update(
                    failed_count=models.F("failed_count") + 1
                )

        except CampaignDeliveryLog.DoesNotExist:
            logger.warning(
                "Delivery webhook for unknown log ID: %s",
                payload.delivery_log_id,
            )

    # Also try matching by external message_id (for receipts from Baileys)
    elif payload.message_id and payload.campaign_run_id:
        updated = CampaignDeliveryLog.objects.filter(
            campaign_run_id=payload.campaign_run_id,
            external_message_id=payload.message_id,
        ).update(
            status=payload.status,
            **{
                f"{payload.status}_at": (
                    timezone.now()
                    if payload.status in ("delivered", "read", "failed")
                    else None
                )
            },
        )
        if updated and payload.status in ("delivered", "read", "failed"):
            counter_field = f"{payload.status}_count"
            CampaignRun.objects.filter(id=payload.campaign_run_id).update(
                **{counter_field: models.F(counter_field) + 1}
            )

    return {"ok": True}


@router.post("/webhook/session/")
def session_webhook(request, payload: SessionWebhookIn):
    """Receive session state changes from the WhatsApp bridge.

    Called when a session connects or disconnects.
    """
    _verify_bridge_api_key(request)

    try:
        from apps.tenants.models import Tenant

        tenant = Tenant.objects.get(id=payload.tenant_id)
        session, _ = WhatsAppSession.objects.get_or_create(tenant=tenant)

        if payload.event == "connected":
            session.is_connected = True
            session.phone_number = payload.phone or ""
            session.save(update_fields=["is_connected", "phone_number", "updated_at"])
            logger.info(
                "WhatsApp connected for tenant %s (phone: %s)",
                payload.tenant_id,
                payload.phone,
            )

        elif payload.event == "disconnected":
            session.is_connected = False
            session.save(update_fields=["is_connected", "updated_at"])
            logger.info("WhatsApp disconnected for tenant %s", payload.tenant_id)

    except Tenant.DoesNotExist:
        logger.warning("Session webhook for unknown tenant: %s", payload.tenant_id)

    return {"ok": True}
