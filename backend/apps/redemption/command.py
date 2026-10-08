"""
Loyallia Redemption Engine — Command Pattern
Immutable dataclass encapsulating redemption intent.
"""

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Literal

from django.utils import timezone


@dataclass(frozen=True)
class RedemptionCommand:
    """Immutable command representing a redemption request.

    The frozen=True ensures the command cannot be mutated after creation,
    making idempotency key generation deterministic.
    """

    tenant_id: str
    qr_code: str
    intent: Literal["earn", "redeem", "auto"] = "auto"
    amount: Decimal = Decimal("0")
    quantity: int = 1
    staff_id: str | None = None
    location_id: str | None = None
    notes: str = ""
    idempotency_key: str = ""
    is_remote: bool = False
    scanned_at: datetime = field(default_factory=timezone.now)

    def generate_idempotency_key(self) -> str:
        """Generate a unique key when the caller did not provide one.

        Empty key MUST NOT mean "dedupe identical scans for 24h". Two
        legitimate identical operations (same staff, same amount) are two
        transactions. Only an explicit client key is a replay key.
        """
        import uuid

        return f"auto-{uuid.uuid4().hex}"

    def resolved_key(self) -> str:
        """Return the explicit key, else a one-shot unique key (no silent dedupe)."""
        return self.idempotency_key or self.generate_idempotency_key()
