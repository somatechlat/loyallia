"""
Loyallia Apple Wallet Pass Builders
Internal builder functions for Apple PKPass field layouts.
Used by apple_pass.py  not imported directly from outside pass_engine.
"""

import logging

from common.messages import get_message

from .apple_v2_builders import _build_v2_apple_fields

logger = logging.getLogger(__name__)


# PASS TYPE STYLE MAPPING


APPLE_PASS_STYLES = {
    "stamp": "storeCard",
    "cashback": "storeCard",
    "coupon": "coupon",
    "discount": "storeCard",
    "affiliate": "generic",
    "gift_certificate": "storeCard",
    "vip_membership": "generic",
    "corporate_discount": "generic",
    "referral_pass": "generic",
    "multipass": "storeCard",
}


def _substitute_template_values(value: str, card, customer_pass) -> str:
    """Replace template placeholders with actual customer/card data."""
    if not isinstance(value, str):
        return value
    customer = customer_pass.customer
    customer_name = f"{customer.first_name} {customer.last_name}".strip()
    pass_data = customer_pass.pass_data or {}
    metadata = card.metadata or {}
    total_stamps = metadata.get("stamps_required", metadata.get("total_stamps", 6))
    current_stamps = customer_pass.stamp_count_val
    reward = metadata.get("reward_description", get_message("WALLET_REWARD_DEFAULT"))
    stamps_display = "⬛" * current_stamps + "⬜" * (total_stamps - current_stamps)
    enrolled_date = ""
    if customer_pass.enrolled_at:
        enrolled_date = customer_pass.enrolled_at.strftime("%d/%m/%Y")
    replacements = {
        "{description}": card.description or "",
        "{customer_name}": customer_name,
        "{program_name}": card.name or "",
        "{qr_code}": customer_pass.qr_code or "",
        "{stamp_count}": str(current_stamps),
        "{stamps_required}": str(total_stamps),
        "{reward_description}": reward,
        "{stamp_display}": stamps_display,
        "{affiliate_code}": customer_pass.qr_code
        or str(pass_data.get("affiliate_code", "N/A")),
        "{enrolled_date}": enrolled_date or str(pass_data.get("enrolled_date", "")),
        "{benefits}": (
            ", ".join(metadata.get("benefits", []))
            if isinstance(metadata.get("benefits"), list)
            else str(metadata.get("benefits", ""))
        ),
        "{cashback_balance}": str(customer_pass.cashback_balance_val),
        "{cashback_percentage}": str(metadata.get("cashback_percentage", 10)),
    }
    for placeholder, replacement in replacements.items():
        value = value.replace(placeholder, replacement)
    return value


def _substitute_fields(fields: dict, card, customer_pass) -> dict:
    """Recursively substitute template placeholders in all field values."""
    result = {}
    for key, value in fields.items():
        if isinstance(value, list):
            result[key] = []
            for item in value:
                if isinstance(item, dict) and "value" in item:
                    new_item = dict(item)
                    new_item["value"] = _substitute_template_values(
                        str(item["value"]), card, customer_pass
                    )
                    result[key].append(new_item)
                else:
                    result[key].append(item)
        elif isinstance(value, dict):
            result[key] = _substitute_fields(value, card, customer_pass)
        elif isinstance(value, str):
            result[key] = _substitute_template_values(value, card, customer_pass)
        else:
            result[key] = value
    return result


