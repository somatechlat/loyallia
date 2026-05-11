# OWNER ADMIN Interface — Full Audit Report

**Date:** 2026-05-09  
**Scope:** Complete analysis of the OWNER ADMIN interface (all 10 sidebar menus, all flows, all buttons/actions)  
**Status:** ✅ Phone simulator bug FIXED. All other findings documented below.

---

## 1. SIDEBAR NAVIGATION (10 Items)

| # | Route | Label | Roles | Description |
|---|-------|-------|-------|-------------|
| 1 | `/` | Resumen | OWNER, MANAGER | Dashboard with KPIs, charts, insights |
| 2 | `/programs` | Programas | OWNER, MANAGER | List, create, suspend, delete loyalty programs |
| 3 | `/customers` | Clientes | OWNER, MANAGER | Customer list, search, import/export, delete |
| 4 | `/analytics` | Analíticas | OWNER, MANAGER | Charts, segments, program performance |
| 5 | `/automation` | Automatización | OWNER only | Rules engine with triggers & actions |
| 6 | `/campaigns` | Campañas | OWNER only | Marketing campaigns (Email/Wallet/WhatsApp/SMS) |
| 7 | `/locations` | Sucursales | OWNER, MANAGER | Location CRUD with map |
| 8 | `/team` | Equipo | OWNER only | Team invitation, role management |
| 9 | `/settings` | Configuración | OWNER only | Business info, branding, WhatsApp, password |
| 10 | `/billing` | Facturación | OWNER only | Plan view, usage gauges, plan comparison |

**RBAC Enforcement:** `OWNER_ONLY_ROUTES = ['/campaigns', '/billing', '/settings', '/automation']` — non-owners redirected to `/`.

---

## 2. PAGE-BY-PAGE AUDIT

### 2.1 Dashboard (`/`)

**Purpose:** Business overview with real-time analytics

**Actions/Buttons:**
| Element | ID | Action | API Endpoint |
|---------|-----|--------|-------------|
| Date range pills | `date-range-{1,7,28,180,365,mtd,custom}` | Change analytics period | Multiple analytics APIs |
| Custom date picker | `custom-date-picker` | Select custom date range | — |
| Apply custom range | — | Apply selected dates | — |
| Scanner button | `open-scanner-btn` | Open scanner in new tab | `/scanner/scan` |
| Dashboard tabs | `dash-tab-ganancia`, `dash-tab-visitas` | Switch between Gain/Visits views | — |
| Chart tabs | `chart-tab-revenue`, `chart-tab-visits`, `chart-tab-customers` | Switch chart metric | — |
| Stat cards | `stat-*` | Navigate to detail page | Links to /customers, /programs, /analytics, /campaigns |
| Retry button | — | Re-fetch dashboard data | All analytics endpoints |

**API Endpoints Called:**
- `GET /api/v1/analytics/overview/?days={N}`
- `GET /api/v1/analytics/trends/?days={N}`
- `GET /api/v1/analytics/visits/?days={N}`
- `GET /api/v1/analytics/top-buyers/?limit=15&days={N}`
- `GET /api/v1/analytics/demographics/`
- `GET /api/v1/analytics/revenue-breakdown/?days={N}`
- `GET /api/v1/analytics/by-program-type/?days={N}`
- `GET /api/v1/notifications/stats/`

**Empty States:** Skeleton loader while loading, "Error de conexión" with retry button on error.

**Issues Found:** None ✅

---

### 2.2 Programs List (`/programs`)

**Purpose:** Manage all loyalty programs

**Actions/Buttons:**
| Element | ID | Action | RBAC |
|---------|-----|--------|------|
| Create new card | `new-program-btn` | Navigate to `/programs/new` | OWNER only |
| Create first program | `create-first-program-btn` | Navigate to `/programs/new` | OWNER only |
| Suspend/Activate | — | Toggle program active state | OWNER only |
| Delete | — | Delete program permanently | OWNER only |
| View details | — | Navigate to `/programs/{id}` | All |
| Expand section | `expand-{activas,borradores,inactivas}` | Show more programs | All |

