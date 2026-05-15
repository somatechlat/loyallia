# Modular Testing & Developer Experience Plan
## Loyallia — Full Implementation Roadmap

**Date:** 2026-05-15
**Scope:** E2E Modularization, Bootstrap/Factory Reset Hardening, Code Quality, LAN Development Access
**Estimated Effort:** 4-6 hours

---

## PART 1 — MODULAR E2E TESTING SYSTEM

### Current State
- 32 test files, ~284 tests, 1 serial worker → **~30 min full suite**
- No domain-based tags beyond role tags (`@owner`, `@manager`, `@staff`, `@superadmin`)
- No way to run "just campaigns" or "just settings" without grep-inverting everything else
- `test:e2e:fast` uses `@slow` tag which doesn't exist in any test file

### Goal
Create **8 domain modules** that can run independently (30-120s each) or in hybrid combinations.

### Module Design

```
Module          Files                                  Tests    Est. Time    Tag
─────────────────────────────────────────────────────────────────────────────
@auth           01-auth.spec.ts                        ~17      60s         @auth
@programs       02, 14, 16, 22                         ~40      90s         @programs
@customers      03                                      ~6       30s         @customers
@campaigns      08, 17, 18, 19, 21, 23, 24             ~70      120s        @campaigns
@settings       04, 05, 07, 09, 10, 12                 ~35      90s         @settings
@billing        09, 20, 29, 32                         ~30      60s         @billing
@superadmin     11, 26, 27, 28, 30, 31                 ~45      90s         @superadmin
@dashboard      06, 13, 25                             ~33      60s         @dashboard
```

### Implementation Steps

#### 1.1 Add Module Tags to All Test Files
Add `@module-name` tags to test.describe() and individual test() names.

Example for `02-programs.spec.ts`:
```typescript
test.describe('Programs — OWNER @owner @programs', () => { ... });
```

#### 1.2 Create New Playwright Projects
Add 8 new projects to `playwright.config.ts` that use `grep: /@module-name/`:

```typescript
{ name: 'auth', testMatch: /suite/.+\.spec\.ts/, dependencies: ['setup'], grep: /@auth/ },
{ name: 'programs', testMatch: /suite/.+\.spec\.ts/, dependencies: ['setup'], grep: /@programs/ },
// ... etc
```

Keep existing role-based projects for backward compatibility.

#### 1.3 Add NPM Scripts
```json
"test:e2e:auth": "playwright test --project=auth",
"test:e2e:programs": "playwright test --project=programs",
"test:e2e:customers": "playwright test --project=customers",
"test:e2e:campaigns": "playwright test --project=campaigns",
"test:e2e:settings": "playwright test --project=settings",
"test:e2e:billing": "playwright test --project=billing",
"test:e2e:superadmin": "playwright test --project=superadmin",
"test:e2e:dashboard": "playwright test --project=dashboard",
"test:e2e:smoke": "playwright test --project=auth --project=programs --project=dashboard",
"test:e2e:hybrid": "playwright test --project=auth --project=programs --project=customers --project=dashboard"
```

#### 1.4 Add `@slow` Tags to Heavy Tests
Mark long-running tests (bridge E2E, wallet full lifecycle, campaign API dispatch) with `@slow` so `test:e2e:fast` actually skips them.

#### 1.5 Create Module Test Manifest
Add `tests/e2e/MODULES.md` documenting each module, what it covers, and how to run it.

---

## PART 2 — BOOTSTRAP & FACTORY RESET HARDENING

### Issues Found

| # | Issue | Severity | File |
|---|-------|----------|------|
| 1 | `PlanOut` schema missing `status` field | 🔴 HIGH | `schemas.py` |
| 2 | Migration `0009` untracked in git | 🔴 HIGH | `migrations/` |
| 3 | `AuditLog.objects.all().delete()` bypasses immutability | 🟡 MEDIUM | `models.py` |
| 4 | SuperAdmin plan list returns archived plans unfiltered | 🟡 MEDIUM | `platform.py` |

### Fixes

#### 2.1 Fix `PlanOut` Schema
Add `status: str` to `PlanOut` and `from_plan()`.

#### 2.2 Commit Migration
`git add backend/apps/billing/migrations/0009_subscriptionplan_status.py`

