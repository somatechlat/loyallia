"""
Loyallia Agent API Endpoints (REQ-AGENT-002)
Read-only endpoints for external AI agents using Django Ninja.
All data is aggregated or anonymized  no PII exposed.
Read endpoints are plan-gated (``agent_api`` feature) via AgentAPIKeyAuth;
key management endpoints require JWT + OWNER (or SUPER_ADMIN).

Endpoints:
    GET    /agent/context/            → tenant context, plan, usage
    GET    /agent/customers/summary/  → aggregated customer data (no PII)
    GET    /agent/programs/           → programs with stats
    GET    /agent/analytics/overview/ → revenue, retention metrics
    GET    /agent/transactions/recent/ → last 50 anonymized transactions
    GET    /agent/keys/               → list keys (prefix only)
    POST   /agent/keys/               → create key (raw value returned once)
    DELETE /agent/keys/{id}/          → revoke key
"""

import logging
import uuid
from typing import cast

from django.db.models import Count
from django.http import HttpRequest
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from apps.agent_api.auth import agent_api_auth
from apps.agent_api.models import AgentAPICallLog, AgentAPIKey
from apps.agent_api.schemas import (
    AgentKeyCreateIn,
    AgentKeyCreateOut,
    AgentKeyOut,
    AnalyticsOverviewSchema,
    CapabilitiesSchema,
    ContextResponseSchema,
    CustomersSummarySchema,
    PlanContextSchema,
    ProgramSchema,
    ProgramsResponseSchema,
    TenantContextSchema,
    TransactionSchema,
    TransactionsResponseSchema,
)
from apps.audit.models import AuditAction
from apps.audit.service import log_action
from common.messages import get_message
from common.permissions import is_owner, jwt_auth
from common.plan_enforcement import check_feature_access
from common.request import require_tenant
from common.schemas import MessageOut

logger = logging.getLogger("loyallia.agent_api")

router = Router()


@router.get(
    "/context/",
    auth=agent_api_auth,
    response=ContextResponseSchema,
    summary="Contexto del negocio",
)
def get_context(request: HttpRequest):
    """Returns tenant context for the AI agent."""
    from apps.billing.models import Subscription

    tenant = require_tenant(request)
    subscription = Subscription.objects.filter(tenant=tenant).first()
    plan = subscription.subscription_plan if subscription else None

    return ContextResponseSchema(
        tenant=TenantContextSchema(
            id=str(tenant.id),
            name=tenant.name,
            slug=tenant.slug,
            industry=tenant.industry,
            country=tenant.country,
        ),
        plan=PlanContextSchema(
            name=plan.name if plan else "Trial",
            slug=plan.slug if plan else "trial",
            features=plan.features if plan else [],
            is_active=subscription.is_access_allowed if subscription else False,
        ),
        capabilities=CapabilitiesSchema(),
    )


@router.get(
    "/customers/summary/",
    auth=agent_api_auth,
    response=CustomersSummarySchema,
    summary="Resumen de clientes (agregado)",
)
def get_customers_summary(request: HttpRequest):
    """Aggregated customer summary  no PII exposed."""
    from apps.customers.models import Customer

    tenant = require_tenant(request)
    total = Customer.objects.filter(tenant=tenant).count()
    active = Customer.objects.filter(tenant=tenant, is_active=True).count()

    vip_count = (
        Customer.objects.filter(tenant=tenant)
        .annotate(txn_count=Count("passes__transactions"))
        .filter(txn_count__gte=10)
        .count()
    )

    return CustomersSummarySchema(
        total_customers=total,
        active_customers=active,
        inactive_customers=total - active,
        vip_customers=vip_count,
    )


