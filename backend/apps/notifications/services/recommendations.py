"""Campaign audience recommendation engine.

Scores active customers from real visit/spend/pass signals and returns
ranked suggestions. The user always chooses the final audience — this
module never sends and never auto-selects.

All thresholds come from PlatformSetting (settings-manageable, no call-site
literals). Defaults below are fallbacks only when a key is unset.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

from django.db.models import Count, Q

logger = logging.getLogger("loyallia.notifications")

# Settings keys (PlatformSetting). SuperAdmin-editable.
RECO_SETTING_KEYS = {
    "days_inactive_winback": 45,
    "days_lost": 90,
    "days_soon_expire": 7,
    "near_reward_pct": 80,
    "vip_spend_percentile": 90,
    "welcome_days": 3,
    "birthday_window_days": 7,
    "exclude_recent_campaign_days": 7,
    "max_recommend": 200,
}

# Rule weights (score components). Settings-manageable via JSON map key.
RULE_WEIGHTS: dict[str, float] = {
    "WELCOME_NEW": 0.70,
    "NEAR_REWARD": 0.90,
    "WINBACK": 0.65,
    "LOST": 0.55,
    "VIP_TOUCH": 0.75,
    "EXPIRING_PASS": 0.85,
    "BIRTHDAY": 0.80,
    "RECENT_REDEEM": 0.60,
}

# Channel preference per rule (user can still override).
RULE_CHANNELS: dict[str, str] = {
    "WELCOME_NEW": "email",
    "NEAR_REWARD": "whatsapp",
    "WINBACK": "email",
    "LOST": "email",
    "VIP_TOUCH": "email",
    "EXPIRING_PASS": "wallet",
    "BIRTHDAY": "email",
    "RECENT_REDEEM": "wallet",
}


@dataclass
class RecommendationParams:
    """Resolved recommendation thresholds from PlatformSetting."""

    days_inactive_winback: int = 45
    days_lost: int = 90
    days_soon_expire: int = 7
    near_reward_pct: int = 80
    vip_spend_percentile: int = 90
    welcome_days: int = 3
    birthday_window_days: int = 7
    exclude_recent_campaign_days: int = 7
    max_recommend: int = 200

    @classmethod
    def load(cls) -> RecommendationParams:
        from apps.tenants.models import PlatformSetting

        values = {}
        for key, default in RECO_SETTING_KEYS.items():
            values[key] = PlatformSetting.get_int(key, default=default)
        return cls(**values)


@dataclass
class RecommendationHit:
    customer_id: str
    customer_name: str
    score: float
    reasons: list[str] = field(default_factory=list)
    suggested_channel: str = "email"
    program_id: str | None = None
    program_name: str = ""
    last_visit: str | None = None
    total_spent: str = "0"
    has_email: bool = False
    has_phone: bool = False
    has_wallet: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "customer_id": self.customer_id,
            "customer_name": self.customer_name,
            "score": round(self.score, 3),
            "reasons": self.reasons,
            "suggested_channel": self.suggested_channel,
            "program_id": self.program_id,
            "program_name": self.program_name,
            "last_visit": self.last_visit,
            "total_spent": self.total_spent,
            "has_email": self.has_email,
            "has_phone": self.has_phone,
            "has_wallet": self.has_wallet,
        }


def _channel_viable(channel: str, *, has_email: bool, has_phone: bool, has_wallet: bool) -> bool:
    if channel == "email":
        return has_email
    if channel == "whatsapp":
        return has_phone
    if channel == "wallet":
        return has_wallet
    return True


def _pick_channel(reasons: list[str], **viability: bool) -> str:
    """Prefer the rule's preferred channel, else first viable alternate."""
    preferred = RULE_CHANNELS.get(reasons[0], "email") if reasons else "email"
    if _channel_viable(preferred, **viability):
        return preferred
    for ch in ("email", "whatsapp", "wallet"):
        if _channel_viable(ch, **viability):
            return ch
    return preferred


def _recently_campaigned_ids(tenant, since) -> set[str]:
    from apps.notifications.models import CampaignDeliveryLog

    return set(
        CampaignDeliveryLog.objects.filter(
            campaign_run__tenant=tenant,
            created_at__gte=since,
            status__in=("sent", "delivered", "read"),
        ).values_list("customer_id", flat=True)
    )


