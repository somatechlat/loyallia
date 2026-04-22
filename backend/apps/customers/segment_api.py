"""
Loyallia — Customer Segment API
Handles: built-in segmentation, segment listing, segment members, CSV export.
Split from customers/api.py per the 500-line architectural limit.
"""

import logging
from datetime import timedelta

from django.db.models import Q
from ninja import Router
from ninja.errors import HttpError

from apps.customers.models import Customer
from apps.customers.schemas import CustomerOut
from common.messages import get_message
from common.permissions import jwt_auth

logger = logging.getLogger(__name__)
router = Router()


# =============================================================================
# BUILT-IN SEGMENTS
# =============================================================================

_BUILTIN_SEGMENTS = {
    "all": {
        "name": "Todos los clientes",
        "description": "Todos los clientes activos",
        "filter": {"is_active": True},
    },
    "active": {
        "name": "Clientes activos",
        "description": "Clientes con al menos una visita en los ultimos 30 dias",
        "filter": {"is_active": True, "last_visit__isnull": False},
        "extra": "last_30d",
    },
    "at_risk": {
        "name": "En riesgo",
        "description": "Clientes sin visitas en 30-60 dias",
        "filter": {"is_active": True},
        "extra": "at_risk",
    },
    "lost": {
        "name": "Clientes perdidos",
        "description": "Clientes sin visitas en mas de 60 dias",
        "filter": {"is_active": True},
        "extra": "lost",
    },
    "vip": {
        "name": "Clientes VIP",
        "description": "Top 10% de clientes por gasto total",
        "filter": {"is_active": True},
        "extra": "vip",
    },
}


def _apply_segment_filter(queryset, segment_id: str):
    """Apply segment filter to a Customer queryset."""
    from django.utils import timezone

    seg = _BUILTIN_SEGMENTS.get(segment_id)
    if not seg:
        return queryset.none()

    base = queryset.filter(**seg["filter"])
    extra = seg.get("extra")

    if extra == "last_30d":
        return base.filter(last_visit__gte=timezone.now() - timedelta(days=30))
    elif extra == "at_risk":
        now = timezone.now()
        return base.filter(
            last_visit__gte=now - timedelta(days=60),
            last_visit__lt=now - timedelta(days=30),
        )
    elif extra == "lost":
        cutoff = timezone.now() - timedelta(days=60)
        return base.filter(
            Q(last_visit__lt=cutoff) | Q(last_visit__isnull=True, created_at__lt=cutoff)
        )
    elif extra == "vip":
        count = base.count()
        if count == 0:
            return base.none()
        threshold_index = max(0, int(count * 0.9))
        sorted_spends = list(
            base.order_by("total_spent").values_list("total_spent", flat=True)
        )
        threshold = (
            sorted_spends[threshold_index]
            if threshold_index < len(sorted_spends)
            else sorted_spends[-1]
        )
        return base.filter(total_spent__gte=threshold)
    return base


@router.get("/segments/", auth=jwt_auth, summary="Listar segmentos de clientes")
def list_segments(request):
    """List all available customer segments with their current member count."""
    results = []
    base_queryset = Customer.objects.filter(tenant=request.tenant)
    for seg_id, seg_def in _BUILTIN_SEGMENTS.items():
        count = _apply_segment_filter(base_queryset, seg_id).count()
        results.append(
            {
                "id": seg_id,
                "name": seg_def["name"],
                "description": seg_def["description"],
                "member_count": count,
                "type": "builtin",
            }
        )
    return {"segments": results}


@router.post("/segments/", auth=jwt_auth, summary="Crear segmento personalizado")
def create_segment(request):
    """Phase 9: Custom segments require a Segment model (not yet implemented)."""
    return {
        "message": get_message("SERVER_ERROR"),
        "available_segments": list(_BUILTIN_SEGMENTS.keys()),
        "note": "Custom segment persistence requires Phase 9 model. Use built-in segment IDs.",
    }


@router.get(
    "/segments/{segment_id}/members/", auth=jwt_auth, summary="Miembros del segmento"
)
def segment_members(request, segment_id: str, limit: int = 50, offset: int = 0):
    """Returns members of a segment with pagination."""
    if segment_id not in _BUILTIN_SEGMENTS:
        raise HttpError(404, get_message("NOT_FOUND"))
    base_queryset = Customer.objects.filter(tenant=request.tenant)
    members = _apply_segment_filter(base_queryset, segment_id).order_by(
        "-last_visit", "-created_at"
    )
    total = members.count()
    return {
        "segment_id": segment_id,
        "segment_name": _BUILTIN_SEGMENTS[segment_id]["name"],
        "total": total,
        "members": [
            CustomerOut.from_model(c) for c in members[offset : offset + limit]
        ],
    }


@router.get(
    "/segments/{segment_id}/export/", auth=jwt_auth, summary="Exportar segmento a CSV"
)
def export_segment(request, segment_id: str):
    """CSV export of segment members."""
    from django.http import StreamingHttpResponse

    if segment_id not in _BUILTIN_SEGMENTS:
        raise HttpError(404, get_message("NOT_FOUND"))
    base_queryset = Customer.objects.filter(tenant=request.tenant)
    members = _apply_segment_filter(base_queryset, segment_id).order_by("-created_at")

    def generate_rows():
        yield "id,first_name,last_name,email,phone,total_visits,total_spent,last_visit,created_at\n"
        for customer in members.iterator(chunk_size=500):
            yield (
                f"{customer.id},{customer.first_name},{customer.last_name},"
                f"{customer.email},{customer.phone},{customer.total_visits},"
                f"{customer.total_spent},"
                f"{customer.last_visit.isoformat() if customer.last_visit else ''},"
                f"{customer.created_at.isoformat()}\n"
            )

    seg_name = _BUILTIN_SEGMENTS[segment_id]["name"].replace(" ", "_").lower()
    response = StreamingHttpResponse(generate_rows(), content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="segment_{seg_name}.csv"'
    return response
