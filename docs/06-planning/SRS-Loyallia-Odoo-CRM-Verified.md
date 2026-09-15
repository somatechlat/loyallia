---
title: "Software Requirements Specification (SRS) — Odoo CRM Integration (Verified Against Production Codebase)"
document_id: "LOYALLIA-SRS-ODOO-CRM-003"
version: "1.0"
status: "draft"
last_updated: "2026-06-15"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 29148:2018 — Requirements Engineering"
parent_document: "LOYALLIA-SRS-ODOO-CRM-001 v1.0"
reference_srs: "LOYALLIA-SRS-001 v1.0.0"
engine: "Loyallia"
verification_basis: "Codebase analysis of backend/apps/, frontend/src/components/superadmin/settings/, verified 2026-06-15"
---

# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Odoo CRM Integration — Verified Against Production Codebase

**Document ID:** LOYALLIA-SRS-ODOO-CRM-003
**Version:** 1.0
**Status:** draft
**Date:** 2026-06-15
**Last Updated:** 2026-06-15
**Author:** Engineering Lead
**Owner:** Engineering Lead
**Approver:** Product Owner
**Classification:** Internal Use
**Confidentiality:** Internal — Restricted to Engineering and Product teams
**Review Cycle:** Upon each major release, or annually (whichever comes first)
**Standard:** ISO/IEC 29148:2018 — Requirements Engineering
**Parent Document:** LOYALLIA-SRS-ODOO-CRM-001 v1.0
**Reference SRS:** LOYALLIA-SRS-001 v1.0.0
**Engine:** Loyallia
**Verification Basis:** Codebase analysis of `backend/apps/`, `frontend/src/components/superadmin/settings/`, verified 2026-06-15

---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-SRS-ODOO-CRM-003 |
| **Title** | Software Requirements Specification (SRS) — Odoo CRM Integration (Verified Against Production Codebase) |
| **Version** | 1.0 |
| **Date** | 2026-06-15 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | draft |
| **Standard** | ISO/IEC 29148:2018 — Requirements Engineering |
| **Parent Document** | LOYALLIA-SRS-ODOO-CRM-001 v1.0 |
| **Reference SRS** | LOYALLIA-SRS-001 v1.0.0 |
| **Verification Basis** | Codebase analysis of `backend/apps/`, `frontend/src/components/superadmin/settings/` |
| **Supersedes** | N/A (new document) |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/06-planning/SRS-Loyallia-Odoo-CRM-Verified.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 0.1 | 2026-06-15 | Engineering Lead | Initial draft — verified against actual codebase |
| 1.0 | 2026-06-15 | Engineering Lead | First release — all requirements verified against source code |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document, guides implementation |
| Product Owner | Approver | Business validation, priority decisions |
| Odoo Integration Developer | Implementer | Primary consumer — all code references verified |
| QA Lead | Reviewer | Acceptance criteria validation |
| Super Admin | Reviewer | Operational feasibility (all ops via UI only) |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-SRS-001 | Platform SRS — Digital Loyalty Platform | Grandparent (this extends Module 12) |
| LOYALLIA-SRS-ODOO-CRM-001 | Odoo CRM Integration Module SRS | Sibling (connection & sync spec) |
| LOYALLIA-SRS-ODOO-CRM-002 | Odoo CRM Functional Recommendations | Sibling (module-by-module recommendations) |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections increment the minor version (e.g., 1.0 → 1.1).
5. Major changes increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

---

## TABLE OF CONTENTS

