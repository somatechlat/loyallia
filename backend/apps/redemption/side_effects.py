"""
Loyallia Post-Redemption Side Effects — single notify source of truth.

Every successful redemption entry point funnels through
`post_redemption_side_effects`:

  - `apps.transactions.api.transact`      (v1 scanner wrapper; delegates to v2)
  - `apps.redemption.api.transact_v2`     (v2 scanner)
  - `apps.transactions.api.remote_issue`  (manual remote issuance)
  - `apps.transactions.service.TransactionService.scan_qr` / `.remote_issue`

Guarantees:
  1. Idempotent replays (`result.idempotent_replay`) NEVER notify again.
  2. Exactly one Apple wake: `trigger_pass_update` owns APNs after the
     pass.json rebuild; the Google addMessage goes out with
     `notify_event(..., include_apple=False)` so the device is not woken twice.
  3. Google text is resolved from program `onRedeem` config + per-card-type
     catalog (`resolve_redeem_copy`) and templated from RedemptionResult
     (`{program}/{customer}/{value}/{amount}`).
  4. Scanner latency: Google httpx and APNs run off the request thread via
     Celery (`transaction.on_commit` + `.delay`), matching the enroll path.
  5. `field_keys` come from real `mutation.updates` keys on the result —
     never hardcoded column names.
  6. Membership/corporate denials never produce a success notification.
  7. Transaction re-fetch is always tenant-scoped.

A Google outage must never fail the redeemed transaction: every platform call
is isolated and logged in the returned `skipped` list.
"""

from __future__ import annotations

import logging
from collections.abc import Sequence
from typing import TYPE_CHECKING, Any

from django.db import transaction as db_transaction

if TYPE_CHECKING:
    from apps.redemption.result import RedemptionResult
    from apps.tenants.models import Tenant

logger = logging.getLogger(__name__)

# Machine-readable skip codes (not user-facing copy).
SKIP_NOT_SUCCESS = "not_success"
SKIP_IDEMPOTENT_REPLAY = "idempotent_replay"
SKIP_MEMBERSHIP_INVALID = "membership_invalid"
SKIP_PASS_NOT_FOUND = "pass_not_found"
SKIP_NO_PASS_UPDATE = "no_pass_update"


def _resolve_template_extra(result: RedemptionResult) -> dict[str, str]:
    """Map RedemptionResult values onto wallet copy template slots.

    `{amount}` is the **spent/applied** amount for this operation
    (`result.spent_amount`), never the remaining balance.
    `{value}` prefers the running balance, then remaining uses, then reward.
    `{total}` is the running count after this operation (e.g. total referrals).
    """
    new_balance = result.new_balance if result.new_balance is not None else ""
    remaining = (
        "" if result.remaining_uses is None else str(result.remaining_uses)
    )
    reward = result.reward_description or ""
    spent = result.spent_amount if result.spent_amount is not None else ""
    total = result.total_count if result.total_count is not None else ""
    value = new_balance or remaining or total or reward
    return {
        "value": str(value),
        "amount": str(spent),
        "balance": str(new_balance),
        "remaining_uses": remaining,
        "total": str(total),
        "reward": reward,
    }


def _lookup_customer_pass(*, tenant: Tenant, qr_code: str = "", customer_pass_id: str | None = None):
    """Tenant-scoped CustomerPass lookup by id or QR code."""
    import uuid

    from apps.customers.models import CustomerPass

    qs = CustomerPass.objects.select_related("customer", "card", "card__tenant").filter(
        is_active=True, card__tenant=tenant
    )
    if customer_pass_id:
        try:
            return qs.get(id=uuid.UUID(str(customer_pass_id)))
        except (CustomerPass.DoesNotExist, ValueError):
            return None
    if qr_code:
        return qs.filter(qr_code=qr_code).first()
    return None


def _membership_invalid(result: RedemptionResult) -> bool:
    """True when membership/corporate validation reported an invalid holder."""
    new_state = result.new_state or {}
    return new_state.get("membership_valid") is False


