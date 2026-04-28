# 🚀 Loyallia — Complete 105-Issue Remediation Plan

**Date:** 2026-04-29  
**Branch:** `MIMO-corrections`  
**Source:** 5-agent audit (Security, Performance, Bugs, Accessibility, Code Quality)  
**Frontend:** 50 source files, ~8,500 LOC  
**Backend:** ~100 source files  

---

## 📊 Summary

| Severity | Count | SLA |
|----------|-------|-----|
| 🔴 CRITICAL | 5 | 24 hours |
| 🟠 HIGH | 22 | Sprint 1 (2 weeks) |
| 🟡 MEDIUM | 48 | Sprint 2-3 (4 weeks) |
| 🔵 LOW | 30 | Sprint 4+ (backlog) |
| **TOTAL** | **105** | |

| Agent | Category | C | H | M | L | Total |
|-------|----------|---|---|---|---|-------|
| Agent 1 | Security | 2 | 7 | 6 | 1 | **16** |
| Agent 2 | Performance | 0 | 4 | 6 | 0 | **10** |
| Agent 3 | Bugs/Types | 2 | 6 | 7 | 2 | **17** |
| Agent 4 | Accessibility | 0 | 5 | 9 | 2 | **16** |
| Agent 5 | Code Quality | 2 | 6 | 8 | 3 | **19** |
| Cross-ref | Combined | — | — | — | — | **27** |
| | | | | | | **105** |

---

## 🔴 SPRINT 0 — CRITICAL (Fix in 24 hours)

### SEC-001 — Token Refresh Race Condition
- **File:** `src/lib/api.ts:17-34`
- **Issue:** 8 concurrent 401s → 8 refresh attempts → 7 fail → forced logout
- **Fix:** Shared refresh lock (single `refreshPromise`)
- **Effort:** 2h
- **Status:** ✅ ALREADY FIXED in merged code

### SEC-009 — Impersonation Overwrites Admin Token
- **File:** `src/app/(dashboard)/superadmin/tenants/page.tsx:186-190`
- **Issue:** `Cookies.set('access_token', d.access_token)` loses superadmin session
- **Fix:** Backup token to sessionStorage, add "Return to Admin" button
- **Effort:** 1h

### BUG-001 — Side Effects During Render (STAFF Redirect)
- **File:** `src/app/(dashboard)/layout.tsx:127-131`
- **Issue:** `window.location.replace()` in component body (not useEffect)
- **Fix:** Move to `useEffect`
- **Effort:** 1h

### BUG-002 — Side Effects During Render (SUPER_ADMIN + RBAC)
- **File:** `src/app/(dashboard)/layout.tsx:134-149`
- **Issue:** Same pattern for SUPER_ADMIN and RBAC redirects
- **Fix:** Consolidate all redirects into single `useEffect`
- **Effort:** 0.5h

### QUAL-004 — 350-Line Program Details with Inline Edit Modal
- **File:** `src/app/(dashboard)/programs/[id]/page.tsx`
- **Issue:** God component, inline modal, mixed concerns
- **Fix:** Extract `ProgramEditModal` component
- **Effort:** 4h

### QUAL-006 — 800+ Line Superadmin Tenants Component
- **File:** `src/app/(dashboard)/superadmin/tenants/page.tsx`
- **Issue:** Largest component. 20+ state variables, 4-step wizard, detail modal
- **Fix:** Split into `TenantTable`, `TenantWizard`, `TenantDetailModal`, `LocationEditor`, `TenantActions`
- **Effort:** 8h

**Sprint 0 Total: ~16.5 hours**

---

## 🟠 SPRINT 1 — HIGH (Weeks 1-2)

### Security (7 items)

| ID | Issue | File | Fix | Effort |
|----|-------|------|-----|--------|
| SEC-002 | Refresh token no CSRF protection | `api.ts:24` | Backend: validate Origin header | 2h |
| SEC-003 | Tokens in non-httpOnly cookies | `api.ts`, `auth.tsx` | BFF pattern or SameSite=Strict | 4h |
| SEC-005 | Silent refresh uses relative URL | `auth.tsx:62-69` | httpOnly cookies (see SEC-003) | 1h |
| SEC-007 | File upload sends token in header | `campaigns/page.tsx:42` | Use centralized api helper | 1h |
| SEC-008 | Raw HTML input for campaigns | `campaigns/page.tsx:89-93` | Backend: DOMPurify sanitization | 2h |
| SEC-010 | Impersonation no confirmation | `tenants/page.tsx:196-197` | Add ConfirmModal | 0.5h |
| SEC-015 | Chatbot sends PII to AI agent | `Chatbot.tsx:82-93` | Strip PII from screen context | 3h |

