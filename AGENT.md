# AGENT.md — Loyallia Agentic Directives

> **Single source of truth for all coding agents operating on this codebase.**
> Last updated: 2026-04-22

---

## 1. Architecture Rules

### 1.1 Technology Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | Django + Django Ninja | Django 5.x, Ninja 1.x |
| **Database** | PostgreSQL via Django ORM | PostgreSQL 16 |
| **Task Queue** | Celery + Redis | Celery 5.x |
| **Object Storage** | MinIO (S3-compatible) | Latest |
| **Secret Management** | HashiCorp Vault KV v2 | 1.15+ |
| **Frontend** | Next.js + React + TailwindCSS 3 | Next 14, React 18, TW 3.4 |
| **Connection Pooling** | PgBouncer | Latest |

### 1.2 Forbidden Technologies
- **FastAPI / Starlette / uvicorn** — All API endpoints MUST use Django Ninja
- **SQLAlchemy / Alembic** — All models MUST use Django ORM + Django migrations
- **Alpine.js** — Deprecated. Use React components in the Next.js frontend
- **TailwindCSS v4** — Pinned to v3.4.14; v4 is incompatible with current PostCSS config

### 1.3 Port Authority (339xx Range)
| Port | Service |
|------|---------|
| 33900 | PostgreSQL |
| 33901 | PgBouncer |
| 33902 | Redis |
| 33903 | MinIO API |
| 33904 | MinIO Console |
| 33905 | Django API |
| 33906 | Next.js Frontend |
| 33907 | Flower (Celery Monitor) |
| 33908 | Vault UI |

### 1.4 File Size Constraint
> **HARD LIMIT: 500 lines per file**

No `.py` or `.tsx` file shall exceed 500 lines. If a file grows beyond this:
1. Split into a package directory
2. Create `__init__.py` that re-exports the public API
3. Organize by concern (e.g., `api/` -> `api/customers.py`, `api/passes.py`, `api/exports.py`)

---

## 2. Coding Standards

### 2.1 Python (Backend)
- **Linter**: `ruff` (config in `backend/pyproject.toml`)
- **Formatter**: `black` (120 char line length)
- **Type checking**: `pyright` basic mode
- **Import order**: stdlib -> third-party -> Django -> local apps (enforced by ruff isort)
- **No hardcoded secrets**: All sensitive data via `decouple.config()` or Vault
- **No mocks/stubs/placeholders**: Production-grade code only
- **Error codes**: Use `common/messages.py` with `get_message(code, **kwargs)`
- **Logging**: Use `logging.getLogger(__name__)` -- never `print()`

### 2.2 Django Patterns
- **Models**: One model per logical concern, UUIDField primary keys, verbose_name in Spanish
- **Migrations**: `python manage.py makemigrations && python manage.py migrate`
- **Middleware**: Tenant isolation via `apps.tenants.middleware.TenantMiddleware`
- **Permissions**: Use `common/permissions.py` decorators (`@require_role`, etc.)
- **Custom User**: `apps.authentication.models.User` with `UserRole` TextChoices
- **RBAC Roles**: `SUPER_ADMIN`, `OWNER`, `MANAGER`, `STAFF`
- **Signals**: In `apps/<app>/signals.py`, connected in `AppConfig.ready()`
- **Tasks**: In `apps/<app>/tasks.py`, routed via `CELERY_TASK_ROUTES` in settings

### 2.3 Frontend (Next.js)
- Pages in `src/app/(dashboard)/` for authenticated routes
- Components in `src/components/` organized by feature
- API calls via `src/lib/api.ts` with JWT auth headers
- Translations: i18n-ready, Spanish (Ecuador) primary

---

## 3. Wallet Engine Specifications

### 3.1 Apple Wallet (PKPass)
- **Pass styles**: `storeCard` (loyalty/cashback), `coupon` (offers), `generic` (VIP/membership)
- **Field limits**: 3 header, 1 primary, 4 secondary, 4 auxiliary
- **Barcode**: `PKBarcodeFormatQR` preferred; Code128 needs fallback (no watchOS support)
- **Images**: icon 29x29pt, logo 160x50pt, strip 375x123pt (storeCard) / 375x144pt (coupon)
- **Colors**: `backgroundColor`, `foregroundColor`, `labelColor` as RGB strings
- **Notifications**: Via APNs push -> device fetches updated `.pkpass`
- **Localization**: `es.lproj/pass.strings` + `en.lproj/pass.strings`

### 3.2 Google Wallet (JWT)
- **Class types**: `LoyaltyClass`, `OfferClass`, `GiftCardClass`
- **Button**: MUST use official "Add to Google Wallet" SVG/PNG assets
- **Images**: Logo >= 800x800px, Hero 1032x336px
- **Colors**: `hexBackgroundColor` (hex string, not RGB)
- **Notifications**: REST API `addMessage` on class (all holders) or object (one user)
- **Message structure**: `{ "header": "...", "body": "...", "messageType": "TEXT" }`

### 3.3 Notification Character Limits
| Platform | Field | Limit |
|----------|-------|-------|
| Apple (APNs) | Alert body | 178 chars (optimal) |
| Google | Message header | 40 chars |
| Google | Message body | 240 chars |

---

## 4. Data Protection (LOPDP -- Ecuador)

- **Consent modal**: Required before ANY data upload (CSV/XLSX)
- **Audit trail**: All write operations logged to `AuditLog` model (immutable)
- **Data retention**: 5 years minimum for audit records
- **Data portability**: CSV export of customer data on request
- **No audit deletion**: `AuditLog` has NO delete endpoint

---

## 5. Business Rules

| Rule | Value |
|------|-------|
| JWT access token lifetime | 60 minutes |
| JWT refresh token lifetime | 30 days |
| Tax rate (Ecuador IVA 2024) | 15% |
| Max programs per tenant | 10 |
| Max locations per tenant | 50 |
| Geo-push cooldown | 4 hours |
| Geo-fence radius | 100 meters |
| Trial period | 14 days |
| Plan price | $75.00 USD |
| Max import file size | 10MB |
| Max import rows | 50,000 |

---

## 6. Deployment

### 6.1 Development
```bash
docker compose up -d --build
# Verify:
curl http://localhost:33905/api/v1/health/
docker exec loyallia-api python manage.py seed_test_data
```

### 6.2 Secrets
- Development: `.env` file (gitignored) + Vault dev mode
- Production: Vault KV v2 with sealed storage
- NEVER commit `.env` or certificate files

### 6.3 Quality Gates
```bash
cd backend && ruff check .                   # 0 errors
cd backend && black --check .                # 0 formatting issues
find backend -name '*.py' | xargs wc -l | awk '$1>500'  # 0 results (excl. venv)
```

---

## 7. References

- [Apple PassKit Design Guide](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Creating.html)
- [Apple Wallet HIG](https://developer.apple.com/design/human-interface-guidelines/wallet)
- [Google Wallet Brand Guidelines](https://developers.google.com/wallet/generic/resources/brand-guidelines)
- [Google Wallet Notifications](https://developers.google.com/wallet/generic/use-cases/notifications)
- [Ecuador LOPDP](https://www.registroficial.gob.ec/) -- Ley Organica de Proteccion de Datos Personales (May 2021)
