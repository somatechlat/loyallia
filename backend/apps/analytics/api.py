"""
Loyallia — Analytics API router
Business intelligence and reporting endpoints.
"""
from datetime import timedelta

from django.db.models import Avg, Count, Sum
from django.utils import timezone
from ninja import Router
from pydantic import BaseModel

from apps.analytics.models import CustomerAnalytics, DailyAnalytics, ProgramAnalytics
from apps.cards.models import Card
from apps.customers.models import Customer
from apps.transactions.models import Transaction
from common.messages import get_message
from common.permissions import is_manager_or_owner, jwt_auth

router = Router()


# ============ Pydantic Schemas ============
class AnalyticsDateRange(BaseModel):
    start_date: str  # ISO format
    end_date: str    # ISO format


class CustomerAnalyticsSchema(BaseModel):
    customer_id: str
    customer_name: str
    total_visits: int
    total_spent: float
    average_transaction: float
    total_rewards_earned: int
    total_rewards_redeemed: int
    segment: str
    last_visit: str | None


class ProgramAnalyticsSchema(BaseModel):
    program_id: str
    program_name: str
    total_enrollments: int
    active_members: int
    total_transactions: int
    total_revenue: float
    average_order_value: float
    total_rewards_issued: int
    total_rewards_redeemed: int
    redemption_rate: float
    engagement_rate: float
    repeat_purchase_rate: float


# ============ Dashboard Overview ============
@router.get("/overview/", auth=jwt_auth, summary="Get business overview analytics")
def get_overview_analytics(request, days: int = 30):
    """Get key business metrics for dashboard overview. MANAGER+ only."""
    if not is_manager_or_owner(request):
        from ninja.errors import HttpError
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = request.tenant
    start_date = timezone.now() - timedelta(days=days)

    # Customer metrics
    total_customers = Customer.objects.filter(tenant=tenant).count()
    new_customers = Customer.objects.filter(
        tenant=tenant,
        created_at__gte=start_date
    ).count()

    # Transaction metrics
    transactions = Transaction.objects.filter(
        tenant=tenant,
        created_at__gte=start_date
    )
    total_transactions = transactions.count()
    total_revenue = transactions.aggregate(Sum("amount"))["amount__sum"] or 0

    # Program metrics
    total_programs = Card.objects.filter(tenant=tenant).count()
    active_programs = Card.objects.filter(
        tenant=tenant,
        passes__is_active=True
    ).distinct().count()

    # Notification metrics
    from apps.notifications.models import Notification
    notifications_sent = Notification.objects.filter(
        tenant=tenant,
        created_at__gte=start_date
    ).count()

    return {
        "period_days": days,
        "customers": {
            "total": total_customers,
            "new": new_customers,
            "growth_rate": (new_customers / total_customers * 100) if total_customers > 0 else 0,
        },
        "transactions": {
            "total": total_transactions,
            "revenue": float(total_revenue),
            "average_value": float(total_revenue / total_transactions) if total_transactions > 0 else 0,
        },
        "programs": {
            "total": total_programs,
            "active": active_programs,
        },
        "notifications": {
            "sent": notifications_sent,
        },
    }


# ============ Customer Analytics ============
@router.get("/customers/", auth=jwt_auth, summary="Get customer analytics")
def get_customer_analytics(
    request,
    segment: str | None = None,
    limit: int = 50,
    offset: int = 0
):
    """Get detailed customer analytics. MANAGER+ only."""
    if not is_manager_or_owner(request):
        from ninja.errors import HttpError
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = request.tenant

    # Update analytics for all customers (in production, this would be a background task)
    customers = Customer.objects.filter(tenant=tenant)
    for customer in customers:
        analytics, created = CustomerAnalytics.objects.get_or_create(
            customer=customer,
            defaults={"tenant": tenant}
        )
        analytics.update_metrics()

    # Query with filters
    query = CustomerAnalytics.objects.filter(tenant=tenant)

    if segment:
        query = query.filter(segment=segment)

    total = query.count()
    analytics = query[offset:offset + limit]

    return {
        "total": total,
        "count": len(analytics),
        "customers": [
            {
                "customer_id": str(a.customer.id),
                "customer_name": a.customer.full_name,
                "total_visits": a.total_visits,
                "total_spent": float(a.total_spent),
                "average_transaction": float(a.average_transaction),
                "total_rewards_earned": a.total_rewards_earned,
                "total_rewards_redeemed": a.total_rewards_redeemed,
                "segment": a.segment,
                "last_visit": a.customer.last_visit.isoformat() if a.customer.last_visit else None,
            }
            for a in analytics
        ]
    }


