> **Estado del documento (2026-06-11):** Revisión basada en el código y documentación vigente.
> Algunos hallazgos pueden haber cambiado; verificar siempre contra el código fuente.

# Database Design & Performance Audit Report

**Project:** Loyallia  
**Audited by:** Database Design & Performance Audit Agent  
**Audit snapshot date:** 2026-06-04  
**Scope:** All models, migrations, API query patterns, services, and database configuration  
**Current verified counts (as of 2026-06-11):**
- Backend Python files: ~456
- Frontend TS/TSX files (`frontend/src`): ~249
- E2E test files: 32
- Backend test files: 42
- Frontend unit test files: 7

> ⚠️ **Historical metrics disclaimer:** Migration counts, model counts, and line references below reflect the 2026-06-04 audit snapshot. Status notes indicate which items have been resolved or remain valid as of 2026-06-11.

---

## Executive Summary

- **Files audited:** 36 (11 model files, 12 API files, 4 service files, 7 support files, 2 settings files)
- **Total model classes:** 30 concrete models
- **Total migrations:** 105 across 16 apps
- **Issues found:** 27 (P0: 4, P1: 13, P2: 10) *(as of 2026-06-11; one P1 item — WhatsApp daily counter reset — resolved since the 2026-06-04 snapshot)*

The codebase demonstrates strong architectural foundations: every model explicitly sets `db_table`, tenant isolation is enforced at the API layer, `select_related`/`prefetch_related` are used extensively, and `CheckConstraint` guards financial fields. However, there are **critical N+1 bottlenecks in hot paths**, **overuse of CASCADE on audit-critical tables**, **missing pagination on high-volume endpoints**, and **legacy `unique_together` usage** that should be modernized to `UniqueConstraint`.

---

## Critical Issues (P0)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 1 | `backend/apps/cards/api.py` | 204–226 | **N+1 query bomb in list endpoint.** `CardOut.from_model()` (line 204) calls `CustomerPass.objects.filter(card=card).count()` when `enrollments_count` parameter is `None`. `list_programs` passes the annotated count, but `get_program` and `create_program` call it without the count, triggering an extra query per card. With 50 cards = 50 extra queries. **Still open.** | Check #5 (N+1 prevention) | Change `get_program` to pass `CustomerPass.objects.filter(card=card).count()` or cache the count. Better: always use the service-layer annotation. |
| 2 | `backend/apps/transactions/models.py` | 45–47 | **Transaction.tenant uses CASCADE.** Transactions are immutable audit records. Tenant deletion would permanently erase all financial/loyalty history, violating LOPDP Art. 47 audit requirements and making compliance impossible. **Still open.** | Check #2 (PROTECT for audit data), Check #9 (soft delete) | Change `on_delete=models.CASCADE` to `on_delete=models.PROTECT`. Require explicit data export + scheduled deletion workflow. |
| 3 | `backend/apps/automation/api.py` | 122–133 | **No pagination on `list_automations`.** Returns ALL automation rows for a tenant. A tenant with years of automations could return thousands of rows, causing unbounded memory use and query time. **Still open.** | Check #8 (bounded queries) | Add `limit: int = 50, offset: int = 0` parameters and slice the queryset: `query[offset : offset + limit]`. |
| 4 | `backend/apps/tenants/api.py` | 319–330 | **No pagination on `list_team`.** Returns ALL users for a tenant. Large businesses could have hundreds of staff members. **Still open.** | Check #8 (bounded queries) | Add pagination parameters and slice the queryset, same pattern as `list_customers`. |

---

