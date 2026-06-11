# Billing & Payments Subsystem Guide

## 1. Overview

The Billing subsystem manages SaaS subscription lifecycle for Loyallia tenants: DB-driven pricing plans, trial periods, subscription status transitions, invoice generation with Ecuador IVA tax, payment method tokenization, and plan-limit enforcement across the platform.

It follows a **pluggable payment gateway** architecture. The default provider is `manual` (Super Admin verifies payments). The system is Stripe-ready: additional gateways can be registered via the factory.

**Key design principles:**
- Plans are **database-driven** (`SubscriptionPlan`) — not hardcoded.
- Subscription status machine: `trialing` → `active` | `past_due` → `suspended` → `canceled`.
- Plan limits enforce resource quotas (customers, users, locations, messaging, API calls, etc.).
- PCI compliance: only tokenized card references are stored; raw PANs never touch the database.

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Dashboard                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Billing API (apps.billing.api)                │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ /plans/  │  │ /subscription│  │ /usage/  │  │ /subscribe/ │ │
│  └──────────┘  └──────────────┘  └──────────┘  └─────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────┐        ┌─────────────────┐
│  Subscription │        │  SubscriptionPlan│
│   (models)    │        │    (models)      │
└───────┬───────┘        └─────────────────┘
        │
        ▼
