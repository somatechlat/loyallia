# Wallet Push Notifications — Investigation & Fix Plan

**Date:** 2026-05-09  
**Status:** CRITICAL BUGS FOUND — Wallet push notifications are NOT working for either Apple or Google Wallet  
**Impact:** Customers never receive pass updates after transactions (stamp count, cashback balance, etc.)

---

## 1. HOW WALLET PUSH NOTIFICATIONS SHOULD WORK

### Apple Wallet Push (APNs)
1. `.pkpass` file includes `webServiceURL` (e.g., `https://rewards.loyallia.com/wallet/apple`)
2. When user adds pass to Wallet, iPhone calls `POST /wallet/apple/v1/devices/{deviceId}/registrations/{passTypeId}/{serial}`
3. Server stores `device_library_id` + `push_token` in `ApplePassRegistration` table
4. When pass data changes (stamp added, balance updated), server sends **empty APNs push** `{}` with `apns-push-type: background`
5. iPhone receives push, calls `GET /wallet/apple/v1/passes/{passTypeId}/{serial}` to download updated `.pkpass`
6. **This is SILENT** — no visible notification to user, pass just updates in background

### Google Wallet Push
1. Pass is created via JWT save URL (`https://pay.google.com/gp/v/save/{jwt}`)
2. Google Wallet stores the object in the user's account
3. When pass data changes, server can:
   - **Option A:** `PATCH` the object data directly (silent update, pass data changes in real-time)
   - **Option B:** `addMessage` to send a visible message to the pass (like a notification)
4. For transaction updates → **should use Option A (PATCH)** for silent data sync
5. For marketing campaigns → **can use Option B (addMessage)** for visible notifications

---

## 2. ROOT CAUSE ANALYSIS

### 🔴 CRITICAL BUG #1: `PASS_WEB_SERVICE_URL` is NOT configured
**File:** `production.py` line 80-83

```python
if not PASS_WEB_SERVICE_URL:  # PASS_WEB_SERVICE_URL is "" from base.py
    PASS_WEB_SERVICE_URL = (
        f"{config('APP_URL', default='https://rewards.loyallia.com')}/wallet/apple"
    )
```

**Problem:** `APP_URL` environment variable is NOT set in production. The `config()` call falls back to default `https://rewards.loyallia.com`, but `PASS_WEB_SERVICE_URL` is checked as `if not PASS_WEB_SERVICE_URL` where it's imported from base.py as an empty string `""`.

Wait — actually `PASS_WEB_SERVICE_URL` in base.py is:
```python
PASS_WEB_SERVICE_URL = config("PASS_WEB_SERVICE_URL", default="")
```

So if env var `PASS_WEB_SERVICE_URL` is not set, it's `""`. Then in production.py:
```python
if not PASS_WEB_SERVICE_URL:  # True, it's ""
    PASS_WEB_SERVICE_URL = f"{config('APP_URL', default='https://rewards.loyallia.com')}/wallet/apple"
```

This SHOULD work if `APP_URL` env var is not overriding it. Let me re-check...

Actually looking at the Vault check output: `PASS_WEB_SERVICE_URL: NOT SET` — this means the Vault secret `PASS_WEB_SERVICE_URL` is not set. But in production.py, it derives from `APP_URL` config, not Vault.

**The real issue:** Need to check if `APP_URL` env var is set. If not, it should default to `https://rewards.loyallia.com`.

But we need to also check: Is the `webServiceURL` actually in the generated `.pkpass`? Let's verify.

**Impact:** Without `webServiceURL` in the `.pkpass`:
- iPhone never registers for push notifications
- `ApplePassRegistration` table stays empty (0 registrations currently confirmed)
- `notify_pass_updated()` finds zero registrations → silently returns 0

### 🔴 CRITICAL BUG #2: `trigger_pass_update` task does NOT call wallet push APIs
**File:** `backend/apps/customers/tasks.py` lines 67-128

The docstring says:
> "Apple Wallet: PKPushPayload triggers passbook device update webhook. Google Wallet: Patches the object via Wallet API."

