# Wallet Pass Studio — Complete Gap Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix ALL identified gaps in the Wallet Pass Studio to achieve 100% SRS compliance with production-quality code. No mocks. No bypasses. No placeholders.

**Architecture:** Backend-first (Django model + API), then frontend types alignment, then UI component rewrites, then visual polish, then integration testing.

**Tech Stack:** Django 5, Django Ninja, PostgreSQL, Next.js 14, React 18, TypeScript strict, Tailwind CSS, lucide-react.

**Branch:** `wallet-studio-complete`
**Worktree:** `/Users/macbookpro201916i964gb1tb/Documents/GitHub/loyallia/.worktrees/wallet-studio-complete`

---

## Dependencies Graph

```
A1 (Template Model) → A2 (Template API) → D2/D3 (Template Frontend)
B1 (Notification Types) → B2 (FieldStudio) → B4 (BarcodeTab)
C1 (ColorsTab) + C2 (ImagesTab) + C3 (Visuals) → E1 (Device Frames)
B3 (Sidebar Tabs) independent
E2 (Canvas Layers) depends on all UI being stable
F1 (Integration) depends on all above
F2/F3 (Quality Gates) final
```

---

## Workstream A: Backend — Template System + Plan Enforcement

### Task A1: WalletTemplate Django Model + Migration

**Files:**
- Create: `backend/apps/wallet/models.py`
- Create: `backend/apps/wallet/migrations/0001_initial.py`
- Modify: `backend/apps/wallet/__init__.py` (if needed)

**Context:** The `apps/wallet/` directory currently has no models. We need a `WalletTemplate` model that stores user-saved templates with full design state.

```python
# backend/apps/wallet/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinLengthValidator, MaxLengthValidator
import uuid

User = get_user_model()


class WalletTemplate(models.Model):
    """User-saved wallet pass template."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="wallet_templates"
    )
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="wallet_templates"
    )
    name = models.CharField(
        max_length=50,
        validators=[MinLengthValidator(2), MaxLengthValidator(50)],
        help_text="Template name (2-50 chars)",
    )
    description = models.CharField(max_length=200, blank=True, default="")
    card_type = models.CharField(
        max_length=30,
        choices=[
            ("stamp", "Stamp"),
            ("cashback", "Cashback"),
            ("coupon", "Coupon"),
            ("vip_membership", "VIP Membership"),
            ("gift_certificate", "Gift Certificate"),
            ("discount", "Discount"),
            ("referral_pass", "Referral Pass"),
            ("affiliate", "Affiliate"),
            ("corporate_discount", "Corporate Discount"),
            ("multipass", "Multipass"),
        ],
    )
    industry = models.CharField(max_length=30, default="retail")
    design_state = models.JSONField(
        help_text="Full WalletStudioState serialized as JSON"
    )
    include_back_content = models.BooleanField(default=True)
    is_favorite = models.BooleanField(default=False)
    usage_count = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    is_system = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True)
    preview_image_url = models.URLField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "wallet_templates"
        ordering = ["-is_favorite", "-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "owner", "name"],
                name="unique_template_name_per_user",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "owner", "is_favorite"]),
            models.Index(fields=["tenant", "card_type"]),
            models.Index(fields=["is_system", "industry"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.card_type})"
```

- [ ] **Step 1:** Write the model file above
- [ ] **Step 2:** Create migration: `cd backend && python manage.py makemigrations wallet`
- [ ] **Step 3:** Verify migration generates correctly
- [ ] **Step 4:** Run ruff check: `cd backend && python -m ruff check apps/wallet/models.py`
- [ ] **Step 5:** Commit

### Task A2: Template CRUD API Endpoints

**Files:**
- Create: `backend/apps/wallet/api.py`
- Modify: `backend/apps/wallet/urls.py` (or create)
- Modify: `backend/loyallia/urls.py` (add wallet router)

**Context:** We need full CRUD for templates with proper auth, tenant isolation, and plan enforcement.