┌───────────────┐        ┌─────────────────┐        ┌─────────────┐
│    Invoice    │        │  PaymentMethod   │        │  WebhookEvent│
│(payment_models)│       │ (payment_models) │        │(payment_models)│
└───────┬───────┘        └─────────────────┘        └─────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│         Payment Gateway Abstraction           │
│   (manual / disabled / stripe-ready)          │
└──────────────────────────────────────────────┘
```

### 2.2 Data Flow

**Trial Activation (on registration):**
1. `Tenant.objects.create(...)` → `tenant.activate_trial()` called.
2. `Subscription` created with `status=trialing`, `trial_start=now`, `trial_end=now + TRIAL_DAYS`.
3. `SubscriptionPlan` with slug `trial` may be linked (or legacy `plan="trial"`).
4. Trial users get generous finite limits from `TRIAL_LIMITS` dictionary.

**Subscription Flow:**
1. Owner selects plan + billing cycle (`monthly` or `annual`).
2. `POST /api/v1/billing/subscribe/` creates `Invoice` with `status=OPEN`.
3. Manual gateway: Super Admin marks invoice paid → `subscription.activate_paid(gateway_subscription_id)`.
4. `Subscription` transitions to `active`, billing period set.

**Plan Limit Enforcement:**
1. Any create operation calls `check_plan_limit()` or `check_feature_access()` (`common/plan_enforcement.py`).
2. These read `Subscription.get_limit(resource)` and compare against current usage.
3. Over-limit raises `HttpError(403)` with a plan-upgrade message.

---

## 3. Key Models

### `apps.billing.models.SubscriptionPlan`

DB-driven SaaS plan managed by SUPER_ADMIN.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `name` / `slug` | Char / Slug | Human and machine identifiers |
| `price_monthly` / `price_annual` | Decimal | USD; tax computed at runtime |
| `max_locations` / `max_users` / `max_customers` / `max_programs` | PositiveInteger | Hard quotas |
| `max_notifications_month` / `max_transactions_month` | PositiveInteger | Monthly quotas |
| `max_whatsapp_day` / `max_emails_month` / `max_sms_day` / `max_wallet_pushes_month` | PositiveInteger | Channel quotas; `0` = disabled |
| `max_automations` / `max_automation_executions_day` / `max_ai_queries_month` / `max_api_calls_day` / `max_exports_month` | PositiveInteger | Feature quotas |
| `max_wallet_templates` / `max_wallet_pass_updates_month` | PositiveInteger | Wallet Pass Studio quotas |
| `features` | JSONField | List of `PlanFeature` strings |
| `status` | CharField | `draft`, `published`, `archived` |
| `trial_days` | PositiveInteger | Default trial length |

**Table:** `loyallia_subscription_plans`

### `apps.billing.models.Subscription`

Per-tenant subscription state.

| Field | Type | Notes |
|-------|------|-------|
| `tenant` | OneToOne → `Tenant` | One subscription per tenant |
| `subscription_plan` | FK → `SubscriptionPlan` | Dynamic limits |
| `plan` | CharField | Legacy slug ("trial", "paid") |
| `billing_cycle` | CharField | `monthly` / `annual` |
| `status` | CharField | `trialing`, `active`, `past_due`, `suspended`, `canceled` |
| `gateway_subscription_id` | CharField | External gateway reference |
| `trial_start` / `trial_end` | DateTimeField | Trial window |
| `current_period_start` / `current_period_end` | DateTimeField | Paid billing window |
| `failed_payment_count` | SmallIntegerField | Suspend after 3 failures |
| `cancel_at_period_end` | BooleanField | Scheduled cancellation |

**Table:** `loyallia_subscriptions`

### `apps.billing.payment_models.Invoice`

Ecuador SRI-compliant invoice.

| Field | Type | Notes |
|-------|------|-------|
| `tenant` / `subscription` | FK | |
| `invoice_number` | CharField | `LYL-{slug}-{seq}` format |
| `subtotal` / `tax_rate` / `tax_amount` / `total` | Decimal | IVA computed via `calculate_amounts()` |
| `currency` | CharField | Default `USD` |
| `period_start` / `period_end` | DateTimeField | Billing period |
| `status` | CharField | `draft`, `open`, `paid`, `void`, `uncollectible` |
| `sri_authorization_number` / `sri_access_key` | CharField | Ecuador SRI e-invoice |
| `invoice_data` | JSONField | Metadata (plan slug, verification method) |

**Table:** `loyallia_invoices`

### `apps.billing.payment_models.PaymentMethod`

Tokenized payment instrument.

| Field | Type | Notes |
|-------|------|-------|
| `tenant` | FK | |
| `gateway_token` | CharField | PCI-compliant token only |
| `card_brand` / `card_last_four` / `card_exp_month` / `card_exp_year` | Display fields | |
| `is_default` / `is_active` | BooleanField | |

**Table:** `loyallia_payment_methods`

---

## 4. API Overview

All billing endpoints are mounted under `/api/v1/billing/`.

| Endpoint | Method | Auth | Role | Summary |
|----------|--------|------|------|---------|
| `/plans/` | GET | — | — | List published active plans with pricing & limits |
| `/subscription/` | GET | jwt | OWNER | Get current tenant subscription |
| `/usage/` | GET | jwt | OWNER | Current usage vs. plan limits |
| `/subscribe/` | POST | jwt | OWNER | Subscribe to a plan (creates invoice) |
| `/subscription/` | PUT | jwt | OWNER | Update billing cycle / cancel schedule |
| `/subscription/cancel/` | POST | jwt | OWNER | Cancel at period end |
| `/subscription/reactivate/` | POST | jwt | OWNER | Undo scheduled cancellation |

### Pydantic Schemas

- `SubscribeSchema`: `plan_slug`, `billing_cycle`
- `UpdateSubscriptionSchema`: `billing_cycle`, `cancel_at_period_end`

---

## 5. Integration Points

| App | Integration | Details |
|-----|-------------|---------|
| `tenants` | `Tenant` is the billing subject; `PlatformSetting` provides `TRIAL_DAYS`, `TAX_RATE_ECUADOR` | `require_tenant(request)` scopes all billing queries |
| `authentication` | Only `OWNER` can manage billing | `@require_role("OWNER")` on all mutation endpoints |
| `cards` / `customers` / `transactions` / `notifications` | Plan limits enforced via `common.plan_enforcement` | `check_plan_limit()`, `check_feature_access()`, `resolve_limit()` |
| `audit` | Super Admin plan changes and payments are auditable | `log_action()` in campaign and billing flows |
| `agent_api` | `max_api_calls_day` caps Agent API usage | Enforced in middleware or view layer |

---

## 6. Configuration

### Environment Variables / Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `PAYMENT_GATEWAY_ENABLED` | `false` (Vault) | Master switch |
| `PAYMENT_GATEWAY_PROVIDER` | `manual` | `manual`, `disabled`, or custom registered provider |
| `PAYMENT_GATEWAY_BASE_URL` | `""` | Provider API base |
| `PAYMENT_GATEWAY_LOGIN` / `PAYMENT_GATEWAY_TRAN_KEY` | Vault | Provider credentials |
| `PAYMENT_GATEWAY_WEBHOOK_SECRET` | Vault | Webhook signature verification |
| `TAX_RATE_ECUADOR` | `0.15` | Ecuador IVA rate |
| `TRIAL_DAYS` | `5` | Default trial length |

### Plan Feature Flags (`PlanFeature` class)

```python
GEO_FENCING = "geo_fencing"
AUTOMATION = "automation"
ADVANCED_ANALYTICS = "advanced_analytics"
AI_ASSISTANT = "ai_assistant"
AGENT_API = "agent_api"
PRIORITY_SUPPORT = "priority_support"
CUSTOM_BRANDING = "custom_branding"
DATA_EXPORT = "data_export"
WHATSAPP_CAMPAIGNS = "whatsapp_campaigns"
EMAIL_CAMPAIGNS = "email_campaigns"
WALLET_CAMPAIGNS = "wallet_campaigns"
SMS_CAMPAIGNS = "sms_campaigns"
WALLET_PASS_STUDIO = "wallet_pass_studio"
WALLET_CUSTOM_TEMPLATES = "wallet_custom_templates"
WALLET_ADVANCED_FIELDS = "wallet_advanced_fields"
```

### Trial Limits (`TRIAL_LIMITS`)

| Resource | Limit |
|----------|-------|
| customers | 500 |
| programs | 50 |
| locations | 10 |
| users | 10 |
| notifications_month | 1,000 |
| transactions_month | 5,000 |
| whatsapp_day | 100 |
| emails_month | 500 |
| sms_day | 50 |
| wallet_pushes_month | 200 |
| automations | 10 |
| automation_executions_day | 100 |
| ai_queries_month | 500 |
| api_calls_day | 1,000 |
| exports_month | 10 |
| wallet_templates | 5 |
| wallet_pass_updates_month | 50 |
| wallet_ai_designs_month | 20 |

---

## 7. Testing

### Test Location

- `backend/tests/test_billing.py` — Invoice, PaymentMethod, Subscription lifecycle
- `backend/tests/test_api_plan_limits.py` — Plan enforcement integration tests
- `backend/tests/test_plan_enforcement.py` — Quota calculation tests

### Running Billing Tests

```bash
cd backend
pytest tests/test_billing.py -v
pytest tests/test_plan_enforcement.py -v
```

### Key Test Patterns

```python
from tests.factories import make_tenant, make_plan, make_subscription

