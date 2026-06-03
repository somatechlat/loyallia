# SRS-011: Wallet Pass Studio — Plan & Rate Limiting Integration

> **ISO/IEC/IEEE 29148:2018 — Software Requirements Specification**  
> Document ID: SRS-LOY-WPS-011 | Version: 1.0.0-Draft  
> **Status:** Critical — Must integrate with existing billing/plan system  
> **Date:** 2026-06-03

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Existing Plan System Analysis](#2-existing-plan-system-analysis)
3. [Wallet Pass Studio Feature → Plan Mapping](#3-wallet-pass-studio-feature--plan-mapping)
4. [New PlanFeature Constants](#4-new-planfeature-constants)
5. [New Plan Limit Fields](#5-new-plan-limit-fields)
6. [New Usage Counters](#6-new-usage-counters)
7. [New Rate Limit Rules](#7-new-rate-limit-rules)
8. [API Endpoint Decorator Mapping](#8-api-endpoint-decorator-mapping)
9. [Frontend Plan Awareness](#9-frontend-plan-awareness)
10. [Trial Limits for Wallet Pass Studio](#10-trial-limits-for-wallet-pass-studio)
11. [SuperAdmin Plan Configuration](#11-superadmin-plan-configuration)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Executive Summary

**The Rule:** ALL Wallet Pass Studio rate limiting MUST come from the **existing plan system** — `SubscriptionPlan` model, `PlanFeature` flags, and `plan_enforcement.py` decorators. No hardcoded limits. No standalone rate limiting.

**What exists:**
- `backend/apps/billing/models.py` — `SubscriptionPlan`, `Subscription`, `PlanFeature`
- `backend/common/plan_enforcement.py` — `@require_feature`, `@enforce_limit`, `@require_active_subscription`
- `backend/common/rate_limit.py` — `RateLimitMiddleware` with `RATE_LIMIT_RULES`

**What must be added:**
- 5 new `PlanFeature` constants for Wallet Pass Studio
- 4 new plan limit fields on `SubscriptionPlan`
- 4 new usage counters in `plan_enforcement.py`
- 3 new rate limit rules in `RATE_LIMIT_RULES`
- Decorators on every Wallet Pass Studio API endpoint

---

## 2. Existing Plan System Analysis

### 2.1 How It Works (Current)

```
┌─────────────────────────────────────────────────────────────┐
│  1. SUPER ADMIN creates SubscriptionPlan                     │
│     → Sets features: ["wallet_campaigns", "ai_assistant"]   │
│     → Sets limits: max_ai_queries_month=100, etc.           │
├─────────────────────────────────────────────────────────────┤
│  2. TENANT subscribes to plan                                │
│     → Subscription links to SubscriptionPlan                 │
├─────────────────────────────────────────────────────────────┤
│  3. API ENDPOINT checks access                               │
│     → @require_feature("ai_assistant") → 403 if missing     │
│     → @enforce_limit("ai_queries_month") → 403 if exceeded  │
├─────────────────────────────────────────────────────────────┤
│  4. USAGE TRACKED via COUNT queries                         │
│     → get_current_usage(tenant, "ai_queries_month")         │
│     → Counts AIQueryLog records this month                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Existing PlanFeature Constants

```python
# backend/apps/billing/models.py
class PlanFeature:
    GEO_FENCING = "geo_fencing"
    AUTOMATION = "automation"
    ADVANCED_ANALYTICS = "advanced_analytics"
    AI_ASSISTANT = "ai_assistant"          # ← We will REUSE this for AI design
    AGENT_API = "agent_api"
    PRIORITY_SUPPORT = "priority_support"
    CUSTOM_BRANDING = "custom_branding"
    DATA_EXPORT = "data_export"
    WHATSAPP_CAMPAIGNS = "whatsapp_campaigns"
    EMAIL_CAMPAIGNS = "email_campaigns"
    WALLET_CAMPAIGNS = "wallet_campaigns"  # ← Already exists for wallet pushes
    SMS_CAMPAIGNS = "sms_campaigns"
```

### 2.3 Existing Plan Limit Fields

```python
# backend/apps/billing/models.py — SubscriptionPlan
max_locations, max_users, max_customers, max_programs
max_notifications_month, max_transactions_month
max_whatsapp_day, max_emails_month, max_sms_day
max_wallet_pushes_month      # ← Already exists
max_automations, max_automation_executions_day
max_ai_queries_month         # ← We will REUSE this for AI design
max_api_calls_day, max_exports_month
```

### 2.4 Existing Rate Limit Rules

```python
# backend/common/rate_limit.py — RATE_LIMIT_RULES
("/api/v1/wallet/", "ip", 30, 60),  # ← Already exists, covers all wallet endpoints
```

### 2.5 Existing Usage Counters

```python
# backend/common/plan_enforcement.py — usage_map
"wallet_pushes_month": _count_wallet_pushes_month  # ← Already exists
"ai_queries_month": _count_monthly("AIQueryLog")   # ← Already exists
```

---

## 3. Wallet Pass Studio Feature → Plan Mapping

### 3.1 Complete Feature → Plan Matrix

| Wallet Pass Studio Feature | PlanFeature Required | Plan Limit Consumed | Rate Limit Rule |
|---------------------------|:--------------------:|--------------------:|-----------------|
| **Access Studio** | `wallet_pass_studio` | — | `/api/v1/wallet/studio/` 60/min |
| **Use System Templates** | `wallet_pass_studio` | — | Same as above |
| **Save Custom Template** | `wallet_custom_templates` | `wallet_templates` (max count) | Same as above |
| **AI Generate Template** | `ai_assistant` | `ai_queries_month` | `/api/v1/wallet/studio/ai/` 10/min |
| **AI Variations** | `ai_assistant` | `ai_queries_month` | Same as above |
| **Custom Fields** | `wallet_pass_studio` | — | Same as above |
| **Field Notifications (Apple)** | `wallet_campaigns` | `wallet_pushes_month` | Same as above |
| **Field Notifications (Google)** | `wallet_campaigns` | `wallet_pushes_month` | Same as above |
| **Pass Generation** | `wallet_pass_studio` | `wallet_pass_updates_month` | Same as above |
| **Pass Update/Push** | `wallet_campaigns` | `wallet_pushes_month` | Same as above |
| **Export .pkpass** | `data_export` | `exports_month` | Same as above |
| **Export JWT** | `wallet_pass_studio` | — | Same as above |

### 3.2 Reuse vs New

| What | Reuse Existing | Create New |
|------|---------------|------------|
| AI design generation | ✅ `AI_ASSISTANT` feature, `max_ai_queries_month` | — |
| Wallet push notifications | ✅ `WALLET_CAMPAIGNS` feature, `max_wallet_pushes_month` | — |
| Data export (.pkpass) | ✅ `DATA_EXPORT` feature, `max_exports_month` | — |
| Studio access | — | 🆕 `WALLET_PASS_STUDIO` feature |
| Custom templates | — | 🆕 `WALLET_CUSTOM_TEMPLATES` feature |
| Advanced field notifications | — | 🆕 `WALLET_ADVANCED_FIELDS` feature |
| Template count limit | — | 🆕 `max_wallet_templates` field |
| Pass update limit | — | 🆕 `max_wallet_pass_updates_month` field |

---

## 4. New PlanFeature Constants

### 4.1 Additions to `backend/apps/billing/models.py`

```python
class PlanFeature:
    # ... existing constants ...

    # WALLET PASS STUDIO FEATURES (NEW)
    WALLET_PASS_STUDIO = "wallet_pass_studio"
    """Access to the Wallet Pass Studio visual designer.
    
    Without this feature, tenants cannot:
    - Open the Wallet Pass Studio
    - Design Apple/Google Wallet passes
    - Use system templates
    - Configure fields, colors, barcode
    """

    WALLET_CUSTOM_TEMPLATES = "wallet_custom_templates"
    """Ability to save custom templates to 'My Templates' library.
    
    Without this feature, tenants can:
    - Use system templates (read-only)
    - Design passes from scratch
    
    But CANNOT:
    - Save designs as reusable templates
    - Manage template library (CRUD)
    """

    WALLET_ADVANCED_FIELDS = "wallet_advanced_fields"
    """Advanced field features: custom fields, dynamic values, notifications.
    
    Without this feature, tenants can:
    - Use default fields (name, stamps, points)
    - Basic field editing
    
    But CANNOT:
    - Add custom fields beyond defaults
    - Use dynamic value templates
    - Configure changeMessage push notifications
    - Configure Google Wallet messages
    """

    ALL_FEATURES = [
        # ... existing features ...
        WALLET_PASS_STUDIO,
        WALLET_CUSTOM_TEMPLATES,
        WALLET_ADVANCED_FIELDS,
    ]
```

### 4.2 Feature Availability by Plan Tier (Recommended)

| Feature | Free | Starter | Pro | Enterprise |
|---------|:----:|:-------:|:---:|:----------:|
| `wallet_pass_studio` | ❌ | ✅ | ✅ | ✅ |
| `wallet_custom_templates` | ❌ | ❌ | ✅ | ✅ |
| `wallet_advanced_fields` | ❌ | ❌ | ❌ | ✅ |
| `ai_assistant` | ❌ | ❌ | ✅ (50/mo) | ✅ (200/mo) |
| `wallet_campaigns` | ❌ | ✅ (100/mo) | ✅ (500/mo) | ✅ (2000/mo) |
| `data_export` | ❌ | ❌ | ✅ (10/mo) | ✅ (50/mo) |

---

## 5. New Plan Limit Fields

### 5.1 Additions to `backend/apps/billing/models.py` — SubscriptionPlan

```python
class SubscriptionPlan(TimestampedModel):
    # ... existing fields ...

    # WALLET PASS STUDIO LIMITS (NEW)
    max_wallet_templates = models.PositiveIntegerField(
        default=0,
        verbose_name="Máx. plantillas wallet",
        help_text="Maximum custom wallet templates a tenant can save. 0=unlimited (Enterprise) or disabled.",
    )
    max_wallet_pass_updates_month = models.PositiveIntegerField(
        default=0,
        verbose_name="Máx. actualizaciones wallet/mes",
        help_text="Monthly wallet pass update/push operations. 0=disabled. Protects shared issuer quota.",
    )

    # Note: AI designs reuse max_ai_queries_month (existing)
    # Note: Wallet pushes reuse max_wallet_pushes_month (existing)
    # Note: Exports reuse max_exports_month (existing)

    @property
    def limits(self) -> dict:
        return {
            # ... existing limits ...
            "wallet_templates": self.max_wallet_templates,
            "wallet_pass_updates_month": self.max_wallet_pass_updates_month,
        }
```

### 5.2 Limit Values by Plan Tier (Recommended)

| Limit | Free | Starter | Pro | Enterprise |
|-------|:----:|:-------:|:---:|:----------:|
| `max_wallet_templates` | 0 | 0 | 10 | 50 |
| `max_wallet_pass_updates_month` | 0 | 100 | 500 | 2000 |
| `max_ai_queries_month` | 0 | 0 | 50 | 200 |
| `max_wallet_pushes_month` | 0 | 100 | 500 | 2000 |
| `max_exports_month` | 0 | 0 | 10 | 50 |

---

## 6. New Usage Counters

### 6.1 Additions to `backend/common/plan_enforcement.py`

```python
def get_current_usage(tenant, resource: str) -> int:
    usage_map: dict[str, Callable] = {
        # ... existing counters ...
        
        # WALLET PASS STUDIO COUNTERS (NEW)
        "wallet_templates": lambda: _count_wallet_templates(tenant),
        "wallet_pass_updates_month": lambda: _count_wallet_pass_updates_month(tenant, month_start),
        "wallet_ai_designs_month": lambda: _count_wallet_ai_designs_month(tenant, month_start),
    }


def _count_wallet_templates(tenant) -> int:
    """Count saved custom wallet templates for a tenant.
    
    PERF: Single COUNT query on WalletTemplate model.
    """
    from apps.wallet.models import WalletTemplate  # Import at call time to avoid circular
    return WalletTemplate.objects.filter(
        tenant=tenant,
        type="user",
    ).count()


def _count_wallet_pass_updates_month(tenant, month_start) -> int:
    """Count wallet pass update/push operations this month.
    
    Tracks pass generation, updates, and push operations.
    PERF: Single COUNT query on WalletPassOperationLog.
    """
    from apps.wallet.models import WalletPassOperationLog
    return WalletPassOperationLog.objects.filter(
        tenant=tenant,
        operation_type__in=["generate", "update", "push"],
        created_at__gte=month_start,
    ).count()


def _count_wallet_ai_designs_month(tenant, month_start) -> int:
    """Count AI-generated wallet designs this month.
    
    Reuses AIQueryLog with a specific context tag.
    PERF: Single COUNT query on AIQueryLog.
    """
    from apps.tenants.models import AIQueryLog
    return AIQueryLog.objects.filter(
        tenant=tenant,
        context="wallet_studio_design",
        created_at__gte=month_start,
    ).count()
```

### 6.2 Usage Tracking Model (NEW)

```python
# backend/apps/wallet/models.py (add to existing)

class WalletPassOperationLog(models.Model):
    """Audit log for wallet pass operations (generation, update, push).
    
    Used for plan limit tracking and analytics.
    """
    OPERATION_TYPES = [
        ("generate", "Generate Pass"),
        ("update", "Update Pass"),
        ("push", "Push Update"),
        ("template_save", "Save Template"),
        ("template_apply", "Apply Template"),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    operation_type = models.CharField(max_length=20, choices=OPERATION_TYPES)
    program = models.ForeignKey("cards.Card", on_delete=models.SET_NULL, null=True)
    metadata = models.JSONField(default=dict)  # Extra context
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=["tenant", "operation_type", "created_at"]),
        ]
```

---

## 7. New Rate Limit Rules

### 7.1 Additions to `backend/common/rate_limit.py` — RATE_LIMIT_RULES

```python
RATE_LIMIT_RULES = [
    # ... existing rules (keep in order: most specific first) ...
    
    # WALLET PASS STUDIO RATE LIMITS (NEW)
    # These are REQUEST rate limits (abuse protection), NOT plan limits (quota enforcement)
    (
        "/api/v1/wallet/studio/ai/",
        "user",
        10,
        60,
    ),  # 10 AI design requests per minute per user (cost protection)
    (
        "/api/v1/wallet/studio/templates/",
        "user",
        30,
        60,
    ),  # 30 template CRUD ops per minute per user
    (
        "/api/v1/wallet/studio/generate/",
        "user",
        20,
        60,
    ),  # 20 pass generation requests per minute per user
    
    # Existing catch-all wallet rule (must come AFTER specific rules)
    ("/api/v1/wallet/", "ip", 30, 60),
    
    # ... rest of existing rules ...
]
```

### 7.2 Rate Limit vs Plan Limit — Clear Separation

| Type | Purpose | Enforced By | Response |
|------|---------|------------|----------|
| **Rate Limit** | Abuse protection (DDoS, brute force) | `RateLimitMiddleware` | 429 Too Many Requests |
| **Plan Limit** | Quota enforcement (business model) | `@enforce_limit` decorator | 403 Forbidden |
| **Feature Gate** | Tier differentiation | `@require_feature` decorator | 403 Forbidden |

**Both apply independently:**
- Rate limit → "Slow down" (try again in X seconds)
- Plan limit → "Upgrade your plan" (contact sales)

---

## 8. API Endpoint Decorator Mapping

### 8.1 Wallet Pass Studio API Endpoints

```python
# backend/apps/wallet/urls.py

from common.plan_enforcement import require_active_subscription, enforce_limit, require_feature
from common.rate_limit import rate_limit

urlpatterns = [
    # ─── STUDIO ACCESS ───
    path(
        "studio/",
        WalletStudioAccessView.as_view(),
        name="wallet-studio-access"
    ),
    # Decorators:
    #   @require_active_subscription
    #   @require_feature("wallet_pass_studio")

    # ─── TEMPLATES ───
    path(
        "studio/templates/",
        TemplateListCreateView.as_view(),
        name="template-list"
    ),
    # Decorators:
    #   @require_active_subscription
    #   @require_feature("wallet_pass_studio")
    #   POST: @enforce_limit("wallet_templates")  # only for create

    path(
        "studio/templates/<uuid:pk>/",
        TemplateRetrieveUpdateDestroyView.as_view(),
        name="template-detail"
    ),
    # Decorators:
    #   @require_active_subscription
    #   @require_feature("wallet_custom_templates")  # for update/delete

    path(
        "studio/templates/<uuid:pk>/duplicate/",
        TemplateDuplicateView.as_view(),
        name="template-duplicate"
    ),
    # Decorators:
    #   @require_active_subscription
    #   @require_feature("wallet_custom_templates")
    #   @enforce_limit("wallet_templates")

    # ─── AI DESIGN ───
    path(
        "studio/ai/generate/",
        AIGenerateTemplateView.as_view(),
        name="ai-generate-template"
    ),
    # Decorators:
    #   @require_active_subscription
    #   @require_feature("ai_assistant")
    #   @enforce_limit("ai_queries_month")
    #   @rate_limit("wallet_ai_generate", max_requests=10, window_seconds=60)

    path(
        "studio/ai/variations/",
        AITemplateVariationsView.as_view(),
        name="ai-template-variations"
    ),
    # Decorators:
    #   @require_active_subscription
    #   @require_feature("ai_assistant")
    #   @enforce_limit("ai_queries_month")

    path(
        "studio/ai/critique/",
        AIDesignCritiqueView.as_view(),
        name="ai-design-critique"
    ),
    # Decorators:
    #   @require_active_subscription
    #   @require_feature("ai_assistant")
    #   @enforce_limit("ai_queries_month")

    # ─── PASS GENERATION ───
    path(
        "studio/generate/",
        GeneratePassView.as_view(),
        name="generate-pass"
    ),
    # Decorators:
    #   @require_active_subscription
    #   @require_feature("wallet_pass_studio")
    #   @enforce_limit("wallet_pass_updates_month")

    path(
        "studio/update/",
        UpdatePassView.as_view(),
        name="update-pass"
    ),
    # Decorators:
    #   @require_active_subscription
    #   @require_feature("wallet_campaigns")
    #   @enforce_limit("wallet_pass_updates_month")
    #   @enforce_limit("wallet_pushes_month")  # if push notification

    # ─── EXPORT ───
    path(
        "studio/export/pkpass/",
        ExportPKPassView.as_view(),
        name="export-pkpass"
    ),
    # Decorators:
    #   @require_active_subscription
    #   @require_feature("data_export")
    #   @enforce_limit("exports_month")

    # ─── FIELD NOTIFICATIONS ───
    path(
        "studio/notifications/test/",
        TestFieldNotificationView.as_view(),
        name="test-field-notification"
    ),
    # Decorators:
    #   @require_active_subscription
    #   @require_feature("wallet_advanced_fields")
    #   @enforce_limit("wallet_pushes_month")
]
```

### 8.2 Decorator Application by Endpoint Type

| Endpoint Category | Required Decorators | HTTP 402 | HTTP 403 |
|-------------------|--------------------|----------|----------|
| All Studio endpoints | `@require_active_subscription` | No subscription | — |
| Studio access | `@require_feature("wallet_pass_studio")` | — | Plan doesn't include studio |
| Template CRUD | `@require_feature("wallet_custom_templates")` | — | Can't save custom templates |
| AI generation | `@require_feature("ai_assistant")` + `@enforce_limit("ai_queries_month")` | — | No AI or quota exceeded |
| Pass generation | `@require_feature("wallet_pass_studio")` + `@enforce_limit("wallet_pass_updates_month")` | — | Quota exceeded |
| Push update | `@require_feature("wallet_campaigns")` + `@enforce_limit("wallet_pushes_month")` | — | No push or quota exceeded |
| Export | `@require_feature("data_export")` + `@enforce_limit("exports_month")` | — | No export or quota exceeded |
| Advanced fields | `@require_feature("wallet_advanced_fields")` | — | No custom fields |

---

## 9. Frontend Plan Awareness

### 9.1 Plan Features Endpoint

The existing endpoint `GET /api/v1/tenants/me/plan-features/` must include Wallet Pass Studio features:

```json
{
  "plan": {
    "name": "Professional",
    "status": "active",
    "trial_days_remaining": 0
  },
  "features": {
    "wallet_pass_studio": true,
    "wallet_custom_templates": true,
    "wallet_advanced_fields": false,
    "ai_assistant": true,
    "wallet_campaigns": true,
    "data_export": true
  },
  "limits": {
    "wallet_templates": { "used": 3, "limit": 10, "remaining": 7 },
    "wallet_pass_updates_month": { "used": 45, "limit": 500, "remaining": 455 },
    "ai_queries_month": { "used": 12, "limit": 50, "remaining": 38 },
    "wallet_pushes_month": { "used": 89, "limit": 500, "remaining": 411 },
    "exports_month": { "used": 2, "limit": 10, "remaining": 8 }
  }
}
```

### 9.2 Frontend Feature Gating

```typescript
// frontend/src/hooks/usePlanFeatures.ts

interface PlanFeatures {
  walletPassStudio: boolean;
  walletCustomTemplates: boolean;
  walletAdvancedFields: boolean;
  aiAssistant: boolean;
  walletCampaigns: boolean;
  dataExport: boolean;
}

interface PlanLimits {
  walletTemplates: { used: number; limit: number; remaining: number };
  walletPassUpdatesMonth: { used: number; limit: number; remaining: number };
  aiQueriesMonth: { used: number; limit: number; remaining: number };
  walletPushesMonth: { used: number; limit: number; remaining: number };
  exportsMonth: { used: number; limit: number; remaining: number };
}

// Usage in components:
function AIButton() {
  const { features, limits } = usePlanFeatures();
  
  if (!features.aiAssistant) {
    return <LockedFeature message="Upgrade to Pro for AI design" />;
  }
  
  if (limits.aiQueriesMonth.remaining <= 0) {
    return <LimitReached message="AI quota exhausted. Resets on 1st of month." />;
  }
  
  return <button>✨ Diseñar con IA ({limits.aiQueriesMonth.remaining} left)</button>;
}

function SaveTemplateButton() {
  const { features, limits } = usePlanFeatures();
  
  if (!features.walletCustomTemplates) {
    return <LockedFeature message="Upgrade to Pro to save custom templates" />;
  }
  
  if (limits.walletTemplates.remaining <= 0) {
    return <LimitReached message="Template limit reached. Delete old templates or upgrade." />;
  }
  
  return <button>💾 Guardar como plantilla ({limits.walletTemplates.remaining} left)</button>;
}

function FieldNotificationToggle() {
  const { features } = usePlanFeatures();
  
  if (!features.walletAdvancedFields) {
    return (
      <Tooltip content="Upgrade to Enterprise for field notifications">
        <Switch disabled />
      </Tooltip>
    );
  }
  
  return <Switch />;
}
```

### 9.3 Upgrade Prompts in UI

When a user hits a limit or lacks a feature, show contextual upgrade prompts:

```
┌─────────────────────────────────────────────────────────────┐
│  ⬆️  ACTUALIZA TU PLAN                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Has usado 10/10 plantillas personalizadas.                 │
│                                                              │
│  Tu plan Profesional incluye 10 plantillas.                 │
│  Para guardar más plantillas, actualiza a Empresarial.      │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Plan Empresarial                                    │   │
│  │  ✅ Plantillas ilimitadas                           │   │
│  │  ✅ Campos avanzados con notificaciones             │   │
│  │  ✅ 200 consultas IA/mes                            │   │
│  │  │  $99/mes                                          │   │
│  │  [Actualizar ahora →]                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [Gestionar plantillas existentes]  [Cerrar]               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Trial Limits for Wallet Pass Studio

### 10.1 Trial Feature Access

Trial tenants get **generous but finite** limits:

```python
# backend/apps/billing/models.py — TRIAL_LIMITS (ADDITIONS)
TRIAL_LIMITS = {
    # ... existing trial limits ...
    "wallet_templates": 5,               # NEW: 5 custom templates
    "wallet_pass_updates_month": 50,     # NEW: 50 pass updates
    "wallet_ai_designs_month": 20,       # NEW: 20 AI designs (subset of ai_queries_month)
}
```

### 10.2 Trial Feature Flags

Trial tenants get **ALL Wallet Pass Studio features** during trial (same pattern as existing trial behavior):

```python
# In Subscription.has_feature()
if is_trial_plan and is_trial_active:
    return True  # Trial gets all features including wallet_pass_studio
```

### 10.3 Trial → Paid Transition

When trial ends:
- If no paid plan: `wallet_pass_studio` → false, studio becomes inaccessible
- If paid plan doesn't include `wallet_custom_templates`: saved templates become read-only
- If paid plan doesn't include `wallet_advanced_fields`: custom fields with notifications are disabled

---

## 11. SuperAdmin Plan Configuration

### 11.1 Plan Validation Rules

Add to `backend/apps/tenants/super_admin_api/plan_validation.py`:

```python
_FEATURE_LIMIT_RULES = {
    # ... existing rules ...
    
    # WALLET PASS STUDIO (NEW)
    "wallet_pass_studio": [],  # No required limits (boolean feature)
    "wallet_custom_templates": ["max_wallet_templates"],
    "wallet_advanced_fields": ["max_wallet_pushes_month"],  # needs push quota
}
```

### 11.2 SuperAdmin UI Changes

In the plan creation/editing wizard, add Wallet Pass Studio section:

```
┌─────────────────────────────────────────────────────────────┐
│  CONFIGURACIÓN DE WALLET PASS STUDIO                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [✓] Acceso al Wallet Pass Studio                           │
│      Permite diseñar tarjetas Apple Wallet y Google Wallet  │
│                                                              │
│  [✓] Plantillas personalizadas                              │
│      Máximo de plantillas guardadas: [ 10    ]              │
│                                                              │
│  [✓] Campos avanzados con notificaciones                    │
│      Permite campos custom, valores dinámicos, y push       │
│                                                              │
│  [✓] Diseño asistido por IA                                 │
│      (Usa el límite de consultas IA del plan)               │
│                                                              │
│  Límites de operaciones:                                    │
│  Actualizaciones de pase/mes:      [ 500   ]                │
│  Notificaciones wallet push/mes:   [ 500   ]                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Implementation Checklist

### 12.1 Backend Changes (NO CODE YET — Plan Only)

| # | File | Change | Lines |
|---|------|--------|-------|
| 1 | `apps/billing/models.py` | Add 3 `PlanFeature` constants | +3 |
| 2 | `apps/billing/models.py` | Add 2 `SubscriptionPlan` limit fields | +10 |
| 3 | `apps/billing/models.py` | Update `TRIAL_LIMITS` | +3 |
| 4 | `apps/billing/models.py` | Update `ALL_FEATURES` list | +3 |
| 5 | `apps/billing/models.py` | Update `limits` property | +2 |
| 6 | `common/plan_enforcement.py` | Add 3 usage counter lambdas | +3 |
| 7 | `common/plan_enforcement.py` | Add `_count_wallet_templates()` | +8 |
| 8 | `common/plan_enforcement.py` | Add `_count_wallet_pass_updates_month()` | +10 |
| 9 | `common/plan_enforcement.py` | Add `_count_wallet_ai_designs_month()` | +8 |
| 10 | `common/rate_limit.py` | Add 3 `RATE_LIMIT_RULES` entries | +15 |
| 11 | `apps/wallet/models.py` | Add `WalletPassOperationLog` model | +20 |
| 12 | `apps/wallet/models.py` | Add `WalletTemplate` model (if not exists) | +30 |
| 13 | `apps/wallet/urls.py` | Define endpoints with decorators | +15 |
| 14 | `apps/tenants/super_admin_api/plan_validation.py` | Add validation rules | +3 |
| 15 | `apps/tenants/api.py` | Update `/me/plan-features/` response | +5 |

### 12.2 Frontend Changes (NO CODE YET — Plan Only)

| # | File | Change |
|---|------|--------|
| 1 | `hooks/usePlanFeatures.ts` | Add Wallet Pass Studio features/limits |
| 2 | `components/wallet/studio/AIButton.tsx` | Check `aiAssistant` feature + quota |
| 3 | `components/wallet/studio/SaveTemplateModal.tsx` | Check `walletCustomTemplates` + template limit |
| 4 | `components/wallet/studio/FieldEditorModal.tsx` | Check `walletAdvancedFields` for notifications |
| 5 | `components/wallet/studio/StudioToolbar.tsx` | Show upgrade prompts when limits reached |
| 6 | `components/shared/LockedFeature.tsx` | Reusable locked feature component |
| 7 | `components/shared/LimitReached.tsx` | Reusable limit reached component |

### 12.3 Database Migration (NO CODE YET — Plan Only)

```python
# Migration: add max_wallet_templates and max_wallet_pass_updates_month
# to loyallia_subscription_plans table
# + create loyallia_wallet_pass_operation_logs table
```

---

## 13. Summary Matrix

| Component | What Changes | Files |
|-----------|-------------|-------|
| **Plan Features** | +3 constants | `billing/models.py` |
| **Plan Limits** | +2 fields | `billing/models.py` |
| **Trial Limits** | +3 entries | `billing/models.py` |
| **Usage Counters** | +3 counters | `plan_enforcement.py` |
| **Rate Limits** | +3 rules | `rate_limit.py` |
| **Audit Log** | +1 model | `wallet/models.py` |
| **API Decorators** | +15 endpoints | `wallet/urls.py` |
| **Frontend Gating** | +7 components | Various |
| **SuperAdmin** | +3 validation rules | `plan_validation.py` |

---

*End of SRS-011 — Plan & Rate Limiting Integration*
*This document MUST be integrated before any Wallet Pass Studio backend code is written*
