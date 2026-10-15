---
title: "LOYALLIA — AI AGENT ARCHITECTURE, PLAN BINDING & ISOLATION MODEL"
document_id: "LOYALLIA-DOC-AGENT_ARCHITECTURE.MD"
version: "1.1"
status: "draft"
last_updated: "2026-10-15"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "LOYALLIA-DOC-ARCHITECTURE.MD"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-DOC-AGENT_ARCHITECTURE.MD |
| **Title** | LOYALLIA — AI Agent Architecture, Plan Binding & Isolation Model |
| **Version** | 1.1 |
| **Date** | 2026-10-15 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | draft |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011 |
| **Parent Document** | LOYALLIA-DOC-ARCHITECTURE.MD |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/02-architecture/LOYALLIA-DOC-AGENT_ARCHITECTURE.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-10-15 | Engineering Lead | Initial release. Defines agent components, trust boundaries, plan binding matrix, tenant/session isolation, Agent Zero API contract, quota enforcement, and the observed defect register. |
| 1.1 | 2026-10-15 | Engineering Lead | Remediated defects D-01…D-12 with live production evidence (§11); added derived-key sync mechanism and non-destructive Vault bootstrap (§5); documented `put_secret` PATCH-403 fallback for update-without-patch policies; resolved §6.1 verification columns to implemented code; corrected §9 Vault healthcheck wording (uninitcode must remain 200 to avoid first-boot deadlock); registered new defects D-15/D-16; added resilience evidence (§9, §11). |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Plan/feature matrix validation |
| Security Officer | Reviewer | Tenant isolation and secret handling validation |
| QA Lead | Reviewer | Requirement traceability and test coverage validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-DOC-ARCHITECTURE.MD | Loyallia Architecture, Sequence & Flowchart Diagrams | Parent |
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Reference |
| LOYALLIA-DOC-BE-AGENT-API-001 | Agent API (backend/apps/agent_api/README.md) | Subject |
| LOYALLIA-DOC-BE-AI-001 | AI App (backend/apps/ai/README.md) | Subject |
| LOYALLIA-DOC-SRS-007-AI-INTEGRATION | Wallet Studio AI Integration SRS | Predecessor |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-10-15 | Submitted |
| Product Owner | — | — | — | Pending Review |
| Security Officer | — | — | — | Pending Review |
| QA Lead | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-10-15 | Engineering Lead | Initial architecture drafted from code and Agent Zero source evidence |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |

---

# LOYALLIA — AI Agent Architecture, Plan Binding & Isolation Model

## 1. Purpose & Scope

This document defines how AI agent capability is architected inside Loyallia:

- the components, networks and trust boundaries involved;
- how agent capability is **bound to the tenant's subscription plan and platform settings**;
- how agent usage is **rate-limited by plan quota**;
- how **tenant and session isolation** is enforced so no data leaks between tenants or sessions;
- the exact **Agent Zero API contract** used for execution;
- the observed defects that must be remediated.

Out of scope: LLM prompt content, wallet-studio visual design prompts (see `LOYALLIA-DOC-SRS-007`), and infrastructure provisioning.

## 2. Components & Trust Boundaries

| # | Component | Location | Trust zone | Responsibility |
|---|-----------|----------|-----------|----------------|
| C1 | Dashboard chatbot | `frontend/src/components/chat/Chatbot.tsx` | Untrusted (browser) | Builds screen context, PII-masks, renders answer. **Never trusted for identity.** |
| C2 | Next.js chat proxy | `frontend/src/app/api/chat/route.ts` | Edge | Rate limit per IP, sanitisation, size cap, forwards `Authorization` |
| C3 | Django AI chat endpoint | `backend/apps/tenants/api.py` → `/api/v1/tenants/me/ai-chat/` | Trusted | Authorisation, **plan enforcement**, session binding, quota recording |
| C4 | AI proxy service | `backend/apps/tenants/services/ai_proxy.py` | Trusted | Vault secret injection, agent transport, error normalisation |
| C5 | Agent Zero runtime | container `loyallia-agent` (`agent0ai/agent-zero`), internal **:80** | Isolated network | Profile execution, tools, knowledge, memory |
| C6 | HashiCorp Vault | container `loyallia-vault` | Secrets authority | `ai_agent_api_key`, `ai_agent_base_url` |
| C7 | Plan enforcement | `backend/common/plan_enforcement.py` | Trusted | Feature gates + quota limits |
| C8 | Agent data API | `backend/apps/agent_api/` (5 read-only GETs) | Trusted, API-key gated | Tenant-scoped read surface for agents |

