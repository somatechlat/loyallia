# Loyallia Documentation Index

This is the master index for all project documentation. The code is the only source of truth; documentation here reflects the state of the repository as of the last audit.

> **Protected entry points:** `README.md`, `AGENTS.md`, and `rules.md` in the repository root remain the primary starting points for humans and agents.

## Structure

### Start Here

- [Loyallia — Agent Onboarding Guide](01-start-here/AGENT_ONBOARDING.md)

### Architecture

- [Apple Wallet Web PKPass And NFC Architecture](02-architecture/APPLE_WALLET_WEB_PKPASS_NFC.md)
- [LOYALLIA — ARCHITECTURE, SEQUENCE & FLOWCHART DIAGRAMS](02-architecture/ARCHITECTURE.md)
- [Loyallia — Backup & Disaster Recovery Architecture](02-architecture/BACKUP_ARCHITECTURE.md)
- [Loyallia — Zero Trust Bootstrap Architecture](02-architecture/BOOTSTRAP_ARCHITECTURE.md)

### Guides

- [Authentication Subsystem Guide](03-guides/Authentication.md)
- [Backup System Testing Plan — Local Development Environment](03-guides/BACKUP_TESTING_PLAN.md)
- [Billing & Payments Subsystem Guide](03-guides/Billing-Payments.md)
- [Notifications Subsystem Guide](03-guides/Notifications.md)
- [Redemption Engine Subsystem Guide](03-guides/Redemption-Engine.md)

### Runbooks

- [Alertmanager](04-runbooks/ALERTMANAGER.md)
- [Prometheus Alert Rules](04-runbooks/ALERTS.md)
- [Loyallia — Backup Operations Runbook](04-runbooks/BACKUP_OPERATIONS_RUNBOOK.md)
- [Loyallia Production Deployment Guide](04-runbooks/DEPLOYMENT_GUIDE.md)
- [Loyallia — Disaster Recovery Playbook](04-runbooks/DISASTER_RECOVERY_PLAYBOOK.md)
- [Loyallia On-Call Escalation Matrix](04-runbooks/ESCALATION.md)
- [Factory Reset](04-runbooks/FACTORY_RESET.md)
- [Loyallia — Factory Reset Procedure](04-runbooks/FACTORY_RESET_PROCEDURE.md)
- [Grafana](04-runbooks/GRAFANA.md)
- [PgBouncer](04-runbooks/PGBOUNCER.md)
- [PostgreSQL](04-runbooks/POSTGRES.md)
- [Redis](04-runbooks/REDIS.md)
- [Operational Scripts](04-runbooks/SCRIPTS.md)
- [HashiCorp Vault](04-runbooks/VAULT.md)

### Compliance

- [Loyallia — Production Compliance Checklist](05-compliance/COMPLIANCE_CHECKLIST.md)
- [Loyallia-k2 Rules Compliance Audit Report](05-compliance/REVIEW_RULES_COMPLIANCE.md)
- [ISMS Scope Statement](05-compliance/iso27001/01-ISMS-Scope.md)
- [Loyallia — Risk Assessment and Risk Treatment Plan](05-compliance/iso27001/02-Risk-Assessment.md)
- [Loyallia — Statement of Applicability (SoA)](05-compliance/iso27001/03-Statement-of-Applicability.md)
- [Access Control Policy](05-compliance/iso27001/04-Access-Control-Policy.md)
- [Incident Management Procedure](05-compliance/iso27001/05-Incident-Management.md)
- [Business Continuity and Disaster Recovery Policy](05-compliance/iso27001/06-BCP-DR-Policy.md)

### Planning

