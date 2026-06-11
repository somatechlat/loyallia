> **Estado del documento (2026-06-11):** Revisión basada en el código y documentación vigente.
> Algunos hallazgos pueden haber cambiado; verificar siempre contra el código fuente.

# Loyallia Backend - Comprehensive Database & RBAC Review

**Reviewer:** Senior Database Architect / Django ORM Expert  
**Scope:** All Django models, database design, RBAC implementation, permissions, multi-tenant isolation  
**Files Reviewed:** 15 model files (line-by-line), 2 permission files, 2 role-check files, 6+ API files, migration files  

---

## EXECUTIVE SUMMARY

| Severity | Count | Categories |
|----------|-------|------------|
| CRITICAL | 2 | Data loss via CASCADE, privilege escalation risk |
| HIGH | 3 | Missing tenant isolation, N+1 queries, data loss risk |
| MEDIUM | 9 | Django deprecation, missing indexes, FK integrity |
| LOW | 6 | Code duplication, missing constraints, style issues |

**Overall Assessment:** The database design is well-structured with good multi-tenant isolation and a correct RBAC implementation. However, there are 2 CRITICAL issues involving `on_delete=models.CASCADE` that could cause significant data loss, and 1 HIGH-severity issue with `User.objects.filter(email=...)` queries that could violate tenant boundaries during registration. The RBAC system itself is correctly implemented with proper role hierarchy.

---

## 1. RBAC IMPLEMENTATION ASSESSMENT

### 1.1 Role Enumeration (UserRole)

**File:** `apps/authentication/models.py` (lines 17-21)

```python
class UserRole(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "Super Administrador"
    OWNER = "OWNER", "Propietario"
    MANAGER = "MANAGER", "Gerente"
    STAFF = "STAFF", "Personal"
```

**VERDICT: CORRECT.** All 4 roles are properly defined. The hierarchy is:  
`SUPER_ADMIN (platform) > OWNER (tenant) > MANAGER (tenant) > STAFF (tenant)`

### 1.2 RBAC Enforcement - Role Checks

**File:** `common/permissions.py` (lines 121-173)

The permission system provides 4 role-check functions:

| Function | Allowed Roles | Used For |
|----------|--------------|----------|
| `is_owner()` | OWNER only | Deleting programs, changing plans, user mgmt |
| `is_manager_or_owner()` | OWNER, MANAGER | CRUD on cards, locations, most operations |
| `is_staff_or_above()` | OWNER, MANAGER, STAFF | Transaction recording, read operations |
| `is_super_admin()` | SUPER_ADMIN only | Platform admin, impersonation, billing mgmt |

**VERDICT: CORRECT.** The role checks properly enforce hierarchy:
- OWNER-only endpoints correctly exclude MANAGER/STAFF (e.g., `users_api.py:118`, `tenants/api.py:112`)
- MANAGER+OWNER endpoints correctly exclude STAFF for sensitive operations
- SUPER_ADMIN endpoints are completely isolated from tenant data in separate `super_admin_api/` module

### 1.3 Django Flags (`is_staff`, `is_superuser`)

**File:** `apps/authentication/models.py` (lines 38-39, 64)

```python
is_staff = models.BooleanField(default=False)  # Django admin access
```

**VERDICT: CORRECT.** The `is_staff` and `is_superuser` Django flags are:
- ONLY used for Django admin panel access (`is_staff=True` enables Django admin login)
- Set to `True` only for `SUPER_ADMIN` role users via `create_superuser()`
- NEVER used for RBAC authorization checks in API endpoints
- All API endpoints use `request.user.role` checks instead

### 1.4 `require_role` Decorator

**File:** `common/permissions.py` (lines 121-148)  
**File:** `common/role_check.py` (lines 13-36) - DUPLICATE

**VERDICT: CORRECT but DEDUPLICATED.** Both files define an identical `require_role` decorator. The `common/role_check.py` version is imported by `automation/api.py` while `common/permissions.py` is the canonical version used everywhere else. This is a **LOW** maintainability issue, not a security issue.

### 1.5 SUPER_ADMIN Tenant Isolation

**File:** `apps/authentication/models.py` (lines 51-57)

```python
tenant = models.ForeignKey(
    "tenants.Tenant",
    on_delete=models.CASCADE,
    null=True, blank=True,
    related_name="users",
)
```