@router.get(
    "/programs/",
    auth=agent_api_auth,
    response=ProgramsResponseSchema,
    summary="Programas de fidelización",
)
def get_programs(request: HttpRequest):
    """Returns all programs with enrollment and transaction stats."""
    from django.db.models import Count, Q

    from apps.cards.models import Card

    tenant = require_tenant(request)
    cards = (
        Card.objects.filter(tenant=tenant)
        .prefetch_related("enrollments", "passes", "passes__transactions")
        .annotate(
            enrollments_count=Count("enrollments", distinct=True),
            active_passes_count=Count(
                "passes", filter=Q(passes__is_active=True), distinct=True
            ),
            total_txn_count=Count("passes__transactions", distinct=True),
        )
    )

    programs = [
        ProgramSchema(
            id=str(card.id),
            name=card.name,
            card_type=card.card_type,
            is_active=card.is_active,
            enrollments=cast(int, getattr(card, "enrollments_count", 0)),
            active_passes=cast(int, getattr(card, "active_passes_count", 0)),
            total_transactions=cast(int, getattr(card, "total_txn_count", 0)),
            created_at=card.created_at.isoformat(),
        )
        for card in cards
    ]

    return ProgramsResponseSchema(total_programs=len(programs), programs=programs)


@router.get(
    "/analytics/overview/",
    auth=agent_api_auth,
    response=AnalyticsOverviewSchema,
    summary="Analíticas generales",
)
def get_analytics_overview(request: HttpRequest):
    """Revenue, retention, and engagement metrics for the tenant."""
    from apps.customers.models import Customer
    from apps.transactions.models import Transaction

    tenant = require_tenant(request)
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_customers = Customer.objects.filter(tenant=tenant).count()
    monthly_txns = Transaction.objects.filter(
        tenant=tenant, created_at__gte=month_start
    ).count()

    returning = (
        Customer.objects.filter(tenant=tenant)
        .annotate(txn_count=Count("passes__transactions"))
        .filter(txn_count__gt=1)
        .count()
    )
    retention_rate = (
        round(returning / total_customers * 100, 1) if total_customers > 0 else 0.0
    )

    return AnalyticsOverviewSchema(
        total_customers=total_customers,
        monthly_transactions=monthly_txns,
        returning_customers=returning,
        retention_rate_pct=retention_rate,
        month=month_start.strftime("%Y-%m"),
    )


@router.get(
    "/transactions/recent/",
    auth=agent_api_auth,
    response=TransactionsResponseSchema,
    summary="Transacciones recientes (anonimizadas)",
)
def get_recent_transactions(request: HttpRequest):
    """Last 50 transactions  anonymized (no customer PII)."""
    from apps.transactions.models import Transaction

    tenant = require_tenant(request)
    txns = (
        Transaction.objects.filter(tenant=tenant)
        .select_related("customer_pass__card")
        .order_by("-created_at")[:50]
    )

    log_action(
        request=request,
        action="READ",
        resource_type="agent_api_transactions",
        details={"count": txns.count()},
    )

    items = [
        TransactionSchema(
            id=str(txn.id),
            type=txn.transaction_type,
            program=(
                txn.customer_pass.card.name
                if txn.customer_pass and txn.customer_pass.card
                else None
            ),
            metadata=txn.transaction_data or {},
            created_at=txn.created_at.isoformat(),
        )
        for txn in txns
    ]

    return TransactionsResponseSchema(count=len(items), transactions=items)


# ──────────────────────────────────────────────────────────────
# AGENT API KEY MANAGEMENT (JWT + OWNER/SUPER_ADMIN, plan-gated)
# ──────────────────────────────────────────────────────────────


def _key_out(key: AgentAPIKey, calls_today: int = 0) -> AgentKeyOut:
    """Build key metadata (prefix only — raw keys exist only at creation)."""
    return AgentKeyOut(
        id=str(key.id),
        name=key.name,
        key_prefix=key.key_prefix,
        is_active=key.is_active,
        last_used_at=key.last_used_at,
        expires_at=key.expires_at,
        created_at=key.created_at,
        calls_today=calls_today,
    )


