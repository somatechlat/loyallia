"""
WalletStudio V2 helpers for Apple Wallet pass builders.

Extracted from apple_pass_builders.py to keep file sizes under the project
architectural limit. This module handles parsing WalletStudio V2 metadata
and converting UnifiedField definitions into Apple PassKit field groups.
"""

import logging
import re

from common.messages import get_message

logger = logging.getLogger(__name__)


def _get_wallet_studio(card) -> dict:
    """Return the wallet_studio dict from card metadata, if any."""
    metadata = card.metadata or {}
    if isinstance(metadata, dict):
        return metadata.get("wallet_studio", {}) or {}
    return {}


def _build_v2_template_context(card, customer_pass) -> dict:
    """Build a template substitution context from customer/pass/card data."""
    customer = customer_pass.customer
    pass_data = customer_pass.pass_data or {}
    metadata = card.metadata or {}
    wallet_studio = _get_wallet_studio(card)
    card_type_config = wallet_studio.get("cardTypeConfig", {}) or {}

    total_stamps = (
        card_type_config.get("stampsRequired")
        or metadata.get("stamps_required")
        or metadata.get("total_stamps", 6)
    )
    current_stamps = customer_pass.stamp_count_val
    reward = (
        card_type_config.get("rewardDescription")
        or metadata.get("reward_description")
        or get_message("WALLET_REWARD_DEFAULT")
    )
    stamps_display = "⬛" * current_stamps + "⬜" * (
        max(total_stamps - current_stamps, 0)
    )
    enrolled_date = ""
    if customer_pass.enrolled_at:
        enrolled_date = customer_pass.enrolled_at.strftime("%d/%m/%Y")

    customer_name = f"{customer.first_name} {customer.last_name}".strip()
    current_date = __import__("datetime").datetime.now().strftime("%Y-%m-%d")

    return {
        "customer_name": customer_name,
        "customer_id": str(customer.id)[:8],
        "customer_email": customer.email or "",
        "customer_phone": customer.phone or "",
        "program_name": card.name or "",
        "merchant_name": card.tenant.name if card.tenant else "",
        "description": card.description or "",
        "qr_code": customer_pass.qr_code or "",
        "barcode_data": customer_pass.qr_code or "",
        "stamp_count": str(current_stamps),
        "stamps_required": str(total_stamps),
        "stamp_display": stamps_display,
        "reward_description": reward,
        "loyalty_points": str(customer_pass.cashback_balance_val),
        "points_balance": str(customer_pass.cashback_balance_val),
        "cashback_balance": str(customer_pass.cashback_balance_val),
        "cashback_percentage": str(
            card_type_config.get("cashbackPercentage")
            or metadata.get("cashback_percentage", 10)
        ),
        "cashback_earned": str(customer_pass.cashback_balance_val),
        "tier_name": pass_data.get(
            "membership_tier", pass_data.get("discount_tier", "")
        ),
        "membership_id": str(customer.id)[:8].upper(),
        "visit_count": str(customer.total_visits or 0),
        "purchase_total": "",
        "discount_amount": "",
        "gift_amount": str(customer_pass.gift_balance_val),
        "remaining_uses": str(customer_pass.multipass_remaining_val or 0),
        "session_count": "0",
        "referral_code": customer.referral_code or customer_pass.qr_code or "",
        "company_name": pass_data.get("company_name")
        or metadata.get("company_name")
        or "",
        "employee_id": pass_data.get("employee_id") or "",
        "department": pass_data.get("department") or "",
        "phone_number": customer.phone or "",
        "email_address": customer.email or "",
        "enrolled_date": enrolled_date,
        "current_date": current_date,
        "expiration_date": pass_data.get("expiry_date")
        or metadata.get("coupon_end_date")
        or "",
        "benefits": (
            ", ".join(metadata.get("benefits", []))
            if isinstance(metadata.get("benefits"), list)
            else str(metadata.get("benefits", ""))
        ),
        "affiliate_code": customer_pass.qr_code
        or str(pass_data.get("affiliate_code", "N/A")),
    }


def _resolve_v2_dynamic_value(value: str, context: dict) -> str:
    """Replace {template_key} placeholders using the provided context."""
    if not isinstance(value, str):
        return value

    def replacer(match: re.Match) -> str:
        key = match.group(1)
        return str(context.get(key, ""))

    return re.sub(r"\{([^}]+)\}", replacer, value)


