# HANDOFF: V2 Pass Designer — Full Status & Next Agent Pickup Guide

> Written: 2026-05-19
> Session: V2 Designer "Full Perfection" Implementation

---

## EXECUTIVE SUMMARY

The V2 Pass Designer (`designerV2/`) is **feature-complete and ready for production deployment**. All P0, P1, P2 items from the original handoff have been implemented. TypeScript compiles cleanly. All features are committed to `main`.

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

### Phase 2: Polish & Animations (P1) — ✅ DONE

| Feature | File | Status |
|---------|------|--------|
| **Card flip animation** | `designerV2/CenterPreview.tsx` | ✅ DONE — CSS 3D transform with `perspective: 1200px`, `transform-style: preserve-3d`, `rotateY(180deg)` transition 500ms. Front and back cards rendered as separate flippable faces. |
| **Drag-and-drop reorder** | `designerV2/sections/DataSection.tsx` | ✅ DONE — Google rows use `@dnd-kit/core` + `@dnd-kit/sortable`. `SortableGoogleRowCard` wraps each row with drag handle (GripVertical). `arrayMove` reorders `walletDesign.googleRows`. |
| **PickImageModal** | `designerV2/modals/PickImageModal.tsx` | ✅ NEW — Two-tab modal: Upload (drag-drop + click, uploads to MinIO) + Library (grid of existing tenant images from `GET /api/v1/upload/assets/`). Wired into `DesignSection` image rows. |
| **Template quick-select** | `designerV2/sections/DesignSection.tsx` | ✅ DONE — Template grid click calls `onFormChange({ background_color: template.bg, text_color: template.text })`. |

### Phase 3: Integration & Advanced Features (P2) — ✅ DONE

| Feature | File | Status |
|---------|------|--------|
| **Visual zone map SVG overlay** | `designerV2/cards/FlatAppleCard.tsx` | ✅ DONE — Toggleable via "Mostrar zonas" button in `CenterPreview`. SVG overlay shows 4 colored rectangles (Cabecera=blue, Principal=green, Secundario=amber, Auxiliar=purple) with labels. Overlay dims when `hoveredZone` is active. |
| **Zone highlighting on hover** | `designerV2/sections/DataSection.tsx` + shell | ✅ DONE — `AppleFieldGroupCard` emits `onMouseEnter`/`onMouseLeave` → `onHoverZone(group.key)`. `FlatAppleCard` dims non-hovered zones via opacity. State lifted through `WalletDesignShellV2` → `CenterPreview`. |
| **New flow integration** | `app/(dashboard)/programs/new/page.tsx` | ✅ DONE — Success page now shows "Personalizar diseño avanzado →" link to `/programs/{id}/design`. |
| **Edit page V2 link** | `app/(dashboard)/programs/[id]/page.tsx` | ✅ DONE — "Abrir en diseñador V2 →" button added above legacy `WalletDesigner` in program edit page. |
| **Image persistence to MinIO** | `designerV2/sections/DesignSection.tsx` + `PickImageModal.tsx` + `upload_api.py` | ✅ DONE — Images upload via `POST /api/v1/upload/` to MinIO. `uploadFileWithError()` utility returns URL or error message. Loading states shown during upload. |
| **Library tab backend** | `backend/apps/api/upload_api.py` | ✅ DONE — `GET /api/v1/upload/assets/` lists tenant-scoped objects from MinIO `assets` bucket. Returns `{success, assets[], count}`. |
| **Apple field DnD** | `designerV2/sections/DataSection.tsx` | ✅ DONE — Each `AppleFieldGroupCard` has its own `DndContext` + `SortableContext` for reordering fields within that group. `SortableAppleFieldItem` component with drag handle. |
| **Human-friendly field values** | `designerV2/modals/AddFieldModal.tsx` + `EditFieldModal.tsx` | ✅ DONE — `FIELD_VALUE_PRESETS` constant maps human labels to template strings. Dropdown in "Valor" field with 14 presets + custom text input fallback. |
| **Locations section wiring** | `designerV2/sections/LocationsSection.tsx` | ✅ DONE — Full add/remove GPS locations (lat/lng/altitude/relevantText) and iBeacons (uuid/major/minor/relevantText). State persisted to `walletDesign.locations` and `walletDesign.beacons`. |
| **Links section wiring** | `designerV2/sections/LinksSection.tsx` | ✅ DONE — Homepage URI, help URI inputs. Add/remove additional links (label + uri). State persisted to `walletDesign.links`, `walletDesign.homepageUri`, `walletDesign.helpUri`. |

### Phase 4: Docker Cluster Hardening — ✅ DONE

