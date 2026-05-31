# Authentication

Tenant-scoped user authentication with JWT rotation, OAuth (Google), and phone verification.

## Models

- `User` — tenant user account with role-based access (OWNER, MANAGER, STAFF)
- `PhoneVerification` — Twilio Verify session tracking

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login/` | JWT login (access + refresh tokens) |
| POST | `/api/v1/auth/register/` | Tenant + owner registration |
| POST | `/api/v1/auth/logout/` | Token blacklist |
| POST | `/api/v1/auth/refresh/` | Rotate access token |
| POST | `/api/v1/auth/forgot-password/` | Password reset email |
| POST | `/api/v1/auth/reset-password/` | Confirm reset with token |
| POST | `/api/v1/auth/google/login/` | Google OAuth login/registration |
| POST | `/api/v1/auth/verify-phone/start/` | Initiate Twilio phone verification |
| POST | `/api/v1/auth/verify-phone/check/` | Verify OTP code |
| GET | `/api/v1/auth/users/me/` | Current user profile |
| PUT | `/api/v1/auth/users/profile/` | Update profile |

## Services

- `otp_service.py` — Twilio Verify wrapper
- `tokens.py` — JWT encode/decode with rotation
- `helpers.py` — Password validation, invitation flows

## Dependencies

- `apps.tenants` (Tenant model)
- Twilio Verify API
- Google OAuth 2.0

## Called By

- Frontend login/register pages
- Google OAuth callback
