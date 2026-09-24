"""
CustomerPass transaction processing service.

Extracted from models to keep CustomerPass under 650 lines.
"""

from decimal import Decimal


def process_pass_transaction(
    customer_pass,
    transaction_type: str,
    amount: Decimal = Decimal("0"),
    quantity: int = 1,
) -> dict:
    """Process a transaction for a pass based on card type.

    Delegates to the Redemption Engine strategies.
    """
    if quantity < 1:
        raise ValueError("Quantity must be a positive integer")

    from django.utils import timezone

    from apps.redemption.context import RedemptionContext
    from apps.redemption.strategies.registry import get_strategy

    card = customer_pass.card
    card_type = card.card_type
    pass_data = customer_pass.pass_data

    # Resolve intent (mirrors RedemptionGateway._resolve_intent)
    resolved_intent = "auto"
    if transaction_type in ("earn", "redeem", "validate"):
        resolved_intent = transaction_type
    elif card_type == "stamp":
        is_ready = (
            customer_pass.lifecycle_state == customer_pass.LifecycleState.REWARD_READY
            or pass_data.get("reward_ready", False)
        )
        resolved_intent = "redeem" if is_ready else "earn"
    elif card_type == "cashback":
        resolved_intent = "earn"
    elif card_type in ("vip_membership", "corporate_discount", "affiliate"):
        resolved_intent = "validate"
    else:
        resolved_intent = "redeem"

    context = RedemptionContext(
        tenant=card.tenant,
        customer_pass=customer_pass,
        card=card,
        amount=amount,
        quantity=quantity,
        staff_id=None,
        location_id=None,
        scanned_at=timezone.now(),
        intent=resolved_intent,
    )

    # Capture old state for backward-compat mapping
    _old_stamp_count = customer_pass.stamp_count or pass_data.get("stamp_count", 0)

    strategy = get_strategy(card_type, resolved_intent)
    result = strategy.execute(context)

    if result.pass_updated:
        customer_pass.refresh_from_db()

    # Map RedemptionResult to legacy dict format for backward compatibility
    legacy = {
        "transaction_type": result.transaction_type,
        "amount": amount,
        "quantity": quantity,
        "pass_updated": result.pass_updated,
        "reward_earned": result.reward_earned,
        "reward_description": result.reward_description,
        "success": result.success,
    }

    # Coupon omits reward_earned on denial
    if card_type == "coupon" and not result.pass_updated:
        legacy.pop("reward_earned", None)
        legacy.pop("reward_description", None)

    if card_type == "stamp":
        legacy["new_stamp_count"] = customer_pass.stamp_count
        # Compute reward count
        try:
            stamps_required = int(card.metadata.get("stamps_required", 10))
            if stamps_required <= 0:
                stamps_required = 10
        except (TypeError, ValueError):
            stamps_required = 10
        total_stamps = _old_stamp_count + quantity
        legacy["reward_count"] = total_stamps // stamps_required
    elif card_type == "cashback":
        if result.new_balance:
            legacy["new_balance"] = Decimal(str(result.new_balance))
            legacy["earned_amount"] = legacy["new_balance"]
    elif card_type == "gift_certificate":
        if result.pass_updated:
            legacy["amount_redeemed"] = amount
        legacy["new_balance"] = result.new_balance
    elif card_type == "multipass":
        legacy["stamps_used"] = 1 if result.pass_updated else 0
        legacy["remaining_stamps"] = result.remaining_uses
    elif card_type == "referral_pass":
        legacy["new_referral_count"] = customer_pass.referral_count_val
        max_ref = (
            int(card.metadata.get("max_referrals_per_customer", 0))
            if card.metadata
            else 0
        )
        legacy["limit_reached"] = (
            not result.pass_updated
            and max_ref > 0
            and customer_pass.referral_count_val >= max_ref
        )
    elif card_type == "discount":
        legacy["discount_percentage"] = pass_data.get("current_discount_percentage", 0)
        legacy["tier_name"] = pass_data.get("current_tier_name", "")
    elif card_type in ("vip_membership", "affiliate"):
        legacy["membership_valid"] = result.success
        legacy["membership_expiry"] = pass_data.get("membership_expiry", "")
        legacy["reason"] = "" if result.success else "membership_expired"
    elif card_type == "corporate_discount":
        legacy["membership_valid"] = result.success

    return legacy
