"""
Loyallia — Advanced Analytics API router
Extended business intelligence: revenue breakdown, visit metrics,
top buyers, demographics, and program-type analysis.
"""

from datetime import date, timedelta

from django.db.models import Count, F, Sum
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
    """Revenue breakdown: loyalty, referral, non-loyalty. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = request.tenant
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

    return {
        "period_days": days,
        "total_revenue": total,
        "loyalty": float(loyalty_rev),
        "referral": float(referral_rev),
        "non_loyalty": float(non_loyalty_rev),
        "loyalty_pct": (float(loyalty_rev) / total * 100) if total > 0 else 0,
        "referral_pct": (float(referral_rev) / total * 100) if total > 0 else 0,
        "non_loyalty_pct": (float(non_loyalty_rev) / total * 100) if total > 0 else 0,
    }


# ============ Visit Metrics ============
@router.get("/visits/", auth=jwt_auth, summary="Get visit metrics")
def get_visit_metrics(request, days: int = 30):
    """Detailed visit metrics for the dashboard. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = request.tenant
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

    return {
        "period_days": days,
        "total_visits": total_visits,
        "unique_customers": unique_customers,
        "new_visitors": new_visitors,
        "recurring_visitors": recurring_visitors,
        "non_returning": non_returning,
        "unregistered_visits": 0,
        "retention_rate": round(retention_rate, 1),
    }


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
    """Age and gender distribution. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = request.tenant
    customers = Customer.objects.filter(tenant=tenant)

    gender_data = (
        customers.exclude(gender="")
        .values("gender")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    gender_labels = {"M": "Masculino", "F": "Femenino", "O": "Otro"}

    total = customers.count()

    today = date.today()
    age_ranges = {
        "18-24": 0,
        "25-34": 0,
        "35-44": 0,
        "45-54": 0,
        "55+": 0,
        "unknown": 0,
    }
    for c in customers.only("date_of_birth"):
        if c.date_of_birth:
            age = (
                today.year
                - c.date_of_birth.year
                - (
                    (today.month, today.day)
                    < (c.date_of_birth.month, c.date_of_birth.day)
                )
            )
            if age < 25:
                age_ranges["18-24"] += 1
            elif age < 35:
                age_ranges["25-34"] += 1
            elif age < 45:
                age_ranges["35-44"] += 1
            elif age < 55:
                age_ranges["45-54"] += 1
            else:
                age_ranges["55+"] += 1
        else:
            age_ranges["unknown"] += 1

    return {
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
            for rng, cnt in age_ranges.items()
            if rng != "unknown"
        ],
        "unknown_age_count": age_ranges["unknown"],
    }


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
