# HANDOFF: V2 Pass Designer — Full Status & Next Agent Pickup Guide

> Written: 2026-05-19
> Session: V2 Designer "Full Perfection" Implementation

---

## EXECUTIVE SUMMARY

The V2 Pass Designer (`designerV2/`) has been **significantly advanced** toward production readiness. All P0 critical features are now implemented and TypeScript compiles cleanly. P1 polish features are mostly done. P2 advanced features are partially done. Docker cluster hardening is complete.

**Access URL**: `http://localhost:33906/programs/{program-id}/design`

---

## WHAT WAS COMPLETED THIS SESSION

### Phase 1: Critical Missing Features (P0) — ✅ DONE

| Feature | File | Status |
|---------|------|--------|
| **AddFieldModal** | `designerV2/modals/AddFieldModal.tsx` | ✅ NEW — PassKit-style modal with Apple/Google platform tabs. Apple shows field group radio selectors (header/primary/secondary/auxiliary/back). Google shows row type buttons (1/2/3 columns). Fields: label, value, key. |
| **EditFieldModal** | `designerV2/modals/EditFieldModal.tsx` | ✅ NEW — Tabbed modal: Details / Platform / Advanced. Apple: text alignment, change message. Google: fieldPath dropdown from `GOOGLE_PREDEFINED_FIELDS`. Delete button included. |
| **Modal wiring** | `designerV2/sections/DataSection.tsx` | ✅ DONE — All `/* TODO */` stubs replaced. `onEdit` opens EditFieldModal. `onAdd` opens AddFieldModal. Local modal state managed in DataSection. |
| **Color propagation** | `designerV2/sections/DesignSection.tsx` | ✅ DONE — `onFormChange` callback prop bubbles `background_color`/`text_color` up to `page.tsx`. Template quick-select now sets colors. Color pickers are live. |
| **Barcode type save** | `app/(dashboard)/programs/[id]/design/page.tsx` | ✅ DONE — `handleBarcodeTypeChange` updates program state. Saved in `programsApi.update`. |
| **Trash2 icon** | `components/ui/LucideIcons.tsx` | ✅ ADDED — Trash can icon for EditFieldModal delete button. |

### Phase 2: Polish & Animations (P1) — ✅ MOSTLY DONE

| Feature | File | Status |
|---------|------|--------|
| **Card flip animation** | `designerV2/CenterPreview.tsx` | ✅ DONE — CSS 3D transform with `perspective: 1200px`, `transform-style: preserve-3d`, `rotateY(180deg)` transition 500ms. Front and back cards rendered as separate flippable faces. |
| **Drag-and-drop reorder** | `designerV2/sections/DataSection.tsx` | ✅ DONE — Google rows use `@dnd-kit/core` + `@dnd-kit/sortable`. `SortableGoogleRowCard` wraps each row with drag handle (GripVertical). `arrayMove` reorders `walletDesign.googleRows`. |
| **PickImageModal** | `designerV2/modals/PickImageModal.tsx` | ✅ NEW — Two-tab modal: Upload (drag-drop + click, same as inline) + Library (placeholder for future). Wired into `DesignSection` image rows. Clicking any image preview opens modal. |
| **Template quick-select** | `designerV2/sections/DesignSection.tsx` | ✅ DONE — Template grid click calls `onFormChange({ background_color: template.bg, text_color: template.text })`. |

### Phase 3: Integration & Advanced Features (P2) — 🟡 PARTIAL

