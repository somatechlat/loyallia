"""
Backend mirror of the frontend pass schema.

Generated to match frontend/src/components/wallet/types/__tests__/golden/pass-schema.json.
The frontend owns the canonical schema; edit pass-schema.ts and regenerate the
golden fixture, then update this mirror. Do not invent tokens here.

Stdlib only. The legacy single-brace substitution in apple_pass_builders is a
separate system and is intentionally not touched by this module.
"""

import re

__all__ = ["LIMITS", "TOKENS", "resolve_token", "resolve_template"]

# Flattened field-group limits: group -> max.
LIMITS = {
    'headerFields': 3,
    'primaryFields': 1,
    'secondaryFields': 4,
    'auxiliaryFields': 4,
    'backFields': 8,
}

# Namespaced token dictionary keyed by literal {{namespace.leaf}} strings.
TOKENS = {
    '{{customer.name}}': {
        "label": 'Customer Name',
        "description": 'Full name of the pass holder',
        "example": 'Ana Smith',
        "applicableCardTypes": ['stamp', 'cashback', 'coupon', 'affiliate', 'discount', 'gift_certificate', 'vip_membership', 'corporate_discount', 'referral_pass', 'multipass'],
    },
    '{{customer.first_name}}': {
        "label": 'Customer First Name',
        "description": 'First name of the pass holder',
        "example": 'Ana',
        "applicableCardTypes": ['stamp', 'cashback', 'coupon', 'affiliate', 'discount', 'gift_certificate', 'vip_membership', 'corporate_discount', 'referral_pass', 'multipass'],
    },
    '{{customer.last_name}}': {
        "label": 'Customer Last Name',
        "description": 'Last name of the pass holder',
        "example": 'Smith',
        "applicableCardTypes": ['stamp', 'cashback', 'coupon', 'affiliate', 'discount', 'gift_certificate', 'vip_membership', 'corporate_discount', 'referral_pass', 'multipass'],
    },
    '{{customer.phone}}': {
        "label": 'Phone Number',
        "description": 'Customer contact phone number',
        "example": '+593 99 123 4567',
        "applicableCardTypes": ['stamp', 'cashback', 'coupon', 'affiliate', 'discount', 'gift_certificate', 'vip_membership', 'corporate_discount', 'referral_pass', 'multipass'],
    },
    '{{customer.email}}': {
        "label": 'Email Address',
        "description": 'Customer contact email address',
        "example": 'ana@example.com',
        "applicableCardTypes": ['stamp', 'cashback', 'coupon', 'affiliate', 'discount', 'gift_certificate', 'vip_membership', 'corporate_discount', 'referral_pass', 'multipass'],
    },
    '{{customer.visit_count}}': {
        "label": 'Visit Count',
        "description": 'Total number of customer visits',
        "example": '12',
        "applicableCardTypes": ['stamp', 'cashback', 'multipass'],
    },
    '{{customer.purchase_total}}': {
        "label": 'Purchase Total',
        "description": 'Total amount of the current or last purchase',
        "example": '1,240.50',
        "applicableCardTypes": ['cashback', 'discount', 'coupon', 'gift_certificate'],
    },
    '{{membership.id}}': {
        "label": 'Membership ID',
        "description": 'Unique membership identifier',
        "example": 'MEM-12345678',
        "applicableCardTypes": ['stamp', 'cashback', 'coupon', 'vip_membership', 'corporate_discount', 'multipass'],
    },
    '{{membership.tier}}': {
        "label": 'Tier Name',
        "description": 'Current membership tier',
        "example": 'Gold',
        "applicableCardTypes": ['discount', 'vip_membership', 'cashback'],
    },
    '{{stamp.count}}': {
        "label": 'Stamp Count',
        "description": 'Current number of stamps collected',
        "example": '7',
        "applicableCardTypes": ['stamp'],
    },
    '{{stamp.total}}': {
        "label": 'Stamp Total',
        "description": 'Total stamps required to earn the reward',
        "example": '10',
        "applicableCardTypes": ['stamp'],
    },
    '{{loyalty.points_balance}}': {
        "label": 'Points Balance',
        "description": 'Current loyalty points balance',
        "example": '1,250',
        "applicableCardTypes": ['cashback', 'discount', 'vip_membership'],
    },
    '{{cashback.earned}}': {
        "label": 'Cashback Earned',
        "description": 'Total cashback earned to date',
        "example": '25.40',
        "applicableCardTypes": ['cashback'],
    },
    '{{cashback.balance}}': {
        "label": 'Cashback Balance',
        "description": 'Available cashback balance',
        "example": '25.40',
        "applicableCardTypes": ['cashback'],
    },
    '{{coupon.discount_amount}}': {
        "label": 'Discount Amount',
        "description": 'Calculated discount value',
        "example": '15.00',
        "applicableCardTypes": ['coupon', 'discount', 'corporate_discount', 'gift_certificate'],
    },
    '{{coupon.remaining_uses}}': {
        "label": 'Remaining Uses',
        "description": 'Number of uses left on a multi-use pass',
        "example": '3',
        "applicableCardTypes": ['multipass', 'coupon'],
    },
    '{{gift.balance}}': {
        "label": 'Gift Amount',
        "description": 'Remaining gift certificate balance',
        "example": '50.00',
        "applicableCardTypes": ['gift_certificate'],
    },
    '{{program.name}}': {
        "label": 'Program Name',
        "description": 'Name of the loyalty program',
        "example": 'Café Central Loyalty',
        "applicableCardTypes": ['stamp', 'cashback', 'coupon', 'affiliate', 'discount', 'vip_membership', 'corporate_discount', 'multipass'],
    },
    '{{program.reward_description}}': {
        "label": 'Reward Description',
        "description": 'Description of the available reward',
        "example": 'Free coffee',
        "applicableCardTypes": ['stamp', 'cashback', 'coupon', 'gift_certificate'],
    },
    '{{merchant.name}}': {
        "label": 'Merchant Name',
        "description": 'Name of the business or merchant',
        "example": 'Café Central',
        "applicableCardTypes": ['stamp', 'cashback', 'coupon', 'affiliate', 'discount', 'gift_certificate', 'vip_membership', 'corporate_discount', 'multipass'],
    },
    '{{merchant.company_name}}': {
        "label": 'Company Name',
        "description": 'Name of the employer or company',
        "example": 'Café Central',
        "applicableCardTypes": ['corporate_discount', 'affiliate'],
    },
    '{{merchant.department}}': {
        "label": 'Department',
        "description": 'Employee department name',
        "example": 'Marketing',
        "applicableCardTypes": ['corporate_discount'],
    },
    '{{merchant.employee_id}}': {
        "label": 'Employee ID',
        "description": 'Corporate employee identifier',
        "example": 'EMP-042',
        "applicableCardTypes": ['corporate_discount'],
    },
    '{{referral.code}}': {
        "label": 'Referral Code',
        "description": "Customer's unique referral code",
        "example": 'RAF-8891',
        "applicableCardTypes": ['referral_pass', 'affiliate'],
    },
    '{{referral.friend_name}}': {
        "label": 'Friend Name',
        "description": 'Name of the referred friend',
        "example": 'María González',
        "applicableCardTypes": ['referral_pass'],
    },
    '{{session.count}}': {
        "label": 'Session Count',
        "description": 'Number of sessions or entries used',
        "example": '4',
        "applicableCardTypes": ['multipass'],
    },
    '{{pass.expiration_date}}': {
        "label": 'Expiration Date',
        "description": 'Date when the pass or offer expires',
        "example": '2027-01-01',
        "applicableCardTypes": ['coupon', 'gift_certificate', 'referral_pass', 'multipass'],
    },
    '{{pass.current_date}}': {
        "label": 'Current Date',
        "description": "Today's date, dynamically generated",
        "example": '2026-09-23',
        "applicableCardTypes": ['stamp', 'cashback', 'coupon', 'affiliate', 'discount', 'gift_certificate', 'vip_membership', 'corporate_discount', 'referral_pass', 'multipass'],
    },
    '{{pass.barcode_data}}': {
        "label": 'Barcode Data',
        "description": 'Raw data encoded in the barcode',
        "example": 'LOY-12345',
        "applicableCardTypes": ['stamp', 'cashback', 'coupon', 'affiliate', 'discount', 'gift_certificate', 'vip_membership', 'corporate_discount', 'referral_pass', 'multipass'],
    },
    '{{pass.qr_code}}': {
        "label": 'QR Code',
        "description": 'Data encoded in the QR code',
        "example": 'LOY-12345',
        "applicableCardTypes": ['stamp', 'cashback', 'coupon', 'affiliate', 'discount', 'gift_certificate', 'vip_membership', 'corporate_discount', 'referral_pass', 'multipass'],
    },
}

