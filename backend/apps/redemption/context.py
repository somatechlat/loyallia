"""
Loyallia Redemption Engine — Context Object
Encapsulates all runtime data needed for rule evaluation and strategy execution.
"""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apps.cards.models import Card
    from apps.customers.models import CustomerPass
    from apps.tenants.models import Tenant


@dataclass
class RedemptionContext:
    """Runtime context for a redemption operation.

    Contains all objects and values needed by both the rule validators
    and the redemption strategies. Built once per command execution.
    """

    tenant: "Tenant"
    customer_pass: "CustomerPass"
    card: "Card"
    amount: Decimal
    quantity: int
    staff_id: str | None
    location_id: str | None
    scanned_at: datetime
    intent: str
    notes: str = ""
    idempotency_key: str = ""
    rules_evaluated: list[dict] | None = None
    is_remote: bool = False

    def __post_init__(self):
        """Ensure mutable defaults are initialized."""
        if self.rules_evaluated is None:
            self.rules_evaluated = []

    @property
    def card_type(self) -> str:
        """Convenience accessor for card type."""
        return self.card.card_type