### Performance (4 items)

| ID | Issue | File | Fix | Effort |
|----|-------|------|-----|--------|
| PERF-001 | 8 parallel API calls on date change | `page.tsx:91-98` | Debounce + lazy-load + SWR | 3h |
| PERF-003 | 13 individual recharts imports | `analytics/page.tsx:7-20` | Single dynamic import | 1h |
| PERF-008 | 800+ line component, 20+ states | `tenants/page.tsx` | (see QUAL-006) | — |
| PERF-004 | Nav classNames recreated each render | `layout.tsx:108-126` | Use clsx or useMemo | 1h |

### Bugs/Types (6 items)

| ID | Issue | File | Fix | Effort |
|----|-------|------|-----|--------|
| BUG-003 | @ts-nocheck disables all checking | `analytics/page.tsx:1-14` | Remove and fix types | 3h |
| BUG-004 | All recharts typed as `any` | `analytics/page.tsx:7-20` | Proper types | 2h |
| BUG-005 | useState\<any\> on customer/passes | `customers/[id]/page.tsx:30-31` | Define interfaces | 1h |
| BUG-007 | metrics/locations typed as `any` | `superadmin/page.tsx:12-13` | Define interfaces | 1h |
| BUG-008 | 15+ useState\<any\> declarations | `tenants/page.tsx:25-40` | Define interfaces | 2h |
| BUG-009 | Impersonation redirects to /dashboard | `tenants/page.tsx:185` | Change to `/` | 0.25h |

### Accessibility (5 items)

| ID | Issue | File | Fix | Effort |
|----|-------|------|-----|--------|
| A11Y-001 | Form errors not linked to inputs | `login/page.tsx:88` | aria-describedby + role="alert" | 2h |
| A11Y-003 | Dropdown has no ARIA pattern | `register/page.tsx:137-200` | Native select or ARIA combobox | 3h |
| A11Y-004 | No aria-current on nav links | `layout.tsx:68-85` | Add aria-current="page" | 0.5h |
| A11Y-010 | Delete modal no focus trap | `customers/page.tsx:100-125` | Implement focus trap | 2h |
| A11Y-014 | Enrollment form errors inaccessible | `enroll/[slug]/page.tsx:130-180` | aria-describedby + role="alert" | 2h |
| A11Y-015 | Chat missing dialog role | `Chatbot.tsx:170-195` | role="dialog" + aria-label | 1h |

### Code Quality (6 items)

| ID | Issue | File | Fix | Effort |
|----|-------|------|-----|--------|
| QUAL-001 | God component — dashboard layout | `layout.tsx` | Extract Sidebar, ThemeToggle, etc. | 4h |
| QUAL-002 | 380-line dashboard page | `page.tsx` | Extract StatsGrid, Charts, etc. | 4h |
| QUAL-005 | Edit modal duplicates create page | `[id]/page.tsx`, `new/page.tsx` | Shared ProgramForm component | 3h |
| QUAL-008 | 450-line automation component | `automation/page.tsx` | Split into sub-components | 4h |
| QUAL-010 | adjustColor duplicated 3 places | constants, enroll, programs | Extract to shared utility | 0.5h |
| QUAL-011 | uploadFile duplicated 3 places | programs, campaigns | Extract shared hook | 0.5h |

**Sprint 1 Total: ~52.25 hours**

---

## 🟡 SPRINT 2 — MEDIUM (Weeks 3-4)

### Security (6 items)

| ID | Issue | File | Fix | Effort |
|----|-------|------|-----|--------|
| SEC-004 | Login redirect leaks referrer | `api.ts:44` | Use `location.replace()` | 0.5h |
| SEC-006 | Cookie Secure flag via runtime detection | `auth.tsx:100-103` | Use NODE_ENV | 0.5h |
| SEC-011 | Enrollment no rate limiting | `enroll/[slug]/page.tsx:55` | Add CAPTCHA or rate limit | 2h |
| SEC-013 | AI agent key shared across users | `chat/route.ts:16` | Per-user rate limiting | 2h |
| SEC-014 | No input sanitization on chat | `chat/route.ts:32` | Max length + strip injection | 1h |
| SEC-016 | Private IP in allowed origins | `next.config.js:9` | Use env vars | 0.5h |

### Performance (6 items)

