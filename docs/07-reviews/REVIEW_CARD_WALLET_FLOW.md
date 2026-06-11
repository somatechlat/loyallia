# Loyallia-k2 Card/Wallet Flow Audit Report

**Project:** Loyallia Intelligent Rewards Platform
**Scope:** Complete card creation, wallet enrollment, pass generation, and distribution flow
**Date:** 2025-01-21

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Card Creation Flow](#2-card-creation-flow)
3. [Wallet Enrollment Flow](#3-wallet-enrollment-flow)
4. [Apple Wallet Pass Generation](#4-apple-wallet-pass-generation)
5. [Google Wallet Pass Generation](#5-google-wallet-pass-generation)
6. [Apple Wallet Web Service](#6-apple-wallet-web-service)
7. [Scan & Transaction Flow](#7-scan--transaction-flow)
8. [UI/UX Analysis](#8-uiux-analysis)
9. [Test Coverage](#9-test-coverage)
10. [Security Findings](#10-security-findings)
11. [Recommendations](#11-recommendations)

---

## 1. Executive Summary

| Category | Status | Score |
|----------|--------|-------|
| Card Creation Flow | Mostly Working | 7/10 |
| Wallet Enrollment Flow | Working | 8/10 |
| Apple PKPass Generation | Working with caveats | 7/10 |
| Google Wallet JWT Generation | Working | 8/10 |
| Apple Web Service | Complete, 4 endpoints | 9/10 |
| Scan/Transaction Flow | Working | 8/10 |
| UI/UX Polish | Needs cleanup | 6/10 |
| Test Coverage | Good but gaps exist | 6/10 |
| Security | Generally solid | 7/10 |

**Overall:** The card/wallet flow is functionally complete with end-to-end working PKPass generation, JWT signing, web service protocol, and scanning. However, there are UI polish issues, missing edge-case tests, hardcoded demo content, and some backend inconsistencies that should be addressed before production hardening.

---

## 2. Card Creation Flow

### Backend: `backend/apps/cards/api.py`

#### What's Working
- **CRUD Complete** (lines 100-418): Full `POST /api/v1/programs/`, `GET`, `PATCH`, `DELETE` endpoints
- **Validation** (lines 169-235): Required fields (`name`, `card_type`, `barcode_type`), metadata type validation, coupon date validation (start < end), barcode type enum check
- **Plan limits enforced** (lines 204-211): `check_limit_or_403(LimitKey.MAX_PROGRAMS_PER_TENANT, msg='MAX_PROGRAMS_REACHED')` blocks creation when plan limit hit
- **Soft delete** (lines 415-418): Sets `is_active=False`, returns 204, preserves historical data
- **Wallet provider stored** in metadata as `wallet_provider` ("apple", "google", or "both")
- **Google Wallet class sync** (lines 354-367): Calls `update_loyalty_class(card)` on creation

#### Issues Found

| # | Issue | File | Line | Severity |
|---|-------|------|------|----------|
| 2.1 | `get_all_cards` calls `verify_role(["OWNER", "MANAGER"])` but `get_card_detail` only checks `OWNER` - MANAGERs get 403 | `api.py` | 128 | Medium |
| 2.2 | `card_type` mapping uses `CARD_TYPE_MAP.get(payload.card_type)` but falls back to original string if not found - potential silent misconfiguration | `api.py` | 171 | Low |
| 2.3 | Google Wallet class sync failure is logged but doesn't prevent card creation - silent failure | `api.py` | 362-367 | Low |
| 2.4 | `update_card` clears `updated_fields` on error (line 397), so subsequent attempts might fail differently | `api.py` | 396-397 | Low |

### Frontend: `frontend/src/app/(dashboard)/programs/new/page.tsx`

#### What's Working
- **4-step wizard**: Step 0 (type), Step 1 (config), Step 2 (design + wallet), Step 3 (review)
- **10 card types** available with type-specific configuration
- **Design templates**: 11 presets + custom
- **File uploads**: Logo, hero strip, icon with live preview
- **Wallet provider selector**: Apple vs Google toggle with NFC config
- **Barcode type selector**: 5 formats (QR, Aztec, PDF417, Code128, DataMatrix)
- **Geofence locations**: GPS coordinates for lock-screen alerts
- **Form validation**: Name required in step 2

#### Issues Found

| # | Issue | File | Line | Severity |
|---|-------|------|------|----------|
| 2.5 | **Hardcoded customer name "Juan Pérez"** in WalletCardPreview for ALL card types | `WalletCardPreview.tsx` | 338, 357, 441 | High |
| 2.6 | Review step shows raw `JSON.stringify()` for metadata - ugly UX | `ProgramReviewStep.tsx` | 86-89 | Medium |
| 2.7 | Submit uses `window.location.href = '/programs'` instead of Next.js router | `new/page.tsx` | 117 | Low |
| 2.8 | Error handling on submit only shows generic toast - no specific error message | `new/page.tsx` | 119 | Low |
| 2.9 | No validation that `logo_url` is actually a valid image URL | `new/page.tsx` | - | Low |
| 2.10 | `_stripUploading` and `_iconUploading` prefixed with underscore (suppressing unused warnings) but should be used for loading states | `new/page.tsx` | 89, 93 | Low |

### Frontend: `frontend/src/app/(dashboard)/programs/page.tsx`

#### What's Working
- Programs grouped into 3 sections: Active, Draft, Inactive
- Enrollment QR code generation for each program
- Wallet card preview in edit modal
- Search functionality

#### Issues Found

| # | Issue | File | Line | Severity |
|---|-------|------|------|----------|
| 2.11 | `total_visits` incorrectly used as member count for program statistics | `programs/page.tsx` | 107 | Medium |
| 2.12 | No empty state message when no programs exist | `programs/page.tsx` | - | Low |
| 2.13 | QR code URL generated client-side uses `window.location.origin` - SSR incompatible | `programs/page.tsx` | 59 | Low |

---

## 3. Wallet Enrollment Flow

### Backend: `backend/apps/customers/wallet_api.py`

#### What's Working
- **Public enrollment** `POST /api/v1/customers/enroll/?card_id=` - no auth required
- **Wallet status check** `GET /api/v1/wallet/status/{pass_id}/` returns availability flags
- **Apple PKPass download** `GET /api/v1/wallet/apple/{pass_id}/` with proper content-type
- **Google save URL** `GET /api/v1/wallet/google/{pass_id}/` returns JWT save URL or 302 redirect
- **Provider mode detection** `_wallet_provider_mode()` reads metadata, defaults to "both" for backward compatibility
- **Security validation**: `_validate_pass_is_accessible()` checks active tenant, active customer, active pass
- **Caching**: PKPass cached for 24h with auto-invalidation via `last_updated` timestamp
- **SSRF protection**: Image URLs validated via `validate_external_url` (LYL-H-SEC-009)

#### Issues Found

| # | Issue | File | Line | Severity |
|---|-------|------|------|----------|
| 3.1 | `_wallet_provider_mode` accepts any value not in {"apple","google","both"} and silently defaults to "both" - should reject invalid values | `wallet_api.py` | 67-71 | Medium |
| 3.2 | `getattr(request, "build_absolute_uri", lambda p: p)` on line 266 is a no-op - unused code | `wallet_api.py` | 266 | Low |
| 3.3 | Cache key uses `customer_pass.last_updated.timestamp()` which could have floating-point precision issues | `wallet_api.py` | 170 | Low |
| 3.4 | No rate limiting on PKPass download endpoint - potential for enumeration attack | `wallet_api.py` | - | Medium |

### Frontend: `frontend/src/app/enroll/[slug]/page.tsx`

#### What's Working
- **Public enrollment page** - no auth required
- **Dynamic form fields**: Supports custom form fields from card metadata or defaults
- **Honeypot anti-bot field** (SEC-011)
- **Privacy consent checkbox** required before submit
- **30-second cooldown** after successful enrollment
- **Wallet status detection**: Shows Apple/Google buttons based on availability + platform detection
- **QR code display**: Real `QRCodeSVG` rendered
- **Error states**: Loading, not-found, success, error all handled

#### Issues Found

| # | Issue | File | Line | Severity |
|---|-------|------|------|----------|
| 3.5 | Privacy checkbox text says "politica de privacidad" but links to `/privacy` - page may not exist | `enroll/[slug]/page.tsx` | 357 | Low |
| 3.6 | `getBaseUrl()` returns empty string on server - may cause hydration mismatch | `enroll/[slug]/page.tsx` | 9-12 | Low |
| 3.7 | Form validation only checks first_name, last_name, email - phone format not validated | `enroll/[slug]/page.tsx` | 163-166 | Low |
| 3.8 | `date_of_birth` accepts any string - no date format validation | `enroll/[slug]/page.tsx` | - | Low |
| 3.9 | No maximum length validation on form fields - potential for DoS | `enroll/[slug]/page.tsx` | - | Low |

---

## 4. Apple Wallet Pass Generation

### `backend/apps/customers/pass_engine/apple_pass.py`

#### What's Working
- **Full PKPass generation**: pass.json + manifest.json + signature + images in ZIP
- **PKCS#7 detached signature** using `cryptography` library's stable API (not deprecated pyOpenSSL)
- **SHA256 hash algorithm** with DER encoding
- **10 card type layouts** with proper field configurations
- **Barcode support**: QR, Aztec, Code128, PDF417 (DataMatrix falls back to QR)
- **Location/geo-fencing**: Up to 10 tenant locations
- **NFC payload**: Optional NFC with authentication requirement
- **Image processing**: Logo (87x87, 174x174), Icon (29x29, 58x58), Strip (375x123, 750x246)
- **SSRF protection** on external image URLs
- **Placeholder icon generation** when no logo provided
- **Web service URL** embedded in pass.json for automatic updates

#### Issues Found

| # | Issue | File | Line | Severity |
|---|-------|------|------|----------|
| 4.1 | `is_apple_wallet_configured()` checks `settings.APPLE_WALLET_ENABLED` which defaults to `False` - Apple Wallet may be silently disabled if setting not configured | `apple_pass.py` | 412-416 | Medium |
| 4.2 | NFC message length check (> 64 bytes) raises ValueError but is not caught in `generate_pkpass` - could crash pass generation | `apple_pass.py` | 165 | Medium |
| 4.3 | `icon_29`, `icon_58` generated as fallback but `icon.png` and `icon@2x.png` not included in files dict when icon_bytes is None - only placeholder icons included | `apple_pass.py` | 340-343, 361-366 | Low |
| 4.4 | No validation that `card.logo_url` points to an actual image - could embed invalid data | `apple_pass.py` | 333 | Low |
| 4.5 | `pass_data.get("total_stamps", 6)` uses hardcoded default of 6 instead of reading from card metadata `stamps_required` | `apple_pass_builders.py` | 37 | Medium |
| 4.6 | `hex_color.lstrip("#")` on line 318 could strip multiple `#` characters (e.g., "##123"), should use `removeprefix` | `apple_pass_builders.py` | 318 | Low |
| 4.7 | The `generate_referral_code` method in Customer model has a typo in docstring - "Includes" should be "Include" | `models.py` | 125 | Trivial |

---

## 5. Google Wallet Pass Generation

### `backend/apps/customers/pass_engine/google_pass.py`

#### What's Working
- **Dynamic type selection**: LoyaltyClass (stamp, vip, affiliate), OfferClass (coupon, discount, corporate, referral), GiftCardClass (gift_certificate, cashback, multipass)
- **JWT signing** with RS256 using service account private key
- **Save URL generation**: `https://pay.google.com/gp/v/save/{jwt}`
- **Diagnostics endpoint**: Returns non-secret configuration status
- **Push notifications** via Wallet API `addMessage` endpoint
- **Class upsert**: PATCH existing, POST if 404
- **Object upsert**: Same PATCH/POST pattern for live pass updates
- **Broadcast notifications** to all holders of a class
- **SmartTap** enabled for NFC-like functionality
- **Location support** for geo-triggered notifications
- **Hero image** fallback to Unsplash for stamp cards

#### Issues Found

| # | Issue | File | Line | Severity |
|---|-------|------|------|----------|
| 5.1 | `origins: []` in JWT claims is empty - should include the app origin for security | `google_pass.py` | 160 | Medium |
| 5.2 | Google Wallet class ID uses `card.id` (UUID) which may contain hyphens - Google requires format `issuer_id.class_id` | `google_pass.py` | 151 | Low |
| 5.3 | No retry logic on `httpx.patch`/`httpx.post` calls - transient failures not handled | `google_pass.py` | 325, 331 | Low |
| 5.4 | `message_body` HTML injection possible: `f'{body} <a href="{action_url}">Ver mas</a>'` doesn't sanitize `action_url` | `google_pass.py` | 249, 445 | Medium |
| 5.5 | `_build_offer_object` references `pass_data.get(...)` but typed columns exist for some types - inconsistent data access | `google_pass_builders.py` | - | Medium |

---

## 6. Apple Wallet Web Service

### `backend/apps/customers/pass_engine/apple_pass_web_service.py`

#### What's Working
- **All 4 mandatory endpoints** implemented per Apple spec:
  - `POST /v1/devices/{deviceId}/registrations/{passTypeId}/{serial}` - Register device
  - `DELETE /v1/devices/{deviceId}/registrations/{passTypeId}/{serial}` - Unregister device
  - `GET /v1/devices/{deviceId}/registrations/{passTypeId}` - List updated passes
  - `GET /v1/passes/{passTypeId}/{serial}` - Download updated pass
- **ApplePass auth validation**: Token = pass UUID without dashes
- **Device registration check**: Verifies device registered before unregister
- **Last-Modified header** set for HTTP caching
- **204 No Content** returned when no updates (correct per spec)
- **Push token storage** in ApplePassRegistration model

#### Issues Found

| # | Issue | File | Line | Severity |
|---|-------|------|------|----------|
| 6.1 | `parse_datetime` import is inside a loop (line 280) - should be at module level for performance | `apple_pass_web_service.py` | 280 | Low |
| 6.2 | `_validate_apple_auth` returns 401 instead of 404 for non-existent passes - Apple spec allows either but 404 is more accurate | `apple_pass_web_service.py` | 127 | Low |
| 6.3 | No cleanup of stale device registrations after repeated push failures | `apple_pass_web_service.py` | - | Medium |

---

## 7. Scan & Transaction Flow

### Frontend: `frontend/src/app/scanner/scan/page.tsx`

#### What's Working
- **Camera-based QR scanning** via `html5-qrcode`
- **Manual QR code entry** as fallback
- **Transaction confirmation flow**: Scan -> Review -> Confirm -> Result
- **Amount and notes input** before scanning
- **Success/error states** with clear UI feedback
- **Reward notification** display when earned
- **Unauthenticated redirect** to login page

#### Issues Found

| # | Issue | File | Line | Severity |
|---|-------|------|------|----------|
| 7.1 | Scanner camera not stopped on successful scan - only calls `scannerRef.current?.clear()` which may not stop camera | `scanner/scan/page.tsx` | 62 | Medium |
| 7.2 | Error catching in `processTransaction` uses `unknown` type cast which could hide bugs | `scanner/scan/page.tsx` | 40-46 | Low |
| 7.3 | No visual feedback during transaction processing (just generic spinner text) | `scanner/scan/page.tsx` | 189-192 | Low |
| 7.4 | Manual QR input has no length validation - could send extremely long strings | `scanner/scan/page.tsx` | 150-157 | Low |

### Backend: `backend/apps/transactions/api.py`

#### What's Working
- **HMAC-SHA256 QR token verification** with constant-time comparison
- **24-hour token expiry** with 5-minute clock skew tolerance
- **Atomic pass updates** using `select_for_update()`
- **Typed columns** for stamp count, cashback balance, etc.
- **Transaction logging** with all metadata
- **Full transaction history** endpoint
- **Point granting** endpoint for staff

#### Issues Found

| # | Issue | File | Line | Severity |
|---|-------|------|------|----------|
| 7.5 | HMAC signature truncated to 16 hex chars (8 bytes) - sufficient but non-standard | `qr_generator.py` | 43 | Low |
| 7.6 | QR code token includes timestamp - allows replay within 24h window | `qr_generator.py` | - | Low |
| 7.7 | `process_scan` doesn't verify the staff member belongs to the same tenant as the pass | `transactions/api.py` | - | Medium |
| 7.8 | No rate limiting on scan endpoint - potential for brute force token guessing | `transactions/api.py` | - | Medium |

---

## 8. UI/UX Analysis

### AI Slop / Quality Issues

| # | Issue | File | Line | Severity |
|---|-------|------|------|----------|
| 8.1 | **Hardcoded "Juan Pérez"** as customer name in ALL wallet previews - should use actual customer data or placeholder | `WalletCardPreview.tsx` | 338, 357, 441 | High |
| 8.2 | Review step `JSON.stringify()` for metadata fields is developer-grade, not user-friendly | `ProgramReviewStep.tsx` | 88 | Medium |
| 8.3 | Multiple `catch { }` empty blocks suppress errors silently | `new/page.tsx`, `enroll/page.tsx` | - | Medium |
| 8.4 | Unused imports and variables (`_stripUploading`, `_iconUploading`) | `new/page.tsx` | 89, 93 | Low |
| 8.5 | `card_type_map` typo in variable name (should be `CARD_TYPE_MAP` consistently) | `customers/models.py` | - | Low |
| 8.6 | Spanish text in backend error messages mixed with English log messages | Multiple | - | Low |

### Loading States

| Component | Loading State | Error State |
|-----------|--------------|-------------|
| Programs list | Skeleton loading | Partial - shows empty sections |
| Program detail | Loading spinner | Error toast |
| New program wizard | Per-step loading | Generic toast error |
| Customer list | Loading spinner | Error toast |
| Customer detail | Skeleton | "Cliente no encontrado" |
| Enrollment page | Loading spinner | Card not found message |
| Scanner | Camera init | Manual fallback |

### Missing Pages

| Page | Status | Notes |
|------|--------|-------|
| `/wallet` page | **DOES NOT EXIST** | There's no standalone wallet management page |
| `/wallet/page.tsx` | Not found | Only wallet-related components exist in `/components/wallet/` (but that dir doesn't exist) |

---

## 9. Test Coverage

### Existing Tests

| Test File | Coverage | Status |
|-----------|----------|--------|
| `22-wallet-flows.spec.ts` | Card creation, enrollment, wallet URLs, campaign UI, wizard wallet provider | Good |
| `02-programs.spec.ts` | Wizard 4-step flow, CRUD, role isolation | Good |
| `03-customers.spec.ts` | List, search, import, role isolation | Adequate |
| `10-scanner.spec.ts` | STAFF landing page, route isolation | Minimal |
| `14-program-crud-full.spec.ts` | Full CRUD lifecycle, wallet campaigns | Good |
| `16-srs-hardening.spec.ts` | Form builder, coupon push, enrollment privacy consent | Good |

### Missing Test Coverage

| # | Missing Scenario | Priority |
|---|-----------------|----------|
| 9.1 | **QR code scanning transaction** - No E2E tests the actual scan -> points flow | High |
| 9.2 | **Apple PKPass download validation** - Tests check status but don't verify pass content | Medium |
| 9.3 | **Google Wallet save URL redirect** - Tests check 200/302 but not actual JWT content | Medium |
| 9.4 | **Wallet provider toggle** - Tests "apple" vs "google" but not the actual pass output difference | Medium |
| 9.5 | **Pass update push notification** - No tests for Apple/Google push delivery | Medium |
| 9.6 | **Apple Web Service endpoints** - No tests for device registration/update checking | Medium |
| 9.7 | **NFC configuration flow** - No tests for enabling/disabling NFC | Low |
| 9.8 | **Geofence location in pass** - No tests for location-based passes | Low |
| 9.9 | **Rate limiting on enrollment** - Cooldown tested manually but not automated | Low |
| 9.10 | **Privacy consent enforcement** - Form disables button but no backend test | Low |

### Test Quality Issues

| # | Issue | File | Line |
|---|-------|------|------|
| 9.11 | Tests use `page.waitForTimeout()` heavily instead of proper wait conditions | Multiple | - |
| 9.12 | `22-wallet-flows.spec.ts` test 11: campaign send test uses loose assertion - just checks form closed | `22-wallet-flows.spec.ts` | 353-355 |
| 9.13 | `14-program-crud-full.spec.ts` test 2: edit test has multiple nested `if` conditions that could silently skip | `14-program-crud-full.spec.ts` | 87-99 |
| 9.14 | No test cleanup for created programs in `02-programs.spec.ts` - pollutes DB | `02-programs.spec.ts` | - |

---

## 10. Security Findings

### Positive Security Measures

| Measure | Implementation | Status |
|---------|---------------|--------|
| HMAC-SHA256 QR token signing | `qr_generator.py` | Good |
| Constant-time HMAC comparison | `hmac.compare_digest()` | Good |
| Token timestamp expiry (24h) | `verify_qr_token()` | Good |
| Clock skew tolerance (5 min) | `verify_qr_token()` | Good |
| SSRF protection on image URLs | `validate_external_url()` (LYL-H-SEC-009) | Good |
| Honeypot anti-bot field | `enroll/[slug]/page.tsx` | Good |
| Privacy consent enforcement | Backend + frontend | Good |
| Enrollment rate limiting (30s cooldown) | Frontend + backend | Good |
| ApplePass auth token validation | `apple_pass_web_service.py` | Good |
| Pass accessibility validation | `_validate_pass_is_accessible()` | Good |
| Private key never touches disk (Apple) | Loaded from Vault PEM | Good |
| PKCS#7 detached signature | `cryptography` library | Good |
| Soft delete for programs | `is_active=False` | Good |

### Security Concerns

| # | Issue | Severity |
|---|-------|----------|
| 10.1 | No rate limiting on wallet download endpoints - potential UUID enumeration | Medium |
| 10.2 | QR token signature truncated to 8 bytes - still secure but non-standard | Low |
| 10.3 | Google Wallet JWT has empty `origins` array - should restrict to app domain | Medium |
| 10.4 | No tenant isolation check in scanner transaction processing | Medium |
| 10.5 | `pass_data` JSON field could contain arbitrary data - no schema validation | Low |
| 10.6 | Enrollment endpoint doesn't verify card belongs to active tenant before creating customer | Low |

---

## 11. Recommendations

### Critical (Fix Before Production)

1. **[R-1] Remove hardcoded "Juan Pérez"** from WalletCardPreview - replace with actual customer data or generic placeholder like "Miembro"
2. **[R-2] Add QR scan transaction E2E test** - test the complete scan -> transaction -> points flow
3. **[R-3] Add tenant isolation check** in transaction processing to prevent cross-tenant scanning

### Important (Fix Soon)

4. **[R-4] Fix review step metadata display** - don't show raw JSON.stringify(), format nicely
5. **[R-5] Add rate limiting** to wallet download and scan endpoints
6. **[R-6] Fix Apple Wallet default disabled** - ensure `APPLE_WALLET_ENABLED` is documented and set correctly
7. **[R-7] Add program cleanup in E2E tests** - prevent test data pollution
8. **[R-8] Move `parse_datetime` import** to module level in `apple_pass_web_service.py`
9. **[R-9] Add wallet management page** at `/wallet` or remove from navigation if not needed
10. **[R-10] Fix `pass_data` default** for stamp cards to use `stamps_required` from metadata

### Nice to Have

11. **[R-11] Replace `waitForTimeout` in tests** with proper async assertions
12. **[R-12] Add retry logic** to Google Wallet API calls
13. **[R-13] Sanitize `action_url`** in Google Wallet push notification body
14. **[R-14] Add NFC message length validation** before pass generation
15. **[R-15] Clean up unused variables** (`_stripUploading`, `_iconUploading`)
16. **[R-16] Use Next.js router** instead of `window.location.href` for navigation

---

## Files Analyzed (30 total)

### Backend (11 files)
1. `backend/apps/cards/api.py`
2. `backend/apps/cards/models.py`
3. `backend/apps/customers/wallet_api.py`
4. `backend/apps/customers/pass_engine/apple_pass.py`
5. `backend/apps/customers/pass_engine/apple_pass_builders.py`
6. `backend/apps/customers/pass_engine/apple_pass_web_service.py`
7. `backend/apps/customers/pass_engine/google_pass.py`
8. `backend/apps/customers/pass_engine/google_pass_builders.py`
9. `backend/apps/customers/pass_engine/qr_generator.py`
10. `backend/apps/customers/pass_engine/apple_push.py`
11. `backend/apps/customers/models.py`

### Frontend (8 files)
1. `frontend/src/app/(dashboard)/programs/page.tsx`
2. `frontend/src/app/(dashboard)/programs/[id]/page.tsx`
3. `frontend/src/app/(dashboard)/programs/new/page.tsx`
4. `frontend/src/app/(dashboard)/customers/page.tsx`
5. `frontend/src/app/(dashboard)/customers/[id]/page.tsx`
6. `frontend/src/app/enroll/[slug]/page.tsx`
7. `frontend/src/app/scanner/scan/page.tsx`
8. `frontend/src/lib/api.ts`

### Components (6 files)
1. `frontend/src/components/programs/constants.tsx`
2. `frontend/src/components/programs/WalletCardPreview.tsx`
3. `frontend/src/components/programs/EditProgramModal.tsx`
4. `frontend/src/components/programs/new/ProgramReviewStep.tsx`
5. `frontend/src/components/programs/new/StepBar.tsx`

### Tests (5 files)
1. `frontend/tests/e2e/suite/22-wallet-flows.spec.ts`
2. `frontend/tests/e2e/suite/02-programs.spec.ts`
3. `frontend/tests/e2e/suite/03-customers.spec.ts`
4. `frontend/tests/e2e/suite/10-scanner.spec.ts`
5. `frontend/tests/e2e/suite/14-program-crud-full.spec.ts`
6. `frontend/tests/e2e/suite/16-srs-hardening.spec.ts`

---

*Report generated by Loyallia-k2 automated code audit system*
