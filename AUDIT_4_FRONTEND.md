# 🔍 Loyallia Frontend Architecture Audit

> **Audit Date:** 2026-04-29
> **Scope:** Full frontend codebase — architecture, code quality, duplication, patterns
> **Severity Scale:** 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low | ⚪ Info

---

## Area 1 — State Management & Auth

**Files:** `src/lib/auth.tsx`, `src/lib/api.ts`

### 1.1 🟠 Duplicate Token Refresh Logic (High)

**`auth.tsx:52-68` vs `api.ts:18-34`**

Both files implement independent token refresh mechanisms:

```tsx
// auth.tsx — scheduleRefresh()
const { data } = await api.post('/api/v1/auth/refresh/', { refresh_token: refresh });
Cookies.set('access_token', data.access_token, { expires: 1 / 24, secure: isProd, sameSite: 'strict' });

// api.ts — doRefresh()
refreshPromise = axios.post('/api/v1/auth/refresh/', { refresh_token: refresh }, { withCredentials: true })
  .then(({ data }) => {
    Cookies.set('access_token', data.access_token, { expires: 1 / 24, secure: isProd, sameSite: 'strict' });
  });
```

**Impact:** Race conditions between the two refresh flows. The proactive timer in `auth.tsx` and the reactive 401-interceptor in `api.ts` can fire concurrently, causing token corruption or redundant requests.

**Remediation:** Consolidate into a single `TokenManager` class. Remove `scheduleRefresh` from `auth.tsx` — let `api.ts` own all refresh logic, expose a `ensureFreshToken()` that `auth.tsx` calls.

---

### 1.2 🟠 Hardcoded Cookie Config Duplication (High)

**`auth.tsx:86-87`, `auth.tsx:94-95`, `auth.tsx:100-101`, `api.ts:27`**

The cookie configuration (`expires`, `secure`, `sameSite`) is repeated 4 times:

```tsx
Cookies.set('access_token', data.access_token, { expires: 1/24, secure: isProd, sameSite: 'strict' });
Cookies.set('refresh_token', data.refresh_token, { expires: 7, secure: isProd, sameSite: 'strict' });
```

**Impact:** If cookie policy changes (e.g., `SameSite=Lax` for cross-origin), every instance must be found and updated. Error-prone.

**Remediation:** Extract to constants:
```ts
const ACCESS_COOKIE_OPTS = { expires: 1/24, sameSite: 'strict' as const };
const REFRESH_COOKIE_OPTS = { expires: 7, sameSite: 'strict' as const };
```

---

### 1.3 🟡 No Type Safety on API Responses (Medium)

**`api.ts` — entire file**

All API helpers return raw `AxiosResponse` with `any` data:

```ts
login: (email: string, password: string) => api.post('/api/v1/auth/login/', { email, password }),
// Return type is AxiosResponse<any, any>
```

**Impact:** No compile-time checks on response shapes. Bugs from typos in field names propagate silently.

**Remediation:** Add generic type params:
```ts
login: (email: string, password: string) =>
  api.post<LoginResponse>('/api/v1/auth/login/', { email, password }),
```

---

### 1.4 🟡 Unsafe `Record<string, unknown>` Parameters (Medium)

**`api.ts:86, 88, 94, 102, 106, 113, 117, 122, 127, 132`**

Many API methods accept `Record<string, unknown>`:

```ts
create: (data: Record<string, unknown>) => api.post('/api/v1/customers/', data),
update: (id: string, data: Record<string, unknown>) => api.put(`/api/v1/customers/${id}/`, data),
```

**Impact:** No type safety on request payloads. Callers can pass anything.

**Remediation:** Define request DTOs: `CreateCustomerRequest`, `UpdateProgramRequest`, etc.

---

### 1.5 🟡 Mixed Language Strings (Medium)

**`auth.tsx:92`, `auth.tsx:98`**

Error messages are in Spanish while the codebase is English:

```ts
if (!userData) throw new Error("Login falló al obtener perfil de usuario");
if (!userData) throw new Error("Login con Google falló al obtener perfil de usuario");
```

**Impact:** Inconsistent user experience, hard to maintain if i18n is added.

**Remediation:** Use English error codes/messages; handle i18n at the UI layer.

---

### 1.6 🔵 SSR Safety for Cookies (Low)

**`api.ts:5-7`**

```ts
const api = axios.create({
  baseURL: typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:33905'),
```

The `typeof window` check handles SSR, but `Cookies.get('access_token')` in the request interceptor runs on server too — `js-cookie` returns `undefined` in SSR which is safe, but the pattern is fragile.

**Remediation:** Consider wrapping the entire API module in a client-only guard or using Next.js middleware for auth.

---

### 1.7 🔵 `withCredentials` Inconsistency (Low)

**`api.ts:21`**

```ts
refreshPromise = axios.post('/api/v1/auth/refresh/', { refresh_token: refresh }, { withCredentials: true });
```

`withCredentials: true` is set only on refresh but not on the main `api` instance. This inconsistency may cause CORS issues depending on backend config.

---

### 1.8 🔵 Axios Instance Reuse Issue in Interceptor (Low)

**`api.ts:49`**

```ts
return api(original); // retries with the same axios instance
```

Retrying via `api(original)` re-triggers all interceptors. If the refresh itself returns 401, this could cause an infinite loop (guarded by `_retry` flag, but fragile).

---

## Area 2 — Dashboard Page & Layout

**Files:** `src/app/(dashboard)/page.tsx`, `src/app/(dashboard)/layout.tsx`

