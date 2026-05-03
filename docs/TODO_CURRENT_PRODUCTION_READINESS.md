# Current Production Readiness TODO

**Document ID:** LOYALLIA-TODO-CURRENT-PROD-001  
**Date:** 2026-05-02  
**Status:** ACTIVE  
**Source:** Current workspace state, Plan B SRS, project rules, AGENT.md, architecture docs, client scope docs, and latest real gate runs.

Status values: `OPEN`, `IN_PROGRESS`, `BLOCKED`, `VERIFYING`, `DONE`, `ACCEPTED_RISK`.

No item may be marked `DONE` unless the evidence command passes or the item has an explicit `ACCEPTED_RISK` decision.

## Immediate Rule Baseline

| ID | Rule | Status | Evidence / Notes |
|---|---|---|---|
| LYL-CUR-RULE-001 | No plaintext production secrets in committed code, docs, scripts, compose files, or env defaults. | OPEN | Secret-pattern audit found remaining env interpolation/default paths. |
| LYL-CUR-RULE-002 | Production secrets SHALL be loaded from Vault KV v2 only. | VERIFYING | `backend/loyallia/settings/production.py` uses strict Vault reads for production runtime secrets; Docker Vault is currently sealed so readiness cannot pass. |
| LYL-CUR-RULE-003 | No mocks, stubs, placeholders, or fake integrations for production readiness. | VERIFYING | `backend/scripts/vault_migration.py` now requires operator-provided secure input and no longer contains a default root token or placeholder payload. |
| LYL-CUR-RULE-004 | Real Docker and real test runners SHALL be used for readiness evidence. | IN_PROGRESS | Docker pytest was run; latest result is 49 failed, 411 passed, 2 skipped. |
| LYL-CUR-RULE-005 | Do not claim Apple Wallet/NFC readiness until web PKPass prerequisites and optional NFC approval are validated. | BLOCKED | Vault-backed Apple readiness command exists but must be corrected to web PKPass/NFC scope; Vault is also sealed/unreachable. |

## Vault And Secret Management

| ID | Requirement | Priority | Status | Primary Files | Evidence Command | Result | Notes |
|---|---|---:|---|---|---|---|---|
| LYL-CUR-VAULT-001 | Production Django settings SHALL fail if Vault is missing required secrets. | P0 | VERIFYING | `backend/loyallia/settings/production.py` | `DJANGO_SETTINGS_MODULE=loyallia.settings.production python manage.py check --deploy` | PENDING | Re-run after Vault config cleanup. |
| LYL-CUR-VAULT-002 | Remove env fallback for production critical secrets. | P0 | IN_PROGRESS | `backend/loyallia/settings/production.py`, `backend/common/vault.py` | source inspection + deploy check | PENDING | Production settings patched; shared Vault client/docs still describe env fallback. |
| LYL-CUR-VAULT-003 | Remove hardcoded/default Vault root token behavior. | P0 | VERIFYING | `backend/scripts/vault_migration.py`, `docker-compose.yml`, docs | source inspection | PASS for migration script; compose bootstrap still needs operator decision | Migration script requires `VAULT_ADDR`, `VAULT_TOKEN`, and `--input`; compose still has bootstrap/runtime Vault token plumbing. |
| LYL-CUR-VAULT-004 | Remove placeholder secret payloads. | P0 | VERIFYING | `backend/scripts/vault_migration.py` | source inspection | PASS for migration script | Remaining placeholder-like strings exist in dev/test defaults and docs; production path still blocked by sealed Vault. |
| LYL-CUR-VAULT-005 | Stop passing app runtime secrets through compose env where app can read Vault directly. | P0 | IN_PROGRESS | `docker-compose.yml`, `docker-compose.prod.yml` | compose source inspection | PARTIAL | App runtime now expects Vault for many secrets; bootstrap services and Vault token handling remain unresolved production decisions. |
| LYL-CUR-VAULT-006 | Define exact Vault key names for all runtime secrets. | P0 | VERIFYING | `docs/APPLE_WALLET_WEB_PKPASS_NFC.md`, production settings | source inspection | PASS for current listed keys | Includes Django, JWT, DB, Redis, MinIO, payment, email, Google, and Apple Wallet web PKPass/NFC keys. |
| LYL-CUR-VAULT-007 | Add a non-secret Vault readiness command. | P1 | VERIFYING | `backend/apps/api/management/commands/check_vault_config.py` | `docker compose exec -T api python manage.py check_vault_config --include-apple` | FAIL: Vault sealed/unreachable | Command does not print secret values. |
| LYL-CUR-VAULT-008 | Rotate any secret that appeared in `.env`, scripts, docs, or logs. | P0 | OPEN | Vault/operator task | rotation evidence | PENDING | Do not print secret values in evidence. |

