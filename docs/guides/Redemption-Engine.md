# Redemption Engine Subsystem Guide

## 1. Overview

The Redemption Engine processes all loyalty card scans at the point of sale. It validates QR codes, evaluates card-specific redemption rules, applies the correct strategy for the card type (stamp, cashback, coupon, gift certificate, multipass, VIP membership, corporate discount, etc.), records transactions, and triggers side effects such as notifications and wallet updates.

**Key design principles:**
- **Command Pattern**: Immutable `RedemptionCommand` encapsulates the request.
- **Idempotency**: Redis-backed cache ensures exactly-once semantics for 24 hours.
- **Rule Engine**: Stateless validators check usage limits, time windows, cooldowns, locations, purchase thresholds, and staff roles.
- **Strategy Registry**: `(card_type, intent)` maps to a `BaseRedemptionStrategy` subclass.
- **Template Method**: All strategies follow `validate → lock → compute → apply → record → build result`.

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Scanner App / POS                            │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Redemption API (apps.redemption.api)              │
│  ┌──────────────┐              ┌──────────────┐                     │
│  │ /validate/   │              │ /transact/   │                     │
│  │ (read-only)  │              │ (mutation)   │                     │
│  └──────────────┘              └──────┬───────┘                     │
└───────────────────────────────────────┼─────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RedemptionGateway (gateway.py)                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐ │
│  │Idempotency│  │ Context │  │  Rules  │  │Strategy │  │  Result  │ │
│  │  Check   │  │ Assembly│  │Validate │  │Execute  │  │  Build   │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

**Scan / Transact Flow:**
1. Staff sends `POST /api/v1/scanner/v2/transact/` with `qr_code`, `amount`, `intent`, `idempotency_key`.
2. `RedemptionGateway.process(command, tenant)`:
   a. Check Redis idempotency cache (24h TTL).
   b. Lookup `CustomerPass` by QR code (tenant-scoped).
   c. Build `RedemptionContext` with pass, card, amount, staff, location, intent.
   d. Resolve `intent` if `auto`:
      - `stamp` → `redeem` if `lifecycle_state=REWARD_READY`, else `earn`
      - `cashback` → `earn`
      - `vip_membership`, `corporate_discount`, `affiliate` → `validate`
      - default → `redeem`
   e. Run all rule validators against `card.redemption_rules`.
   f. If violations → deny, record `TransactionType.DENIED` audit row.
   g. Resolve strategy from registry by `(card_type, intent)`.
   h. Execute strategy (template method):
      - Pre-lock validation
      - `select_for_update()` on pass
      - Compute mutation
      - Apply mutation to pass
      - Record `Transaction`
      - Update customer stats via `F()` expressions
      - Build `RedemptionResult`
   i. Store successful result in idempotency cache.

---

## 3. Key Models

The Redemption Engine does not define heavy models itself; it orchestrates models from other apps.

### `apps.redemption.command.RedemptionCommand`

Immutable frozen dataclass representing a redemption request.

| Field | Type | Notes |
|-------|------|-------|
| `tenant_id` | str | Tenant scope |
| `qr_code` | str | CustomerPass QR code |
| `intent` | Literal | `earn`, `redeem`, `auto` |
| `amount` | Decimal | Purchase amount |
| `quantity` | int | Default 1 |
| `staff_id` | str \| None | Authenticated staff user |
| `location_id` | str \| None | Business location |
| `notes` | str | Optional |
| `idempotency_key` | str | UUIDv4 or auto-generated SHA-256 hash |
| `is_remote` | bool | Remote redemption flag |
| `scanned_at` | datetime | Defaults to `timezone.now()` |

### `apps.redemption.context.RedemptionContext`

Runtime context assembled per command.

| Field | Type | Notes |
|-------|------|-------|
| `tenant` | `Tenant` | |
| `customer_pass` | `CustomerPass` | Locked row during strategy execution |
| `card` | `Card` | Card program definition |
| `amount` / `quantity` | Decimal / int | |
| `staff_id` / `location_id` | str \| None | |
| `scanned_at` | datetime | |
| `intent` | str | Resolved intent |
| `idempotency_key` | str | |
| `rules_evaluated` | list[dict] | Audit trail |
| `is_remote` | bool | |