| Fix | File | Details |
|-----|------|---------|
| **Frontend config mounts** | `docker-compose.yml` | Added `postcss.config.js`, `tsconfig.json`, `components.json` as read-only binds to `web` service. |
| **node_modules named volume** | `docker-compose.yml` | Added `node_modules:/app/node_modules` to `web` service + `node_modules:` top-level volume. Enables `docker compose exec web npm install <pkg>` without rebuild. |
| **WhatsApp bridge live reload** | `docker-compose.yml` | Added `./services/whatsapp-bridge/src:/app/src` volume mount to `whatsapp-bridge` service. |
| **Override template** | `docker-compose.override.yml.example` | Created with examples for direct port exposure and WhatsApp bridge live reload command. |

### Phase 5: E2E Tests — ✅ DONE

| Test | File | Coverage |
|------|------|----------|
| **V2 Designer E2E** | `frontend/tests/e2e/suite/24-designer-v2.spec.ts` | Load designer, switch platform, change color and save, add/remove Apple field, barcode type selector |

---

## TYPE CHECK STATUS

```bash
cd frontend && npx tsc --noEmit
```

**Result: ✅ 0 errors** (verified after every major change)

---

## HOW TO PICK UP WHERE I LEFT OFF

### Immediate Next Steps (Recommended Order)

1. **Production build test**:
   ```bash
   cd frontend && docker build --target builder -t loyallia-web-build:test .
   cd ../backend && docker build -t loyallia-api-build:test .
   ```

2. **Deploy to production**:
   ```bash
   ssh user@rewards.loyallia.com
   cd /opt/loyallia
   git pull origin main
   docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache web api
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d web api
   ```

3. **Verify**:
   ```bash
   curl -sf https://rewards.loyallia.com/api/v1/health/
   curl -sf -o /dev/null -w "%{http_code}" https://rewards.loyallia.com/
   open https://rewards.loyallia.com/programs/1/design
   ```

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
# 7. Test DnD — Drag Google rows to reorder, drag Apple fields within groups
# 8. Test flip — Click "Ver trasera" on Apple preview, verify 3D flip animation
# 9. Test zones — Click "Mostrar zonas", verify SVG overlay appears. Hover over field groups, verify dimming.
# 10. Test image upload — Upload an image, verify it persists to MinIO and shows URL instead of base64
# 11. Test library — Open PickImageModal, switch to Biblioteca tab, verify images load
# 12. Test locations — Add a GPS location and iBeacon in Locations section, save, refresh
# 13. Test links — Add homepage/help URLs and extra links in Links section, save, refresh
```

### Key Patterns to Follow

- **Modals**: Use the same pattern as `ConfirmModal.tsx` — fixed overlay, `role="dialog"`, Escape to close, body scroll lock.
- **Lucide icons**: Add new icons to `components/ui/LucideIcons.tsx` as inline SVGs. Do NOT install `lucide-react`.
- **Tailwind classes**: Use project conventions — `input`, `label`, `btn-primary`, `btn-ghost`, `card`, `badge-*`.
- **State lifting**: Keep modal state local to sections (DataSection manages its own modals). Keep shared UI state in `WalletDesignShellV2` (`DesignerUIState`).
- **Type safety**: The project uses strict TypeScript. Run `npx tsc --noEmit` after every file change.
- **File uploads**: Always use `uploadFile()` or `uploadFileWithError()` from `lib/upload.ts`. Never use `FileReader.readAsDataURL()` for production images.

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
              ├── LocationsSection (GPS + iBeacons, fully wired)
              ├── LinksSection (homepage/help + additional links, fully wired)
              ├── BarcodeSection (5-type selector)
              └── AdvancedSection (NFC, sharing, etc.)
```

---

## CONTACT / CONTEXT

- **Previous session plan**: `/Users/macbookpro201916i964gb1tb/.kimi/plans/steel-wolfsbane-jessica-cruz.md`
- **Deployment plan**: `/Users/macbookpro201916i964gb1tb/.kimi/plans/green-lantern-archangel-pantha.md`
- **Docker live changes**: Already working. `web` and `api` containers hot-reload on file changes. Celery workers need manual restart (`docker compose restart celery-pass celery-push celery-default`).
- **Persistent volumes**: All 14 named volumes are configured in `docker-compose.yml`. Data survives `docker compose down`.

---

## FINAL CHECKLIST FOR DEPLOYMENT

- [x] Read this HANDOFF.md fully
- [x] Run `cd frontend && npx tsc --noEmit` to confirm clean build
- [x] Open `http://localhost:33906/programs/1/design` to see current state
- [x] All P0/P1/P2 features implemented
- [x] E2E tests written
- [x] Commit and push to `main`
- [ ] Run production build test (`docker build`)
- [ ] Deploy to `rewards.loyallia.com`
- [ ] Verify health endpoints
- [ ] Smoke-test designer in production

**All feature work is complete. The only remaining step is deployment.**