```python
# backend/apps/wallet/api.py
from datetime import datetime
from typing import List
from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.errors import HttpError

from apps.common.auth.jwt_auth import jwt_auth
from apps.wallet.models import WalletTemplate

router = Router(tags=["wallet-templates"])


class WalletTemplateIn(Schema):
    name: str
    description: str = ""
    card_type: str
    industry: str = "retail"
    design_state: dict
    include_back_content: bool = True
    tags: List[str] = []


class WalletTemplateUpdateIn(Schema):
    name: str | None = None
    description: str | None = None
    design_state: dict | None = None
    include_back_content: bool | None = None
    is_favorite: bool | None = None
    tags: List[str] | None = None


class WalletTemplateOut(Schema):
    id: str
    name: str
    description: str
    card_type: str
    industry: str
    include_back_content: bool
    is_favorite: bool
    usage_count: int
    last_used_at: datetime | None
    tags: List[str]
    preview_image_url: str
    created_at: datetime
    updated_at: datetime


@router.get("/templates/", response=List[WalletTemplateOut], auth=jwt_auth)
def list_templates(request):
    user = request.user
    tenant = getattr(request, "tenant", None) or getattr(user, "tenant", None)
    qs = WalletTemplate.objects.filter(tenant=tenant, owner=user)
    return list(qs)


@router.post("/templates/", response=WalletTemplateOut, auth=jwt_auth)
def create_template(request, payload: WalletTemplateIn):
    user = request.user
    tenant = getattr(request, "tenant", None) or getattr(user, "tenant", None)

    # Check for duplicate name
    if WalletTemplate.objects.filter(tenant=tenant, owner=user, name=payload.name).exists():
        raise HttpError(409, "A template with this name already exists.")

    template = WalletTemplate.objects.create(
        tenant=tenant,
        owner=user,
        name=payload.name,
        description=payload.description,
        card_type=payload.card_type,
        industry=payload.industry,
        design_state=payload.design_state,
        include_back_content=payload.include_back_content,
        tags=payload.tags,
    )
    return template


@router.get("/templates/{template_id}/", response=WalletTemplateOut, auth=jwt_auth)
def get_template(request, template_id: str):
    user = request.user
    tenant = getattr(request, "tenant", None) or getattr(user, "tenant", None)
    template = get_object_or_404(
        WalletTemplate, id=template_id, tenant=tenant, owner=user
    )
    return template


@router.patch("/templates/{template_id}/", response=WalletTemplateOut, auth=jwt_auth)
def update_template(request, template_id: str, payload: WalletTemplateUpdateIn):
    user = request.user
    tenant = getattr(request, "tenant", None) or getattr(user, "tenant", None)
    template = get_object_or_404(
        WalletTemplate, id=template_id, tenant=tenant, owner=user
    )

    if payload.name is not None:
        # Check for duplicate name (excluding self)
        if (
            WalletTemplate.objects.filter(tenant=tenant, owner=user, name=payload.name)
            .exclude(id=template_id)
            .exists()
        ):
            raise HttpError(409, "A template with this name already exists.")
        template.name = payload.name
    if payload.description is not None:
        template.description = payload.description
    if payload.design_state is not None:
        template.design_state = payload.design_state
    if payload.include_back_content is not None:
        template.include_back_content = payload.include_back_content
    if payload.is_favorite is not None:
        template.is_favorite = payload.is_favorite
    if payload.tags is not None:
        template.tags = payload.tags

    template.save()
    return template


@router.delete("/templates/{template_id}/", auth=jwt_auth)
def delete_template(request, template_id: str):
    user = request.user
    tenant = getattr(request, "tenant", None) or getattr(user, "tenant", None)
    template = get_object_or_404(
        WalletTemplate, id=template_id, tenant=tenant, owner=user
    )
    template.delete()
    return {"success": True}


@router.post("/templates/{template_id}/use/", response=WalletTemplateOut, auth=jwt_auth)
def use_template(request, template_id: str):
    user = request.user
    tenant = getattr(request, "tenant", None) or getattr(user, "tenant", None)
    template = get_object_or_404(
        WalletTemplate, id=template_id, tenant=tenant, owner=user
    )
    template.usage_count += 1
    template.last_used_at = datetime.now()
    template.save(update_fields=["usage_count", "last_used_at"])
    return template
```