**Actual code only does this:**
```python
notification = Notification.objects.create(
    tenant=tenant, customer=customer, customer_pass=pass_obj,
    notification_type=NotificationType.SYSTEM, channel=NotificationChannel.PUSH,
    title=pass_obj.card.name, message="Tu tarjeta ha sido actualizada.",
    ...
)
NotificationService.send_notification(notification)
```

This creates a **generic in-app push notification** that goes to the Loyallia mobile app via APNs/FCM. It does **NOT**:
- Call `notify_pass_updated(pass_obj)` for Apple Wallet
- Call any Google Wallet API to update object data

**Called by:** `transactions/api.py` line 218-224 after every QR scan:
```python
if result.get("pass_updated"):
    trigger_pass_update.delay(str(pass_obj.id))
```

**Impact:** Even if Apple Wallet registrations existed and Google Wallet objects were saved, transactions would never trigger wallet updates.

### 🔴 CRITICAL BUG #3: Google Wallet object data is NEVER updated after creation
**File:** `backend/apps/customers/pass_engine/google_pass.py`

The code has `update_loyalty_class()` (for template updates) but **no `update_loyalty_object()`** function.

When a customer saves a Google Wallet pass via the JWT URL:
1. Google creates the object in their wallet
2. Object contains stamp count, balance, etc.
3. After a transaction, stamp count increases
4. **The Google Wallet object still shows old data** — no code ever PATCHes it

The only Google Wallet API call available is `send_push_notification()` which uses `addMessage` — this adds a VISIBLE text message to the pass, it does NOT update the loyalty points, balance, or stamp count fields.

**Impact:** Customer's Google Wallet pass shows stale data forever. They would need to delete and re-add the pass to see updates.

### 🟡 ISSUE #4: No stale token cleanup for Apple Wallet
**File:** `backend/apps/customers/pass_engine/apple_push.py`

`ApplePassRegistration` has no `push_failures` or `is_active` field. Bad tokens are retried forever. The app push system (`PushDevice` model) has this — wallet push should too.

### 🟡 ISSUE #5: Apple Wallet push uses certificate auth which may have issues
**File:** `backend/apps/customers/pass_engine/apple_push.py` lines 114-115

```python
ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
ssl_context.load_cert_chain(certfile=cert_path, keyfile=key_path)
ssl_context.load_default_certs()
```

`ssl.PROTOCOL_TLS_CLIENT` is correct for Python 3.6+, but `httpx` with `http2=True` and a custom SSL context may have issues with APNs HTTP/2 connection. Should verify this works.

---

## 3. CONFIRMED PRODUCTION STATE

| Check | Status | Value |
|-------|--------|-------|
| `apple_wallet_enabled` | ✅ | `true` |
| `google_wallet_enabled` | ✅ | `true` |
| `apple_pass_type_identifier` | ✅ | `pass.com.loyallia.cards` |
| `apple_team_identifier` | ✅ | `29NGPXM563` |
| `google_wallet_issuer_id` | ✅ | `3388000000023112792` |
| `apple_cert_pem` | ✅ | Configured |
| `apple_cert_key_pem` | ✅ | Configured |
| `google_service_account_json` | ✅ | Configured |
| `PASS_WEB_SERVICE_URL` | ❌ | `NOT SET` in Vault |
| `ApplePassRegistration` count | ❌ | 0 (no devices registered) |

---

## 4. FIX PLAN

### Phase 1: Fix Configuration (Apple Wallet webServiceURL)

**Step 1.1:** Verify `PASS_WEB_SERVICE_URL` is actually set in the running container:
```bash
ssh root@140.82.15.48
cd /opt/loyallia
docker compose exec api python -c "from django.conf import settings; print(settings.PASS_WEB_SERVICE_URL)"
```

**Step 1.2:** If empty, fix it by either:
- Option A: Set `PASS_WEB_SERVICE_URL` in Vault to `https://rewards.loyallia.com/wallet/apple`
- Option B: Ensure `APP_URL` env var is set in the container

**Step 1.3:** Regenerate existing `.pkpass` files or ensure new passes include `webServiceURL`. Existing passes already saved to user devices won't get the URL retroactively.

### Phase 2: Fix `trigger_pass_update` Task

**File:** `backend/apps/customers/tasks.py`