**API Endpoints:**
- `GET /api/v1/programs/`
- `POST /api/v1/programs/{id}/suspend/`
- `DELETE /api/v1/programs/{id}/`

**Sections:** Active (with enrollments), Drafts (active but 0 enrollments), Inactive

**Issues Found:** None ✅

---

### 2.3 New Program (`/programs/new`) — 4-Step Wizard

**Purpose:** Create a new loyalty program with wallet integration

**Step 0 — Type Selection:**
| Element | ID | Action |
|---------|-----|--------|
| Card type buttons | `card-type-{stamp,cashback,coupon,...}` | Select program type |
| Hover preview panel | `hover-preview-panel` | Shows phone preview on hover |

**Step 1 — Type Configuration:**
- Type-specific metadata forms (stamps_required, cashback_percentage, tiers, etc.)
- Dynamic enrollment form builder

**Step 2 — Design & Wallet Provider:**
| Element | ID | Action |
|---------|-----|--------|
| Program name | `program-name` | Text input |
| Description | `program-desc` | Textarea |
| Logo upload | `logo-upload-btn` | File upload → `/api/v1/upload/` |
| Hero image upload | `strip-upload-btn` | File upload |
| Icon upload | `icon-upload-btn` | File upload |
| **Wallet Provider Selector** | `wallet-provider-apple`, `wallet-provider-google` | Select Apple or Google |
| Apple NFC toggle | `apple-nfc-enabled` | Enable/disable NFC |
| Apple NFC auth | `apple-nfc-auth-required` | Require FaceID/TouchID |
| Barcode type | `barcode-type-{qr_code,aztec,pdf417,code_128,data_matrix}` | Select barcode |
| Design templates | `template-{midnight,ocean,...custom}` | Select color template |
| Custom colors | — | Pick background/text colors |
| Geofence locations | — | Add GPS coordinates for wallet alerts |
| **Live Phone Preview** | — | Real-time Apple/Google wallet preview |

**Step 3 — Review:**
- Summary of all settings before creation

**API Endpoint:**
- `POST /api/v1/programs/` (with metadata containing wallet_provider, apple_wallet config)

**Issues Found & Fixed:**
- 🔴 **Phone simulator black square** — Phone frame `bg-gray-900` blended into dark page background. **FIXED** by adding contrasting wrapper background (`bg-gradient-to-b from-surface-100 to-surface-200`) and visible borders.

---

### 2.4 Program Detail (`/programs/{id}`)

**Purpose:** View program stats, QR code, edit program

**Actions/Buttons:**
| Element | ID | Action | RBAC |
|---------|-----|--------|------|
| Back link | — | Return to /programs | All |
| Edit program | `edit-program-btn` | Open EditProgramModal | OWNER only |

**Displays:**
- Stats cards (active members, rewards redeemed, engagement rate, transactions)
- QR code for enrollment
- Program metadata

**API Endpoints:**
- `GET /api/v1/programs/{id}/`
- `GET /api/v1/programs/{id}/stats/`

---

### 2.5 Customers (`/customers`)

**Purpose:** Customer database management

**Actions/Buttons:**
| Element | ID | Action | RBAC |
|---------|-----|--------|------|
| Data combo | `data-combo-btn` | Toggle import/export menu | OWNER only |
| Export CSV | `export-csv-btn` | Download customers CSV | OWNER only |
| Import DB | `open-import-modal-btn` | Open import modal | OWNER only |
| Search | `customer-search` + `search-btn` | Search by name/email/phone | All |
| Delete customer | `delete-customer-{id}` | Delete individual customer | All (active customers) |
| Pagination | `prev-page-btn`, `next-page-btn` | Page through results | All |
| Import file | `select-import-file-btn` | Upload CSV/XLS | OWNER only |
| Download template | `download-template-btn` | Get CSV template | OWNER only |
| LOPDP consent | `data-consent` | Required checkbox for import | — |