## Apple Wallet Web PKPass And NFC

| ID | Requirement | Priority | Status | Primary Files | Evidence Command | Result | Notes |
|---|---|---:|---|---|---|---|---|
| LYL-CUR-APPLE-001 | Confirm Apple web PKPass product path: no native iOS app required for customer add-to-wallet flow. | P0 | DONE | `docs/APPLE_WALLET_WEB_PKPASS_NFC.md` | source review | PASS | Verify with Wallet identity flow is out of current scope. |
| LYL-CUR-APPLE-002 | Store Apple Team ID, Pass Type ID, PKPass cert/key, and WWDR cert in Vault. | P0 | VERIFYING | production settings, wallet docs | Vault readiness check | BLOCKED: Vault sealed | These are the required web PKPass keys. |
| LYL-CUR-APPLE-003 | Add NFC as an optional gated feature requiring Apple approval and real reader validation. | P0 | VERIFYING | `docs/APPLE_WALLET_WEB_PKPASS_NFC.md`, pass engine | source review | CODE PARTIAL | NFC is now card-metadata gated in the pass engine; real Apple approval and reader validation remain required. |
| LYL-CUR-APPLE-004 | Store Apple PKPass signing cert/key and WWDR certificate in Vault. | P0 | VERIFYING | `backend/apps/customers/pass_engine/apple_pass.py` | wallet cert parse check | BLOCKED: Vault sealed | Pass engine reads PEM material from Vault key names. |
| LYL-CUR-APPLE-005 | Remove Verify with Wallet identity keys from current web Wallet readiness gate. | P0 | VERIFYING | readiness commands, production settings | `python manage.py check_apple_wallet_config` | CODE UPDATED | Command scope is now web PKPass/NFC only; production settings still contain Verify with Wallet strict keys and need cleanup. |
| LYL-CUR-APPLE-006 | Document simple customer add-to-wallet flow. | P1 | DONE | `docs/APPLE_WALLET_WEB_PKPASS_NFC.md` | source review | PASS | Customer uses public enrollment URL and browser Add to Apple Wallet flow. |
| LYL-CUR-APPLE-007 | Add pre-Docker Apple Wallet readiness check for web PKPass/NFC only. | P0 | VERIFYING | `backend/apps/api/management/commands/check_apple_wallet_config.py` | `docker compose exec -T api python manage.py check_apple_wallet_config` | FAIL: Vault Service Unavailable | Command validates PKPass cert/key/WWDR and optional NFC only, and did not print secret values. |
| LYL-CUR-APPLE-008 | Add real Apple Wallet tests for configured, disabled, invalid pass, valid pass, and NFC-gated paths. | P1 | OPEN | backend tests | pytest wallet tests | PENDING | No mocks for production readiness; fixture payloads must be documented test fixtures. |

## Backend Runtime And Tests