### `apps.redemption.result.RedemptionResult`

Standardized response shape.

| Field | Type | Notes |
|-------|------|-------|
| `success` | bool | |
| `transaction_id` | str \| None | |
| `transaction_type` | str | e.g., `STAMP_EARNED`, `COUPON_REDEEMED` |
| `pass_updated` | bool | |
| `denial_reasons` | list[str] | Canonical codes: `usage_limit_exceeded`, `time_window_invalid`, etc. |
| `rules_evaluated` | list[dict] | `{rule_code, message}` |
| `reward_earned` / `reward_description` | bool / str | |
| `intent_resolved` | Literal | `earn`, `redeem`, `none` |
| `new_balance` | str \| None | Human-readable balance |
| `remaining_uses` | int \| None | |
| `new_state` | dict | Additional pass state |

---

## 4. API Overview

Mounted under `/api/v1/scanner/v2/` via `apps.redemption.api`.

| Endpoint | Method | Auth | Role | Summary |
|----------|--------|------|------|---------|
| `/validate/` | POST | jwt | STAFF+ | Read-only QR validation; returns pass state |
| `/transact/` | POST | jwt | STAFF+ | Record transaction via RedemptionGateway |

### Pydantic Schemas

- `ScanValidateIn`: `qr_code`
- `ScanTransactIn`: `qr_code`, `amount`, `quantity`, `notes`, `intent`, `idempotency_key`
- `RedemptionOut`: Full result shape including `success`, `transaction_id`, `new_balance`, `remaining_uses`, `denial_reasons`, `rules_evaluated`

**HTTP Codes:**
- `200` — Success
- `422` — Denied by rules (response body contains `denial_reasons`)
- `404` — Pass not found or inactive
- `403` — Permission denied (non-staff)

---

## 5. Integration Points

| App | Integration | Details |
|-----|-------------|---------|
| `customers` | `CustomerPass` is the core entity; `Customer` stats updated via `F()` expressions | `total_visits`, `total_spent`, `last_visit` |
| `cards` | `Card` defines `card_type`, `metadata`, and `redemption_rules` | Rules JSON evaluated by validators |
| `transactions` | `Transaction` rows created for every redemption (success or denied) | `TransactionType` enum: `STAMP_EARNED`, `STAMP_REDEEMED`, `DENIED`, etc. |
| `tenants` | Tenant scoping on every lookup and transaction | `CustomerPass.objects.get(qr_code=..., card__tenant=tenant)` |
| `authentication` | `staff_id` from `request.user.id`; `STAFF+` required | `is_staff_or_above()` guard |
| `notifications` | `NotificationService.send_reward_notification()` after successful earn/redeem | Also triggers Google Wallet push |
| `audit` | Denied transactions create `TransactionType.DENIED` rows with `denial_reason` and `rules_evaluated` | |

---

## 6. Configuration

### Environment Variables / Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `REDIS_URL` | Vault / file fallback | Idempotency cache backend |
| `CACHES["default"]` | Redis | Django cache used by idempotency layer |
| `TRIAL_DAYS` | `5` | Affects trial plan limits indirectly |

### Redis Cache Keys

- `redemption:idempotency:{tenant_id}:{idempotency_key}` — Cached successful result (24h TTL)

### Card Metadata Examples

Metadata lives in `Card.metadata` JSONField and drives strategy behavior:

| Card Type | Key Metadata Fields |
|-----------|---------------------|
| `stamp` | `stamps_required`, `reward_description` |
| `cashback` | `cashback_percentage`, `minimum_purchase`, `credit_expiry_days` |
| `coupon` | `discount_type`, `discount_value`, `usage_limit_per_customer` |
| `gift_certificate` | `denominations`, `expiry_days` |
| `multipass` | `bundle_size`, `bundle_price` |
| `vip_membership` | `membership_name`, `monthly_fee`, `validity_period` |
| `discount` | `tiers` (list of threshold + discount_percentage) |
| `referral_pass` | `referrer_reward`, `referee_reward`, `max_referrals_per_customer` |