- [ ] **Step 1:** Write the API file above
- [ ] **Step 2:** Wire router into main URLs
- [ ] **Step 3:** Run ruff check
- [ ] **Step 4:** Commit

### Task A3: Plan Enforcement Decorators on AI Endpoints

**Files:**
- Modify: `backend/apps/ai/views.py`
- Modify: `backend/apps/ai/services/cost_tracker.py`

**Context:** Add `@require_feature("ai_assistant")` and `@enforce_limit("ai_queries_month")` to all AI endpoints. Add budget blocking.

- [ ] **Step 1:** Read existing `backend/apps/ai/views.py` to understand current decorators
- [ ] **Step 2:** Add feature/limit decorators to all 4 AI endpoints
- [ ] **Step 3:** Add `budget_check()` method to cost_tracker
- [ ] **Step 4:** Run ruff check
- [ ] **Step 5:** Commit

---

## Workstream B: Frontend — Types + Core UI Rewrite

### Task B1: Refactor Notification Data Model (Structured)

**Files:**
- Modify: `frontend/src/components/wallet/types/unified-field.ts`
- Modify: `frontend/src/components/wallet/studio/NotificationConfigPanel.tsx` (complete rewrite)
- Modify: `frontend/src/components/wallet/studio/FieldCard.tsx`
- Modify: `frontend/src/components/wallet/utils/field-mappers.ts`
- Modify: `frontend/src/components/wallet/migrations/v1-to-v2.ts`
- Modify: `frontend/src/components/wallet/migrations/v2-to-v1.ts`

**Context:** Convert flat string notifications to structured objects per SRS-010 §7.

```typescript
// frontend/src/components/wallet/types/unified-field.ts
// REPLACE the FieldNotifications interface:

export interface AppleChangeMessageConfig {
  enabled: boolean;
  message: string; // ~120 char max
}

export interface GoogleMessageConfig {
  enabled: boolean;
  header: string;
  body: string;
  trigger: 'onChange' | 'scheduled' | 'beforeExpiry';
  daysBeforeExpiry?: number;
  durationDays?: number; // default 7
}

export interface FieldNotifications {
  appleChangeMessage?: AppleChangeMessageConfig;
  googleMessage?: GoogleMessageConfig;
}
```

Update `createDefaultField()` to use new structure:
```typescript
notifications: {
  appleChangeMessage: {
    enabled: false,
    message: '',
  },
  googleMessage: {
    enabled: false,
    header: '',
    body: '',
    trigger: 'onChange',
    durationDays: 7,
  },
}
```

- [ ] **Step 1:** Update types
- [ ] **Step 2:** Update v1-to-v2 migration to convert flat strings to structured
- [ ] **Step 3:** Update v2-to-v1 migration for backward compat
- [ ] **Step 4:** Rewrite NotificationConfigPanel with structured UI
- [ ] **Step 5:** Update FieldCard to show notification indicators
- [ ] **Step 6:** Update field-mappers to handle new structure
- [ ] **Step 7:** Add i18n strings for all new labels
- [ ] **Step 8:** Commit

### Task B2: FieldStudio Inline Editing (Remove Modal)

**Files:**
- Modify: `frontend/src/components/wallet/studio/FieldStudio.tsx`
- Modify: `frontend/src/components/wallet/studio/FieldCard.tsx` (major rewrite)
- Delete: `frontend/src/components/wallet/studio/FieldEditorModal.tsx` (or deprecate)

**Context:** Per SRS-003 §8.3, each field should be EXPANDED inline with all controls visible. Remove the modal editing pattern.

Requirements for inline FieldCard:
- Drag handle [⋮⋮] on left
- Checkbox [✓] to show/hide field
- Label input (text)
- Value input (text) with [📋 Plantillas ▼] dropdown for dynamic templates
- Data type selector (text/date/number/currency/url/phone/email)
- [✓] Dinámico toggle
- Apple [🍎✓] / Google [🤖✓] visibility toggles
- [🔔] Notification toggle (opens inline notification config)
- [🗑️] delete button
- For primary field: text alignment selector [ Izquierda ●] [Centro ○] [Derecha ○]

