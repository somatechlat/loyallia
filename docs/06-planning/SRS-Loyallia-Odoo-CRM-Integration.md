---
title: "Software Requirements Specification (SRS) — Odoo CRM Integration Module"
document_id: "LOYALLIA-SRS-ODOO-CRM-001"
version: "1.0"
status: "draft"
last_updated: "2026-06-15"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "LOYALLIA-SRS-001 v1.0.0"
engine: "Loyallia"
---

# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Loyallia — Odoo CRM Integration Module
**Document ID:** LOYALLIA-SRS-ODOO-CRM-001
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
**Standard:** ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011
**Parent Document:** LOYALLIA-SRS-001 v1.0.0
**Engine:** Loyallia

---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-SRS-ODOO-CRM-001 |
| **Title** | Software Requirements Specification (SRS) — Odoo CRM Integration Module |
| **Version** | 1.0 |
| **Date** | 2026-06-15 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | draft |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011|
| **Parent Document** | LOYALLIA-SRS-001 v1.0.0 |
| **Supersedes** | N/A (new document) |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/06-planning/SRS-Loyallia-Odoo-CRM-Integration.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 0.1 | 2026-06-15 | Engineering Lead | Initial draft — all sections, requirements, architecture, data mapping |
| 1.0 | 2026-06-15 | Engineering Lead | First release — added ISO frontmatter, document control, approval section |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document, implements requirements |
| Product Owner | Approver | Business validation, scope approval |
| Security Officer | Reviewer | Security requirements validation (ISO 27001) |
| QA Lead | Reviewer | Acceptance criteria and test plan validation |
| Super Admin | Reviewer | Operational feasibility and monitoring requirements |
| Odoo Integration Developer | Implementer | Primary consumer of technical specifications |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-SRS-001 | Platform SRS — Digital Loyalty Platform | Parent (this module extends Module 12) |
| LOYALLIA-SRS-HARDENING-001 | Production Hardening SRS | Sibling (corrective requirements) |
| LOY-ISMS-001 | ISMS Scope Statement | Reference (security scope) |
| LOYALLIA-DOC-ARCHITECTURE.MD | Loyallia Architecture, Sequence & Flowchart Diagrams | Reference (system architecture) |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

---