### 2.1 🔴 Mega-Component: Dashboard Page (~400 lines) (Critical)

**`page.tsx` — entire file**

The dashboard page is a single monolithic component containing:
- 14+ `useState` hooks (lines ~93-106)
- Data fetching logic (lines ~108-130)
- Chart configuration (lines ~155-180)
- 6+ distinct UI sections (stats grid, trends chart, demographics, top buyers, revenue breakdown, campaigns)
- Inline icon components (lines ~67-86)

**Impact:** Extremely difficult to test, maintain, or reuse any section. Changes to one section risk breaking others. Re-renders cascade through the entire component.

**Remediation:** Decompose into:
```
DashboardPage
├── DashboardHeader (date range selector)
├── StatsGrid (stat cards)
├── TrendsChart (revenue/visits/customers tabs)
├── RewardsChart (bar chart)
├── VisitMetrics (sidebar stats)
├── RevenueBreakdown (donut chart)
├── TopBuyersTable
├── DemographicsPanel
├── ProgramTypeChart
└── CampaignsSection
```

Each sub-component receives its data slice as props.

---

### 2.2 🟠 Inline Icon Components Defined Inside Render (High)

**`page.tsx:67-86`**

Four SVG icon components (`IconUsers`, `IconTarget`, `IconCreditCard`, `IconBell`) are defined at module scope but only used via `STAT_ICON_MAP`. While not inside the render function, they bloat the module unnecessarily.

**Impact:** Minor perf hit from re-evaluation. More importantly, these are generic icons that should live in a shared icon library.

**Remediation:** Move to `src/components/icons/` or use a library like `lucide-react` (already has these icons).

---

### 2.3 🟠 Mixed Spanish/English UI Strings (High)

**`page.tsx` — throughout**

All user-facing text is hardcoded in Spanish with no i18n:

```tsx
<h1>Bienvenido, {user?.full_name?.split(' ')[0]}</h1>
<p>Resumen de tu programa de fidelización</p>
// Stat labels: 'Clientes totales', 'Programas activos', 'Transacciones', 'Notificaciones'
// Error: 'Error de conexión con el servidor'
// Button: 'Reintentar'
```

**Impact:** Cannot support multiple languages. Any locale change requires touching dozens of files.

**Remediation:** Adopt `next-intl` or `react-i18next`. Extract all strings to locale files.

---

### 2.4 🟠 Massive Data Fetching in Single `useCallback` (High)

**`page.tsx:108-130`**

Eight parallel API calls in a single `Promise.all`:

```tsx
const [dash, trend, vis, tb, demo, rb, pt, ns] = await Promise.all([
  analyticsApi.dashboard(),
  analyticsApi.trends(days),
  analyticsApi.visits(days),
  analyticsApi.topBuyers(15, days),
  analyticsApi.demographics(),
  analyticsApi.revenueBreakdown(days),
  analyticsApi.byProgramType(days),
  notificationsApi.stats().catch(() => ({ data: null })),
]);
```

**Impact:**
- All-or-nothing: if one fails, the entire dashboard shows an error
- No granular loading states — user sees a full skeleton until ALL 8 complete
- No caching — re-fetches everything on date range change

**Remediation:**
- Use React Query / SWR for per-section caching and stale-while-revalidate
- Show progressive loading (each section loads independently)
- Handle partial failures gracefully

---

### 2.5 🟡 Layout RBAC via `window.location.replace` (Medium)

**`layout.tsx:177-196`**

Access control is implemented via `useEffect` + `window.location.replace`:

```tsx
useEffect(() => {
  if (user.role === 'STAFF' && !pathname.startsWith('/scanner')) {
    window.location.replace('/scanner/scan');
  }
  if (user.role === 'SUPER_ADMIN' && !pathname.startsWith('/superadmin')) {
    window.location.replace('/superadmin');
  }
  // ...
}, [loading, user, pathname, isRestrictedRoute]);
```

**Impact:**
- Client-side redirect = user sees a flash of wrong content before redirect
- `window.location.replace` causes full page reload (slow)
- Not a security boundary — protected content renders briefly

**Remediation:** Use Next.js middleware (`middleware.ts`) for server-side RBAC redirects. Client-side checks are only for UX polish.

---

### 2.6 🟡 Cookie Config Duplication in Layout (Medium)

**`layout.tsx:32-34`, `layout.tsx:51-53`**

Same cookie config repeated in `ImpersonationBanner`:

```tsx
Cookies.set('access_token', adminToken, { expires: 1 / 24, secure: isProd, sameSite: 'strict' });
```

This duplicates the pattern from `auth.tsx` (finding 1.2).

**Remediation:** Use the shared `ACCESS_COOKIE_OPTS` constant.

---

### 2.7 🟡 `ROLE_LABELS_NAV` Incomplete (Medium)

**`layout.tsx:142`**

```tsx
const ROLE_LABELS_NAV: Record<string, string> = {
  OWNER: 'Propietario', MANAGER: 'Gerente', STAFF: 'Personal', SUPER_ADMIN: 'Super Admin',
};
```

`STAFF` is listed but `getNavForRole` returns `[]` for STAFF (line ~148). The label exists but is never used in the sidebar since STAFF is redirected.

**Impact:** Dead code. Minor confusion for maintainers.

---

### 2.8 🟡 Impersonation Token in `sessionStorage` (Medium)

**`layout.tsx:24-26`**

```tsx
const adminToken = sessionStorage.getItem('superadmin_token');
```

