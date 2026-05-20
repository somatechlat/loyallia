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
        """Generate a deterministic hash if no explicit key was provided."""
        import hashlib

        payload = f"{self.tenant_id}:{self.qr_code}:{self.intent}:{self.amount}:{self.quantity}:{self.staff_id or ''}"
        return hashlib.sha256(payload.encode()).hexdigest()[:32]

    def resolved_key(self) -> str:
        """Return the explicit key or a generated deterministic one."""
        return self.idempotency_key or self.generate_idempotency_key()
