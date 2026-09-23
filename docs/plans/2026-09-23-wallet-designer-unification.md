---
title: "Wallet Designer Unification — Architectural Plan & Rapid Development Roadmap"
document_id: "LOYALLIA-PLAN-WALLET-UNIFY-001"
version: "1.1"
status: "approved"
last_updated: "2026-09-23"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or quarterly (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "LOYALLIA-SRS-WPS-012"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-PLAN-WALLET-UNIFY-001 |
| **Title** | Wallet Designer Unification — Architectural Plan & Rapid Development Roadmap |
| **Version** | 1.1 |
| **Date** | 2026-09-23 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or quarterly (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011 |
| **Parent Document** | LOYALLIA-SRS-WPS-012 |
| **Supersedes** | LOYALLIA-PLAN-DESIGNER-FIX-002 |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/plans/2026-09-23-wallet-designer-unification.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-23 | Engineering Lead | Initial release. Full code-level audit evidence, 6 root causes, target architecture, explicit deletion register, and P0–P7 TDD rapid-development plan. Supersedes LOYALLIA-PLAN-DESIGNER-FIX-002 (icon-only scope). |
| 1.1 | 2026-09-23 | Engineering Lead | P0 execution findings applied. (a) **P0-1 scope expansion:** the i18n regression is 947 of 2,520 English strings with `value === key`, not a single key — spans 15 namespaces (superadmin 398, campaigns 104, customers 60, programs 57, wallet 57, …) plus 799 EN-only / 45 ES-only key drift. (b) **P0-2 closed as no-op:** `field-validation.test.ts` already asserts message keys and passes 29/29. (c) **P0-3 decision — KEEP** the one-line `docker-compose.yml` mount of `frontend/vitest.config.ts`; it is P6 test-gate infrastructure, not scope creep. (d) **P0-4 decision — DELETE D-13 now, KEEP `crop`** (`ImageCropEditor` is real UI); D-12 deferred to P5 where crop is made real. (e) **P0-5:** `AIChatModal.tsx` called `t()` without `useI18n` — 3 × `TS2304`, blocking `tsc`. |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation and release authority |
| Security Officer | Reviewer | Pass signing, auth-token, and secrets validation |
| QA Lead | Reviewer | Test-gate and E2E coverage validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-SRS-WPS-012 | Wallet Platform Design Specifications — Apple Wallet & Google Wallet | Parent / authoritative platform spec |
| LOYALLIA-DOC-WALLET-DESIGNER-INVENTORY-001 | Wallet Designer — Complete Feature Inventory & Audit | Baseline inventory |
| LOYALLIA-PLAN-DESIGNER-FIX-002 | Wallet Designer UI/UX Full Audit + Fix Plan | Superseded (narrower scope) |
| LOYALLIA-PLAN-HARDENING-001 | System Hardening Plan | Adjacent (transaction atomicity, icon preview) |
| LOYALLIA-SRS-002-Architecture-001 | Wallet Studio — Architecture & State Management | Target-state reference |
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Binding documentation + coding standard |
| LOYALLIA-DOC-00-INDEX.MD | Loyallia Documentation Index | Register |

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
| Engineering Lead | — | — | 2026-09-23 | Approved |
| Product Owner | — | — | 2026-09-23 | Approved |
| Security Officer | — | — | — | Pending Review |
| QA Lead | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-23 | Engineering Lead | Authored from code-level audit of the Wallet Designer |
| Reviewed | 2026-09-23 | Engineering Lead | Evidence re-verified against source with file:line references |
| Approved | 2026-09-23 | Product Owner | Approved for autonomous execution |
| Revised | 2026-09-23 | Engineering Lead | v1.1 — P0 findings applied (i18n scope expanded to 947 strings; P0-2 closed no-op; P0-3 KEEP; D-12 deferred to P5; D-13 deleted) |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Phase P6 test-gate sign-off | — | Re-review when artifact-level gate is green |
| Annual review | 2027-09-23 | Annual ISO document-control review |
| Major release | — | Triggered by major platform release |

---

# Wallet Designer Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Collapse the Wallet Designer to one schema, one state store, one mapper, one set of form primitives, one truthful preview, and one artifact-level test gate — then delete every duplicate, dead, and divergent path so only perfect single working code remains.

**Architecture:** A single schema module (`types/pass-schema.ts`) owns types, limits, token dictionaries, defaults, and validation. A single state store (`useWalletStudio`) owns durable design state plus a proper undo history — the parallel `useUndoRedo` store is deleted. One export pipeline (`services/passes/`) is the only code that builds Apple `pass.json` and Google `save` JWT payloads, and the frontend preview renders from that same pipeline's output. Every card-type form is generated from the `CardTypeConfig` discriminated union using a shared primitive kit. A golden-file + PKCS#7 verification suite blocks any export that does not produce a valid `.pkpass` and a valid Google JWT.

**Tech Stack:** Next.js 14 / React 18 / TypeScript, Django + django-ninja, Vitest, Playwright, `qrcode.react` (already a dependency), `jsbarcode` (1D barcodes), `node-forge` or `openssl` for PKCS#7 verification in tests.

---

## 1. Executive Summary

The Wallet Designer currently contains **four divergent implementations** of the same pass-mapping logic, **two competing state stores**, **three disagreeing token dictionaries**, and **zero artifact-level tests**. The result is that the on-screen preview actively lies about what ships, user edits are silently dropped, and an invalid pass (`pass.json: null`) reached production.

This plan makes a hard cut: **unify, merge, delete the old, leave one perfect path.** Nothing here is speculative — every defect below is cited with `file:line` from source that was read directly, not from documentation.

**Six root causes** (Section 2) → **one target architecture** (Section 3) → **explicit deletion register** (Section 4) → **P0–P7 TDD plan** (Section 5) → **definition of 100%** (Section 6).

---

## 2. Code-Verified Evidence — The Six Root Causes

All references are to source read in full or in the cited span. Two security claims that earlier agent reports asserted were **retracted as false** after source verification; see §2.7.

### RC-1 — Dual state store → active user data loss

Two stores hold the same state and fight.

| Evidence | Location |
|---|---|
| `useWalletStudio` (useState + immutable spreads) | `frontend/src/hooks/useWalletStudio.ts` |
| `useUndoRedo` (JSON.stringify snapshot history) | `frontend/src/hooks/useUndoRedo.ts` |
| Wiring: `studio = useWalletStudio()` then `useUndoRedo(studio.state)` | `frontend/src/components/wallet/studio/WalletStudio.tsx:50-60` |
| `displayState = undoableState` overrides studio state for render | `WalletStudio.tsx` |
| Sync effect clobbers: `if (studio.state !== prev) setUndoableState(studio.state)` | `WalletStudio.tsx` `useEffect` |
| Field ops write to the **stale** store: `duplicateField`, `deleteField`, `nudgeField` call `studio.setState`, not `setUndoableState` | `useWalletStudio.ts:261-323` |
| Undo index drift: dedupe path returns `prevHistory` unchanged but `setCurrentIndex(prev + 1)` **always runs** | `useUndoRedo.ts:55-114` |
| `nudgeField` treats `left`/`right` as no-ops: `if (direction !== 'up' && direction !== 'down') return;` | `useWalletStudio.ts:300` |

**Consequence:** undo/redo desyncs from state; field move/delete/duplicate can be lost or resurrected; horizontal nudge silently does nothing.

### RC-2 — Frontend↔backend schema drift → the preview lies about what ships

Four independent implementations of "design state → pass artifact":

1. `frontend/src/components/wallet/utils/field-mappers.ts` (`buildApplePass` / `buildGooglePass`)
2. `backend/apps/customers/pass_engine/apple_v2_builders.py`
3. `backend/apps/customers/pass_engine/builders/base.py`
4. The preview components themselves (`AppleWalletPreview.tsx`, `GoogleWalletPreview.tsx`)

Divergences confirmed in source:

| # | Frontend (`field-mappers.ts`) | Backend / Reality |
|---|---|---|
| 1 | `fieldPath: \`class.${field.fieldGroup}[${position}]\`` (`:130`) | Invented. Google uses `points`/`balance`/explicit `fieldPath` refs, not indexed arrays |
| 2 | Same invent in `builders/base.py:418` | `f"class.{group_name}[{len(items)}]"` — both wrong |
| 3 | `passTypeIdentifier: 'pass.com.loyallia.wallet'` (`:236`), `teamIdentifier: 'LOYALLIA'` (`:240`) | Placeholders — never real WWDR credentials |
| 4 | Only legacy `barcode` emitted (`:250-255`) | Apple requires `barcodes[]`; `barcode` is deprecated |
| 5 | `id` and `classId` set to the **same** value (`:301-302`) | Google requires they differ |
| 6 | `hexForegroundColor`, `hexLabelColor`, `rows` (`:307-313`) | Not real Google API fields — invented |
| 7 | `threeItems` overfill with **no cap** (`:181-198`) | `builders/base.py:421` caps at 3 — backend correct, frontend wrong |
| 8 | `currencyCode = 'USD'` hardcoded (`:113-116`) | Must come from tenant locale |
| 9 | Token dict: `gift_balance`, `perks`, `first_name`, `last_name`, `email` | `apple_v2_builders.py:50-94`: `gift_amount`, `remaining_uses`, `tier_name`, `customer_email` |
| 10 | `_order` never written by `_map_v2_field_to_apple` (`:109-151`) | `:198` sorts on `f.get("_order", 0)` → studio `order` silently lost |
| 11 | `getAppleChangeMessage` returns `undefined` for legacy string configs (`:34-38`) | Silently drops change messages |
| 12 | `_normalize_review_status` maps to `"approved"`/`"rejected"` (`builders/base.py:445-458`) | Wrong Google enum values |
| 13 | `CARD_TYPE_METADATA[*].maxAuxiliaryFields: 4` vs `FIELD_GROUP_METADATA.auxiliary.maxFields: 5` | `constants.ts` — two sources of truth for the same limit |
| 14 | `AZTEC: { googleSupported: false }` (`constants.ts`) | Wrong — Google supports Aztec |
| 15 | `googleRowType: 'row2'/'row3'/'row4'` (`constants.ts`) | Invented Google concept |

### RC-3 — No artifact-level test gate → invalid passes ship

| Evidence | Location |
|---|---|
| Export is a bare `api.post('/api/v1/wallet/preview/', payload)` | `frontend/src/components/wallet/services/export.ts` (57 lines, full) |
| Zero validation gate before the network call | `export.ts` |
| `validateField` / `validateFields` exist and are correct | `frontend/src/components/wallet/utils/field-validation.ts` |
| Neither is called from any application code | verified by search — only the test file references them |
| No E2E test ever unzips a `.pkpass` and asserts on `pass.json` | `frontend/test-results/` and Playwright suite contain designer smoke tests only |
| `pass.json: null` reached production | recorded incident; root cause is RC-3 + RC-2 |

### RC-4 — Copy-paste over primitives → the same bug exists many times

| Evidence | Location |
|---|---|
| 10 near-identical `BackContent` factory functions | `frontend/src/components/wallet/types/back-content.ts` |
| Number-clear bug (clearing a numeric field writes `0` or NaN instead of unset) present in 9 files | confirmed in Editing Panels audit |
| `studio/LockedFeature.tsx` and `studio/LimitReached.tsx` are forks of the same component | `frontend/src/components/wallet/studio/` |
| Hardcoded Spanish UI strings (`'Tarjeta de Sellos'`, `'Primario'`, `'Secundario'`, `'Auxiliar'`, `'Reverso'`) | `constants.ts` — bypasses the i18n system that `en.json`/`es.json` already provide |
| Stamp icons written to **both** `images.icon`/`icon2x` **and** `cardTypeConfig.stampIcon` | `ImagesTab.tsx:442-448` — dual source of truth |
| Duplicate DOM id `push-icon-upload` emitted in both `stampImages` and `couponImages` arrays | `ImagesTab.tsx` — invalid HTML |
| Fake `@2x`/`@3x`: `onUpdateImages({ logo: asset, logo2x: asset, logo3x: asset })` | `ImagesTab.tsx:393-398` — same object aliased three times |

### RC-5 — Validation exists but is unwired

See RC-3. The validators are unit-tested and correct; nothing calls them. `field-validation.test.ts` currently asserts on message keys rather than messages (pending WIP change) and must be reconciled.

### RC-6 — No shared pass schema → three token dictionaries, divergent defaults, invented fields

| Evidence | Location |
|---|---|
| Three `{token}` dictionaries that disagree | frontend preview / `apple_v2_builders.py:50-94` / Google resolver |
| `transitStyle` in `PassStyle` | `frontend/src/components/wallet/types/unified-state.ts:119` — **not a real Apple PassKit style** |
| `ImageAsset.crop` comment says *"Non-destructive crop/transform applied in previews and export"* | `unified-state.ts:128-135` — **the comment is false**; crop is stored and never applied |
| `reviewStatus: 'UNDER_REVIEW' \| 'approved' \| 'rejected'` | `unified-state.ts:189` — inconsistent casing vs Google API |
| View state `ui` (`zoom`, `showGrid`, `activeTab`) lives inside durable `WalletPassStudioState` | `unified-state.ts:245-253` |
| `createDefaultState()` runs every render | `useWalletStudio.ts:120` |
| `{ ...defaultState, ...initialState }` clobbers defaults with `undefined` own-keys | `useWalletStudio.ts:121-123` |
| `parseV2` writes `apple: (...) \|\| undefined` — an `undefined` own-key | `frontend/src/components/wallet/serialization.ts:50-52` |
| `ui: state.ui` persisted into durable metadata | `serialization.ts:79` |
| `version: 2` written but never read on parse; V1 silently dropped | `serialization.ts` |
| `id: 'pass-' + Date.now()` | `useWalletStudio.ts:57` — collision-prone |
| `updateCardTypeConfig` forges the discriminated union: `{ ...prev.cardTypeConfig, ...config } as CardTypeConfig` | `useWalletStudio.ts:171-176` |
| `applyTemplate` is dead code — never called from UI | `useWalletStudio.ts:229-257` |
| `isModified` deep-equals the whole state **including** `ui.zoom`/`showGrid`/`activeTab` | `useWalletStudio.ts:330` |
| `BarcodeSvg` is decorative hardcoded SVG geometry (fixed 24-element bar-width array, fake QR finder squares) | `frontend/src/components/wallet/BarcodeRenderer.tsx` |
| `qrcode.react` is already a dependency used in `portal/page.tsx`, `pass/[id]/page.tsx`, `EnrollmentHero.tsx` — **but not in the previews** | `frontend/package.json` |
| `void stampIconUrl; void stampFilledIconUrl;` | `ImagesTab.tsx:483-484` — dead code |
| Google JWT embeds BOTH class and object, and has no `exp` claim | `backend/apps/customers/pass_engine/google_pass.py:175-215` |
| Class is pre-created via REST on create **and** update (`update_loyalty_class_async.delay`) | `backend/apps/cards/services.py:66-68`, `:152-165` |
| Combined with JWT class embed → Google `POST` of an existing class → **409** → save URLs fail | architectural consequence of the two above |

### 2.7 Retracted findings (verified false — do not act on them)

Earlier agent reports asserted two HIGH-severity security vulnerabilities. **Direct source reading disproved both.** Recording this so the claims cannot re-enter the backlog:

| Retracted claim | Actual source | Verdict |
|---|---|---|
| "`authenticationToken` is the public pass UUID" | `backend/apps/customers/pass_engine/apple_pass.py:280-292` — `_ensure_apple_auth_token` uses `secrets.token_urlsafe(32)`, stored in `pass_data`, enforced `len >= 16` | **FALSE** |
| "`list_updated_passes` has zero authentication" | `backend/apps/customers/pass_engine/apple_pass_web_service.py:260-275` — `ApplePass ` header required, `hmac.compare_digest` against stored token, 401 on failure | **FALSE** |
| "unregister returns 401 when unregistered" | returns **200** — correct idempotent delete | **FALSE** |

Only `background_color` (hex) is ever read from images; `background.png` is never packaged into the PKPass — that is a **product gap**, not a security defect.

---

## 3. Target Architecture

Six primitives. Nothing else is allowed to grow.

### 3.1 One schema — `frontend/src/components/wallet/types/pass-schema.ts` (new)

Single source of truth for:
- `CardTypeConfig` discriminated union (migrated from `types/card-type-config.ts`)
- `WalletPassStudioState` (migrated from `types/unified-state.ts`, **minus** the `ui` slice)
- `UnifiedField`, `BackContent`, `ImageAsset` (**without** the lying `crop` field until crop is real)
- Limits (`maxFields`, `maxAuxiliaryFields`, image slot dimensions) — **one table only**
- Token dictionary — **one table**, namespaced `{{customer.first_name}}` etc.
- Defaults (`createDefaultState` — pure, memoizable)
- `validateField`, `validateFields`, `validateForExport` (the export gate)

Rules:
- No `as`-casts to force a union. Narrow via `cardType` discriminant.
- No `| undefined` own-keys. Absent means absent (use `Omit`/`Partial` at boundaries only).
- Every export shape function lives here too, so preview and backend consume the same output.

### 3.2 One state store — `frontend/src/hooks/useWalletStudio.ts` (rewritten)

- Durable design state lives in one `useReducer`.
- Undo/redo is a **middleware inside the same reducer** (bounded history of 50, structural sharing, no `JSON.stringify` snapshots).
- `ui` (zoom, grid, activeTab, activePanel) is a **separate** `useState`/context — never serialized, never dirties `isModified`.
- `id` generation uses `crypto.randomUUID()`.
- `applyTemplate` deleted (RC-6).
- `nudgeField` supports `left`/`right`.
- `isModified` compares durable state only.

**`useUndoRedo.ts` is deleted.** `WalletStudio.tsx` loses the sync effect and the wrapped-updater block entirely.

### 3.3 One mapper — `frontend/src/components/wallet/services/passes/` (new)

```
services/passes/
  apple.ts        buildApplePass(state) -> ApplePassJson
  google.ts       buildGooglePass(state) -> GoogleSaveJwtPayload
  tokens.ts       resolveTokens(state, sampleCustomer) -> Record<string,string>
  images.ts       applyCrop / exportSlot  (crop becomes real, or is removed)
  index.ts
```

Backend `apple_v2_builders.py` and `builders/base.py` are refactored to consume the **same JSON contract** (documented as a JSON Schema in `types/pass-schema.ts` and mirrored in `backend/apps/customers/pass_engine/schema.py`), so the three token dictionaries collapse to one.

Emitted Apple shape must include `barcodes[]` (and keep `barcode` only as a legacy mirror while Apple still accepts it). Emitted Google shape must use real API field names only — `hexForegroundColor`, `hexLabelColor`, `rows`, `googleRowType` are banned.

### 3.4 Schema-driven forms — `frontend/src/components/wallet/studio/fields/` (new)

Primitive kit (each ~30–80 lines, each unit-tested once):
`LabeledText`, `LabeledNumber`, `ColorField`, `IconField`, `Segmented`, `ChipList`, `DateRange`, `TierRows`, `Toggle`, `ImageSlot`.

Five custom slots only:
1. Coupon cut-line
2. Stamp shape grid
3. Gift/VIP chip tiers
4. Discount tier table
5. Multipass bundle list

The 10 `*Tab.tsx` files collapse to one `SchemaForm` driven by the `CardTypeConfig` discriminant + the five slots. Target: **2,402 lines → ~700–900**.

`LockedFeature.tsx` and `LimitReached.tsx` merge into one `PlanGate.tsx`.

### 3.5 Truthful preview — `AppleWalletPreview.tsx`, `GoogleWalletPreview.tsx`

Both render **the output of `services/passes/`**, not a parallel interpretation. If preview and export ever differ, the test gate fails.

`BarcodeRenderer.BarcodeSvg` is replaced with `qrcode.react` (QR) + `jsbarcode` (CODE128/CODE39/EAN). Real encoding of the real payload. Aztec via a real encoder or explicitly unsupported — never faked.

### 3.6 Test gate — `frontend/src/components/wallet/services/__tests__/golden/`

For every one of the 10 card types × both platforms:
- Golden `pass.json` fixture
- Golden Google JWT **claims** fixture (signature asserted separately)
- PKCS#7 detached-signature verification of the produced `.pkpass` (openssl/`node-forge`)
- SHA-1 manifest verification (every file listed, every hash matches)
- Playwright E2E that drives the designer, exports, and **unzips the `.pkpass`** in the browser context and asserts on `pass.json`
- `validateForExport` is the only path to `api.post`; tests assert it rejects invalid state

---

## 4. Deletion Register — Delete Completely

Nothing below survives. This is the "REMOVE AND COMPLETELY DELETE THE OLD CODE" list.

| # | Target | Reason | Phase |
|---|---|---|---|
| D-01 | `frontend/src/hooks/useUndoRedo.ts` | Dual store; RC-1 | P2 |
| D-02 | `useWalletStudio.applyTemplate` (`useWalletStudio.ts:229-257`) | Dead code | P3 |
| D-03 | `field-mappers.ts` `buildApplePass` / `buildGooglePass` / `mapFieldToGoogle` / `buildGoogleRows` | Superseded by `services/passes/` | P5 |
| D-04 | `types/back-content.ts` 10 copy-paste factories | Replace with one factory + discriminated defaults | P3 |
| D-05 | `icons.tsx` legacy icon set | Replaced by `IconRenderer.tsx` | P3 |
| D-06 | `studio/LockedFeature.tsx` + `studio/LimitReached.tsx` | Forks → `PlanGate.tsx` | P4 |
| D-07 | `preview-decorations.tsx` fake device chrome | Decorative lies; device frames live in the preview shell only | P5 |
| D-08 | `BarcodeRenderer.BarcodeSvg` decorative encoder | Replaced by real encoders | P5 |
| D-09 | `DynamicValueTemplate`, `DynamicTemplateRegistry`, `getDynamicTemplatesForCardType`, `TemplateCategory` | Dead types / dead registry | P3 |
| D-10 | `FIELD_GROUP_METADATA.maxFields` | Duplicate of `CARD_TYPE_METADATA[*].maxAuxiliaryFields` — keep one | P1 |
| D-11 | `PassStyle: 'transitStyle'` | Not a real Apple PassKit style | P1 |
| D-12 | `ImageAsset.crop` (while unimplemented) | Comment lies. **v1.1 decision: KEEP and make real in P5** (`ImageCropEditor` is shipped UI; deleting would remove working functionality). Not deleted in P1. | P5 |
| D-13 | `void stampIconUrl; void stampFilledIconUrl;` (`ImagesTab.tsx:483-484`) | Dead code | P3 |
| D-14 | Unused registry re-exports in `constants.ts` | Dead surface | P3 |
| D-15 | `googleRowType: 'row2'/'row3'/'row4'` (`constants.ts`) | Invented Google concept | P5 |
| D-16 | `hexForegroundColor`, `hexLabelColor`, `rows` in Google payload | Not real API fields | P5 |
| D-17 | V1 serialization path in `serialization.ts` (silent drop) | Either migrate V1 properly in P1 or delete the pretence | P1 |
| D-18 | `apple_v2_builders.py:48` inline `__import__("datetime")` | Replace with module-level import | P3 |
| D-19 | `apple_v2_builders.py:42` emoji stamp glyphs `⬛`/`⬜` | Contradicts the emoji purge; use text/unicode blocks from schema | P5 |
| D-20 | Hardcoded Spanish labels in `constants.ts` | Move to `en.json` / `es.json` | P4 |

---

## 5. Phased Rapid-Development Plan (TDD)

Each task is bite-sized: **failing test → fail → minimal impl → pass → commit**. Paths are exact. No task may ship without its test green.

### Phase P0 — Stop the bleeding (branch hygiene)

The branch `feat/wallet-designer-perfection` has 18 modified files. Before any architecture work:

| Task | Action | Verify | Status |
|---|---|---|---|
| P0-1 | **EXPANDED (v1.1):** repair **947** of 2,520 English i18n strings where `value === key`, across 15 namespaces; reconcile 799 EN-only / 45 ES-only key drift. Use `es.json` as the semantic guide. | `python3` check: zero keys where `en[k] == k` | In progress |
| P0-2 | ~~Update `field-validation.test.ts` for the i18n message-key change~~ | ~~`npx vitest run field-validation`~~ | **Closed — no-op.** Already asserts message keys; 29/29 green |
| P0-3 | ~~Split `docker-compose.yml` out of this branch~~ | — | **Closed — DECISION: KEEP.** One-line mount of `frontend/vitest.config.ts` is P6 test-gate infrastructure, not scope creep |
| P0-4 | **DECISION (v1.1):** execute **D-13** now (`void stampIcon*` deleted). **KEEP `crop`** — `ImageCropEditor` is real UI. **D-12 deferred to P5**, where crop is made real rather than deleted. | zero `void stampIcon*` matches | Implemented |
| P0-5 | **EXPANDED (v1.1):** `AIChatModal.tsx` called `t()` with no `useI18n` (3 × `TS2304`). Fix with the codebase pattern `const { t } = useI18n();` per component. Then `npx tsc --noEmit` and `npx vitest run` green before P1 starts. | both exit 0 | Implemented |
| P0-GATE | `npx tsc --noEmit` exits 0 **and** `npx vitest run` green | both exit 0 | Pending |

### Phase P1 — One schema

**Task P1-1: Create `types/pass-schema.ts` with limits + one token dictionary**

**Files:**
- Create: `frontend/src/components/wallet/types/pass-schema.ts`
- Test: `frontend/src/components/wallet/types/__tests__/pass-schema.test.ts`

**Step 1 — failing test**

```ts
import { LIMITS, TOKENS, resolveToken } from '../pass-schema';

it('has exactly one auxiliary-field limit', () => {
  expect(LIMITS.auxiliaryFields.max).toBe(4);
  expect(LIMITS.auxiliaryFields.max).toBe(LIMITS.auxiliaryFields.max); // single source
});

it('exposes one namespaced token dictionary', () => {
  expect(Object.keys(TOKENS).every((k) => k.startsWith('{{'))).toBe(true);
  expect(TOKENS).toHaveProperty('{{customer.first_name}}');
  expect(TOKENS).toHaveProperty('{{gift.balance}}');
  expect(TOKENS).not.toHaveProperty('{{first_name}}'); // old key banned
});

it('resolves tokens against a sample customer', () => {
  expect(resolveToken('{{customer.first_name}}', { firstName: 'Ana' })).toBe('Ana');
});
```

**Step 2:** `npx vitest run pass-schema` → FAIL (module missing)
**Step 3:** implement `LIMITS`, `TOKENS`, `resolveToken` — one table each. Merge `CARD_TYPE_METADATA[*].maxAuxiliaryFields` and `FIELD_GROUP_METADATA.auxiliary.maxFields` into `LIMITS` (this performs **D-10**).
**Step 4:** `npx vitest run pass-schema` → PASS
**Step 5:** `git add -A && git commit -m "feat(schema): single limits + token dictionary"`

**Task P1-2: Delete `transitStyle` (D-11)**

> **v1.1 note:** D-12 (`crop`) is **no longer in this task.** Crop is kept and made real in P5.

Test: `expect(PASS_STYLE_OPTIONS).not.toContain('transitStyle')`. Compile-fix every consumer. Commit.

**Task P1-3: Harden `serialization.ts`**

- Remove `|| undefined` own-key writes (`serialization.ts:50-52`) — use conditional spreads.
- Stop persisting `ui` (`serialization.ts:79`).
- Read `version` on parse; refuse unknown major versions loudly (no silent V1 drop) — or implement a real V1 migrator.
- Use `crypto.randomUUID()` instead of `pass-${Date.now()}`.

Tests: round-trip `buildWalletDesignMetadata` → `parseWalletDesignFromMetadata` yields deep-equal durable state with **no** `ui` key present.

**Task P1-4: Mirror the schema in the backend**

- Create `backend/apps/customers/pass_engine/schema.py` with the same limits and the same token dictionary.
- Test: `backend/apps/customers/pass_engine/tests/test_schema.py` asserts the two token dictionaries are identical (export both to JSON in CI and diff).

### Phase P2 — One state store

**Task P2-1: Rewrite `useWalletStudio` as a reducer with in-band undo**

**Files:**
- Rewrite: `frontend/src/hooks/useWalletStudio.ts`
- Test: `frontend/src/hooks/__tests__/useWalletStudio.test.ts`

**Step 1 — failing test**

```ts
it('nudgeField moves left and right', () => {
  const { result } = renderHook(() => useWalletStudio());
  act(() => result.current.addField({ label: 'A', fieldGroup: 'primary', /* ... */ }));
  const before = result.current.state.fields[0].x;
  act(() => result.current.nudgeField(result.current.state.fields[0].id, 'right'));
  expect(result.current.state.fields[0].x).toBe(before + 1);
  act(() => result.current.nudgeField(result.current.state.fields[0].id, 'left'));
  expect(result.current.state.fields[0].x).toBe(before);
});

it('undo restores field deletion', () => {
  // add -> delete -> undo -> field is back
});

it('isModified ignores ui state', () => {
  act(() => result.current.setUi({ zoom: 2 }));
  expect(result.current.isModified).toBe(false);
});
```

**Step 2:** run → FAIL
**Step 3:** implement reducer + history middleware (50 entries, structural sharing, no `JSON.stringify`).
**Step 4:** run → PASS
**Step 5:** commit.

**Task P2-2: Delete `useUndoRedo.ts` (D-01) and unwire `WalletStudio.tsx`**

- Remove `const { state: undoableState, ... } = useUndoRedo(...)`.
- Remove the `useEffect` that copies `studio.state` → `setUndoableState`.
- Remove the wrapped-updater block (`WalletStudio.tsx:102-137`).
- `displayState` becomes `studio.state`.
- Test: a Playwright/Vitest test asserting `duplicateField` then `undo` restores the list (the exact bug in RC-1).
- Commit: `refactor(state): delete useUndoRedo — single store`.

### Phase P3 — Delete the dead

Execute **D-02, D-04, D-05, D-09, D-13, D-14, D-18** in one sweep.

For each: delete, run `npx tsc --noEmit`, fix every import, run `npx vitest run`, commit. One commit per deletion class:

```
chore(wallet): delete dead applyTemplate
chore(wallet): collapse back-content factories to one
chore(wallet): delete legacy icons.tsx
chore(wallet): delete dynamic-template dead types
chore(wallet): delete dead stamp-icon voids
chore(wallet): delete unused registry re-exports
chore(wallet): hoist datetime import in apple_v2_builders
```

### Phase P4 — Form primitives + schema-driven tabs

**Task P4-1: Build the primitive kit** under `studio/fields/`. TDD each primitive: renders label, calls `onChange`, shows error from `validateField`. One commit per primitive or one commit for the kit with a table-driven test.

**Task P4-2: `PlanGate.tsx`** replaces `LockedFeature` + `LimitReached` (D-06).

**Task P4-3: `SchemaForm.tsx`** driven by the `CardTypeConfig` discriminant + 5 custom slots. Migrate tab-by-tab (stamp first, multipass last). Each migration deletes the old `*Tab.tsx`. Target **D-20** (i18n all labels) here.

**Task P4-4:** Wire `validateField` into every primitive's `onBlur`/`onChange` (closes RC-5).

### Phase P5 — Truthful preview + real export

**Task P5-1:** Create `services/passes/{apple,google,tokens,images}.ts` per §3.3. Golden-file tests first (failing), then implement.

**Task P5-2:** Point `AppleWalletPreview` and `GoogleWalletPreview` at `services/passes/` output. Any remaining divergence is a test failure.

**Task P5-3:** Real barcodes (D-08). Add `jsbarcode`. Tests assert the rendered SVG/CODABAR matches the payload for a known input.

**Task P5-4:** Execute **D-03, D-07, D-15, D-16, D-19**.

**Task P5-5:** Google JWT fix: never embed an existing class (drop `payload_key_class` on update), add `exp`, split `id` from `classId`. Backend tests in `backend/apps/customers/pass_engine/tests/test_google_pass.py`. Also fix `_normalize_review_status` to Google's real enum.

**Task P5-6:** Apple: write `_order` in `_map_v2_field_to_apple` so `:198` sort works; emit `barcodes[]`; package `background.png` or delete the slot.

### Phase P6 — Test gate (this is what makes it "production")

**Task P6-1: Golden files** — 10 card types × 2 platforms. Commit fixtures under `services/passes/__tests__/golden/`.

**Task P6-2: PKCS#7 + manifest verification** — a Vitest/node test that builds a `.pkpass`, unzips it, verifies every `manifest.json` SHA-1, and verifies the PKCS#7 detached signature against the WWDR intermediate.

**Task P6-3: `validateForExport` gate** — `export.ts` refuses to POST without a green validation result. Test asserts `api.post` is never called on invalid state.

**Task P6-4: Playwright E2E** — for each card type: open designer → fill fields → upload images → export → unzip `.pkpass` → assert `pass.json` equals golden. Assert the Google save URL's decoded claims equal the Google golden. This is the test that would have caught `pass.json: null`.

**Task P6-5: Backend parity test** — export from frontend, feed the same metadata to `apple_v2_builders.py`, assert identical `pass.json` modulo volatile fields (dates, serials).

### Phase P7 — World-class polish

| Task | Detail |
|---|---|
| P7-1 | Image crop made real (or permanently deleted — no middle state) |
| P7-2 | Real `@2x`/`@3x` derivation (resize, not aliasing) — kills `ImagesTab.tsx:393-398` |
| P7-3 | Accessibility pass: focus order, labels, contrast (fix the `0.03928` vs `0.04045` typo in the WCAG math) |
| P7-4 | Full i18n: zero hardcoded Spanish in `constants.ts` |
| P7-5 | Duplicate DOM id `push-icon-upload` fixed |
| P7-6 | Performance: `createDefaultState` memoized; no per-render allocation |
| P7-7 | Apple Web Service push path hardened and documented (`apple_pass_web_service.py`) |
| P7-8 | Visual QA vs Apple PassKit UI and Google Wallet brand guidelines |

---

## 6. Definition of Done — "100% production code"

The Wallet Designer is finished when **all** of the following are true and automated:

1. **One** schema module; `grep` finds zero second token dictionaries and zero second limit tables.
2. **One** state store; `useUndoRedo.ts` does not exist; a test proves `delete → undo` restores.
3. **One** export pipeline; `field-mappers.ts` `buildApplePass`/`buildGooglePass` do not exist.
4. Preview output ≡ export output, enforced by test.
5. Every item in the Deletion Register (D-01…D-20) is deleted and gone from `grep`.
6. `validateForExport` blocks every invalid state; `export.ts` cannot bypass it.
7. 10 card types × 2 platforms have golden files that pass.
8. Produced `.pkpass` passes SHA-1 manifest verification **and** PKCS#7 signature verification.
9. Playwright E2E unzips a real `.pkpass` and asserts on `pass.json` for every card type.
10. Frontend and backend token dictionaries are byte-identical, proven in CI.
11. `npx tsc --noEmit`, `npx vitest run`, and the Playwright suite are green.
12. Zero hardcoded UI strings outside `en.json` / `es.json`.
13. No invented API fields in any payload (`hexForegroundColor`, `rows`, `googleRowType`, `class.<group>[i]` are gone).
14. Google save URLs work against the real API without 409 (class not re-inserted).
15. Documentation: this plan's Revision History updated, `docs/00-index.md` registers every new document, and every new document carries full ISO controls per `LOYALLIA-RULES-001`.

---

## 7. Execution Model

- **Method:** `superpowers:subagent-driven-development` — fresh subagent per task, code review between tasks.
- **Cadence:** frequent commits, one per TDD cycle. Small PRs per phase (P0…P7), not one giant PR.
- **Branching:** `feat/wallet-designer-perfection` for P0; `feat/wallet-schema` (P1), `feat/wallet-single-store` (P2), `feat/wallet-delete-dead` (P3), `feat/wallet-schema-forms` (P4), `feat/wallet-truthful-export` (P5), `feat/wallet-test-gate` (P6), `feat/wallet-polish` (P7).
- **Blocking rule:** a phase does not start until the previous phase's tests are green on `main`.
- **Escalation:** any task that cannot be completed without a product decision (e.g. real vs. deleted crop) is surfaced immediately — never left half-wired.

---

*End of document — LOYALLIA-PLAN-WALLET-UNIFY-001 v1.1*