@router.get("/customers/{customer_id}/", auth=jwt_auth, summary="Get individual customer analytics")
def get_customer_detail_analytics(request, customer_id: str):
    """Get detailed analytics for a specific customer. MANAGER+ only."""
    if not is_manager_or_owner(request):
        from ninja.errors import HttpError
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    from django.shortcuts import get_object_or_404
    customer = get_object_or_404(Customer, id=customer_id, tenant=request.tenant)

    analytics, created = CustomerAnalytics.objects.get_or_create(
        customer=customer,
        defaults={"tenant": request.tenant}
    )
    analytics.update_metrics()

    # Get recent transactions
    recent_transactions = Transaction.objects.filter(
        customer_pass__customer=customer
    ).order_by("-created_at")[:10]

    # Get program enrollments
    enrollments = customer.passes.filter(is_active=True)

    return {
        "customer": {
            "id": str(customer.id),
            "name": customer.full_name,
            "email": customer.email,
            "phone": customer.phone,
            "created_at": customer.created_at.isoformat(),
        },
        "analytics": {
            "total_visits": analytics.total_visits,
            "total_spent": float(analytics.total_spent),
            "average_transaction": float(analytics.average_transaction),
            "total_rewards_earned": analytics.total_rewards_earned,
            "total_rewards_redeemed": analytics.total_rewards_redeemed,
            "segment": analytics.segment,
            "last_visit": customer.last_visit.isoformat() if customer.last_visit else None,
        },
        "recent_transactions": [
            {
                "id": str(t.id),
                "amount": float(t.amount) if t.amount else 0,
                "transaction_type": t.transaction_type,
                "created_at": t.created_at.isoformat(),
                "program": t.customer_pass.card.name,
            }
            for t in recent_transactions
        ],
        "enrollments": [
            {
                "program_id": str(p.card.id),
                "program_name": p.card.name,
                "enrolled_at": p.enrolled_at.isoformat(),
                "qr_code": p.qr_code,
            }
            for p in enrollments
        ]
    }


# ============ Program Analytics ============
@router.get("/programs/", auth=jwt_auth, summary="Get program analytics")
def get_program_analytics(request, limit: int = 50, offset: int = 0):
    """Get detailed program analytics. MANAGER+ only."""
    if not is_manager_or_owner(request):
        from ninja.errors import HttpError
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = request.tenant

    # Update analytics for all programs
    programs = Card.objects.filter(tenant=tenant)
    for program in programs:
        analytics, created = ProgramAnalytics.objects.get_or_create(
            card=program,
            defaults={"tenant": tenant}
        )
        analytics.update_metrics()

    # Query
    query = ProgramAnalytics.objects.filter(tenant=tenant)
    total = query.count()
    analytics = query[offset:offset + limit]

    return {
        "total": total,
        "count": len(analytics),
        "programs": [
            {
                "program_id": str(a.card.id),
                "program_name": a.card.name,
                "card_type": a.card.card_type,
                "total_enrollments": a.total_enrollments,
                "active_members": a.active_members,
                "total_transactions": a.total_transactions,
                "total_revenue": float(a.total_revenue),
                "average_order_value": float(a.average_order_value),
                "total_rewards_issued": a.total_rewards_issued,
                "total_rewards_redeemed": a.total_rewards_redeemed,
                "redemption_rate": float(a.redemption_rate),
                "engagement_rate": float(a.engagement_rate),
                "repeat_purchase_rate": float(a.repeat_purchase_rate),
            }
            for a in analytics
        ]
    }