**API Endpoints:**
- `GET /api/v1/customers/?limit=25&offset={N}&search={Q}`
- `DELETE /api/v1/customers/{id}/`
- `POST /api/v1/customers/import/` (CSV/XLS)
- `GET /api/v1/customers/export/csv/`

**Issues Found:** None ✅

---

### 2.6 Customer Detail (`/customers/{id}`)

**Purpose:** Individual customer profile

**Actions/Buttons:**
| Element | Action |
|---------|--------|
| Back link | Return to /customers |
| Enroll in program | Open enrollment modal |
| Select program | Dropdown of available programs |
| Confirm enroll | Enroll customer in selected program |

**Displays:** Customer info, enrolled passes, transaction history

**API Endpoints:**
- `GET /api/v1/customers/{id}/`
- `GET /api/v1/customers/{id}/passes/`
- `POST /api/v1/customers/{id}/enroll/`

---

### 2.7 Analytics (`/analytics`)

**Purpose:** Business performance metrics

**Actions/Buttons:**
| Element | ID | Action |
|---------|-----|--------|
| Days selector | `days-selector` | Change period (7/30/90 days) |
| Chart tabs | Revenue/Transactions/Customers | Switch chart metric |

**Displays:** KPI cards, trend charts, segment breakdown, program performance

**API Endpoints:**
- `GET /api/v1/analytics/overview/`
- `GET /api/v1/analytics/trends/?days={N}`
- `GET /api/v1/analytics/segments/`
- `GET /api/v1/analytics/programs/`

---

### 2.8 Automation (`/automation`)

**Purpose:** Automated rules based on customer behavior

**Actions/Buttons:**
| Element | ID | Action | RBAC |
|---------|-----|--------|------|
| New automation | `create-automation-btn` | Open create modal | OWNER only |
| Preset templates | — | Quick-create from 6 templates | OWNER only |
| Toggle active | `toggle-automation-{id}` | Enable/disable rule | All |
| Edit | — | Open edit modal | OWNER only |
| Delete | — | Show delete confirmation | OWNER only |
| Create first | `create-first-automation` | Open create modal | OWNER only |
| Save | `save-automation-btn` | Create/update rule | OWNER only |

**Triggers:** customer_enrolled, transaction_completed, reward_earned, reward_ready, birthday_coming, inactive_reminder, milestone_reached, scheduled_time

**Actions:** send_notification, send_email, send_sms, issue_reward, update_segment, create_campaign, send_wallet

**API Endpoints:**
- `GET /api/v1/automation/`
- `POST /api/v1/automation/`
- `PATCH /api/v1/automation/{id}/`
- `POST /api/v1/automation/{id}/toggle/`
- `DELETE /api/v1/automation/{id}/`

---

### 2.9 Campaigns (`/campaigns`)

**Purpose:** Marketing campaigns across 4 channels

**Actions/Buttons:**
| Element | ID | Action | RBAC |
|---------|-----|--------|------|
| New campaign | `new-campaign-btn` | Show create form | OWNER only |
| Channel selector | — | Email/Wallet/WhatsApp/SMS | — |
| Segment selector | `segment-{all,vip,active,at_risk,inactive,new}` | Select target audience | — |
| Send campaign | `send-campaign-btn` | Dispatch campaign | OWNER only |
| Cancel | `cancel-campaign-btn` | Hide form | — |

**Plan-gated channels:** Email, Wallet, WhatsApp, SMS are locked if plan doesn't include the feature.

**API Endpoints:**
- `GET /api/v1/notifications/campaigns/`
- `POST /api/v1/notifications/campaigns/`
- `GET /api/v1/customers/segments/`

---

### 2.10 Locations (`/locations`)

**Purpose:** Business location management with map

