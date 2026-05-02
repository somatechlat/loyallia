# Plan B TODO Traceability

Status values: `OPEN`, `IN_PROGRESS`, `BLOCKED`, `VERIFYING`, `DONE`, `ACCEPTED_RISK`.

| ID | Requirement | Priority | Status | Primary Files | Tests / Evidence | Result | Notes |
|---|---|---:|---|---|---|---|---|
| LYL-PB-DOC-001 | Create Plan B ISO/IEC 29148 SRS | P0 | DONE | `docs/SRS_Loyallia_PLAN_B_PRODUCTION_RECOVERY.md` | File exists | PASS | Created as active recovery baseline |
| LYL-PB-DOC-002 | Create traceable TODO tracker | P0 | DONE | `docs/TODO_PLAN_B_TRACEABILITY.md` | File exists | PASS | This file |
| LYL-PB-DOC-003 | Add verification matrix | P0 | DONE | Plan B SRS | Acceptance gates present | PASS | Matrix is command-based |
| LYL-PB-DOC-004 | Update handoff after verified fixes | P0 | OPEN | `HANDOFF.md` | Manual review | PENDING | Do after gates pass |
| LYL-PB-FE-001 | Fix FormBuilder swap syntax | P0 | DONE | `frontend/src/components/programs/FormBuilder.tsx` | `npm run build` | PASS | Build passes on Next 14.2.35 |
| LYL-PB-FE-002 | Fix superadmin metrics types | P0 | DONE | metrics page | `npm run typecheck` | PASS | |
| LYL-PB-FE-003 | Fix tenant location state assignment | P0 | DONE | tenants page | `npm run typecheck` | PASS | |
| LYL-PB-FE-004 | Fix LocationPicker strict state type | P0 | DONE | `LocationPicker.tsx` | `npm run typecheck` | PASS | |
| LYL-PB-FE-005 | Fix rate limiter undefined access | P0 | DONE | `rate-limiter.ts` | `npm run typecheck` | PASS | |
| LYL-PB-FE-006 | Fix token manager undefined access | P0 | DONE | `token-manager.ts` | `npm run typecheck` | PASS | |
| LYL-PB-FE-007 | Make frontend lint non-interactive | P1 | DONE | frontend config | `npm run lint` | PASS_WITH_WARNINGS | Warnings remain for img/hook dependency/font |
| LYL-PB-BE-001 | Fix ruff errors | P0 | IN_PROGRESS | backend | targeted `ruff check ...` | PARTIAL_PASS | Touched Plan B backend files pass; full repo still fails |
| LYL-PB-BE-002 | Fix black formatting | P1 | IN_PROGRESS | backend | targeted `black ...`; full `black --check .` | PARTIAL_PASS | Touched Plan B backend files formatted; full repo has 72 files pending |
| LYL-PB-BE-003 | Fix test factory imports | P0 | DONE | backend tests | targeted `ruff check tests/test_models.py tests/test_services.py` | PASS | Imports restored |
| LYL-PB-BE-004 | Make deploy checks runnable | P0 | BLOCKED | settings/deps | `DEBUG=False python3 manage.py check --deploy` | FAIL | `django_celery_beat` imports wrong `crontab` package: missing `CronSlices` |
| LYL-PB-DB-001 | Add migration for Card typed fields | P0 | VERIFYING | cards migrations | `DEBUG=False python3 manage.py makemigrations --check --dry-run` | BLOCKED | Migration file exists; Django startup blocked by `crontab.CronSlices` |
| LYL-PB-DB-006 | Concurrency-safe invoice numbers | P1 | OPEN | billing payment models | concurrency test | PENDING | |
| LYL-PB-BILL-001 | Block paid activation without payment confirmation | P0 | VERIFYING | billing API | targeted `ruff check apps/billing/api.py` | PASS | Behavior changed; billing lifecycle tests still required |
| LYL-PB-BILL-004 | Make webhook timestamp mandatory | P0 | VERIFYING | payment API | targeted `ruff check apps/billing/payment_api.py` | PASS | Webhook behavior tests still required |
| LYL-PB-BILL-006 | Make webhook idempotency retry-safe | P0 | VERIFYING | payment API/models | targeted `ruff check apps/billing/payment_api.py` | PASS | Transaction/retry tests still required |
| LYL-PB-BILL-009 | Bound trial extensions | P1 | OPEN | billing/tenants | billing tests | PENDING | |
| LYL-PB-SEC-001 | Atomic refresh-token rotation | P0 | VERIFYING | auth API | targeted `ruff check apps/authentication/api.py` | PASS | Concurrency tests still required |
| LYL-PB-SEC-003 | Remove XFF trust in Google OAuth limiter | P1 | VERIFYING | auth API | targeted `ruff check apps/authentication/api.py` | PASS | Uses centralized client-IP helper |
| LYL-PB-SEC-004 | Remove XFF trust in enrollment limiter | P1 | VERIFYING | customers API | targeted `ruff check apps/customers/api.py` | PASS | Uses centralized client-IP helper |
| LYL-PB-SEC-008 | Replace MD5 rate-limit hash | P1 | VERIFYING | rate limiter | targeted `ruff check common/rate_limit.py` | PASS | SHA-256 used for token key hashing |
| LYL-PB-CUST-001 | Enforce import size limit | P1 | VERIFYING | import service | targeted `ruff check apps/customers/import_service.py` | PASS | 10MB limit present; behavior tests required |
| LYL-PB-CUST-002 | Enforce 50,000-row import max | P1 | VERIFYING | import service | targeted `ruff check apps/customers/import_service.py` | PASS | Behavior tests required |
| LYL-PB-CUST-004 | Enforce import plan capacity | P0 | VERIFYING | import service/API | targeted `ruff check apps/customers/import_service.py` | PASS | Behavior tests required |
| LYL-PB-UPLOAD-001 | Validate upload content | P1 | VERIFYING | upload API | targeted `ruff check apps/api/upload_api.py` | PASS | Uses MIME and Pillow verification |
| LYL-PB-UPLOAD-002 | Reject or sanitize SVG uploads | P1 | VERIFYING | upload API | targeted `ruff check apps/api/upload_api.py` | PASS | SVG removed from allowed extensions/content types |
| LYL-PB-INFRA-001 | Fix production Redis URLs | P0 | DONE | compose prod | source inspection | PASS | Redis URLs include password interpolation |
| LYL-PB-INFRA-003 | Remove CI `|| true` masks | P0 | DONE | CI workflow | source inspection | PASS | Deploy, coverage, Bandit, npm audit masks removed |
| LYL-PB-INFRA-007 | Add DAST baseline | P1 | VERIFYING | CI workflow | source inspection | PARTIAL | Workflow added; target/startup still needs CI validation |
| LYL-PB-INFRA-008 | Add Playwright CI gate | P1 | VERIFYING | CI workflow | source inspection | PARTIAL | E2E config/list gate added; full app E2E still pending |
| LYL-PB-DEP-001 | Resolve npm critical audit | P0 | IN_PROGRESS | frontend deps | `npm audit --omit=dev --audit-level=high` | FAIL | Critical cleared by Next 14.2.35; high remains and requires breaking Next 16 migration |
| LYL-PB-DEP-002 | Add Python dependency audit tooling | P1 | OPEN | backend deps/CI | pip-audit | PENDING | |
| LYL-PB-TWB-BE-001 | Add backend pytest config | P0 | DONE | backend pytest config | file exists | PASS | Markers/testpaths configured |
| LYL-PB-TWB-FE-001 | Add frontend unit runner | P0 | DONE | package/vitest config | `npm run test:unit` | PASS | 12 tests pass |
| LYL-PB-TWB-E2E-001 | Env-driven E2E credentials | P1 | DONE | Playwright setup | source inspection | PASS | Hardcoded credentials removed |

