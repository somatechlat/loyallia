# Loyallia Agent Instructions

> **MANDATORY READ before any code change.** These rules override defaults.
> Source: `rules.md` and `docs/01-start-here/AGENT_ONBOARDING.md`. Keep in sync when either changes.

## Project Identity

- **Name:** Loyallia
- **Product:** Digital loyalty, wallet passes, campaigns, analytics, billing, scanner PWA, SaaS administration
- **Backend:** Django 5, Django Ninja, Django ORM, PostgreSQL 17, Celery, Redis
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind
- **Runtime:** Docker Compose, PgBouncer, MinIO, Nginx
- **Secrets:** HashiCorp Vault KV v2 (NEVER env files, NEVER code, NEVER Git)
- **Tests:** pytest (Docker only), Vitest, Playwright
- **Locale:** Spanish (`es`) is default and mandatory for user-facing strings
- **Compliance:** LOPDP/GDPR-oriented privacy, audit, tenant isolation

## Absolute Rules — ZERO TOLERANCE

1. **NO mocks, stubs, placeholders, fake functions, shims, bypasses, or TODOs as final implementation.**
2. **NO secrets in `.env`, NO secrets in code, NO secrets in Git.** All secrets live in Vault ONLY.
3. **NO hardcoded production values.** URLs, API keys, model names, timeouts must be Django settings reading from Vault or environment with safe defaults.
4. **NO mocked routes or mocked APIs as proof of production readiness.** Evidence must come from real code paths, real servers, real API responses.
5. **Never commit secrets. Never print secrets. Never expose secrets in API responses. Never log tokens, keys, or passwords.**
6. **Do not lie, guess, invent APIs, or claim something works without evidence.**
7. **Do not claim "done", "passed", or "production ready" unless checks actually passed.**

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
- **Frontend E2E:** `cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:33906 npx playwright test`
- **Do NOT** run tests against standalone PostgreSQL, SQLite, or host venv.
- Playwright tests must NOT mutate Vault secrets, factory reset, or seed demo data.
- Mutating E2E tests must use uniquely prefixed records and clean up ONLY those records.

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