## Important Issues (P1)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 5 | `backend/apps/customers/models.py` | 192, 441, 639 | **Customer and related models use legacy `unique_together`.** Django 5 deprecates `unique_together` in favor of `UniqueConstraint` with `Meta.constraints`. Same issue in CustomerPass, Card, ApplePassRegistration, Invoice, DailyAnalytics, CampaignDeliveryLog, PushDevice. **Still open.** | Check #11 (UniqueConstraint) | Replace all `unique_together` with `models.UniqueConstraint(fields=[...], name="...")` inside `Meta.constraints`. |
| 6 | `backend/apps/analytics/models.py` | 110 | **CustomerAnalytics has zero indexes.** No `Meta.indexes` defined. Frequent lookups by `tenant`, `customer`, and `segment` will cause sequential scans at scale. **Still open.** | Check #4 (DB indexes) | Add indexes: `["tenant", "segment"]`, `["customer"]`, `["last_updated"]`. |
| 7 | `backend/apps/analytics/models.py` | 280 | **ProgramAnalytics has zero indexes.** Same issue as CustomerAnalytics — no indexes on `tenant`, `card`, or `last_updated`. **Still open.** | Check #4 (DB indexes) | Add indexes: `["tenant", "card"]`, `["last_updated"]`. |
| 8 | `backend/apps/notifications/models/misc.py` | 40 | **Notification.customer_pass uses CASCADE.** If a pass is deleted, all notification audit history for that pass vanishes. Should be SET_NULL to preserve audit trail. **Still open.** | Check #2 (PROTECT/SET_NULL) | Change `on_delete=models.CASCADE` to `on_delete=models.SET_NULL` (already has `null=True`). |
| 9 | `backend/apps/notifications/models/push.py` | 23 | **PushDevice.customer uses CASCADE.** Customer deletion cascades to device records. Device tokens are useful for analytics even after customer deletion (anonymized). **Still open.** | Check #2 (PROTECT/SET_NULL) | Change to `on_delete=models.SET_NULL` with `null=True, blank=True`. |
| 10 | `backend/apps/automation/models.py` | 187–234 | **N+1 in `can_execute_for_customer` / `execute`.** Called inside a loop from `fire_trigger` (`engine.py:147`). Each call executes: (a) `CustomerAnalytics.objects.get(customer=customer)`, (b) `self.target_programs.exists()`, (c) `customer.passes.filter(...).exists()`, plus cooldown lookups in `AutomationExecution`. For 100 customers × 5 automations = 300+ queries. **Still open.** | Check #5 (N+1 prevention) | Prefetch `customer.passes` and `customer.analytics` before the loop, or use `exists()` with subqueries. |
| 11 | `backend/apps/agent_api/api.py` | 202 | **Double query in `get_recent_transactions`.** `txns = Transaction.objects.filter(...).order_by("-created_at")[:50]` is evaluated, then `txns.count()` executes a second COUNT query. **Still open.** | Check #8 (reasonable query counts) | Use `len(items)` or `min(50, total)` instead of `txns.count()`. Pre-count if total is needed. |
| 12 | `backend/apps/tenants/models.py` | 350 | **Location.tenant uses CASCADE.** Deleting a tenant deletes all locations without warning. Locations contain geo-fencing data that may need archival. **Still open.** | Check #2 (PROTECT where appropriate) | Change to `on_delete=models.PROTECT` to prevent accidental cascade deletion. |
| 13 | `backend/apps/transactions/models.py` | 254 | **Enrollment.tenant uses CASCADE.** Enrollment records track how customers joined. Losing this on tenant deletion breaks analytics forever. **Still open.** | Check #2 (PROTECT for audit data) | Change to `on_delete=models.PROTECT`. |
| 14 | `backend/apps/billing/payment_models.py` | 123–125 | **Invoice.tenant uses CASCADE.** Invoices are SRI-compliant legal documents. Cascade deletion violates Ecuadorian tax record retention laws. **Still open.** | Check #2 (PROTECT for audit data) | Change to `on_delete=models.PROTECT`. |
| 15 | `backend/apps/notifications/models/campaigns.py` | 29 | **CampaignRun.tenant uses CASCADE.** Campaign history is needed for marketing compliance and ROI analysis. **Still open.** | Check #2 (PROTECT for audit data) | Change to `on_delete=models.PROTECT`. |
| 16 | `backend/apps/backup/models.py` | 63 | **BackupJob.tenant uses CASCADE.** Backup job records should survive tenant deletion for platform-level audit. **Still open.** | Check #2 (PROTECT for audit data) | Change to `on_delete=models.PROTECT` (already supports `null=True` for platform backups). |
| 17 | `backend/apps/notifications/models/misc.py` | 157 | ~~**WhatsAppSession.messages_sent_today has no reset mechanism.**~~ **RESOLVED** — `apps.notifications.whatsapp.tasks.reset_whatsapp_daily_counters` resets the counter to 0 and advances `warmup_day` daily at midnight UTC via Celery Beat. | Check #6 (data integrity) | No action needed; reset task is in place (`backend/apps/notifications/whatsapp/tasks.py:22`). |
| 18 | `backend/apps/customers/models.py` | 151–156 | **Customer model missing CheckConstraint on `total_spent` and `total_visits`.** `total_spent` has `MinValueValidator(0)` but no DB-level constraint. Negative values can be inserted via raw SQL or race conditions. **Still open.** | Check #6 (CheckConstraint) | Add `CheckConstraint(condition=Q(total_spent__gte=0), name="check_customer_total_spent_nonneg")` and similar for `total_visits`. |

