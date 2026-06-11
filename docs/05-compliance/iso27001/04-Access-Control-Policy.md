# Access Control Policy

| | |
|---|---|
| **Document ID** | POL-AC-001 |
| **Version** | 1.0 |
| **Effective Date** | 2026-06-03 |
| **Owner** | Chief Information Security Officer (CISO) |
| **Review Cycle** | Annual |
| **ISO 27001 Controls** | A.5.15 — Access Control, A.5.18 — Access Rights |

---

## 1. Purpose and Scope

This policy establishes the principles, processes, and technical controls governing logical access to Loyallia information systems, applications, and data. It applies to all employees, contractors, vendors, and automated system accounts that interact with Loyallia production, staging, or development environments.

The policy supports Loyallia’s multi-tenant architecture, ensuring that each business tenant’s data remains strictly isolated while enabling role-based access for platform and tenant-level users.

---

## 2. Access Control Principles

All access control decisions are governed by the following principles, aligned with ISO 27001 Annex A controls:

### 2.1 Least Privilege
Users and system accounts are granted the minimum level of access necessary to perform their defined job functions. Permissions are not inherited implicitly; each role carries an explicit, reviewed set of rights.

### 2.2 Need-to-Know
Access to tenant data is restricted to users who have a legitimate business requirement to access that specific tenant’s information. Cross-tenant data access is technically prevented by architecture-level controls.

### 2.3 Separation of Duties
Critical functions are divided among different roles to reduce the risk of fraud, error, or unauthorized action. For example:
- **Billing configuration** requires `OWNER` approval.
- **Impersonation** of a tenant requires both `SUPER_ADMIN` credentials and a tenant `OWNER` security PIN.
- **Database schema changes** are routed through a dedicated migration database user, separate from application runtime credentials.

### 2.4 Defence in Depth
Access controls are enforced at multiple layers: network (IP-based rate limiting), application (JWT authentication, role checks, tenant-scoped query filtering), and infrastructure (Vault policies, PgBouncer connection pooling). PostgreSQL row-level security is not currently enabled.

---

## 3. User Access Provisioning Process

### 3.1 Account Creation
1. **Request** — A new user account is created via invitation (`OWNER` or `MANAGER` invites `STAFF`) or self-registration (new tenant `OWNER`).
2. **Verification** — Email verification and/or phone verification (Twilio Verify OTP) is required before activation.
3. **Role Assignment** — The inviter assigns a role from the approved RBAC matrix (§4). No user may be assigned a role higher than the inviter’s own role.
4. **Provisioning** — The account is persisted in PostgreSQL with `is_active=True` only after both email and tenant affiliation are confirmed.
5. **Notification** — The user receives a secure invitation link; passwords are never transmitted in plain text.

### 3.2 System and Service Accounts
- System accounts (e.g., database migration user, Celery worker credentials, MinIO service account) are provisioned via **HashiCorp Vault** with dynamic, short-lived credentials where possible.
- Service account credentials are never stored in source code, configuration files, or environment variables in plain text. They are injected at runtime from Vault via `/run/loyallia-vault/`.

### 3.3 Guest and Contractor Access
- Temporary accounts are created with an explicit expiry date.
- Contractors are assigned the `STAFF` role unless a written exception is approved by the CISO.
- Temporary accounts are automatically deactivated after the engagement ends.

---

## 4. Role Definitions and Permissions Matrix

Loyallia implements Role-Based Access Control (RBAC) with four defined roles. The `SUPER_ADMIN` role is platform-scoped; all other roles are tenant-scoped.

### 4.1 Role Definitions

| Role | Scope | Description |
|---|---|---|
| **SUPER_ADMIN** | Platform | Full platform administration. No tenant affiliation (`tenant=NULL`). Operates outside tenant isolation for infrastructure, security, and support tasks. |
| **OWNER** | Tenant | Business owner. Full administrative control over a single tenant, including user management, billing, plan upgrades, and security PIN configuration. |
| **MANAGER** | Tenant | Operational manager. Can manage campaigns, customers, rewards, and view analytics. Cannot delete the tenant or modify billing details. |
| **STAFF** | Tenant | Front-line employee. Can execute day-to-day operations (e.g., QR scanning, transaction registration, customer lookup). Cannot access analytics exports or user management. |

### 4.2 Permissions Matrix