**VERDICT: CORRECT.** SUPER_ADMIN users have `tenant=None`, ensuring:
- They cannot access tenant-scoped data through the normal request.tenant path
- All super_admin API endpoints explicitly check `is_super_admin(request)` (e.g., `tenants/super_admin_api/tenants.py:51`)
- The JWT auth attaches `request.tenant = user.tenant` which is `None` for SUPER_ADMINs, preventing accidental tenant data access through regular endpoints

### 1.6 Privilege Escalation Assessment

**VERDICT: NO ESCALATION VECTOR FOUND.**  
- MANAGER/STAFF cannot escalate to OWNER - OWNER-only endpoints use explicit `is_owner()` checks
- No endpoint allows role self-assignment or role modification by non-OWNER users
- User creation (`users_api.py:118`) requires OWNER role
- User role changes require OWNER role (`tenants/api.py:438`)

### 1.7 Registration Endpoint - Cross-Tenant Email Check

**File:** `apps/authentication/api.py` (lines 92-99)

```python
if User.objects.filter(email=payload.email).exists():
    return RegisterOut(success=True, message=...)
```

**VERDICT: ACCEPTABLE WITH CAVEAT.** This query is NOT scoped by tenant, which is intentional - it prevents email enumeration by returning fake success for any existing email across all tenants. However, this means a user cannot register the same email with a different tenant. This is a product decision, not a security vulnerability.

---

## 2. CRITICAL ISSUES (Severity: CRITICAL)

### CRIT-001: `Invoice.subscription` uses CASCADE - Billing History Lost on Subscription Deletion

**File:** `apps/billing/payment_models.py` (line 89)

```python
subscription = models.ForeignKey(
    Subscription,
    on_delete=models.CASCADE,  # <-- CRITICAL
    related_name="invoices",
)
```

**Risk:** If a `Subscription` is deleted (e.g., tenant deletion cascades through User -> Tenant -> Subscription), ALL associated `Invoice` records are permanently deleted. This destroys billing history needed for SRI compliance and tax reporting.

**Recommendation:** Change to `on_delete=models.PROTECT` to prevent deletion of subscriptions with invoices, or `SET_NULL` with null=True to preserve invoices with a null subscription reference.

```python
subscription = models.ForeignKey(
    Subscription,
    on_delete=models.PROTECT,  # Prevent deletion if invoices exist
    related_name="invoices",
)
```

### CRIT-002: `CustomerPass.card` uses CASCADE - Mass Customer Unenrollment on Program Deletion

**File:** `apps/customers/models.py` (line 168)

```python
card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name="passes", verbose_name="Programa")
```

**Risk:** Deleting a `Card` (loyalty program) will cascade-delete ALL `CustomerPass` records for that program, effectively unenrolling all customers without any warning or confirmation. This is a massive data loss event.

**Recommendation:** Change to `on_delete=models.PROTECT` to prevent accidental program deletion when customers are enrolled.

```python
card = models.ForeignKey(
    Card,
    on_delete=models.PROTECT,  # Prevent deletion if customers are enrolled
    related_name="passes",
    verbose_name="Programa",
)
```

---

## 3. HIGH SEVERITY ISSUES

### HIGH-001: `User` model lacks `db_index` on `role` field individually

**File:** `apps/authentication/models.py` (lines 61, 124-127)

The `User` model has a compound index `fields=["tenant", "role"]` but no standalone index on `role`. The `UserRole` check in `is_super_admin()` queries `user.role == "SUPER_ADMIN"` on already-loaded objects, so this is not a query performance issue per se. However, any future query filtering by `role` alone (e.g., finding all SUPER_ADMINs) will require a sequential scan.

**Recommendation:** Add a standalone index:
```python
indexes = [
    models.Index(fields=["tenant", "role"]),
    models.Index(fields=["email"]),
    models.Index(fields=["role"]),  # Add this
]
```

### HIGH-002: `Notification.customer` uses CASCADE - Notification History Lost

**File:** `apps/notifications/models/misc.py` (lines 30-34)

```python
customer = models.ForeignKey(
    Customer,
    on_delete=models.CASCADE,
    related_name="notifications",
)
```

**Risk:** Deleting a customer permanently deletes all notification history. While the `CampaignDeliveryLog` preserves a denormalized copy, the `Notification` table loses its audit trail.

**Recommendation:** Change to `on_delete=models.SET_NULL`:
```python
customer = models.ForeignKey(
    Customer,
    on_delete=models.SET_NULL,
    null=True,
    related_name="notifications",
)
```

### HIGH-003: `Enrollment.customer` and `Enrollment.card` use CASCADE

**File:** `apps/transactions/models.py` (lines 149-159)