**Network boundary:** C3/C4 sit on `loyallia_backend-net`. C5 is attached to `loyallia_backend-net` with alias `ai-agent` (implemented — verified live 2026-10-15: `loyallia-api` resolved `http://ai-agent` and reached `POST /api/api_message` → `200`). No public egress path to C5 exists except the explicitly configured loopback UI port (`127.0.0.1:34200`).

## 3. Request Sequence

```
Browser (C1)
  │  POST /api/chat  {message, context_id}   [Content-Type + Authorization JWT]
  ▼
Next.js (C2) ── rate limit 30/min, strip control chars, ≤2000 chars
  │  POST /api/v1/tenants/me/ai-chat/  (Authorization forwarded)
  ▼
Django (C3)
  │  1. jwt_auth + MANAGER+                → 401/403
  │  2. check_feature_access(ai_assistant) → 402/403
  │  3. check_plan_limit(ai_queries_month, write=True) → 402/403   ← implemented
  │  4. bind context_id → tenant session (AIChatSession)            ← implemented
  │  5. select agent_profile from plan + settings                   ← implemented
  │  6. server-side PII re-mask                                      ← implemented
  ▼
AI proxy (C4) ── reads Vault ai_agent_api_key / ai_agent_base_url
  │  POST {ai_agent_base_url}/api/api_message
  │       X-API-KEY: <vault ai_agent_api_key>
  │       {context_id, message, lifetime_hours, agent_profile}
  ▼
Agent Zero (C5) ── validates X-API-KEY against settings.mcp_server_token
  │  executes profile, tenant-namespaced context
  ▼
Django (C3)
  │  7. persist AIQueryLog(endpoint=chat, tenant) → counts toward quota   ← implemented
  ▼
response {response, context_id}
```

## 4. Plan Binding Matrix (agent depends on plan)

Authoritative source: `backend/apps/billing/fixtures/subscription_plans.json`.

| Plan | `ai_assistant` | `agent_api` | `ai_queries_month` | `api_calls_day` | Agent profile | Net capability |
|------|----------------|-------------|--------------------|-----------------|---------------|----------------|
| Trial | ✅ | ✅ | 999999 | 999999 | `loyallia-help` | Chat assistant |
| Starter | ❌ | ❌ | **0** | **0** | — (denied) | No agent access |
| Professional | ❌ | ❌ | 500 | 100 | — (denied by flag) | **Conflict — see §4.1** |
| Enterprise | ✅ | ✅ | 2000 | 500 | `loyallia-help`, `loyallia-campaigns`, `loyallia-analytics`, `loyallia-onboarding` | Full catalogue |

### 4.1 Open conflict (requires Product Owner decision)

`Professional` allocates a **500/month AI quota and 100/day API quota** yet **does not carry the `ai_assistant` feature flag**. Because `ai_chat_proxy` gates on `check_feature_access(tenant, "ai_assistant")`, Professional tenants are denied at the feature gate while holding an unused quota.

Two coherent resolutions (do **not** change silently — pricing decision):

- **Option A:** add `ai_assistant` to Professional features → quota becomes reachable (recommended if Professional was meant to include AI).
- **Option B:** set Professional `max_ai_queries_month = 0` and `max_api_calls_day = 0` → intent becomes "no AI on Professional", consistent with Starter.

Status: **Pending Product Owner decision.** Until decided, code preserves current behaviour (feature gate wins) so no entitlement changes without approval.

### 4.2 Enforcement rules

| Rule | Statement | Enforcement point |
|------|-----------|-------------------|
| R-PLAN-01 | No agent call without the `ai_assistant` feature | `check_feature_access()` before transport |
| R-PLAN-02 | No agent call beyond `ai_queries_month` | `check_plan_limit(..., "ai_queries_month", write=True)` before transport |
| R-PLAN-03 | Every successful agent call increments `AIQueryLog` for its tenant | `AIQueryLog.objects.create(tenant=..., endpoint=chat)` after transport |
| R-PLAN-04 | `max_ai_queries_month <= 0` means feature unavailable | `check_plan_limit()` raises 403 when `limit <= 0` |
| R-PLAN-05 | Platform settings may only **tighten**, never widen, plan limits | Settings precedence §5 |