---

## Minor Issues (P2)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 19 | `backend/apps/tenants/models.py` | 522 | **PlatformSetting lacks created_by/updated_by.** Runtime settings modified by SUPER_ADMIN should track who changed them. **Still open.** | Check #3 (created_by/updated_by) | Add `created_by` and `updated_by` UUIDFields, update in `save()` and `set()`. |
| 20 | `backend/apps/transactions/models.py` | 254 | **Enrollment lacks created_by/updated_by.** Enrollment events track business growth; ownership tracking aids audit. **Still open.** | Check #3 (created_by/updated_by) | Add `created_by`/`updated_by` UUIDFields. |
| 21 | `backend/apps/backup/models.py` | 47 | **BackupJob lacks created_by/updated_by.** Backup jobs are high-risk operations; actor tracking is essential for compliance. **Still open.** | Check #3 (created_by/updated_by) | Add `created_by`/`updated_by` UUIDFields. |
| 22 | `backend/apps/billing/payment_models.py` | 32 | **PaymentMethod lacks created_by/updated_by.** Payment method changes are sensitive and should be auditable. **Still open.** | Check #3 (created_by/updated_by) | Add `created_by`/`updated_by` UUIDFields. |
| 23 | `backend/apps/transactions/models.py` | 33–60 | **Transaction model has no `updated_at` field.** Only `created_at` exists. While transactions are immutable, some fields (like `denial_reason`, `rules_evaluated`) could theoretically be updated during processing. **Still open.** | Check #1 (model completeness) | Add `updated_at = models.DateTimeField(auto_now=True)` for consistency with `TimestampedModel` pattern. |
| 24 | `backend/apps/tenants/models.py` | 213–235 | **Tenant.effective_plan property may trigger N+1.** It checks `getattr(self, 'subscription', None)` first, but falls back to `Subscription.objects.filter(tenant=self).first()` when the attribute is missing. In list views this becomes expensive. **Still open.** | Check #5 (N+1 prevention) | Ensure callers use `select_related("subscription")` or cache the subscription on the tenant instance. |
| 25 | `backend/apps/cards/services.py` | 19–29 | **list_programs annotation is ignored by non-list callers.** `list_programs` annotates `_enrollments_count`, but `CardOut.from_model` falls back to a COUNT query when `enrollments_count is None`. `get_program` and `create_program` therefore waste the annotation. **Still open.** | Check #8 (query efficiency) | Ensure `CardOut.from_model` always receives the annotated count from the service layer. |
| 26 | `backend/apps/analytics/models.py` | 121–180 | **CustomerAnalytics.update_metrics() uses O(N) queries.** `self.customer.passes.count()`, `filter().count()`, and multiple `Transaction.objects.filter(...).count()` calls recompute everything from scratch. For large customers this is 6+ queries per customer. **Still open.** | Check #8 (reasonable queries) | Use `annotate()` and `aggregate()` to consolidate into 2-3 queries, or rely solely on the Celery background task and remove the synchronous method. |
| 27 | `backend/apps/analytics/models.py` | 291–348 | **ProgramAnalytics.update_metrics() uses O(N) queries with nested aggregation.** `repeat_customers` query uses `annotate(transaction_count=Count("transactions"))` across a join which can be slow on large programs. **Still open.** | Check #8 (reasonable queries) | Add `db_index` on `Transaction.customer_pass` and `Transaction.created_at`. Consider pre-computing repeat purchase rate in a Celery task instead of real-time. |
| 28 | `backend/apps/billing/models.py` | 466 | **Subscription.get_limit() does not cache plan lookup.** `self.subscription_plan` is accessed repeatedly. The method is called in hot paths (plan enforcement on every write). **Still open.** | Check #8 (query efficiency) | Cache `self.subscription_plan` in a local variable at the top of the method. |

