# i18n Complete Audit & Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every hardcoded user-facing string in frontend and backend with proper i18n routing (`t()` / `get_message()`), filling FR/DE with English fallback.

**Architecture:** 12 parallel domain agents work on disjoint file sets. Each agent explores its domain, extracts hardcoded strings, adds keys to all 4 locale files, replaces strings, and runs tests. After all agents complete, full test suite runs.

**Tech Stack:** Next.js 14 + React 18 (frontend), Django 5 + Ninja (backend), Python 3.12

---

## Global Patterns (All Agents Must Follow)

### Frontend i18n API
```tsx
import { useI18n } from "@/lib/i18n";
const { t } = useI18n();

// Simple key
t("auth.login")

// With interpolation
t("dashboard.stats.newCustomers", { count: 5 })

// Nested key
t("customers.list.title")
```

**Locale files:** `frontend/src/lib/i18n/locales/{es,en,fr,de}.json`
- ES: Real Spanish (canonical)
- EN: Real English
- FR: English fallback (copy EN value)
- DE: English fallback (copy EN value)

### Backend i18n API
```python
from common.messages import get_message, get_message_for_request

# Simple code
get_message("AUTH_LOGIN_SUCCESS")

# With interpolation
get_message("BILLING_INVOICE_CREATED", invoice_number="INV-001")

# From request context
get_message_for_request("PORTAL_REWARD_CLAIMED", request)
```

**Message files:** `backend/common/messages/{auth,billing,campaigns,common}.py`
- Add to all 4 dicts: `_MESSAGES_ES`, `_MESSAGES_EN`, `_MESSAGES_FR`, `_MESSAGES_DE`
- FR/DE: copy EN value

### What Counts as "Hardcoded"
- Any Spanish or English string shown to users (labels, buttons, errors, success messages, placeholders, empty states, tooltips)
- **Skip:** Comments, internal logging, debug strings, HTML class names, route paths, variable names

---

## Task 1: Frontend Auth Domain

**Files to examine:**
- `frontend/src/app/(auth)/**/*.tsx`
- `frontend/src/components/auth/**/*.tsx`

**Steps:**
- [ ] **Step 1: Explore all auth files** — List every .tsx file in auth directories
- [ ] **Step 2: Identify hardcoded strings** — In each file, find every Spanish/English string literal used in JSX
- [ ] **Step 3: Add keys to locales** — For each unique string, add to `es.json`, `en.json`, `fr.json`, `de.json`
  - Example: `"auth.login.title": "Iniciar sesión"` (ES), `"Sign in"` (EN), `"Sign in"` (FR/DE)
- [ ] **Step 4: Replace strings with t()** — Change `"Iniciar sesión"` → `t("auth.login.title")`
- [ ] **Step 5: Import useI18n** — Ensure `import { useI18n } from "@/lib/i18n"` and `const { t } = useI18n()` exist in each file
- [ ] **Step 6: Run typecheck** — `cd frontend && npm run typecheck` — must pass
- [ ] **Step 7: Run build** — `cd frontend && npm run build` — must pass
- [ ] **Step 8: Commit** — `git add -A && git commit -m "i18n: frontend auth domain"`

---

## Task 2: Frontend Dashboard Domain

**Files to examine:**
- `frontend/src/app/dashboard/**/*.tsx`
- `frontend/src/components/dashboard/**/*.tsx`

**Steps:** Same pattern as Task 1.
- [ ] Steps 1-8 (explore, identify, add keys, replace, import, typecheck, build, commit)

---

## Task 3: Frontend Programs & Campaigns Domain

**Files to examine:**
- `frontend/src/app/programs/**/*.tsx`
- `frontend/src/app/campaigns/**/*.tsx`
- `frontend/src/components/programs/**/*.tsx`

**Steps:** Same pattern as Task 1.
- [ ] Steps 1-8

---

## Task 4: Frontend Customers & Locations Domain

**Files to examine:**
- `frontend/src/app/customers/**/*.tsx`
- `frontend/src/app/locations/**/*.tsx`
- `frontend/src/app/team/**/*.tsx`

**Steps:** Same pattern as Task 1.
- [ ] Steps 1-8

---

## Task 5: Frontend Billing & Settings Domain

**Files to examine:**
- `frontend/src/app/billing/**/*.tsx`
- `frontend/src/app/settings/**/*.tsx`
- `frontend/src/components/settings/**/*.tsx`

**Steps:** Same pattern as Task 1.
- [ ] Steps 1-8

---

## Task 6: Frontend Portal & Scanner Domain