The superadmin's access token is stored in `sessionStorage` during impersonation. This is accessible to any JS running on the page (XSS risk).

**Impact:** If XSS exists anywhere in the app, an attacker can steal the admin token from sessionStorage.

**Remediation:** Store a flag (not the token) in sessionStorage. Use an httpOnly cookie or a server-side impersonation session.

---

### 2.9 🔵 Hardcoded Locale in Date Formatting (Low)

**`page.tsx:393`**

```tsx
new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })
```

Hardcoded to Ecuadorian Spanish locale.

**Remediation:** Derive from user's locale setting.

---

### 2.10 🔵 No Error Boundary (Low)

**`page.tsx` — entire file**

No React Error Boundary wraps the dashboard. If any sub-section throws during render, the entire page crashes.

**Remediation:** Add `<ErrorBoundary fallback={<DashboardError />}>` around each major section.

---

## Area 3 — Dashboard Components

**Files:** `src/components/dashboard/DashboardTabs.tsx`, `src/components/dashboard/ProfileModal.tsx`

### 3.1 🟠 Duplicated Type Definitions (High)

**`DashboardTabs.tsx:8-17` vs `page.tsx:17-24`**

`VisitMetrics` and `RevenueBreakdown` are defined in both files:

```tsx
// DashboardTabs.tsx
export interface VisitMetrics { total_visits: number; unique_customers: number; ... }
export interface RevenueBreakdown { total_revenue: number; loyalty: number; ... }

// page.tsx
interface VisitMetrics { total_visits: number; unique_customers: number; ... }
interface RevenueBreakdown { total_revenue: number; loyalty: number; ... }
```

**Impact:** Type drift — if the API response changes, both files must be updated independently. Already happened: `page.tsx` includes `unregistered_visits` in `VisitMetrics` while `DashboardTabs.tsx` also has it, but they could diverge.

**Remediation:** Define shared types in `src/types/api.ts` and import everywhere.

---

### 3.2 🟠 Hardcoded Magic Numbers in Data (High)

**`DashboardTabs.tsx:88, 100`**

```tsx
// Line 88: Estimated referral visits = 15% of new visitors
value={visits?.new_visitors ? Math.round(visits.new_visitors * 0.15) : 0}

// Line 100: "New members" = 40% of non-loyalty revenue
{ l: 'Miembros nuevos', v: rev?.non_loyalty ? Math.round(rev.non_loyalty * 0.4) : 0 }

// Line 102: "Unknown" = 60% of non-loyalty revenue
{ l: 'Desconocidos', v: rev?.non_loyalty ? Math.round(rev.non_loyalty * 0.6) : 0 }
```

**Impact:** Client-side fabrication of data that doesn't exist in the API. These percentages are business assumptions hardcoded in the frontend. If the business model changes, the UI shows incorrect data without any backend change.

**Remediation:** Either:
1. Have the API return these breakdowns directly, or
2. Define these as named constants with clear documentation: `const REFERRAL_CONVERSION_RATE = 0.15`

---

### 3.3 🟡 No Modal Focus Trap (Medium)

**`ProfileModal.tsx:69-74`**

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
  <div className="bg-white rounded-2xl ..." onClick={(e) => e.stopPropagation()}>
```

The modal lacks:
- Focus trap (Tab can escape the modal)
- `aria-modal="true"` on the dialog
- `role="dialog"` attribute
- Escape key handler
- Initial focus management

**Impact:** Accessibility violation (WCAG 2.1.1, 2.1.2). Keyboard users and screen readers cannot use the modal properly.

**Remediation:** Use `@headlessui/react` `Dialog` component or implement focus trap with `aria-modal`, `role="dialog"`, `onKeyDown` for Escape, and auto-focus first input.

---

### 3.4 🟡 `ROLE_LABELS` Duplicated Again (Medium)

**`ProfileModal.tsx:6-11` vs `layout.tsx:142-144`**

```tsx
// ProfileModal.tsx
const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propietario', MANAGER: 'Gerente', STAFF: 'Personal', SUPER_ADMIN: 'Super Admin',
};

