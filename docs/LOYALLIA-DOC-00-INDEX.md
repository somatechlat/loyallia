---
title: "Loyallia Documentation Index"
document_id: "LOYALLIA-DOC-00-INDEX.MD"
version: "1.5"
status: "approved"
last_updated: "2026-09-30"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "N/A"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-DOC-00-INDEX.MD |
| **Title** | Loyallia Documentation Index |
| **Version** | 1.5 |
| **Date** | 2026-09-30 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011|
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/LOYALLIA-DOC-00-INDEX.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-16 | Engineering Lead | Added ISO-compliant document controls |
| 1.1 | 2026-09-23 | Engineering Lead | Registered SRS-012, Wallet Designer Unification plan, client-request source materials, and all code-module documentation. Added "Code Module Documentation" section. |
| 1.2 | 2026-09-23 | Engineering Lead | Documentation-wide ISO control sweep (124 documents): retargeted 112 legacy `LOYALLIA-ARCH-001` Related-Documents references to the canonical `LOYALLIA-DOC-ARCHITECTURE.MD`; normalised every `Standard` declaration (table row, YAML frontmatter, inline) to the canonical string `ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011`; bolded all DOCUMENT CONTROL field labels and removed bolding from table header rows so field labels and headers are visually distinct. Mechanical formatting and cross-reference corrections only — no requirement content changed. |
| 1.3 | 2026-09-30 | Engineering Lead | Registered wallet design documentation under Guides: `LOYALLIA-GUIDE-DS-001` (design system tokens), `LOYALLIA-GUIDE-TPL-001` (31 system card templates and gallery), `LOYALLIA-GUIDE-ICONS-001` (stamp motifs, shapes, renderer, picker). |
| 1.4 | 2026-09-30 | Engineering Lead | Registered backend module guides under Guides: `LOYALLIA-GUIDE-NOTIFY-001` (wallet notification engine), `LOYALLIA-GUIDE-APPLEWS-001` (Apple PassKit web service), `LOYALLIA-GUIDE-REDEEMRBAC-001` (scanner RBAC and redemption rules). |
| 1.5 | 2026-10-08 | Engineering Lead | ISO filename compliance: renamed 125 documents to match `document_id`; updated all cross-links; archived superseded factory-reset procedure and stale planning SRS/RFP/TODO files. |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation |
| Security Officer | Reviewer | Security requirements validation |
| QA Lead | Reviewer | Quality assurance validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Reference |
| LOYALLIA-DOC-ARCHITECTURE.MD | Loyallia Architecture, Sequence & Flowchart Diagrams | Reference |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-16 | Approved |
| Product Owner | — | — | 2026-09-16 | Approved |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-16 | Engineering Lead | Initial ISO controls added |
| Approved | 2026-09-16 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |

# Loyallia Documentation Index

This is the master index for all project documentation. The code is the only source of truth; documentation here reflects the state of the repository as of the last audit.

> **Protected entry points:** `README.md`, `AGENTS.md`, and `rules.md` in the repository root remain the primary starting points for humans and agents.

## Structure

### Start Here

- [Loyallia — Agent Onboarding Guide](01-start-here/LOYALLIA-DOC-AGENT_ONBOARDING.md)

### Architecture

- [Apple Wallet Web PKPass And NFC Architecture](02-architecture/LOYALLIA-DOC-APPLE_WALLET_WEB_PKPASS_NFC.md)
- [LOYALLIA — ARCHITECTURE, SEQUENCE & FLOWCHART DIAGRAMS](02-architecture/LOYALLIA-DOC-ARCHITECTURE.md)
- [Loyallia — Backup & Disaster Recovery Architecture](02-architecture/LOYALLIA-DOC-BACKUP_ARCHITECTURE.md)
- [Loyallia — Zero Trust Bootstrap Architecture](02-architecture/LOYALLIA-DOC-BOOTSTRAP_ARCHITECTURE.md)

### Guides

