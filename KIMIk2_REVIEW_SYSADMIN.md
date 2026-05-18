# SysAdmin / SuperAdmin API - Comprehensive Security Review

**Reviewer:** KIMI-K2 (Backend Security Audit)
**Scope:** All Super Admin API endpoints, management commands, tenant creation, impersonation, factory reset, plan management, and platform settings.
**Date:** 2025-01-21
**Files Reviewed:** 14 files, ~2,800 lines of code

---

## EXECUTIVE SUMMARY

| Category | Rating | Notes |
|----------|--------|-------|
| Authorization | STRONG | All endpoints properly gated behind `jwt_auth` + `_require_super_admin()` |
| Input Validation | STRONG | Pydantic schemas + `validate_plan_config()` + key-specific validators |
| Audit Logging | GOOD | Audit entries for impersonation, factory reset, payments, plan changes |
| Sensitive Data Protection | STRONG | Secrets redacted in responses; Vault isolation for credentials |
| Factory Reset Safety | STRONG | OTP-gated + production-blocked + SUPER_ADMIN preserved |
| Impersonation Security | VERY STRONG | PIN-gated + rate-limited + lockout + 60-min token expiry + audit |
| Tenant Creation | GOOD | Transaction-wrapped, capacity checks, but minor schema gaps |
| Plan Management | STRONG | Feature/limit consistency validation, active-subscription guards |

**Overall Risk Assessment: LOW RISK**
The SysAdmin API is well-architected with defense-in-depth. No critical vulnerabilities found. Several minor recommendations identified.

---

## 1. TENANT CREATION FLOW (`tenants.py::create_tenant`)

### 1.1 Input Validation

**Status: GOOD**

- Email uniqueness checked before transaction: `User.objects.filter(email=payload.owner_email).exists()` (line 110)
- Plan existence validated: `SubscriptionPlan.objects.filter(slug=payload.plan_slug).first()` (line 118)
- Plan active status enforced: `if not plan_obj.is_active` (line 124)
- Plan capacity check (LYL-H5): `PlatformSetting.get_int(f"PLAN_CAPACITY_{plan_obj.slug.upper()}", 0)` (line 134)
- Trial days capped: derived from `plan_obj.trial_days` (line 140)

**Finding [LOW]:** No validation on `billing_cycle` value - only "monthly" or "annual" should be accepted.
```python
# Line 189: billing_cycle=payload.billing_cycle  # No validation
# Should validate: payload.billing_cycle in ("monthly", "annual")
```

**Finding [LOW]:** No email format validation on tenant's `email` field (separate from `owner_email` which uses `EmailStr`).
```python
# Line 155: email=payload.email  # Plain str, not EmailStr
```

**Finding [LOW]:** No validation on `locations` list being non-empty. A tenant with zero locations may cause issues downstream.

### 1.2 Owner User Creation

**Status: STRONG**

- Role correctly set: `role=UserRole.OWNER` (line 167)
- Tenant association: `tenant=tenant` (line 168)
- Uses `UserManager.create_user()` which properly hashes password via `set_password()` (line 162-169)
- `secrets.token_urlsafe(8)` generates a 12-character URL-safe password (8 bytes = ~11 chars base64)

**Finding [INFO]:** The `temp_password` is returned in the API response (line 237) AND sent via email. This is acceptable for the initial creation flow but should be noted that the response contains a credential.

### 1.3 Subscription Creation

**Status: STRONG**

- Subscription status correctly set: `TRIALING` for trial plan, `ACTIVE` otherwise (line 182)
- Trial period properly bounded: `trial_start`/`trial_end` set for trials (lines 191-192)
- Billing period set: 365 days for annual, 30 for monthly (line 194)
- `current_period_start`/`current_period_end` correctly set for non-trial subscriptions

### 1.4 Welcome Email Security

**Status: GOOD**

- Email sent via `transaction.on_commit()` ensuring tenant exists before email fires (line 222)
- Contains login URL, email, and temp password
- `fail_silently=False` on email send - will raise on failure (line 217)
- Wrapped in try/except with logging (line 219-220)
- `from_email=None` uses Django default (line 215)

**Finding [LOW]:** Email body includes plaintext password. While necessary for initial onboarding, consider adding a "must change password on first login" flag.

### 1.5 RUC/Cedula Validation

**Status: STRONG**