// layout.tsx
const ROLE_LABELS_NAV: Record<string, string> = {
  OWNER: 'Propietario', MANAGER: 'Gerente', STAFF: 'Personal', SUPER_ADMIN: 'Super Admin',
};
```

Same data, different names, in two files.

**Remediation:** Single `ROLE_LABELS` in `src/lib/constants.ts`.

---

### 3.5 🟡 Profile Modal Doesn't Validate Input (Medium)

**`ProfileModal.tsx:42-52`**

```tsx
const handleSaveProfile = async () => {
  setSaving(true);
  try {
    await authApi.updateProfile({ first_name: firstName, last_name: lastName });
```

No validation that names aren't empty, don't contain special characters, or aren't excessively long.

**Remediation:** Add validation before submit: `if (!firstName.trim()) { toast.error('Nombre requerido'); return; }`

---

### 3.6 🔵 Password Change Has No Strength Indicator (Low)

**`ProfileModal.tsx:124-148`**

Only checks `length >= 8`. No complexity requirements shown to the user (uppercase, numbers, special chars).

**Remediation:** Add a password strength meter and show requirements.

---

### 3.7 🔵 KPICard Component Could Be Shared (Low)

**`DashboardTabs.tsx:30-42`**

`KPICard` is a well-designed reusable component but is scoped to this file. Other pages (analytics, customers) likely need similar KPI cards.

**Remediation:** Move to `src/components/ui/KPICard.tsx`.

---

## Area 4 — Program Components

**Files:** `src/components/programs/*.tsx`

### 4.1 🟠 Massive TypeConfig Component (~480 lines) (High)

**`TypeConfig.tsx` — entire file**

Contains 8 memoized sub-components (`StampConfig`, `CashbackConfig`, `CouponConfig`, `DiscountConfig`, `GiftCertificateConfig`, `VipMembershipConfig`, `ReferralPassConfig`, `MultipassConfig`) all in a single file.

**Impact:**
- File is ~480 lines — hard to navigate and maintain
- Each config component has its own complex state logic
- Changes to one config type risk merge conflicts with others

**Remediation:** Split into individual files:
```
programs/configs/
├── StampConfig.tsx
├── CashbackConfig.tsx
├── CouponConfig.tsx
├── DiscountConfig.tsx
├── GiftCertificateConfig.tsx
├── VipMembershipConfig.tsx
├── ReferralPassConfig.tsx
├── MultipassConfig.tsx
└── index.ts (TYPE_COMPONENTS map)
```

---

### 4.2 🟠 `Record<string, unknown>` for Meta State (High)

**`TypeConfig.tsx:4`, `constants.tsx:100-120`**

All config components use `Record<string, unknown>` for the `meta` prop:

```tsx
type ConfigProps = { meta: Record<string, unknown>; setMeta: (m: Record<string, unknown>) => void };
```

**Impact:**
- No type safety on metadata fields — `meta.stamp_type` could be anything
- Frequent `as number`, `as string` casts throughout (e.g., `meta.stamps_required as number ?? 10`)
- Easy to introduce bugs by typo: `meta.stamp_TYpe` compiles fine

**Remediation:** Define discriminated union types:
```ts
type ProgramMeta = StampMeta | CashbackMeta | CouponMeta | ...;
interface StampMeta { type: 'stamp'; stamps_required: number; stamp_type: 'visit' | 'consumption'; ... }
```

---

### 4.3 🟠 CouponConfig is ~200 Lines (High)

**`TypeConfig.tsx:170-370`** (approximately)

`CouponConfig` alone is ~200 lines with:
- 3 discount type sub-forms
- Date range validation
- Push notification configuration
- Help section with `<details>`
- Character counters

**Impact:** Should be its own component with sub-components for each discount type.

**Remediation:** Extract `CouponDiscountFields`, `CouponDateRange`, `CouponPushConfig` as separate components.

---

### 4.4 🟡 Hardcoded Strings Everywhere (Medium)

**`constants.tsx`, `TypeConfig.tsx`, `FormBuilder.tsx` — throughout**

All UI text is hardcoded in Spanish:

```tsx
{ value: 'stamp', label: 'Tarjeta de Sellos', desc: 'Compra X, obtén 1 gratis' }
// TypeConfig.tsx
<label className="label mb-0">Sellos requeridos para la recompensa</label>
<p>1 visita = 1 sello</p>
```

**Impact:** ~100+ Spanish strings across these files. Full i18n requires touching every file.

**Remediation:** Extract to `src/locales/es/programs.json` and use i18n library.

---

### 4.5 🟡 WalletCardPreview Duplicates QR SVG (Medium)

**`WalletCardPreview.tsx:65-77`** vs **`PremiumQrSvg.tsx`**

`WalletCardPreview` contains an inline QR code SVG in `BarcodeSvg` while `PremiumQrSvg.tsx` is a separate dedicated component for premium QR rendering. The `BarcodeSvg` in `WalletCardPreview` also duplicates the pattern in `WalletPreviewContent.tsx` (line ~170).

**Impact:** Three separate QR/barcode SVG implementations. If the visual style changes, all three must be updated.

**Remediation:** Use `PremiumQrSvg` for all QR rendering, extract `BarcodeSvg` to a shared component.

---

### 4.6 🟡 `adjustColor` Has No Input Validation (Medium)

**`constants.tsx:117-124`**

```tsx
export function adjustColor(hex: string, amount: number): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
```

No validation that `hex` is actually a valid hex color. Passing `"red"` or `""` produces `NaN`.

**Remediation:** Add validation: `if (!/^#?[0-9a-fA-F]{3,6}$/.test(hex)) return hex;`

---

### 4.7 🟡 `defaultMeta` Returns Untyped Objects (Medium)

**`constants.tsx:100-120`**

```tsx
export function defaultMeta(type: string): Record<string, unknown> {
  switch (type) {
    case 'stamp': return { stamps_required: 10, reward_description: '', stamp_type: 'visit', ... };
```

Returns `Record<string, unknown>` — no type narrowing based on `type` parameter.

**Remediation:** Use overloads or discriminated unions to return typed metadata.

---

### 4.8 🔵 CardTypeIcon SVG Parsing is Fragile (Low)

**`constants.tsx:19-23`**

```tsx
{d.split(/(?=[A-Z])/).length > 3 ?
  d.split('z').map((seg, i) => seg.trim() ? <path key={i} d={seg.trim() + ...} /> : null)
  : <path d={d} />
}
```

Attempts to split SVG path data by uppercase letters to handle multi-path icons. This regex-based SVG parsing is brittle and won't work for all path syntaxes.

**Remediation:** Store icon paths as arrays of path strings instead of trying to parse them.

---

### 4.9 🔵 FormBuilder ID Generation Uses `Math.random` (Low)

**`FormBuilder.tsx:37`**

```tsx
function generateId() {
  return `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}
```

`Math.random` is not cryptographically secure and could theoretically produce collisions. For form field IDs this is acceptable but `crypto.randomUUID()` would be better.

---

## Area 5 — UI Components

**Files:** `src/components/ui/*.tsx`

### 5.1 🟠 Tooltip vs InfoTooltip: Two Overlapping Components (High)

**`Tooltip.tsx` vs `InfoTooltip.tsx`**

Two separate tooltip components exist with significant functional overlap:

| Feature | `Tooltip` | `InfoTooltip` |
|---------|-----------|---------------|
| Trigger | `?` icon | `i` icon |
| Position | Auto-flipping (JS-calculated) | Fixed `bottom-full` |
| Portal | No (uses `fixed`) | No (uses `absolute`) |
| i18n | `useI18n()` | `useI18n()` |
| Dismiss | mouse leave | mouse leave + click outside |

Both use `useI18n` for text, both show on hover, both have dark mode support.

**Impact:** Confusing API for consumers — which tooltip to use? Duplicated positioning logic, different visual styles.

**Remediation:** Merge into a single `Tooltip` component with variants: `<Tooltip variant="info" text="..." />` vs `<Tooltip variant="help" text="..." />`.

---

### 5.2 🟡 ConfirmModal Lacks Focus Trap (Medium)

**`ConfirmModal.tsx:40-58`**

Similar to ProfileModal (finding 3.3), the ConfirmModal lacks:
- `role="alertdialog"` (this is a confirmation dialog)
- `aria-modal="true"`
- Focus trap (Tab can escape)
- Initial focus on cancel button (safer for destructive actions)

It does handle Escape key (line 32-35), which is good.

**Remediation:** Add `role="alertdialog"`, `aria-modal="true"`, and implement focus trap.

---

### 5.3 🟡 CookieConsent Uses `localStorage` Directly (Medium)

**`CookieConsent.tsx:14`**

```tsx
const consent = localStorage.getItem("loyallia_cookie_consent");
```

Direct `localStorage` access without SSR guard. Will throw during server-side rendering.

**Remediation:** Wrap in `typeof window !== 'undefined'` check or use a client-only hook.

---

### 5.4 🟡 CookieConsent Has No "Reject" Option (Medium)

**`CookieConsent.tsx:53-60`**

Only offers "Aceptar Todo" — no option to reject non-essential cookies or customize preferences.

**Impact:** May not comply with GDPR/LOPDP requirements for granular consent. The LOPDP text claims "consentimiento expreso e inequívoco" but only offers accept.

**Remediation:** Add "Rechazar" and "Configurar" options.

---

### 5.5 🟡 StampIcon SVG Parsing Issue (Medium)

**`StampIcons.tsx:93-100`**

```tsx
{d.split('z').map((seg, i, arr) =>
  seg.trim() ? (
    <path key={i} d={seg.trim() + (i < arr.length - 1 && arr[i + 1]?.trim() ? 'z' : '')} />
  ) : null
)}
```

Splitting SVG path data by lowercase `z` is fragile. Some paths contain `z` in coordinates or other contexts. The same issue exists in `constants.tsx` (finding 4.8).

**Remediation:** Store paths as arrays: `paths: string[]` instead of trying to parse a single string.

---

### 5.6 🔵 Tooltip Uses `fixed` Positioning with JS Calculation (Low)

**`Tooltip.tsx:60-100`**

The tooltip uses `fixed` positioning with manual JS coordinate calculation. This means:
- No automatic repositioning on scroll (only recalculates on hover)
- Can overflow viewport if content is long
- Performance cost from `getBoundingClientRect` calls

**Remediation:** Consider using `@floating-ui/react` for robust positioning with auto-update on scroll/resize.

---

### 5.7 🔵 CookieConsent z-index is Extremely High (Low)

**`CookieConsent.tsx:35`**

```tsx
<div className="fixed bottom-0 left-0 right-0 z-[99999] ...">
```

`z-[99999]` is an extremely high z-index. If other modals/overlays use lower z-indices, the cookie banner will appear on top of everything including modals.

**Remediation:** Use a consistent z-index scale (e.g., `z-50` for modals, `z-40` for toasts, `z-30` for banners).

---

## Area 6 — Other Pages

**Files:** `src/app/(dashboard)/*/page.tsx`, `superadmin/*.tsx`

### 6.1 🔴 Massive Type Duplication Across Pages (Critical)

Every page redefines the same types locally instead of importing from a shared module:

| Type | Defined In |
|------|-----------|
| `OverviewResponse` / `Overview` | `page.tsx`, `analytics/page.tsx` |
| `TrendPoint` / `DailyPoint` | `page.tsx`, `analytics/page.tsx` |
| `VisitMetrics` | `page.tsx`, `DashboardTabs.tsx` |
| `RevenueBreakdown` | `page.tsx`, `DashboardTabs.tsx` |
| `Segment` | `analytics/page.tsx` |
| `Program` | `programs/page.tsx`, `analytics/page.tsx` |
| `Customer` | `customers/page.tsx` |
| `LocationData` | `locations/page.tsx` |
| `TenantProfile` | `settings/page.tsx` |
| `Subscription`, `Usage` | `billing/page.tsx` |
| `PlatformMetrics` | `superadmin/page.tsx` |
| `Tenant` | `superadmin/tenants/page.tsx` |
| `Plan` | `superadmin/tenants/page.tsx` |

**Impact:** At least 15+ type definitions that overlap or duplicate API response shapes. If the API changes a field name, multiple files break independently.

**Remediation:** Create `src/types/api.ts` with all shared interfaces. Import everywhere.

---

### 6.2 🟠 Customers Page: ~400 Lines with Inline Modals (High)

**`customers/page.tsx` — entire file (~400 lines)**

Contains:
- Customer list with pagination
- Search functionality
- Import CSV modal with LOPDP consent
- Delete confirmation modal with full focus trap
- All in a single component

**Impact:** Same monolithic pattern as the dashboard page. Testing individual features requires rendering the entire page.

**Remediation:** Extract `ImportModal`, `DeleteConfirmModal`, `CustomerTable`, `CustomerSearch` as separate components.

---

### 6.3 🟠 Programs Page: Duplicate Modal Pattern (High)

**`programs/page.tsx:150-260`**

Two inline modals (suspend + delete) with the same structure as the customers page modals:

```tsx
{showSuspendModal && (
  <div className="fixed inset-0 bg-surface-900/60 ...">
    <div className="bg-white dark:bg-surface-900 rounded-3xl p-8 ...">
      {/* Same pattern: icon + title + message + cancel/confirm buttons */}
```

**Impact:** 3+ nearly identical modal implementations across pages. The existing `ConfirmModal` component is only used in `locations/page.tsx`.

**Remediation:** Use `ConfirmModal` everywhere. Extend it with icon/color variants if needed.

---

### 6.4 🟠 Locations Page: ~500 Lines, Most Complex Page (High)

**`locations/page.tsx` — ~500 lines**

Contains:
- Map integration (Leaflet)
- Location cards grid
- Stats ribbon
- Detail modal with read/edit/create modes
- Glassmorphism styling
- GPS coordinate display
- Google Maps link
- Toggle active state
- Delete confirmation

**Impact:** Extremely difficult to maintain. The modal alone is ~200 lines.

**Remediation:** Extract `LocationCard`, `LocationDetailModal`, `LocationForm`, `LocationStats` components.

---

### 6.5 🟡 Settings Page: Logo Upload Has No Error Handling (Medium)

**`settings/page.tsx:175-190`**

```tsx
try {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/v1/upload/', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  setForm(f => ({ ...f, logo_url: data.url || '' }));
  toast.success('Logo subido correctamente');
} catch { toast('Logo guardado localmente', { icon: 'i' }); }
```

On upload failure, shows a neutral toast "Logo guardado localmente" — but the logo is only in `logoPreview` (base64 data URL). If the user saves settings, `logo_url` will be empty, losing the logo silently.

**Remediation:** Show clear error message and prevent saving with stale preview.

---

### 6.6 🟡 Settings Page: `eslint-disable` for `useCallback` (Medium)

**`settings/page.tsx:48`**

```tsx
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Disables the exhaustive-deps rule for `loadTenant`. The function uses `api` which is a stable import, so this is safe — but the pattern is a code smell.

**Remediation:** Use `useCallback` properly or move `loadTenant` outside the component.

---

### 6.7 🟡 Analytics Page: Duplicate KPI Card Implementation (Medium)

**`analytics/page.tsx:40-60`**

Defines its own `KpiCard` component when `DashboardTabs.tsx` already has `KPICard`:

```tsx
function KpiCard({ label, value, sub, icon, color }: { ... }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ...`}>
```

**Impact:** Two KPI card components with slightly different designs. Inconsistent UI.

**Remediation:** Use a single shared `KPICard` from `src/components/ui/`.

---

### 6.8 🟡 Billing Page: Hardcoded Plan Comparison Table (Medium)

**`billing/page.tsx:160-200`**

Plan comparison data is hardcoded in the frontend:

```tsx
{[
  { feat: 'Programas', starter: '3', pro: '10', ent: 'Ilimitado' },
  { feat: 'Inscripciones', starter: '500', pro: '5,000', ent: 'Ilimitado' },
  // ...
```

**Impact:** If plans change, the frontend must be updated. Should come from the API.

**Remediation:** Fetch plan features from `billingApi.plans()`.

---

### 6.9 🟡 Superadmin Tenants: Custom `api` Wrapper Bypasses Type Safety (Medium)

**`superadmin/tenants/page.tsx:12-16`**

```tsx
const api = (path: string, opts?: { method?: string; body?: string }) => {
  const url = `/api/v1/admin${path}`;
  const method = (opts?.method || 'GET').toLowerCase();
  const body = opts?.body ? JSON.parse(opts.body) : undefined;
  return centralizedApi({ url, method, data: body });
};
```

Creates a custom API wrapper that:
- Accepts `body` as a string and `JSON.parse`s it (fragile)
- Bypasses the typed API helpers in `api.ts`
- Returns untyped responses

**Remediation:** Add typed admin API helpers to `api.ts`: `adminApi.tenants.list()`, `adminApi.tenants.create()`, etc.

---

### 6.10 🔵 Inconsistent Loading Skeleton Styles (Low)

Different pages use different skeleton patterns:

- Dashboard: `animate-pulse` with `bg-surface-200 dark:bg-surface-700` rounded-xl
- Analytics: `animate-pulse` with `bg-surface-100 rounded-2xl`
- Locations: `animate-pulse` with `bg-surface-200 rounded-2xl`
- Billing: `animate-pulse` with `bg-surface-200 dark:bg-surface-800 rounded-2xl`

**Remediation:** Create a shared `Skeleton` component with consistent styling.

---

## Area 7 — Auth Pages, Maps, Enroll & Scanner

**Files:** `src/app/(auth)/*.tsx`, `src/components/maps/*.tsx`, `src/app/enroll/[slug]/page.tsx`, `src/app/scanner/scan/page.tsx`

### 7.1 🟠 Register Page: ~350 Lines with Inline Country Selector (High)

**`register/page.tsx:14-38`**

25 country codes hardcoded in the component:

```tsx
const COUNTRY_CODES = [
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+57',  country: 'Colombia', flag: '🇨🇴' },
  // ... 23 more entries
];
```

Plus ~80 lines for the country selector dropdown with search, keyboard navigation, and ARIA attributes.

**Impact:** Should be a reusable `PhoneInput` component. The country data should come from a constant file or library.

**Remediation:** Extract `PhoneInput` component with country data to `src/components/ui/PhoneInput.tsx`.

---

### 7.2 🟠 Error Handling Uses Unsafe Type Assertions (High)

**`login/page.tsx:50`, `register/page.tsx:130`, `scanner/scan/page.tsx:40`**

Pattern repeated across auth pages:

```tsx
const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
```

Or:

```tsx
const data = (err as { response?: { data?: Record<string, string | string[]> } })?.response?.data;
```

**Impact:** Fragile error extraction. If the error shape changes, these assertions silently produce `undefined`.

**Remediation:** Create a typed error handler:
```ts
function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) return err.response?.data?.detail ?? err.message;
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}
```

---

### 7.3 🟠 LocationMap: Inline Styles Instead of CSS/Tailwind (High)

**`LocationMap.tsx:60-90`**

Popup content uses raw inline styles:

```tsx
<div style={{ minWidth: '180px', fontFamily: 'Inter, system-ui, sans-serif' }}>
  <strong style={{ fontSize: '13px', color: '#1a1a2e' }}>{loc.name}</strong>
  <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0' }}>{loc.tenant_name}</p>
```

**Impact:** Inconsistent with the rest of the app's Tailwind-based styling. Hard to maintain. Dark mode not supported in popups.

**Remediation:** Use Tailwind classes or a styled popup component.

---

### 7.4 🟡 Enroll Page: Massive Inline SVG Icon Components (Medium)

**`enroll/[slug]/page.tsx:30-80`**

Defines 5+ SVG icon components inline (`IconSearch`, `IconCheckCircle`, `IconXCircle`, `IconAlertTriangle`, `IconCardType`) that duplicate icons already available in the codebase.

**Impact:** ~50 lines of SVG that could use shared icon components.

**Remediation:** Use shared icons from `constants.tsx` or `StampIcons.tsx`.

---

### 7.5 🟡 Scanner Page: No Authentication Guard (Medium)

**`scanner/scan/page.tsx:27`**

```tsx
const isAuthenticated = !!Cookies.get('access_token');
```

Checks auth client-side but doesn't redirect. If not authenticated, the scanner simply doesn't render — no feedback to the user.

**Remediation:** Show a login prompt or redirect to `/login` with a return URL.

---

### 7.6 🟡 Maps Use External CDN for Marker Icons (Medium)

**`LocationMap.tsx:7-12`**

```tsx
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
```

Loads marker icons from unpkg CDN at runtime.

**Impact:**
- External dependency — if unpkg is down, markers disappear
- Version pinned to 1.9.4 — may mismatch installed Leaflet version
- No offline support

**Remediation:** Copy marker assets to `public/` and reference locally.

---

### 7.7 🟡 Auth Layout Redirects Already-Authenticated Users (Medium)

**`(auth)/layout.tsx:14-16`**

```tsx
useEffect(() => {
  if (!loading && user) router.replace("/");
}, [user, loading, router]);
```

Uses `router.replace` which is client-side. Authenticated users briefly see the login page before redirect.

**Remediation:** Use Next.js middleware for server-side redirect.

---

### 7.8 🔵 Login/Register Share No Validation Logic (Low)

**`login/page.tsx:52-56`** vs **`register/page.tsx:120-128`**

Both pages implement their own validation:
```tsx
// Login: inline validation
if (!email) newErrors.email = 'El correo electrónico es obligatorio';
if (!password) newErrors.password = 'La contraseña es obligatoria';

// Register: toast-based validation
if (!form.business_name.trim() || !form.email.trim() || ...) {
  toast.error('Todos los campos son obligatorios');
```

Different validation patterns (inline errors vs toast) for the same type of validation.

**Remediation:** Use consistent validation pattern — preferably a form library like `react-hook-form` + `zod`.

---

## Area 8 — Config & Tests

**Files:** `package.json`, `next.config.js`, `tailwind.config.js`, `Dockerfile`, `tsconfig.json`, test files

### 8.1 🟠 Unused Dependencies (High)

**`package.json`**

Several dependencies are installed but appear unused in the codebase:

| Dependency | Status |
|-----------|--------|
| `@hookform/resolvers` | Installed but no `useForm` usage found in components |
| `react-hook-form` | Installed but forms use manual `useState` |
| `zod` | Installed but no schema validation found |
| `swr` | Installed but all data fetching uses `useEffect` + `Promise.all` |
| `date-fns` | Installed but dates use native `toLocaleDateString` |
| `clsx` | Installed but className concatenation uses template literals |

**Impact:**
- `react-hook-form` + `zod` + `@hookform/resolvers` = ~50KB unused JS shipped to client
- `swr` = ~15KB unused
- `recharts` is used but `optimizePackageImports` in next.config.js suggests bundle size was already a concern

**Remediation:** Either use these libraries (replace manual forms with react-hook-form, replace fetch patterns with SWR) or remove them.

---

### 8.2 🟠 No Unit Test Coverage for Components (High)

**`tests/unit/utils.test.ts` — only test file**

Only one unit test file exists, testing 3 utility functions. Zero component tests.

**Test coverage:**
- ✅ `adjustColor` (6 tests)
- ✅ `getNestedValue` (6 tests)
- ✅ `resolveDays` (3 tests)
- ❌ Auth context
- ❌ API interceptors
- ❌ Any React component
- ❌ Any page
- ❌ Form validation logic
- ❌ RBAC logic

**Impact:** 15 E2E specs exist (good), but no unit/integration tests for component behavior. Regressions are only caught at the E2E level (slow, expensive).

**Remediation:** Add unit tests for:
- Auth provider (login, logout, token refresh)
- API interceptors (401 handling, refresh logic)
- Key components (FormBuilder, TypeConfig, KPICard)
- Utility functions (all from constants.tsx)

---

### 8.3 🟠 Unit Test Copies Source Code Instead of Importing (High)

**`tests/unit/utils.test.ts:12-19`**

```tsx
// Re-implements adjustColor instead of importing it
function adjustColor(hex: string, amount: number): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
```

The test file duplicates the `adjustColor` function instead of importing from `constants.tsx`. If the source changes, tests still pass against the old implementation.

**Remediation:** Import from source: `import { adjustColor } from '@/components/programs/constants';`

---

### 8.4 🟡 `next.config.js`: Duplicate Rewrite Rules (Medium)

**`next.config.js:37-48`**

```tsx
rewrites() {
  return [
    { source: '/api/:path*/', destination: `...` },
    { source: '/api/:path*', destination: `...` },
  ];
}
```

Two identical rewrite rules differing only by trailing slash. Next.js handles trailing slashes via the `trailingSlash: true` config.

**Remediation:** Use a single rewrite with a regex that handles both: `source: '/api/:path*/?'`.

---

### 8.5 🟡 Dockerfile: No `.dockerignore` Optimization (Medium)

**`Dockerfile:11`**

```dockerfile
COPY package.json ./
RUN npm install --legacy-peer-deps
```

Stage 1 copies only `package.json` (good), but Stage 2 copies everything:
```dockerfile
COPY . .
```

Without a `.dockerignore`, this includes `node_modules`, `.next`, `.git`, test files, etc.

**Remediation:** Ensure `.dockerignore` exists with:
```
node_modules
.next
.git
tests
*.md
```

---

### 8.6 🟡 `tsconfig.json`: `strict: true` but Code Uses `any` Patterns (Medium)

**`tsconfig.json:8`**

```json
"strict": true
```

TypeScript strict mode is enabled, yet the codebase uses patterns that circumvent type safety:
- `Record<string, unknown>` everywhere (finding 1.4, 4.2)
- Unsafe `as` assertions (finding 7.2)
- `@ts-nocheck` was removed (per comment in analytics page) but `any` patterns remain

**Impact:** Strict mode is partially defeated by pervasive `Record<string, unknown>`.

---

### 8.7 🟡 Next.js Version is Outdated (Medium)

**`package.json:18`**

```json
"next": "14.2.21"
```

Next.js 14.2.x is outdated. Current stable is 15.x with significant improvements:
- Turbopack (faster builds)
- Improved caching
- Better TypeScript support
- Server Actions improvements

**Impact:** Missing security patches and performance improvements.

**Remediation:** Plan upgrade to Next.js 15.x.

---

### 8.8 🔵 `--legacy-peer-deps` in Dockerfile (Low)

**`Dockerfile:4`**

```dockerfile
RUN npm install --legacy-peer-deps
```

This flag ignores peer dependency conflicts. Indicates dependency version mismatches that should be resolved.

**Remediation:** Fix peer dependency conflicts and remove the flag.

---

### 8.9 🔵 No Lighthouse / Performance Budget (Low)

No performance budgets, Lighthouse CI, or bundle analysis configured. Given the heavy use of recharts and multiple parallel API calls, bundle size monitoring would be valuable.

**Remediation:** Add `@next/bundle-analyzer` and set performance budgets in CI.

---

## Summary of Findings

| Severity | Count | Key Issues |
|----------|-------|------------|
| 🔴 Critical | 2 | Mega-components, massive type duplication |
| 🟠 High | 14 | Duplicate refresh logic, cookie config, no type safety on APIs, inline modals, monolithic pages |
| 🟡 Medium | 18 | Missing focus traps, i18n, modal patterns, SSR guards, validation |
| 🔵 Low | 10 | Minor inconsistencies, dead code, hardcoded locales |
| ⚪ Info | 0 | — |
| **Total** | **44** | |

### Top 5 Priorities

1. **🔴 Decompose mega-components** — Dashboard page (400+ lines), Locations (500+ lines), TypeConfig (480+ lines). Extract sub-components.
2. **🟠 Consolidate token refresh logic** — Two competing refresh mechanisms in `auth.tsx` and `api.ts`. Race conditions likely.
3. **🟠 Add shared type definitions** — 15+ duplicate type definitions across pages. Create `src/types/api.ts`.
4. **🟠 Use installed libraries** — `react-hook-form`, `zod`, `swr` are installed but unused. Either adopt them or remove bloat.
5. **🟡 Standardize modal pattern** — 5+ inline modal implementations. Use `ConfirmModal` everywhere + a reusable `FormModal`.
