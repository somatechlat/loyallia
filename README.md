# Loyallia — Digital Loyalty Platform

> **Plataforma inteligente de fidelización digital.**  
> Powered by Devotio Rewards Engine.

---

## Documentation Index

| Document | Path | Description |
|----------|------|-------------|
| **SRS (Complete)** | `docs/SRS_Loyallia_COMPLETE.md` | Full ISO/IEC 29148:2018 Software Requirements Specification |
| **Architecture & Diagrams** | `docs/ARCHITECTURE.md` | System architecture, sequence diagrams, flowcharts, ERD (Mermaid) |
| **Docker Compose** | `docker-compose.yml` | Full local/staging stack — all open source |

---

## Platform Overview

Loyallia enables businesses to run digital loyalty programs delivered natively through **Apple Wallet** and **Google Wallet** — **zero customer app installation required**.

### Key Modules Specified

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
| 10 | Subscription & Billing (Stripe + IVA) |
| 11 | Customer Wallet Experience |
| 12 | REST API & Integration Layer |
| 13 | Super-Admin Panel |

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
| Scheduler | Celery Beat |
| Connection Pool | PgBouncer |
| File Storage | MinIO (S3-compatible) |
| Reverse Proxy | Nginx |
| Worker Monitor | Flower |
| Containers | Docker + Docker Compose |

---

## Quick Start (Docker)

```bash
# 1. Clone and enter repo
git clone <repo> loyallia && cd loyallia

# 2. Copy environment template
cp .env.example .env
# Edit .env with your Apple/Google/Stripe credentials

# 3. Place certificates
mkdir -p certs
# certs/apple_pass.pem, apple_pass.key, apple_wwdr.pem
# certs/google_wallet_service_account.json
# certs/firebase_service_account.json

# 4. Start all services
docker-compose up -d

# 5. Run migrations
docker-compose exec api python manage.py migrate

# 6. Create superuser
docker-compose exec api python manage.py createsuperuser

# 7. Access points
# Dashboard:      http://localhost
# API docs:       http://localhost/api/v1/docs
# MinIO Console:  http://localhost:9001
# Flower:         http://localhost:5555
```

---

## Service Ports

| Service | Port | Notes |
|---------|------|-------|
| Nginx | 80 / 443 | Main entry point |
| Django API | 8000 | Internal |
| Next.js | 3000 | Internal |
| PostgreSQL | 5432 | Internal |
| PgBouncer | 6432 | Internal |
| Redis | 6379 | Internal |
| MinIO API | 9000 | File storage |
| MinIO Console | 9001 | Admin UI |
| Flower | 5555 | Celery monitor |

---

*SRS Standard: ISO/IEC 29148:2018 — Requirements Engineering*  
*Engine: Devotio Rewards*
