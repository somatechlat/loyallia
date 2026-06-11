# LOYALLIA — ARCHITECTURE, SEQUENCE & FLOWCHART DIAGRAMS
**Document ID:** LOYALLIA-ARCH-001
**Version:** 1.0.0
**Date:** 2026-04-05
**Reference:** SRS LOYALLIA-SRS-001

## IMPORTANT CLARIFICATION — SCANNER APP ARCHITECTURE

The system has TWO distinct QR scanning flows. This is critical to understand:

| Actor | Scans | With | Purpose |
|-------|-------|------|---------|
| Customer | Business poster QR | Normal phone camera | Enrollment → browser opens → saves pass to Wallet |
| Staff | Customer's Wallet pass QR | **Loyallia Scanner PWA** | Records stamp/cashback/redemption in database |

**Scanner App Decision: PWA (v1.0)**
The staff scanner is implemented as a **Progressive Web App** hosted on the same Django/Next.js stack. Staff open `https://app.loyallia.com/scanner` on their phone browser, log in once, and the browser camera API handles QR scanning. No app store required. React Native is deferred to v2.0 if offline demands require it.

## DIAGRAM 1 — FULL SYSTEM ARCHITECTURE

```mermaid
graph TB
    subgraph "Customer Layer"
        C1[Customer Phone Camera<br/>Normal QR Scan]
        C2[Apple Wallet]
        C3[Google Wallet]
    end

    subgraph "Business Staff Layer"
        S1[Scanner PWA<br/>Staff Phone Browser<br/>loyallia.com/scanner]
    end

    subgraph "Business Owner/Manager Layer"
        D1[Business Dashboard<br/>Next.js Web App<br/>loyallia.com/dashboard]
    end

    subgraph "Loyallia Platform — Docker Network"
        subgraph "Reverse Proxy"
            NX[Nginx<br/>Port 80/443<br/>SSL Termination]
        end

        subgraph "Application Layer"
            API[Django 5 + Django Ninja<br/>REST API<br/>Port 33905]
            WEB[Next.js 14<br/>Dashboard + Scanner PWA<br/>Port 33906]
        end

        subgraph "Async Workers"
            CEL[Celery Workers<br/>Pass Generation<br/>Push Delivery<br/>Automation Rules]
            BEAT[Celery Beat<br/>Scheduled Jobs<br/>Win-back, Expiry Alerts]
            FLW[Flower<br/>Worker Monitor<br/>Port 33907]
        end

        subgraph "Data Layer"
            PG[(PostgreSQL 17<br/>Primary Database<br/>Port 33900)]
            RD[(Redis 7<br/>Cache + Queue<br/>Port 33902)]
            PGB[PgBouncer<br/>Connection Pool<br/>Port 33901]
        end

        subgraph "File Storage"
            MIO[MinIO<br/>S3-Compatible Storage<br/>Logos, QR Codes, PKPass<br/>Port 33903/33904]
        end

        subgraph "Security"
            VLT[HashiCorp Vault<br/>Secret Management<br/>Port 33908]
        end
    end

    subgraph "External Services"
        APN[Apple APN<br/>iOS Push]
        FCM[Google FCM<br/>Android Push]
        GW[Google Wallet API<br/>Pass Issuance]
        GWY[Payment Gateway<br/>Manual / Pluggable]
        SMTP[SMTP Provider<br/>Transactional Email]
    end

    C1 -->|"1. Scans business QR"| NX
    NX --> WEB
    WEB -->|"2. Enrollment form"| C1
    WEB -->|"3. Pass generation request"| API
    API -->|"4. Queue pass job"| RD
    CEL -->|"5. Generate PKPass"| MIO
    CEL -->|"6. Send to Apple"| C2
    CEL -->|"7. Send JWT to Google"| GW
    GW --> C3
    CEL -->|"8. Welcome push"| APN
    CEL --> FCM

    S1 -->|"Scan customer pass QR"| NX
    NX --> API
    API --> PGB
    PGB --> PG

    D1 -->|"Dashboard requests"| NX
    NX --> WEB
    WEB --> API

    API -->|"Push campaigns"| RD
    CEL -->|"Deliver push"| APN
    CEL -->|"Deliver push"| FCM
    CEL -->|"Process payment"| GWY
    CEL -->|"Send email"| SMTP
    API -->|"Read secrets"| VLT

    BEAT -->|"Schedule jobs"| RD
    CEL -->|"Pass updates"| APN
    CEL -->|"Pass updates"| FCM
```

