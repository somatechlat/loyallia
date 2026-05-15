# Loyallia Test Workbench Architecture

## Purpose

The test workbench exists to make Plan B production readiness measurable. It SHALL run real backend, frontend, E2E, dependency, and security checks with deterministic data and traceable evidence.

## Backend Workbench

Primary runner: `pytest` with `pytest-django`.

Settings: `loyallia.settings.test` (unit tests) and `loyallia.settings.test_integration` (PgBouncer integration tests).

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

### PgBouncer Production Path Testing

Unit tests (`test.py`) use direct PostgreSQL for speed but exercise `PgBouncerRouter` so routing logic is covered. Integration tests (`test_integration.py`) use the **real production path**:

```bash
# Unit tests (568 tests, ~20s, direct PostgreSQL)
docker compose exec api python manage.py test --settings loyallia.settings.test

# Integration tests through PgBouncer (6 tests, ~4s, transaction mode)
docker compose exec api python manage.py test integration_tests --settings loyallia.settings.test_integration
```

Integration tests use `TransactionTestCase` (not `TestCase`) because PgBouncer transaction pooling breaks transaction rollback.

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
- Be tagged with BOTH a role tag (`@owner`, `@manager`, `@staff`, `@superadmin`) AND a module tag (`@auth`, `@programs`, `@customers`, `@campaigns`, `@settings`, `@scanner`, `@analytics`, `@automation`, `@team`, `@locations`, `@wallet`, `@whatsapp`, `@security`, `@role-isolation`, `@phone`).

### Modular Execution

Run any module in isolation (~1-2 min instead of ~20 min full suite):

```bash
npm run test:e2e:auth          # Login, registration, OAuth
npm run test:e2e:programs      # Program CRUD, wizard
npm run test:e2e:customers     # Customer list, import, search
npm run test:e2e:campaigns     # SMS, email, WhatsApp campaigns
npm run test:e2e:settings      # Settings, billing, WhatsApp bridge
npm run test:e2e:analytics     # Dashboard KPIs
npm run test:e2e:automation    # Automation rules
npm run test:e2e:scanner       # QR scanner (STAFF)
npm run test:e2e:wallet        # Wallet/pass lifecycle
npm run test:e2e:whatsapp      # WhatsApp bridge/campaigns
npm run test:e2e:security      # SRS hardening, rate limits
npm run test:e2e:superadmin    # Platform admin, tenant mgmt
npm run test:e2e:smoke         # Critical path only (~2-3 min)
```

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
- PgBouncer integration tests (production DB path verification).
- E2E smoke tests once deterministic seed data is available.

CI runs E2E tests against a **single canonical stack** (`docker compose up -d --build`). Smoke tests run first; full suite runs after. No separate stacks per module — that would waste resources.

## Evidence

Every Plan B TODO row SHALL record the command or test that proves completion. A requirement is not complete until evidence is recorded.