- [Apple Wallet Web Service Guide](03-guides/LOYALLIA-GUIDE-APPLEWS-001.md) — `LOYALLIA-GUIDE-APPLEWS-001`
- [Authentication Subsystem Guide](03-guides/LOYALLIA-DOC-AUTHENTICATION.md)
- [Backup System Testing Plan — Local Development Environment](03-guides/LOYALLIA-DOC-BACKUP_TESTING_PLAN.md)
- [Billing & Payments Subsystem Guide](03-guides/LOYALLIA-DOC-BILLING-PAYMENTS.md)
- [Notification Engine Guide](03-guides/LOYALLIA-GUIDE-NOTIFY-001.md) — `LOYALLIA-GUIDE-NOTIFY-001`
- [Notifications Subsystem Guide](03-guides/LOYALLIA-DOC-NOTIFICATIONS.md)
- [Production E2E Testing Guide](03-guides/LOYALLIA-DOC-PRODUCTION_E2E_TESTING.md)
- [Redemption Engine Subsystem Guide](03-guides/LOYALLIA-DOC-REDEMPTION-ENGINE.md)
- [Redemption Permissions Guide](03-guides/LOYALLIA-GUIDE-REDEEMRBAC-001.md) — `LOYALLIA-GUIDE-REDEEMRBAC-001`
- [Wallet Card Templates Guide](03-guides/LOYALLIA-GUIDE-TPL-001.md) — `LOYALLIA-GUIDE-TPL-001`
- [Wallet Design System Guide](03-guides/LOYALLIA-GUIDE-DS-001.md) — `LOYALLIA-GUIDE-DS-001`
- [Wallet Icon System Guide](03-guides/LOYALLIA-GUIDE-ICONS-001.md) — `LOYALLIA-GUIDE-ICONS-001`

### Runbooks

- [Alertmanager](04-runbooks/LOYALLIA-DOC-ALERTMANAGER.md)
- [Prometheus Alert Rules](04-runbooks/LOYALLIA-DOC-ALERTS.md)
- [Loyallia — Backup Operations Runbook](04-runbooks/LOYALLIA-DOC-BACKUP_OPERATIONS_RUNBOOK.md)
- [Loyallia Production Deployment Guide](04-runbooks/LOYALLIA-DOC-DEPLOYMENT_GUIDE.md)
- [Loyallia — Disaster Recovery Playbook](04-runbooks/LOYALLIA-DOC-DISASTER_RECOVERY_PLAYBOOK.md)
- [E2E Testing Runbook](04-runbooks/LOYALLIA-DOC-E2E_TESTING_RUNBOOK.md)
- [Loyallia On-Call Escalation Matrix](04-runbooks/LOYALLIA-DOC-ESCALATION.md)
- [Factory Reset](04-runbooks/LOYALLIA-DOC-FACTORY_RESET.md)
- [Grafana](04-runbooks/LOYALLIA-DOC-GRAFANA.md)
- [PgBouncer](04-runbooks/LOYALLIA-DOC-PGBOUNCER.md)
- [PostgreSQL](04-runbooks/LOYALLIA-DOC-POSTGRES.md)
- [Redis](04-runbooks/LOYALLIA-DOC-REDIS.md)
- [Operational Scripts](04-runbooks/LOYALLIA-DOC-SCRIPTS.md)
- [HashiCorp Vault](04-runbooks/LOYALLIA-DOC-VAULT.md)

### Compliance

- [Loyallia — Production Compliance Checklist](05-compliance/LOYALLIA-DOC-COMPLIANCE_CHECKLIST.md)
- [Loyallia-k2 Rules Compliance Audit Report](05-compliance/LOYALLIA-DOC-REVIEW_RULES_COMPLIANCE.md)
- [ISMS Scope Statement](05-compliance/iso27001/LOYALLIA-DOC-01-ISMS-SCOPE.md)
- [Loyallia — Risk Assessment and Risk Treatment Plan](05-compliance/iso27001/LOYALLIA-DOC-02-RISK-ASSESSMENT.md)
- [Loyallia — Statement of Applicability (SoA)](05-compliance/iso27001/LOYALLIA-DOC-03-STATEMENT-OF-APPLICABILITY.md)
- [Access Control Policy](05-compliance/iso27001/LOYALLIA-DOC-04-ACCESS-CONTROL-POLICY.md)
- [Incident Management Procedure](05-compliance/iso27001/LOYALLIA-DOC-05-INCIDENT-MANAGEMENT.md)
- [Business Continuity and Disaster Recovery Policy](05-compliance/iso27001/LOYALLIA-DOC-06-BCP-DR-POLICY.md)

### Planning

