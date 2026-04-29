# Loyallia — Digital Loyalty Platform

> **Plataforma inteligente de fidelización digital.**
> Powered by SomaTech LAT.

---

## Documentation Index

| Document | Path | Description |
|----------|------|-------------|
| **SRS (Complete)** | `docs/SRS_Loyallia_COMPLETE.md` | Full ISO/IEC 29148:2018 Software Requirements Specification |
| **Architecture & Diagrams** | `docs/ARCHITECTURE.md` | System architecture, sequence diagrams, flowcharts, ERD (Mermaid) |
| **Port Authority** | `docs/PORT_AUTHORITY.md` | Development port map |
| **Audit Report** | `docs/audit/2026-04-29_FULL_AUDIT.md` | Full codebase audit — 241 findings |
| **Handoff** | `HANDOFF.md` | Current project status and remaining work |
| **Docker Compose** | `docker-compose.yml` | Full local/staging stack — all open source |

---

## Platform Overview

Loyallia enables businesses to run digital loyalty programs delivered natively through **Apple Wallet** and **Google Wallet** — **zero customer app installation required**.

### Key Modules

| # | Module |
|---|--------|
| 1 | Authentication & Multi-Tenant Management |
| 2 | Digital Card Engine — **10 Card Types** |
| 3 | Scanner PWA (Staff — browser-based, no app store needed) |
| 4 | Business Dashboard (Next.js) |
| 5 | Push Notifications + Geo-Fencing (≤100m) |
| 6 | Intelligent Automation Engine |
| 7 | Customer Segmentation & Retargeting |
| 8 | Analytics & KPI Reporting |
| 9 | Referral Program Engine |
| 10 | Subscription & Billing (Bendo/PlacetoPay + IVA) |
| 11 | Customer Wallet Experience |
| 12 | REST API & Integration Layer (Django Ninja) |
| 13 | Super-Admin Panel |
| 14 | Agent API (Enterprise — AI Assistant) |
| 15 | Audit & Compliance (LOPDP/GDPR) |
| 16 | i18n — Multi-Language (ES, EN, FR, DE) |

### 10 Loyalty Card Types

1. **Stamp Card** — Buy 9, get 1 free
2. **Cashback** — % credit on purchases
3. **Coupon** — Single-use high-value discount
4. **Affiliate Card** — Register for promotions
5. **Discount Card** — Multi-tier discount levels
6. **Gift Certificate** — Prepaid digital gift
7. **VIP Membership** — Recurring revenue club
8. **Corporate Discount** — B2B wholesale pricing
9. **Referral Pass** — Viral customer acquisition
10. **Multipass** — Prepaid stamp bundles

---

## Scanner App — Important Architecture Note

> **The normal phone camera IS used for customer enrollment.**
> Customers scan the business QR poster → browser opens → fill form → Wallet pass saved.
> No app download required for customers.

> **Business staff use the Loyallia Scanner PWA** (a web app opened in the phone browser at `loyallia.com/scanner`).
> The PWA uses the browser camera API to scan customer Wallet pass QR codes and record transactions via the API.
> **No app store required for staff either.**

---

## Technology Stack (All Open Source)

| Layer | Technology |
|-------|-----------|
| Backend API | Django 5 + Django Ninja |
| ORM | Django ORM + PostgreSQL 16 |
| Dashboard | Next.js 14 (React 18) |
| Scanner | Progressive Web App (browser-based) |
| Task Queue | Celery 5 + Redis 7 |
| Scheduler | Celery Beat + django-celery-beat |
| Connection Pool | PgBouncer |
| File Storage | MinIO (S3-compatible) |
| Reverse Proxy | Nginx (production) |
| Worker Monitor | Flower |
| Secret Management | HashiCorp Vault |
| Payment Gateway | Bendo / PlacetoPay (pluggable) |
| Containers | Docker + Docker Compose |
| Monitoring | Prometheus + Grafana + Loki |

---

## Quick Start (Docker)

```bash
# 1. Clone and enter repo
git clone <repo> loyallia && cd loyallia

# 2. Copy environment template and fill in your credentials
cp .env.example .env
# Edit .env with real values — see .env.example for all required variables

# 3. Place certificates
mkdir -p certs
# certs/apple_pass.pem, apple_pass.key, apple_wwdr.pem
# certs/google_wallet_service_account.json
# certs/firebase_service_account.json

# 4. Start all services (builds images + migrates + seeds data)
docker compose up -d --build

# 5. Access points
# Dashboard:       http://localhost:33906
# API Docs:        http://localhost:33905/api/v1/docs/
# API Health:      http://localhost:33905/api/v1/health/
# MinIO Console:   http://localhost:33904
# Flower:          http://localhost:33907
# Vault UI:        http://localhost:33908
# Grafana:         http://localhost:33910
# Prometheus:      http://localhost:33909
```

---

## Service Ports (33900+ Range)

| Port  | Service           | Internal Port | Notes              |
|-------|-------------------|---------------|--------------------|
| 33900 | PostgreSQL 16     | 5432          | Primary database   |
| 33901 | PgBouncer         | 6432          | Connection pooling |
| 33902 | Redis 7           | 6379          | Cache + Celery     |
| 33903 | MinIO (API)       | 9000          | File storage       |
| 33904 | MinIO (Console)   | 9001          | Admin UI           |
| 33905 | Django API        | 8000          | REST API           |
| 33906 | Next.js Dashboard | 3000          | Frontend           |
| 33907 | Flower            | 5555          | Celery monitor     |
| 33908 | HashiCorp Vault   | 8200          | Secrets            |
| 33909 | Prometheus        | 9090          | Metrics            |
| 33910 | Grafana           | 3000          | Dashboards         |

> **Memory Budget**: 10GB total cluster limit. See `docker-compose.yml` header for per-service allocation.

---

## Subscription Plans

| Plan | Monthly | Annual | AI | Agent API | Geo |
|------|---------|--------|-----|-----------|-----|
| Trial (5 days) | Free | — | ✅ | ✅ | ✅ |
| Starter | $29 | $290 | ❌ | ❌ | ❌ |
| Professional | $75 | $750 | ❌ | ❌ | ✅ |
| Enterprise | $149 | $1,490 | ✅ | ✅ | ✅ |

---

## Development

### Running Tests

```bash
docker compose up -d
docker compose exec api python manage.py test
```

### Code Quality

```bash
cd backend
ruff check .              # Linting
black --check .           # Formatting
find . -name '*.py' | xargs wc -l | awk '$1>500'  # File size check
```

### Environment Variables

All configuration is via environment variables. See `.env.example` for the full list.
Never commit `.env` files. Secrets are managed through HashiCorp Vault in production.

---

*SRS Standard: ISO/IEC/IEEE 29148:2018 — Requirements Engineering*
*Platform: Loyallia by SomaTech LAT*