@router.get(
    "/keys/",
    auth=jwt_auth,
    response=list[AgentKeyOut],
    summary="Claves API de agente",
)
def list_agent_keys(request: HttpRequest):
    """List this tenant's agent API keys. OWNER+ or SUPER_ADMIN.

    SEC: returns metadata and the stored 8-char prefix only; keys are kept as
    SHA-256 hashes and the raw value is never re-exposed.
    """
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = require_tenant(request)

    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    calls_today = {
        row["api_key_id"]: row["n"]
        for row in AgentAPICallLog.objects.filter(
            tenant=tenant, created_at__gte=today_start
        )
        .values("api_key_id")
        .annotate(n=Count("id"))
    }
    keys = AgentAPIKey.objects.filter(tenant=tenant).order_by("-created_at")
    return [_key_out(key, calls_today.get(key.id, 0)) for key in keys]


@router.post(
    "/keys/",
    auth=jwt_auth,
    response=AgentKeyCreateOut,
    summary="Crear clave API de agente",
)
def create_agent_key(request: HttpRequest, payload: AgentKeyCreateIn):
    """Create an agent API key for this tenant.

    OWNER+ or SUPER_ADMIN, and the plan must include the ``agent_api``
    feature (Starter/Professional are refused at the feature gate).
    The raw key is returned exactly once in this response.
    """
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = require_tenant(request)
    check_feature_access(tenant, "agent_api")

    name = payload.name.strip()
    if not name:
        raise HttpError(
            400,
            get_message("VALIDATION_ERROR", detail="name must not be empty"),
        )

    if payload.expires_at is not None:
        # USE_TZ=True: comparing a naive datetime would raise TypeError (500).
        # Reject explicitly instead of guessing the sender's timezone.
        if timezone.is_naive(payload.expires_at):
            raise HttpError(
                400,
                get_message(
                    "VALIDATION_ERROR",
                    detail="expires_at must include a timezone offset",
                ),
            )
        if payload.expires_at <= timezone.now():
            raise HttpError(
                400,
                get_message("VALIDATION_ERROR", detail="expires_at must be in the future"),
            )

    raw_key, key_hash = AgentAPIKey.generate_key()
    key = AgentAPIKey.objects.create(
        tenant=tenant,
        name=name,
        key_hash=key_hash,
        key_prefix=raw_key[:8],
        expires_at=payload.expires_at,
        created_by_id=request.user.id,
    )
    # SEC: audit carries prefix + name only — never the raw key.
    log_action(
        request=request,
        action=AuditAction.CREATE,
        resource_type="agent_api_key",
        resource_id=str(key.id),
        details={"name": key.name, "key_prefix": key.key_prefix},
    )
    logger.info(
        "Agent API key created: tenant=%s key_prefix=%s",
        tenant.slug,
        key.key_prefix,
    )
    return AgentKeyCreateOut(**_key_out(key).model_dump(), raw_key=raw_key)


@router.delete(
    "/keys/{key_id}/",
    auth=jwt_auth,
    response=MessageOut,
    summary="Revocar clave API de agente",
)
def revoke_agent_key(request: HttpRequest, key_id: str):
    """Revoke (deactivate) an agent API key. OWNER+ or SUPER_ADMIN.

    Revocation takes effect immediately: authentication rejects inactive keys
    with 401 on the next request.
    """
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = require_tenant(request)

    try:
        parsed_id = uuid.UUID(key_id)
    except ValueError as exc:
        raise HttpError(404, get_message("NOT_FOUND")) from exc

    key = AgentAPIKey.objects.filter(id=parsed_id, tenant=tenant).first()
    if key is None:
        raise HttpError(404, get_message("NOT_FOUND"))

    key.is_active = False
    key.save(update_fields=["is_active", "updated_at"])
    log_action(
        request=request,
        action=AuditAction.DELETE,
        resource_type="agent_api_key",
        resource_id=str(key.id),
        details={"name": key.name, "key_prefix": key.key_prefix},
    )
    logger.info(
        "Agent API key revoked: tenant=%s key_prefix=%s",
        tenant.slug,
        key.key_prefix,
    )
    return MessageOut(
        success=True,
        message=get_message("AGENT_API_KEY_REVOKED", name=key.name),
    )