**Actions/Buttons:**
| Element | Action | RBAC |
|---------|--------|------|
| New location | Open create modal | OWNER only |
| Location cards | Open detail modal | All |
| Edit | Enter edit mode | OWNER only |
| Activate/Deactivate | Toggle status | OWNER only |
| Delete | Show confirmation | OWNER only |
| Google Maps link | Open external map | All |

**API Endpoints:**
- `GET /api/v1/tenants/locations/`
- `POST /api/v1/tenants/locations/`
- `PATCH /api/v1/tenants/locations/{id}/`
- `DELETE /api/v1/tenants/locations/{id}/`

---

### 2.11 Team (`/team`)

**Purpose:** Staff management

**Actions/Buttons:**
| Element | ID | Action | RBAC |
|---------|-----|--------|------|
| Add member | `invite-member-btn` | Toggle invite form | OWNER only |
| Create member | — | Submit invite form | OWNER only |
| Edit role | `edit-member-{id}` | Inline role edit | OWNER only |
| Delete member | `delete-member-{id}` | Delete with confirmation | OWNER only |
| Toggle active | — | Enable/disable member | OWNER only |
| Send credentials | — | Checkbox for email | — |

**API Endpoints:**
- `GET /api/v1/tenants/team/`
- `POST /api/v1/tenants/team/`
- `PATCH /api/v1/tenants/team/{id}/`
- `DELETE /api/v1/tenants/team/{id}/`

---

### 2.12 Settings (`/settings`)

**Purpose:** Business configuration

**Actions/Buttons:**
| Element | ID | Action |
|---------|-----|--------|
| Business name | `biz-name` | Edit tenant name |
| Phone | `biz-phone` | Edit phone |
| Website | `biz-website` | Edit website |
| Address | `biz-address` | Edit address |
| Timezone | `biz-tz` | Select timezone |
| Logo upload | `logo-upload-settings-btn` | Upload logo |
| Primary color | — | Pick brand color |
| Secondary color | — | Pick accent color |
| Save settings | `save-settings-btn` | PATCH `/api/v1/tenants/me/` |
| Change password | `show-password-btn` | Show password form |
| Current password | `current-pw` | Verify current |
| New password | `new-pw` | Enter new password |
| Confirm password | `confirm-pw` | Confirm new password |
| Update password | `change-password-btn` | POST `/api/v1/auth/change-password/` |
| WhatsApp wizard | — | Configure WhatsApp bridge | — |

**API Endpoints:**
- `GET /api/v1/tenants/me/`
- `PATCH /api/v1/tenants/me/`
- `GET /api/v1/tenants/me/plan-features/`
- `POST /api/v1/upload/`
- `POST /api/v1/auth/change-password/`

---

### 2.13 Billing (`/billing`)

**Purpose:** Subscription management

**Actions/Buttons:**
| Element | ID | Action |
|---------|-----|--------|
| Upgrade plan | `upgrade-btn` | Navigate to plan upgrade (placeholder) |

**Displays:** Current plan, trial days remaining, usage radial gauges, plan comparison table, payment history

**API Endpoints:**
- `GET /api/v1/billing/subscription/`
- `GET /api/v1/billing/usage/`

**Issues Found:**
- 🟡 Payment history is always empty (no payments implemented yet)
- 🟡 Upgrade button is a placeholder (no checkout flow)

---

## 3. WALLET DIFFERENTIATION AUDIT

### 3.1 Apple Wallet vs Google Wallet — UI Differences

| Feature | Apple Wallet | Google Wallet |
|---------|-------------|---------------|
| **Pass style** | storeCard / coupon / generic | N/A (uses class types) |
| **Image support** | strip.png (storeCard/coupon) or thumbnail.png (generic) | Hero image (all types) |
| **NFC** | Toggle + auth toggle | N/A |
| **Backend format** | PKPass (.pkpass file) | JWT URL |
| **Class types** | N/A | LoyaltyClass / GiftCardClass / OfferClass |
| **UI badge** | "PKPass" | "JWT" |
| **Phone frame** | iPhone with Dynamic Island | Android with center pill |
| **Barcode support** | QR, Aztec, PDF417, Code 128 | QR, Aztec, PDF417, Code 128, Data Matrix |

