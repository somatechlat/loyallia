# Loyallia Wallet Credentials — Current Status (REAL DATA ONLY)

> **Document Date:** 2026-05-06
> **Policy:** NO placeholders, NO mocks, NO simulated data. All credentials verified from actual files.

---

## ✅ GOOGLE WALLET — FULLY CONFIGURED

| Vault Key | Value | Source |
|-----------|-------|--------|
| `google_wallet_enabled` | `true` | User confirmed |
| `google_wallet_issuer_id` | `3388000000023112792` | Real issuer account |
| `google_service_account_json` | Real service account | `certs/scenic-parity-494022-h5-628cf7e3795c.json` |
| `google_oauth_client_id` | `[REDACTED]` | `certs/client_secret_*.json` |
| `google_oauth_client_secret` | `[REDACTED]` | `certs/client_secret_*.json` |

**Service Account Details:**
- Project: `scenic-parity-494022-h5`
- Client Email: `loyallia-srvc-account-wallet@scenic-parity-494022-h5.iam.gserviceaccount.com`
- Has `private_key` and `client_email` fields — cryptographically valid

**Diagnostics:** All green — `enabled=true`, `issuer_id_present=true`, `service_account_present=true`, `service_account_valid_json=true`, `service_account_has_required_fields=true`

---

## ✅ APPLE WALLET — FULLY CONFIGURED

| Vault Key | Value | Source |
|-----------|-------|--------|
| `apple_wallet_enabled` | `true` | Enabled after real cert obtained |
| `apple_pass_type_identifier` | `pass.com.loyallia.cards` | Extracted from real `passNew.cer` |
| `apple_team_identifier` | `29NGPXM563` | Extracted from real `passNew.cer` |
| `apple_cert_pem` | Real Apple-signed certificate | Converted from `certs/passNew.cer` |
| `apple_cert_key_pem` | Real 2048-bit RSA private key | `certs/apple_pass_new.key` |
| `apple_wwdr_cert_pem` | Real Apple WWDR G4 cert | Converted from `certs/AppleWWDRCAG4.cer` |

**Certificate Details:**
- Serial: `557e3f522e292afe946c5cfedbe3423a` (OLD cert, revoked)
- New Serial: from `passNew.cer` — signed by Apple for keypair `apple_pass_new.key`
- Pass Type ID: `pass.com.loyallia.cards`
- Team ID: `29NGPXM563`
- Owner: ROBERTO MANOSALVAS (EC)
- Issuer: Apple Worldwide Developer Relations Certification Authority, OU=G4
- Validity: May 2026 → Jun 2027

**Keypair Verification:**
```bash
openssl x509 -in passNew.cer -inform DER -pubkey -noout | openssl rsa -pubin -modulus -noout
openssl rsa -in apple_pass_new.key -pubout | openssl rsa -pubin -modulus -noout
# Result: MATCH — certificate and private key are cryptographically paired
```

**Diagnostics:** All green — `enabled=true`, `pass_type_id_present=true`, `team_id_present=true`, `cert_pem_present=true`, `cert_key_pem_present=true`, `wwdr_cert_pem_present=true`, `certs_cryptographically_valid=true`

---

## ✅ EMAIL SMTP — FULLY CONFIGURED

| Vault Key | Value | Source |
|-----------|-------|--------|
| `email_host_user` | `info@loyallia.com` | User provided |
| `email_host_password` | `[REDACTED]` | Google App Password (user provided) |

**SMTP Server:** `smtp.gmail.com` (from Django settings)
**Port:** `587` (from Django settings)
**Security:** TLS

**Diagnostics:** `user_present=true`, `pass_present=true`

---

## ✅ ENV VALIDATION FIX

**File Modified:** `backend/common/env_validation.py`

**Problem:** `email_host_user` and `email_host_password` were unconditionally required in `PRODUCTION_REQUIRED_VAULT_KEYS`, causing the API to crash when email was not configured.

**Fix:**
- Removed `email_host_user`, `email_host_password`, and `apple_wallet_enabled` from unconditional required list
- Added `EMAIL_REQUIRED_VAULT_KEYS` list
- Email credentials are now only validated if `email_host_user` is non-empty (meaning email is actively configured)
- Apple Wallet fields are only validated if `apple_wallet_enabled` is truthy

This allows the system to boot with only the integrations that are actually configured.

---

## ✅ UI SETTINGS PAGE

**File Modified:** `frontend/src/app/(dashboard)/superadmin/settings/page.tsx`

All integration cards now support inline Vault editing:
- Google Wallet: Enabled, Issuer ID, Service Account JSON, OAuth Client ID, OAuth Client Secret
- Apple Wallet: Enabled, Pass Type ID, Team ID, Certificate PEM, Private Key PEM, WWDR PEM
- Payment Gateway: Enabled, Provider, Login, Transaction Key, Webhook Secret
- Email SMTP: Username, Password

---

## FILES IN `certs/` — CURRENT STATE

| File | Status | Notes |
|------|--------|-------|
| `AppleWWDRCAG4.cer` | ✅ Real | Apple WWDR G4 intermediate cert |
| `passNew.cer` | ✅ Real | Apple-signed Pass Type ID cert (matches apple_pass_new.key) |
| `apple_pass_new.key` | ✅ Real | 2048-bit RSA private key (matches passNew.cer) |
| `apple_pass_new.csr` | ✅ Real | CSR generated from apple_pass_new.key |
| `client_secret_*.json` | ✅ Real | Google OAuth 2.0 client secrets |
| `scenic-parity-494022-h5-628cf7e3795c.json` | ✅ Real | Google Wallet Service Account |
| `README.md` | — | Documentation |

**Removed Files (sanitized/obsolete):**
- `apple_pass.key` — sanitized placeholder
- `apple_pass_cert.pem` — sanitized placeholder
- `apple_wwdr.pem` — sanitized placeholder
- `apple_pass.csr` — old CSR for missing keypair
- `pass.cer` — old certificate for missing keypair

---

## INTEGRATION SUMMARY

| Integration | Status | Real Data Source |
|-------------|--------|------------------|
| Google Wallet | 🟢 Configured | `scenic-parity-494022-h5-628cf7e3795c.json` + Issuer ID |
| Google OAuth | 🟢 Configured | `client_secret_*.json` |
| Apple Wallet | 🟢 Configured | `passNew.cer` + `apple_pass_new.key` + `AppleWWDRCAG4.cer` |
| Email SMTP | 🟢 Configured | `info@loyallia.com` + Google App Password |
| Payments | ⚪ Disabled | Not configured |

---

## NEXT STEPS

1. **Production:** Replace `email_host_password` with a fresh Google App Password before going live
2. **Security:** Rotate `google_service_account_json` private key annually per Google best practices
3. **Apple Wallet:** Certificate expires Jun 2027 — renewal required before expiry