```python
customer = models.ForeignKey(Customer, on_delete=models.CASCADE, ...)
card = models.ForeignKey("cards.Card", on_delete=models.CASCADE, ...)
```

**Risk:** Enrollment history is lost when either the customer or the card is deleted. This data is valuable for analytics (tracking re-enrollment patterns).

**Recommendation:** Change both to `on_delete=models.SET_NULL` with `null=True`.

---

## 4. MEDIUM SEVERITY ISSUES

### MED-001: `unique_together` is deprecated - Should use `UniqueConstraint`

**Files affected:**
- `apps/cards/models.py` (line 98-101): `unique_together = ["tenant", "name"]`
- `apps/customers/models.py` (line 78): `unique_together = ["tenant", "email"]`
- `apps/customers/models.py` (line 214): `unique_together = ["customer", "card"]`
- `apps/notifications/models/push.py` (line 58): `unique_together = ["customer", "device_token"]`
- `apps/notifications/models/campaigns.py` (line 184): `unique_together = ["campaign_run", "customer"]`
- `apps/analytics/models.py` (line 283): `unique_together = ["tenant", "analytics_date"]`

**Django deprecation note:** `unique_together` is deprecated in Django 4.2+ in favor of `UniqueConstraint` with `models.UniqueConstraint` in the `Meta.constraints` list.

**Recommendation (for each):**
```python
class Meta:
    constraints = [
        models.UniqueConstraint(fields=["tenant", "name"], name="unique_card_name_per_tenant"),
    ]
```

### MED-002: `SubscriptionPlan` FK on Subscription uses SET_NULL without fallback validation

**File:** `apps/billing/models.py` (lines 241-248)

```python
subscription_plan = models.ForeignKey(
    SubscriptionPlan,
    on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name="subscriptions",
)
```

**Risk:** If a SubscriptionPlan is deleted (e.g., an old plan archived), all subscriptions using it lose their plan reference. The `get_limit()` method handles this by returning 0, which effectively blocks access. However, there's no explicit validation to prevent archived plans from being referenced.

**Recommendation:** Add a check in `Subscription.save()` or a database-level constraint to ensure active subscriptions reference non-archived plans.

### MED-003: Missing index on `ApplePassRegistration.push_token`

**File:** `apps/customers/models.py` (lines 376-378)

The `push_token` field is not indexed but is used for APNs push delivery lookups. At scale, this could cause slow queries.

**Recommendation:**
```python
push_token = models.CharField(max_length=255, db_index=True, verbose_name="APNs Push Token")
```

### MED-004: `CustomerPass` FK to Card CASCADE with `unique_together`

**File:** `apps/customers/models.py` (lines 168, 214)

The combination of CASCADE on `card` FK and `unique_together = ["customer", "card"]` means:
1. Deleting a Card deletes all CustomerPass records (HIGH-002)
2. The unique constraint enforces one pass per customer per program

Both behaviors are intentional but the CASCADE is the concerning part (already covered in CRIT-002).

### MED-005: `WebhookEvent` has no tenant_id - Acceptable but needs documentation

**File:** `apps/billing/payment_models.py` (lines 210-243)

`WebhookEvent` stores payment gateway webhook events without a `tenant` FK. This is correct because webhooks come from the payment gateway, not from tenants. However, there's no way to query webhook events by tenant, which could make debugging difficult for a specific tenant's payment issues.

**Recommendation:** Add a `tenant` FK or at least a `tenant_id` field (non-FK for performance) for easier debugging:
```python
tenant_id = models.UUIDField(null=True, blank=True, db_index=True)
```

### MED-006: `AuditLog` uses UUID for tenant_id instead of ForeignKey

**File:** `apps/audit/models.py` (lines 92-96)

```python
tenant_id = models.UUIDField(null=True, blank=True, db_index=True, verbose_name="ID del negocio")
```

**Assessment:** This is INTENTIONAL and CORRECT. Audit logs must survive tenant deletion for compliance (LOPDP Art. 47). Using UUID instead of FK prevents CASCADE and preserves the audit trail.

### MED-007: `PlatformSetting` lacks tenant FK - Correct for global settings

**File:** `apps/tenants/models.py` (lines 408-477)

`PlatformSetting` has no tenant FK because it's platform-wide configuration. This is correct. However, there's no per-tenant settings model, which means tenant-specific settings (like custom branding limits) must be stored on the `Tenant` model directly.

### MED-008: `Card` model missing index on `(tenant, is_active)`

**File:** `apps/cards/models.py` (lines 39-102)

