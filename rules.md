# Loyallia Agent Rules And Coding Standards

Project-specific standards for Loyallia. The codebase is the source of truth. These rules describe the required standard for new work and production-readiness work; existing legacy code or tests may need remediation before they comply.

## Project Identity

- Name: Loyallia
- Product: Digital loyalty, wallet passes, campaigns, analytics, billing, scanner PWA, and SaaS administration
- Backend: Django 5, Django Ninja, Django ORM, PostgreSQL
- Frontend: Next.js 14, React 18, TypeScript, Tailwind
- Runtime: Docker Compose, Celery, Redis, PgBouncer, MinIO, Nginx
- Secrets: HashiCorp Vault
- Tests: pytest, Vitest, Playwright
- Roles: OWNER, MANAGER, STAFF, SUPER_ADMIN
- Compliance posture: LOPDP/GDPR-oriented privacy, audit, and tenant isolation

## Core Conduct

- Do not lie, guess, invent APIs, or claim something works without evidence.
- Do not use mocks, placeholders, fake functions, stubs, shims, bypasses, or TODOs as final implementation.
- Do not claim "done", "passed", or "production ready" unless the relevant checks actually passed.
- State blockers, risks, and uncertainty explicitly.
- Read code and project documentation before changing behavior.
- Prefer modifying existing files over adding new files unless a new file is clearly justified.
- Keep changes scoped to the request and the affected flow.

## Required Context Before Code Changes

Before editing, understand the relevant:

- data flow
- authentication path
- authorization and role checks
- tenant scoping
- callers and callees
- side effects
- tests affected
- migrations or schema impact
- deployment and production impact

If any required context is missing and cannot be discovered from the repo, ask before editing.

## Backend Rules

- Use Django and Django Ninja only for application APIs.
- Use Django ORM only for models and database access.
- Use Django migrations only for schema changes.
- Do not introduce FastAPI, Starlette, uvicorn, SQLAlchemy, Alembic, or unrelated backend frameworks.
- Backend API errors and user-facing messages must use `common/messages.py` and `get_message()` where the touched area follows that pattern.
- New backend code must enforce authentication, authorization, validation, error handling, and tenant isolation.
- Tenant-owned queries must filter by tenant or prove SUPER_ADMIN/platform-level authorization.

## Frontend Rules

- Use the existing Next.js, React, TypeScript, and Tailwind stack.
- Do not introduce Lit, Vue, Angular, Alpine, or another frontend framework.
- Prefer existing components, layout patterns, API helpers, auth helpers, and i18n conventions.
- Do not fake successful UI states.
- New or changed user-facing strings should use the existing localization pattern where the touched area supports it.
- Avoid unrelated visual or structural redesigns.

## Secrets And Vault

- Never commit secrets.
- Never print secrets.
- Never expose secret values in API responses.
- Never log tokens, private keys, client secrets, API keys, certificate keys, or password values.
- Do not write Vault secrets from normal E2E tests.
- Do not wipe Vault secrets.
- Vault writes must be SUPER_ADMIN-only, allowlisted, validated, and audited.
- Files under `certs/` may contain real local credentials. Do not add those credentials to Git.
- Development and production bootstrap secrets (`.bootstrap_secrets.*.env`) MUST use separate credentials. A dev environment compromise must not grant access to production services.

## SysAdmin And Destructive Operations

- Do not run factory reset unless the user explicitly requests it for a disposable environment.
- Do not execute seed-demo data against production, shared, or production-like environments.
- E2E tests must not call factory-reset confirm.
- E2E tests must not execute seed-demo data.
- Destructive SysAdmin behavior must be tested through guardrails:
  - permission denial
  - missing confirmation rejection
  - missing OTP rejection
  - invalid OTP rejection
  - non-SUPER_ADMIN rejection
- SuperAdmin impersonation, Vault updates, platform settings, billing confirmation, factory reset, and seed-demo controls are high-risk flows and require explicit audit and test coverage.

## Owner Admin And Tenant Isolation

- OWNER-only write APIs must reject MANAGER, STAFF, unauthenticated users, and unrelated tenants.
- OWNER must not be able to create or promote SUPER_ADMIN users.
- OWNER must not be able to remove or deactivate themselves unless a specific safe flow exists.
- MANAGER and STAFF UI hiding is not sufficient; backend APIs must enforce role restrictions.
- Cross-tenant access by URL or ID manipulation must return a denial response.

## Testing Rules

- Production-readiness evidence must come from real code paths, real servers, and real API responses.
- Do not use mocked routes or mocked APIs as proof of production readiness.
- Playwright tests must not mutate Vault secrets.
- Playwright tests must not execute factory reset.
- Playwright tests must not execute seed-demo data.
- Mutating E2E tests must use uniquely prefixed E2E records and clean up only those records.
- Do not clean broad tables.
- Do not wipe tenant data globally.
- New production-readiness tests must not use hardcoded fallback credentials such as `123456`.
- Tests must fail fast when required environment variables are missing.
- Role tests must include positive paths, forbidden-role checks, cross-tenant checks, and validation/error checks.

### Production E2E Testing Rules

- Production E2E tests MUST use `E2E_ALLOW_HOSTS=rewards.loyallia.com` to bypass safety block.
- Production E2E tests MUST run with `--workers=1` (serial execution only).
- Production E2E tests MUST NOT modify real business data (only E2E tenant data).
- Production E2E tests MUST NOT run factory reset or seed demo.
- Production E2E test users are isolated in `e2e-production-tenant` (Enterprise plan).
- Production E2E credentials are in `.auth/e2e-credentials.json` (git-ignored).
- Always verify Vault is unsealed before running production E2E tests.
- Always verify container health before running production E2E tests.
- Clean up any orphaned test data after test runs.
- See `docs/03-guides/PRODUCTION_E2E_TESTING.md` for full guide.
- See `docs/04-runbooks/E2E_TESTING_RUNBOOK.md` for step-by-step runbook.

