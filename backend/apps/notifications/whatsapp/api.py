"""
Loyallia WhatsApp Bridge API Routes

Django Ninja router for multi-session WhatsApp management and delivery webhooks.
Endpoints:
    GET  /sessions/                       List sessions (mine / tenant if OWNER)
    POST /sessions/                       Consent + create session
    GET  /sessions/{session_id}/          Session detail
    POST /sessions/{session_id}/disconnect/
    GET  /sessions/{session_id}/qr/       QR code for pairing
    POST /webhook/delivery/               Delivery status from bridge
    POST /webhook/session/                Session state changes from bridge

SEC (multi-session): every session is scoped to a tenant AND to the user who
linked it. The bridge is keyed by session UUID (never tenant id).
"""

import logging
import uuid

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
from common.permissions import is_owner, is_super_admin, jwt_auth
from common.plan_enforcement import require_feature
from common.request import require_tenant
from common.schemas import MessageOut  # noqa: F401 -- re-exported for other modules
from common.vault import get_secret

logger = logging.getLogger(__name__)

router = Router()

# SCHEMAS


class SessionOut(Schema):
    """Session shape consumed by frontend `WhatsAppSession` (api.ts).

    Field names MUST match frontend/src/lib/api.ts WhatsAppSession exactly:
    id, phone_number, label, is_connected, is_active, warmup_day,
    messages_sent_today, messages_remaining_today, daily_limit, consent_at,
    linked_by.
    """

    id: str
    phone_number: str = ""
    label: str = ""
    is_connected: bool
    is_active: bool
    warmup_day: int = 0
    messages_sent_today: int = 0
    messages_remaining_today: int = 0
    daily_limit: int = 0
    consent_at: str | None = None
    linked_by: str | None = None
    created_at: str = ""


class SessionListOut(Schema):
    sessions: list[SessionOut]
    total: int


class SessionCreateIn(Schema):
    label: str = ""
    # Frontend sends `consent`; older API used `consent_accepted`.
    consent: bool = False
    consent_accepted: bool = False

    @property
    def consent_ok(self) -> bool:
        return bool(self.consent or self.consent_accepted)


class SessionCreateOut(Schema):
    id: str
    session_id: str
    qr: str | None = None
    connected: bool = False
    phone_number: str = ""
    label: str = ""


class SessionQROut(Schema):
    qr: str | None
    connected: bool
    phone: str = ""


class DeliveryWebhookIn(Schema):
    session_id: str | None = None
    tenant_id: str | None = None
    message_id: str | None = None
    delivery_log_id: str | None = None
    campaign_run_id: str | None = None
    status: str  # "sent", "delivered", "read", "failed"
    error: str | None = None
    error_message: str | None = None
    timestamp: str | None = None


class SessionWebhookIn(Schema):
    session_id: str | None = None
    tenant_id: str | None = None
    event: str  # "connected", "disconnected"
    phone: str | None = None


# HELPERS


def _serialize_session(session: WhatsAppSession) -> SessionOut:
    linked_by_label = None
    if session.linked_by_id:
        # Prefer email so the UI does not show a raw UUID.
        linked_by_label = getattr(session.linked_by, "email", None) or str(
            session.linked_by_id
        )
    return SessionOut(
        id=str(session.id),
        phone_number=session.phone_number or "",
        label=session.label or "",
        is_connected=session.is_connected,
        is_active=session.is_active,
        warmup_day=session.warmup_day,
        messages_sent_today=session.messages_sent_today,
        messages_remaining_today=session.messages_remaining_today,
        daily_limit=session.effective_daily_limit,
        consent_at=session.consent_at.isoformat() if session.consent_at else None,
        linked_by=linked_by_label,
        created_at=session.created_at.isoformat() if session.created_at else "",
    )


def _plan_max_whatsapp_accounts(tenant) -> int:
    """Plan cap on how many WhatsApp numbers this tenant may link.

    Falls back to 1 for legacy plans / trial plans without an explicit value.
    """
    from apps.billing.models import Subscription

    subscription = Subscription.objects.filter(tenant=tenant).first()
    if not subscription:
        return 1
    limit = subscription.get_limit("whatsapp_accounts")
    return limit if limit > 0 else 1


