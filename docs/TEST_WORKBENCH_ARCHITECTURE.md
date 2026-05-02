# Loyallia Test Workbench Architecture

## Purpose

The test workbench exists to make Plan B production readiness measurable. It SHALL run real backend, frontend, E2E, dependency, and security checks with deterministic data and traceable evidence.

## Backend Workbench

Primary runner: `pytest` with `pytest-django`.

Required markers:
- `unit`: pure or mostly isolated logic tests.
- `api`: Django Ninja endpoint tests.
- `integration`: cross-app behavior tests.
- `security`: auth, RBAC, rate limit, upload, tenant isolation.
- `billing`: subscription, invoice, payment, webhook behavior.
- `concurrency`: row-locking and race-condition tests.
- `migration`: migration drift and schema tests.
- `slow`: tests excluded from quick local loops unless requested.

Backend test data SHALL use `backend/tests/factories.py`. Tests SHALL import every factory they use explicitly. Production-risk tests SHOULD run against PostgreSQL and Redis because SQLite and local memory caches do not prove locking, transaction, or Redis behavior.

## Frontend Workbench

Primary unit runner: Vitest. Existing tests under `frontend/tests/unit` SHALL import real source modules instead of copying implementation logic into test files.

Required scripts:
- `npm run typecheck`
- `npm run test:unit`
- `npm run test:e2e`
- `npm run test:e2e:headed`
- `npm run test:all`

## E2E Workbench

Primary runner: Playwright.

E2E tests SHALL:
- Use `PLAYWRIGHT_*` environment variables for test users.
- Store browser auth state in `.auth/`, which SHALL be gitignored.
- Avoid committed hardcoded passwords.
- Prefer role, label, URL, response, and locator assertions over fixed sleeps.
- Depend on deterministic seed data clearly marked as test-only.

## Security Workbench

Required checks:
- `bandit -r backend -x backend/venv,backend/**/migrations`
- `pip-audit -r backend/requirements.txt`
- `npm audit --omit=dev --audit-level=high`
- DAST baseline scan in CI.

Scanner exceptions, such as Apple PKPass SHA1 manifest requirements, SHALL be documented as accepted risk or justified exception before a gate is allowed to pass.

## CI Workbench

CI SHALL block merges on:
- Backend lint, format, deploy check, tests, and migration drift.
- Frontend lint, typecheck, unit tests, and build.
- Docker image build.
- High/critical dependency audit failures unless accepted risk is recorded.
- E2E smoke tests once deterministic seed data is available.

## Evidence

Every Plan B TODO row SHALL record the command or test that proves completion. A requirement is not complete until evidence is recorded.
