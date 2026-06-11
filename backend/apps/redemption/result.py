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
        }