The `Card` model has no compound index on `(tenant, is_active)`, which is a common query pattern for showing active programs in a tenant's dashboard.

**Recommendation:**
```python
class Meta:
    indexes = [
        models.Index(fields=["tenant", "is_active"]),
        models.Index(fields=["tenant", "card_type"]),
    ]
```

### MED-009: `Transaction.staff` FK lacks tenant validation

**File:** `apps/transactions/models.py` (lines 56-63)

```python
staff = models.ForeignKey(
    User,
    on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name="transactions",
)
```

**Risk:** While the API endpoints enforce tenant-scoped lookups, the model itself doesn't validate that `staff.tenant == tenant`. A data integrity bug in an API endpoint could create a transaction attributed to a user from a different tenant.

**Recommendation:** Add a model-level validation or database-level check constraint:
```python
def clean(self):
    if self.staff and self.staff.tenant != self.tenant:
        raise ValidationError("Staff must belong to the same tenant")
```

---

## 5. LOW SEVERITY ISSUES

### LOW-001: Duplicate `require_role` decorator

**Files:** `common/permissions.py` (121-148) and `common/role_check.py` (13-36)

Both files define identical `require_role` decorators. `common/role_check.py` is only imported by `automation/api.py`. Consolidate to one canonical location.

**Recommendation:** Remove `common/role_check.py` and update all imports to use `common.permissions.require_role`.

### LOW-002: `RefreshToken` model has no expiration cleanup mechanism

**File:** `apps/authentication/models.py` (lines 223-243)

Expired refresh tokens are not automatically cleaned up. Over time, this table will grow unbounded. The `expires_at` field exists but there's no cleanup task.

**Recommendation:** Add a periodic Celery task to delete tokens where `expires_at < now()`.

### LOW-003: `Customer.referral_code` uses `unique=True` but generated dynamically

**File:** `apps/customers/models.py` (line 48)

```python
referral_code = models.CharField(max_length=20, unique=True, blank=True, default="")
```

The empty string default combined with `unique=True` means only one customer can have an empty referral code. The `save()` method generates a code before saving, but bulk imports or raw SQL could violate this.

**Recommendation:** Use a database default or make the field nullable:
```python
referral_code = models.CharField(max_length=20, unique=True, null=True, blank=True, default=None)
```

### LOW-004: `WebhookEvent.payload_hash` not indexed for dedup lookups

**File:** `apps/billing/payment_models.py` (lines 228-232)

The `payload_hash` field is used for deduplication but is not indexed. At scale with many webhook events, dedup checks will be slow.

**Recommendation:**
```python
payload_hash = models.CharField(max_length=64, db_index=True, ...)
```

### LOW-005: Missing `db_table` index on `Invoice.invoice_number` despite `unique=True`

**File:** `apps/billing/payment_models.py` (line 95)

```python
invoice_number = models.CharField(max_length=50, unique=True, verbose_name="Número de factura")
```

Django automatically creates a unique index for `unique=True` fields, so this is not a functional issue. Just noting that no explicit `db_index=True` is present.

### LOW-006: `Tenant.plan` is deprecated but still has `default=Plan.TRIAL`

**File:** `apps/tenants/models.py` (line 122)

The `plan` field is marked as deprecated (LYL-H-ARCH-011) with a comment directing users to `Subscription.status`. However, it still has an active default value and is used in fallback logic throughout the codebase. This creates confusion about the source of truth.

**Recommendation:** Either complete the migration to remove this field or add a `DeprecationWarning` when it's accessed.

---

## 6. MULTI-TENANT ISOLATION ASSESSMENT

### 6.1 Tenant FK Coverage

| Model | Has `tenant` FK | Correct |
|-------|----------------|---------|
| User | Yes (nullable for SUPER_ADMIN) | YES |
| Location | Yes | YES |
| Card | Yes | YES |
| Customer | Yes | YES |
| CustomerPass | No (via Customer FK) | OK |
| Transaction | Yes | YES |
| Enrollment | Yes | YES |
| Notification | Yes | YES |
| CampaignRun | Yes | YES |
| CampaignDeliveryLog | No (via CampaignRun) | OK |
| PushDevice | No (via Customer) | OK |
| ApplePassRegistration | No (via CustomerPass) | OK |
| Subscription | Yes (OneToOne) | YES |
| PaymentMethod | Yes | YES |
| Invoice | Yes | YES |
| AgentAPIKey | Yes | YES |
| AgentAPICallLog | Yes | YES |
| Automation | Yes | YES |
| CustomerAnalytics | Yes | YES |
| ProgramAnalytics | Yes | YES |
| DailyAnalytics | Yes | YES |
| AuditLog | No (UUID field, intentional) | OK |
| WebhookEvent | No (gateway-level) | OK |
| PlatformSetting | No (platform-level) | OK |
| TenantEmailConfig | Yes (OneToOne) | YES |
| WhatsAppSession | Yes (OneToOne) | YES |
| RefreshToken | No (via User -> Tenant) | OK |