| Function / Data Class | SUPER_ADMIN | OWNER | MANAGER | STAFF |
|---|---|---|---|---|
| **Tenant Management** |
| Create / delete tenant | ✅ | ❌ | ❌ | ❌ |
| Manage tenant users (invite, revoke) | ✅* | ✅ | ❌ | ❌ |
| Update tenant settings / branding | ✅* | ✅ | ✅ | ❌ |
| View subscription / billing | ✅* | ✅ | ❌ | ❌ |
| **Customer Data** |
| Create / read / update customers | ✅* | ✅ | ✅ | ✅ |
| Delete customer records | ✅* | ✅ | ✅ | ❌ |
| Export customer lists | ✅* | ✅ | ✅ | ❌ |
| **Transactions & Rewards** |
| Register transactions (scan QR) | ✅* | ✅ | ✅ | ✅ |
| Issue / redeem rewards | ✅* | ✅ | ✅ | ✅ |
| View transaction analytics | ✅* | ✅ | ✅ | ❌ |
| **Campaigns & Notifications** |
| Create / edit campaigns | ✅* | ✅ | ✅ | ❌ |
| Send push / WhatsApp / SMS | ✅* | ✅ | ✅ | ❌ |
| **Platform Administration** |
| Impersonate tenant owner (PIN-gated) | ✅ | ❌ | ❌ | ❌ |
| Factory reset / seed demo data | ✅ | ❌ | ❌ | ❌ |
| Access Vault secrets | ✅ (via policy) | ❌ | ❌ | ❌ |
| Access audit logs | ✅ | ✅ (own tenant only) | ❌ | ❌ |

> \* `SUPER_ADMIN` access to tenant data is mediated through impersonation (§5.2) and is fully audit-logged. Direct database access for support is prohibited without impersonation.

---

## 5. Privileged Access Management (PAM)

### 5.1 SUPER_ADMIN Accounts
- `SUPER_ADMIN` accounts are the highest-privilege identities in Loyallia.
- No hard limit on the number of active `SUPER_ADMIN` accounts is enforced in code; platform operators manage this through quarterly access reviews and onboarding approvals.
- `SUPER_ADMIN` authentication requires:
  - Strong password (§6)
  - Multi-Factor Authentication (MFA) via OTP (Twilio Verify)
- All `SUPER_ADMIN` actions are written to the immutable audit log (`apps.audit`).

### 5.2 Impersonation Controls
Tenant owner impersonation is a privileged operation subject to the following safeguards:
1. The `SUPER_ADMIN` must authenticate with their own JWT and MFA.
2. The target tenant `OWNER` must have configured a **6-digit security PIN** (stored as Argon2 hash).
3. The `SUPER_ADMIN` must provide the correct PIN and a **written justification**.
4. After **3 failed PIN attempts**, impersonation is locked for **15 minutes**.
5. Impersonation sessions issue a short-lived JWT (60 minutes) and are independently revocable.
6. Every impersonation event (success and failure) is recorded in the audit log with tenant ID, justification, and result.

### 5.3 System Accounts
- Database: Application runtime connects via PgBouncer with credentials rotated via Vault. Schema changes use the `direct` database router with separate credentials.
- MinIO (S3-compatible storage): Service credentials are Vault-managed; bucket policies enforce least privilege.
- Redis: No authentication data is stored in Redis; it is used only for rate-limit counters and cache.
- WhatsApp Bridge: API key is stored in Vault and injected at container startup.

### 5.4 Vault Policies
All secrets (database passwords, JWT signing keys, OAuth client secrets, TLS certificates) are stored in HashiCorp Vault with path-based policies:
- `loyallia/app/*` — Application secrets (read by backend containers)
- `loyallia/admin/*` — Super-admin bootstrap and recovery secrets (break-glass only)
- `loyallia/infra/*` — Infrastructure credentials (read by deployment automation)

Access to Vault is authenticated via AppRole or TLS client certificates. Root tokens are revoked immediately after initial setup.

---

## 6. Access Review Procedure

### 6.1 Quarterly Access Reviews
Access rights are reviewed on a **quarterly basis** (every 90 days) to ensure alignment with the least-privilege principle.

| Review Type | Frequency | Responsible Party | Evidence |
|---|---|---|---|
| Tenant user roles | Quarterly | Tenant `OWNER` | Export from `/api/v1/auth/users/` |
| SUPER_ADMIN accounts | Quarterly | CISO | Audit log + IAM roster |
| Service accounts | Quarterly | DevOps / SRE | Vault audit log |
| Inactive accounts (>90 days) | Quarterly | Security Team | Database query on `last_login` |
| API keys & OAuth tokens | Quarterly | Engineering Lead | Vault + database review |

