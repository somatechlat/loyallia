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