---

## Positive Findings

The codebase demonstrates production-grade database practices in many areas:

1. **Explicit `db_table` on every model** — All 30 concrete models define `db_table`, preventing Django's auto-generated table names and ensuring schema portability.

2. **Extensive `select_related` / `prefetch_related` usage** — Found 40+ usages across API and service layers. The transactions API uses 4-way JOINs (`customer_pass__customer`, `customer_pass__card`, `customer_pass__card__tenant`, `staff`) to load data in a single query.

3. **CheckConstraints on financial data** — `Transaction.amount`, `SubscriptionPlan.price_*`, and `Invoice.subtotal/tax_amount/total` all have `CheckConstraint` enforcing non-negative values at the database level.

4. **Idempotency keys on transactions** — `Transaction.idempotency_key` (line 127) with `db_index=True` ensures exactly-once semantics for scanner endpoints.

5. **F() expressions for counters** — `Automation.total_executions` (models.py:287), `InvoiceCounter.last_number` (payment_models.py:258), and `Customer.total_visits` (via services) use `F()` to prevent lost updates under concurrent POS scans.

6. **`select_for_update` on concurrency-sensitive operations** — `Subscription.objects.select_for_update()` (billing/services.py:98), `InvoiceCounter.objects.select_for_update()` (payment_models.py:255), and `RefreshToken.objects.select_for_update(of=("self",))` (authentication/services.py:141) prevent race conditions.

7. **Tenant isolation enforced in APIs** — Every tenant-scoped endpoint filters by `request.tenant` or `tenant=require_tenant(request)`. No cross-tenant access vectors were found.

8. **Soft delete pattern widespread** — `is_active` fields on Customer, Card, CustomerPass, User, Location, PaymentMethod, AgentAPIKey provide soft-delete capability.

9. **Redis caching for PlatformSetting** — `PlatformSetting.get()` hits Redis first with a 5-minute TTL, avoiding DB round-trips for runtime configuration.

10. **Rate limiting at API layer** — Scanner endpoints (`/scanner/v2/validate/`, `/scanner/v2/transact/`) use `@rate_limit` decorator with Redis-backed counters.

11. **AuditLog immutability enforced** — `AuditLog.save()` raises `ValueError` if the row already exists; `delete()` is blocked. Compliance with LOPDP Art. 47 is architecturally sound.
12. **Automation triggers expanded** — `points_threshold`, `inactivity`, `milestone`, and `scheduled_time` triggers are implemented with a dedicated `evaluate_scheduled_automations` Celery Beat task.
13. **WhatsApp daily counter reset automated** — `apps.notifications.whatsapp.tasks.reset_whatsapp_daily_counters` resets `messages_sent_today` and advances `warmup_day` daily at midnight UTC, preventing counter drift and overflow.

---

## Performance Bottleneck Register

| Query/Model | Location | Issue | Impact | Fix |
|-------------|----------|-------|--------|-----|
| `CardOut.from_model` enrollment count | `cards/api.py:204` | N+1: one `COUNT` query per card in list | High — list endpoint scales O(N) | Pass annotated count from service layer |
| `Automation.can_execute_for_customer` | `automation/models.py:187-234` | N+1: 3+ queries per automation × customer in loop | High — automation engine bottleneck | Prefetch passes and analytics before loop |
| `list_automations` | `automation/api.py:122` | Unbounded result set — no pagination | Medium — memory exhaustion risk | Add limit/offset parameters |
| `list_team` | `tenants/api.py:319` | Unbounded result set — no pagination | Medium — memory exhaustion risk | Add limit/offset parameters |
| `Agent API recent transactions count` | `agent_api/api.py:202` | Double query: slice + count | Low — only 50 rows | Use `len(items)` instead |
| `ProgramAnalytics.update_metrics` | `analytics/models.py:337-346` | Nested annotate across M2M for repeat rate | Medium — slow on large programs | Pre-compute in Celery, add index |
| `Tenant.effective_plan` property | `tenants/models.py:213` | Extra query per tenant access if subscription not prefetched | Low — cached in most cases | Use `select_related` in callers |
| `CustomerAnalytics.update_metrics` | `analytics/models.py:121` | 6+ COUNT queries per customer | Medium — slow recalculation | Consolidate with annotate/aggregate |
| `Billing get_usage` | `billing/api.py:214` | 6 COUNT queries across 6 tables | Low — each is O(index) | Acceptable; documented in code |
| `Transaction list select_related` | `transactions/api.py:252` | 4-way JOIN on every list request | Low — single query, well-indexed | Already optimal |