## 5. Settings & Configuration Precedence

Resolution order (highest wins):

1. **Vault secrets** — `ai_agent_api_key`, `ai_agent_base_url` (C6). Secret material never in `.env`, code, or Git.
2. **`PlatformSetting`** runtime overrides — SUPER_ADMIN only, audited, allowlisted.
3. **Django settings** (`AI_AGENT_BASE_URL` fallback) — safe defaults only.
4. **Compiled defaults** in code.

Hard constraints (AGENTS.md absolute rules):

- `ai_agent_base_url` MUST be an internal DNS name on `loyallia_backend-net` (no public URL unless explicitly designed and approved).
- Model identifiers are settings, never hardcoded literals.
- Agent Zero `settings.mcp_server_token` MUST equal Vault `ai_agent_api_key`; provisioning reads Vault, values are never hand-typed or logged.

**Key synchronisation (implemented):** Agent Zero's `mcp_server_token` is *derived*, not stored — `urlsafe_b64(sha256(runtime_id:auth_login:auth_password))[:16]`, regenerated on every settings normalisation and never persisted into `settings.json`. The only correct sync direction is therefore **agent → Vault**: `deploy/scripts/sync_agent_config.sh` reads the derived token through the agent's own interpreter, writes it to Vault `ai_agent_api_key` via `common.vault.put_secret` (allowlisted key, idempotent compare-before-write, stdin-only transport, api/celery restart on change). Vault `ai_agent_base_url` changes only through the audited SUPER_ADMIN integrations endpoint (`PUT /api/v1/admin/platform/integrations/ai_agent/secret/`), which allowlists the key and validates `http(s)://host[:port]` format.

**Write-path fallback (implemented):** the `loyallia-app` Vault policy grants `["read","create","update"]` but not `patch`. `put_secret` therefore treats a PATCH `403` (alongside 404/405/415) as "patch unsupported" and falls back to read-merge-write POST using the `update` capability; a genuine lack of write permission still fails closed and returns `False`. Covered by `backend/tests/test_vault_put_secret.py`.

**Bootstrap safety (implemented):** `deploy/vault/init.sh` seeds non-destructively — when the secret document already exists it patches only *missing* keys instead of replacing the document, so operator/Sys Admin configuration survives a Vault container recreation (host reboot, `compose up`). Proven live: a full `vault-init` re-run preserved `ai_agent_base_url` and `ai_agent_api_key` unchanged (2026-10-15, §11).

## 6. Tenant & Session Isolation Model

### 6.1 Requirements

| ID | Requirement | Verification |
|----|-------------|--------------|
| R-ISO-01 | Every agent data read filters by `tenant_id` | Existing: `agent_api/api.py` uses `require_tenant()` on all 5 routes |
| R-ISO-02 | `context_id` is **server-issued** and bound to exactly one tenant | Implemented: `AIChatSession` model (migration `ai.0004`, applied), unique `context_id`, tenant FK |
| R-ISO-03 | A client-supplied `context_id` MUST NOT disclose or grant access to contexts outside the caller's tenant | Implemented: `AIChatSession.resolve_for_tenant()` filters `context_id + tenant + expires_at > now`; missing/foreign/expired → `None` → transparent fresh session (no existence disclosure, no cross-tenant content) |
| R-ISO-04 | Tenant identity MUST accompany every agent transport call | Implemented: `X-Tenant-ID` / `X-User-ID` headers (opaque IDs only) + body `context_id` in `ai_proxy` |
| R-ISO-05 | Agent-side knowledge, memory and chat history MUST be namespaced per tenant | Per-tenant directories under `knowledge/`, `memory/`, `chats/` |
| R-ISO-06 | Profile selection MUST be server-derived; client cannot choose a profile | Implemented: `agent_profile` from bound session or platform setting `ai_agent_profile`; never read from the request body |
| R-ISO-07 | PII is masked **server-side** before egress; client masking is advisory only | Implemented: `ai_proxy` re-masks `message` before transport (C4), independent of C1 |
| R-ISO-08 | Secrets are never logged, printed, or returned | Implemented: log `key_prefix` only — never token bytes (`agent_api/auth.py`) |

