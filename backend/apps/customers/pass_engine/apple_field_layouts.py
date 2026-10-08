"""
Loyallia Apple Wallet Field Layouts (apps/customers/pass_engine/apple_field_layouts.py)

Per-card-type Apple PassKit field layout builders. Every layout exposes a
visible ``last_message`` field (populated from ``pass_data.last_message``) and
Apple ``changeMessage`` entries on mutable fields so a redemption always
produces a non-silent pass.json diff.
"""

from common.messages import get_message


def _last_message(customer_pass) -> str:
    """Visible message written by the redemption engine on each mutation."""
    pass_data = customer_pass.pass_data or {}
    return str(pass_data.get("last_message", "") or "")


def _stamp_goal(card, metadata: dict) -> int:
    """Stamps needed for the reward, from the same source redemption uses.

    Redemption (``StampEarnStrategy``) and ``Card.validate_stamp_config`` both
    read ``stamps_required`` (default 10). The wallet display used to read
    ``total_stamps`` (default 6), so the progress bar and the actual reward
    threshold disagreed and the pass never looked current. Legacy cards that
    only ever set ``total_stamps`` still resolve through the fallback.
    """
    goal = card.stamps_required or metadata.get("stamps_required")
    if not goal:
        goal = metadata.get("total_stamps")
    try:
        parsed = int(goal)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        parsed = 0
    return parsed if parsed > 0 else 10


def _cashback_percentage(card, metadata: dict):
    """Cashback rate shown on the pass, from the source redemption uses.

    ``CashbackEarnStrategy`` reads ``cashback_percentage`` (default 0). The
    wallet display used to default to 10, so a card could advertise a rate
    that was never credited. Both now agree on the configured value or 0.
    """
    pct = card.cashback_percentage or metadata.get("cashback_percentage", 0)
    if pct in (None, ""):
        return 0
    try:
        from decimal import Decimal

        return Decimal(str(pct))
    except Exception:
        return 0


def _build_stamp_fields(card, customer_pass) -> dict:
    metadata = card.metadata or {}
    total = _stamp_goal(card, metadata)
    current = customer_pass.stamp_count_val
    reward = metadata.get("reward_description", get_message("WALLET_REWARD_DEFAULT"))
    stamps_display = "\u2588" * current + "\u2591" * max(total - current, 0)
    customer_name = (
        f"{customer_pass.customer.first_name} {customer_pass.customer.last_name}"
    )
    return {
        "headerFields": [
            {
                "key": "stamps",
                "label": get_message("WALLET_LABEL_STAMPS"),
                "value": f"{current}/{total}",
                "changeMessage": get_message("WALLET_CHANGE_NEW_STAMP"),
            }
        ],
        "primaryFields": [
            {
                "key": "reward",
                "label": get_message("WALLET_LABEL_REWARD"),
                "value": reward,
            }
        ],
        "secondaryFields": [
            {
                "key": "progress",
                "label": get_message("WALLET_LABEL_PROGRESS"),
                "value": stamps_display,
            }
        ],
        "auxiliaryFields": [
            {
                "key": "last_message",
                "label": get_message("WALLET_LABEL_MESSAGE"),
                "value": _last_message(customer_pass),
                "changeMessage": get_message("WALLET_CHANGE_NEW_MESSAGE"),
            }
        ],
        "backFields": [
            {
                "key": "name",
                "label": get_message("WALLET_LABEL_CUSTOMER"),
                "value": customer_name,
            },
            {
                "key": "program",
                "label": get_message("WALLET_LABEL_PROGRAM"),
                "value": card.name,
            },
            {
                "key": "desc",
                "label": get_message("WALLET_LABEL_DESCRIPTION"),
                "value": card.description or "",
                "changeMessage": get_message("WALLET_TERMS_UPDATED"),
            },
        ],
    }