- Tenant model has `validate_ruc()` and `validate_cedula()` validators (models.py lines 20-49)
- Module-10 checksum verification for cedula
- Entity type conditional validation in `clean()`: cedula required for natural, RUC for juridica

---

## 2. IMPERSONATION FLOW (`impersonation.py`)

### 2.1 Authorization

**Status: VERY STRONG**

- Requires SUPER_ADMIN role: `_require_super_admin(request)` (line 63)
- Targets only OWNER users: `User.objects.get(tenant=tenant, role=UserRole.OWNER, is_active=True)` (line 67)
- Cannot impersonate arbitrary users - only the tenant OWNER

### 2.2 PIN Verification

**Status: VERY STRONG**

- 3-attempt lockout: `MAX_PIN_ATTEMPTS = 3` (line 27)
- 15-minute lockout: `LOCKOUT_SECONDS = 900` (line 26)
- Per-admin+target caching: `cache_key = f"impersonate_fails:{request.user.id}:{owner.id}"` (line 74)
- PIN checked via Argon2 hash comparison: `owner.verify_security_pin()` (line 99)
- Owner must have PIN set: `if not owner.has_security_pin` (line 89)

### 2.3 Impersonation Token

**Status: STRONG**

- 60-minute expiry: `exp = int((now + timedelta(minutes=60)).timestamp())` (line 119)
- Explicit impersonation markers in JWT payload:
  - `"impersonated_by": str(request.user.id)` (line 121) - traces back to SUPER_ADMIN
  - `"impersonated": True` (line 122) - flag for middleware detection
- Standard JWT signed with `settings.JWT_SECRET_KEY` (line 124)

**Finding [LOW]:** No explicit token revocation mechanism. The 60-minute expiry mitigates this, but there's no way to force-terminate an active impersonation session early.

### 2.4 Audit Logging

**Status: STRONG**

- Every attempt logged: success, invalid PIN, lockout, missing PIN (lines 76-139)
- Uses `_audit_impersonation()` helper which calls `log_action()` with `AuditAction.IMPERSONATE`
- Includes tenant ID, justification, and reason in audit entry
- `logger.warning()` on successful impersonation (line 133-138)

### 2.5 Justification

**Status: GOOD**

- Minimum 10 characters: `justification: str = Field(..., min_length=10)` (schemas.py line 196)
- Stored in audit log (line 53)

---

## 3. FACTORY RESET FLOW (`platform_reset.py`)

### 3.1 Production Environment Check

**Status: STRONG**

- Both `seed_demo_data()` and `factory_reset_confirm()` check `_is_production_environment()` (lines 55, 183)
- `_is_production_environment()` reads from `PlatformSetting` key "PLATFORM_MODE" (line 37-38)
- Returns HTTP 403 with `ADMIN_FACTORY_PRODUCTION_BLOCKED` message if production

**Note:** `factory_reset_request()` (OTP request step) does NOT block production - intentional, as the confirm step will block. This allows viewing the UI in production but prevents execution.

### 3.2 OTP Verification

**Status: STRONG**

- Two-step flow: `factory_reset_request()` sends OTP, `factory_reset_confirm()` validates it
- SID stored in Redis with 5-min TTL: `cache.set(f"factory_reset:sid:{request.user.email}", result.get("sid", ""), timeout=300)` (line 121)
- OTP validated via `check_otp()` (line 195)
- Rate limiting handled by OTP service (max 3 attempts per hour)
- Constant-time comparison in LocalOTPStrategy: `hmac.compare_digest(stored, code)` (otp_service.py line 278)

### 3.3 Data Wipe Order

**Status: STRONG**

- Atomic transaction wrapper (line 214)
- Correct deletion order: deepest dependencies first (FK-safe)
  1. Notifications, CampaignDeliveryLog, CampaignRun
  2. AutomationExecution, Automation
  3. CustomerPass, Enrollment, Transaction
  4. Customer, Card
  5. Invoice, WebhookEvent, Subscription
  6. RefreshToken, Location
  7. User (excluding SUPER_ADMIN), Tenant

**Critical Finding [MEDIUM]:** The wipe does NOT delete the following tables:
- `AuditLog` (intentionally preserved for audit trail - CORRECT)
- `PlatformSetting` (intentionally preserved - CORRECT)
- `SubscriptionPlan` (intentionally preserved - CORRECT)
- `Scheduled Celery tasks` (not mentioned)
- `Redis sessions other than cache.clear()` (cache is cleared)