### 6.2 Review Workflow
1. **Notification** — Security Team sends a review reminder 7 days before the quarter ends.
2. **Data Collection** — Automated reports are generated listing all active users, roles, and last-login timestamps per tenant.
3. **Validation** — `OWNER`s confirm that each active account still requires its assigned role. The Security Team validates `SUPER_ADMIN` and service accounts.
4. **Remediation** — Dormant accounts are deactivated; excessive privileges are downgraded. Remediation must be completed within 10 business days.
5. **Sign-off** — The CISO signs off on the quarterly review and archives the evidence for a minimum of **three (3) years**.

---

## 7. Password Policy

### 7.1 User Passwords
All local user passwords must comply with the following requirements, enforced at registration and password change:

| Requirement | Specification | Enforcement |
|---|---|---|
| Minimum length | 12 characters | `MinimumLengthValidator` (min_length=12) in `AUTH_PASSWORD_VALIDATORS` |
| Complexity | Mixed case, digits, and special characters | `common.validators.ComplexityValidator` in `AUTH_PASSWORD_VALIDATORS` |
| Common passwords | Rejection of known weak passwords | `CommonPasswordValidator` |
| Numeric-only | Prohibited | `NumericPasswordValidator` |
| User similarity | Must not closely match user attributes | `UserAttributeSimilarityValidator` |
| Hashing algorithm | Argon2 (primary), PBKDF2 (fallback) | `PASSWORD_HASHERS` setting |
| Storage | Hashed only; plain-text storage prohibited | Django `AbstractBaseUser` |

**Note on API-level enforcement:** The backend `AUTH_PASSWORD_VALIDATORS` enforce 12 characters when `validate_password` is invoked (e.g., Django admin/forms). The public REST schemas enforce their own minima: `RegisterIn` requires ≥ 8 characters, `ResetPasswordIn` requires ≥ 6 characters, and `ChangePasswordIn` has no schema-level minimum.

### 7.2 Password Lifecycle
- **Expiry** — User passwords do not have a forced expiry period. Password changes are triggered only upon suspected compromise or user request, consistent with NIST SP 800-63B guidance.
- **History** — No password history enforcement is currently implemented in the codebase. Reuse of the last **5** passwords is a planned control but is not active.
- **Reset** — Password resets are initiated via a time-limited, single-use token sent to the verified email address. Tokens expire after **3 days** (Django default); the policy previously stated 24 hours, but no override is configured.
- **Transmission** — Passwords are transmitted exclusively over TLS 1.2 or higher in production (host-level nginx).

### 7.3 Multi-Factor Authentication (MFA)
- **OTP via SMS** — Twilio Verify is used for phone-based OTP. Phone verification is enabled globally for users who provide a phone number; it is not configurable per tenant and is not limited to `SUPER_ADMIN`.
- **Google OAuth 2.0** — Supported as an alternative authentication factor. Google Identity Services (GIS) tokens are verified server-side before account linkage.
- **Security PIN** — A 6-digit PIN is required for `OWNER` accounts when `SUPER_ADMIN` impersonation is requested. The PIN is hashed with Argon2 and never stored in plain text.

---

## 8. Session Management

### 8.1 JWT Session Parameters
Loyallia uses stateless JSON Web Tokens (JWT) for session management with the following parameters:

| Parameter | Value | Rationale |
|---|---|---|
| Access token lifetime | 60 minutes | Balance between UX and security |
| Refresh token lifetime | 30 days | Long-lived offline access with revocation |
| Algorithm | HS256 (default). RS256 is used only when asymmetric JWT key paths are explicitly configured. | Cryptographic agility |
| Secret storage | Vault (`jwt_secret_key`) | Isolation from Django `SECRET_KEY` |
| Token binding | Not bound to IP / device | Trade-off for mobile-friendly UX |

### 8.2 Concurrent Sessions
- Refresh tokens are tracked in the database (`RefreshToken` model) with SHA-256 hashes.
- Users may hold **multiple concurrent sessions** on different devices.
- Revocation of a single refresh token does not invalidate other active sessions.
- **Global logout** (`POST /api/v1/auth/logout/`) revokes the current refresh token. Access tokens remain valid until their 60-minute expiry; no server-side access-token blacklist is maintained.

### 8.3 Session Timeout and Inactivity
- Access tokens expire after **60 minutes** of issuance, regardless of activity.
- The frontend is responsible for silent refresh using the refresh token before expiry.
- If the refresh token is expired or revoked, the user must re-authenticate.

### 8.4 Impersonation Session Controls
- Impersonation tokens have a **fixed 60-minute lifetime** and cannot be refreshed.
- Impersonation sessions can be explicitly revoked via `POST /api/v1/admin/impersonation/revoke`.
- Revocation deletes the impersonation cache key and logs the event.