### 3.2 End-to-End Flow Verification

**Step 1 — Creation:**
- ✅ Frontend: `WalletProviderSelector` stores `wallet_provider: 'apple' | 'google'` in metadata
- ✅ Backend: `Card.metadata` stores the wallet provider choice

**Step 2 — Enrollment:**
- ✅ `/enroll/[slug]/page.tsx` detects iOS/Android and calls `/api/v1/wallet/status/{pass_id}/`
- ✅ Status endpoint returns `apple_wallet_available` / `google_wallet_available` based on provider setting

**Step 3 — Pass Generation:**
- ✅ Apple endpoint (`/wallet/apple/{pass_id}/`): Checks `_is_wallet_provider_enabled(card, "apple")` → 404 if disabled
- ✅ Google endpoint (`/wallet/google/{pass_id}/`): Checks `_is_wallet_provider_enabled(card, "google")` → 404 if disabled

**Conclusion:** Wallet differentiation is correctly implemented end-to-end. ✅

---

## 4. ISSUES SUMMARY

| Severity | Issue | Location | Status |
|----------|-------|----------|--------|
| 🔴 High | Phone simulator shows black square in dark mode | `WalletCardPreview`, `WalletPreviewContent` | **FIXED** |
| 🟡 Medium | Hover preview only shows iPhone, never Android | `WalletPreviewContent` | Known limitation |
| 🟡 Medium | Billing upgrade is placeholder | `billing/page.tsx` | Expected (payment gateway needed) |
| 🟡 Medium | Payment history always empty | `billing/page.tsx` | Expected (no payments yet) |
| 🟢 Low | No dedicated "Add Customer" button | `customers/page.tsx` | Customers enroll via QR/program |

---

## 5. FLOW CHARTS

### 5.1 Program Creation Flow

```mermaid
flowchart TD
    A[Owner clicks "Crear nueva tarjeta"] --> B[Step 0: Select Card Type]
    B --> C[Step 1: Configure Type Metadata]
    C --> D[Step 2: Design & Wallet Provider]
    D --> D1[Select Apple or Google Wallet]
    D --> D2[Upload Logo / Hero / Icon]
    D --> D3[Set Geofence Locations]
    D --> D4[Choose Barcode Type]
    D --> D5[Pick Design Template]
    D1 & D2 & D3 & D4 & D5 --> E[Live Phone Preview]
    E --> F[Step 3: Review]
    F --> G{Owner confirms?}
    G -->|Yes| H[POST /api/v1/programs/]
    H --> I[Card created with metadata]
    G -->|No| D
```

### 5.2 Customer Enrollment → Wallet Pass Flow

```mermaid
flowchart TD
    A[Customer scans QR or visits /enroll/{slug}] --> B[Public card info loaded]
    B --> C[Customer fills enrollment form]
    C --> D[POST /api/v1/customers/enroll/]
    D --> E[CustomerPass created]
    E --> F[GET /api/v1/wallet/status/{pass_id}/]
    F --> G{Wallet provider?}
    G -->|Apple| H[Show "Add to Apple Wallet" button]
    G -->|Google| I[Show "Add to Google Wallet" button]
    G -->|Both| J[Show both buttons]
    H --> K[Customer taps Apple button]
    K --> L[GET /api/v1/wallet/apple/{pass_id}/]
    L --> M[.pkpass file generated & downloaded]
    I --> N[Customer taps Google button]
    N --> O[GET /api/v1/wallet/google/{pass_id}/]
    O --> P[Redirect to Google Wallet save URL]
```

### 5.3 Campaign Creation Flow