```tsx
// Key structure for expanded FieldCard:
<div className="field-card-expanded border rounded-lg p-3 bg-white dark:bg-neutral-900">
  {/* Row 1: Drag handle + Visibility + Label + Actions */}
  <div className="flex items-center gap-2">
    <span className="cursor-grab text-neutral-400">⋮⋮</span>
    <input type="checkbox" checked={field.showOnApple || field.showOnGoogle} />
    <input className="flex-1" value={field.label} placeholder="Etiqueta" />
    <button onClick={toggleNotifications}>🔔</button>
    <button onClick={deleteField}>🗑️</button>
  </div>
  {/* Row 2: Value + Template picker */}
  <div className="flex items-center gap-2 mt-2">
    <input className="flex-1" value={field.value} placeholder="Valor" />
    <DynamicTemplatePicker />
  </div>
  {/* Row 3: Data type + Dynamic + Platform toggles */}
  <div className="flex items-center gap-2 mt-2 text-xs">
    <select value={field.dataType}>...</select>
    <label><input type="checkbox" checked={field.isDynamic} /> Dinámico</label>
    <label><input type="checkbox" checked={field.showOnApple} /> 🍎</label>
    <label><input type="checkbox" checked={field.showOnGoogle} /> 🤖</label>
  </div>
  {/* Expanded: Notification config (conditional) */}
  {showNotifications && <NotificationConfigPanel field={field} />}
</div>
```

- [ ] **Step 1:** Rewrite FieldCard as expanded inline card
- [ ] **Step 2:** Update FieldStudio to use new FieldCard (remove modal logic)
- [ ] **Step 3:** Add drag-and-drop reordering within groups
- [ ] **Step 4:** Add all i18n strings
- [ ] **Step 5:** Test visually in browser
- [ ] **Step 6:** Commit

### Task B3: StudioSidebar Dynamic Card-Type Tabs

**Files:**
- Modify: `frontend/src/components/wallet/studio/StudioSidebar.tsx`

**Context:** Tab labels must change based on selected card type per SRS-003 §4.

```typescript
const CARD_TYPE_TAB_LABELS: Record<CardType, string> = {
  stamp: 'Sellos',
  cashback: 'Puntos',
  coupon: 'Cupón',
  discount: 'Descuento',
  gift_certificate: 'Regalo',
  vip_membership: 'VIP',
  affiliate: 'Afiliado',
  corporate_discount: 'Corp',
  referral_pass: 'Referido',
  multipass: 'Multi',
};
```

Tab strip should be: `[🖼️ Img] [🎯 Sellos] [📝 Cont] [📄 Rev] [📊 Bar] [🎨 Cols] [⚙️]`
(where Sellos changes per card type)

- [ ] **Step 1:** Add dynamic tab label mapping
- [ ] **Step 2:** Remove debug info block
- [ ] **Step 3:** Remove temporary quick actions
- [ ] **Step 4:** Add i18n strings
- [ ] **Step 5:** Commit

### Task B4: BarcodeTab Visual Grid Selector

**Files:**
- Modify: `frontend/src/components/wallet/studio/BarcodeTab.tsx`

**Context:** Replace dropdown with visual grid of 4 barcode format cards per SRS-003 §8.4.

```tsx
const BARCODE_FORMATS = [
  { id: 'qr', name: 'QR Code', ascii: '┌──────┐\n│▓▓▓▓▓▓│\n│▓▓  ▓▓│\n│▓▓▓▓▓▓│\n└──────┘' },
  { id: 'aztec', name: 'Aztec', ascii: '┌──────┐\n│▓▓  ▓▓│\n│  ▓▓  │\n│▓▓  ▓▓│\n└──────┘' },
  { id: 'pdf417', name: 'PDF417', ascii: '┌──────┐\n│░░░░░░│\n│░░  ░░│\n│░░░░░░│\n└──────┘' },
  { id: 'code128', name: 'Code 128', ascii: '┌──────┐\n│123ABC│\n│      │\n│      │\n└──────┘' },
];
```