@router.get("/programs/{program_id}/", auth=jwt_auth, summary="Get program detail analytics")
def get_program_detail_analytics(request, program_id: str):
    """Get detailed analytics for a specific program. MANAGER+ only."""
    if not is_manager_or_owner(request):
        from ninja.errors import HttpError
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    from django.shortcuts import get_object_or_404
    card = get_object_or_404(Card, id=program_id, tenant=request.tenant)

    analytics, created = ProgramAnalytics.objects.get_or_create(
        card=card,
        defaults={"tenant": request.tenant}
    )
    analytics.update_metrics()

    # Get top customers for this program
    top_customers = Customer.objects.filter(
        passes__card=card
    ).annotate(
        total_spent=Sum("passes__transactions__amount")
    ).order_by("-total_spent")[:10]

    return {
        "program": {
            "id": str(card.id),
            "name": card.name,
            "type": card.card_type,
            "description": card.description,
            "created_at": card.created_at.isoformat(),
        },
        "analytics": {
            "total_enrollments": analytics.total_enrollments,
            "active_members": analytics.active_members,
            "total_transactions": analytics.total_transactions,
            "total_revenue": float(analytics.total_revenue),
            "average_order_value": float(analytics.average_order_value),
            "total_rewards_issued": analytics.total_rewards_issued,
            "total_rewards_redeemed": analytics.total_rewards_redeemed,
            "redemption_rate": float(analytics.redemption_rate),
            "engagement_rate": float(analytics.engagement_rate),
            "repeat_purchase_rate": float(analytics.repeat_purchase_rate),
        },
        "top_customers": [
            {
                "customer_id": str(c.id),
                "name": c.full_name,
                "total_spent": float(c.total_spent or 0),
                "visits": c.total_visits,
            }
            for c in top_customers
        ]
    }


# ============ Time Series Analytics ============
@router.get("/trends/", auth=jwt_auth, summary="Get time series analytics")
def get_trends_analytics(request, days: int = 30):
    """Get daily analytics trends. MANAGER+ only."""
    if not is_manager_or_owner(request):
        from ninja.errors import HttpError
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = request.tenant
    start_date = timezone.now().date() - timedelta(days=days)

    # Get daily analytics
    daily_data = DailyAnalytics.objects.filter(
        tenant=tenant,
        analytics_date__gte=start_date
    ).order_by("analytics_date")

    # If no data, generate from transactions
    if not daily_data.exists():
        # This would be done by a background task in production
        pass

    return {
        "period_days": days,
        "daily_data": [
            {
                "date": d.analytics_date.isoformat(),
                "new_customers": d.new_customers,
                "transactions": d.transactions,
                "revenue": float(d.daily_revenue),
                "rewards_issued": d.rewards_issued,
                "rewards_redeemed": d.rewards_redeemed,
                "notifications_sent": d.notifications_sent,
            }
            for d in daily_data
        ]
    }


# ============ Segmentation Analytics ============
@router.get("/segments/", auth=jwt_auth, summary="Get customer segmentation analytics")
def get_segmentation_analytics(request):
    """Get customer segmentation breakdown. MANAGER+ only."""
    if not is_manager_or_owner(request):
        from ninja.errors import HttpError
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = request.tenant

    # Update all customer analytics
    customers = Customer.objects.filter(tenant=tenant)
    for customer in customers:
        analytics, created = CustomerAnalytics.objects.get_or_create(
            customer=customer,
            defaults={"tenant": tenant}
        )
        analytics.update_metrics()

    # Group by segment
    segments = CustomerAnalytics.objects.filter(
        tenant=tenant
    ).values("segment").annotate(
        count=Count("id"),
        sum_spent=Sum("total_spent"),
        avg_spent=Avg("total_spent"),
        sum_visits=Sum("total_visits"),
        avg_visits=Avg("total_visits")
    )

    return {
        "total_customers": customers.count(),
        "segments": [
            {
                "segment": s["segment"],
                "count": s["count"],
                "percentage": (s["count"] / customers.count() * 100) if customers.count() > 0 else 0,
                "total_spent": float(s["sum_spent"] or 0),
                "avg_spent": float(s["avg_spent"] or 0),
                "total_visits": s["sum_visits"],
                "avg_visits": float(s["avg_visits"] or 0),
            }
            for s in segments
        ]
    }
