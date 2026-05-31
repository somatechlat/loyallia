# Billing

Subscription management, plan enforcement, and payment processing (Stripe-ready architecture).

## Models

- `SubscriptionPlan` — DB-driven plan definitions with limits and features
- `Subscription` — tenant subscription with trial, active, past_due, suspended states
- `Invoice` — generated invoices
- `PaymentMethod` — stored payment methods (PCI-compliant tokens)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/billing/plans/` | Available plans |
| GET | `/api/v1/billing/subscription/` | Current subscription |
| POST | `/api/v1/billing/subscribe/` | Subscribe to plan |
| GET | `/api/v1/billing/usage/` | Resource usage vs limits |
| GET | `/api/v1/billing/invoices/` | Invoice history |
| POST | `/api/v1/billing/webhook/` | Stripe webhook |

## Plan Enforcement

- `common/plan_enforcement.py` — `@enforce_limit`, `@require_feature`, `@require_active_subscription` decorators
- `Subscription.get_limit()` — resolves plan or trial limits
- `SubscriptionPlan.TRIAL_LIMITS` — centralized trial limits

## Payment Gateway

- `payment_gateway.py` — Pluggable gateway interface
- `payment_api.py` — Payment method management

## Dependencies

- `apps.tenants` (Tenant)
- Stripe (webhook-ready)

## Called By

- Dashboard billing page
- Plan selection modal
- All plan-gated endpoints (via decorators)