## Quality Gates

Backend gates before merge or release:

- `cd backend && python3 -m ruff check .`
- `cd backend && python3 -m pytest -q`
- migration drift check when migrations are touched
- production/Vault readiness checks when settings or secrets are touched

Frontend gates before merge or release:

- `cd frontend && npm run typecheck`
- `cd frontend && npm run test:unit`
- `cd frontend && npm run build`
- affected Playwright projects when UI, auth, role, or API behavior changes

Security/dependency gates when relevant:

- Python dependency audit
- npm production audit
- secret-pattern inspection that does not print secret values
- Docker health checks for production-readiness claims

## File Size And Scope

- Code files should stay under 650 lines where practical.
- Markdown documentation has no strict line limit.
- Configuration files have no strict line limit within reason.
- Do not split files unless it avoids real complexity or keeps a code file maintainable.

## Audit And Compliance

- State changes should be auditable.
- Sensitive operations must record actor, role, resource, action, timestamp, and relevant metadata.
- Do not log PII, secrets, tokens, or credential values.
- Customer imports, exports, deletion flows, billing, Wallet, campaigns, and SuperAdmin operations require extra care.

## ISO Standards And Documentation Compliance

The codebase is the single source of truth. Documentation must reflect the actual code state, not aspirational or outdated descriptions.

### Applicable ISO Standards

- **ISO 27001:2022** — Information Security Management System (ISMS). Controls in `docs/05-compliance/iso27001/`.
- **ISO 9001:2015** — Quality Management System. Quality policy and corrective actions.
- **ISO 42010:2011** — Architecture description. Architecture docs in `docs/02-architecture/`.
- **ISO 19011:2018** — Audit guidelines. Audit reports in `docs/07-reviews/`.
- **ISO 8601:2019** — Date/time formatting. All dates in documentation use `YYYY-MM-DD` format.
- **LOPDP** — Ecuador Organic Law on Personal Data Protection. Privacy controls.
- **GDPR** — General Data Protection Regulation. Data subject rights, consent, erasure.

### Documentation Naming Convention

- **Format:** `SEMANTIC-NAME.md` (uppercase, hyphens, descriptive)
- **Version:** `vMAJOR.MINOR` in document frontmatter
- **Status:** `draft | review | approved | deprecated` in frontmatter
- **Owner:** Named role (e.g., "Engineering Lead"), not person name
- **Dates:** ISO 8601 format (`2026-09-09`, not `09/09/2026` or `Sep 9, 2026`)
- **Language:** English for technical docs, Spanish for user-facing content

### Documentation Structure

- `docs/00-index.md` — Master index (auto-generated)
- `docs/01-start-here/` — Onboarding and quick start
- `docs/02-architecture/` — System architecture (ISO 42010)
- `docs/03-guides/` — Subsystem guides and how-tos
- `docs/04-runbooks/` — Operational procedures
- `docs/05-compliance/` — Regulatory and ISO compliance
- `docs/06-planning/` — SRS, roadmaps, implementation plans
- `docs/07-reviews/` — Audit reports (ISO 19011)
- `docs/08-references/` — Port authority, credentials setup
- `docs/09-archive/` — Deprecated or superseded docs

### Documentation Rules

- Every doc must have a frontmatter block with: title, version, status, last_updated, owner.
- Deprecated docs must be moved to `docs/09-archive/` with a deprecation notice.
- No duplicate docs covering the same topic. If a newer version exists, archive the old one.
- Code examples in docs must match actual code (verify before publishing).
- API documentation must be generated from code (OpenAPI), not hand-written.
- User-facing strings in code must use i18n keys, never hardcoded text.

### ISO Audit Trail Requirements

- All security-relevant operations must be logged to the `AuditLog` model.
- Audit logs must be immutable (PostgreSQL-level enforcement recommended).
- Audit log entries must include: actor_id, role, resource_type, resource_id, action, timestamp, ip_address, metadata.
- Audit logs must NOT contain PII, secrets, tokens, or credential values.
- Audit log retention: minimum 1 year per ISO 27001 Annex A.8.24.

### Data Protection (LOPDP/GDPR)

- Customer data must be tenant-isolated at the database level.
- Data export must include all customer data (right to portability).
- Data deletion must be irreversible (right to erasure / right to be forgotten).
- Consent must be recorded with timestamp and version.
- Privacy policy changes require customer re-consent.
- Data breach notification within 72 hours (GDPR Art. 33).

## Standard Workflow

1. Understand the request.
2. Read relevant docs and code.
3. Inspect data flow, auth, permissions, and side effects.
4. Verify assumptions through code, tests, or command output.
5. Plan non-trivial work and state risks.
6. Implement real production-grade code.
7. Run relevant checks.
8. Report actual results, failures, blockers, and residual risks.

## Forbidden

- Invent APIs, schemas, syntax, or behavior.
- Guess instead of checking.
- Use placeholders, mocks, stubs, shims, bypasses, or TODOs as final work.
- Hardcode production values.
- Add unnecessary files.
- Touch code without relevant context.
- Skip relevant docs.
- Assume data structures.
- Skip error handling.
- Claim production readiness without passing the required gates.
- Use FastAPI, SQLAlchemy, Lit, Vue, Angular, Alpine, or unrelated frameworks.
- Wipe Vault secrets.
- Mutate Vault secrets from normal E2E tests.
- Execute factory reset as readiness proof.
- Execute seed-demo data in shared or production-like environments.