def post_redemption_side_effects(
    result: RedemptionResult,
    *,
    tenant: Tenant,
    qr_code: str = "",
    customer_pass_id: str | None = None,
    field_keys: Sequence[str] | None = None,
) -> dict:
    """Run the one true post-redemption notification pipeline.

    Called by every redemption entry point after a successful gateway result.
    Enqueues (never inlines) the wallet side effects:

      1. `trigger_pass_update` — Google object patch + ONE Apple APNs wake
         + redeem-specific in-app Notification (via get_message).
      2. `dispatch_redeem_wallet_message` — Google addMessage with
         per-card-type copy; `include_apple=False` so there is no double wake.

    Args:
        result: RedemptionResult from RedemptionGateway.process.
        tenant: Tenant scope for every lookup (cross-tenant isolation).
        qr_code: QR of the affected pass (used when no transaction_id path).
        customer_pass_id: Explicit pass id (optional).
        field_keys: Optional override; defaults to `result.field_keys`, which
            strategies populate from real `mutation.updates` keys.

    Returns:
        {"enqueued": bool, "pass_id": str, "event": str, "field_keys": list,
         "skipped": list[dict]}
    """
    if not result.success:
        return {
            "enqueued": False,
            "skipped": [{"reason": SKIP_NOT_SUCCESS}],
        }

    if getattr(result, "idempotent_replay", False):
        return {
            "enqueued": False,
            "skipped": [{"reason": SKIP_IDEMPOTENT_REPLAY}],
        }

    if _membership_invalid(result):
        return {
            "enqueued": False,
            "skipped": [{"reason": SKIP_MEMBERSHIP_INVALID}],
        }

    pass_obj = _lookup_customer_pass(
        tenant=tenant, qr_code=qr_code, customer_pass_id=customer_pass_id
    )
    if pass_obj is None and result.transaction_id:
        # Tenant-filtered re-fetch of the transaction's pass (SEC: no
        # cross-tenant leak via a bare transaction id).
        from apps.transactions.models import Transaction

        txn = (
            Transaction.objects.filter(
                id=result.transaction_id, tenant=tenant
            )
            .select_related("customer_pass__customer", "customer_pass__card")
            .first()
        )
        if txn is not None:
            pass_obj = txn.customer_pass

    if pass_obj is None:
        return {
            "enqueued": False,
            "skipped": [{"reason": SKIP_PASS_NOT_FOUND}],
        }

    if (
        not result.pass_updated
        and not result.reward_earned
        and not (field_keys or result.field_keys)
    ):
        # Read-only paths with no visible change still get the Google
        # validation copy when the strategy reported field_keys (e.g.
        # membership last_message), otherwise nothing to refresh.
        return {
            "enqueued": False,
            "pass_id": str(pass_obj.id),
            "skipped": [{"reason": SKIP_NO_PASS_UPDATE}],
        }

    resolved_keys = list(field_keys if field_keys is not None else result.field_keys)
    # Earn → value_changed copy; redeem/validate → redeem copy.
    event = "value_changed" if result.intent_resolved == "earn" else "redeemed"
    extra = _resolve_template_extra(result)
    pass_id = str(pass_obj.id)

    def _enqueue() -> None:
        from apps.customers.tasks import trigger_pass_update
        from apps.customers.tasks_notify import dispatch_redeem_wallet_message

        trigger_pass_update.delay(pass_id, event=event)  # type: ignore[reportCallIssue]
        # Google addMessage with per-type / value-changed copy. Apple wake is
        # owned by trigger_pass_update (include_apple=False downstream).
        dispatch_redeem_wallet_message.delay(  # type: ignore[reportCallIssue]
            pass_id, event, resolved_keys, extra
        )

    try:
        db_transaction.on_commit(_enqueue)
        enqueued = True
        skipped: list[dict] = []
    except Exception as exc:  # pragma: no cover - on_commit registry failure
        logger.warning(
            "post_redemption_side_effects enqueue failed for pass %s: %s",
            pass_id,
            exc,
            exc_info=True,
        )
        enqueued = False
        skipped = [{"reason": "enqueue_failed", "error": str(exc)}]

    return {
        "enqueued": enqueued,
        "pass_id": pass_id,
        "event": event,
        "field_keys": resolved_keys,
        "skipped": skipped,
        "template_extra": extra,
    }


def side_effect_template_extra(result: RedemptionResult) -> dict[str, Any]:
    """Public accessor for the template extras derived from a result."""
    return _resolve_template_extra(result)