- [Planning Documents](06-planning/README.md)
- [SOFTWARE REQUIREMENTS SPECIFICATION (SRS)](06-planning/SRS_Loyallia_COMPLETE.md)
- [SOFTWARE REQUIREMENTS SPECIFICATION (SRS)](06-planning/SRS_Loyallia_HARDENING_v1.0.md)
- [LOYALLIA — COMPREHENSIVE TESTING & DOCUMENTATION AUDIT PLAN](06-planning/TESTING_AUDIT_PLAN.md)
- [Current Production Readiness TODO](06-planning/TODO_CURRENT_PRODUCTION_READINESS.md)
- [Wallet Push Notifications — Investigation & Fix Plan](06-planning/WALLET_PUSH_NOTIFICATIONS_PLAN.md)
- [📋 Documento 1: Análisis de Problemas + Propuesta de Arquitectura](06-planning/campaigns-redesign/01-ANALYSIS.md)
- [🎨 Documento 2: Mocks de Todas las Pantallas](06-planning/campaigns-redesign/02-MOCKS.md)
- [📐 Documento 3: Decisiones de UX + Especificaciones Técnicas](06-planning/campaigns-redesign/03-DECISIONS.md)
- [LOYALLIA — MASTER SYS ADMIN IMPLEMENTATION PLAN](06-planning/implementation/MASTER_SYSADMIN_PLAN.md)
- [Software Requirements Specification (SRS): Comprehensive System User Journeys](06-planning/srs_user_journeys.md)
- [i18n Complete Audit & Fix — Implementation Plan](06-planning/superpowers/plans/2026-06-03-i18n-complete-audit-fix.md)
- [Wallet Pass Studio — Complete Gap Fix Implementation Plan](06-planning/superpowers/plans/2026-06-04-wallet-studio-complete.md)
- [Documentation Audit and Reorganization Implementation Plan](06-planning/superpowers/plans/2026-06-11-documentation-audit-reorganization-plan.md)
- [i18n Complete Audit & Fix — Design Document](06-planning/superpowers/specs/2026-06-03-i18n-complete-audit-fix-design.md)
- [Documentation Audit and Reorganization](06-planning/superpowers/specs/2026-06-11-documentation-audit-reorganization-design.md)
- [Customer Journey](06-planning/user-journeys/CUSTOMER.md)
- [Manager Journey](06-planning/user-journeys/MANAGER.md)
- [Owner Journey](06-planning/user-journeys/OWNER.md)
- [Staff Journey](06-planning/user-journeys/STAFF.md)
- [Super Admin Journey](06-planning/user-journeys/SUPER_ADMIN.md)
- [Wallet Pass Studio — Complete Implementation Guide](06-planning/wallet-studio/COMPLETE-IMPLEMENTATION-GUIDE.md)
- [Wallet Pass Studio — Complete Fix Plan](06-planning/wallet-studio/DEV-FIX-PLAN.md)
- [Wallet Pass Studio — Documentation Index](06-planning/wallet-studio/README.md)
- [SRS-001: Requirements — Introduction, Research & Current State](06-planning/wallet-studio/SRS-001-Requirements.md)
- [SRS-002: Architecture & State Management](06-planning/wallet-studio/SRS-002-Architecture.md)
- [SRS-003: UI Specifications & Screen Mockups — OPTIMIZED v2](06-planning/wallet-studio/SRS-003-UI-Specifications.md)
- [SRS-004: Appendices — Complete Platform Reference](06-planning/wallet-studio/SRS-004-Appendices.md)
- [SRS-005: User Journeys & Interaction Flows](06-planning/wallet-studio/SRS-005-User-Journeys.md)
- [SRS-006: Card-Type Visual Customization Matrix](06-planning/wallet-studio/SRS-006-Card-Type-Visual-Customization.md)
- [SRS-007: AI Integration Specification — Groq API](06-planning/wallet-studio/SRS-007-AI-Integration.md)
- [SRS-008: Back of Pass (Reverse) Design Specification](06-planning/wallet-studio/SRS-008-BACK-OF-PASS-DESIGN.md)
- [SRS-009: User Custom Template Library](06-planning/wallet-studio/SRS-009-USER-TEMPLATE-LIBRARY.md)
- [SRS-010: Custom Fields, Dynamic Values & Field-Based Notifications](06-planning/wallet-studio/SRS-010-FIELDS-NOTIFICATIONS.md)
- [SRS-011: Wallet Pass Studio — Plan & Rate Limiting Integration](06-planning/wallet-studio/SRS-011-PLAN-RATE-LIMITING.md)
- [Wallet Pass Studio — Testing & QA Strategy](06-planning/wallet-studio/TESTING-QA-STRATEGY.md)
- [UI Fix Plan — Match SRS-003 Exactly](06-planning/wallet-studio/UI-FIX-PLAN.md)

### Reviews & Audits

