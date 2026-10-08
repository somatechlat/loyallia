"""
Loyallia Redemption Engine — Result Object
Standardized response shape for all redemption operations.
"""

from dataclasses import dataclass, field


@dataclass
class RedemptionResult:
    """Standardized result from a redemption operation.

    Used by both the gateway (to return to the API) and by strategies
    (to communicate success/failure internally).

    `idempotent_replay` is set by the gateway when the result comes from the
    idempotency cache; post-redemption side effects MUST NOT notify on a replay.

    `field_keys` holds the real `mutation.updates` keys written by the strategy
    (populated in `BaseRedemptionStrategy._build_success_result`). Notifications
    use these as `field_keys` instead of hardcoded column names.
    """

    success: bool
    transaction_id: str | None = None
    transaction_type: str = ""
    pass_updated: bool = False
    denial_reasons: list[str] = field(default_factory=list)
    rules_evaluated: list[dict] = field(default_factory=list)
    new_state: dict = field(default_factory=dict)
    reward_earned: bool = False
    reward_description: str = ""
    message_code: str = ""
    intent_resolved: str = "none"
    new_balance: str | None = None
    remaining_uses: int | None = None
    # Spent / applied amount for this operation (NOT the remaining balance).
    # Used by wallet copy templates as `{amount}`.
    spent_amount: str | None = None
    # Running total count after this operation (e.g. total referrals).
    # Used by wallet copy templates as `{total}`.
    total_count: str | None = None
    idempotent_replay: bool = False
    field_keys: list[str] = field(default_factory=list)

    @classmethod
    def from_success(cls, **kwargs):
        """Create a result representing a successful redemption."""
        return cls(success=True, **kwargs)

    @classmethod
    def from_denial(cls, reasons: list[str], rules_evaluated: list[dict] | None = None):
        """Create a result representing a denied redemption.

        Args:
            reasons: List of denial reason codes.
            rules_evaluated: Optional list of evaluated rule details.
        """
        return cls(
            success=False, denial_reasons=reasons, rules_evaluated=rules_evaluated or []
        )

    def to_api_response(self) -> dict:
        """Serialize to the API response shape expected by the scanner UI."""
        return {
            "transaction_id": self.transaction_id,
            "success": self.success,
            "pass_updated": self.pass_updated,
            "reward_earned": self.reward_earned,
            "reward_description": self.reward_description,
            "intent_resolved": self.intent_resolved,
            "denial_reasons": self.denial_reasons,
            "rules_evaluated": self.rules_evaluated,
            "new_balance": self.new_balance,
            "remaining_uses": self.remaining_uses,
            "spent_amount": self.spent_amount,
            "total_count": self.total_count,
            "idempotent_replay": self.idempotent_replay,
        }