### 6.2 Session lifecycle

`context_id` lifetime is Agent Zero's `lifetime_hours` (default 24h, must be > 0). Implemented: `AIChatSession.bind()` stores `expires_at = now + lifetime_hours`, and `resolve_for_tenant()` only accepts contexts with `expires_at > now` — an expired `context_id` transparently starts a new conversation instead of being reused.

## 7. Agent Zero Execution Contract

Derived from Agent Zero source (`api/api_message.py`, `helpers/api.py`):

| Aspect | Value |
|--------|-------|
| Route | `POST /api/api_message` (`helpers/api.py:277` mounts `/api/<path:path>`) |
| Method | `POST` (`ApiHandler.get_methods()` default, `helpers/api.py:51`) |
| Web auth | Not required (`requires_auth() = False`) |
| CSRF | Not required (`requires_csrf() = False`) |
| API key | **Required** (`requires_api_key() = True`); compared to `settings["mcp_server_token"]` via header **`X-API-KEY`**, else body `api_key`; missing → `401 API key required`, wrong → `401 Invalid API key` (`helpers/api.py:144-157`) |
| Payload | `context_id`, `message`, `attachments[]`, `lifetime_hours` (default 24, `> 0` required), `project_name`, `agent_profile` |
| Profile override | `agent_profile` sets `override_settings["agent_profile"]`; if the context exists with a different profile, the request is rejected |
| Profile resolution | `agents/<name>/agent.yaml` + `prompts/agent.system.main.*` |
| Chat API | WebSocket `/ws` for interactive sessions; REST for programmatic use |
| Persistence | `usr/chats/ctx-<context_id>/` (workdir, screenshots, files) |

### 7.1 Profile catalogue (Loyallia)

| Profile | Purpose | Plan tier |
|---------|---------|-----------|
| `loyallia` | Platform expert (architecture, APIs, schema) | Internal / Enterprise |
| `loyallia-developer` | Code, tests, deployment | Internal only |
| `loyallia-help` | Dashboard assistant, screen context | Trial, Enterprise |
| `loyallia-support` | First-line customer support | Trial, Enterprise |
| `loyallia-campaigns` | Objectives, audience, copy, channels | Enterprise |
| `loyallia-analytics` | Metrics explanation, anomalies | Enterprise |
| `loyallia-onboarding` | Product tour, public campaigns | Enterprise |
| `loyallia-builder` | Wallet/program creation wizard guidance | Enterprise |

Profiles are selected server-side per §6.1 R-ISO-06 using the §4 matrix and `PlatformSetting` overrides.

## 8. Defect Register (evidence-based current state)

Status values: **Fixed** (remediated + verified, see §11), **Partial** (applied in config, container pending), **Open**.

