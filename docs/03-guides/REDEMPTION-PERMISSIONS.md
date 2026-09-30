---
title: "Redemption Permissions Guide"
document_id: "LOYALLIA-GUIDE-REDEEMRBAC-001"
version: "1.0"
status: "draft"
last_updated: "2026-09-30"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "N/A"
---

# REDEMPTION PERMISSIONS GUIDE
## Loyallia — Scanner RBAC And Redemption Rules

**Document ID:** LOYALLIA-GUIDE-REDEEMRBAC-001
**Version:** 1.0
**Status:** draft
**Date:** 2026-09-30
**Last Updated:** 2026-09-30
**Author:** Engineering Lead
**Owner:** Engineering Lead
**Approver:** Product Owner
**Classification:** Internal Use
**Confidentiality:** Internal — Restricted to Engineering and Product teams
**Review Cycle:** Upon each major release, or annually (whichever comes first)
**Standard:** ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011
**Parent Document:** N/A

---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-GUIDE-REDEEMRBAC-001 |
| **Title** | Redemption Permissions Guide |
| **Version** | 1.0 |
| **Date** | 2026-09-30 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | draft |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011 |
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/03-guides/REDEMPTION-PERMISSIONS.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-30 | Engineering Lead | First release. Documents the role matrix in `common/permissions.py`, `StaffRoleValidator` semantics, and the card-type x intent strategy map. |

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
| LOYALLIA-GUIDE-NOTIFY-001 | Wallet Notification Engine Guide | Sibling |
| LOYALLIA-GUIDE-APPLEWS-001 | Apple Wallet Web Service Guide | Sibling |
| LOYALLIA-DOC-REDEMPTION-ENGINE.MD | Redemption Engine Subsystem Guide | Reference (engine internals) |
| LOYALLIA-DOC-ARCHITECTURE.MD | Loyallia Architecture, Sequence & Flowchart Diagrams | Reference |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

---

## 1. Scope

Source files:

| Path | Role |
|------|------|
| `backend/common/permissions.py` | JWT auth and role predicates |
| `backend/apps/redemption/rules.py` | `StaffRoleValidator` and the other rule validators |
| `backend/apps/redemption/strategies/registry.py` | `(card_type, intent)` to strategy map |
| `backend/apps/authentication/models.py` | `UserRole` values and Spanish labels |

## 2. Role Definitions

`UserRole` in `backend/apps/authentication/models.py`:

| Value | Spanish label |
|-------|---------------|
| `SUPER_ADMIN` | `Super Administrador` |
| `OWNER` | `Propietario` |
| `MANAGER` | `Gerente` |
| `STAFF` | `Personal` |

Default role on user creation is `STAFF`.

## 3. Role Matrix

Predicates in `backend/common/permissions.py`. The scanner column is the operational gate. The management column covers transaction lists, program design, analytics, and billing.

| Capability | STAFF | MANAGER | OWNER | SUPER_ADMIN | Predicate |
|------------|-------|---------|-------|-------------|-----------|
| Operate scanner (validate / transact / remote-issue) | yes | yes | yes | yes | `is_scanner_operator` |
| View transactions, analytics, programs | no | yes | yes | yes | `is_manager_or_owner` |
| Program design, billing, tenant settings | no | no | yes | yes | `is_owner` |
| Platform-only surfaces | no | no | no | yes | `is_super_admin` |

### 3.1 `is_scanner_operator(request) -> bool`

Returns true when the authenticated user's role is in `UserRole.values`. That is all four roles. The scanner is an operational surface, not a management surface. Every role that can hold a device may validate and redeem whatever card type is presented.

SUPER_ADMIN is included so a platform admin impersonating a tenant can work the floor like any other operator.

`is_staff_or_above(request)` is a backward-compatible alias for `is_scanner_operator`. New call sites should prefer `is_scanner_operator`, which names the operational intent.

### 3.2 `is_owner(request) -> bool`

Returns true for `OWNER` and `SUPER_ADMIN`. Platform-only surfaces must call `is_super_admin` instead.

### 3.3 `is_manager_or_owner(request) -> bool`

Returns true for `OWNER`, `MANAGER`, and `SUPER_ADMIN`.

### 3.4 `is_super_admin(request) -> bool`

Returns true for `SUPER_ADMIN` only.

### 3.5 SUPER_ADMIN admission rule