- [Planning Documents](06-planning/LOYALLIA-DOC-PLANNING-README-001.md)
- [SOFTWARE REQUIREMENTS SPECIFICATION (SRS) — archived](09-archive/superseded-planning/LOYALLIA-DOC-SRS_LOYALLIA_COMPLETE.md)
- [SOFTWARE REQUIREMENTS SPECIFICATION (SRS)](09-archive/superseded-planning/LOYALLIA-DOC-SRS_LOYALLIA_HARDENING_V1.0.md)
- [SOFTWARE REQUIREMENTS SPECIFICATION (SRS) — Odoo CRM Integration Module](06-planning/LOYALLIA-SRS-ODOO-CRM-001.md)
- [SRS — Odoo CRM Integration Recommendations](06-planning/LOYALLIA-SRS-ODOO-CRM-002.md)
- [SRS — Odoo CRM Integration Verified](06-planning/LOYALLIA-SRS-ODOO-CRM-003.md)
- [LOYALLIA — SRS Boomerangme Feature Parity](06-planning/LOYALLIA-SRS-BOOMERANG-001.md)
- [LOYALLIA — RFP Boomerangme Feature Parity — archived](09-archive/superseded-planning/LOYALLIA-RFP-BOOMERANG-001.md)
- [LOYALLIA — System Hardening Plan](06-planning/LOYALLIA-PLAN-HARDENING-001.md)
- [LOYALLIA — Designer Fix Plan](06-planning/LOYALLIA-PLAN-DESIGNER-FIX-002.md)
- [LOYALLIA — COMPREHENSIVE TESTING & DOCUMENTATION AUDIT PLAN](06-planning/LOYALLIA-DOC-TESTING_AUDIT_PLAN.md)
- [Current Production Readiness TODO — archived](09-archive/superseded-planning/LOYALLIA-DOC-TODO_CURRENT_PRODUCTION_READINESS.md)
- [Wallet Push Notifications — Investigation & Fix Plan](06-planning/LOYALLIA-DOC-WALLET_PUSH_NOTIFICATIONS_PLAN.md)
- [UX/UI Improvement Plan — Loyalty Card Designer](06-planning/LOYALLIA-PLAN-UX-UI-LOYALTY-CARDS-001.md)
- [📋 Documento 1: Análisis de Problemas + Propuesta de Arquitectura](06-planning/campaigns-redesign/LOYALLIA-DOC-01-ANALYSIS.md)
- [🎨 Documento 2: Mocks de Todas las Pantallas](06-planning/campaigns-redesign/LOYALLIA-DOC-02-MOCKS.md)
- [📐 Documento 3: Decisiones de UX + Especificaciones Técnicas](06-planning/campaigns-redesign/LOYALLIA-DOC-03-DECISIONS.md)
- [LOYALLIA — MASTER SYS ADMIN IMPLEMENTATION PLAN](06-planning/implementation/LOYALLIA-DOC-MASTER_SYSADMIN_PLAN.md)
- [Software Requirements Specification (SRS): Comprehensive System User Journeys](06-planning/LOYALLIA-DOC-SRS_USER_JOURNEYS.md)
- [i18n Complete Audit & Fix — Implementation Plan](06-planning/superpowers/plans/LOYALLIA-DOC-2026-06-03-I18N-COMPLETE-AUDIT-FIX.md)
- [Wallet Pass Studio — Complete Gap Fix Implementation Plan](06-planning/superpowers/plans/LOYALLIA-DOC-2026-06-04-WALLET-STUDIO-COMPLETE.md)
- [Documentation Audit and Reorganization Implementation Plan](06-planning/superpowers/plans/LOYALLIA-DOC-2026-06-11-DOCUMENTATION-AUDIT-REORGANIZATION-PLAN.md)
- [i18n Complete Audit & Fix — Design Document](06-planning/superpowers/specs/LOYALLIA-DOC-2026-06-03-I18N-COMPLETE-AUDIT-FIX-DESIGN.md)
- [Documentation Audit and Reorganization](06-planning/superpowers/specs/LOYALLIA-DOC-2026-06-11-DOCUMENTATION-AUDIT-REORGANIZATION-DESIGN.md)
- [Customer Journey](06-planning/user-journeys/LOYALLIA-DOC-CUSTOMER.md)
- [Manager Journey](06-planning/user-journeys/LOYALLIA-DOC-MANAGER.md)
- [Owner Journey](06-planning/user-journeys/LOYALLIA-DOC-OWNER.md)
- [Staff Journey](06-planning/user-journeys/LOYALLIA-DOC-STAFF.md)
- [Super Admin Journey](06-planning/user-journeys/LOYALLIA-DOC-SUPER_ADMIN.md)
- [Wallet Pass Studio — Complete Implementation Guide](06-planning/wallet-studio/LOYALLIA-DOC-COMPLETE-IMPLEMENTATION-GUIDE.md)
- [Wallet Designer — Complete Feature Inventory & Audit](06-planning/wallet-studio/LOYALLIA-DOC-WALLET-DESIGNER-INVENTORY-001.md)
- [Wallet Pass Studio — Complete Fix Plan](06-planning/wallet-studio/LOYALLIA-DOC-DEV-FIX-PLAN.md)
- [Wallet Pass Studio — Documentation Index](06-planning/wallet-studio/LOYALLIA-DOC-WPS-README-001.md)
- [SRS-001: Requirements — Introduction, Research & Current State](06-planning/wallet-studio/LOYALLIA-DOC-SRS-001-REQUIREMENTS.md)
- [SRS-002: Architecture & State Management](06-planning/wallet-studio/LOYALLIA-DOC-SRS-002-ARCHITECTURE.md)
- [SRS-003: UI Specifications & Screen Mockups — OPTIMIZED v2](06-planning/wallet-studio/LOYALLIA-DOC-SRS-003-UI-SPECIFICATIONS.md)
- [SRS-004: Appendices — Complete Platform Reference](06-planning/wallet-studio/LOYALLIA-DOC-SRS-004-APPENDICES.md)
- [SRS-005: User Journeys & Interaction Flows](06-planning/wallet-studio/LOYALLIA-DOC-SRS-005-USER-JOURNEYS.md)
- [SRS-006: Card-Type Visual Customization Matrix](06-planning/wallet-studio/LOYALLIA-DOC-SRS-006-CARD-TYPE-VISUAL-CUSTOMIZATION.md)
- [SRS-007: AI Integration Specification — Groq API](06-planning/wallet-studio/LOYALLIA-DOC-SRS-007-AI-INTEGRATION.md)
- [SRS-008: Back of Pass (Reverse) Design Specification](06-planning/wallet-studio/LOYALLIA-DOC-SRS-008-BACK-OF-PASS-DESIGN.md)
- [SRS-009: User Custom Template Library](06-planning/wallet-studio/LOYALLIA-DOC-SRS-009-USER-TEMPLATE-LIBRARY.md)
- [SRS-010: Custom Fields, Dynamic Values & Field-Based Notifications](06-planning/wallet-studio/LOYALLIA-DOC-SRS-010-FIELDS-NOTIFICATIONS.md)
- [SRS-011: Wallet Pass Studio — Plan & Rate Limiting Integration](06-planning/wallet-studio/LOYALLIA-DOC-SRS-011-PLAN-RATE-LIMITING.md)
- [Wallet Pass Studio — Testing & QA Strategy](06-planning/wallet-studio/LOYALLIA-DOC-TESTING-QA-STRATEGY.md)
- [UI Fix Plan — Match SRS-003 Exactly](06-planning/wallet-studio/LOYALLIA-DOC-UI-FIX-PLAN.md)
- [SRS-012: Wallet Platform Design Specifications — Apple Wallet & Google Wallet](06-planning/wallet-studio/LOYALLIA-SRS-WPS-012.md)
- [Wallet Designer Unification — Architectural Plan — archived](09-archive/superseded-planning/LOYALLIA-PLAN-WALLET-UNIFY-001.md)

