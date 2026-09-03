"""
Loyallia Apple Wallet Pass Builders
Internal builder functions for Apple PKPass field layouts.
Used by apple_pass.py  not imported directly from outside pass_engine.
"""

import logging

from common.messages import get_message

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
        "{affiliate_code}": customer_pass.qr_code or str(pass_data.get("affiliate_code", "N/A")),
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
                    new_item["value"] = _substitute_template_values(str(item["value"]), card, customer_pass)
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


from .apple_field_builders import _build_fields_for_type  # noqa: F401


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