## DIAGRAM 2 — MULTI-TENANT DATA ISOLATION MODEL

```mermaid
graph LR
    subgraph "Django ORM Layer"
        Q[Every Query]
        F[".filter(tenant=request.tenant)"]
        G[Global Tenant Middleware]
    end

    subgraph "PostgreSQL"
        T1[(Tenant A Data)]
        T2[(Tenant B Data)]
        T3[(Tenant C Data)]
    end

    Q --> G
    G --> F
    F -->|"Only Tenant A rows"| T1
    F -->|"Cross-tenant → 403"| T2
    F -->|"Cross-tenant → 403"| T3

    style T2 fill:#ff6b6b
    style T3 fill:#ff6b6b
    style T1 fill:#51cf66
```

## DIAGRAM 3 — SEQUENCE: CUSTOMER ENROLLMENT FLOW

```mermaid
sequenceDiagram
    actor Customer
    participant QR as QR Code / Poster
    participant Browser as Customer Browser
    participant NX as Nginx
    participant WEB as Next.js
    participant API as Django API
    participant DB as PostgreSQL
    participant RD as Redis
    participant CEL as Celery Worker
    participant MIO as MinIO
    participant APN as Apple APN / FCM

    Customer->>QR: Scans QR with normal phone camera
    QR->>Browser: Opens enrollment URL
    Browser->>NX: GET /enroll/{program_slug}
    NX->>WEB: Route to enrollment page
    WEB->>API: GET /api/v1/programs/{slug}/
    API->>DB: Fetch program config + branding
    DB-->>API: Program data
    API-->>WEB: Program details (name, logo, colors, card type)
    WEB-->>Browser: Render enrollment form (branded)

    Customer->>Browser: Fills form (name, email, phone)
    Customer->>Browser: Accepts T&C and Privacy Policy
    Browser->>NX: POST /api/v1/customers/enroll/
    NX->>API: Forward request

    API->>DB: Check duplicate enrollment (email + program)
    DB-->>API: No duplicate found

    API->>DB: Create Customer record
    API->>DB: Create Pass record (serial_number, initial balance)
    API->>RD: Queue: generate_pass_job(pass_id)
    API-->>Browser: 202 Accepted + pass_pending_url

    Note over CEL,MIO: Async pass generation (target ≤5 seconds)
    CEL->>DB: Fetch pass + customer + program data
    CEL->>CEL: Generate PKPass file (Apple) + sign with cert
    CEL->>CEL: Generate Google Wallet JWT (Android)
    CEL->>MIO: Store PKPass file
    CEL->>DB: Update pass status = ACTIVE + store_urls
    CEL->>RD: Queue: send_welcome_push(pass_id)

    Browser->>NX: GET /api/v1/passes/{id}/status/ (polling or SSE)
    API-->>Browser: {status: READY, apple_url, google_url}

    Browser-->>Customer: "Add to Wallet" button (Apple or Google)
    Customer->>Browser: Taps "Add to Wallet"
    Browser-->>Customer: Pass saved to Apple/Google Wallet [OK]

    CEL->>APN: Send welcome push notification
    APN-->>Customer: Push: "Welcome! Your [Program] card is ready."
```

## DIAGRAM 4 — SEQUENCE: STAFF QR SCAN TRANSACTION (STAMP CARD)

