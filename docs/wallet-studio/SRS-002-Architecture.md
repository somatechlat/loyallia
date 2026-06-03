# SRS-002: Architecture & State Management

> **ISO/IEC/IEEE 29148:2018 — Software Requirements Specification**
> Document ID: SRS-LOY-WPS-001 | Version: 1.0.0-Draft

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [New Wizard Flow](#2-new-wizard-flow)
3. [Component Architecture](#3-component-architecture)
4. [Unified State Model](#4-unified-state-model)
5. [Smart Image Pipeline](#5-smart-image-pipeline)
6. [Design Quality Score](#6-design-quality-score)

---

## 1. Design Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│  PRINCIPLE 1: DESIGN-FIRST, NOT CONFIG-FIRST                    │
│  → The canvas IS the configuration. Every visual element is     │
│    editable directly on the pass preview.                       │
├─────────────────────────────────────────────────────────────────┤
│  PRINCIPLE 2: UNIFIED DUAL-PLATFORM                             │
│  → Design once, see both Apple and Google simultaneously.       │
│    Platform differences are handled transparently.              │
├─────────────────────────────────────────────────────────────────┤
│  PRINCIPLE 3: PROGRESSIVE DISCLOSURE                            │
│  → Basics visible, advanced hidden. Power users can expand.     │
├─────────────────────────────────────────────────────────────────┤
│  PRINCIPLE 4: SMART DEFAULTS                                    │
│  → Every card type starts with a complete, usable design.       │
│    Users modify, not create from scratch.                       │
├─────────────────────────────────────────────────────────────────┤
│  PRINCIPLE 5: CANVAS-LIKE INTERACTION                           │
│  → Drag, drop, resize, reposition like Canva/Illustrator.       │
│    Direct manipulation over form fields.                        │
├─────────────────────────────────────────────────────────────────┤
│  PRINCIPLE 6: IMMEDIATE VISUAL FEEDBACK                         │
│  → Every change reflects instantly. No scrolling to preview.    │
├─────────────────────────────────────────────────────────────────┤
│  PRINCIPLE 7: TEMPLATE-DRIVEN                                   │
│  → Industry templates with complete designs. Start from         │
│    professional designs, not blank canvases.                    │
├─────────────────────────────────────────────────────────────────┤
│  PRINCIPLE 8: AI-AUGMENTED                                      │
│  → AI assists, never replaces. User is always in control.       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. New Wizard Flow

```
New Program Wizard (5 steps)
│
├── Step 0: Choose Card Type ← EXISTING
│   ├── 10 card type cards with icons
│   └── Hover preview of default pass
│
├── Step 1: Configure Rules ← EXISTING  
│   ├── Type-specific configuration (stamps, cashback %, tiers)
│   └── FormBuilder for custom fields
│
├── Step 2: Name, Description, Basics ← SIMPLIFIED
│   ├── Program name
│   ├── Description
│   ├── Colors (background, text, accent)
│   └── Locations/geofences
│
├── Step 3: WALLET PASS STUDIO ← NEW
│   ├── Template Gallery (optional entry point)
│   ├── Canvas-based Designer
│   ├── Dual-Platform Preview
│   ├── Smart Image Upload
│   ├── Visual Field Editor
│   ├── Barcode Configuration
│   ├── AI Assistant (✨ Diseñar con IA)
│   └── Design Quality Score
│
├── Step 4: Review & Launch ← ENHANCED
│   ├── Side-by-side Apple + Google preview
│   ├── Program summary
│   └── Launch button
│
└── Step 5: Success / QR Code ← EXISTING
```

---

## 3. Component Architecture

```
WalletPassStudio (main container)
├── WalletStudioToolbar
│   ├── Undo/Redo buttons
│   ├── Platform visibility toggle (Apple | Google | Both)
│   ├── Zoom controls (50% → 200%)
│   ├── Template button
│   ├── Save preset button
│   ├── ✨ AI Assistant button
│   └── Design score indicator
│
├── WalletStudioCanvas (left/main area)
│   ├── CanvasGrid (snap-to-grid overlay, optional)
│   ├── PassFrame (Apple iPhone 15 Pro or Google Pixel 7)
│   │   ├── PassLayer — Logo
│   │   ├── PassLayer — Hero/Strip Image
│   │   ├── PassLayer — Header Fields
│   │   ├── PassLayer — Primary Field
│   │   ├── PassLayer — Secondary Fields
│   │   ├── PassLayer — Auxiliary Fields
│   │   ├── PassLayer — Barcode
│   │   └── PassLayer — Background
│   └── SelectionOverlay (when element selected)
│       ├── Resize handles (8 corners)
│       ├── Rotation handle
│       └── Delete button
│
├── WalletStudioSidebar (right panel, collapsible)
│   ├── Tab: Templates
│   ├── Tab: Images
│   ├── Tab: Content
│   ├── Tab: Barcode
│   ├── Tab: Colors
│   └── Tab: Advanced (collapsed)
│
├── WalletStudioBottomPanel
│   └── DesignQualityScore
│
└── TemplateGalleryModal (overlay)
    ├── AI-generated suggestions
    ├── Category filters
    └── Template cards
```

---

## 4. Unified State Model

### 4.1 Canvas Layer System

```typescript
interface CanvasLayer {
  id: string;
  type: 'image' | 'text' | 'barcode' | 'shape';
  x: number;        // 0-100 (% of pass width)
  y: number;        // 0-100 (% of pass height)
  width: number;    // 0-100 (% of pass width)
  height: number;   // 0-100 (% of pass height)
  rotation: number; // degrees
  zIndex: number;
  visible: boolean;
  locked: boolean;
}

interface ImageLayer extends CanvasLayer {
  type: 'image';
  imageType: 'logo' | 'hero' | 'thumbnail' | 'background' | 'footer';
  sourceUrl: string;
  sourceUrl2x?: string;
  sourceUrl3x?: string;
  crop?: { x: number; y: number; width: number; height: number };
  fit: 'cover' | 'contain' | 'fill';
  platformOverride?: { apple?: string; google?: string };
}

interface TextLayer extends CanvasLayer {
  type: 'text';
  fieldPath: string;
  label: string;
  value: string;
  textStyle: {
    fontSize: number;
    fontWeight: 'normal' | 'bold' | 'black';
    color: string;
    alignment: 'left' | 'center' | 'right';
    textTransform: 'none' | 'uppercase';
  };
  dynamic: boolean;
  changeMessage?: string;
}

interface BarcodeLayer extends CanvasLayer {
  type: 'barcode';
  format: 'qr_code' | 'pdf417' | 'aztec' | 'code_128' | 'data_matrix';
  message: string;
  altText: string;
  showOnFront: boolean;
  showOnBack: boolean;
}

// Back Content Interfaces (NEW)
interface BackField {
  id: string;
  label: string;
  value: string;
  isLink: boolean;
  linkUrl?: string;
  linkType?: 'web' | 'email' | 'phone' | 'custom';
  order: number;
}

interface BackLink {
  id: string;
  type: 'website' | 'phone' | 'email' | 'instagram' | 'facebook' | 'custom';
  url: string;
  label: string;
  icon?: string;
}

interface DetailImage {
  id: string;
  sourceUrl: string;
  description: string;
}
```

### 4.2 Complete Studio State

```typescript
interface WalletPassStudioState {
  version: 2;
  
  // Canvas Layers (unified, platform-agnostic)
  layers: (ImageLayer | TextLayer | BarcodeLayer)[];

  // Back / Reverse Content (NEW — unified, platform-specific rendering)
  backContent: {
    fields: BackField[];
    links: BackLink[];
    appLink?: {
      appleUrl?: string;
      googleAndroidAppId?: string;
      googleIosAppUrl?: string;
      googleWebUrl?: string;
    };
    detailImages?: DetailImage[];
  };
  
  // Shared Configuration
  colors: {
    background: string;   // #RRGGBB
    text: string;         // #RRGGBB
    accent: string;       // #RRGGBB
    label: string;        // #RRGGBB (iOS 18+)
  };
  
  // Program Info (from Step 2)
  programName: string;
  programDescription: string;
  cardType: string;
  
  // Back / Reverse Content (NEW — unified, platform-specific rendering)
  backContent: {
    fields: BackField[];        // Apple backFields / Google textModulesData
    links: BackLink[];          // Quick links (both platforms)
    appLink?: {
      appleUrl?: string;        // appLaunchURL
      googleAndroidAppId?: string;
      googleIosAppUrl?: string;
      googleWebUrl?: string;
    };
    detailImages?: DetailImage[]; // Google-only: images in details view
  };

  // Platform Config (auto-generated from layers)
  platform: {
    apple: {
      passStyle: 'storeCard' | 'coupon' | 'generic';
      fields: { headerFields; primaryFields; secondaryFields; auxiliaryFields; backFields };
      images: { icon; logo; strip; thumbnail; background; footer };
      nfc?: { enabled; requiresAuthentication; message? };
      suppressStripShine: boolean;
      sharingProhibited: boolean;
      voided: boolean;
      expirationDate?: string;
    };
    google: {
      passType: 'LoyaltyClass' | 'OfferClass' | 'GiftCardClass';
      cardTemplateOverride: { cardRowTemplateInfos: GoogleFieldRow[] };
      detailsTemplateOverride: { detailsItemInfos: GoogleDetailItem[] }; // NEW
      images: { programLogo; heroImage; wideLogo; imageModule };
      reviewStatus: 'UNDER_REVIEW' | 'approved' | 'rejected';
      allowMultipleUsers: 'ONE_USER_ALL_DEVICES' | 'ONE_USER_ONE_DEVICE' | 'MULTIPLE_USERS';
      homepageUri?: string;
      helpUri?: string;
    };
  };
  
  // Shared Metadata
  locations: WalletLocation[];
  beacons: WalletBeacon[];
  links: WalletLink[];
  
  // Studio UI State (not persisted)
  ui: {
    selectedLayerId: string | null;
    zoom: number;
    visiblePlatforms: ('apple' | 'google')[];
    activeTab: 'templates' | 'images' | 'content' | 'barcode' | 'colors' | 'advanced' | 'back'; // NEW: 'back' tab
    showGrid: boolean;
    snapToGrid: boolean;
    gridSize: number;
    showBack: boolean; // NEW: front/back flip toggle
  };
  
  // Template Info
  appliedTemplateId?: string;
  isModified: boolean;
}
```

### 4.3 Undo/Redo System

```typescript
interface HistoryState {
  past: WalletPassStudioState[];
  present: WalletPassStudioState;
  future: WalletPassStudioState[];
}

// Actions that trigger history snapshots:
const HISTORY_ACTIONS = [
  'LAYER_ADD', 'LAYER_REMOVE', 'LAYER_MOVE', 'LAYER_RESIZE',
  'LAYER_UPDATE', 'COLOR_CHANGE', 'TEMPLATE_APPLY', 'FIELD_ADD',
  'FIELD_REMOVE', 'FIELD_REORDER', 'IMAGE_UPLOAD', 'BARCODE_CHANGE',
] as const;

// Debounced: 500ms after last action before snapshot
// Max history: 50 states
```

### 4.4 Auto-Save

```typescript
// Auto-save to parent wizard every 2 seconds of inactivity
const AUTO_SAVE_DEBOUNCE = 2000;

// Save triggers:
// 1. Debounced after any change
// 2. Before unmount (useEffect cleanup)
// 3. Before navigation (beforeunload event)
// 4. On explicit "Save Draft" button
```

### 4.5 State Migration (v1 → v2)

```typescript
function migrateWalletDesignState_v1_to_v2(
  old: WalletDesignState
): WalletPassStudioState {
  return {
    version: 2,
    layers: convertOldImagesToLayers(old) + convertOldFieldsToLayers(old),
    colors: {
      background: extractBackgroundColor(old),
      text: extractTextColor(old),
      accent: '#E2E8F0',
      label: '#FFFFFF',
    },
    programName: '',
    programDescription: '',
    cardType: inferCardType(old),
    platform: {
      apple: buildAppleConfig(old),
      google: buildGoogleConfig(old),
    },
    backContent: {
      fields: convertOldFieldsToBackFields(old),  // NEW: migrate old back content
      links: old.links || [],
      appLink: old.appLaunchURL ? { appleUrl: old.appLaunchURL } : undefined,
      detailImages: [],
    },
    locations: old.locations,
    beacons: old.beacons,
    links: old.links,
    ui: {
      selectedLayerId: null,
      zoom: 1.0,
      visiblePlatforms: ['apple', 'google'],
      activeTab: 'content',
      showGrid: false,
      snapToGrid: true,
      gridSize: 10,
      showBack: false,  // NEW
    },
    isModified: false,
  };
}
```

---

## 5. Smart Image Pipeline

```
User uploads ONE high-resolution image (PNG/JPG, min 1200px width)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT-SIDE (immediate feedback)                                        │
│  ├── Validate: file type, size (<5MB), dimensions (min 320px)           │
│  ├── Show immediate preview on canvas                                   │
│  └── Display dimension warning if image is too small                    │
└─────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SERVER-SIDE (background processing)                                     │
│  ├── Generate @2x variant (2x base dimensions)                          │
│  ├── Generate @3x variant (3x base dimensions)                          │
│  ├── Optimize file size (TinyPNG/Squoosh)                               │
│  ├── Store in S3/MinIO with versioned path                              │
│  └── Return URLs for all variants                                       │
└─────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PLATFORM-SPECIFIC CONVERSIONS                                           │
│  ├── Apple: Logo (rect), Strip (full-width), Icon (square, no trans)   │
│  └── Google: Logo (square, 15% margin), Hero (3.07:1 banner)           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Design Quality Score

```typescript
const DESIGN_QUALITY_CHECKS = [
  { id: 'logo_uploaded',        weight: 0.13, check: hasLogo },
  { id: 'logo_dimensions',      weight: 0.09, check: logoMeetsMinSize },
  { id: 'contrast_ratio',       weight: 0.18, check: contrastRatio },
  { id: 'barcode_configured',   weight: 0.09, check: hasBarcode },
  { id: 'required_fields',      weight: 0.13, check: hasRequiredFields },
  { id: 'hero_image',           weight: 0.09, check: hasHeroImage },
  { id: 'image_aspect_ratios',  weight: 0.09, check: correctAspectRatios },
  { id: 'has_back_fields',      weight: 0.05, check: hasBackFields },        // NEW
  { id: 'has_terms',            weight: 0.03, check: hasTermsField },        // NEW
  { id: 'has_contact_info',     weight: 0.03, check: hasContactField },     // NEW
  { id: 'has_program_rules',    weight: 0.02, check: hasRulesField },       // NEW
  { id: 'back_content_length',  weight: 0.02, check: backContentNotEmpty }, // NEW
  { id: 'dual_platform',        weight: 0.05, check: bothPlatforms },
];

function calculateDesignScore(state): number {
  let totalWeight = 0, passedWeight = 0;
  for (const check of DESIGN_QUALITY_CHECKS) {
    const result = check.check(state);
    totalWeight += check.weight;
    if (result.passed) passedWeight += check.weight;
  }
  return Math.round((passedWeight / totalWeight) * 10);
}
```

**Score Colors:**
| Score | Color | Label |
|-------|-------|-------|
| 9-10 | Green | Excelente |
| 7-8 | Blue | Bueno |
| 5-6 | Yellow | Regular |
| <5 | Red | Necesita mejoras |

---

*End of Document SRS-002*