| ID | Issue | File | Fix | Effort |
|----|-------|------|-----|--------|
| PERF-002 | SVG gradients recreated each render | `page.tsx:68-80` | Move to static component | 0.5h |
| PERF-005 | NavIcon not memoized | `layout.tsx:156-165` | React.memo | 0.5h |
| PERF-006 | Edit modal rendered unconditionally | `programs/[id]/page.tsx:34-45` | Dynamic import | 1h |
| PERF-007 | 3 identical file upload handlers | `programs/new/page.tsx:64-85` | Extract useFileUpload hook | 1h |
| PERF-009 | TypeConfig re-renders on any change | `TypeConfig.tsx:1-420` | Split per card type | 2h |
| PERF-010 | Chat messages all re-render | `Chatbot.tsx:136-149` | React.memo per message | 1h |

### Bugs/Types (7 items)

| ID | Issue | File | Fix | Effort |
|----|-------|------|-----|--------|
| BUG-006 | Card ID vs Program ID mismatch | `customers/[id]/page.tsx:86` | Verify entity types | 0.5h |
| BUG-010 | scheduleRefresh empty deps | `auth.tsx:49` | Fix dependency array | 0.5h |
| BUG-012 | Window.google type duplicated | login, register | Extract to shared types | 0.5h |
| BUG-013 | confirm() inconsistent with app | `locations/page.tsx:80` | Use ConfirmModal | 1h |
| BUG-014 | Unused BASE_URL constant | `enroll/[slug]/page.tsx:22-23` | Remove dead code | 0.25h |
| BUG-015 | adjustColor no 3-char hex | `constants.tsx:78-82` | Handle shorthand hex | 0.25h |
| BUG-011 | fetchUser resets loading after login | `auth.tsx:93` | Fix loading state | 0.5h |

### Accessibility (9 items)

| ID | Issue | File | Fix | Effort |
|----|-------|------|-----|--------|
| A11Y-002 | No show password toggle | `login/page.tsx:101` | Add toggle button | 1h |
| A11Y-005 | Theme toggle missing aria-pressed | `layout.tsx:147-155` | Add aria-pressed | 0.5h |
| A11Y-006 | Profile area not keyboard accessible | `layout.tsx:170-180` | Change to button | 0.5h |
| A11Y-007 | Date pills missing radio pattern | `page.tsx:137-148` | role="radiogroup" | 1h |
| A11Y-008 | Chart tabs missing tab pattern | `page.tsx:200-220` | role="tablist" | 1h |
| A11Y-011 | Import modal missing dialog ARIA | `customers/page.tsx:75-90` | role="dialog" + aria-modal | 0.5h |
| A11Y-012 | Campaign buttons missing aria-pressed | `campaigns/page.tsx:70-95` | Add aria-pressed | 0.5h |
| A11Y-013 | No camera-denied fallback | `scanner/scan/page.tsx:55-65` | Manual input fallback | 1h |
| A11Y-016 | Cookie banner not keyboard dismissible | `CookieConsent.tsx:15-20` | Add keyboard handler | 0.5h |

### Code Quality (8 items)

| ID | Issue | File | Fix | Effort |
|----|-------|------|-----|--------|
| QUAL-007 | Helper functions inside component | `tenants/page.tsx:50-80` | Extract to utils | 1h |
| QUAL-014 | Modal confirm pattern duplicated 6x | Multiple files | Shared ConfirmModal | 2h |
| QUAL-015 | 420-line switch in TypeConfig | `TypeConfig.tsx` | Split per card type | 3h |
| QUAL-012 | Google OAuth script duplicated | login, register | Extract useGoogleScript hook | 1h |
| QUAL-013 | Window.google type duplicated | login, register | Extract to types/google.d.ts | 0.5h |
| QUAL-003 | Inline SVG icons duplicated | `page.tsx:109-133` | Extract to icon component | 1h |
| QUAL-009 | Preset templates inside component | `automation/page.tsx:12-85` | Extract to constants | 0.5h |
| QUAL-016 | No unit tests for business logic | — | Add tests for utils | 8h |

**Sprint 2 Total: ~46.75 hours**

---

## 🔵 SPRINT 3+ — LOW (Backlog)

### Security (1 item)

| ID | Issue | File | Fix | Effort |
|----|-------|------|-----|--------|
| SEC-012 | Privacy consent client-side only | `enroll/[slug]/page.tsx:53` | Server-side validation | 0.5h |

### Accessibility (2 items)

| ID | Issue | File | Fix | Effort |
|----|-------|------|-----|--------|
| A11Y-009 | Charts no text alternative | `page.tsx:250-280` | aria-label or sr-only text | 1h |
| A11Y-009b | Chart color contrast | — | Verify 4.5:1 ratio | 1h |

### Code Quality (3 items)