### Reviews & Audits

- [Database Migration Rollback Strategy](07-reviews/LOYALLIA-DOC-MIGRATION_ROLLBACK.md)
- [Reviews & Audits](07-reviews/LOYALLIA-DOC-REVIEWS-README-001.md)
- [Loyallia Backend -- Comprehensive Architecture & Design Patterns Review](07-reviews/LOYALLIA-DOC-REVIEW_ARCHITECTURE.md)
- [Loyallia-K2 Review: Campaigns, Automation & Notifications](07-reviews/LOYALLIA-DOC-REVIEW_CAMPAIGNS_AUTOMATION.md)
- [Loyallia-k2 Card/Wallet Flow Audit Report](07-reviews/LOYALLIA-DOC-REVIEW_CARD_WALLET_FLOW.md)
- [Loyallia Code Quality Review — Loyallia-K2](07-reviews/LOYALLIA-DOC-REVIEW_CODE_QUALITY.md)
- [Frontend Codebase Review — Loyallia](07-reviews/LOYALLIA-DOC-REVIEW_FRONTEND.md)
- [Loyallia Backend - Comprehensive Database & RBAC Review](07-reviews/LOYALLIA-DOC-REVIEW_MODELS_DB.md)
- [Owner Dashboard Complete Audit Report](07-reviews/LOYALLIA-DOC-REVIEW_OWNER_DASHBOARD.md)
- [Playwright E2E Test Coverage Review — Loyallia Frontend](07-reviews/LOYALLIA-DOC-REVIEW_PLAYWRIGHT_COVERAGE.md)
- [SysAdmin / SuperAdmin API - Comprehensive Security Review](07-reviews/LOYALLIA-DOC-REVIEW_SYSADMIN.md)
- [Loyallia -- Vault, Secrets & Settings Security Review](07-reviews/LOYALLIA-DOC-REVIEW_VAULT_SETTINGS.md)
- [Loyallia Django Settings Completeness Audit](07-reviews/LOYALLIA-DOC-SETTINGS_COMPLETENESS_AUDIT.md)
- [LOYALLIA — COMPREHENSIVE TESTING & AUDIT REPORT](07-reviews/LOYALLIA-DOC-TESTING_AUDIT_REPORT_20260601.md)
- [Documentation Reorganization Decisions](07-reviews/audit/2026-06-11-documentation-audit/LOYALLIA-DOC-DECISIONS.md)
- [Documentation Audit Verification Report](07-reviews/audit/2026-06-11-documentation-audit/LOYALLIA-DOC-VERIFICATION_REPORT.md)
- [API Design & Security Audit Report](07-reviews/audit/LOYALLIA-DOC-API_SECURITY_AUDIT_REPORT.md)
- [Architecture & Patterns Audit Report](07-reviews/audit/LOYALLIA-DOC-ARCHITECTURE_PATTERNS_AUDIT_REPORT.md)
- [Database Design & Performance Audit Report](07-reviews/audit/LOYALLIA-DOC-DATABASE_PERFORMANCE_AUDIT_REPORT.md)
- [Loyallia Enterprise Full-System Audit Report](07-reviews/audit/LOYALLIA-DOC-FULL_SYSTEM_AUDIT_REPORT.md)
- [QA & Testing Audit Report](07-reviews/audit/LOYALLIA-DOC-QA_TESTING_AUDIT_REPORT.md)
- [UI/UX Design Audit Report](07-reviews/audit/LOYALLIA-DOC-UI_UX_AUDIT_REPORT.md)
- [Playwright E2E Testing Workbench — Full Analysis](07-reviews/LOYALLIA-QA-PLAYWRIGHT-001.md)