def _build_fields_for_type(card, customer_pass) -> dict:
    """Build Apple PassKit field layout based on card type."""
    pass_data = customer_pass.pass_data or {}
    metadata = card.metadata or {}
    customer = customer_pass.customer
    customer_name = f"{customer.first_name} {customer.last_name}"

    # V2 Wallet Pass Studio fields take precedence
    v2_fields = _build_v2_apple_fields(card, customer_pass)
    if v2_fields:
        return v2_fields


    if card.card_type == "stamp":
        total = metadata.get("total_stamps", 6)
        current = customer_pass.stamp_count_val
        reward = metadata.get("reward_description", get_message("WALLET_REWARD_DEFAULT"))
        stamps_display = "\u2b1b" * current + "\u2b1c" * (total - current)
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
                {"key": "reward", "label": get_message("WALLET_LABEL_REWARD"), "value": reward}
            ],
            "secondaryFields": [
                {"key": "progress", "label": get_message("WALLET_LABEL_PROGRESS"), "value": stamps_display}
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
                {"key": "name", "label": get_message("WALLET_LABEL_CUSTOMER"), "value": customer_name},
                {"key": "program", "label": get_message("WALLET_LABEL_PROGRAM"), "value": card.name},
                {
                    "key": "desc",
                    "label": get_message("WALLET_LABEL_DESCRIPTION"),
                    "value": card.description or "",
                    "changeMessage": get_message("WALLET_TERMS_UPDATED"),
                },
            ],
        }

    elif card.card_type == "cashback":
        balance = str(customer_pass.cashback_balance_val)
        pct = metadata.get("cashback_percentage", 10)
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
                {"key": "program", "label": get_message("WALLET_LABEL_PROGRAM"), "value": card.name}
            ],
            "secondaryFields": [
                {"key": "rate", "label": get_message("WALLET_LABEL_CASHBACK_RATE"), "value": f"{pct}%"},
                {"key": "customer", "label": get_message("WALLET_LABEL_CLIENT"), "value": customer_name},
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

    elif card.card_type == "vip_membership":
        tier = pass_data.get("membership_tier", "VIP")
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
                {"key": "name", "label": get_message("WALLET_LABEL_MEMBER"), "value": customer_name}
            ],
            "secondaryFields": [
                {"key": "program", "label": get_message("WALLET_LABEL_CLUB"), "value": card.name}
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

    elif card.card_type == "coupon":
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
                {"key": "customer", "label": get_message("WALLET_LABEL_CLIENT"), "value": customer_name}
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
                        metadata.get(
                            "coupon_end_date", pass_data.get("expiry_date", "")
                        )
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
                    "value": get_message("WALLET_USED_COUNT", count=customer_pass.coupon_redemption_count),
                },
            ],
        }

    elif card.card_type == "referral_pass":
        referrals = customer_pass.referral_count_val
        ref_code = customer.referral_code or customer_pass.qr_code or "N/A"
        return {
            "headerFields": [
                {"key": "refs", "label": get_message("WALLET_LABEL_REFERRALS"), "value": str(referrals)}
            ],
            "primaryFields": [{"key": "code", "label": get_message("WALLET_LABEL_YOUR_CODE"), "value": ref_code}],
            "secondaryFields": [
                {"key": "customer", "label": get_message("WALLET_LABEL_AMBASSADOR"), "value": customer_name}
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

    elif card.card_type == "discount":
        # Discount cards use tiered progression from card.metadata["tiers"]
        # pass_data stores "discount_tier" (current tier name) and "total_spent"
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
                {"key": "customer", "label": get_message("WALLET_LABEL_CLIENT"), "value": customer_name},
                {"key": "program", "label": get_message("WALLET_LABEL_PROGRAM"), "value": card.name},
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

    elif card.card_type == "affiliate":
        # Affiliate/membership card generic Apple style with member info
        member_since = ""
        if customer_pass.enrolled_at:
            member_since = customer_pass.enrolled_at.strftime("%d/%m/%Y")
        affiliate_code = customer_pass.qr_code or pass_data.get("affiliate_code", "N/A")
        return {
            "headerFields": [
                {"key": "program", "label": get_message("WALLET_LABEL_PROGRAM"), "value": card.name}
            ],
            "primaryFields": [
                {"key": "member", "label": get_message("WALLET_LABEL_AFFILIATE"), "value": customer_name}
            ],
            "secondaryFields": [
                {"key": "code", "label": get_message("WALLET_LABEL_CODE"), "value": affiliate_code},
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

    elif card.card_type == "gift_certificate":
        # Gift certificate storeCard style showing balance
        # Prefers typed column gift_balance, falls back to pass_data
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
                {"key": "program", "label": get_message("WALLET_LABEL_CERTIFICATE"), "value": card.name}
            ],
            "secondaryFields": [
                {"key": "recipient", "label": get_message("WALLET_LABEL_BENEFICIARY"), "value": customer_name},
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
                    "value": get_message("WALLET_EXPIRY_DAYS", days=metadata.get("expiry_days", 365)),
                    "changeMessage": get_message("WALLET_VALIDITY_UPDATED"),
                },
                {
                    "key": "desc",
                    "label": get_message("WALLET_LABEL_DESCRIPTION"),
                    "value": card.description or "",
                },
            ],
        }

    elif card.card_type == "corporate_discount":
        # Corporate discount generic Apple style
        # pass_data stores "corporate_discount" percentage and "company_name"
        discount_pct = str(customer_pass.corporate_discount)
        company = pass_data.get("company_name", metadata.get("company_name", card.name))
        return {
            "headerFields": [
                {"key": "discount", "label": get_message("WALLET_LABEL_DISCOUNT"), "value": f"{discount_pct}%"}
            ],
            "primaryFields": [{"key": "company", "label": get_message("WALLET_LABEL_COMPANY"), "value": company}],
            "secondaryFields": [
                {"key": "employee", "label": get_message("WALLET_LABEL_EMPLOYEE"), "value": customer_name},
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

    elif card.card_type == "multipass":
        # Multipass storeCard style showing remaining uses
        # Prefers typed column multipass_remaining, falls back to pass_data
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
                {"key": "bundle", "label": get_message("WALLET_LABEL_MULTIPASS"), "value": card.name}
            ],
            "secondaryFields": [
                {"key": "customer", "label": get_message("WALLET_LABEL_CLIENT"), "value": customer_name},
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

    else:
        # Fallback for any future/unknown card types
        return {
            "headerFields": [
                {"key": "program", "label": get_message("WALLET_LABEL_PROGRAM"), "value": card.name}
            ],
            "primaryFields": [
                {"key": "customer", "label": get_message("WALLET_LABEL_CLIENT"), "value": customer_name}
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


def _build_locations(card) -> list:
    """Build location array from tenant locations for geo-push."""
    locations = []

    if not hasattr(card.tenant, "locations"):
        return locations

    try:
        tenant_locations = card.tenant.locations.filter(is_active=True)[:10]
    except Exception as e:
        logger.warning("Failed to build locations: %s", e)
        return locations

    if not tenant_locations:
        return locations

    for loc in tenant_locations:  # Apple max: 10
        try:
            if loc.latitude and loc.longitude:
                locations.append(
                    {
                        "latitude": float(loc.latitude),
                        "longitude": float(loc.longitude),
                        "relevantText": get_message("WALLET_NEAR_LOCATION", name=loc.name),
                    }
                )
        except (ValueError, TypeError):
            continue
    return locations


