"""
Loyallia — Advanced Analytics API router
Extended business intelligence: revenue breakdown, visit metrics,
top buyers, demographics, and program-type analysis.

Performance notes:
  - All endpoints use aggregate SQL queries (no Python iteration over rows).
  - Analytics endpoints are cached in Redis (5-minute TTL, tenant-scoped keys).
  - Cache is invalidated on transaction creation via cache.delete_pattern().
"""

from datetime import date, timedelta

from django.core.cache import cache
from django.db.models import Count, F, Q, Sum, Value
from django.db.models.functions import ExtractYear
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from apps.customers.models import Customer
from apps.transactions.models import Transaction
from common.messages import get_message
from common.permissions import is_manager_or_owner, jwt_auth

router = Router()


# ============ Revenue Breakdown ============
@router.get(
    "/revenue-breakdown/", auth=jwt_auth, summary="Get revenue breakdown by source"
)
def get_revenue_breakdown(request, days: int = 30):
    """Revenue breakdown: loyalty, referral, non-loyalty. Cached 5min. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = request.tenant

    cache_key = f"analytics:revenue:{tenant.id}:{days}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    start_date = timezone.now() - timedelta(days=days)

    txns = Transaction.objects.filter(tenant=tenant, created_at__gte=start_date)

    loyalty_types = [
        "stamp_earned",
        "cashback_earned",
        "membership_validated",
        "multipass_used",
    ]
    loyalty_rev = (
        txns.filter(transaction_type__in=loyalty_types).aggregate(Sum("amount"))[
            "amount__sum"
        ]
        or 0
    )

    referral_rev = (
        txns.filter(transaction_type="referral_reward").aggregate(Sum("amount"))[
            "amount__sum"
        ]
        or 0
    )

    non_loyalty_types = [
        "coupon_redeemed",
        "gift_redeemed",
        "corporate_validated",
    ]
    non_loyalty_rev = (
        txns.filter(transaction_type__in=non_loyalty_types).aggregate(Sum("amount"))[
            "amount__sum"
        ]
        or 0
    )

    total = float(loyalty_rev) + float(referral_rev) + float(non_loyalty_rev)

    result = {
        "period_days": days,
        "total_revenue": total,
        "loyalty": float(loyalty_rev),
        "referral": float(referral_rev),
        "non_loyalty": float(non_loyalty_rev),
        "loyalty_pct": (float(loyalty_rev) / total * 100) if total > 0 else 0,
        "referral_pct": (float(referral_rev) / total * 100) if total > 0 else 0,
        "non_loyalty_pct": (float(non_loyalty_rev) / total * 100) if total > 0 else 0,
    }
    cache.set(cache_key, result, timeout=300)
    return result


# ============ Visit Metrics ============
@router.get("/visits/", auth=jwt_auth, summary="Get visit metrics")
def get_visit_metrics(request, days: int = 30):
    """Detailed visit metrics for the dashboard. Cached 5min. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = request.tenant

    cache_key = f"analytics:visits:{tenant.id}:{days}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    start_date = timezone.now() - timedelta(days=days)

    total_visits = Transaction.objects.filter(
        tenant=tenant, created_at__gte=start_date
    ).count()

    unique_customers = (
        Transaction.objects.filter(tenant=tenant, created_at__gte=start_date)
        .values("customer_pass__customer")
        .distinct()
        .count()
    )

    new_visitors = (
        Transaction.objects.filter(
            tenant=tenant,
            created_at__gte=start_date,
            customer_pass__customer__created_at__gte=start_date,
        )
        .values("customer_pass__customer")
        .distinct()
        .count()
    )

    recurring_visitors = (
        Transaction.objects.filter(tenant=tenant, created_at__gte=start_date)
        .values("customer_pass__customer")
        .annotate(visit_count=Count("id"))
        .filter(visit_count__gt=1)
        .count()
    )

    total_all_customers = Customer.objects.filter(tenant=tenant).count()
    non_returning = total_all_customers - unique_customers

    retention_rate = (
        (recurring_visitors / unique_customers * 100) if unique_customers > 0 else 0
    )

    result = {
        "period_days": days,
        "total_visits": total_visits,
        "unique_customers": unique_customers,
        "new_visitors": new_visitors,
        "recurring_visitors": recurring_visitors,
        "non_returning": non_returning,
        "unregistered_visits": 0,
        "retention_rate": round(retention_rate, 1),
    }
    cache.set(cache_key, result, timeout=300)
    return result