- [ ] **Step 1:** Create visual grid component with 4 cards
- [ ] **Step 2:** Add radio selection within grid
- [ ] **Step 3:** Add platform warnings inline (rectangular formats)
- [ ] **Step 4:** Add data builder checkboxes
- [ ] **Step 5:** Add i18n strings
- [ ] **Step 6:** Commit

---

## Workstream C: Frontend — Visual Polish Components

### Task C1: ColorsTab Inline Picker + Contrast Bar

**Files:**
- Modify: `frontend/src/components/wallet/studio/ColorsTab.tsx`

**Context:** Add inline color picker with hex readout, RGB conversion, contrast progress bar per SRS-003 §8.5.

Requirements:
- Color input with inline picker: "Fondo: ████████ #1A1A2E [Color picker ▼]"
- RGB readout: "Apple: rgb(255,255,255) → Google: #FFFFFF"
- Contrast section with progress bar: "Texto vs Fondo: ████████░░ 12.5:1 ✓ AAA"
- Preset swatches in visible grid (8+ at once)
- "[✨ Sugerir colores con IA]" button
- "[+ Guardar como preset de color]" button

- [ ] **Step 1:** Add inline color input with native picker
- [ ] **Step 2:** Add RGB readout with Apple/Google format
- [ ] **Step 3:** Add contrast progress bar with AA/AAA indicators
- [ ] **Step 4:** Add visible preset swatches grid
- [ ] **Step 5:** Add i18n strings
- [ ] **Step 6:** Commit

### Task C2: ImagesTab Crop Preview (Apple Rect / Google Circle)

**Files:**
- Modify: `frontend/src/components/wallet/studio/ImagesTab.tsx`

**Context:** Show 3 preview panes after upload per SRS-003 §8.1.

Requirements:
- After logo upload, show 3 previews side-by-side:
  - Apple Rect: "160×50pt" — rectangular preview
  - Google Circle: "660×660px" — circular mask preview
  - Original: "Full size" — full image preview
- Auto-generate @2x/@3x checkbox: "[✓] Auto-generar @2x y @3x para Apple"
- Action buttons: "[🗑️ Eliminar] [🔄 Reemplazar] [✨ Mejorar con IA]"
- Section 2: "🖼️ IMAGEN PRINCIPAL (Strip / Hero)" with wide upload zone
- Section 3: "🎨 IMÁGENES ADICIONALES" with:
  - [+ Icono Apple] — "29×29pt, mostrado en notificaciones"
  - [+ Miniatura] — "90×90pt, junto a los campos"
  - [+ Fondo] — "180×220pt, imagen de fondo difuminada"
  - [+ Wide Logo] — "1032×150px, logo extendido"

- [ ] **Step 1:** Add 3-preview pane layout for logo
- [ ] **Step 2:** Add CSS masks (rect for Apple, circle for Google)
- [ ] **Step 3:** Add @2x/@3x checkbox
- [ ] **Step 4:** Restructure sections per spec
- [ ] **Step 5:** Add i18n strings
- [ ] **Step 6:** Commit

### Task C3: Card Type Visual Decorations in Previews

**Files:**
- Modify: `frontend/src/components/wallet/AppleWalletPreview.tsx`
- Modify: `frontend/src/components/wallet/GoogleWalletPreview.tsx`
- Create: `frontend/src/components/wallet/preview-decorations.tsx`

**Context:** Add SVG/CSS visual decorations to phone mockups per SRS-006.

Per-card-type decorations:
| Card Type | Visual Element |
|-----------|---------------|
| Stamp | Stamp circle grid (empty/filled circles) |
| Cashback | Coin icon + progress bar |
| Coupon | Scissors cut line + discount burst |
| VIP | Crown/seal SVG + badge shape |
| Gift | Ribbon/bow SVG + box graphic |
| Discount | Tier badge ring + sale burst |
| Referral | Progress ring + friend counter |
| Affiliate | Referral banner + success indicator |
| Corporate | Employee badge frame + company bar |
| Multipass | Session counter + ticket visual |