def _parse_session_uuid(session_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(session_id)
    except (ValueError, TypeError):
        raise HttpError(404, get_message("WHATSAPP_SESSION_NOT_FOUND"))


def _get_managed_session(request, session_id: str) -> WhatsAppSession:
    """Load a session the caller may manage.

    RBAC: the user who linked it manages their own; OWNER manages every
    session of their tenant; SUPER_ADMIN may manage any session.
    SEC: cross-tenant lookups return 404 (no existence leak).
    """
    sid = _parse_session_uuid(session_id)
    session = (
        WhatsAppSession.objects.select_related("tenant", "linked_by")
        .filter(id=sid)
        .first()
    )
    if session is None:
        raise HttpError(404, get_message("WHATSAPP_SESSION_NOT_FOUND"))

    if is_super_admin(request):
        return session

    tenant = require_tenant(request)
    if session.tenant_id != tenant.id:
        raise HttpError(404, get_message("WHATSAPP_SESSION_NOT_FOUND"))

    if is_owner(request):
        return session

    user = getattr(request, "user", None)
    if session.linked_by_id != getattr(user, "id", None):
        raise HttpError(403, get_message("WHATSAPP_SESSION_OWNED_BY_OTHER"))
    return session


def _audit_session(request, event: str, session: WhatsAppSession) -> None:
    try:
        from apps.audit.models import AuditAction, AuditStatus
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.UPDATE,
            resource_type="whatsapp_session",
            resource_id=str(session.id),
            tenant_id=str(session.tenant_id),
            details={"event": event},
            status=AuditStatus.SUCCESS,
        )
    except Exception as audit_exc:
        logger.warning(
            "Failed to audit WhatsApp session event %s: %s", event, audit_exc
        )


# SESSION MANAGEMENT


@router.get("/sessions/", auth=jwt_auth, response=SessionListOut)
@require_feature("whatsapp_campaigns")
def list_sessions(request):
    """List WhatsApp sessions visible to the caller.

    OWNER/SUPER_ADMIN see every session of the tenant; other roles see only
    the sessions they linked themselves.
    """
    tenant = require_tenant(request)
    qs = WhatsAppSession.objects.filter(tenant=tenant)
    if not is_owner(request):
        qs = qs.filter(linked_by_id=getattr(request.user, "id", None))
    sessions = list(qs.order_by("-created_at"))
    return SessionListOut(
        sessions=[_serialize_session(s) for s in sessions],
        total=len(sessions),
    )


@router.post("/sessions/", auth=jwt_auth, response=SessionCreateOut)
@require_feature("whatsapp_campaigns")
def create_session(request, data: SessionCreateIn):
    """Consent + create a new WhatsApp session and request its pairing QR.

    LOPDP/GDPR: consent_at / consent_by are recorded before any QR is issued.
    Plan gate: the tenant may not exceed SubscriptionPlan.max_whatsapp_accounts.
    """
    tenant = require_tenant(request)
    user = request.user

    if not data.consent_ok:
        raise HttpError(400, get_message("WHATSAPP_CONSENT_REQUIRED"))

    max_accounts = _plan_max_whatsapp_accounts(tenant)
    # TOCTOU: count + create inside a transaction with a row lock on the
    # tenant's subscription so two concurrent creates cannot both pass.
    from django.db import transaction

    from apps.billing.models import Subscription

    with transaction.atomic():
        Subscription.objects.select_for_update().filter(tenant=tenant).first()
        current = WhatsAppSession.objects.filter(tenant=tenant).count()
        if current >= max_accounts:
            raise HttpError(
                403,
                get_message("WHATSAPP_SESSION_LIMIT_REACHED", limit=max_accounts),
            )
        session = WhatsAppSession.objects.create(
            tenant=tenant,
            linked_by=user,
            label=(data.label or "")[:50],
            is_active=True,
            consent_at=timezone.now(),
            consent_by=getattr(user, "id", None),
        )

    # Do NOT block the HTTP request on QR generation. Baileys pairing is
    # slow and a huge base64 QR in the create response was pinning browsers.
    # The UI fetches GET /sessions/{id}/qr/ once after create.
    _audit_session(request, "created", session)
    return SessionCreateOut(
        id=str(session.id),
        session_id=str(session.id),
        qr=None,
        connected=False,
        phone_number="",
        label=session.label or "",
    )