### References

- [Google OAuth + Google Wallet — Setup Paso a Paso](08-references/LOYALLIA-DOC-GOOGLE_SETUP_STEP_BY_STEP.md)
- [Loyallia — Port Authority](08-references/LOYALLIA-DOC-PORT_AUTHORITY.md)
- [Production Server State](08-references/LOYALLIA-DOC-PRODUCTION_SERVER_STATE.md)
- [References](08-references/LOYALLIA-DOC-REFS-README-001.md)
- [Wallet API Credentials Setup Guide](08-references/LOYALLIA-DOC-WALLET_CREDENTIALS_SETUP.md)
- [Loyallia Wallet Credentials — Current Status](08-references/LOYALLIA-DOC-WALLET_CREDENTIALS_STATUS.md)
- [Client Request Source Materials](08-references/LOYALLIA-DOC-REFS-README-001.md)
- [GAP ANALYSIS REPORT — Loyallia](08-references/client-requests/LOYALLIA-DOC-GAP-ANALYSIS-001.md)

### Code Module Documentation

Controlled ISO documents living beside the code they describe. Each carries a unique `document_id` and full document controls per `LOYALLIA-RULES-001`.

**Frontend**
- [Loyallia Frontend](../frontend/README.md) — `LOYALLIA-DOC-FE-README-001`
- [Loyallia Frontend Architecture](../frontend/README.md) — `LOYALLIA-DOC-FE-ARCH-001`

