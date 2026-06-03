# Loyallia Frontend Architecture

This document describes the architecture, patterns, and technical decisions behind the Loyallia frontend.

---

## 1. Tech Stack and Versions

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 14.2.35 | App Router, SSR/SSG, API routes, standalone output |
| UI Library | React | 18.3.1 | Component model, hooks, concurrent features |
| Language | TypeScript | 5.6.3 | Strict type safety, path aliases, incremental builds |
| Styling | Tailwind CSS | 3.4.14 | Utility-first CSS with custom design tokens |
| PostCSS | autoprefixer + postcss | latest | CSS processing |
| HTTP Client | Axios | 1.7.7 | API requests, interceptors, abort signals |
| Data Fetching | SWR | 2.2.5 | Caching, revalidation, optimistic updates |
| Forms | React Hook Form | 7.53.0 | Performant form state management |
| Validation | Zod | 3.23.8 | Runtime schema validation |
| Charts | Recharts | 2.12.7 | Analytics and reporting visualizations |
| Maps | Leaflet + React Leaflet | 1.9.4 / 4.2.1 | Store location maps |
| Drag & Drop | @dnd-kit | 6.3.1 | Sortable lists, program builders |
| QR Codes | qrcode.react + html5-qrcode | latest | Pass generation and scanning |
| Cookies | js-cookie | 3.0.5 | Token storage with config |
| Toasts | react-hot-toast | 2.4.1 | User feedback notifications |
| E2E Testing | Playwright | 1.59.1 | Cross-browser end-to-end testing |
| Unit Testing | Vitest | 2.1.9 | Fast unit/component tests |
| Linting | ESLint + eslint-config-next | 8.57.1 / 14.2.35 | Code quality and Next.js rules |

### TypeScript Configuration

- `strict: true` with additional checks: `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`
- Path alias `@/*` resolves to `./src/*`
- `isolatedModules: true` ensures safe transpilation
- Tests and `src/_archive` are excluded from compilation

---

## 2. App Router Structure

### Route Groups

The application uses Next.js **route groups** to co-locate related pages under shared layouts without affecting the URL path.

```
src/app/
├── (auth)/               # Auth layout (no sidebar, centered forms)
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   └── reset-password/
├── (dashboard)/          # Dashboard layout (sidebar, nav, auth guard)
│   ├── page.tsx          # /dashboard (home)
│   ├── programs/
│   ├── customers/
│   ├── analytics/
│   ├── campaigns/
│   ├── automation/
│   ├── locations/
│   ├── team/
│   ├── billing/
│   ├── settings/
│   └── superadmin/
├── api/                  # Next.js API routes
│   └── chat/
├── enroll/               # Public enrollment flow
├── pass/                 # Public digital wallet pass display
├── portal/               # Public customer portal
├── scanner/              # Public QR scanner
└── legal/                # Static legal pages
```

### Middleware

`src/middleware.ts` runs at the edge to enforce authentication boundaries:

- **Protected routes** (`/dashboard`, `/programs`, `/customers`, etc.) require an `access_token` cookie. Missing tokens redirect to `/login?redirect=<path>`.
- **Auth-only routes** (`/login`, `/register`, `/forgot-password`, `/reset-password`) redirect authenticated users to `/dashboard`.
- **Public routes** (`/portal`, `/enroll`, `/pass`, `/legal`, `/scanner`, `/`) bypass all checks.
- The matcher excludes Next.js internals, static files, and API routes.

```ts
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
```

---

## 3. State Management

### SWR (Server State)

SWR is the primary tool for server data. It provides caching, deduplication, revalidation on focus, and optimistic updates. The typed API modules in `lib/api.ts` return Axios promises that integrate cleanly with SWR fetchers.

### React Context (Client State)

Three core contexts manage global client-side state:

#### AuthContext (`lib/auth.tsx`)
- Stores the current `User` object and loading state.
- Hydrates the user profile on mount using the access token cookie.
- Exposes `login`, `loginWithGoogle`, `logout`, and `refreshUser`.
- Automatically schedules token refresh via `TokenManager` on mount.

#### ThemeContext (`lib/theme.tsx`)
- Supports three modes: `light`, `dark`, `system`.
- Persists preference to `localStorage`.
- Listens to `prefers-color-scheme` changes when mode is `system`.
- Applies the resolved theme class to `<html>` for Tailwind `darkMode: 'class'`.