### 3.4 SUPER_ADMIN Preservation

**Status: CORRECT**

- Line 241: `User.objects.exclude(role=UserRole.SUPER_ADMIN).delete()` - Only non-SUPER_ADMIN users deleted
- SUPER_ADMIN account(s) survive the reset

### 3.5 Post-Reset Actions

**Status: GOOD**

- Re-seeds subscription plans: `call_command("seed_subscription_plans")` (line 247)
- Re-seeds platform settings: `call_command("seed_platform_settings")` (line 248)
- Flushes Redis cache: `cache.clear()` (line 254)
- Audit logged BEFORE wipe (lines 199-212) - intentional so log is created before deletion

### 3.6 Audit Logging

**Status: GOOD**

- Factory reset audited with `AuditAction.FACTORY_RESET` (line 205)
- Demo seed audited with `AuditAction.SEED_DEMO` (line 69)
- Includes triggered_by email in details

### 3.7 Secondary Email Notification

**Status: GOOD**

- Factory reset OTP is sent via both SMS (primary) and email (secondary) (lines 124-154)
- For Verify strategy: sends confirmation that code was sent
- For Local strategy: sends actual code via email (different from SMS)
- `fail_silently=True` on email (line 148) - won't fail the request if email breaks

---

## 4. PLAN MANAGEMENT (`platform_plans.py`)

### 4.1 Plan Creation

**Status: STRONG**

- SUPER_ADMIN only (line 43)
- Full validation: `validate_plan_config(payload.model_dump())` (line 44)
- Price stored as `Decimal` (lines 49-50)
- All limit fields explicitly set (lines 51-70)
- Logger records: `logger.info("SUPER_ADMIN %s created plan %s", ...)` (line 72)

### 4.2 Plan Update

**Status: STRONG**

- Validates changed fields: `validate_plan_config(candidate, changed_fields=set(updates))` (line 116)
- Incremental updates: only changed fields are saved (lines 118-157)
- Prevents partial update inconsistencies

### 4.3 Plan Deletion

**Status: STRONG**

- Soft delete only: `plan.is_active = False; plan.status = SubscriptionPlan.Status.ARCHIVED` (lines 98-100)
- Active subscription guard: blocks if any TRIALING or ACTIVE subscriptions exist (lines 84-96)
- Returns 409 Conflict with count of active subscriptions

### 4.4 Plan Validation (`plan_validation.py`)

**Status: STRONG**

- Unknown feature rejection: checks against `PlanFeature.ALL_FEATURES` (lines 28-35)
- Feature/limit consistency: if feature enabled, limit > 0; if disabled, limit = 0 (lines 41-61)
- WhatsApp hard cap: `max_whatsapp_day` cannot exceed 200 (lines 64-71)
- Incremental validation: only validates changed fields on patch (line 43)

---

## 5. PLATFORM SETTINGS (`platform.py`)

### 5.1 Settings Listing

**Status: STRONG**

- Secrets redacted: values for keys matching sensitive tokens are returned as `"<redacted>"` (lines 520-526)
- Sensitive token list comprehensive: SECRET, PASSWORD, TOKEN, PRIVATE_KEY, API_KEY, CLIENT_SECRET, TRAN_KEY, CERT, CREDENTIAL (lines 54-64)
- `_is_sensitive_platform_setting_key()` does case-insensitive substring match (line 82-84)

### 5.2 Settings Update

**Status: STRONG**

- Blocks secret-like keys: raises 400 if key matches sensitive tokens (lines 540-547)
- Requires Vault endpoint for secrets: error message directs to Vault integration settings
- `get_or_create` pattern handles new settings gracefully (lines 549-559)

### 5.3 Platform Mode Toggle

**Status: STRONG**

- SUPER_ADMIN only (line 108)
- Validated to "development" or "production" via `PlatformModeToggleIn` schema (schemas.py lines 418-423)
- Audit logged (lines 122-136)
- Affects `_is_production_environment()` which gates factory reset and demo seed

### 5.4 Integration Secret Management

**Status: VERY STRONG**