| ID | Defect | Evidence (at detection) | Severity | Status |
|----|--------|--------------------------|----------|--------|
| D-01 | Agent `mcp_server_token` is empty → every call `401` | `settings.json` `mcp_server_token` len 0 | Critical | **Fixed** — token is derived (`sha256` runtime tuple, never persisted); `sync_agent_config.sh` publishes it to Vault `ai_agent_api_key`; live call with Vault key → 200 |
| D-02 | Transport URL omits `/api/` prefix → `404` | `ai_proxy.py:84` vs `helpers/api.py:277` | Critical | **Fixed** — `AGENTS_API_PATH = "/api/api_message"`; live → 200 |
| D-03 | `ai_agent_base_url = http://ai-agent:8000` does not resolve; agent is on port 80 | DNS probe failed; compose maps `34200:80` | Critical | **Fixed** — set to `http://ai-agent` via audited SUPER_ADMIN integrations PUT (→ 200); survives vault-init re-runs (§5 bootstrap safety) |
| D-04 | `context_id` never validated against tenant | grep: only schema + forwarding | Critical | **Fixed** — `AIChatSession.resolve_for_tenant()` tenant+expiry binding (migration `ai.0004` applied) |
| D-05 | No tenant identity sent to agent | `ai_proxy.py:70-79` | High | **Fixed** — `X-Tenant-ID` / `X-User-ID` opaque headers in `ai_proxy` |
| D-06 | `ai_queries_month` quota not enforced on chat path | `tenants/api.py` uses `check_plan_limit` only for `locations`, `users` | High | **Fixed** — `check_plan_limit(tenant, "ai_queries_month", write=True)` before transport |
| D-07 | No `AIQueryLog` written for chat → usage never counted | `AIQueryLog` written only by `cost_tracker` / design endpoints | High | **Fixed** — `AIQueryLog(endpoint=Endpoint.CHAT)` persisted per call |
| D-08 | `AIQueryLog.Endpoint` has no `chat` choice | `apps/ai/models.py:33-39` | Medium | **Fixed** — migration `ai.0004` adds `chat` endpoint + `AIChatSession` |
| D-09 | nginx routes `/api/` to Django, so Next.js `/api/chat` returns 404 | `rewards.loyallia.com.conf:99,116`; live `404 API endpoint not found: chat` | Critical | **Fixed** — exact-match locations for `/api/chat` **and** `/api/chat/` (required by `trailingSlash: true` 308); live `POST /api/chat/` → 200 |
| D-10 | Chatbot omits `Authorization` header → `401` | `Chatbot.tsx:262` | Critical | **Fixed** — JWT cookie Bearer header (same pattern as axios client); verified in deployed bundle (chunk containing `/api/chat` + `Bearer …access_token`) |
| D-11 | PII masking client-side only | `Chatbot.tsx` masker; no server equivalent | Medium | **Fixed** — server-side re-mask in C4 (`ai_proxy`) before egress |
| D-12 | `token[:12]` logged instead of `key_prefix` | `agent_api/auth.py:37` | Medium | **Fixed** — `key_prefix` only |
| D-13 | Vault healthcheck treats sealed as healthy | `docker-compose.yml` `sealedcode=200` | High | **Partial** — `sealedcode=200` removed in compose (`uninitcode=200` deliberately kept: `vault-init` depends on vault health, removing it deadlocks first-time bootstrap). Applies to the Vault container on next recreation — deferred pending Security Officer boot-unseal decision (§9); Alertmanager rule still pending |
| D-14 | Professional feature/quota conflict | §4.1 | Medium | **Open** — pending Product Owner decision |
| D-15 | `put_secret` fails with `403` on policies granting `update` but not `patch` → Sys Admin integrations endpoint broken in production | Vault PATCH → `403 Forbidden`; fallback codes were `(404, 405, 415)` only | Critical | **Fixed** — 403 joins the merge-write fallback (fails closed if write truly denied); `backend/tests/test_vault_put_secret.py` (4 tests); live integrations PUT → 200 |
| D-16 | `vault-init` re-seed replaced the whole secret document → operator Vault configuration silently reverted to bootstrap defaults on every Vault container recreation | After container recreation: `ai_agent_base_url` back to `http://ai-agent:8000`, `ai_agent_api_key` back to 43-char default | Critical | **Fixed** — `seed_secrets()` now patches only missing keys when the document exists; proven by full vault-init re-run preserving both operator values (exit 0, §11) |

## 9. Operational Resilience