| Feature | File | Status |
|---------|------|--------|
| **Visual zone map SVG overlay** | `designerV2/cards/FlatAppleCard.tsx` | ✅ DONE — Toggleable via "Mostrar zonas" button in `CenterPreview`. SVG overlay shows 4 colored rectangles (Cabecera=blue, Principal=green, Secundario=amber, Auxiliar=purple) with labels. Overlay dims when `hoveredZone` is active. |
| **Zone highlighting on hover** | `designerV2/sections/DataSection.tsx` + shell | ✅ DONE — `AppleFieldGroupCard` emits `onMouseEnter`/`onMouseLeave` → `onHoverZone(group.key)`. `FlatAppleCard` dims non-hovered zones via opacity. State lifted through `WalletDesignShellV2` → `CenterPreview`. |
| **New flow integration** | `app/(dashboard)/programs/new/page.tsx` | ✅ DONE — Success page now shows "Personalizar diseño avanzado →" link to `/programs/{id}/design`. |
| **Edit page V2 link** | `app/(dashboard)/programs/[id]/page.tsx` | ✅ DONE — "Abrir en diseñador V2 →" button added above legacy `WalletDesigner` in program edit page. |
| **Locations/Links sections** | `designerV2/sections/` | ⚠️ UI skeletons exist. No backend wiring. Backend endpoints for saving locations/links in `wallet_design` metadata may need creation. |

### Phase 4: Docker Cluster Hardening — ✅ DONE

| Fix | File | Details |
|-----|------|---------|
| **Frontend config mounts** | `docker-compose.yml` | Added `postcss.config.js`, `tsconfig.json`, `components.json` as read-only binds to `web` service. |
| **node_modules named volume** | `docker-compose.yml` | Added `node_modules:/app/node_modules` to `web` service + `node_modules:` top-level volume. Enables `docker compose exec web npm install <pkg>` without rebuild. |
| **WhatsApp bridge live reload** | `docker-compose.yml` | Added `./services/whatsapp-bridge/src:/app/src` volume mount to `whatsapp-bridge` service. |
| **Override template** | `docker-compose.override.yml.example` | Created with examples for direct port exposure and WhatsApp bridge live reload command. |

---

## WHAT'S LEFT TO DO (PRIORITIZED)

### 🔴 HIGH PRIORITY — Should Do Next

1. **Apple field drag-and-drop reorder**
   - Google rows have DnD. Apple field groups do NOT.
   - Each `AppleFieldGroupCard` needs its own `DndContext` + `SortableContext` for reordering fields within that group.
   - Effort: ~2h
   - File: `designerV2/sections/DataSection.tsx`

2. **PickImageModal — Library tab backend**
   - The Library tab is a placeholder. Needs a backend endpoint to list existing images (e.g., `GET /api/v1/assets/` or read from MinIO).
   - Effort: ~3h (backend + frontend)
   - Files: `designerV2/modals/PickImageModal.tsx`, backend API

3. **Image uploads — persist to backend instead of base64**
   - Currently images are stored as base64 data URLs in state. On save, they get serialized into metadata.
   - For production, images should upload to MinIO/S3 and store URLs.
   - The `page.tsx` save handler already maps image URLs to `metadata.wallet_design.apple_images` / `google_images`.
   - Effort: ~4h
   - Files: `designerV2/sections/DesignSection.tsx`, backend upload endpoint

### 🟡 MEDIUM PRIORITY — Nice to Have

