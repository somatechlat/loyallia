"""
Loyallia Redemption Engine — Strategy Registry

Maps (card_type, intent) → RedemptionStrategy subclass.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .base import BaseRedemptionStrategy

# Lazy-import cache to avoid circular imports at module level
_strategy_cache: dict[str, "BaseRedemptionStrategy"] = {}


def get_strategy(card_type: str, intent: str) -> "BaseRedemptionStrategy":
    """Resolve a card type + intent to the appropriate strategy instance.

    Args:
        card_type: One of CardType values (stamp, cashback, coupon, etc.)
        intent: "earn", "redeem", or "validate"

    Returns:
        A concrete BaseRedemptionStrategy subclass instance.

    Raises:
        ValueError: If no strategy is registered for the combination.
    """
    cache_key = f"{card_type}:{intent}"
    if cache_key in _strategy_cache:
        return _strategy_cache[cache_key]

    strategy = _resolve(card_type, intent)
    _strategy_cache[cache_key] = strategy
    return strategy


def _resolve(card_type: str, intent: str) -> "BaseRedemptionStrategy":
    """Internal resolution logic (called once per unique key)."""

    # ------------------------------------------------------------------
    # Stamp cards
    # ------------------------------------------------------------------
    if card_type == "stamp":
        if intent == "earn":
            from .stamp import StampEarnStrategy

            return StampEarnStrategy()
        if intent in ("redeem", "validate"):
            from .stamp import StampRedeemStrategy

            return StampRedeemStrategy()

    # ------------------------------------------------------------------
    # Cashback cards
    # ------------------------------------------------------------------
    if card_type == "cashback":
        if intent == "earn":
            from .cashback import CashbackEarnStrategy

            return CashbackEarnStrategy()
        if intent in ("redeem", "validate"):
            from .cashback import CashbackRedeemStrategy

            return CashbackRedeemStrategy()

    # ------------------------------------------------------------------
    # Single-operation cards (redeem-only or validate-only)
    # ------------------------------------------------------------------
    if card_type == "coupon":
        from .coupon import CouponRedeemStrategy

        return CouponRedeemStrategy()

    if card_type == "gift_certificate":
        from .gift import GiftRedeemStrategy

        return GiftRedeemStrategy()

    if card_type == "multipass":
        from .multipass import MultipassRedeemStrategy

        return MultipassRedeemStrategy()

    if card_type == "discount":
        from .discount import DiscountTrackStrategy

        return DiscountTrackStrategy()

    if card_type == "referral_pass":
        from .referral import ReferralTrackStrategy

        return ReferralTrackStrategy()

    if card_type in ("vip_membership", "affiliate"):
        from .membership import MembershipValidateStrategy

        return MembershipValidateStrategy()

    if card_type == "corporate_discount":
        from .corporate import CorporateValidateStrategy

        return CorporateValidateStrategy()

    # ------------------------------------------------------------------
    # Fallback
    # ------------------------------------------------------------------
    raise ValueError(f"No strategy registered for card_type={card_type}, intent={intent}")


def clear_cache() -> None:
    """Clear the strategy instance cache (useful in tests)."""
    _strategy_cache.clear()