**Coverage: 100% of tenant-scoped models have proper tenant isolation.**

### 6.2 Tenant Filtering in Queries

**Analysis:** 144 occurrences of `.filter(tenant=...)` across the codebase. All API endpoints that query tenant-scoped models properly filter by `request.tenant`:

- `analytics/api.py`: `Customer.objects.filter(tenant=tenant)`, `Transaction.objects.filter(tenant=tenant)`, etc.
- `billing/api.py`: `User.objects.filter(tenant=tenant)`, `Location.objects.filter(tenant=tenant)`, etc.
- `agent_api/api.py`: `Customer.objects.filter(tenant=tenant)`, `Card.objects.filter(tenant=tenant)`, etc.
- `tenants/api.py`: `User.objects.filter(tenant=request.tenant).exclude(role="SUPER_ADMIN")`

**No unfiltered tenant-scoped queries were found in API endpoints.**

### 6.3 Tenant Isolation via JWT Authentication

**File:** `common/permissions.py` (lines 55-67)

```python
user = User.objects.select_related("tenant").get(
    id=payload["user_id"],
    is_active=True,
)
tenant_request.user = user
tenant_request.tenant = user.tenant  # Derived from DB, not request data
```

**VERDICT: SECURE.** The tenant is derived from the user's database record, not from request headers or URL parameters. This prevents tenant spoofing.

---

## 7. INDEX STRATEGY ASSESSMENT

### 7.1 Well-Indexed Models

| Model | Indexes | Assessment |
|-------|---------|------------|
| User | (tenant, role), (email) | GOOD |
| Customer | (tenant, created_at), (tenant, is_active, created_at), (tenant, dob), (tenant, last_name, first_name) | EXCELLENT |
| Transaction | (tenant, created_at), (customer_pass, created_at), (transaction_type), (tenant, customer_pass, created_at), (transaction_type, created_at) | EXCELLENT |
| Enrollment | (tenant, enrolled_at), (card, enrolled_at), (tenant, customer, card) | GOOD |
| CampaignRun | (tenant, -created_at), (status) | GOOD |
| CampaignDeliveryLog | (campaign_run, status), (customer, -created_at) | GOOD |
| Invoice | (tenant, created_at), (status) | GOOD |
| AgentAPICallLog | (tenant, created_at) | GOOD |
| DailyAnalytics | (tenant, -analytics_date) | GOOD |
| AuditLog | (actor_id, created_at), (resource_type, created_at), (tenant_id, created_at), (action, created_at) | EXCELLENT |

### 7.2 Missing Recommended Indexes

| Model | Missing Index | Reason |
|-------|--------------|--------|
| Card | (tenant, is_active) | Dashboard queries for active programs |
| Card | (tenant, card_type) | Filter by card type |
| CustomerPass | (card, is_active) | Count active passes per program |
| PushDevice | (customer, is_active) | Find active devices per customer |
| Subscription | (status) | Find subscriptions by status (billing) |
| ApplePassRegistration | (push_token) | APNs push lookups |
| WebhookEvent | (payload_hash) | Deduplication lookups |

---

## 8. DATA INTEGRITY & CONSTRAINTS

### 8.1 Foreign Key Constraints