```mermaid
sequenceDiagram
    actor Staff
    participant PWA as Scanner PWA (Staff Phone Browser)
    participant NX as Nginx
    participant API as Django API
    participant DB as PostgreSQL
    participant RD as Redis
    participant CEL as Celery Worker
    participant APN as Apple APN / FCM
    participant Wallet as Customer Wallet

    Staff->>PWA: Opens camera / scans customer's Wallet pass QR
    PWA->>NX: POST /api/v1/passes/validate/
    Note right of PWA: {qr_token: "signed_token_xyz", action: "stamp", location_id: "loc_1"}

    NX->>API: Forward with Staff JWT
    API->>API: Verify Staff JWT (tenant + role check)
    API->>API: Verify QR token HMAC signature
    API->>DB: Fetch Pass by serial_number
    DB-->>API: Pass data (customer, program, current_balance)

    API->>API: Validate: pass active? program active? not expired?

    alt Pass is VALID
        API-->>PWA: 200 OK + customer name + current stamps + program data
        PWA-->>Staff: GREEN indicator + "Carlos M. — 4/9 Stamps"

        Staff->>PWA: Confirms "Add Stamp" button
        PWA->>API: POST /api/v1/transactions/
        Note right of PWA: {pass_id, action: "stamp_add", count: 1, staff_id, location_id}

        API->>DB: Insert Transaction record
        API->>DB: Update Pass balance (stamps: 4 → 5)
        API->>RD: Queue: update_wallet_pass(pass_id)
        API-->>PWA: 201 Created + new_balance: 5

        PWA-->>Staff: "[OK] Stamp added. 5/9"

        CEL->>DB: Fetch updated pass data
        CEL->>CEL: Re-generate updated PKPass / Google JWT
        CEL->>APN: Send pass update + push
        APN-->>Wallet: Pass updates in Wallet (5/9 stamps) [OK]

    else Pass is INVALID / EXPIRED / FRAUD
        API-->>PWA: 400/403 + reason
        PWA-->>Staff: RED indicator + "Invalid pass: [reason]"
    end
```

## DIAGRAM 5 — SEQUENCE: GEO-FENCING PUSH NOTIFICATION

```mermaid
sequenceDiagram
    participant Wallet as Customer Apple Wallet
    participant APN as Apple APN Server
    participant CEL as Celery + Backend

    Note over Wallet: Pass contains locations[] array<br/>with business lat/long + 100m radius

    Wallet->>Wallet: Device detects customer enters 100m radius
    Wallet->>APN: Trigger location-based notification
    APN-->>Wallet: Show lock-screen notification<br/>"You're near [Business Name]!"

    Note over CEL,APN: Android path (Firebase Geofencing):
    Note over CEL,APN: Pass installation registers<br/>geofence via Firebase SDK
    Note over CEL,APN: Android OS fires geofence → FCM push
```

## DIAGRAM 6 — SEQUENCE: AUTOMATION RULE EXECUTION

```mermaid
sequenceDiagram
    participant BEAT as Celery Beat (every 15min)
    participant CEL as Celery Worker
    participant DB as PostgreSQL
    participant RD as Redis
    participant APN as APN / FCM

    BEAT->>CEL: Trigger: evaluate_automation_rules()

    CEL->>DB: SELECT active rules WHERE rule_type = 'scheduled'
    DB-->>CEL: [Rule: win_back (inactive 30d), Rule: expiry_alert (7d)]

    loop For each rule
        CEL->>DB: Find matching customers (filter by conditions)
        DB-->>CEL: [customer_id_1, customer_id_2, ...]

        CEL->>DB: Check cooldown: last_execution < now - cooldown_window?
        DB-->>CEL: Eligible customers

        loop For each eligible customer
            CEL->>DB: Execute action (issue_stamp / send_push / etc.)
            CEL->>DB: Log AutomationExecution record
            CEL->>RD: Queue push delivery
        end
    end

    RD->>CEL: Dequeue push jobs
    CEL->>APN: Deliver pushes
    APN-->>Customers: "We miss you! Here's a bonus stamp"
```