```mermaid
flowchart TD
    A[Owner clicks "+ Nueva campaña"] --> B[Select channel: Email/Wallet/WhatsApp/SMS]
    B --> C{Plan includes channel?}
    C -->|No| D[Show locked state with upgrade prompt]
    C -->|Yes| E[Enter title & message]
    E --> F[Select segment: all/vip/active/at_risk/inactive/new]
    F --> G[Shows recipient count]
    G --> H[Owner clicks "Enviar campaña"]
    H --> I[POST /api/v1/notifications/campaigns/]
    I --> J[CampaignRun created]
    J --> K[Celery task dispatches by channel]
    K -->|Email| L[SendGrid bulk send]
    K -->|Wallet| M[Push to wallet passes]
    K -->|WhatsApp| N[WhatsApp Bridge sends]
    K -->|SMS| O[Twilio sends]
```

### 5.4 Automation Rule Flow

```mermaid
flowchart TD
    A[Owner clicks "Nueva automatización"] --> B[Step 1: Name & Description]
    B --> C[Step 2: Select Trigger]
    C --> C1[customer_enrolled / transaction_completed / reward_earned / birthday_coming / inactive_reminder / milestone_reached]
    C --> D[Step 2: Select Action]
    D --> D1[send_notification / send_email / send_sms / issue_reward / update_segment / send_wallet]
    D --> E[Step 3: Config & Cooldown]
    E --> F[Set cooldown hours & max executions/day]
    F --> G[POST /api/v1/automation/]
    G --> H[Automation rule stored]
    H --> I[Celery beat periodic task checks triggers]
    I --> J[When trigger fires → execute action]
```

### 5.5 Team Invitation Flow

```mermaid
flowchart TD
    A[Owner clicks "Agregar Miembro"] --> B[Invite form opens]
    B --> C[Enter: first_name, last_name, email, role]
    C --> D[Select role: MANAGER or STAFF]
    D --> E[Check "Send credentials by email"]
    E --> F[Submit form]
    F --> G[POST /api/v1/tenants/team/]
    G --> H[User created with temp password]
    H --> I{Send email?}
    I -->|Yes| J[Email sent with credentials]
    I -->|No| K[Modal shows temp password]
    K --> L[Owner copies and shares password]
```

### 5.6 Location Setup Flow

```mermaid
flowchart TD
    A[Owner clicks "Nueva Sucursal"] --> B[Modal opens in create mode]
    B --> C[Enter: name, address, city, country, phone]
    C --> D[Set GPS coordinates]
    D --> E[Mark as primary?]
    E --> F[POST /api/v1/tenants/locations/]
    F --> G[Location created]
    G --> H[Shown on map]
    H --> I[Available for wallet geofencing]
```

---

## 6. TOTAL BUTTON/ACTION COUNT

| Page | Buttons | Actions | APIs |
|------|---------|---------|------|
| Dashboard | 12 | 4 tabs + 7 date ranges + retry | 8 |
| Programs List | 5 | Create, suspend, delete, view, expand | 3 |
| New Program | 25+ | 10 types + uploads + wallet + barcode + templates + colors + geofences + nav | 1 |
| Program Detail | 2 | Back, edit | 2 |
| Customers | 10 | Search, import, export, delete, paginate | 4 |
| Customer Detail | 3 | Back, enroll, select program | 3 |
| Analytics | 4 | Days selector, chart tabs | 4 |
| Automation | 10 | Create, toggle, edit, delete, save | 5 |
| Campaigns | 12 | New, channel select, segment select, send, cancel | 2 |
| Locations | 8 | Create, view, edit, toggle, delete, map | 4 |
| Team | 8 | Invite, edit role, toggle active, delete | 4 |
| Settings | 12 | Save, upload logo, change password, WhatsApp config | 4 |
| Billing | 1 | Upgrade (placeholder) | 2 |
| **TOTAL** | **112** | **—** | **46** |

---

*Report generated by Kimi Code CLI — Loyallia Engineering*