### Redemption Rules (`card.redemption_rules`)

```json
{
  "usage_limit_per_customer": 3,
  "usage_limit_global": 1000,
  "valid_from": "2024-01-01T00:00:00Z",
  "valid_until": "2024-12-31T23:59:59Z",
  "allowed_days_of_week": [1, 2, 3, 4, 5],
  "allowed_hours": {"start": "09:00", "end": "18:00"},
  "cooldown_hours": 24,
  "allowed_locations": ["loc-uuid-1", "loc-uuid-2"],
  "min_purchase": 10.00,
  "max_purchase": 500.00,
  "allowed_staff_roles": ["OWNER", "MANAGER"]
}
```

---

## 7. Testing

### Test Location

- `backend/apps/redemption/tests/test_gateway.py` — Gateway + idempotency integration tests
- `backend/apps/redemption/tests/test_rules.py` — Individual validator tests
- `backend/apps/redemption/tests/test_strategies.py` — Strategy execution tests
- `backend/tests/test_scanner.py` — End-to-end scanner API tests
- `backend/tests/test_concurrency.py` — Race-condition tests

### Running Redemption Tests

```bash
cd backend
pytest apps/redemption/tests/ -v
pytest tests/test_scanner.py -v
pytest tests/test_concurrency.py -v
```

### Key Test Patterns

```python
from apps.redemption.command import RedemptionCommand
from apps.redemption.gateway import RedemptionGateway
from apps.redemption.idempotency import clear as clear_idempotency

class GatewayTestCase(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Test Cafe", email="test@cafe.com")
        self.customer = Customer.objects.create(tenant=self.tenant, ...)
        self.gateway = RedemptionGateway()

    def test_gateway_stamp_auto_earn(self):
        card = self.make_card("stamp", metadata={"stamps_required": 5})
        cp = self.make_pass(card)
        cmd = self.make_command(cp.qr_code, intent="auto")
        result = self.gateway.process(cmd, self.tenant)
        self.assertTrue(result.success)
        self.assertEqual(result.intent_resolved, "earn")
        cp.refresh_from_db()
        self.assertEqual(cp.stamp_count, 1)

    def test_idempotency_blocks_duplicate(self):
        card = self.make_card("stamp", metadata={"stamps_required": 5})
        cp = self.make_pass(card)
        key = "test-idempotency-123"
        clear_idempotency(str(self.tenant.id), key)
        cmd = self.make_command(cp.qr_code, intent="earn", idempotency_key=key)
        result1 = self.gateway.process(cmd, self.tenant)
        result2 = self.gateway.process(cmd, self.tenant)
        self.assertTrue(result1.success and result2.success)
        txn_count = Transaction.objects.filter(
            tenant=self.tenant, customer_pass=cp, transaction_type=TransactionType.STAMP_EARNED
        ).count()
        self.assertEqual(txn_count, 1)
```

### What to Test

| Area | Suggestion |
|------|------------|
| Idempotency | Duplicate command with same key returns cached result; only one transaction persisted |
| Rules | Each validator (`UsageLimit`, `TimeWindow`, `Cooldown`, `Location`, `MinPurchase`, `StaffRole`) returns correct violations |
| Auto intent | `stamp` with `REWARD_READY` resolves to `redeem`; without it resolves to `earn` |
| Locking | Concurrent scans on same pass do not corrupt `pass_data` (verify `select_for_update`) |
| Denied audit | Every denial creates a `TransactionType.DENIED` row with `denial_reason` |
| Customer stats | `total_visits` and `total_spent` increment correctly via `F()` expressions |
| Strategy registry | Unknown `(card_type, intent)` returns `ValueError` → gateway returns `no_strategy` denial |

---

## 8. Troubleshooting