def _map_v2_field_to_apple(field: dict, context: dict) -> dict:
    """Map a Wallet Pass Studio V2 UnifiedField to Apple PassKit format."""
    value = field.get("value", "")
    is_dynamic = field.get("isDynamic", False)
    if is_dynamic:
        template = field.get("dynamicTemplate") or value
        value = _resolve_v2_dynamic_value(template, context)
    else:
        value = _resolve_v2_dynamic_value(value, context)

    apple_field = {
        "key": field.get("id", "field"),
        "label": field.get("label", ""),
        "value": value,
    }

    apple_options = field.get("appleOptions", {}) or {}
    # Structured notification config takes precedence; fall back to legacy flat string
    notifications = field.get("notifications", {}) or {}
    apple_change_cfg = notifications.get("appleChangeMessage")
    if isinstance(apple_change_cfg, dict) and apple_change_cfg.get("enabled"):
        apple_field["changeMessage"] = apple_change_cfg.get("message", "")
    elif isinstance(apple_change_cfg, str) and apple_change_cfg:
        apple_field["changeMessage"] = apple_change_cfg
    elif apple_options.get("changeMessage"):
        apple_field["changeMessage"] = apple_options["changeMessage"]
    if apple_options.get("textAlignment"):
        apple_field["textAlignment"] = apple_options["textAlignment"]
    if apple_options.get("dateStyle"):
        apple_field["dateStyle"] = apple_options["dateStyle"]
    if apple_options.get("timeStyle"):
        apple_field["timeStyle"] = apple_options["timeStyle"]
    if apple_options.get("numberStyle"):
        apple_field["numberStyle"] = apple_options["numberStyle"]
    if apple_options.get("currencyCode"):
        apple_field["currencyCode"] = apple_options["currencyCode"]
    if apple_options.get("attributedValue"):
        apple_field["attributedValue"] = _resolve_v2_dynamic_value(
            apple_options["attributedValue"], context
        )
    elif field.get("formatting", {}).get("isLink"):
        link_url = field.get("formatting", {}).get("linkUrl", "")
        apple_field["attributedValue"] = f"<a href='{link_url}'>{value}</a>"

    return apple_field


def _build_v2_apple_fields(card, customer_pass) -> dict | None:
    """Build Apple PassKit fields from Wallet Pass Studio V2 state."""
    wallet_studio = _get_wallet_studio(card)
    fields = wallet_studio.get("fields")
    if not fields or not isinstance(fields, list):
        return None

    context = _build_v2_template_context(card, customer_pass)

    groups = {
        "headerFields": [],
        "primaryFields": [],
        "secondaryFields": [],
        "auxiliaryFields": [],
        "backFields": [],
    }
    group_map = {
        "header": "headerFields",
        "headerFields": "headerFields",
        "primary": "primaryFields",
        "primaryFields": "primaryFields",
        "secondary": "secondaryFields",
        "secondaryFields": "secondaryFields",
        "auxiliary": "auxiliaryFields",
        "auxiliaryFields": "auxiliaryFields",
        "back": "backFields",
        "backFields": "backFields",
    }

    for field in fields:
        if not isinstance(field, dict):
            continue
        if not field.get("showOnApple", True):
            continue
        group = field.get("fieldGroup")
        if not isinstance(group, str):
            continue
        apple_group = group_map.get(group)
        if not apple_group:
            continue
        groups[apple_group].append(_map_v2_field_to_apple(field, context))

    # Sort each group by order
    for group_fields in groups.values():
        group_fields.sort(key=lambda f: f.get("_order", 0))

    # Add V2 back content fields
    back_content = wallet_studio.get("backContent", {}) or {}
    back_fields_v2 = back_content.get("fields", [])
    for back_field in back_fields_v2:
        if not isinstance(back_field, dict):
            continue
        field_id = back_field.get("id", f"back_{len(groups['backFields'])}")
        label = back_field.get("label", "")
        value = _resolve_v2_dynamic_value(back_field.get("value", ""), context)
        apple_back = {"key": field_id, "label": label, "value": value}
        if back_field.get("isLink"):
            link_url = back_field.get("url") or back_field.get("value", "")
            if link_url:
                display = label or value or link_url
                apple_back["attributedValue"] = f"<a href='{link_url}'>{display}</a>"
        groups["backFields"].append(apple_back)

    # Remove empty groups to keep pass.json clean
    return {k: v for k, v in groups.items() if v}