```tsx
// Example stamp decoration:
function StampGridDecoration({ current, total, color }: { current: number; total: number; color: string }) {
  return (
    <div className="flex flex-wrap gap-1 justify-center py-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-6 h-6 rounded-full border-2 ${i < current ? 'bg-current' : 'bg-transparent'}`}
          style={{ borderColor: color, color: color }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 1:** Create decoration components for each card type
- [ ] **Step 2:** Integrate into AppleWalletPreview
- [ ] **Step 3:** Integrate into GoogleWalletPreview
- [ ] **Step 4:** Add i18n strings
- [ ] **Step 5:** Commit

---

## Workstream D: Frontend — Template Gallery (3 Tabs)

### Task D1: TemplateGallery 3-Tab Refactor

**Files:**
- Modify: `frontend/src/components/wallet/studio/TemplateGallery.tsx`

**Context:** Add 3 tabs: 🏢 Sistema | ⭐ Mis Plantillas | ✨ Generadas por IA

Tab 1 (Sistema):
- Current behavior but with real pass preview (not CSS placeholder)
- Side-by-side iPhone + Pixel preview in modal

Tab 2 (Mis Plantillas):
- Fetch from backend API
- CRUD: rename, duplicate, delete (with confirmation)
- ⭐ Favorite toggle
- Usage count badge
- Empty state: "No tienes plantillas guardadas"
- Context menu (⋮) on each card

Tab 3 (Generadas por IA):
- Shows last AI generation results (3 variations)
- "Guardar como mi plantilla" → moves to Mis Plantillas
- Auto-delete after 7 days if not saved

- [ ] **Step 1:** Add tab navigation component
- [ ] **Step 2:** Refactor System tab with proper preview
- [ ] **Step 3:** Build Mis Plantillas tab with CRUD
- [ ] **Step 4:** Build Generadas por IA tab
- [ ] **Step 5:** Add i18n strings
- [ ] **Step 6:** Commit

### Task D2: SaveTemplateModal Backend Integration

**Files:**
- Modify: `frontend/src/components/wallet/studio/SaveTemplateModal.tsx`

**Context:** Currently fires callback to nowhere. Must call backend API.

Requirements:
- Name input (2-50 chars, unique per user)
- Description input (max 200 chars)
- Card type selector (read-only from current design)
- Industry selector (read-only from current design)
- Side-by-side preview (auto-generated)
- "Incluir contenido del reverso" checkbox
- Auto-naming: "{Program Name} — {Card Type Label}"
- Call POST /api/v1/wallet/templates/ on save

- [ ] **Step 1:** Add form validation
- [ ] **Step 2:** Wire to backend API service
- [ ] **Step 3:** Add preview generation
- [ ] **Step 4:** Add i18n strings
- [ ] **Step 5:** Commit

### Task D3: Template Backend API Service (Frontend)

**Files:**
- Create: `frontend/src/lib/api/templates.ts`

**Context:** Frontend service to call backend template endpoints.

```typescript
export async function fetchTemplates(): Promise<WalletTemplate[]> { ... }
export async function createTemplate(payload: CreateTemplatePayload): Promise<WalletTemplate> { ... }
export async function updateTemplate(id: string, payload: UpdateTemplatePayload): Promise<WalletTemplate> { ... }
export async function deleteTemplate(id: string): Promise<void> { ... }
export async function useTemplate(id: string): Promise<WalletTemplate> { ... }
```

- [ ] **Step 1:** Create service with all CRUD methods
- [ ] **Step 2:** Add error handling
- [ ] **Step 3:** Add TypeScript types
- [ ] **Step 4:** Commit

---

## Workstream E: Canvas & Device Frames

### Task E1: Device Frames (iPhone 15 Pro / Pixel 8)

**Files:**
- Modify: `frontend/src/components/wallet/studio/StudioCanvas.tsx`
- Modify: `frontend/src/components/wallet/DeviceFrame.tsx`

**Context:** Wrap preview cards in realistic device frames per SRS-003.

Requirements:
- iPhone 15 Pro frame: rounded corners, dynamic island notch, thin bezel
- Pixel 8 frame: rounded corners, camera hole punch, different bezel
- Platform toggle switches between frames
- Both view shows side-by-side

- [ ] **Step 1:** Verify/enhance DeviceFrame component
- [ ] **Step 2:** Integrate into StudioCanvas
- [ ] **Step 3:** Add zoom scaling that affects content not frame
- [ ] **Step 4:** Commit

### Task E2: Canvas Layer System (Draggable)

**Files:**
- Modify: `frontend/src/components/wallet/studio/StudioCanvas.tsx`
- Create: `frontend/src/components/wallet/studio/DraggableLayer.tsx`

**Context:** Make logo, hero image, and fields draggable within the canvas per SRS-003 Principle 5.

Requirements:
- Logo layer: draggable, resize handles
- Hero image layer: draggable, resize handles
- Field layers: draggable for repositioning
- Arrow keys nudge selected layer (1px, Shift+10px)
- Grid toggle (Ctrl/Cmd+G) shows alignment grid
- Snap-to-grid option

- [ ] **Step 1:** Create DraggableLayer component
- [ ] **Step 2:** Add to StudioCanvas for logo and hero
- [ ] **Step 3:** Add resize handles
- [ ] **Step 4:** Add grid overlay
- [ ] **Step 5:** Commit

---

## Workstream F: Integration & Quality Gates

### Task F1: Integration — Wire All Components

**Files:**
- Modify: `frontend/src/components/wallet/studio/WalletStudio.tsx`
- Modify: `frontend/src/app/(dashboard)/programs/[id]/design/page.tsx`

**Context:** Ensure all new components are properly wired together.

- [ ] **Step 1:** Verify all imports are correct
- [ ] **Step 2:** Verify state flows correctly through all components
- [ ] **Step 3:** Verify keyboard shortcuts still work
- [ ] **Step 4:** Verify design score updates correctly
- [ ] **Step 5:** Commit

### Task F2: Quality Gates

**Backend:**
```bash
cd backend && python -m ruff check .
cd backend && python -m pytest -q
```

**Frontend:**
```bash
cd frontend && npm run typecheck 2>&1 | grep -E "(error|wallet)" | head -50
cd frontend && npm run test:unit -- --run 2>&1 | tail -30
```

- [ ] **Step 1:** Run ruff, fix all errors
- [ ] **Step 2:** Run pytest, fix or document failures
- [ ] **Step 3:** Run typecheck, fix wallet-studio errors
- [ ] **Step 4:** Run unit tests, fix failures
- [ ] **Step 5:** Commit

### Task F3: Final Review

- [ ] **Step 1:** Spec compliance review: verify all SRS requirements met
- [ ] **Step 2:** Code quality review: no mocks, no placeholders, no hardcoded values
- [ ] **Step 3:** UI/UX review: all text in Spanish, no scroll issues, all interactive
- [ ] **Step 4:** Commit final

---

## i18n Strings to Add

Add these keys to `frontend/src/lib/i18n/locales/es.json` (and en.json, de.json, fr.json):

```json
{
  "wallet.studio.sidebar.tab.stamp": "Sellos",
  "wallet.studio.sidebar.tab.cashback": "Puntos",
  "wallet.studio.sidebar.tab.coupon": "Cupón",
  "wallet.studio.sidebar.tab.discount": "Descuento",
  "wallet.studio.sidebar.tab.gift": "Regalo",
  "wallet.studio.sidebar.tab.vip": "VIP",
  "wallet.studio.sidebar.tab.affiliate": "Afiliado",
  "wallet.studio.sidebar.tab.corporate": "Corp",
  "wallet.studio.sidebar.tab.referral": "Referido",
  "wallet.studio.sidebar.tab.multipass": "Multi",
  "wallet.studio.field.dragHandle": "Arrastrar para reordenar",
  "wallet.studio.field.visible": "Visible",
  "wallet.studio.field.dynamic": "Dinámico",
  "wallet.studio.field.showOnApple": "Mostrar en Apple",
  "wallet.studio.field.showOnGoogle": "Mostrar en Google",
  "wallet.studio.field.notifications": "Notificaciones",
  "wallet.studio.field.alignLeft": "Izquierda",
  "wallet.studio.field.alignCenter": "Centro",
  "wallet.studio.field.alignRight": "Derecha",
  "wallet.studio.notification.appleTitle": "Mensaje de cambio (Apple)",
  "wallet.studio.notification.googleHeader": "Encabezado (Google)",
  "wallet.studio.notification.googleBody": "Cuerpo del mensaje",
  "wallet.studio.notification.trigger": "Disparador",
  "wallet.studio.notification.trigger.onChange": "Al cambiar",
  "wallet.studio.notification.trigger.scheduled": "Programado",
  "wallet.studio.notification.trigger.beforeExpiry": "Antes de expirar",
  "wallet.studio.notification.daysBeforeExpiry": "Días antes de expirar",
  "wallet.studio.notification.durationDays": "Duración (días)",
  "wallet.studio.barcode.qrCode": "QR Code",
  "wallet.studio.barcode.aztec": "Aztec",
  "wallet.studio.barcode.pdf417": "PDF417",
  "wallet.studio.barcode.code128": "Code 128",
  "wallet.studio.barcode.rectangularWarning": "⚠️ PDF417 y Code 128 son rectangulares y reducen el espacio disponible para campos",
  "wallet.studio.images.appleRect": "Apple Rect",
  "wallet.studio.images.googleCircle": "Google Circle",
  "wallet.studio.images.original": "Original",
  "wallet.studio.images.autoGenerateRetina": "Auto-generar @2x y @3x para Apple",
  "wallet.studio.images.replace": "Reemplazar",
  "wallet.studio.images.enhanceWithAI": "Mejorar con IA",
  "wallet.studio.colors.rgbReadout": "Apple: {appleRgb} → Google: {googleHex}",
  "wallet.studio.colors.contrastLabel": "Texto vs Fondo",
  "wallet.studio.colors.aaPass": "✓ AA",
  "wallet.studio.colors.aaaPass": "✓ AAA",
  "wallet.studio.colors.fail": "✗ Falla",
  "wallet.studio.colors.savePreset": "Guardar como preset",
  "wallet.studio.designScore.suggestions": "Ver sugerencias de mejora →",
  "wallet.studio.template.myTemplates": "Mis Plantillas",
  "wallet.studio.template.aiGenerated": "Generadas por IA",
  "wallet.studio.template.noMyTemplates": "No tienes plantillas guardadas",
  "wallet.studio.template.emptyState.create": "Crea tu primera plantilla",
  "wallet.studio.template.favorite": "Favorito",
  "wallet.studio.template.usageCount": "Usada {count} veces",
  "wallet.studio.template.saveAsMine": "Guardar como mi plantilla",
  "wallet.studio.template.autoDeleteWarning": "Se eliminará automáticamente en 7 días si no se guarda"
}
```

---

## SPEC COVERAGE CHECKLIST

After all tasks complete, verify these SRS sections are fully implemented:

- [ ] SRS-001 §All — State management with metadata serialization
- [ ] SRS-002 §All — 10 card types with correct configurations
- [ ] SRS-003 §4 — Sidebar with dynamic tabs
- [ ] SRS-003 §5 — Canvas with device frames
- [ ] SRS-003 §6 — Toolbar with 3 rows, score, AI button
- [ ] SRS-003 §8.1 — Images tab with crop preview
- [ ] SRS-003 §8.2 — Card type tabs with visual decorations
- [ ] SRS-003 §8.3 — Inline field editing (no modal)
- [ ] SRS-003 §8.4 — Barcode visual grid selector
- [ ] SRS-003 §8.5 — Colors tab with inline picker + contrast
- [ ] SRS-003 §8.6 — Advanced tab
- [ ] SRS-003 §8.7 — Back design tab
- [ ] SRS-003 §10 — Design score panel with suggestions
- [ ] SRS-003 §11 — All 17 keyboard shortcuts
- [ ] SRS-006 §All — Card type visual customizations
- [ ] SRS-007 §All — AI integration (already done)
- [ ] SRS-008 §All — Back of pass design
- [ ] SRS-009 §All — 3-tab template gallery with CRUD
- [ ] SRS-010 §All — Structured notifications
- [ ] SRS-011 §All — Plan enforcement
