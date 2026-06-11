# Owner Journey

Tenant owner. Full access to all tenant features including billing and team management.

## Entry Points

- `/` — Dashboard home
- `/programs` — Loyalty program management
- `/customers` — Customer database
- `/campaigns` — Marketing campaigns
- `/analytics` — Business analytics
- `/automation` — Rule-based automation
- `/settings` — Tenant settings
- `/billing` — Subscription and invoices
- `/team` — Team management

## Key Flows

### 1. Program Creation
1. Navigate to `/programs/new`
2. Select card type (stamp, points, cashback, etc.)
3. Configure basic fields (name, description, colors)
4. Design wallet pass (Apple/Google) via WalletDesigner
5. Set rewards and rules
6. Publish program
7. API: `POST /api/v1/programs/` → creates Card with metadata

### 2. Campaign Launch
1. Navigate to `/campaigns`
2. Click "Nueva campaña"
3. Select channel (email, SMS, WhatsApp, push)
4. Compose message with variable substitution
5. Select audience (all, segment, or specific customers)
6. Schedule or send immediately
7. API: `POST /api/v1/notifications/campaigns/` → creates CampaignRun
8. Celery dispatches to channel workers

### 3. Billing & Subscription
1. Navigate to `/billing`
2. View current usage vs plan limits
3. Select upgrade plan
4. Choose billing cycle (monthly/annual)
5. Add payment method
6. API: `POST /api/v1/billing/subscribe/`
7. Stripe webhook confirms payment

### 4. Team Management
1. Navigate to `/team`
2. Invite member by email
3. Select role (MANAGER or STAFF)
4. API: `POST /api/v1/tenants/team/`
5. Invitation email sent with signup link

## Database State Changes

| Action | Tables Affected |
|--------|----------------|
| Create program | `cards_card`, `cards_reward` |
| Launch campaign | `notifications_campaign`, `notifications_campaignrun`, `notifications_campaigndeliverylog` |
| Subscribe | `billing_subscription`, `billing_paymentmethod` |
| Invite team | `authentication_user` |

## Error Scenarios

- Plan limit exceeded → 403 with `PLAN_LIMIT_EXCEEDED`
- Feature not in plan → 403 with `PLAN_FEATURE_UNAVAILABLE`
- Subscription expired → 402 `BILLING_PLAN_REQUIRED`