## DIAGRAM 7 — SEQUENCE: TENANT SUBSCRIPTION BILLING

```mermaid
sequenceDiagram
    actor Owner
    participant DASH as Dashboard
    participant API as Django API
    participant DB as PostgreSQL
    participant GWY as Payment Gateway
    participant CEL as Celery
    participant SMTP as Email

    Owner->>DASH: Selects plan after trial (5 days)
    DASH->>API: POST /api/v1/billing/subscribe/
    API->>GWY: Create session + process payment
    GWY-->>API: gateway_subscription_id + status: active
    API->>DB: Update Tenant (plan, gateway_subscription_id)
    API-->>DASH: Subscription active [OK]

    Note over BEAT,GWY: Monthly/Annual recurring billing
    GWY->>API: Webhook: payment.approved
    API->>DB: Record payment + create Invoice
    API->>CEL: Queue: send_invoice_email(tenant_id)
    CEL->>SMTP: Send invoice PDF

    Note over GWY,CEL: Failed payment
    GWY->>API: Webhook: payment.failed
    API->>DB: Mark payment_status = FAILED
    API->>CEL: Queue: notify_payment_failed(tenant_id)
    CEL->>SMTP: "Payment failed — please update billing"
    Note over API: After 3 retries (7 days): suspend tenant
```

## DIAGRAM 8 — FLOWCHART: COMPLETE ENROLLMENT FLOW

```mermaid
flowchart TD
    A([Customer Sees QR Poster]) --> B[Scans QR with Phone Camera]
    B --> C[Browser Opens Enrollment Page]
    C --> D{Is customer\nalready enrolled?}
    D -->|Yes| E[Show: Re-send Pass to Wallet option]
    D -->|No| F[Display branded enrollment form]
    F --> G[Customer fills: Name, Email, Phone]
    G --> H[Customer accepts T&C + Privacy Policy]
    H --> I[Submit enrollment]
    I --> J{Validation\nPassed?}
    J -->|No| K[Show field errors → Return to form]
    J -->|Yes| L[Create Customer + Pass in DB]
    L --> M[Queue async pass generation job]
    M --> N{Device type?}
    N -->|iOS| O[Generate PKPass + sign with Apple cert]
    N -->|Android| P[Generate Google Wallet JWT]
    O --> Q[Store PKPass in MinIO]
    P --> Q
    Q --> R[Update pass status = ACTIVE]
    R --> S[Show Download Wallet Pass page]
    S --> T[Customer taps Add to Wallet]
    T --> U[Pass saved to Wallet [OK]]
    U --> V[Send welcome push notification]
    V --> W([Enrollment Complete])

    E --> X[Resend pass link to email]
    X --> W
```

## DIAGRAM 9 — FLOWCHART: SCANNER APP VALIDATION

```mermaid
flowchart TD
    A([Staff opens Scanner PWA]) --> B{Authenticated?}
    B -->|No| C[Login with staff credentials]
    C --> D[Select business location]
    D --> E[Scanner screen]
    B -->|Yes| E

    E --> F[Open camera — scan customer Wallet QR]
    F --> G{Online?}
    G -->|Yes| H[POST /api/v1/passes/validate/]
    G -->|No| I[Offline validation with cached HMAC key]
    I --> J{Local signature valid?}
    J -->|No| K[RED — Invalid Pass]
    J -->|Yes| L[Queue transaction locally]
    L --> M[GREEN — show cached customer data]
    M --> N[Staff confirms action]
    N --> O[Store to offline queue]
    O --> P{Connection restored?}
    P -->|Yes| Q[Sync offline queue to API]
    P -->|No| R[Keep in queue]

    H --> S{API Response}
    S -->|Valid| T[GREEN [OK] Show customer name + balance]
    S -->|Invalid| K
    S -->|Expired| U[YELLOW [WARN] Pass Expired]
    S -->|Fraud| V[RED [BLOCKED] Fraud Alert]

    T --> W{Card type action}
    W -->|Stamp| X[Tap to add stamp + confirm]
    W -->|Cashback| Y[Enter purchase amount → calculate credit]
    W -->|Coupon| Z[Confirm redemption]
    W -->|Gift/Multipass| AA[Enter amount used → decrement balance]
    W -->|Membership/Corporate| BB[Confirm visit + show discount]

    X & Y & Z & AA & BB --> CC[POST /api/v1/transactions/]
    CC --> DD[DB updated + Wallet pass updated ≤30s]
    DD --> EE([Transaction Complete [OK]])
```