def _build_cashback_fields(card, customer_pass) -> dict:
    metadata = card.metadata or {}
    balance = str(customer_pass.cashback_balance_val)
    pct = _cashback_percentage(card, metadata)
    customer_name = (
        f"{customer_pass.customer.first_name} {customer_pass.customer.last_name}"
    )
    return {
        "headerFields": [
            {
                "key": "balance",
                "label": get_message("WALLET_LABEL_CREDIT"),
                "value": f"${balance}",
                "currencyCode": metadata.get("currency", "USD"),
                "changeMessage": get_message("WALLET_CHANGE_BALANCE_UPDATED"),
            }
        ],
        "primaryFields": [
            {
                "key": "program",
                "label": get_message("WALLET_LABEL_PROGRAM"),
                "value": card.name,
            }
        ],
        "secondaryFields": [
            {
                "key": "rate",
                "label": get_message("WALLET_LABEL_CASHBACK_RATE"),
                "value": f"{pct}%",
            },
            {
                "key": "customer",
                "label": get_message("WALLET_LABEL_CLIENT"),
                "value": customer_name,
            },
        ],
        "auxiliaryFields": [
            {
                "key": "last_message",
                "label": get_message("WALLET_LABEL_MESSAGE"),
                "value": _last_message(customer_pass),
                "changeMessage": get_message("WALLET_CHANGE_NEW_MESSAGE"),
            }
        ],
        "backFields": [
            {
                "key": "desc",
                "label": get_message("WALLET_LABEL_DESCRIPTION"),
                "value": card.description or "",
                "changeMessage": get_message("WALLET_DETAILS_UPDATED"),
            }
        ],
    }


def _build_vip_fields(card, customer_pass) -> dict:
    pass_data = customer_pass.pass_data or {}
    metadata = card.metadata or {}
    tier = pass_data.get("membership_tier", "VIP")
    customer_name = (
        f"{customer_pass.customer.first_name} {customer_pass.customer.last_name}"
    )
    return {
        "headerFields": [
            {
                "key": "tier",
                "label": get_message("WALLET_LABEL_MEMBERSHIP"),
                "value": tier.upper(),
                "changeMessage": get_message("WALLET_MEMBERSHIP_UPDATED"),
            }
        ],
        "primaryFields": [
            {
                "key": "name",
                "label": get_message("WALLET_LABEL_MEMBER"),
                "value": customer_name,
            }
        ],
        "secondaryFields": [
            {
                "key": "program",
                "label": get_message("WALLET_LABEL_CLUB"),
                "value": card.name,
            }
        ],
        "auxiliaryFields": [
            {
                "key": "last_message",
                "label": get_message("WALLET_LABEL_MESSAGE"),
                "value": _last_message(customer_pass),
                "changeMessage": get_message("WALLET_CHANGE_NEW_MESSAGE"),
            }
        ],
        "backFields": [
            {
                "key": "perks",
                "label": get_message("WALLET_LABEL_BENEFITS"),
                "value": ", ".join(metadata.get("perks", [])),
                "changeMessage": get_message("WALLET_BENEFITS_UPDATED"),
            }
        ],
    }


def _build_coupon_fields(card, customer_pass) -> dict:
    pass_data = customer_pass.pass_data or {}
    metadata = card.metadata or {}
    customer_name = (
        f"{customer_pass.customer.first_name} {customer_pass.customer.last_name}"
    )
    return {
        "headerFields": [
            {
                "key": "offer",
                "label": get_message("WALLET_LABEL_OFFER"),
                "value": card.name,
                "changeMessage": get_message("WALLET_CHANGE_NEW_OFFER"),
            }
        ],
        "primaryFields": [
            {
                "key": "discount",
                "label": get_message("WALLET_LABEL_DISCOUNT"),
                "value": card.description or get_message("WALLET_DISCOUNT_SPECIAL"),
            }
        ],
        "secondaryFields": [
            {
                "key": "customer",
                "label": get_message("WALLET_LABEL_CLIENT"),
                "value": customer_name,
            }
        ],
        "auxiliaryFields": [
            {
                "key": "last_message",
                "label": get_message("WALLET_LABEL_MESSAGE"),
                "value": _last_message(customer_pass),
                "changeMessage": get_message("WALLET_CHANGE_NEW_MESSAGE"),
            }
        ],
        "backFields": [
            {
                "key": "expiry",
                "label": get_message("WALLET_LABEL_EXPIRY"),
                "value": str(
                    metadata.get("coupon_end_date", pass_data.get("expiry_date", ""))
                ),
            },
            {
                "key": "usage_limit",
                "label": get_message("WALLET_LABEL_USAGE_LIMIT"),
                "value": str(
                    metadata.get(
                        "usage_limit", metadata.get("usage_limit_per_customer", 1)
                    )
                ),
            },
            {
                "key": "terms",
                "label": get_message("WALLET_LABEL_TERMS"),
                "value": card.description or metadata.get("coupon_description", ""),
            },
            {
                "key": "status",
                "label": get_message("WALLET_LABEL_STATUS"),
                "value": get_message(
                    "WALLET_USED_COUNT", count=customer_pass.coupon_redemption_count
                ),
                "changeMessage": get_message("WALLET_CHANGE_USED_COUNT"),
            },
        ],
    }