_TOKEN_BODY_RE = re.compile(r"_([a-z0-9])")
_TOKEN_PATTERN = re.compile(r"\{\{[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\}\}")


def _snake_to_camel(value: str) -> str:
    return _TOKEN_BODY_RE.sub(lambda m: m.group(1).upper(), value)


def _coerce_token_value(value):
    """Documented token value coercion. Mirrored exactly in pass-schema.ts.

    1. bool -> "true" / "false" (lowercase)
    2. None / non-finite numbers / arrays / non-dict objects / callables /
       anything else -> unresolved (None)
    3. str -> as-is. Empty string "" is a HIT and resolves to ""
    4. Integer-valued finite numbers (isinstance(v, int) and not bool, or
       isinstance(v, float) and v.is_integer()) -> plain decimal digits, no
       fraction, no sign-plus, no exponent (str(int(v)))
    5. Other finite numbers -> if abs(v) < 1e-4 or abs(v) >= 1e16 -> unresolved;
       else (window 1e-4 <= |v| < 1e16) -> repr(v)
    """
    if value is None:
        return None
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(int(value))
    if isinstance(value, float):
        if value != value or value in (float("inf"), float("-inf")):
            return None
        if value.is_integer():
            return str(int(value))
        if abs(value) < 1e-4 or abs(value) >= 1e16:
            return None
        return repr(value)
    if isinstance(value, str):
        return value
    return None