## DIAGRAM 10 — FLOWCHART: PUSH CAMPAIGN DELIVERY

```mermaid
flowchart TD
    A([Manager creates push campaign]) --> B[Select: Title + Message + Image]
    B --> C[Select Target Audience]
    C --> D{Audience type}
    D -->|All customers| E[Fetch all active device tokens]
    D -->|By card type| F[Filter tokens by card_type]
    D -->|By segment| G[Filter tokens by segment criteria]

    E & F & G --> H[Estimate reach count]
    H --> I{Send now or\nschedule?}
    I -->|Schedule| J[Set date/time + timezone]
    I -->|Send now| K[Queue push job in Redis]
    J --> L[Celery Beat triggers at scheduled time]
    L --> K

    K --> M[Celery worker dequeues batch]
    M --> N{Device OS}
    N -->|iOS| O[Send via Apple APN HTTP/2]
    N -->|Android| P[Send via Google FCM API]

    O --> Q{Delivery result}
    P --> Q
    Q -->|Success| R[Log: delivered_count++]
    Q -->|Invalid Token| S[Mark token invalid in DB]
    Q -->|Failed| T[Retry up to 3x]

    R & S --> U[Update campaign stats]
    T --> V{Retry count <= 3?}
    V -->|Yes| M
    V -->|No| W[Log permanent failure]
    W --> U

    U --> X([Campaign Complete — Show open rate in Dashboard])
```

## DIAGRAM 11 — DEPLOYMENT DIAGRAM (DOCKER COMPOSE)

```mermaid
graph TB
    subgraph "Host Machine"
        subgraph "docker-compose network: loyallia-net"
            NX[nginx<br/>host :80/:443]
            API[api — Django<br/>container :8000 → host :33905]
            WEB[web — Next.js<br/>container :3000 → host :33906]
            CEL1[celery-worker<br/>pass_generation queue]
            CEL2[celery-worker<br/>push_delivery queue]
            CEL3[celery-worker<br/>default queue]
            BEAT[celery-beat<br/>scheduler]
            FLW[flower<br/>container :5555 → host :33907]
            PG[postgres<br/>container :5432 → host :33900]
            PGB[pgbouncer<br/>container :6432 → host :33901]
            RD[redis<br/>container :6379 → host :33902]
            MIO[minio<br/>container :9000/:9001 → host :33903/:33904]
        end
    end

    NX -->|proxy /api/*| API
    NX -->|proxy /*| WEB
    API -->|DB queries| PGB
    PGB --> PG
    API --> RD
    CEL1 --> RD
    CEL2 --> RD
    CEL3 --> RD
    BEAT --> RD
    CEL1 --> PG
    CEL2 --> PG
    CEL3 --> PG
    CEL1 --> MIO
    FLW --> RD

    style PG fill:#336791,color:#fff
    style RD fill:#dc382d,color:#fff
    style MIO fill:#c72c48,color:#fff
    style NX fill:#009639,color:#fff
```

## DIAGRAM 12 — ENTITY RELATIONSHIP DIAGRAM (CORE TABLES)

> ⚠️ **Source of truth:** The actual models are in `backend/apps/*/models.py`. This diagram is an approximation; always verify fields, table names, and relationships against the current Django models and migrations.