#### PlanContext (`context/PlanContext.tsx`)
- Fetches the current tenant's subscription plan (`/api/v1/tenants/me/plan-features/`).
- Exposes `planName`, `features`, `limits`, `usage`, and helpers (`hasFeature`, `isAtLimit`).
- Wrapped by the `usePlan` hook (`hooks/usePlan.ts`) for ergonomic access.

---

## 4. Authentication Flow

### JWT Lifecycle

1. **Login** (credentials or Google OAuth) → backend returns `access_token` + `refresh_token`.
2. **Storage** → `TokenManager.setTokens()` stores both in secure, same-site, `strict` cookies (`access_token` expires in 1 hour; `refresh_token` in 7 days).
3. **Proactive Refresh** → `TokenManager` decodes the JWT payload, calculates time-to-expiry, and schedules a refresh ~5 minutes before expiration.
4. **Reactive Refresh** → if an API call returns 401, the Axios response interceptor attempts a refresh. Success retries the original request; failure clears tokens and redirects to `/login`.
5. **Logout** → clears cookies, cancels pending refresh timers, and hard-navigates to `/login`.

### Role-Based Access Control (RBAC)

The `User` type includes a `role` enum:

- `OWNER` — full tenant access
- `MANAGER` — elevated staff access
- `STAFF` — restricted operational access
- `SUPER_ADMIN` — platform-wide administration

Components and pages use role checks to conditionally render UI or guard routes. The backend enforces authorization on all API endpoints; the frontend mirrors these checks for UX purposes.

### Super Admin Impersonation

- Super admins can impersonate tenant users for support.
- The admin's original token is backed up in `sessionStorage`.
- A dashboard banner shows impersonation status and a countdown.
- After 1 hour, impersonation auto-expires and the admin session is restored.

---

## 5. API Integration

### Axios Instance (`lib/api.ts`)

A single Axios instance is configured with:

- **Base URL** resolution (`NEXT_PUBLIC_API_URL` for SSR, same-origin for browser).
- **Request interceptor** — injects `Bearer` token from `access_token` cookie.
- **Response interceptor** — handles 401 refresh and retryable errors.
- **Timeout** — 30 seconds default.
- **Abort support** — `cancelAllRequests()` aborts in-flight requests via a global `AbortController`.

### Retry Logic

Retryable HTTP status codes: `408, 429, 500, 502, 503, 504`.

- Up to **3 retries** with exponential backoff (`delay = 1000 * 2^attempt + random(0-500ms)`).
- Respects `Retry-After` headers when present.
- Offline detection via `navigator.onLine` with custom `loyallia-online` / `loyallia-offline` window events.

### Typed API Modules

API endpoints are organized into domain-specific objects:

- `authApi` — login, register, logout, profile, Google OAuth, phone verification
- `programsApi` — CRUD, publish/suspend, stats, members, transactions
- `customersApi` — CRUD, import/export, segmentation, passes
- `analyticsApi` — dashboards, trends, demographics, revenue
- `notificationsApi` / `campaignsApi` — campaign creation and reporting
- `automationApi` — rule CRUD, toggle, execute
- `billingApi` — plans, subscription, usage, invoices
- `superAdminApi` — platform metrics, plans, integrations, factory reset
- `scannerApi` — QR validation and transaction recording
- `whatsappApi` — QR and connection status

### Proxy Configuration

During development, Next.js rewrites forward `/api/*` to the backend. This keeps the frontend on the same origin and avoids CORS preflight issues.

```js
// next.config.js
async rewrites() {
  return [
    {
      source: '/api/:path*/',
      destination: `${API_URL}/api/:path*/`,
    },
  ];
}
```

---

## 6. Component Patterns

### Reusable UI Primitives (`components/ui/`)

The UI layer is built from small, composable primitives:

- **ConfirmModal** — confirmation dialogs with customizable actions
- **FormField** — labeled input wrapper with error display
- **ImageUploadField** — drag-and-drop image upload with preview
- **PageHeader** — consistent page title + action button layout
- **CookieConsent** — GDPR-compliant consent banner
- **OfflineBanner** — connectivity status indicator
- **ErrorBoundary** — class-based error boundary for graceful failures
- **LucideIcons / StampIcons** — icon wrappers with custom sets

### Form Handling

Forms use a consistent stack:

1. **React Hook Form** for performant field state and validation timing.
2. **Zod schemas** (in `lib/validations.ts`) for runtime validation.
3. **`@hookform/resolvers`** to bridge Zod into RHF.
4. **Custom `FormField`** components for consistent labeling, spacing, and error messaging.

Example pattern:

```tsx
const schema = z.object({ name: z.string().min(1) });
type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

### Dashboard Layout

`app/(dashboard)/layout.tsx` wraps all dashboard pages with:

- Sidebar navigation with role-based visibility
- Top bar with profile, notifications, theme toggle
- Impersonation banner (when applicable)
- Lazy-loaded Chatbot (`next/dynamic` with `ssr: false`)
- ErrorBoundary around the main content area
- PlanProvider for subscription-aware rendering

---

## 7. Testing Strategy

### End-to-End (Playwright)

- **Location:** `tests/e2e/`
- **Setup:** `auth.setup.ts` logs in all roles through the real API and stores auth state in `.auth/`.
- **Projects:** 15+ domain-specific projects allow running targeted suites (e.g., `--project=programs`).
- **Isolation:** Tests run serially (`workers: 1`) to avoid shared-state collisions.
- **Artifacts:** Traces, screenshots, and videos are captured on first retry and failure.
- **Security:** No hardcoded credentials; credentials are read from `.auth/e2e-credentials.json` (git-ignored).

### Unit (Vitest)

- **Location:** `tests/unit/`
- **Environment:** `node`
- **Imports:** `@/` aliases resolve to `./src`.
- **Coverage:** Utility functions, validation logic, and pure helpers.

---

## 8. Performance

### Lazy Loading

- The **Chatbot** component is loaded via `next/dynamic` with `ssr: false` to avoid SSR bundle bloat.
- Heavy pages (maps, analytics charts) can use dynamic imports to split JavaScript bundles.

### Image Optimization

- `next/image` is used throughout with explicit `remotePatterns`:
  - `localhost:9000/assets/**` (MinIO/S3 dev assets)
  - `*.loyallia.com` (production CDN)
- Images are automatically optimized, resized, and served in modern formats.

### Bundle Optimizations

- `experimental.optimizePackageImports: ['recharts']` enables automatic tree-shaking for the charting library.
- Standalone output strips all dev dependencies and unnecessary files from the production image.

### Security Headers

Next.js injects the following headers on every route:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-DNS-Prefetch-Control: on`

---

## 9. Design System (Tailwind)

### Custom Tokens

The Tailwind config extends the default theme with Loyallia-specific tokens:

- **Colors:**
  - `brand-50` → `brand-900` (primary indigo/purple palette)
  - `surface-0` → `surface-950` (neutral gray scale)
  - Semantic tokens: `text-success`, `bg-danger`, `border-warning`, etc.
- **Shadows:**
  - `shadow-card` / `shadow-card-hover` — premium soft shadows
  - `shadow-glow` — brand glow effect
  - `shadow-inner-light` — subtle top highlight
- **Border Radius:** `xl` (12px) through `4xl` (32px)
- **Animations:** `fade-in`, `slide-up`, `pulse-slow`
- **Dark Mode:** `darkMode: 'class'` driven by ThemeContext

---

## 10. i18n Architecture

A lightweight, dependency-free i18n system lives in `lib/i18n/`:

- **Provider** (`I18nProvider`) manages locale state in `localStorage`.
- **Resolution** — stored preference → browser language → Spanish fallback.
- **Interpolation** — simple `{var}` substitution.
- **Locales** — ES, EN, FR, DE JSON files with nested keys.

This avoids the bundle size and complexity of larger i18n libraries while covering all current requirements.

---

## 11. File Conventions

- **Components:** PascalCase (`ConfirmModal.tsx`)
- **Hooks:** camelCase prefixed with `use` (`usePlan.ts`)
- **Contexts:** PascalCase suffixed with `Context` / `Provider` (`PlanContext.tsx`)
- **Libraries / Utils:** camelCase (`token-manager.ts`, `date-utils.ts`)
- **Types:** PascalCase interfaces in `types/index.ts`
- **Tests:** Co-located by category (`tests/e2e/suite/`, `tests/unit/`)

---

## 12. Related Documentation

- `README.md` — setup, installation, scripts, and deployment
- `next.config.js` — routing rewrites, headers, image domains, standalone output
- `playwright.config.ts` — E2E project definitions and auth setup
- `Dockerfile` — multi-stage build instructions