def _build_referral_fields(card, customer_pass) -> dict:
    customer = customer_pass.customer
    customer_name = f"{customer.first_name} {customer.last_name}"
    referrals = customer_pass.referral_count_val
    ref_code = customer.referral_code or customer_pass.qr_code or "N/A"
    return {
        "headerFields": [
            {
                "key": "refs",
                "label": get_message("WALLET_LABEL_REFERRALS"),
                "value": str(referrals),
                "changeMessage": get_message("WALLET_CHANGE_REFERRAL_COUNT"),
            }
        ],
        "primaryFields": [
            {
                "key": "code",
                "label": get_message("WALLET_LABEL_YOUR_CODE"),
                "value": ref_code,
            }
        ],
        "secondaryFields": [
            {
                "key": "customer",
                "label": get_message("WALLET_LABEL_AMBASSADOR"),
                "value": customer_name,
            }
        ],
        "auxiliaryFields": [
            {
                "key": "last_message",
                "label": get_message("WALLET_LABEL_MESSAGE"),
                "value": _last_message(customer_pass),
                "changeMessage": get_message("WALLET_CHANGE_NEW_MESSAGE"),
            }
        ],
        "backFields": [
            {
                "key": "desc",
                "label": get_message("WALLET_HOW_IT_WORKS"),
                "value": card.description or "",
                "changeMessage": get_message("WALLET_INFO_UPDATED"),
            }
        ],
    }


def _build_discount_fields(card, customer_pass) -> dict:
    pass_data = customer_pass.pass_data or {}
    metadata = card.metadata or {}
    customer_name = (
        f"{customer_pass.customer.first_name} {customer_pass.customer.last_name}"
    )
    # Discount cards use tiered progression from card.metadata["tiers"].
    # ``DiscountTrackStrategy`` writes ``current_tier_name`` (mirrored to
    # ``discount_tier``) so the displayed tier always tracks the mutation.
    tiers = metadata.get("tiers", [])
    current_tier = (
        pass_data.get("current_tier_name")
        or customer_pass.discount_tier
        or pass_data.get("discount_tier", "")
    )
    current_discount = 0
    for tier in tiers:
        if tier.get("tier_name") == current_tier:
            current_discount = tier.get("discount_percentage", 0)
            break
    if not current_tier and tiers:
        current_tier = tiers[0].get("tier_name") or get_message("WALLET_LABEL_BASIC")
        current_discount = tiers[0].get("discount_percentage", 0)
    return {
        "headerFields": [
            {
                "key": "tier",
                "label": get_message("WALLET_LABEL_TIER"),
                "value": current_tier.upper() or get_message("WALLET_LABEL_BASIC"),
                "changeMessage": get_message("WALLET_CHANGE_TIER_UPDATED"),
            }
        ],
        "primaryFields": [
            {
                "key": "discount",
                "label": get_message("WALLET_LABEL_DISCOUNT"),
                "value": f"{current_discount}%",
            }
        ],
        "secondaryFields": [
            {
                "key": "customer",
                "label": get_message("WALLET_LABEL_CLIENT"),
                "value": customer_name,
            },
            {
                "key": "program",
                "label": get_message("WALLET_LABEL_PROGRAM"),
                "value": card.name,
            },
        ],
        "auxiliaryFields": [
            {
                "key": "last_message",
                "label": get_message("WALLET_LABEL_MESSAGE"),
                "value": _last_message(customer_pass),
                "changeMessage": get_message("WALLET_CHANGE_NEW_MESSAGE"),
            }
        ],
        "backFields": [
            {
                "key": "tiers_info",
                "label": get_message("WALLET_LABEL_TIER_DISCOUNTS"),
                "value": "\n".join(
                    get_message(
                        "WALLET_TIER_ROW",
                        tier=t.get("tier_name", "?"),
                        discount=t.get("discount_percentage", 0),
                        threshold=t.get("threshold", 0),
                    )
                    for t in tiers
                )
                or get_message("WALLET_NO_TIERS"),
                "changeMessage": get_message("WALLET_TIERS_UPDATED"),
            },
            {
                "key": "desc",
                "label": get_message("WALLET_LABEL_DESCRIPTION"),
                "value": card.description or "",
            },
        ],
    }
