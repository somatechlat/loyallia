# Loyallia Frontend

Loyallia Dashboard is a Next.js 14 web application for managing loyalty programs, customers, campaigns, analytics, billing, and more. It serves as the primary administrative interface for business owners, managers, and staff, plus a public-facing portal for end customers.

---

## Project Overview

| Technology | Version |
|------------|---------|
| Next.js | 14.2.35 |
| React | 18.3.1 |
| TypeScript | 5.6.3 |
| Tailwind CSS | 3.4.14 |
| Node.js | 22 (LTS) |

Key capabilities include:

- **App Router** with route groups for auth and dashboard experiences
- **TypeScript** in strict mode with path aliases (`@/*`)
- **Tailwind CSS** with a custom design system (brand tokens, semantic colors, premium shadows)
- **Authentication** via JWT (credentials + Google OAuth) with automatic token refresh
- **Role-based access control** (Owner, Manager, Staff, Super Admin)
- **Real-time data** via SWR and Axios with retry logic
- **End-to-end testing** with Playwright across 15+ project suites
- **Unit testing** with Vitest
- **Dark mode** support with system preference detection
- **Internationalization** (Spanish, English, French, German)

---

## Prerequisites

- **Node.js** 22 LTS (matches the Docker base image)
- **npm** 10+ (shipped with Node 22)
- **Docker** 24+ (for containerized development and production builds)
- A running **Loyallia backend API** (default: `http://localhost:33905`)

---

## Installation

```bash
cd frontend
npm install --legacy-peer-deps
```

### Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# Required
NEXT_PUBLIC_API_URL=http://localhost:33905
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional
NEXT_INTERNAL_API_URL=http://localhost:33905
ALLOWED_ORIGINS=localhost,localhost:33906,127.0.0.1:33906
NEXT_PUBLIC_QR_SERVICE_URL=https://quickchart.io
NEXT_PUBLIC_WHATSAPP_SHARE_URL=https://wa.me
NEXT_PUBLIC_NOMINATIM_URL=https://nominatim.openstreetmap.org/search
NEXT_PUBLIC_LEAFLET_ICON_URL=https://unpkg.com/leaflet@1.9.4/dist/images
```

> `NEXT_INTERNAL_API_URL` is used at build time for server-side rendering; `NEXT_PUBLIC_API_URL` is used in the browser.

---

## Development

```bash
# Start the dev server on port 3000
npm run dev
```

The application will be available at `http://localhost:3000`.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server (`-p 3000`) |
| `npm run build` | Production build with standalone output |
| `npm start` | Start production server (`-p 3000`) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run `tsc --noEmit` (clears incremental cache first) |
| `npm run test:unit` | Run Vitest unit tests |
| `npm run test:e2e` | Run full Playwright E2E suite |
| `npm run test:e2e:headed` | Run E2E tests in headed mode |
| `npm run test:e2e:fast` | Run E2E excluding `@slow` and phone verification tests |
| `npm run test:e2e:smoke` | Run smoke tests (auth, programs, customers, analytics) |
| `npm run test:e2e:ci` | Run CI subset (auth, programs, customers, superadmin, role-isolation) |
| `npm run test:all` | Run typecheck + unit tests + build + E2E |

---

## Testing

### Playwright (E2E)

E2E tests live in `tests/e2e/` and are organized by domain:

- **Setup:** `auth.setup.ts` authenticates all roles before the suite runs.
- **Projects:** 15+ named projects (auth, programs, customers, team, locations, analytics, automation, campaigns, settings-billing, scanner, superadmin, wallet, whatsapp, security, billing, role-isolation, etc.).
- **Auth state:** Pre-authenticated JSON files are stored in `.auth/` to avoid repeated logins.

Run against the local Docker cluster:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:33906 npx playwright test
```

### Vitest (Unit)

Unit tests live in `tests/unit/` and are configured with the `node` environment:

```bash
npm run test:unit
```

The Vitest config resolves `@/` aliases to `./src` for clean imports.

---

## Build

```bash
npm run build
```

The project uses Next.js **standalone output** (`output: 'standalone'` in `next.config.js`). This produces a minimal production bundle under `.next/standalone/` containing only the server, static assets, and required `node_modules` dependencies.

Key build behaviors:

- `trailingSlash: true` enforces trailing slashes on all routes.
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) are injected at build time.
- `experimental.optimizePackageImports` tree-shakes `recharts` automatically.

---

## Deployment

### Docker (Recommended)

The multi-stage `Dockerfile` produces a ~200 MB production image:

```bash
# Build production image
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.loyallia.com \
  --build-arg NEXT_PUBLIC_APP_URL=https://app.loyallia.com \
  --target runner \
  -t loyallia-frontend .