4. **Replace legacy `WalletDesigner.tsx` in new program wizard**
   - Step 2 of `app/(dashboard)/programs/new/page.tsx` still uses the old `WalletDesigner` component.
   - Option A: Embed `WalletDesignShellV2` directly in the wizard (complex — needs program ID which doesn't exist yet).
   - Option B: Keep current approach (link to V2 after creation) — already done.
   - **Recommendation**: Leave as-is. The success-page link is sufficient for MVP.

5. **Locations section backend wiring**
   - `LocationsSection.tsx` has UI for GPS + iBeacons but doesn't save/load anything.
   - Needs `walletDesign.locations` and `walletDesign.ibeacons` fields added to `WalletDesignState`.
   - Effort: ~3h
   - Files: `designerV2/sections/LocationsSection.tsx`, `components/programs/WalletDesigner.tsx` (types)

6. **Links section backend wiring**
   - Same as locations — UI exists but no data flow.
   - Effort: ~2h
   - Files: `designerV2/sections/LinksSection.tsx`, types

### 🟢 LOW PRIORITY — Future Sprint

7. **Human-friendly field pickers**
   - Current AddFieldModal asks users to type raw `{variable}` syntax in the "Valor" field.
   - Should offer a dropdown: "Nombre del cliente", "Sellos actuales", "Saldo", etc.
   - Map human labels to backend field paths automatically.
   - Effort: ~4h
   - Files: `designerV2/modals/AddFieldModal.tsx`, `designerV2/modals/EditFieldModal.tsx`

8. **E2E tests for V2 designer**
   - No Playwright tests exist for the V2 route.
   - Should test: load program, switch platform, add field, edit field, change color, save.
   - Effort: ~4h
   - Files: `frontend/tests/e2e/suite/`

---

## CODE REVIEW: FILES MODIFIED THIS SESSION

### New Files

| File | Lines | Purpose |
|------|-------|---------|
| `frontend/src/components/programs/designerV2/modals/AddFieldModal.tsx` | ~200 | Add fields with platform tabs |
| `frontend/src/components/programs/designerV2/modals/EditFieldModal.tsx` | ~280 | Edit fields with Details/Platform/Advanced tabs |
| `frontend/src/components/programs/designerV2/modals/PickImageModal.tsx` | ~150 | Upload / Library image picker |
| `docker-compose.override.yml.example` | ~25 | Dev environment customization template |

### Modified Files

| File | Key Changes |
|------|-------------|
| `frontend/src/components/programs/designerV2/WalletDesignShellV2.tsx` | Added `onFormChange`, `onBarcodeTypeChange`, `onHoverZone`, `onToggleZoneMap` props and state wiring. |
| `frontend/src/components/programs/designerV2/CenterPreview.tsx` | Added 3D card flip animation. Added zone map toggle button. Passed `hoveredZone`/`showZoneMap` to FlatAppleCard. |
| `frontend/src/components/programs/designerV2/RightEditorPanel.tsx` | Added `onFormChange` and `onHoverZone` props. Passed to DesignSection and DataSection. |
| `frontend/src/components/programs/designerV2/sections/DesignSection.tsx` | Color pickers now live. Template clicks work. PickImageModal integrated. |
| `frontend/src/components/programs/designerV2/sections/DataSection.tsx` | Modals fully wired. DnD for Google rows implemented. Zone hover events emitted. |
| `frontend/src/components/programs/designerV2/cards/FlatAppleCard.tsx` | Added zone map SVG overlay. Added zone dimming on hover. Added `hoveredZone`/`showZoneMap` props. |
| `frontend/src/components/ui/LucideIcons.tsx` | Added `Trash2` icon. |
| `frontend/src/app/(dashboard)/programs/[id]/design/page.tsx` | Added `handleFormChange` and `handleBarcodeTypeChange`. Barcode type now saved. |
| `frontend/src/app/(dashboard)/programs/new/page.tsx` | Added "Personalizar diseño avanzado →" link on success page. |
| `frontend/src/app/(dashboard)/programs/[id]/page.tsx` | Added "Abrir en diseñador V2 →" button above legacy WalletDesigner. |
| `frontend/src/components/programs/designerV2/types.ts` | Added `hoveredZone` and `showZoneMap` to `DesignerUIState`. |
| `docker-compose.yml` | Added `node_modules` volume, missing config mounts, WhatsApp bridge source mount. |

---

## TYPE CHECK STATUS

```bash
cd frontend && npx tsc --noEmit
```

**Result: ✅ 0 errors** (verified after every major change)

---

## HOW TO PICK UP WHERE I LEFT OFF

### Immediate Next Steps (Recommended Order)

1. **Apple field DnD** — Open `frontend/src/components/programs/designerV2/sections/DataSection.tsx`. Look for `AppleFieldGroupCard`. Copy the DnD pattern from `SortableGoogleRowCard` (already in same file) and apply it to the Apple field list inside each group. You'll need a `SortableAppleFieldItem` component and a `DndContext` per group.

2. **Image persistence** — Open `frontend/src/components/programs/designerV2/sections/DesignSection.tsx`. The `ImageUploadRow` uses `FileReader.readAsDataURL()` which stores base64 in state. Replace with an actual upload to the backend or MinIO, then store the returned URL.

3. **Human-friendly values** — Open `frontend/src/components/programs/designerV2/modals/AddFieldModal.tsx`. The "Valor" input is free-text. Replace with a `<select>` dropdown that maps human labels (`Nombre del cliente`, `Sellos acumulados`, etc.) to template strings (`{customer_name}`, `{stamp_count}/{stamps_required}`).

### Testing Your Changes

```bash
# 1. Type check
cd frontend && npx tsc --noEmit

# 2. Start the dev cluster (live reload already works)
docker compose up -d

# 3. Access V2 Designer
open http://localhost:33906/programs/1/design

# 4. Test modals — Click "Agregar campo" in Data section, verify AddFieldModal opens
# 5. Test edit — Click any existing field, verify EditFieldModal opens with correct tabs
# 6. Test colors — Change background color, verify preview updates instantly
# 7. Test DnD — Drag Google rows to reorder
# 8. Test flip — Click "Ver trasera" on Apple preview, verify 3D flip animation
# 9. Test zones — Click "Mostrar zonas", verify SVG overlay appears. Hover over field groups, verify dimming.
```

### Key Patterns to Follow

- **Modals**: Use the same pattern as `ConfirmModal.tsx` — fixed overlay, `role="dialog"`, Escape to close, body scroll lock.
- **Lucide icons**: Add new icons to `components/ui/LucideIcons.tsx` as inline SVGs. Do NOT install `lucide-react`.
- **Tailwind classes**: Use project conventions — `input`, `label`, `btn-primary`, `btn-ghost`, `card`, `badge-*`.
- **State lifting**: Keep modal state local to sections (DataSection manages its own modals). Keep shared UI state in `WalletDesignShellV2` (`DesignerUIState`).
- **Type safety**: The project uses strict TypeScript. Run `npx tsc --noEmit` after every file change.

---

## ARCHITECTURE REMINDER

```
page.tsx (loads program, manages save)
  └── WalletDesignShellV2 (manages DesignerUIState)
        ├── LeftNav (icons + platform toggle)
        ├── CenterPreview (card preview + phone frames + flip + zone map)
        │     ├── FlatAppleCard (PassKit layout + zone SVG overlay)
        │     └── FlatGoogleCard (Google Wallet layout)
        └── RightEditorPanel (routes activeNav to sections)
              ├── DesignSection (colors, templates, images, PickImageModal)
              ├── DataSection (Apple fields + Google rows + AddFieldModal + EditFieldModal)
              ├── LocationsSection (skeleton)
              ├── LinksSection (skeleton)
              ├── BarcodeSection (5-type selector)
              └── AdvancedSection (NFC, sharing, etc.)
```

---

## CONTACT / CONTEXT

- **Previous session plan**: `/Users/macbookpro201916i964gb1tb/.kimi/plans/steel-wolfsbane-jessica-cruz.md`
- **Docker live changes**: Already working. `web` and `api` containers hot-reload on file changes. Celery workers need manual restart (`docker compose restart celery-pass celery-push celery-default`).
- **Persistent volumes**: All 14 named volumes are configured in `docker-compose.yml`. Data survives `docker compose down`.

---

## FINAL CHECKLIST FOR NEXT AGENT

- [ ] Read this HANDOFF.md fully
- [ ] Run `cd frontend && npx tsc --noEmit` to confirm clean build
- [ ] Open `http://localhost:33906/programs/1/design` to see current state
- [ ] Pick ONE item from "What's Left To Do" above
- [ ] Implement it
- [ ] Run type check again
- [ ] Update this HANDOFF.md with what you changed

**Do NOT try to do everything at once. Pick the highest priority item and finish it completely.**