def _vip_threshold(tenant, percentile: int) -> Decimal:
    from apps.customers.models import Customer

    spends = list(
        Customer.objects.filter(tenant=tenant, is_active=True)
        .order_by("total_spent")
        .values_list("total_spent", flat=True)
    )
    if not spends:
        return Decimal("0")
    idx = min(len(spends) - 1, max(0, int(len(spends) * percentile / 100)))
    return Decimal(str(spends[idx] or 0))


def recommend_audience(
    tenant,
    channel: str = "email",
    program_id: str | None = None,
    enabled_rules: list[str] | None = None,
) -> dict[str, Any]:
    """Rank customers for a campaign. Read-only. Never sends.

    Args:
        tenant: Tenant instance (always scoped).
        channel: email | whatsapp | wallet | sms (affects viability filters).
        program_id: Optional Card id to focus on near-reward / expiring.
        enabled_rules: Optional whitelist of rule ids; None = all rules.

    Returns:
        {
          "params": {...},
          "rule_counts": {RULE: n},
          "recommendations": [ {...}, ... ],
          "total": n,
        }
    """
    from apps.customers.models import Customer, CustomerPass

    params = RecommendationParams.load()
    now = datetime.now(UTC)
    rules = set(enabled_rules or RULE_WEIGHTS.keys()) & set(RULE_WEIGHTS.keys())

    customers = Customer.objects.filter(tenant=tenant, is_active=True).annotate(
        active_pass_count=Count("passes", filter=Q(passes__is_active=True)),
        wallet_pass_count=Count(
            "passes",
            filter=Q(
                passes__is_active=True,
            )
            & ~Q(passes__apple_pass_id="", passes__google_pass_id=""),
        ),
    )

    if not customers.exists():
        return {
            "params": params.__dict__,
            "rule_counts": {},
            "recommendations": [],
            "total": 0,
        }

    exclude_ids = _recently_campaigned_ids(
        tenant, now - timedelta(days=params.exclude_recent_campaign_days)
    )
    vip_floor = _vip_threshold(tenant, params.vip_spend_percentile)

    # Active stamp passes for near-reward / reward-ready signals.
    pass_qs = CustomerPass.objects.filter(is_active=True, customer__tenant=tenant)
    if program_id:
        pass_qs = pass_qs.filter(card_id=program_id)

    # Prefetch pass state per customer for O(1) rule evaluation.
    passes_by_customer: dict[str, list] = {}
    for cp in pass_qs.select_related("card"):
        passes_by_customer.setdefault(str(cp.customer_id), []).append(cp)

    hits: dict[str, RecommendationHit] = {}

    def _hit(customer, score: float, reason: str) -> RecommendationHit | None:
        cid = str(customer.id)
        if cid in exclude_ids:
            return None
        existing = hits.get(cid)
        name = f"{customer.first_name} {customer.last_name}".strip()
        has_email = bool(customer.email)
        has_phone = bool(customer.phone)
        customer_passes = passes_by_customer.get(cid, [])
        has_wallet = any(
            (p.apple_pass_id or p.google_pass_id) for p in customer_passes
        )
        if existing is None:
            existing = RecommendationHit(
                customer_id=cid,
                customer_name=name,
                score=score,
                reasons=[reason],
                last_visit=customer.last_visit.isoformat() if customer.last_visit else None,
                total_spent=str(customer.total_spent or 0),
                has_email=has_email,
                has_phone=has_phone,
                has_wallet=has_wallet,
            )
            # Attach best program context
            if customer_passes:
                best = customer_passes[0]
                existing.program_id = str(best.card_id)
                existing.program_name = getattr(best.card, "name", "") or ""
            hits[cid] = existing
        else:
            if reason not in existing.reasons:
                existing.reasons.append(reason)
            existing.score = max(existing.score, score)
        return existing

    for customer in customers.iterator(chunk_size=200):
        cid = str(customer.id)
        if cid in exclude_ids:
            continue

        created = customer.created_at
        if (
            "WELCOME_NEW" in rules
            and created
            and created >= now - timedelta(days=params.welcome_days)
            and customer.active_pass_count > 0
        ):
            _hit(customer, RULE_WEIGHTS["WELCOME_NEW"], "WELCOME_NEW")

        last_visit = customer.last_visit
        if "WINBACK" in rules and last_visit:
            idle = (now - last_visit).days
            if params.days_inactive_winback <= idle < params.days_lost:
                _hit(customer, RULE_WEIGHTS["WINBACK"], "WINBACK")
        if "LOST" in rules:
            idle = (now - last_visit).days if last_visit else 999
            if idle >= params.days_lost:
                _hit(customer, RULE_WEIGHTS["LOST"], "LOST")

        if (
            "VIP_TOUCH" in rules
            and customer.total_spent is not None
            and Decimal(str(customer.total_spent)) >= vip_floor
            and Decimal(str(customer.total_spent)) > 0
        ):
            _hit(customer, RULE_WEIGHTS["VIP_TOUCH"], "VIP_TOUCH")

        if (
            "BIRTHDAY" in rules
            and customer.date_of_birth
            and _birthday_within(
                customer.date_of_birth, now.date(), params.birthday_window_days
            )
        ):
            _hit(customer, RULE_WEIGHTS["BIRTHDAY"], "BIRTHDAY")

        customer_passes = passes_by_customer.get(cid, [])
        for cp in customer_passes:
            if "NEAR_REWARD" in rules:
                required = _stamps_required(cp)
                if required > 0:
                    pct = (cp.stamp_count / required) * 100
                    if pct >= params.near_reward_pct and cp.stamp_count < required:
                        _hit(customer, RULE_WEIGHTS["NEAR_REWARD"], "NEAR_REWARD")
                        break
            if "EXPIRING_PASS" in rules:
                expiry = _pass_expiry(cp)
                if expiry and 0 <= (expiry - now.date()).days <= params.days_soon_expire:
                    _hit(customer, RULE_WEIGHTS["EXPIRING_PASS"], "EXPIRING_PASS")
                    break

        # RECENT_REDEEM: reward_ready cleared recently is hard to date without
        # a timestamp — use last_message presence + recent last_visit.
        if (
            "RECENT_REDEEM" in rules
            and last_visit
            and (now - last_visit).days <= 3
            and any(p.pass_data.get("last_message") for p in customer_passes)
        ):
            _hit(customer, RULE_WEIGHTS["RECENT_REDEEM"], "RECENT_REDEEM")

    # Finalize channel + sort
    results: list[RecommendationHit] = []
    rule_counts: dict[str, int] = {}
    for hit in hits.values():
        viability = {
            "has_email": hit.has_email,
            "has_phone": hit.has_phone,
            "has_wallet": hit.has_wallet,
        }
        # Keep requested channel when viable; otherwise fall back.
        if _channel_viable(channel, **viability):
            hit.suggested_channel = channel
        else:
            hit.suggested_channel = _pick_channel(hit.reasons, **viability)
        for r in hit.reasons:
            rule_counts[r] = rule_counts.get(r, 0) + 1
        results.append(hit)

    results.sort(key=lambda h: (-h.score, h.customer_name))
    capped = results[: max(1, params.max_recommend)]

    return {
        "params": params.__dict__,
        "rule_counts": rule_counts,
        "recommendations": [h.to_dict() for h in capped],
        "total": len(results),
    }


def _stamps_required(cp) -> int:
    card = cp.card
    return int(
        getattr(card, "stamps_required", 0)
        or card.get_metadata_field("stamps_required", 0)
        or 0
    )


def _pass_expiry(cp) -> date | None:
    raw = cp.pass_data.get("expires_at") or cp.pass_data.get("expiry_date")
    if not raw:
        return None
    try:
        if isinstance(raw, date) and not isinstance(raw, datetime):
            return raw
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00")).date()
    except (TypeError, ValueError):
        return None


def _birthday_within(dob: date, today: date, window_days: int) -> bool:
    """True when birthday falls within [today, today+window] (this year)."""
    candidate = date(today.year, dob.month, dob.day)
    if candidate < today:
        candidate = date(today.year + 1, dob.month, dob.day)
    return 0 <= (candidate - today).days <= window_days