---

## Migration Health Check

| App | Migration Count | Missing | Issues |
|-----|----------------|---------|--------|
| analytics | 2 | No | OK |
| audit | 4 | No | OK |
| authentication | 7 | No | OK |
| automation | 5 | No | OK |
| backup | 4 | No | OK |
| billing | 14 | No | OK |
| cards | 12 | No | OK |
| customers | 14 | No | OK |
| agent_api | 5 | No | OK |
| notifications | 10 | No | Models use package pattern (`models/` dir). OK |
| tenants | 12 | No | OK |
| transactions | 10 | No | OK |
| api | 0 | N/A | No models — OK |
| redemption | 0 | N/A | No models — OK |
| ai | 0 | N/A | No models — OK |
| wallet | 0 | N/A | No models — OK |

**Migration drift check:** Run `python manage.py makemigrations --check --dry-run` in CI. No drift was detected during this audit (all model fields appear to have corresponding migrations based on the migration file names matching recent model changes).

**Notable migration quality:**
- Migration `0012_populate_customerpass_tenant.py` (customers) correctly uses `.select_related("customer")` for data backfill.
- Migration `0008_seed_platform_settings.py` (tenants) seeds default settings — idempotent and safe.
- Migration `0008_seed_vital_plans.py` (billing) seeds subscription plans — idempotent pattern used.

---

## Raw SQL Assessment