| ID | Requirement | Priority | Status | Primary Files | Evidence Command | Result | Notes |
|---|---|---:|---|---|---|---|---|
| LYL-CUR-BE-001 | Re-run backend Ruff after latest patches. | P0 | DONE | backend | `cd backend && ./venv/bin/ruff check .` | PASS | 2026-05-02. |
| LYL-CUR-BE-002 | Re-run backend Black after latest patches. | P0 | DONE | backend | `cd backend && ./venv/bin/black --check .` | PASS | 2026-05-02. |
| LYL-CUR-BE-003 | Re-run backend Pyright after latest patches. | P0 | DONE | backend | `cd backend && pyright` | PASS | 2026-05-02. |
| LYL-CUR-BE-004 | Backend Docker pytest SHALL reach zero failures. | P0 | IN_PROGRESS | backend tests/app code | `docker compose exec -T api env DJANGO_SETTINGS_MODULE=loyallia.settings.test pytest -q` | FAIL | Latest result: 49 failed, 411 passed, 2 skipped. |
| LYL-CUR-BE-005 | Fix API route mismatches causing 404/405 in tests. | P0 | DONE | API router files, tests | `docker compose exec -T api env DJANGO_SETTINGS_MODULE=loyallia.settings.test pytest -q tests/test_api.py::CustomersAPITest tests/test_api.py::CardsAPITest tests/test_api.py::TenantsAPITest tests/test_api.py::AutomationAPITest tests/test_api.py::NotificationsAPITest` | PASS: 12 passed | Added real compatibility aliases and customer CRUD/tenant/notification routes. |
| LYL-CUR-BE-006 | Align card factories/test setup with required metadata. | P0 | OPEN | `backend/tests/factories.py`, card tests | Docker pytest subset | FAIL | Card validation now requires reward, coupon, referral, and discount metadata. |
| LYL-CUR-BE-007 | Fix scanner auth workflow returning 401 in scanner tests. | P0 | OPEN | scanner/card auth code and tests | scanner pytest subset | FAIL | Owner/staff scanner requests expected 200. |
| LYL-CUR-BE-008 | Align trial and plan enforcement behavior with SRS/business rules. | P0 | OPEN | billing, tenants, plan enforcement | plan/billing pytest subset | FAIL | Trial-related tests still failing. |
| LYL-CUR-BE-009 | Fix remaining source-inspection security test for invitation hashing. | P1 | OPEN | auth API/tests | security pytest subset | FAIL | Test expects hashing implementation evidence. |
| LYL-CUR-BE-010 | Run migration drift check. | P0 | DONE | migrations | `docker compose exec -T api python manage.py makemigrations --check --dry-run` | PASS | No changes detected. |
| LYL-CUR-BE-011 | Run deploy check under production settings with Vault available. | P0 | BLOCKED | settings/Vault/compose | `docker compose exec -T api python manage.py check --deploy` | WARN / not production settings | Current dev container reports six deployment warnings; production strict Vault check is blocked by sealed Vault. |

## Frontend Runtime And Tests

| ID | Requirement | Priority | Status | Primary Files | Evidence Command | Result | Notes |
|---|---|---:|---|---|---|---|---|
| LYL-CUR-FE-001 | Re-run frontend typecheck after latest changes. | P0 | DONE | frontend | `cd frontend && npm run typecheck` | PASS | 2026-05-02. |
| LYL-CUR-FE-002 | Re-run frontend lint and record warnings. | P1 | VERIFYING | frontend | `cd frontend && npm run lint` | PASS with warnings | Warnings remain for `<img>`, hook dependencies, and custom font. |
| LYL-CUR-FE-003 | Re-run frontend build. | P0 | DONE | frontend | `cd frontend && npm run build` | PASS | 2026-05-02. |
| LYL-CUR-FE-004 | Re-run frontend unit tests. | P0 | DONE | frontend tests | `cd frontend && npm run test:unit` | PASS: 1 file, 12 tests | 2026-05-02. |
| LYL-CUR-FE-005 | Resolve remaining lint warnings where production-relevant. | P2 | OPEN | dashboard/program/scanner components | lint output | PENDING | `img`, hook dependency, and custom font warnings. |

## Docker And Infrastructure

| ID | Requirement | Priority | Status | Primary Files | Evidence Command | Result | Notes |
|---|---|---:|---|---|---|---|---|
| LYL-CUR-INFRA-001 | Confirm Docker cluster health after Vault cleanup. | P0 | OPEN | compose | `docker compose ps` | PENDING | Previously healthy before latest changes. |
| LYL-CUR-INFRA-002 | Ensure app runtime uses production-safe Vault access. | P0 | OPEN | compose/settings/Vault | startup logs + health | PENDING | No secret values in logs. |
| LYL-CUR-INFRA-003 | Reconcile development `.env` usage with Vault-only production rule. | P0 | OPEN | `.env`, docs, compose | source inspection | PENDING | `.env` exists locally; production must not depend on plaintext passwords. |
| LYL-CUR-INFRA-004 | Ensure Redis auth is consistently sourced from Vault or controlled bootstrap path. | P0 | OPEN | compose/settings | Redis smoke | PENDING | Redis server still needs password at startup; app should not rely on plaintext env fallback. |
| LYL-CUR-INFRA-005 | Add/verify CI gates for backend, frontend, Docker, audit, E2E, and migration drift. | P1 | OPEN | `.github/workflows` | workflow grep + CI run | PENDING | Existing Plan B doc says partial. |

