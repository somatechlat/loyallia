# Authentication Subsystem Guide

## 1. Overview

The Authentication subsystem manages the complete identity lifecycle for the Loyallia platform: registration, login, token management, password reset, email verification, Google OAuth 2.0 social login, phone verification, and team invitation.

It enforces per-tenant Role-Based Access Control (RBAC) with four roles: `SUPER_ADMIN` (platform-level), `OWNER` (business owner), `MANAGER`, and `STAFF`. The subsystem is security-hardened with brute-force protection, rate limiting, token rotation, and audit logging.

**Key design principles:**
- Custom `User` model extending `AbstractBaseUser` for full control.
- JWT access tokens (60 min) + refresh tokens (30 days) with one-time-use rotation.
- Tenant-scoped: every non-superuser belongs to exactly one `Tenant`.
- Privacy-safe responses (e.g., registration returns success for duplicate emails to prevent enumeration).

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend / Mobile                       │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────┐    ┌─────────────────────────┐
│   Django Ninja API Router  │    │   Google OAuth 2.0      │
│   (apps.authentication)    │◄──►│   (tokeninfo endpoint)  │
└─────────────┬──────────────┘    └─────────────────────────┘
              │
    ┌─────────┴──────────┐
    ▼                    ▼
┌──────────┐      ┌──────────────┐      ┌─────────────┐
│  JWTAuth │      │  User Model  │◄────►│   Tenant    │
│(common/  │      │(RBAC + PIN)  │      │  (tenant)   │
│permissions│     └──────────────┘      └─────────────┘
└────┬─────┘
     │
     ▼
┌──────────────┐    ┌──────────────┐    ┌─────────────┐
│ RefreshToken │    │  OTP Cache   │    │   Audit     │
│   (DB)       │    │  (Redis)     │    │  (apps.audit)│
└──────────────┘    └──────────────┘    └─────────────┘
```

### 2.2 Data Flow

**Login Flow:**
1. Frontend sends `POST /api/v1/auth/login/` with email + password.
2. Backend loads `User` via `select_related("tenant")` (single query).
3. If account is locked (5 failed attempts), return `423 Locked`.
4. Password verified with Argon2 hasher.
5. On success: failed-login counter reset, access + refresh tokens issued, refresh token hash persisted to DB.
6. Audit log recorded (`AuditAction.LOGIN`).

**Refresh Flow:**
1. Frontend sends `POST /api/v1/auth/refresh/` with refresh token.
2. Backend hashes token, looks up `RefreshToken` row with `select_for_update(of=("self",))`.
3. If valid, revokes old token (`revoked_at = now()`), issues new pair.
4. Stolen tokens become single-use.

**Google OAuth Flow:**
1. Frontend uses Google Identity Services (GIS) to obtain an ID token.
2. Sends credential to `POST /api/v1/auth/google/login/`.
3. Backend verifies token with Google's `tokeninfo` endpoint and checks `aud` matches `GOOGLE_OAUTH_CLIENT_ID`.
4. Existing user → login; new user → atomic tenant + OWNER creation.

---

## 3. Key Models

### `apps.authentication.models.User`

Custom user with per-tenant RBAC.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `tenant` | FK → `tenants.Tenant` | Nullable for SUPER_ADMIN |
| `email` | EmailField | Unique; `USERNAME_FIELD` |
| `first_name` / `last_name` | CharField | |
| `role` | CharField | Choices: `SUPER_ADMIN`, `OWNER`, `MANAGER`, `STAFF` |
| `is_active` | BooleanField | Deactivation blocks auth |
| `is_email_verified` | BooleanField | |
| `phone_number` | CharField | E.164 format |
| `is_phone_verified` | BooleanField | |
| `failed_login_count` | SmallIntegerField | Resets on success |
| `locked_until` | DateTimeField | 15-minute lockout |
| `security_pin_hash` | CharField | Argon2-hashed 6-digit PIN |
| `invited_by` | FK → self | Invitation tracking |
| `preferred_language` | CharField | ISO 639-1 (es, en, fr, de) |

**Table:** `loyallia_users`

### `apps.authentication.models.RefreshToken`

Stores issued refresh tokens for revocation support.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `user` | FK → `User` | |
| `token_hash` | CharField | SHA-256 of the raw token |
| `device_name` | CharField | Optional |
| `expires_at` | DateTimeField | |
| `revoked_at` | DateTimeField | Null until revoked |

**Table:** `loyallia_refresh_tokens`

---

## 4. API Overview

All endpoints are mounted under `/api/v1/auth/` via `apps.authentication.api` and `apps.authentication.users_api`.

### Public Endpoints (no auth)

| Endpoint | Method | Summary |
|----------|--------|---------|
| `/register/` | POST | Register new business + OWNER user atomically |
| `/login/` | POST | Email + password login → JWT pair |
| `/refresh/` | POST | Rotate refresh token → new JWT pair |
| `/verify-email/` | POST | Validate email OTP |
| `/forgot-password/` | POST | Request password reset email |
| `/reset-password/` | POST | Confirm reset with uid + token |
| `/google/config/` | GET | Return Google OAuth client_id config |
| `/google/login/` | POST | Verify Google ID token and login/register |

### Authenticated Endpoints (jwt_auth)

| Endpoint | Method | Summary | Role Guard |
|----------|--------|---------|------------|
| `/logout/` | POST | Revoke refresh token | Any |
| `/me/` | GET | Current user profile | Any |
| `/profile/` | PUT | Update profile (name) | Any |
| `/change-password/` | POST | Change password | Any |
| `/invite/` | POST | Invite MANAGER or STAFF | OWNER only |
| `/users/` | GET | List tenant users | OWNER only |
| `/users/{id}/` | DELETE | Deactivate user + revoke tokens | OWNER only |
| `/phone/verify/request/` | POST | Request Twilio Verify OTP | Any |
| `/phone/verify/confirm/` | POST | Confirm OTP | Any |

### Pydantic Schemas (apps.authentication.schemas)

- `RegisterIn` / `RegisterOut`
- `LoginIn` / `TokenOut`
- `RefreshIn` / `RefreshOut`
- `LogoutIn`
- `VerifyEmailIn`
- `ForgotPasswordIn` / `ResetPasswordIn`
- `GoogleTokenIn`
- `InviteIn`
- `UserOut`
- `PhoneVerifyRequestIn` / `PhoneVerifyConfirmIn`
- `PhoneVerifyStartIn` / `PhoneVerifyStartOut`
- `PhoneVerifyCheckIn` / `PhoneVerifyCheckOut`

---

## 5. Integration Points

| App | Integration | Details |
|-----|-------------|---------|
| `tenants` | `Tenant` FK on `User`; tenant created atomically on registration | `TenantMiddleware` resolves `request.tenant` from `user.tenant` |
| `audit` | `log_action()` on login, logout, password change | Records `AuditAction.LOGIN`, `LOGOUT`, `UPDATE` |
| `notifications` | Lockout emails sent via `send_mail()` | Also Twilio Verify for phone verification |
| `billing` | Trial activation via `tenant.activate_trial()` | Subscription lifecycle starts on registration |
| `cards` / `customers` | Customer-facing endpoints use `optional_jwt_auth` | Customer identity separate from staff User model |

---

## 6. Configuration

### Environment Variables / Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | `60` | Access token TTL |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | `30` | Refresh token TTL |
| `JWT_ALGORITHM` | `HS256` | `HS256` or `RS256` |
| `JWT_SECRET_KEY` | Vault fallback | Symmetric key for HS256 |
| `JWT_PRIVATE_KEY_PATH` | `""` | RS256 private key file |
| `JWT_PUBLIC_KEY_PATH` | `""` | RS256 public key file |
| `GOOGLE_OAUTH_CLIENT_ID` | Vault | Google Identity Services client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Vault | For server-side flows |
| `TRIAL_DAYS` | `5` | Default trial duration |
| `FRONTEND_URL` | `http://localhost:33906` | Used in password reset links |

### Vault Secrets

- `secret_key` → Django `SECRET_KEY`
- `jwt_secret_key` → Separate from Django secret (B-001)
- `google_oauth_client_id` / `google_oauth_client_secret`
- `twilio_verify_service_sid` / `twilio_verify_enabled`

### Redis Cache Keys

- `otp:{purpose}:{email}` — Hashed OTP storage (900s TTL)
- `otp_attempts:{purpose}:{email}` — OTP attempt counter
- `pwd_reset_rate:{email}` — Password reset rate limit (3600s TTL)
- `gauth_rate:{client_ip}` — Google OAuth rate limit
- `phone_verify_sid:{phone}` — Twilio Verify SID

---

## 7. Testing

### Test Location

- `backend/tests/test_api.py` — Integration tests for auth endpoints
- `backend/tests/test_security.py` — Security-focused tests
- `backend/apps/authentication/` has no dedicated `tests/` folder; tests live in the central `tests/` directory per project convention.

### Running Auth Tests

```bash
cd backend
pytest tests/test_api.py -k Auth -v
pytest tests/test_security.py -v
```

### Key Test Patterns

```python
from tests.factories import make_user

class AuthLoginAPITest(TestCase):
    def test_login_success(self):
        user = make_user(email="login@test.com")
        resp = self.client.post(
            "/api/v1/auth/login/",
            data=json.dumps({"email": user.email, "password": user._test_password}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)
```

### What to Test

| Area | Suggestion |
|------|------------|
| Registration | Duplicate email returns success (privacy), slug race-condition retry |
| Login | Wrong password increments counter, 5th failure locks account (423) |
| Refresh | Old token revoked, new pair issued; reused token returns 401 |
| Password Reset | Token expires after 24h, reset revokes all refresh tokens |
| Google OAuth | Audience mismatch rejected, unverified email rejected |
| RBAC | OWNER endpoints return 403 for MANAGER/STAFF |
| Phone Verify | Twilio SID roundtrip, 5-attempt lockout |

---

## 8. Troubleshooting

### Issue: Login returns 401 for correct credentials
- Check `user.is_active` — deactivated users are rejected.
- Check `user.is_locked` — 5 failed attempts trigger a 15-minute lockout.
- Verify password hasher: project uses `Argon2PasswordHasher`.

### Issue: Refresh token returns 401
- The refresh token was already used and revoked (token rotation).
- The token expired (30 days).
- The user was deactivated or password was changed (revokes all tokens).

### Issue: Google OAuth login fails
- Verify `GOOGLE_OAUTH_CLIENT_ID` is set in Vault.
- Ensure the frontend sends a valid Google ID token (not an auth code).
- Check `email_verified` in the Google payload — unverified emails are rejected.

### Issue: Email OTP not received
- Verify `EMAIL_BACKEND` is configured (`common.email_backend.PlatformSettingEmailBackend`).
- Check `DEFAULT_FROM_EMAIL` and Mailjet credentials in Vault.
- OTP entries live in Redis for 15 minutes; verify Redis connectivity.

### Issue: Account lockout email not sent
- The lockout logic calls `send_mail(..., fail_silently=True)` — check application logs.
- Ensure `DEFAULT_FROM_EMAIL` is valid and not flagged as spam.

### Issue: Registration slug collision
- The retry loop attempts 5 times with suffix counters, then falls back to UUID.
- Check for database-level unique constraints on `tenants.Tenant.slug`.

---

## Reference Files

| File | Purpose |
|------|---------|
| `apps/authentication/models.py` | `User`, `RefreshToken`, `UserRole` |
| `apps/authentication/api.py` | Auth lifecycle endpoints |
| `apps/authentication/users_api.py` | Profile, team, phone verify |
| `apps/authentication/tokens.py` | JWT create/decode utilities |
| `apps/authentication/helpers.py` | `issue_tokens`, `store_otp`, `verify_otp`, `slugify_business` |
| `apps/authentication/schemas.py` | Pydantic request/response models |
| `apps/authentication/otp_service.py` | Twilio Verify integration |
| `common/permissions.py` | `JWTAuth`, `jwt_auth`, role decorators |
| `apps/tenants/middleware.py` | `TenantMiddleware` |