### Issue: Scan returns 422 with denial reasons
- Read `denial_reasons` in the response body:
  - `usage_limit_exceeded` → Check `card.redemption_rules.usage_limit_per_customer` or `usage_limit_global`.
  - `time_window_invalid` → Verify `valid_from`/`valid_until`, `allowed_days_of_week`, `allowed_hours`.
  - `cooldown_active` → `last_redemption_at` + `cooldown_hours` has not elapsed.
  - `location_invalid` → `location_id` is not in `allowed_locations`.
  - `min_purchase_not_met` / `max_purchase_exceeded` → Purchase amount outside thresholds.
  - `staff_role_denied` → Staff user's `role` not in `allowed_staff_roles`.

### Issue: Duplicate transactions recorded
- Verify the frontend sends a unique `idempotency_key` (UUIDv4) per intent.
- If `idempotency_key` is empty, the gateway auto-generates one from command fields — this is deterministic and will dedupe identical commands.
- Only **successful** results are cached; denied transactions can be retried.

### Issue: Pass state not updating after redemption
- Ensure `card.redemption_rules` JSON is valid (no typos in keys).
- Check strategy logs for `_compute_mutation()` output.
- Verify `select_for_update()` is not timing out (deadlock under heavy concurrency).
- Review `pass_data` keys mapped in `BaseRedemptionStrategy._apply_mutation()` (`stamp_count`, `cashback_balance`, etc.).

### Issue: Customer stats not updating
- `_update_customer_stats()` uses `F()` expressions and runs inside the atomic block.
- If the transaction rolled back, stats are not updated (by design).
- Check for `IntegrityError` or constraint violations in logs.

### Issue: Strategy not found for card type
- Verify `card.card_type` is a known value in `strategies/registry.py`.
- Check `(card_type, intent)` combination exists in `_resolve()`.
- Call `get_strategy(card_type, intent)` directly in a shell to debug.

### Issue: Scanner API returns 403
- Endpoint requires `STAFF`, `MANAGER`, or `OWNER` role.
- `jwt_auth` must be present in the `Authorization: Bearer <token>` header.
- `TenantMiddleware` must have resolved `request.tenant` from the user's JWT.

### Issue: Redis idempotency cache miss
- Verify Redis is reachable (`CACHES["default"]` configuration).
- Keys expire after 24 hours (`IDEMPOTENCY_TTL_SECONDS = 86_400`).
- Use `apps.redemption.idempotency.clear(tenant_id, key)` in admin or tests to reset.

---

## Reference Files

| File | Purpose |
|------|---------|
| `apps/redemption/api.py` | Scanner v2 endpoints (`/validate/`, `/transact/`) |
| `apps/redemption/gateway.py` | `RedemptionGateway` — main orchestrator |
| `apps/redemption/command.py` | `RedemptionCommand` — immutable request |
| `apps/redemption/context.py` | `RedemptionContext` — runtime data |
| `apps/redemption/result.py` | `RedemptionResult` — standardized response |
| `apps/redemption/rules.py` | Rule validators (`UsageLimitValidator`, `TimeWindowValidator`, etc.) |
| `apps/redemption/idempotency.py` | Redis idempotency check/store/clear |
| `apps/redemption/strategies/base.py` | `BaseRedemptionStrategy` template method |
| `apps/redemption/strategies/registry.py` | `(card_type, intent)` → strategy mapping |
| `apps/redemption/strategies/stamp.py` | Stamp earn/redeem strategies |
| `apps/redemption/strategies/cashback.py` | Cashback earn/redeem strategies |
| `apps/redemption/strategies/coupon.py` | Coupon redeem strategy |
| `apps/redemption/strategies/gift.py` | Gift certificate strategy |
| `apps/redemption/strategies/multipass.py` | Multipass strategy |
| `apps/redemption/strategies/membership.py` | VIP / affiliate validate strategy |
| `apps/redemption/strategies/corporate.py` | Corporate discount validate strategy |
| `apps/redemption/strategies/discount.py` | Discount track strategy |
| `apps/redemption/strategies/referral.py` | Referral track strategy |
