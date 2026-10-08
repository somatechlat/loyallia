"""
Loyallia Apple Wallet Field Layouts — extension module.

Secondary per-card-type builders kept out of apple_field_layouts.py so both
modules stay under the 650-line project ceiling. Imported and re-exported by
apple_field_layouts for a single public import path.
"""

from common.messages import get_message


def _last_message(customer_pass) -> str:
    """Visible message written by the redemption engine on each mutation."""
    pass_data = customer_pass.pass_data or {}
    return str(pass_data.get("last_message", "") or "")


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
                "value": _last_message(customer_pass),
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
            }
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
                "changeMessage": get_message("WALLET_CHANGE_BALANCE_UPDATED"),
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
                "value": _last_message(customer_pass),
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
