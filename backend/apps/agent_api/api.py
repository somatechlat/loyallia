"""
Loyallia — Agent API Endpoints (REQ-AGENT-002)
Read-only endpoints for external AI agents using Django Ninja.
All data is aggregated or anonymized — no PII exposed.
Enterprise plan only — gated by AgentAPIKeyAuth.

Endpoints:
    GET /agent/context/            → tenant context, plan, usage
    GET /agent/customers/summary/  → aggregated customer data (no PII)
    GET /agent/programs/           → programs with stats
    GET /agent/analytics/overview/ → revenue, retention metrics
    GET /agent/transactions/recent/ → last 50 anonymized transactions
"""

import logging

from django.db.models import Count
from django.http import HttpRequest
from django.utils import timezone
from ninja import Router

from apps.agent_api.auth import agent_api_auth
from apps.agent_api.schemas import (
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

    tenant = request.tenant
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
    """Aggregated customer summary — no PII exposed."""
    from apps.customers.models import Customer

    tenant = request.tenant
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
    from apps.cards.models import Card
    from django.db.models import Count, Q

    tenant = request.tenant
    cards = Card.objects.filter(tenant=tenant).annotate(
        enrollments_count=Count("enrollments", distinct=True),
        active_passes_count=Count("passes", filter=Q(passes__is_active=True), distinct=True),
        total_txn_count=Count("passes__transactions", distinct=True),
    )

    programs = [
        ProgramSchema(
            id=str(card.id),
            name=card.name,
            card_type=card.card_type,
            is_active=card.is_active,
            enrollments=card.enrollments_count,
            active_passes=card.active_passes_count,
            total_transactions=card.total_txn_count,
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

    tenant = request.tenant
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
    """Last 50 transactions — anonymized (no customer PII)."""
    from apps.transactions.models import Transaction

    tenant = request.tenant
    txns = (
        Transaction.objects.filter(tenant=tenant)
        .select_related("customer_pass__card")
        .order_by("-created_at")[:50]
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
            metadata=txn.metadata or {},
            created_at=txn.created_at.isoformat(),
        )
        for txn in txns
    ]

    return TransactionsResponseSchema(count=len(items), transactions=items)