`is_scanner_operator`, `is_manager_or_owner`, and `is_owner` all admit `SUPER_ADMIN`. A platform admin impersonating a tenant must be able to act inside that tenant. Platform-only surfaces keep using `is_super_admin` or an explicit role list.

## 4. Authentication Path

`JWTAuth.authenticate()` runs on every request decorated with `auth=jwt_auth`:

1. `decode_access_token(token)` verifies the JWT cryptographically. Invalid or expired tokens never reach the database.
2. `User.objects.select_related("tenant").get(id=payload["user_id"], is_active=True)` loads user and tenant in one JOIN. `is_active=True` blocks deactivated accounts.
3. `request.user` and `request.tenant` are set from the user's foreign key. The tenant is never read from request headers, so header spoofing cannot change tenant scope.

`OptionalJWTAuth` wraps the same logic and returns `None` instead of raising, for public endpoints such as enrollment pages.

`require_role(*roles)` is a decorator for endpoints that need an exact role match. Pass canonical `UserRole` values, never free-typed strings.

## 5. `StaffRoleValidator`

Location: `backend/apps/redemption/rules.py`.

`card.redemption_rules.allowed_staff_roles` is an optional owner-set restriction layered on top of the endpoint-level scanner-operator gate. It narrows who may redeem. It never widens access.

### 5.1 Semantics

| Condition | Result |
|-----------|--------|
| Key absent, `None`, empty list, or not a list / tuple / set | No restriction. Returns `[]`. |
| `context.intent == "validate"` | No restriction. Returns `[]`. Read-only lookup is never role-restricted. |
| After normalization, no valid `UserRole` entries remain | No restriction. Logs a warning and returns `[]`. |
| `context.staff_id` is `None` | Violation `allowed_staff_roles`. |
| Staff user does not exist | Violation `allowed_staff_roles`. |
| Staff user role is `SUPER_ADMIN` | Bypass. Returns `[]`. |
| Staff user role is in the normalized set | Allowed. Returns `[]`. |
| Staff user role is not in the normalized set | Violation `allowed_staff_roles`. |

The empty-or-invalid case deliberately does **not** deny everyone. A misconfigured list must not lock the floor out of redemption. The warning is logged so the owner can fix the config.

### 5.2 Normalization — `_normalize_allowed_staff_roles(allowed) -> set[str]`

Builds a lookup from `UserRole.choices` that maps both the value and the Spanish label to the canonical value, uppercased and stripped:

- `["staff"]` and `["STAFF"]` both resolve to `"STAFF"`.
- `["Personal"]` resolves to `"STAFF"` (Spanish label path).
- `["Propietario"]` resolves to `"OWNER"`.
- Unknown strings are dropped, not kept as-is.

The violation message is `REDEMPTION_STAFF_ROLE_NOT_ALLOWED` with `role` and `allowed` context when the user exists and fails the check.

## 6. Strategy Registry

Location: `backend/apps/redemption/strategies/registry.py`.

`get_strategy(card_type, intent)` resolves to a `BaseRedemptionStrategy` subclass. Instances are cached in `_strategy_cache` under `"{card_type}:{intent}"`. `clear_cache()` resets the cache for tests. An unregistered combination raises `ValueError`.

Accepted intents: `"earn"`, `"redeem"`, `"validate"`. The redemption gateway also accepts `"auto"` and resolves it before calling the registry (`RedemptionGateway._resolve_intent`):

| Card type | `auto` resolves to |
|-----------|--------------------|
| `stamp` | `redeem` when `lifecycle_state == REWARD_READY` or `pass_data["reward_ready"]` is true, else `earn` |
| `cashback` | `earn` (redeem requires an explicit intent) |
| `vip_membership`, `corporate_discount`, `affiliate` | `validate` |
| everything else | `redeem` |

### 6.1 Card type x intent map

Ten card types from `CardType` in `backend/apps/cards/models.py`:

