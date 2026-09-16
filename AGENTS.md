---
title: "Loyallia Agent Instructions"
document_id: "LOYALLIA-AGENTS-001"
version: "1.0"
status: "approved"
last_updated: "2026-09-16"
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
| **Document ID** | LOYALLIA-AGENTS-001 |
| **Title** | Loyallia Agent Instructions |
| **Version** | 1.0 |
| **Date** | 2026-09-16 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011 |
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `AGENTS.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-16 | Engineering Lead | Added ISO-compliant document controls |

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
| LOYALLIA-ARCH-001 | Architecture Diagrams | Reference |

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

# Loyallia Agent Instructions

> **MANDATORY READ before any code change.** These rules override defaults.
> Source: `rules.md` and `docs/01-start-here/AGENT_ONBOARDING.md`. Keep in sync when either changes.

## Project Identity

- **Name:** Loyallia
- **Product:** Digital loyalty, wallet passes, campaigns, analytics, billing, scanner PWA, SaaS administration
- **Backend:** Django 5, Django Ninja, Django ORM, PostgreSQL 17.4, Celery 5, Python 3.13
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind, Node 22
- **Runtime:** Docker Compose (22 containers), PgBouncer, MinIO, Redis 7.4 + Sentinel, HashiCorp Vault 1.19
- **Proxy:** Nginx 1.24 (host-level, not in Docker)
- **Monitoring:** Prometheus 3.3, Grafana 12, Loki 3.5, Alertmanager 0.28
- **Messaging:** WhatsApp bridge (Baileys), Celery workers (4 queues), Flower
- **Database:** PostgreSQL 17.4 primary + replica, PgBouncer (transaction mode)
- **Secrets:** HashiCorp Vault KV v2 (NEVER env files, NEVER code, NEVER Git). Runtime file injection, 5-min cache TTL.
- **Storage:** MinIO (S3-compatible) for wallet passes and assets
- **Tests:** pytest (Docker only), Vitest, Playwright (46 E2E spec files)
- **Locale:** Spanish (`es`) is default and mandatory for user-facing strings
- **Production domain:** rewards.loyallia.com
- **Compliance:** LOPDP/GDPR, ISO 27001, ISO 9001, ISO 42010, ISO 8601. See `rules.md` for full ISO compliance rules.

## Absolute Rules — ZERO TOLERANCE

1. **NO mocks, stubs, placeholders, fake functions, shims, bypasses, or TODOs as final implementation.**
2. **NO secrets in `.env`, NO secrets in code, NO secrets in Git.** All secrets live in Vault ONLY.
3. **NO hardcoded production values.** URLs, API keys, model names, timeouts must be Django settings reading from Vault or environment with safe defaults.
4. **NO mocked routes or mocked APIs as proof of production readiness.** Evidence must come from real code paths, real servers, real API responses.
5. **Never commit secrets. Never print secrets. Never expose secrets in API responses. Never log tokens, keys, or passwords.**
6. **Do not lie, guess, invent APIs, or claim something works without evidence.**
7. **Do not claim "done", "passed", or "production ready" unless checks actually passed.**
8. **ALL documentation files MUST include full ISO-compliant document controls.** See `rules.md` § "MANDATORY — ISO-Compliant Document Control Specification" for the 7 required controls (YAML frontmatter, Document Control table, Revision History, Distribution List, Related Documents, Change Control Process, Document Approval). Omitting any control is a violation.

## Secrets & Vault

- Runtime secret source: `common.vault.get_secret(key)` reads from HashiCorp Vault.
- Vault path: `secret/data/loyallia/production` (or `.../development` in dev).
- Vault token: mounted at `/run/loyallia-vault/token` inside containers.
- Cache TTL: 5 minutes. Call `clear_cache()` after Vault writes.
- Vault writes (`put_secret`) must be SUPER_ADMIN-only, audited, and validated against allowlists.
- `certs/` directory may contain real local credentials. Never add them to Git.
- Development and production bootstrap secrets MUST use separate credentials. A dev compromise must not grant access to production services.

## Backend Standards

- **Frameworks:** Django + Django Ninja ONLY. No FastAPI, Starlette, SQLAlchemy, Alembic.
- **ORM:** Django ORM + migrations ONLY. No raw SQL unless performance-critical and documented.
- **Auth:** JWT via `apps.authentication`. Every endpoint must enforce auth + tenant isolation.
- **Tenant isolation:** ALL queries filter by `tenant_id` or prove SUPER_ADMIN/platform auth.
- **Messages:** Use `common/messages.py` + `get_message()` for user-facing strings.
- **Rate limits:** Enforced via `common/plan_enforcement.py` decorators.
- **File size:** Keep `.py` files under 650 lines.

## Frontend Standards

- **Stack:** Next.js 14, React 18, TypeScript, Tailwind ONLY. No Vue, Angular, Lit, Alpine.
- **Components:** Reuse existing components, layouts, API helpers, auth helpers, i18n conventions.
- **States:** Do not fake successful UI states.
- **Strings:** Use existing localization pattern. Spanish default.

## Testing Standards

- **Backend tests:** Run INSIDE `loyallia-api` container ONLY:
  ```bash
  docker exec loyallia-api pytest --ds=loyallia.settings.test --reuse-db -q
  ```
- **Integration tests:** Use `--ds=loyallia.settings.test_integration` through PgBouncer.
- **Frontend unit:** `cd frontend && npm run test:unit`
- **Frontend E2E (local):** `cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:33906 npx playwright test`
- **Frontend E2E (production):**
  ```bash
  export PLAYWRIGHT_BASE_URL=https://rewards.loyallia.com
  export E2E_ALLOW_HOSTS=rewards.loyallia.com
  cd frontend && npx playwright test --project=full
  ```
- **Do NOT** run tests against standalone PostgreSQL, SQLite, or host venv.
- Playwright tests must NOT mutate Vault secrets, factory reset, or seed demo data.
- Mutating E2E tests must use uniquely prefixed records and clean up ONLY those records.
- Production E2E tests MUST run with `--workers=1` (serial execution only).
- Production E2E test users are isolated in `e2e-production-tenant` (Enterprise plan).
- See `docs/03-guides/PRODUCTION_E2E_TESTING.md` for full guide.
- See `docs/04-runbooks/E2E_TESTING_RUNBOOK.md` for step-by-step runbook.

## Quality Gates (MUST PASS before claiming ready)

- Backend: `cd backend && python -m ruff check .` → 0 errors
- Backend: `docker exec loyallia-api pytest --ds=loyallia.settings.test --reuse-db -q` → all pass
- Frontend: `cd frontend && npm run typecheck` → 0 errors
- Frontend: `cd frontend && npm run test:unit` → all pass
- Frontend: `cd frontend && npm run build` → exit 0

## SysAdmin & Destructive Ops

- **Do NOT run factory reset** unless user explicitly requests it for a disposable environment.
- **Do NOT execute seed-demo data** against production or production-like environments.
- SuperAdmin impersonation, Vault updates, platform settings, billing confirmation, factory reset, and seed-demo are high-risk flows requiring explicit audit and test coverage.

## Standard Workflow

1. Understand the request.
2. Read relevant docs and code.
3. Inspect data flow, auth, permissions, side effects.
4. Verify assumptions through code, tests, or command output.
5. Plan non-trivial work and state risks.
6. Implement real production-grade code.
7. Run relevant checks.
8. Report actual results, failures, blockers, and residual risks.