## Gate Log

Append each verification run here with date, command, and result.

| Date | Command | Result | Notes |
|---|---|---|---|
| 2026-05-01 | Initial deep audit gates | FAIL | Build, typecheck, ruff, black, audit, and test gates failing |
| 2026-05-01 | `cd frontend && npm run lint` | PASS_WITH_WARNINGS | Non-interactive lint works; img/hook/font warnings remain |
| 2026-05-01 | `cd frontend && npm run typecheck` | PASS | TypeScript strict gate passes |
| 2026-05-01 | `cd frontend && npm run test:unit` | PASS | Vitest: 1 file, 12 tests |
| 2026-05-01 | `cd frontend && npm run build` | PASS_WITH_WARNINGS | Next 14.2.35 production build succeeds |
| 2026-05-01 | `cd frontend && npm audit --omit=dev --audit-level=high` | FAIL | Remaining high Next advisory requires breaking Next 16 migration |
| 2026-05-01 | `cd backend && python3 -m ruff check <Plan B touched files>` | PASS | Scoped backend files pass Ruff |
| 2026-05-01 | `cd backend && python3 -m black <Plan B touched files>` | PASS | Scoped backend files formatted |
| 2026-05-01 | `cd backend && python3 -m black --check .` | FAIL | 72 backend files still require formatting |
| 2026-05-01 | `cd backend && DEBUG=False python3 manage.py makemigrations --check --dry-run` | BLOCKED | `django_celery_beat` fails because installed `crontab` module lacks `CronSlices` |
| 2026-05-01 | `cd backend && DEBUG=False python3 manage.py check --deploy` | BLOCKED | Same `crontab.CronSlices` dependency/runtime blocker |