class InvoiceModelTest(TestCase):
    def setUp(self):
        self.tenant = make_tenant()
        self.plan = make_plan(price_monthly=Decimal("75.00"))
        self.subscription = make_subscription(self.tenant, plan=self.plan)

    def test_calculate_amounts(self):
        invoice = Invoice(
            tenant=self.tenant,
            subscription=self.subscription,
            invoice_number="LYL-CALC-00001",
            subtotal=Decimal("100.00"),
            tax_rate=Decimal("0.1500"),
        )
        invoice.calculate_amounts()
        self.assertEqual(invoice.tax_amount, Decimal("15.00"))
        self.assertEqual(invoice.total, Decimal("115.00"))
```

### What to Test

| Area | Suggestion |
|------|------------|
| Trial | `activate_trial()` sets correct end date; `is_trial_active` property accurate |
| Status transitions | `record_payment_failure()` moves `active` → `past_due` → `suspended` |
| Invoice | `generate_invoice_number()` is sequential per tenant; `calculate_amounts()` rounds correctly |
| Plan limits | `get_limit()` returns `TRIAL_LIMITS` during trial, plan values when paid |
| Features | `has_feature()` returns `True` for all features during trial; plan-gated afterwards |
| Gateway | Register a mock gateway and verify factory selection |

---

## 8. Troubleshooting

### Issue: Tenant cannot access platform after registration
- Verify `Subscription` row exists for the tenant (created during `tenant.activate_trial()`).
- Check `subscription.is_access_allowed` — requires `trialing` with active trial OR `active` paid status.
- If `trial_end` is in the past, the tenant needs to subscribe.

### Issue: Plan limits returning 0
- Ensure `subscription.subscription_plan` is set (not just legacy `plan` field).
- If the plan slug is `trial` but not a real `SubscriptionPlan` record, `TRIAL_LIMITS` applies only during active trial.
- Check `Subscription.effective_plan` returns a valid plan object.

### Issue: Invoice tax calculation off by one cent
- `calculate_amounts()` uses `Decimal.quantize(Decimal("0.01"))` — ensure inputs are `Decimal`, not `float`.
- Ecuador IVA is 15%; verify `TAX_RATE_ECUADOR` setting.

### Issue: Payment gateway not found
- Verify `PAYMENT_GATEWAY_ENABLED` is `true` in Vault.
- Built-in providers are `manual` and `disabled`; custom providers must be registered via `register_gateway()`.
- `PAYMENT_GATEWAY_BASE_URL`, `PAYMENT_GATEWAY_LOGIN`, `PAYMENT_GATEWAY_TRAN_KEY`, and `PAYMENT_GATEWAY_WEBHOOK_SECRET` are only relevant for custom gateways.

### Issue: Webhook duplicate processing
- `WebhookEvent.event_id` has a unique constraint; `payload_hash` is stored but not unique.
- Verify webhook handler checks `WebhookEvent.objects.filter(event_id=...).exists()` before processing.

### Issue: Cancel subscription fails
- If `gateway_subscription_id` is set, the gateway's `cancel_subscription()` is called first.
- Payment gateway errors are logged but do not block the DB cancellation.

---

## Reference Files

| File | Purpose |
|------|---------|
| `apps/billing/models.py` | `SubscriptionPlan`, `Subscription`, `SubscriptionStatus`, `TRIAL_LIMITS` |
| `apps/billing/payment_models.py` | `Invoice`, `PaymentMethod`, `WebhookEvent` |
| `apps/billing/api.py` | Billing API router |
| `apps/billing/payment_gateway.py` | `BasePaymentGateway`, `ManualGateway`, `DisabledGateway`, factory |
| `apps/billing/service.py` | `BillingService` helper logic |
| `common/plan_enforcement.py` | `check_plan_limit()`, `resolve_limit()`, `usage_pct()`, `get_current_usage()` |