**Files to examine:**
- `frontend/src/app/portal/**/*.tsx`
- `frontend/src/app/scanner/**/*.tsx`
- `frontend/src/app/enrollment/**/*.tsx`

**Steps:** Same pattern as Task 1.
- [ ] Steps 1-8

---

## Task 7: Frontend Shared Components Domain

**Files to examine:**
- `frontend/src/components/**/*.tsx` (cross-cutting: CookieConsent, ErrorBoundary, Toasts, Modals, Forms, DataTable, etc.)
- Skip components already covered by Tasks 1-6

**Steps:** Same pattern as Task 1.
- [ ] Steps 1-8

---

## Task 8: Backend Auth & Users Domain

**Files to examine:**
- `backend/apps/auth/**/*.py`
- `backend/apps/users/**/*.py`

**Steps:**
- [ ] **Step 1: Explore all auth/user files** — List every .py file
- [ ] **Step 2: Identify hardcoded strings** — Find Spanish/English strings in API responses, error messages, validation messages
- [ ] **Step 3: Add codes to messages** — Add to `backend/common/messages/auth.py` in all 4 dicts
  - Example: `"AUTH_LOGIN_SUCCESS": "Inicio de sesión exitoso"` (ES), `"Login successful"` (EN), `"Login successful"` (FR/DE)
- [ ] **Step 4: Replace strings with get_message()** — Change `"Inicio de sesión exitoso"` → `get_message("AUTH_LOGIN_SUCCESS")`
- [ ] **Step 5: Run ruff** — `cd backend && ruff check .` — must pass
- [ ] **Step 6: Run pytest** — `cd backend && pytest apps/auth apps/users -q` — must pass
- [ ] **Step 7: Commit** — `git add -A && git commit -m "i18n: backend auth & users domain"`

---

## Task 9: Backend Core APIs Domain

**Files to examine:**
- `backend/apps/customers/**/*.py`
- `backend/apps/programs/**/*.py`
- `backend/apps/campaigns/**/*.py`
- `backend/apps/locations/**/*.py`

**Steps:** Same pattern as Task 8. Add codes to relevant messages files (common.py for cross-cutting, campaigns.py for campaigns).
- [ ] Steps 1-7

---

## Task 10: Backend Billing & Payments Domain

**Files to examine:**
- `backend/apps/billing/**/*.py`

**Steps:** Same pattern as Task 8. Add codes to `backend/common/messages/billing.py`.
- [ ] Steps 1-7

---

## Task 11: Backend Portal & Webhooks Domain

**Files to examine:**
- `backend/apps/portal/**/*.py`
- `backend/apps/whatsapp/**/*.py`
- `services/whatsapp-bridge/**/*.py`

**Steps:** Same pattern as Task 8. Add codes to `backend/common/messages/common.py` (portal is cross-cutting).
- [ ] Steps 1-7

---

## Task 12: Backend Common Messages Gap Fill

**Files:**
- `backend/common/messages/auth.py`
- `backend/common/messages/billing.py`
- `backend/common/messages/campaigns.py`
- `backend/common/messages/common.py`

**Goal:** Ensure every code that exists in `_MESSAGES_ES` and `_MESSAGES_EN` also exists in `_MESSAGES_FR` and `_MESSAGES_DE`.

**Steps:**
- [ ] **Step 1: Read all message files**
- [ ] **Step 2: Find missing FR keys** — For each code in ES, check if it exists in FR dict. If not, add EN value.
- [ ] **Step 3: Find missing DE keys** — Same for DE dict.
- [ ] **Step 4: Run ruff** — `cd backend && ruff check .` — must pass
- [ ] **Step 5: Commit** — `git add -A && git commit -m "i18n: fill FR/DE backend message gaps"`

---

## Final Validation (After All Tasks Complete)

**Run all quality gates:**
- [ ] `cd backend && ruff check .`
- [ ] `cd backend && pytest -q`
- [ ] `cd frontend && npm run typecheck`
- [ ] `cd frontend && npm run test:unit`
- [ ] `cd frontend && npm run build`

**If any gate fails:**
1. Identify which domain caused the failure
2. Re-run that domain's agent to fix
3. Re-run all gates

---

## Spec Coverage Checklist

| Spec Requirement | Task |
|---|---|
| Zero hardcoded strings in frontend | Tasks 1-7 |
| Zero hardcoded strings in backend | Tasks 8-11 |
| All 4 locales contain every key | Tasks 1-12 |
| FR/DE use English fallback | Tasks 1-12 (Step 3 always adds EN to FR/DE) |
| All tests pass | Final Validation |
