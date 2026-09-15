"""
RFM Analysis Module — Customer Segmentation

Scores customers on Recency (days since last transaction),
Frequency (number of transactions), and Monetary (total spent).
Assigns segments: Champions, Loyal, At Risk, Sleeping, etc.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.db.models import Count, Max, Sum
from django.utils import timezone

from apps.customers.models import Customer


@dataclass(frozen=True)
class RFMScore:
    recency_score: int  # 1-5 (5 = most recent)
    frequency_score: int  # 1-5 (5 = most frequent)
    monetary_score: int  # 1-5 (5 = highest spend)
    segment: str

    @property
    def total(self) -> int:
        return self.recency_score + self.frequency_score + self.monetary_score


SEGMENTS = {
    "champions": {"label": "Campeones", "color": "#10B981", "description": "Clientes leales de alto valor que compran frecuentemente"},
    "loyal": {"label": "Leales", "color": "#3B82F6", "description": "Clientes fieles que compran regularmente"},
    "potential_loyalists": {"label": "Potenciales Leales", "color": "#6366F1", "description": "Clientes recientes con potencial de fidelización"},
    "new_customers": {"label": "Nuevos Clientes", "color": "#8B5CF6", "description": "Clientes recientes con pocas compras"},
    "at_risk": {"label": "En Riesgo", "color": "#F59E0B", "description": "Clientes que compraban antes pero llevan tiempo sin volver"},
    "cant_lose": {"label": "No Perder", "color": "#EF4444", "description": "Clientes de alto valor que llevan tiempo sin volver"},
    "sleeping": {"label": "Dormidos", "color": "#6B7280", "description": "Clientes que no han comprado en mucho tiempo"},
    "lost": {"label": "Perdidos", "color": "#374151", "description": "Clientes que no han comprado en mucho tiempo y gastaban poco"},
}


def _score_1_5(value: float, thresholds: list[float]) -> int:
    """Score a value 1-5 based on thresholds. Higher value = higher score."""
    for i, threshold in enumerate(thresholds):
        if value <= threshold:
            return i + 1
    return 5


def calculate_rfm_scores(tenant_id: str, lookback_days: int = 365) -> list[dict]:
    """Calculate RFM scores for all active customers of a tenant.

    Returns list of dicts with customer_id, r/f/m scores, segment, and raw values.
    """
    now = timezone.now()

    # Get customer transaction aggregates
    customers = (
        Customer.objects.filter(tenant_id=tenant_id, is_active=True)
        .annotate(
            last_transaction=Max("passes__transactions__created_at"),
            transaction_count=Count("passes__transactions__id"),
            total_spent=Sum("passes__transactions__amount"),
        )
        .filter(transaction_count__gt=0)
    )

    if not customers.exists():
        return []

    # Collect raw values for percentile calculation
    all_recency = []
    all_frequency = []
    all_monetary = []

    customer_data = []
    for c in customers:
        last = c.last_transaction or c.created_at
        recency_days = (now - last).days
        freq = c.transaction_count or 0
        monetary = float(c.total_spent or 0)

        all_recency.append(recency_days)
        all_frequency.append(freq)
        all_monetary.append(monetary)
        customer_data.append({
            "customer_id": str(c.id),
            "customer_name": c.full_name or c.email or "",
            "recency_days": recency_days,
            "frequency": freq,
            "monetary": monetary,
        })

    # Calculate percentile thresholds (lower recency = better)
    def percentiles(values: list[float]) -> list[float]:
        s = sorted(values)
        n = len(s)
        return [s[int(n * p)] for p in [0.2, 0.4, 0.6, 0.8]]

    recency_thresholds = percentiles(all_recency)
    # For recency, LOWER is better, so we reverse the scoring
    frequency_thresholds = percentiles(all_frequency)
    monetary_thresholds = percentiles(all_monetary)

    results = []
    for data in customer_data:
        # Recency: lower days = higher score
        r_score = 6 - _score_1_5(data["recency_days"], recency_thresholds)
        f_score = _score_1_5(data["frequency"], frequency_thresholds)
        m_score = _score_1_5(data["monetary"], monetary_thresholds)

        segment = _classify_segment(r_score, f_score, m_score)

        results.append({
            **data,
            "recency_score": r_score,
            "frequency_score": f_score,
            "monetary_score": m_score,
            "total_score": r_score + f_score + m_score,
            "segment": segment,
            "segment_label": SEGMENTS[segment]["label"],
            "segment_color": SEGMENTS[segment]["color"],
        })

    return results


def _classify_segment(r: int, f: int, m: int) -> str:
    """Classify customer into RFM segment based on scores."""
    if r >= 4 and f >= 4 and m >= 4:
        return "champions"
    if r >= 3 and f >= 3 and m >= 3:
        return "loyal"
    if r >= 4 and f <= 2:
        return "potential_loyalists"
    if r >= 4 and f <= 1:
        return "new_customers"
    if r <= 2 and f >= 3 and m >= 3:
        return "cant_lose"
    if r <= 2 and f >= 2:
        return "at_risk"
    if r <= 2 and f <= 2 and m >= 2:
        return "sleeping"
    return "lost"


def get_segment_summary(scores: list[dict]) -> dict:
    """Aggregate RFM scores into segment summary counts."""
    summary = {}
    for seg_key, seg_info in SEGMENTS.items():
        count = sum(1 for s in scores if s["segment"] == seg_key)
        if count > 0:
            summary[seg_key] = {
                "label": seg_info["label"],
                "color": seg_info["color"],
                "description": seg_info["description"],
                "count": count,
                "percentage": round(count / len(scores) * 100, 1) if scores else 0,
            }
    return summary