```mermaid
erDiagram
    Tenant {
        uuid id PK
        string name
        string slug
        string plan
        datetime trial_end
        bool is_active
        string gateway_customer_id
        string timezone
        string country
    }

    User {
        uuid id PK
        uuid tenant_id FK
        string email
        string password_hash
        string role
        bool is_active
        datetime last_login
    }

    Location {
        uuid id PK
        uuid tenant_id FK
        string name
        string address
        decimal lat
        decimal long
        bool is_active
    }

    LoyaltyProgram {
        uuid id PK
        uuid tenant_id FK
        string card_type
        string name
        jsonb config
        bool is_active
        string logo_url
        string background_color
        string text_color
    }

    Customer {
        uuid id PK
        uuid tenant_id FK
        string first_name
        string last_name
        string email
        string phone
        string device_token_ios
        string device_token_android
        datetime join_date
        bool is_active
    }

    Pass {
        uuid id PK
        uuid customer_id FK
        uuid program_id FK
        string serial_number
        jsonb balance_data
        string status
        string pkpass_url
        datetime issued_at
        datetime updated_at
    }

    Transaction {
        uuid id PK
        uuid tenant_id FK
        uuid pass_id FK
        uuid customer_id FK
        uuid staff_id FK
        uuid location_id FK
        string type
        decimal amount
        jsonb metadata
        datetime created_at
    }

    AutomationRule {
        uuid id PK
        uuid tenant_id FK
        string name
        string trigger
        jsonb conditions
        jsonb actions
        bool is_active
        int execution_count
    }

    PushCampaign {
        uuid id PK
        uuid tenant_id FK
        string title
        string message
        string status
        datetime scheduled_at
        int sent_count
        int delivered_count
        int open_count
    }

    Subscription {
        uuid id PK
        uuid tenant_id FK
        string plan
        string gateway_subscription_id
        string status
        datetime period_start
        datetime period_end
    }

    Tenant ||--o{ User : "has"
    Tenant ||--o{ Location : "has"
    Tenant ||--o{ LoyaltyProgram : "has"
    Tenant ||--o{ Customer : "has"
    Tenant ||--o{ AutomationRule : "has"
    Tenant ||--o{ PushCampaign : "has"
    Tenant ||--|| Subscription : "has"
    Customer ||--o{ Pass : "holds"
    LoyaltyProgram ||--o{ Pass : "issues"
    Pass ||--o{ Transaction : "records"
    Customer ||--o{ Transaction : "makes"
    User ||--o{ Transaction : "records"
    Location ||--o{ Transaction : "at"
```

## APPENDIX A — Recent Architecture Changes (2026-05-06)

This appendix documents all backend, frontend, and infrastructure changes made during the 2026-05-06 configuration session. Agents MUST read this before modifying any of the affected subsystems.

### A.1 Subscription Plan Rate Limits

**Motivation:** Existing plans only had basic limits (`max_locations`, `max_customers`, etc.). The platform needed granular rate limits for enterprise features.

**Changes:**
- `apps/billing/models.py` — `SubscriptionPlan` defines 16 resource-limit fields plus the derived `wallet_ai_designs_month` alias:
  - `max_locations`, `max_users`, `max_customers`, `max_programs`
  - `max_notifications_month`, `max_transactions_month`
  - `max_whatsapp_day`, `max_emails_month`, `max_sms_day`, `max_wallet_pushes_month`
  - `max_automations`, `max_automation_executions_day`
  - `max_ai_queries_month`, `max_api_calls_day`, `max_exports_month`
  - `max_wallet_templates`, `max_wallet_pass_updates_month`
- Migration `0007_add_rate_limit_fields` — adds columns + CHECK constraints
- `common/plan_enforcement.py` — `_count_api_calls_day()` now queries `AgentAPICallLog` instead of returning 0
- Public billing API — returns all 17 rate-limit fields in plan responses

**Database Fix Note:**
If migration `0007` is recorded in `django_migrations` but columns are missing from `loyallia_subscription_plans`, apply the fix in `docs/01-start-here/AGENT_ONBOARDING.md` §7 (Common Issues).