| Control | Requirement | Status (2026-10-15) |
|---------|-------------|----------------------|
| Vault seal visibility | Healthcheck MUST report an initialized-but-**sealed** vault as unhealthy (`sealedcode=200` removed) so Alertmanager can see a sealed runtime. `uninitcode=200` MUST be **kept**: `vault-init` depends on `condition: service_healthy`, so removing it deadlocks first-time bootstrap. Plus Alertmanager rule | **Partial** — compose updated; applies to the Vault container on next recreation (recreating a manually-unsealed Vault requires the key shares — deferred with the boot-unseal decision); Alertmanager rule pending |
| Boot recovery | Vault MUST be unsealed after host reboot via approved mechanism (systemd oneshot with root-only `0600` key material, or KMS auto-unseal) — **pending Security Officer decision** | **Open** — manual unseal via `vault-init` key material (exercised during 2026-10-15 incident recovery) |
| Startup ordering | `api` MUST depend on `vault: condition: service_healthy` in addition to postgres/redis/pgbouncer/vault-init | **Done** — applied and exercised live: after Vault was recreated sealed, `up -d api` held until unseal + health, then started (`api: healthy`, health 200) |
| Healthchecks | Required on every `loyallia-*` container | **Partial** — `loyallia-agent` added (healthy), `loyallia-grafana` and `loyallia-prometheus` added with healthchecks; `loyallia-searxng` still missing |
| Failure mode | If the agent is unreachable, return a normalised 503 via `get_message("AI_ASSISTANT_UNAVAILABLE")`; never fabricate an answer | **Verified live** — observed during the Vault-recreation window (edge and direct both → 503 with that exact message), recovered to 200 after config re-apply |
| Config-change propagation | Agent config changes via Sys Admin must reach all api workers within the Vault secret cache TTL (5 min) without restart | **Verified** — PUT propagated (acting worker immediate; others within TTL), no process restarts required for correctness |
| Bootstrap idempotency | Re-running `vault-init` MUST NOT revert operator configuration | **Done** — non-destructive seeding (§5, D-16); re-run preserved both agent values, exit 0 |

## 10. Acceptance Criteria

1. Two tenants presenting the same `context_id` → each resolves only its own binding; a context outside the caller's tenant is never disclosed or returned (transparent fresh session, no cross-tenant content).
2. Exceeding `ai_queries_month` → 403 `PLAN_LIMIT_EXCEEDED`; quota counter increments per call.
3. Professional behaviour matches the approved §4.1 decision.
4. `POST /api/api_message` with correct key → 200; with no key → 401; with wrong key → 401.
5. Agent-side memory/knowledge/chats are separated per tenant.
6. E2E chat test passes in production with `--workers=1`.

## 11. Live Production Evidence (2026-10-15)

All results from real HTTP calls against `https://rewards.loyallia.com` and the internal agent — no mocks. Credentials used: sanctioned `frontend/.auth/e2e-credentials.json` (E2E Production Tenant, Enterprise plan, active subscription) — never printed.

| # | Check | Result |
|---|-------|--------|
| 1 | `POST /api/api_message` without key / with wrong key (from `loyallia-api`) | **401** `API key required` / **401** `Invalid API key` |
| 2 | `POST http://ai-agent/api/api_message` with Vault key | **200** `{"context_id":"fM8LgvRI","response":"OK"}` |
| 3 | `POST /api/v1/auth/login/` (e2e-superadmin) | **200**, role `SUPER_ADMIN` |
| 4 | `PUT /api/v1/admin/platform/integrations/ai_agent/secret/` → `ai_agent_base_url = http://ai-agent` | **200** (exercises fixed `put_secret` fallback, D-15) |
| 5 | `GET /api/v1/admin/platform/integrations/` readback | **200**, `ai_agent: enabled=true, configured=true, base_url=http://ai-agent` |
| 6 | `POST /api/v1/tenants/me/ai-chat/` as OWNER (Enterprise tenant) | **200** `{"response":"OK","context_id":"…"}` |
| 7 | `POST /api/chat/` full edge chain (nginx exact-match → Next route → Django → agent) | **200** with real conversational replies |
| 8 | Same chat as SUPER_ADMIN (no tenant) | **402** plan gate — enforcement working |
| 9 | Agent unreachable window (Vault recreation) | **503** `AI_ASSISTANT_UNAVAILABLE` — normalised failure, no fabricated answer |
| 10 | `vault-init` full re-run after operator config changes | exit **0**; `ai_agent_base_url` and `ai_agent_api_key` unchanged (D-16 regression proof) |
| 11 | Backend quality gates | ruff **0 errors**; pytest **983 passed / 0 failed / 4 skipped** |
| 12 | Frontend quality gates | typecheck **0 errors**; vitest **798 passed**; `npm run build` **exit 0** |
| 13 | Deployed web bundle contains Chatbot `Authorization` header | verified in `loyallia-web` static chunk (`/api/chat` + `Bearer …access_token`) |
| 14 | All `loyallia-*` containers | **healthy** (23 healthy incl. monitoring stack), `/` → 200, `/api/v1/health/` → 200 |