@router.get("/sessions/{session_id}/", auth=jwt_auth, response=SessionOut)
@require_feature("whatsapp_campaigns")
def get_session(request, session_id: str):
    """Get one WhatsApp session the caller may manage."""
    session = _get_managed_session(request, session_id)
    return _serialize_session(session)


@router.post(
    "/sessions/{session_id}/disconnect/", auth=jwt_auth, response=MessageOut
)
@require_feature("whatsapp_campaigns")
def disconnect_session(request, session_id: str):
    """Disconnect one WhatsApp session (bridge + local status).

    Still succeeds when the bridge is down or the socket is already gone —
    the DB row is the source of truth for the UI. Full unlink is DELETE.
    """
    session = _get_managed_session(request, session_id)

    bridge_ok = True
    try:
        wa_client.disconnect(str(session.id))
    except Exception as exc:
        bridge_ok = False
        logger.warning(
            "WhatsApp bridge disconnect soft-failed for session %s: %s",
            session.id,
            exc,
        )

    WhatsAppSession.objects.filter(id=session.id).update(
        is_connected=False, phone_number=""
    )
    _audit_session(request, "disconnected", session)
    message = get_message("WHATSAPP_DISCONNECTED")
    if not bridge_ok:
        message = get_message("WHATSAPP_DISCONNECTED_LOCAL")
    return MessageOut(success=True, message=message)


@router.delete(
    "/sessions/{session_id}/", auth=jwt_auth, response=MessageOut
)
@require_feature("whatsapp_campaigns")
def unlink_session(request, session_id: str):
    """Fully unlink a WhatsApp session (bridge cleanup + delete row)."""
    session = _get_managed_session(request, session_id)

    try:
        wa_client.disconnect(str(session.id))
    except Exception as exc:
        logger.warning(
            "WhatsApp unlink bridge cleanup soft-failed for session %s: %s",
            session.id,
            exc,
        )

    WhatsAppSession.objects.filter(id=session.id).delete()
    _audit_session(request, "unlinked", session)
    return MessageOut(success=True, message=get_message("WHATSAPP_UNLINKED"))


@router.get("/sessions/{session_id}/qr/", auth=jwt_auth, response=SessionQROut)
@require_feature("whatsapp_campaigns")
def get_session_qr(request, session_id: str):
    """Generate or retrieve the QR code for pairing one WhatsApp session."""
    session = _get_managed_session(request, session_id)

    try:
        result = wa_client.get_qr(str(session.id), tenant_id=str(session.tenant_id))
    except Exception as exc:
        logger.error(
            "WhatsApp QR request failed for session %s: %s", session.id, exc
        )
        raise HttpError(502, get_message("WHATSAPP_BRIDGE_UNAVAILABLE"))

    session.last_qr_at = timezone.now()
    session.save(update_fields=["last_qr_at", "updated_at"])

    return SessionQROut(
        qr=result.get("qr"),
        connected=bool(result.get("connected", False)),
        phone=result.get("phone", "") or "",
    )


# WEBHOOKS (bridge → Django, API key authenticated)


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
        from django.conf import settings

        if not settings.DEBUG:
            raise HttpError(401, get_message("AUTH_PERMISSION_DENIED"))
        return  # Dev mode no key configured

    auth = request.headers.get("Authorization", "")
    key = auth.replace("Bearer ", "").strip()
    if key != expected_key:
        raise HttpError(401, get_message("AUTH_PERMISSION_DENIED"))