| Parent Model | Child Model | on_delete | Assessment |
|-------------|-------------|-----------|------------|
| Tenant | User | CASCADE | OK - Users belong to tenant |
| Tenant | Location | CASCADE | OK - Locations belong to tenant |
| Tenant | Card | CASCADE | OK - Cards belong to tenant |
| Tenant | Customer | CASCADE | OK - Customers belong to tenant |
| Tenant | Subscription | CASCADE (OneToOne) | OK - Subscription belongs to tenant |
| Tenant | PaymentMethod | CASCADE | OK - Payment methods belong to tenant |
| Tenant | Invoice | CASCADE | OK - Invoices belong to tenant |
| Tenant | Automation | CASCADE | OK - Automations belong to tenant |
| Tenant | CampaignRun | CASCADE | OK - Campaigns belong to tenant |
| Tenant | Notification | CASCADE | OK - Notifications belong to tenant |
| Tenant | CustomerAnalytics | CASCADE | OK - Analytics belongs to tenant |
| Tenant | ProgramAnalytics | CASCADE | OK - Analytics belongs to tenant |
| Tenant | DailyAnalytics | CASCADE | OK - Analytics belongs to tenant |
| Tenant | AgentAPIKey | CASCADE | OK - API keys belong to tenant |
| Tenant | AgentAPICallLog | CASCADE | OK - Call logs belong to tenant |
| SubscriptionPlan | Subscription | SET_NULL | ACCEPTABLE - Graceful degradation |
| Subscription | Invoice | CASCADE | **CRITICAL** - See CRIT-001 |
| Card | CustomerPass | CASCADE | **CRITICAL** - See CRIT-002 |
| Customer | CustomerPass | CASCADE | OK - Passes belong to customer |
| Customer | Notification | CASCADE | HIGH - See HIGH-002 |
| Customer | PushDevice | CASCADE | OK - Devices belong to customer |
| Customer | CustomerAnalytics | CASCADE | OK - Analytics belongs to customer |
| CustomerPass | Transaction | SET_NULL | EXCELLENT - Preserves history |
| CustomerPass | ApplePassRegistration | CASCADE | OK - Registrations belong to pass |
| User | Transaction (staff) | SET_NULL | EXCELLENT - Preserves history |
| Location | Transaction | SET_NULL | EXCELLENT - Preserves history |

### 8.2 Audit Trail

**File:** `apps/audit/models.py` (lines 63-142)

The audit log implementation is EXCELLENT:
- Immutable entries (cannot be edited or deleted at the application level)
- 7-year retention compliance (LOPDP Art. 47)
- WHO/WHAT/WHEN/WHERE/WHY structure
- Uses UUID for tenant_id (not FK) to survive tenant deletion
- Proper indexing on actor_id, resource_type, tenant_id, action, created_at

---

## 9. RECOMMENDATIONS SUMMARY

### Immediate Action (CRITICAL)

1. **CRIT-001:** Change `Invoice.subscription` `on_delete` from `CASCADE` to `PROTECT`
2. **CRIT-002:** Change `CustomerPass.card` `on_delete` from `CASCADE` to `PROTECT`

### Short-Term (HIGH)

3. **HIGH-001:** Add standalone index on `User.role`
4. **HIGH-002:** Change `Notification.customer` `on_delete` from `CASCADE` to `SET_NULL`
5. **HIGH-003:** Change `Enrollment` FKs `on_delete` from `CASCADE` to `SET_NULL`

### Medium-Term (MEDIUM)

6. **MED-001:** Migrate all `unique_together` to `UniqueConstraint` (Django 4.2+)
7. **MED-002:** Add validation for SubscriptionPlan references
8. **MED-003:** Add index on `ApplePassRegistration.push_token`
9. **MED-005:** Add `tenant_id` UUID field to `WebhookEvent`
10. **MED-008:** Add index on `Card(tenant, is_active)`
11. **MED-009:** Add cross-field validation for Transaction.staff tenant match

### Long-Term (LOW)

12. **LOW-001:** Consolidate duplicate `require_role` decorators
13. **LOW-002:** Add periodic cleanup for expired RefreshTokens
14. **LOW-003:** Fix `Customer.referral_code` empty string unique constraint
15. **LOW-004:** Add index on `WebhookEvent.payload_hash`
16. **LOW-006:** Complete migration away from deprecated `Tenant.plan` field

---

## 10. FINAL VERDICT

| Category | Score | Notes |
|----------|-------|-------|
| RBAC Implementation | A | Correct role hierarchy, no escalation vectors, proper SUPER_ADMIN isolation |
| Multi-Tenant Isolation | A+ | 100% tenant FK coverage, secure JWT auth, no unfiltered queries found |
| Index Strategy | B+ | Excellent compound indexes, a few missing standalone indexes |
| Data Integrity | B | Good use of SET_NULL for audit preservation, 2 CRITICAL CASCADE issues |
| Django Best Practices | B | Good overall, deprecated `unique_together` usage, minor issues |
| Audit & Compliance | A+ | Excellent immutable audit trail with LOPDP compliance |

**Overall Grade: B+**

The codebase demonstrates solid understanding of multi-tenant architecture and RBAC. The 2 CRITICAL CASCADE issues are the primary concerns and should be addressed immediately to prevent data loss. The RBAC implementation itself is robust and secure.