## TABLE OF CONTENTS

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Module Purpose & Scope](#3-module-purpose--scope)
4. [Stakeholders & User Classes](#4-stakeholders--user-classes)
5. [Integration Architecture](#5-integration-architecture)
6. [Functional Requirements](#6-functional-requirements)
7. [Data Mapping & Entity Synchronization](#7-data-mapping--entity-synchronization)
8. [API Endpoints](#8-api-endpoints)
9. [Webhook & Event System](#9-webhook--event-system)
10. [Vault & Secrets Management](#10-vault--secrets-management)
11. [Security Requirements](#11-security-requirements)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [User Journeys](#13-user-journeys)
14. [Constraints & Assumptions](#14-constraints--assumptions)
15. [Verification & Acceptance Criteria](#15-verification--acceptance-criteria)
16. [Error Handling & Resilience](#16-error-handling--resilience)
17. [Open Questions](#17-open-questions)
18. [Document Approval](#18-document-approval)

---

## 1. INTRODUCTION

### 1.1 Purpose

This SRS defines the functional, non-functional, security, and integration requirements for connecting **Odoo CRM** (v16+) as an external CRM provider to the Loyallia digital loyalty platform. This module enables bidirectional customer data synchronization between Odoo's CRM pipeline and Loyallia's loyalty engine, allowing businesses to unify their sales pipeline with their loyalty program.

### 1.2 Scope

This module covers:

1. **Odoo CRM Connection Management** — Secure credential storage, connection testing, and status monitoring via SuperAdmin panel.
2. **Customer Synchronization (Odoo → Loyallia)** — Import Odoo CRM leads/contacts as Loyallia customers.
3. **Customer Synchronization (Loyallia → Odoo)** — Push new Loyallia enrollments back to Odoo as CRM leads/contacts.
4. **Transaction & Loyalty Event Sync** — Send loyalty transactions (stamps, redemptions, rewards) to Odoo as CRM activities/notes.
5. **CRM Pipeline Mapping** — Map Odoo CRM pipeline stages to Loyallia customer lifecycle states.
6. **Webhook Receivers** — Inbound webhooks from Odoo for real-time event processing.
7. **Scheduled Sync** — Celery Beat periodic batch synchronization for consistency.

### 1.3 Definitions, Acronyms & Abbreviations

| Term | Definition |
|------|-----------|
| Odoo | Open-source ERP/CRM platform (Community or Enterprise edition) |
| res.partner | Odoo's core contact/partner model |
| crm.lead | Odoo's CRM opportunity/lead model |
| XML-RPC | Odoo's primary external API protocol |
| JSON-RPC | Odoo's alternative API protocol (used by web client) |
| Sync Cursor | Timestamp or ID bookmark tracking the last successfully synced record |
| Conflict Resolution | Strategy for handling simultaneous updates to the same entity |
| Idempotency Key | Unique identifier preventing duplicate processing of the same event |

### 1.4 References

| Reference | URL / Standard |
|-----------|----------------|
| LOYALLIA-SRS-001 | Parent platform SRS |
| Odoo External API | https://www.odoo.com/documentation/17.0/developer/reference/external_api.html |
| Odoo Webhooks Module | https://www.odoo.com/documentation/17.0/developer/reference/backend/mixins.html |
| ISO/IEC 29148:2018 | Requirements Engineering standard |
| RFC 7519 | JSON Web Token |
| LOPDP Ecuador 2021 | National personal data protection law |

### 1.5 Requirement ID Convention

All requirements in this document follow the pattern:

```
LYL-FR-ODOO-NNN    — Functional Requirements
LYL-NFR-ODOO-NNN   — Non-Functional Requirements
LYL-SEC-ODOO-NNN   — Security Requirements
LYL-ACC-ODOO-NNN   — Acceptance Criteria
```

Priority levels: **MUST** (mandatory), **SHOULD** (strongly recommended), **MAY** (optional).

---

## 2. OVERALL DESCRIPTION

### 2.1 Product Perspective

This module extends Loyallia's existing integration layer (Module 12 — REST API & Integration Layer from the parent SRS) to add Odoo CRM as a supported external system. It operates as a tenant-scoped integration: each business tenant independently connects their own Odoo instance.

The integration follows the established patterns in `backend/apps/tenants/super_admin_api/integration_config.py` for Vault-backed secret management and uses the existing automation webhook executor (`backend/apps/automation/webhook_executor.py`) as a reference for outbound HTTP communication.

### 2.2 System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOYALLIA PLATFORM                        │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Customer  │  │  Transaction │  │   Odoo CRM Integration   │  │
│  │  Models   │  │    Models    │  │   (NEW Django App)       │  │
│  └─────┬─────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│        │               │                        │               │
│        └───────────────┼────────────────────────┘               │
│                        │                                        │
│              ┌─────────▼──────────┐                             │
│              │   Celery Workers   │                             │
│              │  (sync queue)      │                             │
│              └─────────┬──────────┘                             │
│                        │                                        │
│              ┌─────────▼──────────┐                             │
│              │  HashiCorp Vault   │                             │
│              │  (Odoo credentials)│                             │
│              └───────────────────┘                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    HTTPS / XML-RPC
                             │
              ┌──────────────▼──────────────┐
              │       ODOO INSTANCE         │
              │  (Customer's Odoo CRM)      │
              │                             │
              │  res.partner / crm.lead /   │
              │  crm.activity               │
              └────────────────────────────-┘
```

### 2.3 Product Functions (High-Level)

| ID | Function |
|----|----------|
| F-O01 | Securely store and manage Odoo instance credentials per tenant |
| F-O02 | Test Odoo connectivity and validate API access |
| F-O03 | Bidirectional customer/contact sync (Loyallia ↔ Odoo) |
| F-O04 | Push loyalty transactions to Odoo as CRM activities |
| F-O05 | Map Odoo CRM pipeline stages to Loyallia customer lifecycle |
| F-O06 | Receive real-time Odoo events via inbound webhooks |
| F-O07 | Periodic batch sync via Celery Beat for consistency |
| F-O08 | SuperAdmin monitoring and diagnostics for the integration |
| F-O09 | Per-tenant enable/disable toggle with graceful degradation |
| F-O10 | Sync conflict resolution (last-write-wins with audit trail) |

---

## 3. MODULE PURPOSE & SCOPE

### 3.1 Business Value

Businesses using Odoo as their CRM currently must manually duplicate customer data between their sales pipeline and their Loyallia loyalty program. This integration eliminates that friction by:

- **Reducing data entry** — New Odoo contacts automatically appear as Loyallia customers.
- **Enriching CRM data** — Loyalty transaction history visible directly in Odoo.
- **Enabling targeted campaigns** — Odoo CRM stages (e.g., "Qualified Lead", "Won") can trigger Loyallia automations.
- **Unified customer view** — Single source of truth for customer contact data.

### 3.2 In Scope

| Item | Description |
|------|-------------|
| Odoo CRM connection management | Vault credentials, connection test, status |
| Customer bidirectional sync | res.partner ↔ Customer |
| Transaction push to Odoo | Transaction → crm.activity / note |
| CRM stage mapping | crm.lead.stage → Customer lifecycle_state |
| Inbound webhooks from Odoo | Contact create/update → Loyallia sync |
| Outbound webhooks to Odoo | Loyalty events → Odoo webhook endpoint |
| Celery Beat scheduled sync | Periodic reconciliation |
| SuperAdmin diagnostics | Integration health, sync stats, errors |

### 3.3 Out of Scope

| Item | Reason |
|------|--------|
| Odoo ERP modules (Inventory, Accounting, HR) | CRM-only integration; ERP modules are future phases |
| Odoo Community vs Enterprise feature parity | XML-RPC API is common to both; specific module availability varies |
| Real-time bidirectional sync (<1s latency) | Eventual consistency model; <5min sync is acceptable |
| Odoo self-hosted provisioning | Customer manages their own Odoo instance |
| Custom Odoo module development | Integration uses standard Odoo external API only |

---

## 4. STAKEHOLDERS & USER CLASSES

### 4.1 Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| Business Owner (OWNER) | Tenant admin | Enables Odoo integration, views sync status |
| Business Manager (MANAGER) | Day-to-day operator | Monitors sync, resolves conflicts |
| Super Admin (SUPER_ADMIN) | Platform operator | Monitors health, manages Vault secrets |
| Odoo Admin | Customer's IT team | Provides Odoo API credentials, configures webhooks |

### 4.2 User Classes

| Class | Description | Access Level |
|-------|-------------|-------------|
| OWNER | Enables/disables integration, configures mapping rules | Tenant-scoped full access |
| MANAGER | Views sync status, triggers manual sync | Tenant-scoped read + manual trigger |
| SUPER_ADMIN | Manages Vault secrets, views platform-wide integration health | Platform-wide admin |
| SYSTEM (Celery) | Executes scheduled sync tasks | Automated, no UI |

---

## 5. INTEGRATION ARCHITECTURE

### 5.1 Communication Protocol

| Direction | Protocol | Authentication | Notes |
|-----------|----------|---------------|-------|
| Loyallia → Odoo | XML-RPC (`/xmlrpc/2/object`) | Username + Password + Database name | Odoo's standard external API |
| Odoo → Loyallia | HTTPS POST (webhook) | HMAC-SHA256 signature in `X-Loyallia-Signature` header | Standard webhook pattern |

### 5.2 Connection Model

Each tenant connects to **one** Odoo instance. The connection is configured via:

1. **Odoo instance URL** (e.g., `https://mycompany.odoo.com`)
2. **Odoo database name** (e.g., `mycompany-production`)
3. **Odoo API username** (email address)
4. **Odoo API password** (or API key for Odoo 14+)
5. **Odoo API key** (optional, recommended for Odoo 16+)

All credentials are stored in HashiCorp Vault under the tenant's integration path.

### 5.3 Sync Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    SYNC STRATEGY                            │
│                                                             │
│  ┌─────────────────┐        ┌──────────────────┐           │
│  │   REAL-TIME      │        │   BATCH           │          │
│  │   (Webhooks)     │        │   (Celery Beat)   │          │
│  │                  │        │                   │          │
│  │  • Odoo → Loyal. │        │  • Every 15 min   │          │
│  │    (inbound)     │        │  • Full reconcile  │          │
│  │  • Loyal. → Odoo │        │  • Conflict detect │          │
│  │    (outbound)    │        │  • Error retry     │          │
│  └─────────────────┘        └──────────────────┘           │
│                                                             │
│  Conflict Resolution: LAST-WRITE-WINS with audit trail      │
│  Sync Cursor: `write_date` timestamp from Odoo              │
│  Idempotency: External ID mapping table                     │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Django App Structure

```
backend/apps/odoo_crm/
├── __init__.py
├── models.py              # OdooSyncLog, OdooExternalIdMapping, OdooConnectionConfig
├── api.py                 # Django Ninja router for tenant-facing endpoints
├── admin_api.py           # SuperAdmin endpoints for monitoring
├── services/
│   ├── __init__.py
│   ├── connection.py      # Odoo XML-RPC client, connection test
│   ├── sync_customers.py  # Bidirectional customer sync logic
│   ├── sync_transactions.py  # Transaction → Odoo activity push
│   ├── sync_pipeline.py   # CRM stage → lifecycle_state mapping
│   ├── webhook_handler.py # Inbound Odoo webhook processor
│   └── conflict.py        # Conflict resolution strategies
├── tasks.py               # Celery tasks for async sync
├── schemas.py             # Pydantic/Ninja schemas
├── urls.py                # URL routing
├── tests/
│   ├── test_connection.py
│   ├── test_sync_customers.py
│   ├── test_sync_transactions.py
│   ├── test_webhook_handler.py
│   └── test_conflict.py
└── migrations/
    └── 0001_initial.py
```

---

## 6. FUNCTIONAL REQUIREMENTS

### 6.1 Connection Management

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-ODOO-001 | System SHALL allow OWNER to configure Odoo connection parameters (URL, database, username, password/API key) via Settings → Integrations → Odoo CRM | MUST |
| LYL-FR-ODOO-002 | System SHALL store all Odoo credentials in HashiCorp Vault under `secret/data/loyallia/{env}/odoo_crm/{tenant_id}` | MUST |
| LYL-FR-ODOO-003 | System SHALL provide a "Test Connection" action that validates Odoo URL reachability, database existence, and API authentication in a single call | MUST |
| LYL-FR-ODOO-004 | Connection test SHALL return: success/failure, Odoo version detected, accessible models list, and API user permissions | MUST |
| LYL-FR-ODOO-005 | System SHALL display Odoo CRM integration status (connected/disconnected/error) on the tenant Settings page | MUST |
| LYL-FR-ODOO-006 | System SHALL validate Odoo URL format (HTTPS required in production, HTTP allowed in development) before storing | MUST |
| LYL-FR-ODOO-007 | OWNER SHALL be able to enable/disable the Odoo integration without losing configuration | MUST |
| LYL-FR-ODOO-008 | System SHALL automatically test connection on enable and block activation if connection fails | SHOULD |

### 6.2 Customer Synchronization — Odoo → Loyallia

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-ODOO-010 | System SHALL sync Odoo `res.partner` records to Loyallia `Customer` model | MUST |
| LYL-FR-ODOO-011 | Sync SHALL map: `res.partner.name` → `Customer.first_name` + `Customer.last_name` (split on first space), `res.partner.email` → `Customer.email`, `res.partner.phone` → `Customer.phone` | MUST |
| LYL-FR-ODOO-012 | System SHALL use `res.partner.write_date` as sync cursor to detect changes since last sync | MUST |
| LYL-FR-ODOO-013 | System SHALL maintain an external ID mapping table (`OdooExternalIdMapping`) linking `res.partner.id` to `Customer.id` to prevent duplicates | MUST |
| LYL-FR-ODOO-014 | System SHALL skip Odoo contacts without an email address (email is required for Loyallia customer uniqueness) | MUST |
| LYL-FR-ODOO-015 | System SHALL handle Odoo contacts with duplicate emails by using the most recently updated record | SHOULD |
| LYL-FR-ODOO-016 | System SHALL only sync Odoo contacts that are companies or individuals (skip child contacts of companies unless explicitly tagged) | SHOULD |
| LYL-FR-ODOO-017 | System SHALL support a configurable Odoo domain filter (e.g., `[('is_company', '=', True)]`) to limit which contacts are synced | SHOULD |
| LYL-FR-ODOO-018 | Sync SHALL respect tenant isolation: synced customers are always scoped to the tenant that owns the Odoo connection | MUST |
| LYL-FR-ODOO-019 | System SHALL log each sync batch (records processed, created, updated, skipped, errors) in `OdooSyncLog` | MUST |

### 6.3 Customer Synchronization — Loyallia → Odoo

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-ODOO-020 | System SHALL push new Loyallia customer enrollments to Odoo as `res.partner` records | MUST |
| LYL-FR-ODOO-021 | Pushed contacts SHALL include: name, email, phone, and a Loyallia-specific tag (`loyallia_enrolled`) | MUST |
| LYL-FR-ODOO-022 | System SHALL store the returned Odoo `res.partner.id` in the external ID mapping table | MUST |
| LYL-FR-ODOO-023 | System SHALL update the corresponding Odoo `res.partner` when a Loyallia customer's contact info changes (if bidirectional sync is enabled) | SHOULD |
| LYL-FR-ODOO-024 | System SHALL create an Odoo `crm.lead` for each new Loyallia enrollment with stage set to a configurable default (e.g., "New") | SHOULD |
| LYL-FR-ODOO-025 | Push SHALL be idempotent: re-pushing the same customer SHALL not create duplicates (matched by email) | MUST |
| LYL-FR-ODOO-026 | Failed pushes SHALL be queued for retry (max 3 attempts, exponential backoff) | MUST |

### 6.4 Transaction & Loyalty Event Sync

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-ODOO-030 | System SHALL push Loyallia transactions (stamps, redemptions, rewards, cashback) to Odoo as `crm.activity` or `mail.message` on the linked `res.partner` | MUST |
| LYL-FR-ODOO-031 | Transaction payload SHALL include: transaction type, amount, loyalty program name, timestamp, and staff who processed it | MUST |
| LYL-FR-ODOO-032 | System SHALL push customer lifecycle state changes (active → reward_ready → expired) as Odoo lead stage updates | SHOULD |
| LYL-FR-ODOO-033 | System SHALL push referral events (customer A referred customer B) as linked Odoo activities | MAY |
| LYL-FR-ODOO-034 | Transaction push SHALL be asynchronous (Celery task) and SHALL NOT block the loyalty transaction flow | MUST |
| LYL-FR-ODOO-035 | System SHALL support a configurable sync filter (e.g., only sync transactions above a minimum amount, or only specific transaction types) | SHOULD |

### 6.5 CRM Pipeline Mapping

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-ODOO-040 | System SHALL provide a mapping interface for OWNER to map Odoo `crm.lead.stage` names to Loyallia `CustomerPass.LifecycleState` values | SHOULD |
| LYL-FR-ODOO-041 | Default mapping SHALL be: Odoo "New" / "Qualified" → Loyallia `active`, Odoo "Proposition" → Loyallia `reward_ready`, Odoo "Won" → Loyallia `active` (with reward), Odoo "Lost" → Loyallia `suspended` | SHOULD |
| LYL-FR-ODOO-042 | When an Odoo lead stage changes and a mapping exists, system SHALL update the corresponding Loyallia customer lifecycle state | SHOULD |
| LYL-FR-ODOO-043 | System SHALL log all pipeline-triggered state changes with before/after values | MUST |

### 6.6 SuperAdmin Monitoring

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-ODOO-050 | SuperAdmin SHALL view platform-wide Odoo CRM integration status (all tenants with Odoo enabled/disabled/error) | MUST |
| LYL-FR-ODOO-051 | SuperAdmin SHALL view per-tenant sync statistics: last sync time, records synced, error count, sync duration | MUST |
| LYL-FR-ODOO-052 | SuperAdmin SHALL be able to trigger a manual full resync for any tenant | SHOULD |
| LYL-FR-ODOO-053 | SuperAdmin SHALL view the Odoo sync error log with filtering by tenant, date range, and error type | MUST |
| LYL-FR-ODOO-054 | SuperAdmin SHALL be able to rotate Odoo credentials via Vault without tenant involvement (emergency) | SHOULD |

---

## 7. DATA MAPPING & ENTITY SYNCHRONIZATION

### 7.1 Customer Entity Mapping

| Loyallia Field | Odoo Field | Direction | Transform |
|----------------|-----------|-----------|-----------|
| `Customer.first_name` + `Customer.last_name` | `res.partner.name` | Bidirectional | Split on first space (Odoo→Loya); concatenate (Loya→Odoo) |
| `Customer.email` | `res.partner.email` | Bidirectional | Direct, lowercase normalized |
| `Customer.phone` | `res.partner.phone` | Bidirectional | Direct, stripped of non-numeric chars for comparison |
| `Customer.date_of_birth` | `res.partner.birthdate` (custom field) | Odoo→Loya | Only if field exists in Odoo |
| `Customer.gender` | Custom field `x_loyallia_gender` | Loya→Odoo | Only if custom field exists |
| `Customer.is_active` | `res.partner.active` | Bidirectional | Direct boolean |
| `Customer.total_visits` | `res.partner.x_loyallia_visits` (custom) | Loya→Odoo | Write only, custom field must be created |
| `Customer.total_spent` | `res.partner.x_loyallia_spent` (custom) | Loya→Odoo | Write only, custom field must be created |
| `Customer.referral_code` | `res.partner.ref` (reference field) | Loya→Odoo | Direct string |
| N/A | `res.partner.id` | Odoo→Loya | Stored in `OdooExternalIdMapping.odo_id` |
| `Customer.id` | `res.partner.x_loyallia_id` (custom) | Loya→Odoo | UUID string, for reverse lookup |

### 7.2 Transaction → Odoo Activity Mapping

| Loyallia Event | Odoo Record Type | Fields |
|----------------|-----------------|--------|
| `Transaction` (stamp) | `crm.activity` | Summary: "Sello #{n} — {program_name}", Date, Assigned to (staff) |
| `Transaction` (cashback) | `crm.activity` | Summary: "Cashback ${amount} — {program_name}", Date |
| `Transaction` (redemption) | `crm.activity` | Summary: "Canje — {reward_name}", Date |
| `Customer` enrolled | `crm.lead` | Name: "{customer_name} — Loyallia", Stage: configurable default |
| `CustomerPass` state change | `crm.lead` stage update | Stage updated per §6.5 mapping |
| Referral event | `mail.message` | Body: "{referrer} refirió a {referred}", on referrer's partner |

### 7.3 Sync Cursor Model

```python
class OdooSyncCursor(TimestampedModel):
    """Tracks the last successful sync position per entity type per tenant."""

    tenant = ForeignKey(Tenant)
    entity_type = CharField()  # "res.partner", "crm.lead"
    last_sync_at = DateTimeField()  # Odoo write_date of last synced record
    last_odoo_id = BigIntegerField()  # Odoo record ID of last synced record
    records_synced = PositiveIntegerField(default=0)
    sync_direction = CharField()  # "inbound", "outbound", "bidirectional"
```

### 7.4 External ID Mapping Model

```python
class OdooExternalIdMapping(TimestampedModel):
    """Maps Loyallia entity IDs to Odoo record IDs for idempotent sync."""

    tenant = ForeignKey(Tenant)
    loyallia_model = CharField()  # "customer", "transaction", "pass"
    loyallia_id = UUIDField()
    odoo_model = CharField()  # "res.partner", "crm.lead"
    odoo_id = BigIntegerField()
    last_synced_at = DateTimeField()
    sync_status = CharField()  # "synced", "pending", "conflict", "error"
```

---

## 8. API ENDPOINTS

### 8.1 Tenant-Facing Endpoints (Django Ninja)

All endpoints are scoped to the authenticated tenant via JWT.

| Endpoint | Method | Description | Req ID |
|----------|--------|-------------|--------|
| `/api/v1/integrations/odoo/config/` | GET | Get current Odoo connection config (secrets masked) | LYL-FR-ODOO-001 |
| `/api/v1/integrations/odoo/config/` | PUT | Update Odoo connection config | LYL-FR-ODOO-001 |
| `/api/v1/integrations/odoo/test/` | POST | Test Odoo connection | LYL-FR-ODOO-003 |
| `/api/v1/integrations/odoo/status/` | GET | Get integration status and last sync info | LYL-FR-ODOO-005 |
| `/api/v1/integrations/odoo/enable/` | POST | Enable integration | LYL-FR-ODOO-007 |
| `/api/v1/integrations/odoo/disable/` | POST | Disable integration | LYL-FR-ODOO-007 |
| `/api/v1/integrations/odoo/sync/customers/` | POST | Trigger manual customer sync | LYL-FR-ODOO-010 |
| `/api/v1/integrations/odoo/sync/transactions/` | POST | Trigger manual transaction sync | LYL-FR-ODOO-030 |
| `/api/v1/integrations/odoo/sync/status/` | GET | Get detailed sync status and history | LYL-FR-ODOO-019 |
| `/api/v1/integrations/odoo/mapping/stages/` | GET | Get CRM stage → lifecycle state mapping | LYL-FR-ODOO-040 |
| `/api/v1/integrations/odoo/mapping/stages/` | PUT | Update CRM stage mapping | LYL-FR-ODOO-040 |
| `/api/v1/webhooks/odoo/{tenant_id}/` | POST | Inbound webhook receiver from Odoo | LYL-FR-ODOO-006 |

### 8.2 SuperAdmin Endpoints

| Endpoint | Method | Description | Req ID |
|----------|--------|-------------|--------|
| `/api/v1/admin/platform/integrations/odoo/` | GET | Platform-wide Odoo integration status | LYL-FR-ODOO-050 |
| `/api/v1/admin/platform/integrations/odoo/{tenant_id}/stats/` | GET | Per-tenant sync statistics | LYL-FR-ODOO-051 |
| `/api/v1/admin/platform/integrations/odoo/{tenant_id}/resync/` | POST | Trigger full resync for tenant | LYL-FR-ODOO-052 |
| `/api/v1/admin/platform/integrations/odoo/errors/` | GET | Sync error log (filterable) | LYL-FR-ODOO-053 |

---

## 9. WEBHOOK & EVENT SYSTEM

### 9.1 Inbound Webhooks (Odoo → Loyallia)

Odoo can notify Loyallia of changes via HTTP POST webhooks. The recommended approach is to use Odoo's **Automated Actions** (Settings → Technical → Automated Actions) to trigger HTTP requests on model changes.

#### 9.1.1 Endpoint

```
POST /api/v1/webhooks/odoo/{tenant_id}/
```

#### 9.1.2 Authentication

Requests MUST include an HMAC-SHA256 signature:

```
Header: X-Loyallia-Signature: sha256={hex_digest}
Body: Raw JSON payload
Secret: Per-tenant webhook secret stored in Vault
```

#### 9.1.3 Supported Event Types

| Odoo Event | Webhook Payload | Loyallia Action |
|-----------|-----------------|-----------------|
| `res.partner` created | `{event: "partner_created", data: {id, name, email, phone}}` | Create or link Loyallia customer |
| `res.partner` updated | `{event: "partner_updated", data: {id, name, email, phone, write_date}}` | Update linked Loyallia customer |
| `res.partner` deleted | `{event: "partner_deleted", data: {id}}` | Mark linked customer as inactive (soft) |
| `crm.lead` stage changed | `{event: "lead_stage_changed", data: {id, partner_id, stage_name}}` | Update customer lifecycle_state per mapping |

#### 9.1.4 Webhook Payload Schema

```json
{
  "event": "partner_created",
  "timestamp": "2026-06-15T10:30:00Z",
  "database": "mycompany-production",
  "data": {
    "id": 12345,
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "+593991234567",
    "write_date": "2026-06-15 10:30:00"
  }
}
```

#### 9.1.5 Idempotency

Each webhook delivery MUST include an `id` and `timestamp`. The receiver SHALL deduplicate using:

```python
dedup_key = f"odoo:{tenant_id}:{event}:{data['id']}:{timestamp}"
```

Duplicate events within a 5-minute window SHALL be silently ignored.

### 9.2 Outbound Webhooks (Loyallia → Odoo)

When a Loyallia loyalty event occurs and the Odoo integration is enabled, the system SHALL push the event to the tenant's Odoo instance.

#### 9.2.1 Trigger Events

| Loyallia Event | Odoo Target | Payload |
|----------------|------------|---------|
| Customer enrolled | `res.partner` (create/update) | Contact data + `loyallia_enrolled` tag |
| Transaction recorded | `crm.activity` on linked partner | Transaction details |
| Reward earned | `crm.activity` on linked partner | Reward details |
| Customer lifecycle state changed | `crm.lead` stage update | New state + reason |
| Referral completed | `mail.message` on referrer's partner | Referral details |

#### 9.2.2 Implementation

Uses the existing `execute_trigger_webhook` pattern from `apps/automation/webhook_executor.py`, extended with:

- Odoo XML-RPC client (preferred over HTTP webhooks for create/update operations)
- Retry queue (Celery task with exponential backoff)
- Sync log entry per push

---

## 10. VAULT & SECRETS MANAGEMENT

### 10.1 Vault Keys

All Odoo credentials are stored in HashiCorp Vault following the established pattern in `integration_config.py`.

| Vault Key | Type | Description | Validation |
|-----------|------|-------------|------------|
| `odoo_crm_enabled` | boolean | "true" / "false" | Must be "true" or "false" |
| `odoo_instance_url` | string | Odoo base URL | Must be valid HTTPS URL (HTTP in dev) |
| `odoo_database` | string | Odoo database name | Alphanumeric + hyphens, 1-63 chars |
| `odoo_api_username` | string | Odoo API user email | Must be valid email format |
| `odoo_api_password` | string | Odoo API password or API key | Min 8 chars, not stored in logs |
| `odoo_webhook_secret` | string | HMAC secret for inbound webhook verification | Min 32 chars, auto-generated |

### 10.2 Vault Path Structure

```
secret/data/loyallia/production/odoo_crm/{tenant_id}/
  ├── odoo_crm_enabled
  ├── odoo_instance_url
  ├── odoo_database
  ├── odoo_api_username
  ├── odoo_api_password
  └── odoo_webhook_secret
```

### 10.3 Integration Config Registration

The following keys SHALL be added to `ALLOWED_INTEGRATION_KEYS` in `integration_config.py`:

```python
"odoo_crm": [
    "odoo_crm_enabled",
    "odoo_instance_url",
    "odoo_database",
    "odoo_api_username",
    "odoo_api_password",
    "odoo_webhook_secret",
],
```

### 10.4 Credential Validation

`normalize_and_validate_vault_secret` in `integration_config.py` SHALL be extended with:

| Key | Validation |
|-----|-----------|
| `odoo_crm_enabled` | Must be "true" or "false" |
| `odoo_instance_url` | Must match `https://` regex (or `http://localhost` in dev) |
| `odoo_database` | Must match `^[a-zA-Z0-9][a-zA-Z0-9\-]{0,62}$` |
| `odoo_api_username` | Must be valid email format |
| `odoo_api_password` | Min length 8, no logging |
| `odoo_webhook_secret` | Min length 32, auto-generated if empty |

---

## 11. SECURITY REQUIREMENTS

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-SEC-ODOO-001 | All communication with Odoo SHALL use HTTPS (TLS 1.2+) in production | MUST |
| LYL-SEC-ODOO-002 | Odoo credentials SHALL be stored exclusively in HashiCorp Vault, NEVER in code, env files, or Git | MUST |
| LYL-SEC-ODOO-003 | Inbound webhook requests SHALL be verified using HMAC-SHA256 signature before processing | MUST |
| LYL-SEC-ODOO-004 | Odoo API password SHALL NEVER appear in logs, API responses, or error messages | MUST |
| LYL-SEC-ODOO-005 | Sync operations SHALL respect tenant isolation: synced data is always scoped to the owning tenant | MUST |
| LYL-SEC-ODOO-006 | Failed authentication attempts against Odoo SHALL be rate-limited (max 5 per hour per tenant) | MUST |
| LYL-SEC-ODOO-007 | The webhook endpoint SHALL validate the Odoo database name in the payload matches the tenant's configured database | MUST |
| LYL-SEC-ODOO-008 | All sync operations SHALL be audit-logged with actor, action, entity, and timestamp | MUST |
| LYL-SEC-ODOO-009 | PII transferred to/from Odoo SHALL comply with LOPDP data minimization principles (only necessary fields) | MUST |
| LYL-SEC-ODOO-010 | Webhook endpoint SHALL enforce request body size limit (max 1MB) to prevent abuse | MUST |
| LYL-SEC-ODOO-011 | Odoo API credentials SHALL be cacheable for max 5 minutes (Vault cache TTL), matching existing pattern | MUST |
| LYL-SEC-ODOO-012 | Customer right-to-delete (LOPDP Art. 17) SHALL propagate to Odoo: deleted Loyallia customers SHALL have their corresponding Odoo custom fields cleared | SHOULD |

---

## 12. NON-FUNCTIONAL REQUIREMENTS

### 12.1 Performance

| Req ID | Requirement | Target |
|--------|-------------|--------|
| LYL-NFR-ODOO-001 | Customer sync batch (100 records) | ≤30 seconds |
| LYL-NFR-ODOO-002 | Single transaction push to Odoo | ≤5 seconds |
| LYL-NFR-ODOO-003 | Connection test latency | ≤10 seconds |
| LYL-NFR-ODOO-004 | Inbound webhook processing | ≤2 seconds per event |
| LYL-NFR-ODOO-005 | Full reconciliation sync (10,000 customers) | ≤10 minutes |
| LYL-NFR-ODOO-006 | Sync SHALL NOT add more than 50ms to the loyalty transaction flow (async only) | MUST |

### 12.2 Reliability

| Req ID | Requirement | Target |
|--------|-------------|--------|
| LYL-NFR-ODOO-010 | Failed sync attempts SHALL retry 3 times with exponential backoff (30s, 2min, 8min) | MUST |
| LYL-NFR-ODOO-011 | Sync SHALL be idempotent: re-running the same sync SHALL not create duplicates | MUST |
| LYL-NFR-ODOO-012 | Odoo downtime SHALL NOT affect Loyallia core operations (loyalty transactions, enrollment, scanning) | MUST |
| LYL-NFR-ODOO-013 | Integration SHALL gracefully degrade: if Odoo is unreachable, events are queued for retry (max 24h retention) | MUST |
| LYL-NFR-ODOO-014 | System SHALL detect and log sync conflicts without silently overwriting data | MUST |

### 12.3 Scalability

| Req ID | Requirement |
|--------|-------------|
| LYL-NFR-ODOO-020 | System SHALL support ≥100 tenants with Odoo integration enabled simultaneously |
| LYL-NFR-ODOO-021 | System SHALL handle Odoo instances with ≥50,000 contacts per tenant |
| LYL-NFR-ODOO-022 | Sync workers SHALL use paginated Odoo API calls (100 records per page) to avoid memory issues |

### 12.4 Maintainability

| Req ID | Requirement |
|--------|-------------|
| LYL-NFR-ODOO-030 | Odoo API client SHALL be isolated in a service module (`services/connection.py`) to allow future protocol changes |
| LYL-NFR-ODOO-031 | Data mapping logic SHALL be configurable (not hardcoded field names) to support Odoo customizations |
| LYL-NFR-ODOO-032 | All sync operations SHALL produce structured log output (JSON) for log aggregation (Loki) |

---

## 13. USER JOURNEYS

### UJ-O01: Owner Enables Odoo Integration

1. OWNER navigates to **Settings → Integrations → Odoo CRM**
2. System displays connection form: URL, Database, Username, Password
3. OWNER fills in Odoo instance details and clicks **"Probar Conexión"**
4. System validates credentials against Odoo XML-RPC API
5. On success: displays Odoo version, accessible models, and user permissions
6. On failure: displays specific error (unreachable, auth failed, database not found)
7. OWNER clicks **"Activar Integración"**
8. System stores credentials in Vault, enables sync, performs initial customer import
9. Dashboard shows Odoo CRM integration card as **"Conectado"**

### UJ-O02: Customer Auto-Sync from Odoo

1. Odoo user creates a new contact: `Maria García, maria@example.com, +593998765432`
2. Odoo Automated Action triggers webhook to Loyallia
3. Loyallia webhook endpoint receives event, verifies HMAC signature
4. System checks external ID mapping — no existing record found
5. System creates new Loyallia Customer under the tenant
6. System stores Odoo `res.partner.id` in mapping table
7. `OdooSyncLog` records the inbound sync event
8. If loyalty program exists, system optionally enrolls customer (configurable)

### UJ-O03: Loyalty Transaction Pushed to Odoo

1. Staff scans customer QR at store, awards 1 stamp
2. Loyallia processes transaction normally (no latency added)
3. Celery task fires asynchronously: push transaction to Odoo
4. System looks up customer's Odoo partner ID in mapping table
5. System creates `crm.activity` on the Odoo partner: "Sello #7 — Café Premium"
6. `OdooSyncLog` records the outbound sync event
7. If Odoo is unreachable: event queued for retry, logged as "pending"

### UJ-O04: Manual Sync Trigger

1. MANAGER navigates to **Settings → Odoo CRM → Sync Status**
2. System displays: last sync time, records synced, pending errors
3. MANAGER clicks **"Sincronizar Ahora"**
4. System enqueues a Celery task for full reconciliation sync
5. Task fetches all Odoo contacts modified since last sync cursor
6. Task processes: creates new, updates changed, skips unchanged
7. System updates sync cursor and logs batch results
8. Dashboard refreshes with updated sync statistics

### UJ-O05: SuperAdmin Monitors Integration Health

1. SUPER_ADMIN navigates to **Platform Settings → Integrations → Odoo CRM**
2. System displays table of all tenants with Odoo enabled/disabled/error
3. SUPER_ADMIN clicks a tenant to view detailed stats
4. System shows: sync history chart, error log, last 10 sync batches
5. SUPER_ADMIN sees repeated auth errors, rotates credentials via Vault editor
6. SUPER_ADMIN triggers manual resync to verify fix

---

## 14. CONSTRAINTS & ASSUMPTIONS

### 14.1 Technical Constraints

1. Odoo's XML-RPC API is the primary integration method. JSON-RPC is available as fallback but requires session management.
2. Odoo Community Edition does not include the `crm` module by default — customers must install it.
3. Odoo custom fields (`x_` prefix) require the customer to create them manually or the integration must create them via API (requires admin permissions).
4. Odoo rate limits are instance-specific (no documented global limit). The integration SHALL implement client-side rate limiting (max 10 requests/second per tenant).
5. Odoo's `res.partner` model merges contacts and companies — the integration must handle both.
6. The webhook approach (Automated Actions) requires Odoo Enterprise or the `base_automation` module in Community.

### 14.2 Business Constraints

1. Each tenant connects to exactly one Odoo instance. Multi-instance support is out of scope.
2. The integration is opt-in: no data flows to/from Odoo unless the tenant explicitly enables it.
3. Sync frequency is platform-controlled (default: every 15 minutes for batch, real-time for webhooks).

### 14.3 Assumptions

1. Tenant's Odoo instance is internet-accessible from the Loyallia server (no VPN/private network).
2. Tenant's Odoo API user has read/write access to `res.partner`, `crm.lead`, `crm.activity`, and `mail.message`.
3. Odoo instances use Odoo 16 or 17 (XML-RPC API is stable across these versions).
4. Customer contact data (email, phone) is the primary reconciliation key between systems.
5. The tenant accepts eventual consistency (≤5 min) rather than real-time sync.

---

## 15. VERIFICATION & ACCEPTANCE CRITERIA

| Test ID | Criterion | Req IDs |
|---------|-----------|---------|
| LYL-ACC-ODOO-001 | Owner configures Odoo connection → "Test Connection" succeeds within 10 seconds | LYL-FR-ODOO-003, 004 |
| LYL-ACC-ODOO-002 | Owner enables integration → initial customer sync completes without errors | LYL-FR-ODOO-008, 010 |
| LYL-ACC-ODOO-003 | New Odoo contact → webhook received → Loyallia customer created within 30 seconds | LYL-FR-ODOO-010, 011 |
| LYL-ACC-ODOO-004 | Loyallia enrollment → Odoo `res.partner` created with correct field mapping | LYL-FR-ODOO-020, 021 |
| LYL-ACC-ODOO-005 | Loyalty transaction → Odoo `crm.activity` created asynchronously (no transaction delay) | LYL-FR-ODOO-030, 034 |
| LYL-ACC-ODOO-006 | Duplicate webhook → idempotency key prevents duplicate processing | LYL-FR-ODOO-025, §9.1.5 |
| LYL-ACC-ODOO-007 | Odoo unreachable for 1 hour → events queued → delivered when Odoo recovers | LYL-NFR-ODOO-013 |
| LYL-ACC-ODOO-008 | Cross-tenant data access attempt → 403 Forbidden | LYL-SEC-ODOO-005 |
| LYL-ACC-ODOO-009 | Odoo credentials masked in all API responses and logs | LYL-SEC-ODOO-004 |
| LYL-ACC-ODOO-010 | Full resync of 10,000 contacts completes in ≤10 minutes | LYL-NFR-ODOO-005 |
| LYL-ACC-ODOO-011 | SuperAdmin views platform-wide Odoo status → all tenant statuses displayed | LYL-FR-ODOO-050 |
| LYL-ACC-ODOO-012 | Customer deleted in Loyallia → Odoo custom fields cleared (LOPDP compliance) | LYL-SEC-ODOO-012 |

---

## 16. ERROR HANDLING & RESILIENCE

### 16.1 Error Categories

| Category | Example | Handling |
|----------|---------|----------|
| Connection Error | Odoo unreachable, DNS failure | Retry 3x, queue for later, log error |
| Authentication Error | Invalid credentials, expired API key | Disable integration, notify OWNER, log error |
| Data Error | Missing required field, invalid format | Skip record, log warning, continue batch |
| Rate Limit Error | Odoo returns HTTP 429 | Back off exponentially, retry |
| Conflict Error | Record modified in both systems | Last-write-wins, log conflict with both versions |
| Webhook Error | Invalid signature, malformed payload | Reject with 400, log attempt |

### 16.2 Retry Policy

| Attempt | Delay | Action |
|---------|-------|--------|
| 1 | Immediate | Normal execution |
| 2 | 30 seconds | Normal execution |
| 3 | 2 minutes | Normal execution |
| Final | — | Mark as failed, log to `OdooSyncLog`, alert if error count > threshold |

### 16.3 Dead Letter Queue

Failed sync events (after all retries) SHALL be stored in a `OdooSyncDLQ` model:

```python
class OdooSyncDLQ(TimestampedModel):
    """Dead letter queue for failed Odoo sync events."""

    tenant = ForeignKey(Tenant)
    event_type = CharField()  # "customer_sync", "transaction_push", etc.
    payload = JSONField()     # Original event data
    error_message = TextField()
    retry_count = PositiveIntegerField(default=0)
    resolved = BooleanField(default=False)
    resolved_at = DateTimeField(null=True)
```

SuperAdmin can view and manually resolve/retry DLQ entries.

---

## 17. OPEN QUESTIONS

| ID | Question | Owner | Status |
|----|----------|-------|--------|
| OQ-001 | Should we support Odoo Community Edition (requires manual `crm` module install) or restrict to Enterprise? | Product | OPEN |
| OQ-002 | Should the integration create custom fields (`x_loyallia_*`) in Odoo automatically, or require manual setup? | Product | OPEN |
| OQ-003 | Should we provide an Odoo module (addon) for tighter integration, or rely solely on XML-RPC + Automated Actions? | Engineering | OPEN |
| OQ-004 | What is the expected ratio of Odoo contacts per tenant (helps size the sync infrastructure)? | Product | OPEN |
| OQ-005 | Should the integration support Odoo multi-company setups (one Odoo instance, multiple companies = multiple tenants)? | Product | OPEN |
| OQ-006 | Should loyalty program enrollment be automatic for Odoo-imported customers, or require manual enrollment per customer? | Product | OPEN |

---

## 18. DOCUMENT APPROVAL

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
| Created | 2026-06-15 | Engineering Lead | Initial draft |
| Under Review | | | Pending approval |
| Approved | | | All signatures obtained |
| Active | | | Implementation started |
| Deprecated | | | Superseded by newer version |
| Archived | | | Moved to `docs/09-archive/` |

### Next Review Date

| Trigger | Review By |
|---------|-----------|
| Odoo integration v2 scope change | Upon trigger |
| Annual review cycle | 2027-06-15 |
| Parent SRS major version update | Within 30 days of parent update |
| Security incident affecting integration | Immediately |

---

*End of SRS Document — LOYALLIA-SRS-ODOO-CRM-001 v1.0*
*Parent Document: LOYALLIA-SRS-001 v1.0.0*
*Standard: ISO/IEC 29148:2018*
*Classification: Internal Use*
*Next: Implementation plan and Django app scaffolding*
