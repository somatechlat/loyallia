"""
Loyallia Apple Wallet Field Builders (apps/customers/pass_engine/apple_field_builders.py)

Per-card-type Apple PassKit field layout builders.
Used by apple_pass_builders.py  not imported directly from outside pass_engine.
"""

from common.messages import get_message

from .apple_v2_builders import _build_v2_apple_fields


def _build_fields_for_type(card, customer_pass) -> dict:
    """Build Apple PassKit field layout based on card type."""
    # V2 Wallet Pass Studio fields take precedence
    v2_fields = _build_v2_apple_fields(card, customer_pass)
    if v2_fields:
        return v2_fields

    builders = {
        "stamp": _build_stamp_fields,
        "cashback": _build_cashback_fields,
        "vip_membership": _build_vip_fields,
        "coupon": _build_coupon_fields,
        "referral_pass": _build_referral_fields,
        "discount": _build_discount_fields,
        "affiliate": _build_affiliate_fields,
        "gift_certificate": _build_gift_certificate_fields,
        "corporate_discount": _build_corporate_discount_fields,
        "multipass": _build_multipass_fields,
    }
    builder = builders.get(card.card_type, _build_fallback_fields)
    return builder(card, customer_pass)


def _build_stamp_fields(card, customer_pass) -> dict:
    metadata = card.metadata or {}
    total = metadata.get("total_stamps", 6)
    current = customer_pass.stamp_count_val
    reward = metadata.get("reward_description", get_message("WALLET_REWARD_DEFAULT"))
    stamps_display = "\u2b1b" * current + "\u2b1c" * (total - current)
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
                "value": "",
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
    pct = metadata.get("cashback_percentage", 10)
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
                "value": "",
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
                "value": "",
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
                "value": "",
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
                "value": "",
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
    # Discount cards use tiered progression from card.metadata["tiers"]
    tiers = metadata.get("tiers", [])
    current_tier = customer_pass.discount_tier or pass_data.get("discount_tier", "")
    current_discount = 0
    for tier in tiers:
        if tier.get("tier_name") == current_tier:
            current_discount = tier.get("discount_percentage", 0)
            break
    if not current_tier and tiers:
        current_tier = tiers[0].get("tier_name", "Básico")
        current_discount = tiers[0].get("discount_percentage", 0)
    return {
        "headerFields": [
            {
                "key": "tier",
                "label": get_message("WALLET_LABEL_TIER"),
                "value": current_tier.upper() or get_message("WALLET_LABEL_BASIC"),
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
                "value": "",
                "changeMessage": get_message("WALLET_CHANGE_NEW_MESSAGE"),
            }
        ],
        "backFields": [
            {
                "key": "tiers_info",
                "label": get_message("WALLET_LABEL_TIER_DISCOUNTS"),
                "value": "\n".join(
                    f"{t.get('tier_name', '?')}: {t.get('discount_percentage', 0)}% "
                    f"(umbral: ${t.get('threshold', 0)})"
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


def _build_affiliate_fields(card, customer_pass) -> dict:
    pass_data = customer_pass.pass_data or {}
    metadata = card.metadata or {}
    customer = customer_pass.customer
    customer_name = f"{customer.first_name} {customer.last_name}"
    member_since = ""
    if customer_pass.enrolled_at:
        member_since = customer_pass.enrolled_at.strftime("%d/%m/%Y")
    affiliate_code = customer_pass.qr_code or pass_data.get("affiliate_code", "N/A")
    return {
        "headerFields": [
            {
                "key": "program",
                "label": get_message("WALLET_LABEL_PROGRAM"),
                "value": card.name,
            }
        ],
        "primaryFields": [
            {
                "key": "member",
                "label": get_message("WALLET_LABEL_AFFILIATE"),
                "value": customer_name,
            }
        ],
        "secondaryFields": [
            {
                "key": "code",
                "label": get_message("WALLET_LABEL_CODE"),
                "value": affiliate_code,
            },
            {
                "key": "since",
                "label": get_message("WALLET_LABEL_MEMBER_SINCE"),
                "value": member_since or "",
            },
        ],
        "auxiliaryFields": [
            {
                "key": "last_message",
                "label": get_message("WALLET_LABEL_MESSAGE"),
                "value": "",
                "changeMessage": get_message("WALLET_CHANGE_NEW_MESSAGE"),
            }
        ],
        "backFields": [
            {
                "key": "benefits",
                "label": get_message("WALLET_LABEL_BENEFITS"),
                "value": ", ".join(metadata.get("benefits", []))
                or card.description
                or "",
                "changeMessage": get_message("WALLET_BENEFITS_UPDATED"),
            },
        ],
    }


def _build_gift_certificate_fields(card, customer_pass) -> dict:
    metadata = card.metadata or {}
    customer = customer_pass.customer
    customer_name = f"{customer.first_name} {customer.last_name}"
    balance = str(customer_pass.gift_balance_val)
    currency = metadata.get("currency", "USD")
    return {
        "headerFields": [
            {
                "key": "balance",
                "label": get_message("WALLET_LABEL_BALANCE"),
                "value": f"${balance}",
                "currencyCode": currency,
            }
        ],
        "primaryFields": [
            {
                "key": "program",
                "label": get_message("WALLET_LABEL_CERTIFICATE"),
                "value": card.name,
            }
        ],
        "secondaryFields": [
            {
                "key": "recipient",
                "label": get_message("WALLET_LABEL_BENEFICIARY"),
                "value": customer_name,
            },
        ],
        "auxiliaryFields": [
            {
                "key": "last_message",
                "label": get_message("WALLET_LABEL_MESSAGE"),
                "value": "",
                "changeMessage": get_message("WALLET_CHANGE_NEW_MESSAGE"),
            }
        ],
        "backFields": [
            {
                "key": "expiry",
                "label": get_message("WALLET_LABEL_EXPIRY"),
                "value": get_message(
                    "WALLET_EXPIRY_DAYS", days=metadata.get("expiry_days", 365)
                ),
                "changeMessage": get_message("WALLET_VALIDITY_UPDATED"),
            },
            {
                "key": "desc",
                "label": get_message("WALLET_LABEL_DESCRIPTION"),
                "value": card.description or "",
            },
        ],
    }


def _build_corporate_discount_fields(card, customer_pass) -> dict:
    pass_data = customer_pass.pass_data or {}
    metadata = card.metadata or {}
    customer = customer_pass.customer
    customer_name = f"{customer.first_name} {customer.last_name}"
    discount_pct = str(customer_pass.corporate_discount)
    company = pass_data.get("company_name", metadata.get("company_name", card.name))
    return {
        "headerFields": [
            {
                "key": "discount",
                "label": get_message("WALLET_LABEL_DISCOUNT"),
                "value": f"{discount_pct}%",
            }
        ],
        "primaryFields": [
            {
                "key": "company",
                "label": get_message("WALLET_LABEL_COMPANY"),
                "value": company,
            }
        ],
        "secondaryFields": [
            {
                "key": "employee",
                "label": get_message("WALLET_LABEL_EMPLOYEE"),
                "value": customer_name,
            },
        ],
        "auxiliaryFields": [
            {
                "key": "last_message",
                "label": get_message("WALLET_LABEL_MESSAGE"),
                "value": "",
                "changeMessage": get_message("WALLET_CHANGE_NEW_MESSAGE"),
            }
        ],
        "backFields": [
            {
                "key": "desc",
                "label": get_message("WALLET_CONDITIONS"),
                "value": card.description or "",
                "changeMessage": get_message("WALLET_CONDITIONS_UPDATED"),
            },
        ],
    }


def _build_multipass_fields(card, customer_pass) -> dict:
    metadata = card.metadata or {}
    customer = customer_pass.customer
    customer_name = f"{customer.first_name} {customer.last_name}"
    bundle_size = metadata.get("bundle_size", 10)
    remaining = customer_pass.multipass_remaining_val or bundle_size
    return {
        "headerFields": [
            {
                "key": "remaining",
                "label": get_message("WALLET_LABEL_REMAINING_USES"),
                "value": f"{remaining}/{bundle_size}",
                "changeMessage": get_message("WALLET_REMAINING_USES_CHANGE"),
            }
        ],
        "primaryFields": [
            {
                "key": "bundle",
                "label": get_message("WALLET_LABEL_MULTIPASS"),
                "value": card.name,
            }
        ],
        "secondaryFields": [
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
                "value": "",
                "changeMessage": get_message("WALLET_CHANGE_NEW_MESSAGE"),
            }
        ],
        "backFields": [
            {
                "key": "price",
                "label": get_message("WALLET_LABEL_BUNDLE_PRICE"),
                "value": f"${metadata.get('bundle_price', '')}",
                "changeMessage": get_message("WALLET_PRICE_UPDATED"),
            },
            {
                "key": "desc",
                "label": get_message("WALLET_LABEL_DESCRIPTION"),
                "value": card.description or "",
            },
        ],
    }


def _build_fallback_fields(card, customer_pass) -> dict:
    customer_name = (
        f"{customer_pass.customer.first_name} {customer_pass.customer.last_name}"
    )
    return {
        "headerFields": [
            {
                "key": "program",
                "label": get_message("WALLET_LABEL_PROGRAM"),
                "value": card.name,
            }
        ],
        "primaryFields": [
            {
                "key": "customer",
                "label": get_message("WALLET_LABEL_CLIENT"),
                "value": customer_name,
            }
        ],
        "secondaryFields": [],
        "auxiliaryFields": [
            {
                "key": "last_message",
                "label": get_message("WALLET_LABEL_MESSAGE"),
                "value": "",
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
