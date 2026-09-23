---
title: "Loyallia Wallet Credentials — Current Status"
document_id: "LOYALLIA-DOC-WALLET_CREDENTIALS_STATUS.MD"
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
| **Document ID** | LOYALLIA-DOC-WALLET_CREDENTIALS_STATUS.MD |
| **Title** | Loyallia Wallet Credentials — Current Status |
| **Version** | 1.0 |
| **Date** | 2026-09-16 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011|
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/08-references/WALLET_CREDENTIALS_STATUS.md` |

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
| LOYALLIA-DOC-ARCHITECTURE.MD | Loyallia Architecture, Sequence & Flowchart Diagrams | Reference |

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

# Loyallia Wallet Credentials — Current Status

> **Document Date:** 2026-06-11
> **Policy:** Do not store credential values in Git. Verify locally against Vault or ignored certificate files.

---

## GOOGLE WALLET

| Vault Key | Value | Source |
|-----------|-------|--------|
| `google_wallet_enabled` | Vault boolean | SuperAdmin/Vault |
| `google_wallet_issuer_id` | Vault value | SuperAdmin/Vault |
| `google_service_account_json` | Vault secret | Ignored local service account JSON |
| `google_oauth_client_id` | Vault value | Ignored local OAuth JSON |
| `google_oauth_client_secret` | Vault secret | Ignored local OAuth JSON |

**Service Account Details:** verify required fields locally without printing values: `private_key`, `client_email`, `token_uri`.

**Diagnostics:** All green — `enabled=true`, `issuer_id_present=true`, `service_account_present=true`, `service_account_valid_json=true`, `service_account_has_required_fields=true`

---

## APPLE WALLET

| Vault Key | Value | Source |
|-----------|-------|--------|
| `apple_wallet_enabled` | Vault boolean | SuperAdmin/Vault |
| `apple_pass_type_identifier` | Vault value | Ignored local Apple certificate |
| `apple_team_identifier` | Vault value | Ignored local Apple certificate |
| `apple_cert_pem` | Vault secret | Ignored local Apple certificate |
| `apple_cert_key_pem` | Vault secret | Ignored local Apple private key |
| `apple_wwdr_cert_pem` | Vault value | Ignored local WWDR certificate |
| `apple_nfc_enabled` | Vault boolean | SuperAdmin/Vault |
| `apple_nfc_encryption_public_key` | Vault secret | Operator provided |

**Certificate Details:** verify serial, pass type identifier, team identifier, issuer, validity, and keypair match locally without committing values.

**Keypair Verification:**
```bash
openssl x509 -in passNew.cer -inform DER -pubkey -noout | openssl rsa -pubin -modulus -noout
openssl rsa -in apple_pass_new.key -pubout | openssl rsa -pubin -modulus -noout
# Result: MATCH — certificate and private key are cryptographically paired
```

**Diagnostics:** All green — `enabled=true`, `pass_type_id_present=true`, `team_id_present=true`, `cert_pem_present=true`, `cert_key_pem_present=true`, `wwdr_cert_pem_present=true`, `certs_cryptographically_valid=true`

---

## MAILJET EMAIL

| Vault Key | Value | Source |
|-----------|-------|--------|
| `mailjet_api_key` | Vault secret | Operator provided |
| `mailjet_secret_key` | Vault secret | Operator provided |
| `mailjet_sender_email` | PlatformSetting | Operator provided |

**SMTP Server:** `in-v3.mailjet.com` (Mailjet)
**Port:** `587` (from Django settings)
**Security:** TLS

**Diagnostics:** `api_key_present=true`, `secret_key_present=true`, `sender_email_present=true`

---

## ✅ ENV VALIDATION FIX

**File Modified:** `backend/common/env_validation.py`

**Problem:** Mail provider credentials were unconditionally required in `PRODUCTION_REQUIRED_VAULT_KEYS`, causing the API to crash when email was not configured.

**Fix:**
- Removed Mailjet and Apple Wallet credentials from unconditional required list
- Added `EMAIL_REQUIRED_VAULT_KEYS` list
- Mailjet credentials are now only validated if `mailjet_api_key` is non-empty (meaning email is actively configured)
- Apple Wallet fields are only validated if `apple_wallet_enabled` is truthy

This allows the system to boot with only the integrations that are actually configured.

---

## ✅ UI SETTINGS PAGE

**File Modified:** `frontend/src/app/(dashboard)/superadmin/settings/page.tsx`

All integration cards now support inline Vault editing:
- Google Wallet: Enabled, Issuer ID, Service Account JSON, OAuth Client ID, OAuth Client Secret
- Apple Wallet: Enabled, Pass Type ID, Team ID, Certificate PEM, Private Key PEM, WWDR PEM
- Payment Gateway: Enabled, Provider, Login, Transaction Key, Webhook Secret
- Mailjet Vault fields: API key, secret key
- Mailjet PlatformSettings: sender email, sender name

---

## FILES IN `certs/` — CURRENT STATE

| File | Status | Notes |
|------|--------|-------|
| `vault.crt` | Local dev TLS certificate | Vault HTTPS dev certificate |
| `vault.key` | Local dev TLS private key | Vault HTTPS dev key |
| `README.md` | — | Documentation |

Wallet and OAuth credential files are **not stored in `certs/`** — they live in
HashiCorp Vault. The following patterns are gitignored to prevent accidental
commits:
- `certs/*.pem`
- `certs/*.key`
- `certs/*.p12`
- `certs/*.json`

---

## INTEGRATION SUMMARY

| Integration | Status | Real Data Source |
|-------------|--------|------------------|
| Google Wallet | Verify locally | Vault + ignored local files |
| Google OAuth | Verify locally | Vault + ignored local files |
| Apple Wallet | Verify locally | Vault + ignored local files |
| Mailjet Email | Verify locally | Vault |
| Payments | Verify locally | Vault/operator setting |

---

## NEXT STEPS

1. **Production:** keep Mailjet API key/secret in Vault only and rotate by operator policy.
2. **Security:** rotate Google service account keys by operator policy.
3. **Apple Wallet:** track certificate expiry outside Git and renew before expiry.