#### 2.3 Protect AuditLog Bulk Delete
Override `AuditLogManager.delete()` to raise `PermissionError`, or add `pre_delete` signal.

#### 2.4 Add Status Filter to SuperAdmin Plan List
Add optional `?status=` query param to `/admin/plans/` with default filtering out `archived`.

---

## PART 3 — CODE QUALITY ENFORCEMENT

### Issues Found

| # | Issue | Current | Target |
|---|-------|---------|--------|
| 1 | `platform.py` exceeds 650-line limit | 886 lines | Split into modules |
| 2 | `superadmin/settings/page.tsx` exceeds limit | 921 lines | Extract components |
| 3 | Ruff not in CI | Skipped | Add to CI |
| 4 | No Prettier config | Missing | Add config |
| 5 | 11 `<img>` vs `<Image>` warnings | Warnings | Fix or suppress |
| 6 | Playwright E2E not in CI | Only `--list` | Add smoke test job |

### Fixes

#### 3.1 Split `platform.py` (886 → ~450 lines)
Extract into:
- `platform_integrations.py` — integration diagnostics & Vault editing
- `platform_factory_reset.py` — factory reset endpoints
- Keep `platform.py` for plan CRUD + tenant list + metrics + settings

#### 3.2 Add Ruff to CI
Add step to `.github/workflows/ci.yml` backend job.

#### 3.3 Add Prettier Config
Create `frontend/.prettierrc` with Tailwind plugin.

#### 3.4 Fix `<img>` → `<Image />` Where Possible
Replace 11 `<img>` tags with Next.js `<Image>` for performance.

---

## PART 4 — LAN / INTERNAL IP ACCESS FOR MOBILE TESTING

### Changes Required

#### 4.1 Docker Compose Port Bindings
Change `127.0.0.1:PORT:PORT` to `0.0.0.0:PORT:PORT` (or just `PORT:PORT`) for:
- `web` (33906)
- `api` (33905)
- `nginx` (80, 443)

Keep database/internal services on `127.0.0.1` for security.

#### 4.2 Add `docker-compose.lan.yml` Override
Create `docker-compose.lan.yml` that ONLY overrides port bindings:
```yaml
services:
  web:
    ports:
      - "33906:3000"
  api:
    ports:
      - "33905:8000"
  nginx:
    ports:
      - "80:80"
      - "443:443"
```

Usage: `docker compose -f docker-compose.yml -f docker-compose.lan.yml up -d`

#### 4.3 Update `.env` for LAN IP
Add to `.env`:
```
# For LAN/mobile testing — replace with your actual IP
LAN_IP=192.168.1.x
NEXT_PUBLIC_API_URL=http://${LAN_IP}:33905
NEXT_PUBLIC_APP_URL=http://${LAN_IP}:33906
```

#### 4.4 Add Script to Auto-Detect LAN IP
Create `scripts/start-lan.sh`:
```bash
#!/bin/bash
LAN_IP=$(ipconfig getifaddr en0 || hostname -I | awk '{print $1}')
echo "Starting Loyallia for LAN access at http://${LAN_IP}:33906"
docker compose -f docker-compose.yml -f docker-compose.lan.yml up -d
```

#### 4.5 Update `deploy/bootstrap/bootstrap.sh`
Add LAN mode option to bootstrap.

---

## PART 5 — PRODUCTION CONSIDERATIONS

### For Production CI
- Run `@auth`, `@dashboard`, `@programs` as smoke tests (fast, ~3 min)
- Run full suite nightly (all modules)
- Run `@superadmin` only on releases
- Never run `@slow` or phone verification in CI

### For Production Deployment
- Ensure `0009` migration is applied before code deploy
- Verify `PlanOut` schema returns `status` in production
- Confirm factory reset preserves audit logs

---

## VERIFICATION CHECKLIST

- [ ] All 32 test files have module tags
- [ ] All 8 module projects pass individually
- [ ] `npm run test:e2e:smoke` completes in < 3 minutes
- [ ] Backend pytest still passes (566+)
- [ ] TypeScript compiles clean
- [ ] Ruff passes clean
- [ ] Bootstrap works on fresh clone
- [ ] Factory reset wipes data but preserves SuperAdmin + plans + settings + audit logs
- [ ] LAN access works from phone (enrollment flow tested)