- `update_integration_secret()` (lines 404-451)
- Whitelist-based key validation: only keys in `ALLOWED_INTEGRATION_KEYS` accepted (lines 414-422)
- Key-specific normalization and validation in `normalize_and_validate_vault_secret()` (integration_config.py lines 125-232)
  - Google service account JSON validated + required fields checked
  - Apple PEM certificates cryptographically validated
  - Twilio SIDs format-validated (regex patterns)
  - Boolean keys forced to "true"/"false"
  - Backup config values validated (frequency, retention, cron hour)
- Stored in HashiCorp Vault, never in database (line 425)
- Audit logged with integration + key name (lines 429-439)
- Secret value NEVER logged or returned (line 408 comment)

---

## 6. BILLING MANAGEMENT

### 6.1 Manual Payment Confirmation (`billing.py`)

**Status: STRONG**

- SUPER_ADMIN only (line 35)
- Row-level locking: `Invoice.objects.select_for_update().select_related("subscription", "tenant")` (line 43)
- Idempotent guard: raises 400 if already paid (line 47)
- Atomic transaction (line 41)
- Audit logged with invoice details (lines 51-69)

**Finding [LOW]:** Duplicate endpoint exists: `/billing/confirm-payment/{invoice_id}/` in `billing.py` (line 30) AND `/platform/billing/confirm-payment/{invoice_id}/` in `platform.py` (line 455). Both have identical logic. This should be consolidated.

### 6.2 MRR Calculation

**Status: ACCEPTABLE**