### A.2 Agent API Call Logging

**Motivation:** Need to enforce `max_api_calls_day` plan limit accurately.

**Changes:**
- `apps/agent_api/models.py` — new `AgentAPICallLog` model:
  ```python
  class AgentAPICallLog(models.Model):
      id = UUIDField(primary_key=True, default=uuid.uuid4)
      tenant = ForeignKey(Tenant, on_delete=CASCADE, db_index=True)
      endpoint = CharField(max_length=255)
      method = CharField(max_length=10)
      status_code = PositiveSmallIntegerField(null=True, blank=True)
      created_at = DateTimeField(auto_now_add=True, db_index=True)
  ```
- Migration created and applied
- `plan_enforcement._count_api_calls_day()` uses this model for per-tenant daily counts

### A.3 Vault Write API

**Motivation:** SuperAdmin needed a way to update secrets at runtime without CLI access.

**Changes:**
- `common/vault.py` — added `write_secret(key, value)`:
  - Reads current Vault data, merges new key, writes back via KV v2 API
  - Calls `clear_cache()` to force re-fetch
- `apps/tenants/super_admin_api/platform.py` — added endpoint:
  ```
  PUT /api/v1/admin/platform/integrations/{integration_key}/secret/
  Body: {"key": "vault_key_name", "value": "secret_value"}
  ```
  - Validates `key` against per-integration `ALLOWED_KEYS` allowlist
  - Returns 400 if key not allowed for that integration
  - Supports 13 integration groups (see `backend/apps/tenants/super_admin_api/integration_config.py`)

**ALLOWED_KEYS per integration:**
```python
"google_wallet": [
    "google_wallet_enabled",
    "google_wallet_issuer_id",
    "google_service_account_json",
    "google_oauth_client_id",
    "google_oauth_client_secret",
],
"apple_wallet": [
    "apple_wallet_enabled",
    "apple_pass_type_identifier",
    "apple_team_identifier",
    "apple_cert_pem",
    "apple_cert_key_pem",
    "apple_wwdr_cert_pem",
],
"payment_gateway": [
    "payment_gateway_enabled",
    "payment_gateway_provider",
    "payment_gateway_login",
    "payment_gateway_tran_key",
    "payment_gateway_webhook_secret",
],
"mailjet": [
    "mailjet_api_key",
    "mailjet_secret_key",
],
"google_oauth": [
    "google_oauth_client_id",
    "google_oauth_client_secret",
],
"whatsapp_bridge": [
    "whatsapp_bridge_url",
    "whatsapp_bridge_api_key",
],
"twilio_sms": [
    "twilio_account_sid",
    "twilio_auth_token",
    "twilio_from_number",
],
"twilio_verify": [
    "twilio_verify_enabled",
    "twilio_verify_service_sid",
    "twilio_verify_default_channel",
],
"twilio_api_key": [
    "twilio_api_key_sid",
    "twilio_api_key_secret",
],
"twilio_test": [
    "twilio_test_account_sid",
    "twilio_test_auth_token",
],
"apple_nfc": [
    "apple_nfc_enabled",
    "apple_nfc_encryption_public_key",
],
"ai_agent": [
    "ai_agent_base_url",
    "ai_agent_api_key",
],
"backup_config": [
    "vault_thresholds",
    "backup_frequency",
    "backup_retention",
    "cron_hour",
    "system_mode",
],
```

### A.4 Integration Diagnostics

**Motivation:** SuperAdmin settings page needed to show WHY an integration was failing.

**Changes:**
- `platform_integrations()` now returns a `diagnostics` object per integration:
  ```json
  {
    "enabled": true,
    "issuer_id_present": true,
    "service_account_present": true,
    "service_account_valid_json": true,
    "service_account_has_required_fields": true,
    "errors": []
  }
  ```
