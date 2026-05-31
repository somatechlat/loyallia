# Tenants

Multi-tenant architecture. Each tenant is an isolated business account with its own users, programs, customers, and data.

## Models

- `Tenant` — business account with subscription, branding, and settings
- `Location` — physical branch/office per tenant
- `PlatformSetting` — global SaaS configuration (tax rates, trial days, feature flags)
- `AIQueryLog` — per-tenant AI assistant usage tracking

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/tenants/me/` | Current tenant profile |
| PUT | `/api/v1/tenants/me/` | Update tenant settings |
| GET | `/api/v1/tenants/me/plan-features/` | Active plan features |
| GET | `/api/v1/tenants/team/` | Team members |
| POST | `/api/v1/tenants/team/` | Invite team member |
| GET | `/api/v1/tenants/locations/` | List locations |
| POST | `/api/v1/tenants/locations/` | Create location |
| GET | `/api/v1/tenants/data-export/` | Export tenant data (GDPR/LOPDP) |
| POST | `/api/v1/tenants/delete-account/` | Schedule account deletion |

## Super Admin API

- `super_admin_api/platform.py` — Platform metrics, broadcast, mode toggle
- `super_admin_api/tenants.py` — Tenant CRUD, impersonation
- `super_admin_api/billing.py` — Plan management

## Middleware

- `TenantMiddleware` — resolves tenant from JWT claim and attaches to request

## Dependencies

- `apps.billing` (subscription status)

## Called By

- All dashboard pages (tenant context)
- Super admin panel