| Card type | `earn` | `redeem` | `validate` |
|-----------|--------|----------|------------|
| `stamp` | `StampEarnStrategy` | `StampRedeemStrategy` | `StampRedeemStrategy` |
| `cashback` | `CashbackEarnStrategy` | `CashbackRedeemStrategy` | `CashbackRedeemStrategy` |
| `coupon` | `CouponRedeemStrategy` | `CouponRedeemStrategy` | `CouponRedeemStrategy` |
| `gift_certificate` | `GiftRedeemStrategy` | `GiftRedeemStrategy` | `GiftRedeemStrategy` |
| `multipass` | `MultipassRedeemStrategy` | `MultipassRedeemStrategy` | `MultipassRedeemStrategy` |
| `discount` | `DiscountTrackStrategy` | `DiscountTrackStrategy` | `DiscountTrackStrategy` |
| `referral_pass` | `ReferralTrackStrategy` | `ReferralTrackStrategy` | `ReferralTrackStrategy` |
| `vip_membership` | `MembershipValidateStrategy` | `MembershipValidateStrategy` | `MembershipValidateStrategy` |
| `affiliate` | `MembershipValidateStrategy` | `MembershipValidateStrategy` | `MembershipValidateStrategy` |
| `corporate_discount` | `CorporateValidateStrategy` | `CorporateValidateStrategy` | `CorporateValidateStrategy` |

Two patterns:

- `stamp` and `cashback` branch on intent. `earn` maps to the earn strategy; `redeem` and `validate` share the redeem strategy.
- The other eight return one strategy for every intent. `validate` is the same call as `redeem` for those types.

Strategy modules live in `backend/apps/redemption/strategies/`: `stamp.py`, `cashback.py`, `coupon.py`, `gift.py`, `multipass.py`, `discount.py`, `referral.py`, `membership.py`, `corporate.py`, plus `base.py` and `registry.py`.

### 6.2 Other rule validators

The same module holds the remaining validators run by `RedemptionGateway.process()`:

| Validator | Rule keys | Checks |
|-----------|-----------|--------|
| `UsageLimitValidator` | `usage_limit_per_customer`, `usage_limit_global` | Counts prior redemption-type transactions |
| `TimeWindowValidator` | `valid_from`, `valid_until`, `allowed_days_of_week`, `allowed_hours` | Absolute range, weekday set (0=Mon to 6=Sun), hour window |
| `CooldownValidator` | `cooldown_hours` | Gap since `customer_pass.last_redemption_at` |
| `LocationValidator` | `allowed_locations` | `context.location_id` in the allowed set |
| `MinPurchaseValidator` | `min_purchase`, `max_purchase` | `context.amount` against thresholds |
| `StaffRoleValidator` | `allowed_staff_roles` | Section 5 above |

Every validator returns `list[RuleViolation]` with a `rule_code` and a `get_message()` string. Validators never mutate data.

## 7. Endpoint Gates

From `backend/apps/transactions/api.py`, mounted by `backend/apps/api/router.py` at `/api/v1/scanner/` and `/api/v1/transactions/`:

| Endpoint | Gate |
|----------|------|
| `POST /api/v1/scanner/validate/` | `is_scanner_operator` checked explicitly in the handler, then delegated to `validate_qr_v2` |
| `POST /api/v1/scanner/transact/` | `is_scanner_operator` checked explicitly in the handler, then delegated to `transact_v2` |
| `GET /api/v1/scanner/customer/search/` | `is_scanner_operator` |
| `GET /api/v1/transactions/` | `is_manager_or_owner` |
| `GET /api/v1/transactions/{transaction_id}/` | `is_manager_or_owner` |
| `POST /api/v1/transactions/remote-issue/` | `is_scanner_operator` |

The `/api/v1/scanner/v2/` router holds the redemption engine's own validate and transact endpoints.

The scanner handlers re-check `is_scanner_operator` in the handler body rather than relying only on the nested v2 call, so a 403 is testable in isolation.

## 8. Security Notes

- Tenant isolation on every pass lookup uses `card__tenant=request.tenant`.
- Role checks read the database-loaded user, never request data.
- `allowed_staff_roles` narrows access only. It cannot grant scanner access to a role the endpoint gate already rejects.
- A `SUPER_ADMIN` bypass exists in both `is_scanner_operator` and `StaffRoleValidator` so platform impersonation works end to end.
- No secret, token, or password appears in any role check path.

---

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-30 | Approved |
| Product Owner | — | — | — | Pending Review |
| Security Officer | — | — | — | Pending Review |
| QA Lead | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-30 | Engineering Lead | First release covering scanner RBAC and redemption rules |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |
| Role model change | — | If `UserRole` gains or loses a value |