- [Database Migration Rollback Strategy](07-reviews/MIGRATION_ROLLBACK.md)
- [Reviews & Audits](07-reviews/README.md)
- [Loyallia Backend -- Comprehensive Architecture & Design Patterns Review](07-reviews/REVIEW_ARCHITECTURE.md)
- [Loyallia-K2 Review: Campaigns, Automation & Notifications](07-reviews/REVIEW_CAMPAIGNS_AUTOMATION.md)
- [Loyallia-k2 Card/Wallet Flow Audit Report](07-reviews/REVIEW_CARD_WALLET_FLOW.md)
- [Loyallia Code Quality Review — Loyallia-K2](07-reviews/REVIEW_CODE_QUALITY.md)
- [Frontend Codebase Review — Loyallia](07-reviews/REVIEW_FRONTEND.md)
- [Loyallia Backend - Comprehensive Database & RBAC Review](07-reviews/REVIEW_MODELS_DB.md)
- [Owner Dashboard Complete Audit Report](07-reviews/REVIEW_OWNER_DASHBOARD.md)
- [Playwright E2E Test Coverage Review — Loyallia Frontend](07-reviews/REVIEW_PLAYWRIGHT_COVERAGE.md)
- [SysAdmin / SuperAdmin API - Comprehensive Security Review](07-reviews/REVIEW_SYSADMIN.md)
- [Loyallia -- Vault, Secrets & Settings Security Review](07-reviews/REVIEW_VAULT_SETTINGS.md)
- [Loyallia Django Settings Completeness Audit](07-reviews/SETTINGS_COMPLETENESS_AUDIT.md)
- [LOYALLIA — COMPREHENSIVE TESTING & AUDIT REPORT](07-reviews/TESTING_AUDIT_REPORT_20260601.md)
- [Documentation Reorganization Decisions](07-reviews/audit/2026-06-11-documentation-audit/decisions.md)
- [Documentation Audit Verification Report](07-reviews/audit/2026-06-11-documentation-audit/verification_report.md)
- [API Design & Security Audit Report](07-reviews/audit/API_SECURITY_AUDIT_REPORT.md)
- [Architecture & Patterns Audit Report](07-reviews/audit/ARCHITECTURE_PATTERNS_AUDIT_REPORT.md)
- [Database Design & Performance Audit Report](07-reviews/audit/DATABASE_PERFORMANCE_AUDIT_REPORT.md)
- [Loyallia Enterprise Full-System Audit Report](07-reviews/audit/FULL_SYSTEM_AUDIT_REPORT.md)
- [QA & Testing Audit Report](07-reviews/audit/QA_TESTING_AUDIT_REPORT.md)
- [UI/UX Design Audit Report](07-reviews/audit/UI_UX_AUDIT_REPORT.md)

### References

- [Google OAuth + Google Wallet — Setup Paso a Paso](08-references/GOOGLE_SETUP_STEP_BY_STEP.md)
- [Loyallia — Port Authority](08-references/PORT_AUTHORITY.md)
- [References](08-references/README.md)
- [Wallet API Credentials Setup Guide](08-references/WALLET_CREDENTIALS_SETUP.md)
- [Loyallia Wallet Credentials — Current Status](08-references/WALLET_CREDENTIALS_STATUS.md)

### Archive

- [Loyallia — Backup & Disaster Recovery Plan](09-archive/BACKUP_DISASTER_RECOVERY.md)
- [Loyallia Full System Audit Report](09-archive/FULL_SYSTEM_AUDIT_2026-06-03.md)
- [HANDOFF: Programs Module Polish + Scanner + Wallet Image URLs](09-archive/HANDOFF.md)
- [Archive](09-archive/README.md)
- [Loyallia Backup System](09-archive/deploy-readmes/BACKUPS.md)
- [Bootstrap & Deployment](09-archive/deploy-readmes/BOOTSTRAP.md)
- [Disaster Recovery](09-archive/deploy-readmes/DISASTER_RECOVERY.md)
- [Wallet Pass Studio — Master Executive Summary](09-archive/wallet-designer-v2/SRS-MASTER-EXECUTIVE-SUMMARY.md)
- [Wallet Designer Roadmap — Gap Analysis vs. PassKit & Industry Standards](09-archive/wallet-designer-v2/WALLET_DESIGNER_ROADMAP.md)
- [Wallet Designer V2 — UI/UX Architecture (PassKit-Inspired)](09-archive/wallet-designer-v2/WALLET_DESIGNER_V2_UIUX_ARCHITECTURE.md)

## Key Documents

- [Agent Onboarding](01-start-here/AGENT_ONBOARDING.md) — Rules and conventions for agents working in this repo.
- [System Architecture](02-architecture/ARCHITECTURE.md) — High-level architecture, sequence, and flow diagrams.
- [Deployment Guide](04-runbooks/DEPLOYMENT_GUIDE.md) — Production deployment procedures.
- [Disaster Recovery Playbook](04-runbooks/DISASTER_RECOVERY_PLAYBOOK.md) — Scenario-based DR procedures.
- [Wallet Studio Complete Guide](06-planning/wallet-studio/COMPLETE-IMPLEMENTATION-GUIDE.md) — Single source of truth for wallet studio implementation.
- [Full System Audit](07-reviews/audit/FULL_SYSTEM_AUDIT_REPORT.md) — Latest comprehensive audit report.

## How to Update This Index

When adding, moving, or removing documentation, regenerate this index by running `python3 scripts/docs-audit/generate_index.py`.