**Backend**
- [agent_api](../backend/apps/agent_api/README.md) — `LOYALLIA-DOC-BE-AGENT-API-001`
- [ai](../backend/apps/ai/README.md) — `LOYALLIA-DOC-BE-AI-001`
- [analytics](../backend/apps/analytics/README.md) — `LOYALLIA-DOC-BE-ANALYTICS-001`
- [api](../backend/apps/api/README.md) — `LOYALLIA-DOC-BE-API-001`
- [audit](../backend/apps/audit/README.md) — `LOYALLIA-DOC-BE-AUDIT-001`
- [authentication](../backend/apps/authentication/README.md) — `LOYALLIA-DOC-BE-AUTH-001`
- [automation](../backend/apps/automation/README.md) — `LOYALLIA-DOC-BE-AUTOMATION-001`
- [backup](../backend/apps/backup/README.md) — `LOYALLIA-DOC-BE-BACKUP-001`
- [billing](../backend/apps/billing/README.md) — `LOYALLIA-DOC-BE-BILLING-001`
- [cards](../backend/apps/cards/README.md) — `LOYALLIA-DOC-BE-CARDS-001`
- [customers](../backend/apps/customers/README.md) — `LOYALLIA-DOC-BE-CUSTOMERS-001`
- [notifications](../backend/apps/notifications/README.md) — `LOYALLIA-DOC-BE-NOTIFICATIONS-001`
- [redemption](../backend/apps/redemption/README.md) — `LOYALLIA-DOC-BE-REDEMPTION-001`
- [tenants](../backend/apps/tenants/README.md) — `LOYALLIA-DOC-BE-TENANTS-001`
- [transactions](../backend/apps/transactions/README.md) — `LOYALLIA-DOC-BE-TRANSACTIONS-001`

**Services & Infrastructure**
- [WhatsApp Bridge](../services/whatsapp-bridge/README.md) — `LOYALLIA-DOC-SVC-WHATSAPP-001`
- [Certificates Directory](../certs/README.md) — `LOYALLIA-DOC-CERTS-001`

### Archive

- [Loyallia — Backup & Disaster Recovery Plan](09-archive/LOYALLIA-DOC-BACKUP_DISASTER_RECOVERY.md)
- [Loyallia Full System Audit Report](09-archive/LOYALLIA-DOC-FULL_SYSTEM_AUDIT_2026-06-03.md)
- [HANDOFF: Programs Module Polish + Scanner + Wallet Image URLs](09-archive/LOYALLIA-DOC-HANDOFF.md)
- [Archive](09-archive/LOYALLIA-DOC-ARCHIVE-README-001.md)
- [Loyallia Backup System](09-archive/deploy-readmes/LOYALLIA-DOC-BACKUPS.md)
- [Bootstrap & Deployment](09-archive/deploy-readmes/LOYALLIA-DOC-BOOTSTRAP.md)
- [Disaster Recovery](09-archive/deploy-readmes/LOYALLIA-DOC-DISASTER_RECOVERY.md)
- [Wallet Pass Studio — Master Executive Summary](09-archive/wallet-designer-v2/LOYALLIA-DOC-SRS-MASTER-EXECUTIVE-SUMMARY.md)
- [Wallet Designer Roadmap — Gap Analysis vs. PassKit & Industry Standards](09-archive/wallet-designer-v2/LOYALLIA-DOC-WALLET_DESIGNER_ROADMAP.md)
- [Wallet Designer V2 — UI/UX Architecture (PassKit-Inspired)](09-archive/wallet-designer-v2/LOYALLIA-DOC-WALLET_DESIGNER_V2_UIUX_ARCHITECTURE.md)

## Key Documents

- [Agent Onboarding](01-start-here/LOYALLIA-DOC-AGENT_ONBOARDING.md) — Rules and conventions for agents working in this repo.
- [System Architecture](02-architecture/LOYALLIA-DOC-ARCHITECTURE.md) — High-level architecture, sequence, and flow diagrams.
- [Deployment Guide](04-runbooks/LOYALLIA-DOC-DEPLOYMENT_GUIDE.md) — Production deployment procedures.
- [Disaster Recovery Playbook](04-runbooks/LOYALLIA-DOC-DISASTER_RECOVERY_PLAYBOOK.md) — Scenario-based DR procedures.
- [Wallet Studio Complete Guide](06-planning/wallet-studio/LOYALLIA-DOC-COMPLETE-IMPLEMENTATION-GUIDE.md) — Single source of truth for wallet studio implementation.
- [Wallet Designer Unification Plan — archived](09-archive/superseded-planning/LOYALLIA-PLAN-WALLET-UNIFY-001.md) — Superseded by live wallet studio implementation.
- [Full System Audit](07-reviews/audit/LOYALLIA-DOC-FULL_SYSTEM_AUDIT_REPORT.md) — Latest comprehensive audit report.

## How to Update This Index

When adding, moving, or removing documentation, regenerate this index by running `python3 scripts/docs-audit/generate_index.py`.