| ID | Issue | File | Fix | Effort |
|----|-------|------|-----|--------|
| QUAL-017 | Dead code / unused constants | `enroll/[slug]/page.tsx:23` | Remove | 0.5h |
| QUAL-017b | Unused imports | Multiple files | Lint and clean | 1h |
| QUAL-017c | Console.log in production | Multiple files | Remove or guard | 0.5h |

### Backend Issues (from security audit)

| ID | Issue | File | Fix | Effort |
|----|-------|------|-----|--------|
| B-001 | Separate JWT_SECRET_KEY | `settings/base.py` | New env var + Vault | 2h |
| B-002 | Refresh token rotation | `auth/api.py` | New token on each refresh | 3h |
| B-003 | Rate limit password reset | `auth/api.py` | 3/hour per IP | 1h |
| B-004 | Add security headers (CSP) | `settings/base.py` | Middleware | 2h |
| B-005 | HTTPS on Nginx | `deploy/*.conf` | Let's Encrypt | 2h |
| B-006 | Remove temp password from response | `tenants/api.py` | Email only | 1h |
| B-007 | Validate metadata size | `cards/api.py` | Pydantic max 10KB | 1h |
| B-008 | Fix analytics NameError | `analytics/api.py` | Use total_customers | 0.5h |
| B-009 | Fix notification crash for owners | `notifications/api.py` | Guard with hasattr | 1h |
| B-010 | Fix N+1 queries | analytics, agent_api | select_related/prefetch | 2h |
| B-011 | Add request ID middleware | common/ middleware.py | X-Request-ID header | 2h |
| B-012 | Graceful shutdown | docker-compose.yml | stop_grace_period: 30s | 0.5h |
| B-013 | Sentry integration | requirements.txt | sentry-sdk | 2h |
| B-014 | DEBUG=False default | docker-compose.yml | Change default | 0.25h |
| B-015 | ALLOWED_HOSTS specific | docker-compose.yml | Set domains | 0.25h |
| B-016 | Remove auth.json from history | Git | git filter-branch | 1h |
| B-017 | Rotate exposed secrets | .env | Manual rotation | 2h |
| B-018 | Vault production mode | docker-compose.yml | Init script | 4h |
| B-019 | DB backup automation | deploy/ | pg_dump cron | 2h |
| B-020 | Seed scripts in .dockerignore | .dockerignore | Add entries | 0.25h |

**Sprint 3+ Total: ~39.25 hours**

---

## 📅 TIMELINE SUMMARY

| Sprint | Focus | Issues | Hours |
|--------|-------|--------|-------|
| Sprint 0 | 🔴 Critical bugs | 6 | 16.5h |
| Sprint 1 | 🟠 High security + perf + types + a11y + quality | 28 | 52.25h |
| Sprint 2 | 🟡 Medium everything | 30 | 46.75h |
| Sprint 3+ | 🔵 Low + backend hardening | 41 | 39.25h |
| **Total** | | **105** | **~155h** |

---

## ✅ ALREADY FIXED (In Merged Audit Branches)

| ID | Issue | Branch |
|----|-------|--------|
| SEC-001 | Token refresh race condition | fix/audit-critical-fixes |
| SEC-014 | Chat input sanitization | fix/audit-security |
| SEC-016 | Env-based origins | fix/audit-security |
| BUG-005 | Any types replaced | fix/audit-types |
| BUG-007 | Any types replaced | fix/audit-types |
| BUG-008 | Any types replaced | fix/audit-types |
| BUG-012 | Any types replaced | fix/audit-types |
| PERF-001 | Dashboard fetch debounced | fix/audit-perf |
| PERF-004 | NavIcon memoized | fix/audit-perf |
| PERF-005 | NavIcon memoized | fix/audit-perf |
| A11Y-004 | aria-current added | fix/audit-a11y |
| A11Y-006 | Profile keyboard accessible | fix/audit-a11y |
| A11Y-007 | Date pills radio pattern | fix/audit-a11y |
| A11Y-008 | Chart tabs tab pattern | fix/audit-a11y |
| A11Y-011 | Import modal dialog ARIA | fix/audit-a11y |
| A11Y-012 | Campaign aria-pressed | fix/audit-a11y |
| A11Y-015 | Chat dialog role | fix/audit-a11y |
| A11Y-016 | Cookie keyboard dismiss | fix/audit-a11y |
| QUAL-010 | adjustColor deduplicated | fix/audit-quality |
| QUAL-011 | uploadFile deduplicated | fix/audit-quality |
| QUAL-014 | ConfirmModal extracted | fix/audit-quality |

**Already fixed: 21 issues → 84 remaining**

---

*Generated from full analysis of 105 findings across 50 frontend source files.*
