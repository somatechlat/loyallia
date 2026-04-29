# AUDIT 3: API Design & Business Logic Analysis — Loyallia Backend

**Date:** 2026-04-29  
**Scope:** API design flaws, business logic bugs, race conditions, data integrity, plan enforcement, multi-tenancy, automation engine  
**Status:** In Progress

---

## Table of Contents
1. [Race Conditions](#1-race-conditions)
2. [Business Logic Bugs](#2-business-logic-bugs)
3. [API Design Issues](#3-api-design-issues)
4. [Plan Enforcement](#4-plan-enforcement)
5. [Multi-tenancy](#5-multi-tenancy)
6. [Automation Engine](#6-automation-engine)

---

## 1. Race Conditions

### 1.1 — CRITICAL: Coupon Double-Redemption Race Condition

**File:** `backend/apps/customers/models.py:238-251` (`_process_coupon_transaction`)

```python
def _process_coupon_transaction(self) -> dict:
    from apps.transactions.models import TransactionType

    if not self.coupon_used:
        self.set_pass_field("coupon_used", True)
        # ...
```

**Problem:** `_process_coupon_transaction` reads `self.coupon_used` (from the in-memory `pass_data`) and then calls `self.set_pass_field()`, which internally calls `update_pass_data()` — BUT the `coupon_used` check happens **before** the `select_for_update` lock. Two concurrent scans can both see `coupon_used == False` and both proceed to redeem.

Unlike `_process_stamp_transaction`, `_process_gift_transaction`, etc. which do the check **inside** the `select_for_update` block, the coupon check is done on the unlocked in-memory instance.

**Impact:** A coupon can be redeemed twice under concurrent scans — financial loss for the merchant.

**Remediation:**
```python
def _process_coupon_transaction(self) -> dict:
    from apps.transactions.models import TransactionType
    from django.db import transaction as db_transaction

    with db_transaction.atomic():
        locked = CustomerPass.objects.select_for_update().get(pk=self.pk)
        if locked.pass_data.get("coupon_used", False):
            return {"transaction_type": TransactionType.COUPON_REDEEMED, "pass_updated": False}
        locked.pass_data["coupon_used"] = True
        locked.save(update_fields=["pass_data", "last_updated"])

    self.refresh_from_db(fields=["pass_data", "last_updated"])
    reward_description = self.card.get_metadata_field("coupon_description", "Coupon redeemed")
    return {
        "transaction_type": TransactionType.COUPON_REDEEMED,
        "pass_updated": True,
        "reward_earned": True,
        "reward_description": reward_description,
    }
```

---

### 1.2 — HIGH: Stamp Count Over-Reward on Boundary Condition

**File:** `backend/apps/customers/models.py:201-226` (`_process_stamp_transaction`)

```python
new_stamps = current_stamps + quantity
reward_earned = new_stamps >= stamps_required
if reward_earned:
    new_stamps = new_stamps - stamps_required
```

**Problem:** When `quantity > 1` and `new_stamps` exceeds `stamps_required` by more than one full cycle (e.g., `stamps_required=10`, `current_stamps=0`, `quantity=25`), only one reward is earned and `new_stamps = 15`. The customer loses 15 stamps worth of progress toward a second reward, and no indication of multiple rewards is returned.

Additionally, if `quantity` is negative (caller bug or malicious input), stamps decrease without bound — no `MinValueValidator` is applied to `quantity` in the process_transaction signature.

**Impact:** Customers can lose earned progress or have stamps go negative.

**Remediation:**
```python
if quantity < 1:
    quantity = 1  # Or raise ValueError
new_stamps = current_stamps + quantity
rewards_earned = new_stamps // stamps_required
new_stamps = new_stamps % stamps_required
```

---

### 1.3 — HIGH: Discount Tier Float Precision Loss

**File:** `backend/apps/customers/models.py:258-284` (`_process_discount_transaction`)

```python
new_total = float(total_spent) + float(amount)
```

**Problem:** Using `float()` for monetary calculations introduces precision errors. `total_spent` is stored as a float in `pass_data` JSON, then compared against tier thresholds. Over many transactions, floating-point drift means customers may not reach the correct tier.

**Impact:** Customers may be under- or over-discounted by small fractions, compounding over time.

**Remediation:** Store and compute all monetary values as string-encoded `Decimal`:
```python
from decimal import Decimal
new_total = Decimal(str(total_spent)) + Decimal(str(amount))
# Store as string: locked.pass_data["total_spent_at_business"] = str(new_total)
```

---

### 1.4 — MEDIUM: Automation `last_executed` Check-Then-Act Race

**File:** `backend/apps/automation/models.py:119-130` (`can_execute_for_customer`)

```python
if self.last_executed and self.cooldown_hours > 0:
    cooldown_end = self.last_executed + timedelta(hours=self.cooldown_hours)
    if timezone.now() < cooldown_end:
        return False
```

**Problem:** The cooldown check and the subsequent `execute()` → `save(update_fields=["total_executions", "last_executed"])` are not atomic. Under concurrent trigger fires (e.g., two transactions completing simultaneously for the same customer), both can pass the cooldown check before either updates `last_executed`.

**Impact:** Automation can fire multiple times within the cooldown window.

**Remediation:** Use `select_for_update()` when checking cooldown, or use `update_or_create` with a unique constraint on `(automation, customer, date)`.

---

## 2. Business Logic Bugs

### 2.1 — CRITICAL: Referral Pass Has No Loop Prevention

**File:** `backend/apps/customers/models.py:287-300` (`_process_referral_transaction`)

```python
def _process_referral_transaction(self) -> dict:
    with db_transaction.atomic():
        locked = CustomerPass.objects.select_for_update().get(pk=self.pk)
        current_count = locked.pass_data.get("referral_count", 0)
        new_count = current_count + 1
        locked.pass_data["referral_count"] = new_count
        # ...
```

**Problem:** There is no `max_referrals_per_customer` enforcement in the transaction handler. The card model defines `max_referrals_per_customer` in metadata (validated in `validate_referral_config`), but `_process_referral_transaction` never checks it. A customer with unlimited referral scans can inflate their referral count indefinitely.

Additionally, there is no check for self-referral or circular referral chains (A refers B, B refers A).

**Impact:** Referral reward abuse, unlimited reward generation.

**Remediation:**
```python
max_referrals = self.card.get_metadata_field("max_referrals_per_customer", 0)
if max_referrals > 0 and current_count >= max_referrals:
    return {"transaction_type": TransactionType.REFERRAL_REWARD, "pass_updated": False}
```

---

### 2.2 — HIGH: Cashback Balance Stored as String, Compared as Decimal — Inconsistency

**File:** `backend/apps/customers/models.py:175-181`

```python
@property
def cashback_balance(self) -> Decimal:
    return Decimal(str(self.get_pass_field("cashback_balance", "0")))
```

vs. `_process_cashback_transaction`:

```python
locked.pass_data["cashback_balance"] = str(new_balance)
```

**Problem:** The balance is stored as a string in JSON but the `gift_balance` property also does `Decimal(str(...))`. However, `_process_gift_transaction` compares `current_balance >= amount` where `current_balance` is from `Decimal(str(locked.pass_data.get("gift_balance", "0")))` — this works. But the inconsistency between string storage and Decimal comparison is fragile. If any code path stores a raw float (e.g., `0.1 + 0.2 = 0.30000000000000004`), the string representation will have excessive decimal places.

**Impact:** Potential balance drift on edge-case amounts.

**Remediation:** Standardize all monetary pass_data fields to use `Decimal` quantization before string storage:
```python
locked.pass_data["cashback_balance"] = str(new_balance.quantize(Decimal("0.01")))
```

---

### 2.3 — HIGH: Membership/Affiliate Validation Does Nothing

**File:** `backend/apps/customers/models.py:302-310` (`_process_membership_transaction`)

```python
def _process_membership_transaction(self) -> dict:
    from apps.transactions.models import TransactionType
    return {
        "transaction_type": TransactionType.MEMBERSHIP_VALIDATED,
        "pass_updated": False,
    }
```

**Problem:** For `vip_membership` and `affiliate` card types, `process_transaction` calls `_process_membership_transaction()` which does nothing — it doesn't check if the membership is expired, doesn't update any validation timestamp, and doesn't verify the customer's membership status.

**Impact:** Expired memberships are treated as valid. No audit trail of membership validations.

**Remediation:** Check `membership_expiry` against current time and return appropriate status.

---

### 2.4 — MEDIUM: `generate_referral_code` Can Loop Forever

**File:** `backend/apps/customers/models.py:82-91`

```python
def generate_referral_code(self) -> str:
    while True:
        code = "".join(secrets.choice(...) for _ in range(8))
        if not Customer.objects.filter(referral_code=code).exists():
            return code
```

**Problem:** With 8-char alphanumeric codes (36^8 ≈ 2.8 trillion combinations), collision is extremely unlikely but the loop has no iteration cap. If the database is in a degraded state or the unique constraint is violated by concurrent inserts, this loops forever.

**Impact:** Potential infinite loop / hung request under extreme conditions.

**Remediation:** Add a max iteration counter (e.g., 10 attempts).

---

### 2.5 — MEDIUM: `_process_discount_transaction` Tiers Not Validated at Runtime

**File:** `backend/apps/customers/models.py:260`

```python
for tier in sorted(tiers, key=lambda t: t.get("threshold", 0)):
    if new_total >= tier.get("threshold", 0):
        applicable_tier = tier
```

**Problem:** If `tiers` is an empty list (card was created with empty tiers, or metadata was corrupted), `applicable_tier` remains `None` and `discount_pct = 0`. No error is raised — the customer gets 0% discount silently. The `validate_discount_config` check only runs on `Card.save()` (not on metadata mutation via `set_metadata_field`).

**Impact:** Silent 0% discount with no indication to the merchant.

---

## 3. API Design Issues

### 3.1 — CRITICAL: Public Enrollment Endpoint Creates Customers Without Tenant Verification

**File:** `backend/apps/customers/api.py:137-181` (`enroll_customer_public`)

```python
@router.post("/enroll/", response=CustomerPassOut, summary="Auto-inscripcion de cliente")
def enroll_customer_public(request, card_id: str, customer_data: CustomerCreateIn):
    """Public endpoint for customer self-enrollment via QR code scan."""
    card = Card.objects.select_related("tenant").get(id=card_id, is_active=True)
    customer, created = Customer.objects.get_or_create(
        tenant=card.tenant, email=customer_data.email, defaults={...})
```

**Problem:** This is a **public endpoint** (`auth` not specified, defaults to None). It:
1. Creates customers in any tenant by guessing card IDs
2. Overwrites existing customer profile data (first_name, last_name, phone, etc.) if the customer already exists — an attacker can deface customer profiles by re-enrolling with different data
3. Has no rate limiting — enables mass customer creation / spam

**Impact:** Profile defacement, spam, unauthorized tenant data modification.

**Remediation:** Add rate limiting (e.g., `@ratelimit(key="ip", rate="10/h")`), don't overwrite existing customer data on re-enrollment, or require a signed enrollment token.

---

### 3.2 — HIGH: Inconsistent Pagination Across All List Endpoints

Most list endpoints use manual `[offset : offset + limit]` slicing without enforcing maximum limits:

| Endpoint | Max Limit Enforced? |
|---|---|
| `GET /customers/` | No (accepts any `limit` value) |
| `GET /transactions/` | No |
| `GET /analytics/customers/` | No |
| `GET /analytics/programs/` | No |
| `GET /notifications/inbox/` | No |
| `GET /automation/` | No pagination at all |
| `GET /audit/` | Yes (`ge=1, le=500`) |

**Problem:** A client can pass `limit=999999` and dump the entire database table in one request.

**Impact:** DoS via memory exhaustion, data exfiltration.

**Remediation:** Enforce `limit = min(limit, 100)` in every list endpoint, or use a shared pagination helper.

---

### 3.3 — HIGH: Inconsistent Error Response Format

Error handling is inconsistent across endpoints:

- Some endpoints return `HttpError(400, message_string)` → Django Ninja wraps as `{"detail": "..."}`
- Some return `{"success": True/False, "message": "..."}` dict responses
- The `MessageOut` Pydantic schema is used in some places but not others
- `404` errors from `get_object_or_404` return Django's default HTML in debug mode

**Impact:** Clients cannot reliably parse error responses.

**Remediation:** Standardize all error responses to `{"error": {"code": "...", "message": "..."}}` via a custom exception handler.

---

### 3.4 — HIGH: Scanner `transact` Endpoint Wraps Process + Create in Atomic Block But Then Fires Async Tasks Outside

**File:** `backend/apps/transactions/api.py:112-160`

```python
with db_transaction.atomic():
    result = pass_obj.process_transaction(...)
    transaction = Transaction.objects.create(...)
    Customer.objects.filter(pk=pass_obj.customer.pk).update(...)

# Outside transaction:
update_tenant_analytics.apply_async(...)
fire_trigger_async(...)
trigger_pass_update.delay(...)
```

**Problem:** If the Celery tasks fire before the database transaction commits (possible with some database backends / connection pooling), the tasks may read stale data. However, since Django uses autocommit by default and `transaction.atomic()` commits when the block exits, this is likely safe in practice. The bigger concern is that if the task fires but the transaction rolls back due to an error in `Customer.objects.update()`, the task already ran with stale context.

**Impact:** Low probability but possible data inconsistency between transaction records and analytics/automation.

---

### 3.5 — MEDIUM: `GET /programs/{slug}/public/` Accepts UUID Only Despite Name Suggesting Slug

**File:** `backend/apps/cards/api.py:210-232`

```python
def public_program(request, slug: str):
    try:
        card_uuid = uuid.UUID(slug)
    except ValueError:
        raise HttpError(404, ...)
```

**Problem:** The URL parameter is named `slug` but only accepts UUIDs. This is confusing for API consumers. The docstring mentions "tenant slug + program slug" but the code only uses card UUID.

**Impact:** API usability / developer confusion.

---

### 3.6 — MEDIUM: Missing `DELETE` Return Status for Customer Deletion

**File:** `backend/apps/customers/api.py:252-263`

```python
@router.delete("/{customer_id}/", auth=jwt_auth, summary="Eliminar cliente permanentemente")
def delete_customer(request, customer_id: str):
    customer.delete()
    return {"success": True, "message": "Cliente eliminado permanentemente"}
```

**Problem:** Returns 200 with a body on DELETE. REST convention is 204 No Content. More importantly, `customer.delete()` cascades to all passes, transactions, etc. — there's no confirmation step or soft-delete option for such a destructive operation.

**Impact:** Accidental data loss.

---

### 3.7 — MEDIUM: Campaign Creation Endpoint Creates Notifications in Synchronous Loop

**File:** `backend/apps/notifications/api.py:210-230` (WhatsApp channel)

```python
for customer in audience.iterator(chunk_size=50):
    Notification.objects.create(...)
```

**Problem:** For large customer lists, this creates thousands of `Notification` objects synchronously within a single HTTP request, potentially timing out or blocking the worker.

**Impact:** Request timeout, worker exhaustion under load.

**Remediation:** Move to async task (like the email and wallet channels already do).

---

## 4. Plan Enforcement

### 4.1 — CRITICAL: `enforce_limit` and `require_feature` Decorators Are Missing From Most Endpoints

**File:** `backend/common/plan_enforcement.py`

The plan enforcement decorators exist but are **never applied** to any endpoint in the codebase:

| Endpoint | Should Have | Actually Has |
|---|---|---|
| `POST /customers/` (import) | `@enforce_limit("customers")` | Manual check only |
| `POST /customers/enroll/` | `@enforce_limit("customers")` | **None** |
| `POST /programs/` | `@enforce_limit("programs")` | Manual check only |
| `POST /locations/` | `@enforce_limit("locations")` | Manual check only |
| `POST /team/` | `@enforce_limit("users")` | **None** |
| Any automation endpoint | `@require_feature("automation")` | **None** |
| Any analytics endpoint | `@require_feature("advanced_analytics")` | **None** |
| Agent API | `@require_feature("agent_api")` | Separate auth only |

**Problem:** Customers can be enrolled without limit checks. Team members can be added beyond plan limits. Features gated by plan (automation, advanced analytics) are accessible to all plans.

**Impact:** Complete bypass of subscription plan limits. Free-tier users get enterprise features.

**Remediation:** Apply decorators to all resource-creating endpoints.

---

### 4.2 — HIGH: `get_tenant_limits` Returns Unlimited for Trial Without Plan

**File:** `backend/common/plan_enforcement.py:31-39`

```python
if not plan and subscription.is_trial_active:
    return {
        "customers": 999999,
        "programs": 999999,
        ...
    }
```

**Problem:** A trial subscription with no plan gets effectively unlimited resources. If a trial user never selects a plan, they can create 999,999 customers and programs for free.

**Impact:** Resource abuse during trial period.

---

### 4.3 — MEDIUM: `check_plan_limit` Race Condition on Usage Count

**File:** `backend/common/plan_enforcement.py:100-115`

```python
def check_plan_limit(tenant, resource: str) -> None:
    current = get_current_usage(tenant, resource)
    if current >= limit:
        raise HttpError(403, ...)
```

**Problem:** TOCTOU (Time-of-Check-Time-of-Use): Between the count check and the actual resource creation, another request can create the same resource. Two concurrent `POST /customers/enroll/` requests can both pass the limit check.

**Impact:** Plan limits can be exceeded by 1 under concurrency.

---

## 5. Multi-tenancy

### 5.1 — HIGH: `unregister_device` and `mark_notification_read` Lack Tenant Scoping

**File:** `backend/apps/notifications/api.py:76-88`

```python
@router.delete("/devices/{device_id}/", auth=jwt_auth, summary="Unregister device")
def unregister_device(request, device_id: str):
    customer = _get_customer_or_403(request)
    device = get_object_or_404(PushDevice, id=device_id)
    if device.customer.id != customer.id:
        raise HttpError(403, ...)
```

**Problem:** The `get_object_or_404(PushDevice, id=device_id)` query is **not tenant-scoped**. It fetches any device globally, then checks ownership. While the ownership check prevents cross-tenant modification, it leaks existence information (403 vs 404 reveals whether a device ID exists in another tenant).

Same pattern in:
- `mark_notification_read` (line ~134)
- `mark_notification_clicked` (line ~148)
- `delete_notification` (line ~162)

**Impact:** Information leakage about resource existence across tenants.

**Remediation:** Add tenant filter: `get_object_or_404(PushDevice, id=device_id, customer__tenant=request.tenant)`

---

### 5.2 — MEDIUM: `enroll_customer_public` Creates Pass in Card's Tenant, Not Verified

**File:** `backend/apps/customers/api.py:137-181`

The public enrollment endpoint uses `card.tenant` (from the card lookup) rather than `request.tenant` (from JWT auth — which doesn't exist since it's unauthenticated). This is by design for QR-code enrollment, but means:

1. Anyone with a card ID can create customers in that tenant
2. No verification that the person scanning the QR is the actual customer (they provide any email)

**Impact:** Customer impersonation / spam enrollment.

---

### 5.3 — LOW: `Automation.objects.filter(tenant=tenant)` in `fire_trigger` Relies on Correct Tenant

**File:** `backend/apps/automation/engine.py:24-28`

```python
if tenant is None:
    tenant = customer.tenant
matching = Automation.objects.filter(tenant=tenant, ...)
```

**Problem:** If `tenant` is explicitly passed incorrectly (e.g., from a bug in the calling code), automations from the wrong tenant could fire. The fallback to `customer.tenant` is correct, but the explicit parameter allows override.

**Impact:** Low — requires a bug in calling code.

---

## 6. Automation Engine

### 6.1 — HIGH: `max_executions_per_day` Is Never Checked

**File:** `backend/apps/automation/models.py:97-100` and `engine.py:34-49`

The `Automation` model has a `max_executions_per_day` field, but:

1. `can_execute_for_customer()` never checks it
2. `fire_trigger()` never checks it
3. The field is stored but never read in any execution path

**Impact:** Daily execution limits are completely non-functional. Automations can fire unlimited times per day.

**Remediation:**
```python
if self.max_executions_per_day:
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = AutomationExecution.objects.filter(
        automation=self, executed_at__gte=today_start
    ).count()
    if today_count >= self.max_executions_per_day:
        return False
```

---

### 6.2 — HIGH: `can_execute_for_customer` Cooldown Uses Global `last_executed`, Not Per-Customer

**File:** `backend/apps/automation/models.py:119-130`

```python
if self.last_executed and self.cooldown_hours > 0:
    cooldown_end = self.last_executed + timedelta(hours=self.cooldown_hours)
    if timezone.now() < cooldown_end:
        return False
```

**Problem:** `last_executed` is a **global** field on the Automation model — it records the last time the automation fired for **any** customer. So if customer A triggers the automation, customer B cannot trigger it for `cooldown_hours` even though B has never received it.

**Impact:** Customers are incorrectly blocked from receiving automations due to other customers' executions.

**Remediation:** Check `AutomationExecution` for the specific customer:
```python
last_for_customer = AutomationExecution.objects.filter(
    automation=self, customer=customer
).order_by("-executed_at").first()
if last_for_customer and ...:
```

---

### 6.3 — MEDIUM: Automation `execute()` Updates `last_executed` Non-Atomically

**File:** `backend/apps/automation/models.py:149-154`

```python
if success:
    self.total_executions += 1
    from django.utils import timezone
    self.last_executed = timezone.now()
    self.save(update_fields=["total_executions", "last_executed"])
```

**Problem:** `self.total_executions += 1` is a read-modify-write on the in-memory instance. Under concurrent executions, this can lose increments (classic lost update). Should use `F()` expression.

**Impact:** `total_executions` counter may be inaccurate.

**Remediation:**
```python
from django.db.models import F
Automation.objects.filter(pk=self.pk).update(
    total_executions=F("total_executions") + 1,
    last_executed=timezone.now()
)
```

---

### 6.4 — MEDIUM: No Guard Against Self-Triggering Automation Loops

**File:** `backend/apps/automation/engine.py`

If an automation's action (e.g., `SEND_NOTIFICATION`) creates a `Notification` object, and that creation somehow fires a `transaction_completed` or `customer_enrolled` trigger, it could create an infinite loop. While the current code doesn't directly show this path, there's no safeguard:

1. No depth counter in `fire_trigger`
2. No "already executing" flag on the Automation model
3. `AutomationExecution` logging happens after execution, so it can't prevent re-entry

**Impact:** Potential infinite loop if action side-effects fire triggers.

**Remediation:** Add a recursion depth parameter or an `is_executing` flag.

---

## Summary of Findings

| # | Severity | Category | Finding |
|---|---|---|---|
| 1.1 | **CRITICAL** | Race Condition | Coupon double-redemption (check outside lock) |
| 1.2 | HIGH | Race Condition | Stamp multi-cycle loss + negative quantity |
| 1.3 | HIGH | Race Condition | Discount tier float precision |
| 1.4 | MEDIUM | Race Condition | Automation cooldown TOCTOU |
| 2.1 | **CRITICAL** | Business Logic | No referral max enforcement / loop prevention |
| 2.2 | HIGH | Business Logic | Cashback/gift balance Decimal inconsistency |
| 2.3 | HIGH | Business Logic | Membership validation is a no-op |
| 2.4 | MEDIUM | Business Logic | `generate_referral_code` infinite loop risk |
| 2.5 | MEDIUM | Business Logic | Discount tier empty-list silent failure |
| 3.1 | **CRITICAL** | API Design | Public enrollment overwrites profiles, no rate limit |
| 3.2 | HIGH | API Design | No max limit enforcement on pagination |
| 3.3 | HIGH | API Design | Inconsistent error response format |
| 3.4 | HIGH | API Design | Async tasks may fire before transaction commit |
| 3.5 | MEDIUM | API Design | Slug parameter accepts UUID only |
| 3.6 | MEDIUM | API Design | DELETE returns 200, no soft-delete |
| 3.7 | MEDIUM | API Design | Sync loop for campaign notifications |
| 4.1 | **CRITICAL** | Plan Enforcement | Decorators never applied to endpoints |
| 4.2 | HIGH | Plan Enforcement | Unlimited trial without plan |
| 4.3 | MEDIUM | Plan Enforcement | TOCTOU on limit check |
| 5.1 | HIGH | Multi-tenancy | Device/notification queries not tenant-scoped |
| 5.2 | MEDIUM | Multi-tenancy | Public enrollment impersonation risk |
| 5.3 | LOW | Multi-tenancy | `fire_trigger` tenant override parameter |
| 6.1 | HIGH | Automation | `max_executions_per_day` never enforced |
| 6.2 | HIGH | Automation | Cooldown is global, not per-customer |
| 6.3 | MEDIUM | Automation | Lost update on `total_executions` |
| 6.4 | MEDIUM | Automation | No self-trigger loop guard |

**Totals:** 4 CRITICAL, 12 HIGH, 9 MEDIUM, 1 LOW

---

*End of audit report.*