# Run
docker run -p 3000:3000 loyallia-frontend
```

Stages:

1. **deps** — installs dependencies with layer caching.
2. **development** — mounts source and runs `npm run dev`.
3. **builder** — builds the optimized standalone bundle.
4. **runner** — minimal alpine image running as non-root `nextjs` user.

### Production Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Public API base URL (baked into bundle) |
| `NEXT_PUBLIC_APP_URL` | Public app base URL (baked into bundle) |
| `NEXT_INTERNAL_API_URL` | Internal API URL for SSR / rewrites |
| `ALLOWED_ORIGINS` | Comma-separated list for Server Actions origin allowlist |

> Variables prefixed with `NEXT_PUBLIC_` are inlined at build time and cannot be changed at runtime.

---

## Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Auth route group (login, register, forgot-password, reset-password)
│   │   ├── (dashboard)/     # Dashboard route group (customers, programs, analytics, settings, ...)
│   │   ├── api/             # API routes (e.g., chat proxy)
│   │   ├── enroll/          # Public customer enrollment pages
│   │   ├── pass/            # Public digital pass pages
│   │   ├── portal/          # Public portal pages
│   │   ├── scanner/         # QR scanner public pages
│   │   └── legal/           # Legal pages (privacy, terms)
│   ├── components/
│   │   ├── ui/              # Reusable UI primitives (ConfirmModal, FormField, ImageUploadField, ...)
│   │   ├── dashboard/       # Dashboard-specific components
│   │   ├── programs/        # Program management components
│   │   ├── wallet/          # Wallet/pass components
│   │   └── ...
│   ├── context/
│   │   └── PlanContext.tsx  # Subscription plan context (features, limits, usage)
│   ├── hooks/
│   │   └── usePlan.ts       # Convenience hook wrapping PlanContext
│   ├── lib/
│   │   ├── api.ts           # Axios instance, interceptors, typed API modules
│   │   ├── auth.tsx         # AuthContext provider (JWT, Google OAuth, logout)
│   │   ├── token-manager.ts # Proactive JWT refresh + cookie management
│   │   ├── theme.tsx        # ThemeContext (light / dark / system)
│   │   ├── i18n/            # i18n provider + locale JSON files
│   │   ├── constants.ts     # App-wide constants (COOKIE_CONFIG, API_CONFIG, APP_CONFIG, ROLE_LABELS)
│   │   └── validations.ts   # Zod schemas for form validation
│   ├── types/
│   │   └── index.ts         # Shared TypeScript types (User, Customer, Program, Transaction, ...)
│   └── styles/              # Global CSS / Tailwind directives
├── tests/
│   ├── e2e/                 # Playwright E2E tests
│   │   ├── suite/           # Spec files organized by domain
│   │   └── helpers/         # E2E utilities
│   └── unit/                # Vitest unit tests
├── public/                  # Static assets
├── .auth/                   # Playwright auth state (ignored by git)
├── next.config.js           # Next.js config (standalone, rewrites, headers, images)
├── tailwind.config.js       # Tailwind theme extensions
├── playwright.config.ts     # Playwright project configuration
├── vitest.config.ts         # Vitest configuration
├── tsconfig.json            # TypeScript strict config with path aliases
└── Dockerfile               # Multi-stage Docker build
```

---

## Key Conventions

### Routing

- **Route groups** `(auth)` and `(dashboard)` keep layouts and loading states scoped to their respective user journeys without adding path segments.
- **Trailing slashes** are enforced globally (`trailingSlash: true`).
- **Middleware** (`src/middleware.ts`) protects routes:
  - Unauthenticated users hitting protected routes are redirected to `/login` with a `?redirect=` parameter.
  - Authenticated users hitting auth routes are redirected to `/dashboard`.
  - Public routes (`/portal`, `/enroll`, `/pass`, `/legal`, `/scanner`) bypass auth checks.

### Authentication

- JWT access and refresh tokens are stored in **secure, same-site, `strict` cookies** via `js-cookie`.
- `TokenManager` handles **proactive refresh** (scheduled ~5 minutes before expiry) and **reactive refresh** (on 401 responses).
- `AuthContext` exposes `login`, `loginWithGoogle`, `logout`, and `refreshUser` to the React tree.
- **Super Admin impersonation** stores the admin token in `sessionStorage` and auto-expires after 1 hour.

### Internationalization (i18n)

- A custom React context (`lib/i18n/index.tsx`) provides translations without an external i18n library.
- Supported locales: **es**, **en**, **fr**, **de**.
- Resolution order: `localStorage` preference → browser language → Spanish fallback.
- Nested keys are supported: `t('dashboard.welcome', { name: 'Ada' })`.

### API Proxy

- The Next.js dev server rewrites `/api/*` requests to the backend API URL via `next.config.js`.
- This avoids CORS issues during local development and allows the frontend to make same-origin requests.

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

- In production (Docker / standalone), the same rewrites apply or the frontend can talk directly to the backend via `NEXT_INTERNAL_API_URL`.

---

## License

Proprietary — Loyallia.