**Step 2.1:** Add Apple Wallet push call:
```python
from apps.customers.pass_engine.apple_push import notify_pass_updated
notify_pass_updated(pass_obj)
```

**Step 2.2:** Add Google Wallet object update call (implement `update_loyalty_object` first — see Phase 3).

**Step 2.3:** Keep the existing in-app notification as a secondary channel (useful for users who have the Loyallia app installed).

### Phase 3: Implement Google Wallet Object Update (Silent PATCH)

**File:** New function in `backend/apps/customers/pass_engine/google_pass.py`

```python
def update_loyalty_object(customer_pass) -> dict:
    """
    PATCH the Google Wallet Object with updated pass data.
    This silently updates stamp count, balance, etc. in the user's wallet.
    """
    # 1. Get access token
    # 2. Build updated object payload (same as _build_loyalty_object but only changed fields)
    # 3. PATCH to walletobjects.googleapis.com/v1/loyaltyObjects/{object_id}
    # 4. Return success/failure
```

**Also needed:** Similar functions for `offerObjects` and `giftCardObjects`.

### Phase 4: Add Stale Token Cleanup for Apple Wallet

**File:** `backend/apps/customers/models.py`

Add fields to `ApplePassRegistration`:
```python
push_failures = models.PositiveIntegerField(default=0)
is_active = models.BooleanField(default=True)
```

Update `send_pass_update_push` to increment failures and deactivate after threshold.

### Phase 5: End-to-End Testing

1. Create a new pass with `webServiceURL` set
2. Add pass to Apple Wallet (verify registration is created)
3. Add pass to Google Wallet (verify object is created)
4. Perform a transaction
5. Verify Apple Wallet receives APNs push → device downloads updated pass
6. Verify Google Wallet object is PATCHed with new data
7. Verify in-app notification is also sent

---

## 5. CODE CHANGES REQUIRED

### File 1: `backend/apps/customers/tasks.py`
Replace the `trigger_pass_update` function body to call wallet APIs.

### File 2: `backend/apps/customers/pass_engine/google_pass.py`
Add `update_loyalty_object()`, `update_offer_object()`, `update_gift_card_object()` functions.

### File 3: `backend/apps/customers/pass_engine/apple_push.py`
Add stale token cleanup logic.

### File 4: `backend/apps/customers/models.py`
Add `push_failures` and `is_active` to `ApplePassRegistration`.

### File 5: New migration for model changes

### File 6: `docker-compose.prod.yml` or Vault
Ensure `APP_URL` or `PASS_WEB_SERVICE_URL` env var is set.

---

## 6. APPROACH OPTIONS

### Option A: Minimal Fix (Recommended)
- Fix `PASS_WEB_SERVICE_URL` configuration
- Fix `trigger_pass_update` to call `notify_pass_updated()` and new `update_loyalty_object()`
- No model changes (skip stale token cleanup for now)
- Fastest path to working wallet pushes

### Option B: Complete Fix
- Everything in Option A
- Add stale token cleanup to `ApplePassRegistration`
- Add retry logic and better error handling
- Add metrics/logging for push success rates
- Takes longer but more robust

### Option C: Refactor
- Extract wallet push logic into a dedicated `WalletPushService`
- Unify Apple + Google push patterns
- Add comprehensive tests
- Most work, but cleanest architecture

---

## 7. APPLE vs GOOGLE WALLET PUSH DIFFERENCES

| Aspect | Apple Wallet | Google Wallet |
|--------|-------------|---------------|
| **Push mechanism** | APNs empty push `{}` | No native push for data updates; uses PATCH API |
| **Push type** | `background` (silent) | N/A — data updates are silent via API |
| **Visible notification** | Not supported natively | `addMessage` API adds visible message |
| **Auth method** | Certificate-based (PEM) | OAuth2 Service Account |
| **Registration** | Device calls web service URL | No registration needed — Google handles it |
| **Update trigger** | Device downloads new `.pkpass` after push | Server PATCHes object data directly |
| **Data freshness** | Device decides when to check | Real-time after PATCH |
| **Required config** | `webServiceURL`, certificates | Service Account, Issuer ID |
| **Testability** | Hard — needs real device | Easier — can PATCH and check via API |

---

*End of investigation report.*
