---
title: "Bootstrap & Deployment"
document_id: "LOYALLIA-DOC-BOOTSTRAP.MD"
version: "1.0"
status: "approved"
last_updated: "2026-09-16"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "N/A"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-DOC-BOOTSTRAP.MD |
| **Title** | Bootstrap & Deployment |
| **Version** | 1.0 |
| **Date** | 2026-09-16 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011 |
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/09-archive/deploy-readmes/BOOTSTRAP.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-16 | Engineering Lead | Added ISO-compliant document controls |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation |
| Security Officer | Reviewer | Security requirements validation |
| QA Lead | Reviewer | Quality assurance validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Reference |
| LOYALLIA-ARCH-001 | Architecture Diagrams | Reference |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-16 | Approved |
| Product Owner | — | — | 2026-09-16 | Approved |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-16 | Engineering Lead | Initial ISO controls added |
| Approved | 2026-09-16 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |

# Bootstrap & Deployment

## Purpose

The `bootstrap/` directory contains the **deployment orchestration scripts** used to provision, configure, and manage the Loyallia platform. These scripts handle everything from secret generation and Vault initialization to SSL setup, cron configuration, and full stack deployment.

This is the primary entry point for **new environment creation**, **disaster recovery**, and **routine deployments**.

## Files

| File | Description |
|------|-------------|
| `bootstrap-development.sh` | **Development-only** bootstrap. Idempotent, isolated, uses `docker-compose.yml` and `.bootstrap_secrets.development.env`. |
| `bootstrap-production.sh` | **Production-only** bootstrap. Idempotent, uses `docker-compose.prod.yml` and production secrets. |
| `full-deploy.sh` | **Complete deployment orchestrator** (14 steps). Wraps the bootstrap scripts with pre-flight checks, infrastructure start, build, deploy, monitoring, and verification. |
| `generate_secrets.sh` | Generates 52 random secrets and integration credentials. Produces `.bootstrap_secrets.json` and a flat `.env` file for Vault init. |
| `setup_ssl.sh` | Configures SSL/TLS for Nginx: verifies certs, mounts them, enables HTTPS/HTTP2/HSTS, and reloads Nginx. |
| `verify-ssl.sh` | Post-deployment SSL verification: tests certificate validity, expiry, chain, and HTTPS redirects. |
| `add-stripe.sh` | **Placeholder** for future Stripe payment integration. Currently minimal; expands when Stripe keys are provided. |
| `cron_setup.sh` | **Legacy wrapper** that delegates to `deploy/backups/admin/backup-admin.sh install`. |

## Configuration

### Environment Selection

All scripts accept `--env=production|development` (default: `production`).

```bash
./deploy/bootstrap/full-deploy.sh --env=development
```

### Prerequisites

Before running any bootstrap script:

1. **Docker & Docker Compose** installed.
2. **SSL certificates** in place for production (Let’s Encrypt or similar).
3. **Integration credentials** (optional) in `certs/integration_credentials.json` — Mailjet, Twilio, Google OAuth, etc.
4. **Apple Wallet certificates** (optional) in `certs/` — `passNew.pem`, `apple_pass_new.key`, `AppleWWDRCAG4.pem`.

### Secret Generation

```bash
./deploy/bootstrap/generate_secrets.sh
```

This produces:
- `.bootstrap_secrets.json` — structured secrets (600 permissions)
- `.bootstrap_secrets.env` — flat key=value file for Vault init container
- `.age_keys/` — Age public/private keypair for backup encryption

### SSL Paths

Set in `.env`:
```bash
SSL_CERT_PATH=/etc/letsencrypt/live/rewards.loyallia.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/rewards.loyallia.com/privkey.pem
DOMAIN=rewards.loyallia.com
```

## Usage

### Full Production Deployment

```bash
./deploy/bootstrap/full-deploy.sh --env=production
```

Optional flags:
- `--destroy` — Remove old containers before deploying
- `--step=N` — Resume from step N (0–14)
- `--dry-run` — Show what would happen without executing
- `--verbose` — Print every command (`set -x`)

### Development Bootstrap (Quick Start)

```bash
./deploy/bootstrap/bootstrap-development.sh
```

### Verify SSL After Deploy

```bash
./deploy/bootstrap/verify-ssl.sh --env=production
```

### Install Backup Cron

```bash
./deploy/bootstrap/cron_setup.sh production   # daily
./deploy/bootstrap/cron_setup.sh testing      # every 15 days
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Bootstrap fails at Vault init | Check Vault container logs: `docker compose logs vault`. Ensure `.bootstrap_secrets.env` exists. |
| SSL setup fails | Verify cert files exist at `SSL_CERT_PATH` / `SSL_KEY_PATH`. Check permissions (644 cert, 600 key). |
| Secrets not generated | Ensure Python 3 is installed. Check `certs/` directory permissions. |
| `full-deploy.sh` stops at step N | Use `--step=N` to resume after fixing the underlying issue. |
| Docker permission denied | Run as user in `docker` group, or use `sudo` only where absolutely required. |
| Integration credentials empty | Verify `certs/integration_credentials.json` format matches the expected schema. |

## Related Docs

- [`deploy/vault/`](../vault/) — Vault initialization and secret seeding
- [`deploy/backups/`](../backups/) — Backup scheduling and retention (if `README.md` exists)
- [`deploy/disaster_recovery/`](../disaster_recovery/) — Full stack recovery from rescue files
- [`deploy/factory_reset/`](../factory_reset/) — Nuke and pave a development environment
- [`deploy/scripts/`](../scripts/) — Secret rotation procedures
- [`../../docs/02-architecture/ARCHITECTURE.md`](../../02-architecture/ARCHITECTURE.md) — High-level platform architecture