## Dependency And Security Audit

| ID | Requirement | Priority | Status | Primary Files | Evidence Command | Result | Notes |
|---|---|---:|---|---|---|---|---|
| LYL-CUR-DEP-001 | Run npm production audit. | P0 | OPEN | frontend deps | `cd frontend && npm audit --omit=dev --audit-level=high` | FAIL | High Next.js advisory and moderate PostCSS advisory remain; fix suggests breaking Next 16 upgrade. |
| LYL-CUR-DEP-002 | Add and run Python dependency audit. | P1 | OPEN | backend deps/CI | `cd backend && pip-audit -r requirements.txt` | BLOCKED | `pip-audit` is not installed in backend venv. |
| LYL-CUR-SEC-001 | Run Bandit with documented Apple PKPass SHA1 exception if needed. | P1 | OPEN | backend | `bandit -r backend -x backend/venv,backend/**/migrations` | BLOCKED | `bandit` is not installed in backend venv. |
| LYL-CUR-SEC-002 | Verify no committed secret values or placeholders remain. | P0 | OPEN | full repo | `rg` secret-pattern audit | PENDING | Must not print secret values in reports. |

## Documentation And Traceability

| ID | Requirement | Priority | Status | Primary Files | Evidence Command | Result | Notes |
|---|---|---:|---|---|---|---|---|
| LYL-CUR-DOC-001 | Update stale Plan B TODO rows with latest real gate results. | P0 | OPEN | `docs/TODO_PLAN_B_TRACEABILITY.md` | source inspection | PENDING | Existing rows still mention older black/ruff failures. |
| LYL-CUR-DOC-002 | Add Vault-only production secret policy to docs. | P0 | OPEN | `docs/secret-rotation.md`, SRS/Plan B | source inspection | PENDING | Current docs still mention `.env` updates for secret rotation. |
| LYL-CUR-DOC-003 | Add corrected Apple web PKPass/NFC setup and operator checklist. | P1 | DONE | `docs/APPLE_WALLET_WEB_PKPASS_NFC.md` | doc review | PASS | Cites Apple docs and avoids account password instructions. |
| LYL-CUR-DOC-004 | Update `HANDOFF.md` only after all P0/P1 gates pass or are accepted risk. | P0 | OPEN | `HANDOFF.md` | manual review | PENDING | Do not claim production-ready before gates pass. |

## Execution Order

1. Finish Vault-only cleanup and remove placeholder/default secret paths.
2. Add Vault readiness checks and Apple Wallet pre-Docker readiness checks.
3. Re-run backend/frontend static gates.
4. Fix the 58 known Docker pytest failures by cluster: routes, factories, scanner auth, trial/plan behavior, security source test.
5. Run full Docker pytest until zero failures.
6. Run migration drift and deploy checks under production settings with Vault available.
7. Run dependency/security audits.
8. Start/verify Docker cluster health.
9. Update traceability and `HANDOFF.md` with only verified evidence.

## Latest Known Evidence Snapshot

| Date | Evidence | Result |
|---|---|---|
| 2026-05-02 | Docker pytest with test settings after API compatibility fixes | FAIL: 49 failed, 411 passed, 2 skipped |
| 2026-05-02 | Backend ruff/black/pyright after latest patches | PASS |
| 2026-05-02 | Frontend typecheck/lint/test/build after latest patches | PASS, lint/build with warnings |
| 2026-05-02 | Docker Vault readiness checks | FAIL: Vault sealed/unreachable |
| 2026-05-02 | npm production audit | FAIL: Next.js high advisories and PostCSS moderate advisory |