def _own_get(obj, key):
    """Own-key lookup on a plain dict. Inherited attrs never participate."""
    if not isinstance(obj, dict):
        return None
    if key not in obj:
        return None
    return _coerce_token_value(obj[key])


def resolve_token(token: str, context: dict) -> str:
    """Resolve one {{namespace.leaf}} token against a context dict.

    Lookup order matches the frontend: nested camelCase, nested snake_case,
    flat camelCase leaf, flat snake_case leaf. Own keys only. Returns the token
    unchanged when nothing resolves (never "" or engine junk).
    """
    if not (isinstance(token, str) and token.startswith("{{") and token.endswith("}}")):
        return token
    body = token[2:-2]
    dot = body.find(".")
    if dot <= 0:
        return token
    namespace, leaf = body[:dot], body[dot + 1 :]
    if not leaf:
        return token
    camel_leaf = _snake_to_camel(leaf)

    nested = context.get(namespace)
    if isinstance(nested, dict):
        hit = _own_get(nested, camel_leaf)
        if hit is not None:
            return hit
        if camel_leaf != leaf:
            hit = _own_get(nested, leaf)
            if hit is not None:
                return hit

    hit = _own_get(context, camel_leaf)
    if hit is not None:
        return hit
    if camel_leaf != leaf:
        hit = _own_get(context, leaf)
        if hit is not None:
            return hit
    return token


def resolve_template(template: str, context: dict) -> str:
    """Substitute every well-formed {{namespace.leaf}} token in a template.

    Unknown tokens pass through unchanged. Single-brace {name} placeholders are
    left untouched (legacy resolver lives in the V2 builders, not here).
    """
    if not isinstance(template, str):
        return template
    return _TOKEN_PATTERN.sub(lambda m: resolve_token(m.group(0), context), template)
