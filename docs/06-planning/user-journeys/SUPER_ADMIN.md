# Super Admin Journey

Platform administrator with full system access.

## Entry Points

- `/superadmin` — SaaS Central Command dashboard
- `/superadmin/tenants` — Tenant management
- `/superadmin/plans` — Subscription plan management
- `/superadmin/metrics` — Platform analytics
- `/superadmin/settings` — Global configuration

## Key Flows

### 1. Tenant Creation
1. Navigate to `/superadmin/tenants`
2. Click "Nuevo Tenant" → opens 4-step wizard
3. Step 1: Business info (name, slug, email, phone)
4. Step 2: Plan selection + billing cycle
5. Step 3: Location(s) with map picker
6. Step 4: Review and confirm
7. API: `POST /api/v1/admin/tenants/` → creates Tenant + Subscription + Owner User
8. Email sent to tenant owner with credentials

### 2. Plan Management
1. Navigate to `/superadmin/plans`
2. Create or edit SubscriptionPlan
3. Set limits (customers, programs, locations, notifications, etc.)
4. Toggle active/featured status
5. API: `POST /api/v1/admin/plans/` or `PATCH /api/v1/admin/plans/{id}/`

### 3. Impersonation
1. Find tenant in tenant list
2. Click "Ingresar como OWNER"
3. API: `POST /api/v1/admin/tenants/{tenant_id}/impersonate/` (requires owner PIN and justification)
4. Receives temporary JWT scoped to tenant
5. Redirected to tenant dashboard
6. "Salir de impersonación" restores original session

### 4. System Operations
- **Seed demo data**: `POST /api/v1/admin/reset/platform/seed-demo-data/`
- **Factory reset**: Request OTP → Confirm → `POST /api/v1/admin/reset/platform/factory-reset/confirm/`
- **Broadcast message**: `POST /api/v1/admin/broadcast/` — not currently implemented
- **Platform mode toggle**: Development ↔ Production

## Database State Changes

| Action | Tables Affected |
|--------|----------------|
| Create tenant | `loyallia_tenants`, `loyallia_subscriptions`, `loyallia_users` |
| Update plan | `loyallia_subscription_plans` |
| Impersonate | None (token-only) |
| Factory reset | Truncates most tenant-scoped tables |

## Error Scenarios

- Duplicate owner email → 400 validation error
- Invalid plan limits → 400 Pydantic validation
- Factory reset without OTP → 403 forbidden
