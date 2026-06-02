# Loyallia Plan Enforcement System

## Overview

Loyallia uses a 4-tier subscription plan system to gate features and limit resource usage. Plans are DB-driven and managed by SuperAdmin.

## Plans

| Plan | Price (mo/yr) | Description |
|------|---------------|-------------|
| Trial | $0 / $0 | 5-day trial with all features |
| Starter | $29 / $290 | Entry level, basic features only |
| Professional | $75 / $750 | Growth tier with campaigns |
| Enterprise | $149 / $1490 | All features including AI and API |

## Feature Flags

12 feature flags control access to functionality:

| Feature | Trial | Starter | Professional | Enterprise |
|---------|-------|---------|--------------|------------|
| geo_fencing | ✅ | ❌ | ✅ | ✅ |
| automation | ✅ | ❌ | ✅ | ✅ |
| advanced_analytics | ✅ | ❌ | ✅ | ✅ |
| ai_assistant | ✅ | ❌ | ❌ | ✅ |
| agent_api | ✅ | ❌ | ❌ | ✅ |
| priority_support | ✅ | ❌ | ✅ | ✅ |
| custom_branding | ✅ | ❌ | ✅ | ✅ |
| data_export | ✅ | ✅ | ✅ | ✅ |
| whatsapp_campaigns | ✅ | ❌ | ✅ | ✅ |
| email_campaigns | ✅ | ❌ | ✅ | ✅ |
| wallet_campaigns | ✅ | ❌ | ✅ | ✅ |
| sms_campaigns | ✅ | ❌ | ✅ | ✅ |

## Resource Limits Per Plan

| Resource | Trial | Starter | Professional | Enterprise |
|----------|-------|---------|--------------|------------|
| locations | 10 | 1 | 5 | 50 |
| users | 10 | 3 | 10 | 50 |
| customers | 500 | 500 | 10,000 | unlimited |
| programs | 50 | 3 | 10 | 50 |
| notifications_month | 1,000 | 1,000 | 10,000 | unlimited |
| transactions_month | 5,000 | 5,000 | 50,000 | unlimited |
| whatsapp_day | 100 | 0 | 50 | 200 |
| emails_month | 500 | 100 | 1,000 | 10,000 |
| sms_day | 50 | 0 | 50 | 500 |
| wallet_pushes_month | 200 | 0 | 500 | 10,000 |
| automations | 10 | 3 | 10 | 50 |
| automation_executions_day | 100 | 100 | 500 | 1,000 |
| ai_queries_month | 500 | 0 | 500 | 2,000 |
| api_calls_day | 1,000 | 0 | 100 | 500 |
| exports_month | 10 | 5 | 20 | 50 |

## How Enforcement Works

### Backend

Three decorator patterns in `common/plan_enforcement.py`:

1. `@require_active_subscription` — HTTP 402 if no active subscription
2. `@enforce_limit("resource")` — HTTP 403 if count >= plan limit
3. `@require_feature("feature_name")` — HTTP 403 if feature not in plan

Also two direct check functions:
- `check_plan_limit(tenant, resource, write=True)` — used inside endpoint bodies
- `check_feature_access(tenant, feature)` — used inside endpoint bodies

### Error Responses

| Condition | HTTP Status | Message |
|-----------|-------------|---------|
| No subscription | 402 | "Se requiere una suscripción activa para usar esta función." |
| Feature unavailable | 403 | "Esta función no está disponible en tu plan actual. Actualiza para acceder." |
| Limit exceeded | 403 | "Has alcanzado el límite de tu plan para {resource} ({limit}). Actualiza tu plan para continuar." |

### Frontend

The frontend fetches plan data from `GET /api/v1/tenants/me/plan-features/` and gates UI accordingly:
- Campaigns page: Channels disabled with lock icon and "Actualizar plan →" text
- Automation page: Locked state with upgrade CTA if feature unavailable
- Analytics page: Advanced sections locked if feature unavailable
- WhatsApp settings: Greyed-out card with "Disponible en planes Professional y Enterprise"

## Endpoint Enforcement Matrix

| Endpoint | Active Sub | Feature Check | Limit Check |
|----------|-----------|---------------|-------------|
| POST /automations/ | ✅ | automation | automations |
| POST /campaigns/ | ✅ | channel-specific | notifications_month + channel |
| POST /customers/ | ✅ | — | customers |
| POST /cards/ | ✅ | — | programs |
| POST /locations/ | ✅ | geo_fencing | locations |
| POST /team/ | ✅ | — | users |
| GET /analytics/ | ✅ | advanced_analytics | — |
| POST /ai-chat/ | ✅ | ai_assistant | — |

## Known Gaps (Fixed 2026-06-01)

The following gaps were identified and fixed:
- Professional plan was missing campaign features in its features array
- Automation endpoint was missing `automation` feature check
- Analytics endpoints were missing `advanced_analytics` feature check
- AI chat endpoint was missing `ai_assistant` feature check
- Location endpoint was missing `geo_fencing` feature check
- Several endpoints were missing `@require_active_subscription` decorator
- Public enrollment was not checking customer plan limit
- Frontend automation page had zero plan awareness
- Frontend analytics page had zero plan awareness
- Billing upgrade button had no onClick handler

## Testing

Run backend plan enforcement tests:
```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm test tests/test_plan_enforcement.py -v
```

## Rate Limiting (Separate System)

API request rate limiting is handled separately by `common/rate_limit.py` middleware:
- Auth endpoints: 60 req/min per IP
- General API: 200 req/min per IP
- Scanner: 120 req/min per user
- Admin: 60 req/min per IP

Plan limits are usage quotas, not request rate limits.