- `platform_metrics()` calculates MRR as paid invoices over 60 days / 2 (lines 150-158)
- This is an approximation, not true MRR (doesn't account for annual plans, upgrades, downgrades)
- Acceptable for dashboard display purposes

---

## 7. MANAGEMENT COMMANDS

### 7.1 `seed_test_data.py`

**Status: STRONG**

- Environment guard: `enforce_settings_environment(mode="development")` (line 69)
- DEBUG check: `if not settings.DEBUG: raise CommandError(...)` (line 70-71)
- Requires `--password` argument (lines 113-117) - no hardcoded passwords
- Preserves operational infrastructure on wipe (lines 77-108):
  - Operational plan slugs preserved
  - SUPER_ADMIN account preserved (`admin@loyallia.com`)
- Uses `get_or_create` for idempotency (line 147)

### 7.2 `seed_development_data.py`

**Status: STRONG**

- Chained command that calls `provision_development_rbac_test_users` then `seed_platform_settings`
- Same environment guards (lines 15-17)

### 7.3 `seed_platform_settings.py`

**Status: GOOD**

- Idempotent: uses `get_or_create` (line 47)
- Sets PLATFORM_MODE to "production" by default (line 34)

### 7.4 `seed_subscription_plans.py`

**Status: GOOD**

- Idempotent: uses `get_or_create` by slug (lines 122-125)
- Creates 4 default plans: Trial, Starter, Professional, Enterprise
- Trial plan has ALL_FEATURES (line 38)
- Realistic limits set for each tier

### 7.5 `provision_development_rbac_test_users.py`

**Status: STRONG**

- Environment guard + DEBUG check (lines 69-71)
- Generates strong password: `secrets.token_urlsafe(24)` (line 78)
- Sets Twilio test mode in Vault: `put_secret("twilio_use_test_mode", "true")` (line 91)
- E2E users with clearly identifiable emails (`e2e-*@loyallia.com`)
- Credential file written with `chmod(0o600)` (line 209)
- Reads WhatsApp bridge key from runtime file if available (lines 201-203)

**Finding [LOW]:** `--password-file` default path `../frontend/.auth/e2e-credentials.json` is outside the backend directory. The `.auth` directory may not be gitignored by default.

---

## 8. SECURITY ISSUES & RECOMMENDATIONS

### Critical: None

### Medium Severity

| # | Issue | Location | Recommendation |
|---|-------|----------|----------------|
| M1 | Duplicate payment confirmation endpoint | `billing.py:30` + `platform.py:455` | Remove one; consolidate to single endpoint |
| M2 | No explicit impersonation token revocation | `impersonation.py:119-124` | Add a `/impersonation/revoke/` endpoint that blacklists active impersonation tokens in Redis |
| M3 | Tenant creation response includes temp_password | `tenants.py:237` | Consider removing from response body; it's already sent via email |

### Low Severity

| # | Issue | Location | Recommendation |
|---|-------|----------|----------------|
| L1 | `billing_cycle` not validated | `tenants.py:189` | Add enum validation: `billing_cycle in ("monthly", "annual")` |
| L2 | Tenant `email` not validated as EmailStr | `schemas.py:116` | Change `email: str` to `email: EmailStr` |
| L3 | Locations list can be empty | `tenants.py:170` | Add `min_length=1` to `locations` field or validate |
| L4 | No "must change password" flag for new owners | `tenants.py:161-168` | Add `must_change_password=True` field on User model |
| L5 | E2E credential file path outside backend | `provision_development_rbac_test_users.py:59` | Ensure `.auth/` is in `.gitignore` |
| L6 | `PlatformModeToggleIn` missing `field_validator` pattern consistency | `schemas.py:416` | Consider using Literal type for stricter validation |

### Informational

| # | Observation | Note |
|---|-------------|------|
| I1 | `factory_reset_request` doesn't block in production | Intentional design - only `confirm` blocks |
| I2 | `seed_demo_data` preserves AuditLog | Correct - maintains audit trail |
| I3 | MRR is approximate (60-day / 2) | Acceptable for dashboard |
| I4 | `delete_plan` does soft delete (archives) | Correct - preserves referential integrity |
| I5 | `TenantAdminOut.user_count` does `User.objects.filter(tenant=t).count()` per tenant | N+1 in list view; consider annotation |

---

## 9. POSITIVE SECURITY PATTERNS OBSERVED

1. **Defense in Depth:** Every destructive operation has multiple guards (auth check + environment check + OTP/PIN + audit log)
2. **No Hardcoded Secrets:** All secrets read from Vault; management commands require `--password` argument
3. **Atomic Transactions:** Tenant creation, payment confirmation, and factory reset all use `@transaction.atomic()`
4. **Secret Redaction:** Platform settings with sensitive keywords are automatically redacted in API responses
5. **Audit-First Pattern:** Factory reset logs the audit entry BEFORE data destruction, ensuring the trail survives
6. **Rate Limiting:** Impersonation PIN has per-target 3-attempt lockout; OTP has global rate limiting
7. **Environment Guardrails:** `enforce_settings_environment()` prevents dev commands from running against production DB/Vault
8. **Soft Deletes:** Plans are archived, not hard-deleted, preserving referential integrity
9. **Idempotent Seeders:** All management commands use `get_or_create` for safe re-runs
10. **Constant-Time Comparison:** OTP verification uses `hmac.compare_digest()` to prevent timing attacks
11. **Comprehensive Input Validation:** `normalize_and_validate_vault_secret()` has key-specific validators (PEM crypto validation, SID regex, JSON parsing)
12. **SUPER_ADMIN Isolation:** SUPER_ADMIN users have `tenant=None` and are excluded from all tenant-scoped operations including factory reset wipe
13. **Plan Capacity Enforcement:** Tenant creation checks plan capacity via PlatformSetting to prevent over-subscription
14. **Trial Extension Cap:** 90-day maximum trial period from initial start (LYL-H-API-013)
15. **WhatsApp Override Hard Cap:** Daily limit override capped at 200 (LYL-SRS-008)

---

## 10. COMPLIANCE MAPPING

| Requirement | Status | Evidence |
|-------------|--------|----------|
| LYL-H-ARCH-011 (Subscription as plan source of truth) | IMPLEMENTED | `list_all_tenants()` filters by Subscription status; `Tenant.effective_plan` property |
| LYL-H-API-013 (Trial extension cap) | IMPLEMENTED | `extend_trial()` caps at 90 days from `trial_start` |
| LYL-SRS-008 (WA override hard cap) | IMPLEMENTED | `set_whatsapp_override()` validates 0-200 range |
| LYL-SEC-030/031 (Security PIN for impersonation) | IMPLEMENTED | Argon2-hashed PIN, 6-digit, verify via `check_password()` |
| LYL-BOOT-001 (Factory reset with OTP) | IMPLEMENTED | Two-step OTP flow, production-blocked, SUPER_ADMIN preserved |
| LYL-FR-DPR-025.8 (Scheduled deletion) | ACKNOWLEDGED | Field exists on Tenant, guarded in tenant listing |
| REQ-I18N-001 (i18n support) | IMPLEMENTED | `default_language` on Tenant, `preferred_language` on User |
| REQ-PLAN-001 (4-tier plans) | IMPLEMENTED | Trial, Starter, Professional, Enterprise in seeder |

---

*End of Review*