def _resolve_webhook_session(
    session_id: str | None,
    tenant_id: str | None,
    phone: str | None = None,
) -> WhatsAppSession | None:
    """Resolve the WhatsAppSession a bridge webhook refers to.

    Prefers session_id (the bridge's key). Falls back to the legacy
    tenant_id payload only when the tenant has exactly one session.
    """
    if session_id:
        try:
            sid = uuid.UUID(session_id)
        except (ValueError, TypeError):
            logger.warning(
                "SECURITY: Invalid session_id in webhook: %s", session_id
            )
            return None
        return WhatsAppSession.objects.filter(id=sid).first()

    if tenant_id:
        try:
            tid = uuid.UUID(tenant_id)
        except (ValueError, TypeError):
            logger.warning(
                "SECURITY: Invalid tenant_id in webhook: %s", tenant_id
            )
            return None
        qs = WhatsAppSession.objects.filter(tenant_id=tid)
        if phone:
            by_phone = qs.filter(phone_number=phone).first()
            if by_phone:
                return by_phone
        # Legacy single-session bridge payload.
        return qs.first()

    return None


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
            log_qs = CampaignDeliveryLog.objects.select_related("campaign_run")
            if payload.tenant_id:
                log_qs = log_qs.filter(campaign_run__tenant_id=payload.tenant_id)
            log = log_qs.get(id=payload.delivery_log_id)
            now = timezone.now()

            if payload.status == "sent":
                already_sent = log.status == DeliveryStatus.SENT
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
                # Campaign task reserves quota at enqueue. Direct /send and
                # late webhooks must still count toward the daily UI counter.
                if not already_sent and payload.session_id:
                    WhatsAppSession.objects.filter(
                        id=payload.session_id
                    ).update(messages_sent_today=models.F("messages_sent_today") + 1)
                if not already_sent and log.campaign_run_id:
                    CampaignRun.objects.filter(id=log.campaign_run_id).update(
                        sent_count=models.F("sent_count") + 1
                    )

            elif payload.status == "delivered":
                log.status = DeliveryStatus.DELIVERED
                log.delivered_at = now
                log.save(update_fields=["status", "delivered_at"])
                CampaignRun.objects.filter(
                    id=getattr(log, "campaign_run_id", None)
                ).update(delivered_count=models.F("delivered_count") + 1)

            elif payload.status == "read":
                log.status = DeliveryStatus.READ
                log.read_at = now
                log.save(update_fields=["status", "read_at"])
                CampaignRun.objects.filter(
                    id=getattr(log, "campaign_run_id", None)
                ).update(read_count=models.F("read_count") + 1)

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
                CampaignRun.objects.filter(
                    id=getattr(log, "campaign_run_id", None)
                ).update(failed_count=models.F("failed_count") + 1)

        except CampaignDeliveryLog.DoesNotExist:
            logger.warning(
                "Delivery webhook for unknown log ID: %s",
                payload.delivery_log_id,
            )

    # Also try matching by external message_id (for receipts from Baileys)
    elif payload.message_id and payload.campaign_run_id:
        update_fields: dict = {"status": payload.status}
        # Only stamp the matching transition timestamp. Never write None over
        # an existing sent_at when a later event (delivered/read/failed) arrives.
        if payload.status == "sent":
            update_fields["sent_at"] = timezone.now()
        elif payload.status == "delivered":
            update_fields["delivered_at"] = timezone.now()
        elif payload.status == "read":
            update_fields["read_at"] = timezone.now()
        elif payload.status == "failed":
            update_fields["failed_at"] = timezone.now()
        updated = CampaignDeliveryLog.objects.filter(
            campaign_run_id=payload.campaign_run_id,
            external_message_id=payload.message_id,
        ).update(**update_fields)
        if updated and payload.status in ("delivered", "read", "failed"):
            counter_field = f"{payload.status}_count"
            CampaignRun.objects.filter(id=payload.campaign_run_id).update(
                **{counter_field: models.F(counter_field) + 1}
            )

    return {"ok": True}


@router.post("/webhook/session/")
def session_webhook(request, payload: SessionWebhookIn):
    """Receive session state changes from the WhatsApp bridge.

    Called when a session connects or disconnects. Keyed by session_id.
    """
    _verify_bridge_api_key(request)

    session = _resolve_webhook_session(
        payload.session_id, payload.tenant_id, payload.phone
    )
    if session is None:
        logger.warning(
            "Session webhook for unknown session (session_id=%s tenant_id=%s)",
            payload.session_id,
            payload.tenant_id,
        )
        return {"ok": True}

    if payload.event == "connected":
        update_fields = ["is_connected", "updated_at"]
        session.is_connected = True
        if payload.phone:
            session.phone_number = payload.phone
            update_fields.append("phone_number")
        session.save(update_fields=update_fields)
        logger.info(
            "WhatsApp connected for session %s (phone: %s)",
            session.id,
            payload.phone,
        )

    elif payload.event == "disconnected":
        session.is_connected = False
        session.save(update_fields=["is_connected", "updated_at"])
        logger.info("WhatsApp disconnected for session %s", session.id)

    return {"ok": True}