---

## 9. Account Lockout and Termination

### 9.1 Failed Authentication Lockout
To mitigate brute-force attacks, the following lockout policy is enforced:

| Threshold | Action | Duration |
|---|---|---|
| 5 consecutive failed login attempts | Account lockout | 15 minutes |
| Lockout notification | Email sent to user | Immediate |
| Post-lockout attempts | Rejected with 403 | Until lockout expires |

- The lockout counter resets upon a **successful login**.
- Rate limiting (§10) provides an additional layer of brute-force protection at the IP level.

### 9.2 Administrative Account Lockout
- Administrators (`OWNER`, `MANAGER`, `SUPER_ADMIN`) may manually lock user accounts by setting `is_active=False`.
- Locked accounts immediately lose API access; existing JWTs expire naturally within 60 minutes.

### 9.3 Account Termination
1. **User-Initiated** — Users may request account deletion. Tenant `OWNER`s must transfer ownership or delete the tenant before personal account deletion. Tenant deletion is scheduled with a **24-hour grace period** (Celery task) before irreversible cascade deletion; `scheduled_deletion_at` must be set for the hard-delete task to run.
2. **Administrative** — Upon termination of employment or contract, the responsible manager requests immediate deactivation via the tenant dashboard.
3. **Data Retention** — Deactivated accounts are soft-deleted (`is_active=False`). No automated purge after 90 days is currently implemented; personal data is removed only through explicit deletion by an authorized user or via tenant deletion cascade. This is a known gap tracked in the Data Retention Policy.
4. **Audit** — All deactivations are logged with timestamp, actor, and reason.

---

## 10. Supporting Technical Controls

### 10.1 Rate Limiting
Redis-backed sliding-window rate limiting is enforced on all API endpoints:

| Endpoint Class | Limit | Key Type |
|---|---|---|
| `/api/v1/auth/login` | 60 req/min | IP |
| `/api/v1/auth/register` | 10 req/min | IP |
| `/api/v1/auth/phone/` (OTP) | 30 req/min | IP |
| `/api/v1/admin/` | 60 req/min | IP |
| `/api/v1/scanner/` | 120 req/min | User (token hash) |
| `/api/v1/analytics/` | 60 req/min | User (token hash) |
| All other `/api/v1/` | 200 req/min | IP |

Auth endpoints **fail closed** (HTTP 503) if the rate-limiting backend is unavailable, preventing brute-force attacks during outages.

### 10.2 Tenant Isolation
- Tenant context is resolved from the authenticated user’s foreign key (`user.tenant`), never from client-supplied headers or parameters. This prevents tenant spoofing.
- Tenant isolation is enforced at the application layer: every tenant-scoped query filters by `tenant=request.tenant`. PostgreSQL row-level security (RLS) is not currently enabled.
- `SUPER_ADMIN` users have `tenant=NULL` and cannot access tenant data directly without impersonation.

### 10.3 Audit Logging
All access control events are recorded in the audit subsystem:
- Login / logout / token refresh
- Failed authentication and lockouts
- Role changes and user invitations
- Impersonation (success and failure) with justification
- Password resets

Audit logs are retained for **7 years** (per `apps/audit/models.py` and the privacy policy) and are tamper-evident via application-level immutability (`save()` and `delete()` are blocked).

---

## 11. Policy Compliance and Exceptions

### 11.1 Compliance
All personnel with access to Loyallia systems must acknowledge and comply with this policy. Non-compliance may result in suspension of access and disciplinary action in accordance with local employment law.

### 11.2 Exceptions
Exceptions to this policy require:
1. A written business justification.
2. Risk assessment by the Security Team.
3. Approval by the CISO or designated delegate.
4. A time-bound expiration date for the exception.

All exceptions are documented in the Exception Register and reviewed quarterly.

---

## 12. Related Documents

| Document | Location |
|---|---|
| Authentication Module README | `backend/apps/authentication/README.md` |
| Rate Limiting Specification | `backend/common/rate_limit.py` |
| Permissions & JWT Layer | `backend/common/permissions.py` |
| Tenant Isolation Middleware | `backend/apps/tenants/middleware.py` |
| Super Admin Impersonation API | `backend/apps/tenants/super_admin_api/impersonation.py` |
| User & Token Models | `backend/apps/authentication/models.py` |
| Base Security Settings | `backend/loyallia/settings/base.py` |

---

## 13. Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-06-03 | CISO | Initial release. Aligned with ISO 27001:2022 A.5.15 and A.5.18. |

---

*This policy is a controlled document. Printed copies are uncontrolled. Always refer to the latest version in the document management system.*