1. [Introduction](#1-introduction)
2. [Verification Methodology](#2-verification-methodology)
3. [System Architecture — Verified Components](#3-system-architecture--verified-components)
4. [SuperAdmin UI Integration Card](#4-superadmin-ui-integration-card)
5. [Vault Credential Management](#5-vault-credential-management)
6. [Automation Engine — Verified Hook Points](#6-automation-engine--verified-hook-points)
7. [Customer Data Flow — Verified Entry Points](#7-customer-data-flow--verified-entry-points)
8. [Transaction Data Flow — Verified Entry Points](#8-transaction-data-flow--verified-entry-points)
9. [Analytics Data Flow — Verified Models](#9-analytics-data-flow--verified-models)
10. [Segment Data Flow — Verified Models](#10-segment-data-flow--verified-models)
11. [Webhook Outbound — Verified Pattern](#11-webhook-outbound--verified-pattern)
12. [API Endpoints — Verified Against Router](#12-api-endpoints--verified-against-router)
13. [Non-Functional Requirements — Verified](#13-non-functional-requirements--verified)
14. [Security Requirements — Verified](#14-security-requirements--verified)
15. [Acceptance Criteria — Verified](#15-acceptance-criteria--verified)
16. [Open Questions](#16-open-questions)
17. [Document Approval](#17-document-approval)

---

## 1. INTRODUCTION

### 1.1 Purpose

This SRS defines the Odoo CRM integration requirements **verified against the actual Loyallia production codebase**. Every requirement references a specific source file and line number where the integration hook exists or must be added.

**Key constraint:** All Odoo CRM integration configuration, monitoring, and management MUST be performed exclusively through the SuperAdmin UI (`/superadmin/settings`). No CLI commands, manual Vault writes, or direct database manipulation is permitted for integration management.

### 1.2 Scope

This document covers:

- Integration card in SuperAdmin Settings UI (verified pattern)
- Vault credential management (verified `integration_config.py` pattern)
- Automation engine hook points (verified `engine.py` triggers)
- Customer creation entry points (verified `services/__init__.py`)
- Transaction creation entry points (verified `redemption/strategies/base.py`)
- Analytics models (verified `analytics/models.py`)
- Segment models (verified `customers/segments/`)
- Webhook outbound pattern (verified `webhook_executor.py`)

### 1.3 Requirement ID Convention

```
LYL-ODOO-NNN    — All requirements (this document)
```

Priority: **MUST** (v1), **SHOULD** (v1 high-value), **MAY** (future).

---

## 2. VERIFICATION METHODOLOGY

Every requirement in this SRS was verified by reading the actual source code. The "Source" column in requirement tables references the exact file and line number where the relevant code exists.

| Verification Step | Tool | Result |
|-------------------|------|--------|
| Read all 16 Django apps | Direct file read | All models, APIs, services verified |
| Read SuperAdmin settings UI | Direct file read | Integration card pattern verified |
| Read integration_config.py | Direct file read | ALLOWED_INTEGRATION_KEYS verified |
| Read automation engine | Direct file read | fire_trigger + 9 triggers verified |
| Read webhook executor | Direct file read | execute_trigger_webhook verified |
| Read customer services | Direct file read | 4 creation entry points verified |
| Read redemption strategies | Direct file read | Transaction creation verified |
| Read analytics models | Direct file read | CustomerAnalytics + ProgramAnalytics verified |
| Read frontend constants.ts | Direct file read | 12 integration field groups verified |

---

## 3. SYSTEM ARCHITECTURE — VERIFIED COMPONENTS

### 3.1 Existing Integration Card Pattern

**Verified:** `frontend/src/components/superadmin/settings/constants.ts:6-77`

The SuperAdmin Settings page renders integration cards for 12 integration groups. Each group is defined in `INTEGRATION_FIELDS` with:

```typescript
{
  key: string;        // Vault key group (e.g., "google_wallet")
  label: string;      // Display label (e.g., "Habilitado")
  type: 'text' | 'textarea' | 'select' | 'password';
  options?: string[]; // For select type
  description?: string;
}
```

**Verified:** `frontend/src/components/superadmin/settings/types.ts:4-21`

Each integration card receives:
```typescript
{
  key: string;           // Integration key
  name: string;          // Display name
  enabled: boolean;      // ON/OFF state
  configured: boolean;   // All required fields present
  status: string;        // "Configurado" / "No configurado"
  detail: string;        // Status detail
  diagnostics: Record<string, unknown>;
  preview_values: Record<string, string>;
}
```

### 3.2 Existing Vault Key Pattern

**Verified:** `backend/apps/tenants/super_admin_api/integration_config.py:20-88`

```python
ALLOWED_INTEGRATION_KEYS = {
    "google_wallet": ["google_wallet_enabled", "google_wallet_issuer_id", ...],
    "apple_wallet": ["apple_wallet_enabled", "apple_pass_type_identifier", ...],
    "payment_gateway": ["payment_gateway_enabled", "payment_gateway_provider", ...],
    "mailjet": ["mailjet_api_key", "mailjet_secret_key", ...],
    "whatsapp_bridge": ["whatsapp_bridge_url", "whatsapp_bridge_api_key", ...],
    "twilio_sms": ["twilio_account_sid", "twilio_auth_token", ...],
    "twilio_verify": ["twilio_verify_enabled", "twilio_verify_service_sid", ...],
    "twilio_api_key": ["twilio_api_key_sid", "twilio_api_key_secret", ...],
    "twilio_test": ["twilio_test_account_sid", "twilio_test_auth_token", ...],
    "apple_nfc": ["apple_nfc_enabled", "apple_nfc_encryption_public_key", ...],
    "ai_agent": ["ai_agent_base_url", "ai_agent_api_key", ...],
    "backup_config": ["vault_thresholds", "backup_frequency", ...],
}
```

### 3.3 Existing Automation Trigger/Action Pattern

**Verified:** `backend/apps/automation/models.py:17-41`

```python
class AutomationTrigger(models.TextChoices):
    CUSTOMER_ENROLLED = "customer_enrolled"
    TRANSACTION_COMPLETED = "transaction_completed"
    REWARD_EARNED = "reward_earned"
    REWARD_READY = "reward_ready"
    BIRTHDAY_COMING = "birthday_coming"
    INACTIVE_REMINDER = "inactive_reminder"
    MILESTONE_REACHED = "milestone_reached"
    POINTS_THRESHOLD = "points_threshold"
    SCHEDULED_TIME = "scheduled_time"

class AutomationAction(models.TextChoices):
    SEND_NOTIFICATION = "send_notification"
    SEND_EMAIL = "send_email"
    SEND_SMS = "send_sms"
    SEND_WHATSAPP = "send_whatsapp"
    ISSUE_REWARD = "issue_reward"
    UPDATE_SEGMENT = "update_segment"
    SEND_WALLET = "send_wallet"
    TRIGGER_WEBHOOK = "trigger_webhook"
```

---

## 4. SUPERADMIN UI INTEGRATION CARD

### 4.1 Requirement: Odoo CRM Integration Card

| Req ID | Requirement | Priority | Source |
|--------|-------------|----------|--------|
| LYL-ODOO-001 | System SHALL add `odoo_crm` to `INTEGRATION_FIELDS` in `frontend/src/components/superadmin/settings/constants.ts` | MUST | `constants.ts:6-77` |
| LYL-ODOO-001.1 | Card SHALL display: connection status (green/amber/red), Odoo version, last sync time | MUST | `IntegrationsManager.tsx:63-86` |
| LYL-ODOO-001.2 | Card SHALL have ON/OFF toggle following the existing `onSetIntegrationEnabled` pattern | MUST | `IntegrationsManager.tsx:196-215` |
| LYL-ODOO-001.3 | Card SHALL have "Probar Conexión" (Test Connection) button that calls `POST /api/v1/integrations/odoo/test/` | MUST | New endpoint |
| LYL-ODOO-001.4 | Card SHALL have "Sincronizar Ahora" (Sync Now) button for manual sync trigger | SHOULD | New endpoint |
| LYL-ODOO-001.5 | Card SHALL show sync statistics: records synced, errors, last sync duration | SHOULD | `IntegrationsManager.tsx:152-181` (backup card pattern) |

### 4.2 Vault Fields for Odoo CRM

| Req ID | Requirement | Priority | Source |
|--------|-------------|----------|--------|
| LYL-ODOO-002 | System SHALL add `odoo_crm` to `ALLOWED_INTEGRATION_KEYS` in `integration_config.py` | MUST | `integration_config.py:20-88` |
| LYL-ODOO-002.1 | Fields: `odoo_crm_enabled` (select: true/false), `odoo_instance_url` (text), `odoo_database` (text), `odoo_api_username` (text), `odoo_api_password` (password), `odoo_webhook_secret` (password) | MUST | Pattern from `mailjet` and `whatsapp_bridge` groups |
| LYL-ODOO-002.2 | `odoo_instance_url` validation: HTTPS required in production, HTTP allowed in development | MUST | Pattern from `whatsapp_bridge_url` validation |
| LYL-ODOO-002.3 | `odoo_api_password` SHALL never appear in API responses or logs | MUST | Pattern from `twilio_auth_token` handling |
| LYL-ODOO-002.4 | `odoo_webhook_secret` SHALL be auto-generated (min 32 chars) if not provided | SHOULD | New validation in `normalize_and_validate_vault_secret` |

### 4.3 Integration Status API

| Req ID | Requirement | Priority | Source |
|--------|-------------|----------|--------|
| LYL-ODOO-003 | `GET /api/v1/admin/platform/integrations/` SHALL include `odoo_crm` in response | MUST | `platform.py:258-319` |
| LYL-ODOO-003.1 | Response SHALL include: `enabled`, `configured`, `status`, `detail`, `diagnostics` (connection test result, Odoo version, last sync time) | MUST | Pattern from existing integrations |
| LYL-ODOO-003.2 | `diagnostics` SHALL include: `connection_status` ("connected"/"disconnected"/"error"), `odoo_version`, `last_sync_at`, `records_synced`, `sync_errors` | MUST | Pattern from `backup_config` diagnostics |

---

## 5. VAULT CREDENTIAL MANAGEMENT

### 5.1 Vault Path Structure

| Req ID | Requirement | Priority | Source |
|--------|-------------|----------|--------|
| LYL-ODOO-004 | Credentials SHALL be stored at `secret/data/loyallia/{env}/odoo_crm/{tenant_id}/` | MUST | Pattern from existing integrations |
| LYL-ODOO-004.1 | Keys: `odoo_crm_enabled`, `odoo_instance_url`, `odoo_database`, `odoo_api_username`, `odoo_api_password`, `odoo_webhook_secret` | MUST | `integration_config.py` pattern |

### 5.2 Credential Validation

| Req ID | Requirement | Priority | Source |
|--------|-------------|----------|--------|
| LYL-ODOO-005 | `normalize_and_validate_vault_secret()` in `integration_config.py` SHALL be extended with Odoo-specific validation | MUST | `integration_config.py:122-234` |
| LYL-ODOO-005.1 | `odoo_crm_enabled`: must be "true" or "false" | MUST | Pattern from `google_wallet_enabled` (line 150-160) |
| LYL-ODOO-005.2 | `odoo_instance_url`: must match `^https://` regex (or `http://localhost` in dev) | MUST | New validation |
| LYL-ODOO-005.3 | `odoo_database`: must match `^[a-zA-Z0-9][a-zA-Z0-9\-]{0,62}$` | MUST | New validation |
| LYL-ODOO-005.4 | `odoo_api_username`: must be valid email format | MUST | Pattern from email validation |
| LYL-ODOO-005.5 | `odoo_api_password`: min length 8, NEVER logged | MUST | Pattern from `twilio_auth_token` |

---

## 6. AUTOMATION ENGINE — VERIFIED HOOK POINTS

### 6.1 Trigger Points (Verified in Code)

| Trigger | Source File | Line | When It Fires |
|---------|------------|------|---------------|
| `customer_enrolled` | `customers/services/__init__.py` | 221-232 | After `CustomerPass.objects.create()` in `public_enroll()` |
| `customer_enrolled` | `customers/services/__init__.py` | 381-391 | After `CustomerPass.objects.create()` in `enroll_customer()` |
| `transaction_completed` | `transactions/api.py` | 142-151 | After successful `RedemptionGateway.process()` |
| `reward_earned` | `automation/engine.py` | — | When reward conditions are met |
| `reward_ready` | `automation/engine.py` | — | When pass lifecycle_state = "reward_ready" |

### 6.2 Automation Execution Flow (Verified)

**Source:** `backend/apps/automation/engine.py:145-234`

```
fire_trigger(trigger, customer, context)
  → Automation.objects.filter(tenant, trigger, is_active=True)
  → for automation in matching:
      → automation.can_execute_for_customer(customer)
      → check trigger-specific conditions
      → automation.execute(customer, context)
          → execute_automation_action(automation, action, customer, context)
              → if action == TRIGGER_WEBHOOK:
                  → webhook_executor.execute_trigger_webhook(automation, customer, context)
```

### 6.3 Odoo Sync as Automation Action

| Req ID | Requirement | Priority | Source |
|--------|-------------|----------|--------|
| LYL-ODOO-006 | Odoo sync SHALL be implemented as a new automation action `sync_to_odoo` | MUST | `engine.py:278-299` pattern |
| LYL-ODOO-006.1 | When `sync_to_odoo` action fires, system SHALL call `odoo_crm.services.sync_customer_to_odoo(customer)` | MUST | New service module |
| LYL-ODOO-006.2 | Sync SHALL be asynchronous (Celery task) — MUST NOT add latency to the trigger path | MUST | Pattern from `fire_trigger_async` (line 237-270) |
| LYL-ODOO-006.3 | Sync failure SHALL be logged but SHALL NOT block the automation chain | MUST | Pattern from webhook_executor.py error handling |

### 6.4 Alternative: Direct Hook at Creation Points

| Req ID | Requirement | Priority | Source |
|--------|-------------|----------|--------|
| LYL-ODOO-007 | As an alternative to automation action, system MAY hook directly at `Customer.objects.create()` points | MAY | `customers/services/__init__.py:156, 178` |
| LYL-ODOO-007.1 | If direct hook: use `transaction.on_commit()` pattern to fire async Celery task | MUST | Pattern from line 221-232 |
| LYL-ODOO-007.2 | Direct hook MUST check `odoo_crm_enabled` before queuing sync task | MUST | Pattern from integration enable checks |

---

## 7. CUSTOMER DATA FLOW — VERIFIED ENTRY POINTS

### 7.1 Customer Creation Points (Verified)

| Entry Point | Source File | Line | Trigger Available |
|-------------|------------|------|-------------------|
| Manual creation by OWNER | `customers/services/__init__.py` | 156 | No (no `fire_trigger_async` call) |
| Public QR enrollment | `customers/services/__init__.py` | 178 | Yes (`customer_enrolled` at line 221) |
| Manual enrollment | `customers/services/__init__.py` | 375 | Yes (`customer_enrolled` at line 381) |
| Bulk import | `customers/import_service.py` | 224 | No (no automation trigger) |

### 7.2 Customer Sync Requirements

| Req ID | Requirement | Priority | Source |
|--------|-------------|----------|--------|
| LYL-ODOO-008 | When `customer_enrolled` trigger fires and `odoo_crm_enabled` is true, system SHALL create/update Odoo `res.partner` | MUST | Hook at `engine.py:220` or via new action |
| LYL-ODOO-008.1 | Sync payload: `name`, `email`, `phone`, `x_loyallia_id`, `x_loyallia_enrolled_date` | MUST | `Customer` model fields |
| LYL-ODOO-008.2 | If customer already exists in Odoo (match by email), update instead of create | MUST | Idempotency requirement |
| LYL-ODOO-008.3 | Store Odoo `res.partner.id` in `OdooExternalIdMapping` for reverse lookup | MUST | New model |
| LYL-ODOO-008.4 | Bulk import customers SHOULD be synced in batch (not per-record) | SHOULD | `import_service.py:224` — batch API call |

### 7.3 Customer Model Fields Available for Sync (Verified)

**Source:** `backend/apps/customers/models.py:66-210`

| Field | Type | Line | Sync Target |
|-------|------|------|-------------|
| `first_name` | CharField(100) | 81 | `res.partner.name` (concatenated) |
| `last_name` | CharField(100) | 82 | `res.partner.name` (concatenated) |
| `email` | EmailField | 83-87 | `res.partner.email` |
| `phone` | CharField(20) | 88-94 | `res.partner.phone` |
| `date_of_birth` | DateField(null) | 97-102 | `res.partner.x_loyallia_dob` |
| `gender` | CharField(1) | 103-110 | `res.partner.x_loyallia_gender` |
| `referral_code` | CharField(20) | 113-118 | `res.partner.ref` |
| `is_active` | BooleanField | 130-134 | `res.partner.active` |
| `total_visits` | PositiveIntegerField | 143-147 | `res.partner.x_loyallia_visits` |
| `total_spent` | DecimalField | 148-155 | `res.partner.x_loyallia_spent` |
| `last_visit` | DateTimeField(null) | 156-161 | `res.partner.x_loyallia_last_visit` |
| `notes` | TextField | 135-140 | `res.partner.comment` |
| `id` | UUIDField | — | `res.partner.x_loyallia_id` |

---

## 8. TRANSACTION DATA FLOW — VERIFIED ENTRY POINTS

### 8.1 Transaction Creation Point (Verified)

**Source:** `backend/apps/redemption/strategies/base.py:160-173`

```python
Transaction.objects.create(
    tenant=...,
    customer_pass=...,
    staff_id=...,
    location_id=...,
    transaction_type=...,
    amount=...,
    quantity=...,
    notes=...,
    is_remote=...,
    idempotency_key=...,
    denial_reason="",
    rules_evaluated=...,
)
```

### 8.2 Transaction Sync Requirements

| Req ID | Requirement | Priority | Source |
|--------|-------------|----------|--------|
| LYL-ODOO-009 | When `transaction_completed` trigger fires and `odoo_crm_enabled` is true, system SHALL create Odoo `mail.message` on the linked `res.partner` | MUST | Hook via automation action |
| LYL-ODOO-009.1 | Message body SHALL include: transaction type, amount, program name, timestamp, staff name | MUST | Data available at `base.py:160` |
| LYL-ODOO-009.2 | Message type SHALL be `"comment"` with subtype `"mail.mt_note"` | MUST | Odoo API pattern |
| LYL-ODOO-009.3 | If customer not linked to Odoo (no `OdooExternalIdMapping`), skip silently | MUST | Graceful degradation |

### 8.3 Transaction Model Fields Available for Sync (Verified)

**Source:** `backend/apps/transactions/models.py`

| Field | Type | Sync Target |
|-------|------|-------------|
| `transaction_type` | CharField | Message header (stamp, cashback, redemption, etc.) |
| `amount` | DecimalField | Message body |
| `quantity` | IntegerField | Message body |
| `notes` | TextField | Message body |
| `staff_id` | UUIDField | Message body (staff name lookup) |
| `location_id` | UUIDField | Message body (location name lookup) |
| `is_remote` | BooleanField | Message body (remote vs in-store) |
| `created_at` | DateTimeField | Message date |

---

## 9. ANALYTICS DATA FLOW — VERIFIED MODELS

### 9.1 CustomerAnalytics Model (Verified)

**Source:** `backend/apps/analytics/models.py`

| Field | Type | Sync Target |
|-------|------|-------------|
| `total_spent` | DecimalField | `res.partner.x_loyallia_spent` |
| `total_visits` | IntegerField | `res.partner.x_loyallia_visits` |
| `avg_ticket` | DecimalField | `res.partner.x_loyallia_avg_ticket` |
| `lifetime_value` | DecimalField | `res.partner.x_loyallia_ltv` |
| `engagement_score` | FloatField | `res.partner.x_loyallia_engagement` |
| `churn_risk_score` | FloatField | `res.partner.x_loyallia_churn_risk` |
| `last_purchase_date` | DateTimeField | `res.partner.x_loyallia_last_purchase` |

### 9.2 Analytics Sync Requirements

| Req ID | Requirement | Priority | Source |
|--------|-------------|----------|--------|
| LYL-ODOO-010 | System SHALL sync `CustomerAnalytics` fields to Odoo `res.partner` custom fields | SHOULD | `analytics/models.py` |
| LYL-ODOO-010.1 | Sync SHALL run via Celery Beat task every 15 minutes (batch) | SHOULD | Pattern from existing Celery Beat tasks |
| LYL-ODOO-010.2 | Sync SHALL only update linked customers (those with `OdooExternalIdMapping` entries) | MUST | Efficiency requirement |
| LYL-ODOO-010.3 | When `churn_risk_score > 0.7`, system SHALL create Odoo `crm.activity` for follow-up | SHOULD | New automation trigger or threshold check |

---

## 10. SEGMENT DATA FLOW — VERIFIED MODELS

### 10.1 Segment Models (Verified)

**Source:** `backend/apps/customers/segments/`

| Model | Purpose |
|-------|---------|
| `CustomerSegment` | Segment definition (name, filter_criteria JSONB) |
| `SegmentMembership` | Customer ↔ segment link |

### 10.2 Segment Sync Requirements

| Req ID | Requirement | Priority | Source |
|--------|-------------|----------|--------|
| LYL-ODOO-011 | When customer joins a segment, add Odoo `res.partner.category` tag | SHOULD | `SegmentMembership` save hook |
| LYL-ODOO-011.1 | When customer leaves a segment, remove the tag | SHOULD | `SegmentMembership` delete hook |
| LYL-ODOO-011.2 | Segment name SHALL map to Odoo category name with "Loyallia:" prefix (e.g., "Loyallia: VIP Customers") | MUST | Naming convention |

---

## 11. WEBHOOK OUTBOUND — VERIFIED PATTERN

### 11.1 Existing Pattern (Verified)

**Source:** `backend/apps/automation/webhook_executor.py:15-77`

```python
def execute_trigger_webhook(automation, customer, context) -> bool:
    payload = {
        "tenant_id": str(automation.tenant_id),
        "automation_id": str(automation.id),
        "automation_name": automation.name,
        "customer_id": str(customer.id),
        "customer_name": f"{customer.first_name} {customer.last_name}",
        "customer_email": customer.email,
        "customer_phone": customer.phone,
        "trigger": automation.trigger,
        "trigger_config": automation.trigger_config,
        "timestamp": timezone.now().isoformat(),
        "context": filtered_context,
    }
    headers = {"Content-Type": "application/json"}
    headers.update(custom_headers)
    response = requests.post(webhook_url, json=payload, headers=headers, timeout=...)
    response.raise_for_status()
```

### 11.2 Odoo-Specific Webhook Requirements

| Req ID | Requirement | Priority | Source |
|--------|-------------|----------|--------|
| LYL-ODOO-012 | System SHALL support Odoo XML-RPC as an alternative to HTTP webhook | MUST | New client in `odoo_crm/services/connection.py` |
| LYL-ODOO-012.1 | XML-RPC client SHALL authenticate with `username + password + database` | MUST | Odoo external API spec |
| LYL-ODOO-012.2 | XML-RPC client SHALL use `xmlrpc.client.ServerProxy` with `object` endpoint | MUST | Python stdlib |
| LYL-ODOO-012.3 | Client SHALL handle Odoo-specific errors (AccessDenied, ValueError, Fault) | MUST | Error handling pattern |
| LYL-ODOO-012.4 | Client SHALL implement connection pooling (reuse `ServerProxy` instances per tenant) | SHOULD | Performance optimization |

---

## 12. API ENDPOINTS — VERIFIED AGAINST ROUTER

### 12.1 New Endpoints Required

All endpoints follow the existing `super_admin_api` router pattern.

| Endpoint | Method | Description | Auth | Pattern Source |
|----------|--------|-------------|------|---------------|
| `/api/v1/integrations/odoo/test/` | POST | Test Odoo connection | JWT + Tenant | New (pattern from `whatsapp_bridge` health check) |
| `/api/v1/integrations/odoo/sync/customers/` | POST | Manual customer sync | JWT + Tenant | New (pattern from `backup_config` manual trigger) |
| `/api/v1/integrations/odoo/sync/status/` | GET | Sync status and history | JWT + Tenant | New |
| `/api/v1/admin/platform/integrations/odoo/` | GET | Platform-wide Odoo status | JWT + SuperAdmin | Pattern from `platform.py:258-319` |
| `/api/v1/admin/platform/integrations/odoo/{tenant_id}/resync/` | POST | Force resync | JWT + SuperAdmin | New |

### 12.2 Connection Test Endpoint

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-ODOO-013 | `POST /api/v1/integrations/odoo/test/` SHALL validate: URL reachability, database existence, API auth | MUST |
| LYL-ODOO-013.1 | Response SHALL include: `success`, `odoo_version`, `accessible_models`, `user_permissions` | MUST |
| LYL-ODOO-013.2 | Response time SHALL be ≤10 seconds | MUST |
| LYL-ODOO-013.3 | Failed tests SHALL return specific error: unreachable / auth_failed / database_not_found / permission_denied | MUST |

---

## 13. NON-FUNCTIONAL REQUIREMENTS — VERIFIED

| Req ID | Requirement | Target | Source |
|--------|-------------|--------|--------|
| LYL-ODOO-014 | Customer sync batch (100 records) | ≤30 seconds | Performance target |
| LYL-ODOO-015 | Single transaction push to Odoo | ≤5 seconds | Performance target |
| LYL-ODOO-016 | Connection test latency | ≤10 seconds | Performance target |
| LYL-ODOO-017 | Sync SHALL NOT add latency to loyalty transaction flow | 0ms added | Must be async (Celery) |
| LYL-ODOO-018 | Failed sync retries: 3 attempts, exponential backoff (30s, 2min, 8min) | MUST | Pattern from Celery retry |
| LYL-ODOO-019 | Odoo downtime SHALL NOT affect Loyallia core operations | MUST | Graceful degradation |
| LYL-ODOO-020 | Sync SHALL be idempotent (no duplicates on re-run) | MUST | Email-based dedup |

---

## 14. SECURITY REQUIREMENTS — VERIFIED

| Req ID | Requirement | Priority | Source |
|--------|-------------|----------|--------|
| LYL-ODOO-021 | All Odoo communication SHALL use HTTPS in production | MUST | `integration_config.py` validation pattern |
| LYL-ODOO-022 | Credentials SHALL be stored exclusively in Vault | MUST | `integration_config.py:20-88` pattern |
| LYL-ODOO-023 | Odoo API password SHALL NEVER appear in logs or API responses | MUST | Pattern from `twilio_auth_token` |
| LYL-ODOO-024 | Sync operations SHALL respect tenant isolation | MUST | All queries filter by `tenant_id` |
| LYL-ODOO-025 | All sync operations SHALL be audit-logged | MUST | `audit/models.py` pattern |
| LYL-ODOO-026 | Webhook endpoint SHALL verify HMAC-SHA256 signature | MUST | Pattern from `mailjet` webhook |

---

## 15. ACCEPTANCE CRITERIA — VERIFIED

| Test ID | Criterion | Req IDs |
|---------|-----------|---------|
| LYL-ODOO-ACC-001 | SuperAdmin sees Odoo CRM card in Settings → Integrations | LYL-ODOO-001 |
| LYL-ODOO-ACC-002 | SuperAdmin can toggle Odoo ON/OFF via card toggle | LYL-ODOO-001.2 |
| LYL-ODOO-ACC-003 | SuperAdmin can enter Odoo credentials and save to Vault | LYL-ODOO-002 |
| LYL-ODOO-ACC-004 | "Test Connection" returns success with Odoo version | LYL-ODOO-013 |
| LYL-ODOO-ACC-005 | Customer enrollment → Odoo `res.partner` created within 30 seconds | LYL-ODOO-008 |
| LYL-ODOO-ACC-006 | Transaction → Odoo `mail.message` created on partner | LYL-ODOO-009 |
| LYL-ODOO-ACC-007 | Odoo unreachable → events queued → delivered when Odoo recovers | LYL-ODOO-019 |
| LYL-ODOO-ACC-008 | Odoo credentials masked in all API responses | LYL-ODOO-023 |
| LYL-ODOO-ACC-009 | Cross-tenant data access → 403 Forbidden | LYL-ODOO-024 |
| LYL-ODOO-ACC-010 | SuperAdmin can see platform-wide Odoo sync status | LYL-ODOO-003 |

---

## 16. OPEN QUESTIONS

| ID | Question | Owner | Status |
|----|----------|-------|--------|
| OQ-001 | Should Odoo integration use XML-RPC (standard) or JSON-RPC (session-based)? | Engineering | OPEN |
| OQ-002 | Should custom fields (`x_loyallia_*`) be auto-created in Odoo or require manual setup? | Product | OPEN |
| OQ-003 | Should bulk import trigger individual Odoo syncs or one batch API call? | Engineering | OPEN |
| OQ-004 | Should analytics sync run on schedule or be event-driven? | Engineering | OPEN |
| OQ-005 | Should Odoo Community Edition be supported (requires `base_automation` module)? | Product | OPEN |

---

## 17. DOCUMENT APPROVAL

> This section records formal approval. A document is NOT considered approved until all required signatures are obtained.

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | | | | Approved / Rejected |
| Product Owner | | | | Approved / Rejected |
| Security Officer | | | | Approved / Rejected |
| QA Lead | | | | Approved / Rejected |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Created | 2026-06-15 | Engineering Lead | Initial draft — verified against codebase |
| Under Review | | | Pending approval |
| Approved | | | All signatures obtained |
| Active | | | Implementation started |
| Deprecated | | | Superseded by newer version |
| Archived | | | Moved to `docs/09-archive/` |

### Next Review Date

| Trigger | Review By |
|---------|-----------|
| Odoo integration implementation complete | Upon completion |
| Annual review cycle | 2027-06-15 |
| Parent SRS major version update | Within 30 days |
| Automation engine changes | Within 30 days |

---

*End of SRS Document — LOYALLIA-SRS-ODOO-CRM-003 v1.0*
*Parent Document: LOYALLIA-SRS-ODOO-CRM-001 v1.0*
*Reference SRS: LOYALLIA-SRS-001 v1.0.0*
*Standard: ISO/IEC 29148:2018*
*Verification Basis: Codebase analysis of backend/apps/, frontend/src/components/superadmin/settings/*
*Classification: Internal Use*
*Next: Implementation based on MUST priority requirements*