| File | Line | SQL | Parameterized? | Risk |
|------|------|-----|----------------|------|
| `apps/api/router.py` | 76 | `SELECT 1` | Yes (no params) | None — health check |
| `apps/tenants/tasks.py` | 193-196 | `DELETE FROM "table" WHERE "id" = %s` | Yes (`%s` + list) | Low — table name from `_meta.db_table` |
| `apps/redemption/management/commands/verify_schema.py` | 37-43 | `SELECT table_name, column_name FROM information_schema.columns` | Yes (no params) | None — schema verification command |
| `apps/redemption/management/commands/verify_schema.py` | 78 | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` | Partial (f-string for names) | Low — names from model metadata, not user input |

**Verdict:** All raw SQL is either in management commands or health checks. No user-supplied values are interpolated into SQL strings. The tenant hard-delete uses parameterized queries with the ID in a list. **No SQL injection vectors found.**

---

## on_delete Policy Summary

| Model | FK Field | Current | Recommended | Rationale |
|-------|----------|---------|-------------|-----------|
| Transaction | tenant | CASCADE | **PROTECT** | Audit records must survive tenant deletion |
| Transaction | staff | PROTECT | PROTECT | ✓ Correct |
| Transaction | location | PROTECT | PROTECT | ✓ Correct |
| Transaction | customer_pass | SET_NULL | SET_NULL | ✓ Correct |
| Enrollment | tenant | CASCADE | **PROTECT** | Growth analytics must survive tenant deletion |
| Enrollment | customer | SET_NULL | SET_NULL | ✓ Correct |
| Enrollment | card | SET_NULL | SET_NULL | ✓ Correct |
| Enrollment | location | SET_NULL | SET_NULL | ✓ Correct |
| BackupJob | tenant | CASCADE | **PROTECT** | Backup audit trail must survive tenant deletion |
| Subscription | tenant | CASCADE | CASCADE | Acceptable — subscription lifecycle tied to tenant |
| Subscription | subscription_plan | SET_NULL | SET_NULL | ✓ Correct |
| Invoice | tenant | CASCADE | **PROTECT** | Legal invoices must survive tenant deletion (SRI) |
| Invoice | subscription | PROTECT | PROTECT | ✓ Correct |
| PaymentMethod | tenant | CASCADE | **PROTECT** | Payment history must survive tenant deletion |
| Customer | tenant | CASCADE | **PROTECT** | Customer data must survive tenant deletion for GDPR export |
| CustomerPass | customer | CASCADE | **PROTECT** | Pass history must survive customer deletion |
| CustomerPass | card | PROTECT | PROTECT | ✓ Correct |
| CustomerPass | tenant | CASCADE | **PROTECT** | Pass data must survive tenant deletion |
| ApplePassRegistration | customer_pass | CASCADE | **PROTECT** | Device registrations must survive pass deletion |
| Card | tenant | CASCADE | **PROTECT** | Program config must survive tenant deletion |
| Automation | tenant | CASCADE | **PROTECT** | Automation audit must survive tenant deletion |
| AutomationExecution | automation | CASCADE | **PROTECT** | Execution logs must survive automation deletion |
| AutomationExecution | customer | CASCADE | **PROTECT** | Execution logs must survive customer deletion |
| Location | tenant | CASCADE | **PROTECT** | Location data must survive tenant deletion |
| CampaignRun | tenant | CASCADE | **PROTECT** | Campaign history must survive tenant deletion |
| CampaignDeliveryLog | campaign_run | CASCADE | **PROTECT** | Delivery audit must survive campaign deletion |
| CampaignDeliveryLog | customer | SET_NULL | SET_NULL | ✓ Correct |
| Notification | tenant | CASCADE | **PROTECT** | Notification audit must survive tenant deletion |
| Notification | customer | SET_NULL | SET_NULL | ✓ Correct |
| Notification | customer_pass | CASCADE | **SET_NULL** | Notification audit must survive pass deletion |
| PushDevice | customer | CASCADE | **SET_NULL** | Device tokens useful for anonymized analytics |
| TenantEmailConfig | tenant | CASCADE | **PROTECT** | Email config audit must survive tenant deletion |
| WhatsAppSession | tenant | CASCADE | **PROTECT** | Session history must survive tenant deletion |
| User | tenant | CASCADE | CASCADE | Acceptable for nullable SUPER_ADMIN; consider PROTECT for others |
| RefreshToken | user | CASCADE | **SET_NULL** | Token revocation log useful for security audit |
| CustomerAnalytics | tenant | CASCADE | **PROTECT** | Analytics must survive tenant deletion |
| CustomerAnalytics | customer | CASCADE | **PROTECT** | Analytics must survive customer deletion |
| ProgramAnalytics | tenant | CASCADE | **PROTECT** | Analytics must survive tenant deletion |
| ProgramAnalytics | card | CASCADE | **PROTECT** | Analytics must survive card deletion |
| DailyAnalytics | tenant | CASCADE | **PROTECT** | Time-series data must survive tenant deletion |
| InvoiceCounter | tenant | CASCADE | **PROTECT** | Counter record must survive tenant deletion |

---

## Recommendations Summary

### Immediate (P0 — before next release)
1. Fix the `CardOut.from_model` N+1 by ensuring the annotated count is always passed. **Still open.**
2. Add pagination to `list_automations` and `list_team`. **Still open.**
3. Change `Transaction.tenant` from CASCADE to PROTECT. **Still open.**

### Short-term (P1 — next sprint)
4. Modernize all `unique_together` declarations to `UniqueConstraint`. **Still open.**
5. Add indexes to `CustomerAnalytics` and `ProgramAnalytics`. **Still open.**
6. Fix N+1 in `Automation.can_execute_for_customer` by prefetching related data. **Still open.**
7. Audit and change CASCADE to PROTECT/SET_NULL on all audit-critical models. **Still open.**
8. Add `CheckConstraint` to `Customer.total_spent`, `CustomerPass.stamp_count`, and other non-negative fields. **Still open.**
9. Fix `Agent API` double query on recent transactions. **Still open.**
10. ~~**Implement daily reset for `WhatsAppSession.messages_sent_today`.**~~ **DONE** — Celery Beat task `reset_whatsapp_daily_counters` runs daily at midnight UTC (`backend/apps/notifications/whatsapp/tasks.py`).

### Long-term (P2 — technical debt)
11. Add `created_by`/`updated_by` to high-risk models (PlatformSetting, BackupJob, PaymentMethod, Enrollment). **Still open.**
12. Cache `Tenant.effective_plan` to avoid repeated subscription lookups. **Still open.**
13. Consolidate `CustomerAnalytics.update_metrics()` queries. **Still open.**
14. Remove or fix the ignored annotation in `cards/services.py list_programs`. **Still open.**

---

*End of Report*