- `google_pass.py` — `get_google_wallet_diagnostics()` checks SA JSON has `client_email`, `private_key`, `token_uri`
- `apple_pass.py` — `get_apple_wallet_diagnostics()` checks all PEMs are present and cryptographically valid via `OpenSSL.crypto`
- `platform.py` integration endpoint — no secrets exposed in response

### A.5 Environment Validation Fix

**Motivation:** API container crashed on startup when email or Apple Wallet credentials were not configured.

**Changes:**
- `common/env_validation.py`:
  - Removed Mailjet and Apple Wallet credentials from unconditional `PRODUCTION_REQUIRED_VAULT_KEYS`
  - Added `EMAIL_REQUIRED_VAULT_KEYS` list
  - Mailjet credentials only validated if `mailjet_api_key` is non-empty
  - Apple Wallet fields only validated if `apple_wallet_enabled` is truthy
  - `payment_gateway` fields only validated if `payment_gateway_enabled` is truthy

This allows the system to boot with a subset of integrations configured.

### A.6 Frontend Settings Page

**Motivation:** Monolithic plans page and read-only settings were inadequate.

**Changes:**
- `src/app/(dashboard)/superadmin/settings/page.tsx`:
  - Inline Vault editor for ALL integrations (not just Google/Apple)
  - Per-field inputs with diagnostic status indicators
  - Password-type fields for secrets
  - Select dropdowns for enum values (`true`/`false`, provider names)
- `src/lib/api.ts`:
  - `superAdminApi` object with structured endpoint paths
- `src/components/superadmin/plans/PlanModal.tsx`:
  - Full-screen modal (`w-full h-full`)
  - `is_active` toggle
  - Reactivation flow for inactive plans
  - Plan deactivation guard (shows 409 if active subscribers exist)

### A.7 SuperAdmin API Security Fixes

**Motivation:** Integration endpoint was leaking secrets.

**Changes:**
- Removed `GOOGLE_WALLET_ISSUER_ID` from `detail` field (was exposed in API response)
- `EMAIL_HOST_PASSWORD` now read via `get_secret()` instead of direct env access
- Integration diagnostics object added — no secrets in response body

### A.8 Certificate File Audit (`certs/`)

**Real files (kept):**
| File | Purpose |
|------|---------|
| `passNew.cer` | Ignored local Apple Pass Type ID certificate |
| `apple_pass_new.key` | Ignored local Apple private key |
| `apple_pass_new.csr` | Ignored local CSR |
| `AppleWWDRCAG4.cer` | Ignored local Apple WWDR intermediate certificate |
| `client_secret_*.json` | Ignored local Google OAuth client secrets |
| `service-account-*.json` | Ignored local Google Wallet service account |

**Removed files (were sanitized placeholders):**
- `apple_pass.key`, `apple_pass_cert.pem`, `apple_wwdr.pem`, `apple_pass.csr`, `pass.cer`

**Verification:**
```bash
# Confirm passNew.cer matches apple_pass_new.key
openssl x509 -in certs/passNew.cer -inform DER -pubkey -noout | openssl rsa -pubin -modulus -noout
openssl rsa -in certs/apple_pass_new.key -pubout | openssl rsa -pubin -modulus -noout
```

### A.9 Documentation Created/Updated

| Document | Status | Purpose |
|----------|--------|---------|
| `AGENT.md` | Updated | Agent directives, stack rules, wallet specs |
| `docs/01-start-here/AGENT_ONBOARDING.md` | **New** | Complete onboarding for future agents |
| `docs/02-architecture/ARCHITECTURE.md` | Updated | This appendix added |
| `docs/08-references/WALLET_CREDENTIALS_STATUS.md` | **New** | Real credential audit |
| `docs/08-references/WALLET_CREDENTIALS_SETUP.md` | Updated | Step-by-step credential acquisition |
| `docs/08-references/GOOGLE_SETUP_STEP_BY_STEP.md` | **New** | Google OAuth + Wallet setup guide |
| `scripts/inject_wallet_credentials.py` | **New** | Helper script for Vault injection |
| `README.md` | Updated | Quick start + credential setup notes |