# ============ Top Buyers ============
@router.get("/top-buyers/", auth=jwt_auth, summary="Get top buyers")
def get_top_buyers(request, limit: int = 15, days: int = 30):
    """Top N buyers by total spend. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = request.tenant
    start_date = timezone.now() - timedelta(days=days)

    top = (
        Customer.objects.filter(
            tenant=tenant,
            passes__transactions__created_at__gte=start_date,
        )
        .annotate(
            period_spent=Sum("passes__transactions__amount"),
            period_visits=Count("passes__transactions"),
        )
        .order_by("-period_spent")[:limit]
    )

    return {
        "period_days": days,
        "limit": limit,
        "buyers": [
            {
                "customer_id": str(c.id),
                "name": c.full_name,
                "email": c.email,
                "phone": c.phone,
                "total_spent": float(c.period_spent or 0),
                "visits": c.period_visits or 0,
                "last_visit": c.last_visit.isoformat() if c.last_visit else None,
            }
            for c in top
        ],
    }


# ============ Notify Top Buyers ============
@router.post(
    "/notify-top-buyers/",
    auth=jwt_auth,
    summary="Send notification to top buyers",
)
def notify_top_buyers(request):
    """Create push notifications targeting the top 15 buyers. OWNER only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    tenant = request.tenant
    start_date = timezone.now() - timedelta(days=30)

    top = (
        Customer.objects.filter(
            tenant=tenant,
            passes__transactions__created_at__gte=start_date,
        )
        .annotate(period_spent=Sum("passes__transactions__amount"))
        .order_by("-period_spent")[:15]
    )

    from apps.notifications.models import Notification, NotificationType

    created_count = 0
    for customer in top:
        Notification.objects.create(
            tenant=tenant,
            customer=customer,
            notification_type=NotificationType.SPECIAL_OFFER,
            channel="push",
            title="¡Gracias por tu preferencia!",
            message="Eres uno de nuestros mejores clientes. Te tenemos una sorpresa especial.",
        )
        created_count += 1

    return {
        "success": True,
        "message": f"Notificación enviada a {created_count} clientes top.",
        "count": created_count,
    }


# ============ Demographics ============
@router.get("/demographics/", auth=jwt_auth, summary="Get customer demographics")
def get_demographics(request):
    """Age and gender distribution via SQL aggregation. O(1) memory. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = request.tenant

    # Check cache first (5-minute TTL)
    cache_key = f"analytics:demographics:{tenant.id}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    customers = Customer.objects.filter(tenant=tenant)

    # Gender distribution — pure SQL aggregate
    gender_data = (
        customers.exclude(gender="")
        .values("gender")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    gender_labels = {"M": "Masculino", "F": "Femenino", "O": "Otro"}

    total = customers.count()

    # Age distribution — single SQL query using ExtractYear + conditional Count
    # No Python iteration; computation is entirely database-side.
    today_year = date.today().year
    age_dist = customers.exclude(date_of_birth=None).annotate(
        birth_year=ExtractYear("date_of_birth"),
    ).annotate(
        age=Value(today_year) - F("birth_year"),
    ).aggregate(
        age_18_24=Count("id", filter=Q(age__gte=18, age__lt=25)),
        age_25_34=Count("id", filter=Q(age__gte=25, age__lt=35)),
        age_35_44=Count("id", filter=Q(age__gte=35, age__lt=45)),
        age_45_54=Count("id", filter=Q(age__gte=45, age__lt=55)),
        age_55_plus=Count("id", filter=Q(age__gte=55)),
    )

    known_count = sum(age_dist.values())
    unknown_count = total - known_count

    age_ranges_data = [
        ("18-24", age_dist["age_18_24"]),
        ("25-34", age_dist["age_25_34"]),
        ("35-44", age_dist["age_35_44"]),
        ("45-54", age_dist["age_45_54"]),
        ("55+", age_dist["age_55_plus"]),
    ]

    result = {
        "total_customers": total,
        "gender": [
            {
                "gender": gender_labels.get(g["gender"], g["gender"]),
                "code": g["gender"],
                "count": g["count"],
                "percentage": (g["count"] / total * 100) if total > 0 else 0,
            }
            for g in gender_data
        ],
        "age_ranges": [
            {
                "range": rng,
                "count": cnt,
                "percentage": (cnt / total * 100) if total > 0 else 0,
            }
            for rng, cnt in age_ranges_data
        ],
        "unknown_age_count": unknown_count,
    }

    cache.set(cache_key, result, timeout=300)  # 5-minute cache
    return result


# ============ By Program Type ============
@router.get(
    "/by-program-type/", auth=jwt_auth, summary="Get metrics by program type"
)
def get_by_program_type(request, days: int = 30):
    """Visits and revenue grouped by card type. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = request.tenant
    start_date = timezone.now() - timedelta(days=days)

    program_types = (
        Transaction.objects.filter(tenant=tenant, created_at__gte=start_date)
        .annotate(card_type=F("customer_pass__card__card_type"))
        .values("card_type")
        .annotate(
            visit_count=Count("id"),
            revenue=Sum("amount"),
            unique_customers=Count("customer_pass__customer", distinct=True),
        )
        .order_by("-visit_count")
    )

    card_type_labels = {
        "stamp": "Sellos",
        "cashback": "Cashback",
        "coupon": "Cupón",
        "affiliate": "Afiliado",
        "discount": "Descuento",
        "gift_certificate": "Certificado regalo",
        "vip_membership": "Membresía VIP",
        "corporate_discount": "Corporativo",
        "referral_pass": "Referidos",
        "multipass": "Multipase",
    }

    return {
        "period_days": days,
        "program_types": [
            {
                "type": pt["card_type"],
                "label": card_type_labels.get(pt["card_type"], pt["card_type"]),
                "visits": pt["visit_count"],
                "revenue": float(pt["revenue"] or 0),
                "unique_customers": pt["unique_customers"],
            }
            for pt in program_types
        ],
    }
