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
            NX[Nginx<br/>Port 80/443<br/>SSL Termination (dev HTTP only; prod uses host-level nginx)]
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
            MIO[MinIO<br/>S3-Compatible Storage<br/>Logos, QR Codes<br/>Port 33903/33904]
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
    CEL -->|"5. Generate PKPass bytes"| C2
    CEL -->|"6. Generate Google JWT save URL"| GW
    GW --> C3
    CEL -->|"7. Welcome push"| APN
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
    WEB->>API: GET /api/v1/cards/public/{card_id}/
    API->>DB: Fetch card config + branding
    DB-->>API: Card data
    API-->>WEB: Card details (name, logo, colors, card type)
    WEB-->>Browser: Render enrollment form (branded)

    Customer->>Browser: Fills form (name, email, phone)
    Customer->>Browser: Accepts T&C and Privacy Policy
    Browser->>NX: POST /api/v1/customers/enroll/?card_id={card_id}
    NX->>API: Forward request

    API->>DB: Check duplicate enrollment (email + card)
    DB-->>API: No duplicate found

    API->>DB: Create Customer record
    API->>DB: Create CustomerPass record (serial_number, initial balance)
    API->>RD: Queue: generate_qr_for_pass(pass_id)
    API-->>Browser: 202 Accepted + pass_pending_url

    Note over CEL,MIO: Async QR generation (target ≤5 seconds)
    CEL->>DB: Fetch pass + customer + card data
    CEL->>CEL: Generate PKPass bytes (Apple) + sign with cert
    CEL->>CEL: Generate Google Wallet JWT save URL (Android)
    CEL->>MIO: Store QR code image
    CEL->>DB: Update pass status = ACTIVE + store_urls

    Browser->>NX: GET /api/v1/wallet/status/{pass_id}/ (polling)
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
    PWA->>NX: POST /scanner/v2/validate/
    Note right of PWA: {qr_token: "signed_token_xyz"}

    NX->>API: Forward with Staff JWT
    API->>API: Verify Staff JWT (tenant + role check)
    API->>API: Verify QR token HMAC signature
    API->>DB: Fetch CustomerPass by serial_number
    DB-->>API: Pass data (customer, program, current_balance)

    API->>API: Validate: pass active? program active? not expired?

    alt Pass is VALID
        API-->>PWA: 200 OK + customer name + current stamps + program data
        PWA-->>Staff: GREEN indicator + "Carlos M. — 4/9 Stamps"

        Staff->>PWA: Confirms "Add Stamp" button
        PWA->>API: POST /scanner/v2/transact/
        Note right of PWA: {qr_token, intent: "stamp_add", quantity: 1, location_id}

        API->>DB: Insert Transaction record
        API->>DB: Update Pass balance (stamps: 4 → 5)
        API->>RD: Queue: trigger_pass_update(pass_id)
        API-->>PWA: 201 Created + new_balance: 5

        PWA-->>Staff: "[OK] Stamp added. 5/9"

        CEL->>DB: Fetch updated pass data
        CEL->>CEL: Re-generate updated PKPass / Google JWT
        CEL->>APN: notify_pass_updated (Apple background push)
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

    Note over CEL,APN: Android geofencing is planned/future; not implemented.
```

## DIAGRAM 6 — SEQUENCE: AUTOMATION RULE EXECUTION

```mermaid
sequenceDiagram
    participant BEAT as Celery Beat (daily)
    participant CEL as Celery Worker
    participant DB as PostgreSQL
    participant RD as Redis
    participant APN as APN / FCM

    BEAT->>CEL: Trigger: evaluate_scheduled_automations()

    CEL->>DB: SELECT active rules WHERE trigger = 'SCHEDULED_TIME'
    DB-->>CEL: [Rule: win_back (inactive 30d), Rule: expiry_alert (7d)]

    loop For each rule
        CEL->>DB: Find matching customers (filter by conditions)
        DB-->>CEL: [customer_id_1, customer_id_2, ...]

        CEL->>DB: Check per-customer cooldown via AutomationExecution
        DB-->>CEL: Eligible customers

        loop For each eligible customer
            CEL->>DB: Execute action (SEND_NOTIFICATION, SEND_EMAIL, ISSUE_STAMP, etc.)
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
    API->>DB: Create Subscription + Invoice with manual_verification_required: true
    API-->>DASH: Subscription pending manual verification [OK]

    Note over BEAT,GWY: Monthly/Annual recurring billing
    GWY->>API: POST /api/v1/billing/payments/webhook/ (payment.approved)
    API->>DB: Record payment + update Invoice
    API->>CEL: Queue: send_invoice_email(tenant_id)
    CEL->>SMTP: Send invoice PDF

    Note over GWY,CEL: Failed payment
    GWY->>API: POST /api/v1/billing/payments/webhook/ (payment.failed)
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
    H --> I[POST /api/v1/customers/enroll/?card_id={card_id}]
    I --> J{Validation\nPassed?}
    J -->|No| K[Show field errors → Return to form]
    J -->|Yes| L[Create Customer + CustomerPass in DB]
    L --> M[Queue async QR generation job]
    M --> N{Device type?}
    N -->|iOS| O[Generate PKPass bytes + sign with Apple cert]
    N -->|Android| P[Generate Google Wallet JWT save URL]
    O --> Q[Store QR code image in MinIO]
    P --> Q
    Q --> R[Update pass status = ACTIVE]
    R --> S[GET /api/v1/wallet/status/{pass_id}/]
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
    G -->|Yes| H[POST /scanner/v2/validate/]
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

    X & Y & Z & AA & BB --> CC[POST /scanner/v2/transact/]
    CC --> DD[DB updated + Wallet pass updated ≤30s]
    DD --> EE([Transaction Complete [OK]])
```

## DIAGRAM 10 — FLOWCHART: PUSH CAMPAIGN DELIVERY

```mermaid
flowchart TD
    A([Manager creates push campaign]) --> B[Select: Title + Message + Image]
    B --> C[Select Target Audience]
    C --> D{Audience filters}
    D -->|segment_id| E[Filter by segment]
    D -->|target_program_ids| F[Filter by card/program]
    D -->|target_device_type| G[Filter by iOS/Android]
    D -->|target_wallet_platform| H[Filter by Apple/Google Wallet]
    D -->|target_customer_ids| I[Filter by explicit customer list]

    E & F & G & H & I --> J[Estimate reach count]
    J --> K{Send now or\nschedule?}
    K -->|Schedule| L[Set date/time + timezone]
    K -->|Send now| M[Queue campaign job in Redis]
    L --> N[Celery Beat triggers at scheduled time]
    N --> M

    M --> O[Celery worker dequeues batch]
    O --> P{Campaign channel}
    P -->|Wallet push| Q[send_wallet_notification_campaign]
    P -->|WhatsApp| R[send_whatsapp_campaign]

    Q --> S{Device OS / platform}
    S -->|iOS| T[Send via Apple APN HTTP/2]
    S -->|Android| U[Send via Google FCM API]
    S -->|Apple Wallet| V[notify_pass_updated (background push)]
    S -->|Google Wallet| W[notify_pass_updated (Google Wallet push)]

    T & U & V & W --> X{Delivery result}
    X -->|Success| Y[Log: delivered_count++]
    X -->|Invalid Token| Z[Mark token invalid in DB]
    X -->|Failed| AA[Retry up to 3x]

    Y & Z --> AB[Update campaign stats]
    AA --> AC{Retry count <= 3?}
    AC -->|Yes| O
    AC -->|No| AD[Log permanent failure]
    AD --> AB

    AB --> AE([Campaign Complete — Show open rate in Dashboard])
```

## DIAGRAM 11 — DEPLOYMENT DIAGRAM (DOCKER COMPOSE)

> **Note:** The diagram below is simplified. The real Compose topology uses three networks (`frontend-net`, `backend-net`, `monitoring-net`) and includes additional services not shown here: `postgres-replica`, `redis-sentinel`, `minio-init`, `vault`, `vault-init`, `whatsapp-bridge`, `prometheus`, `grafana`, `loki`, and `alertmanager`.

```mermaid
graph TB
    subgraph "Host Machine"
        subgraph "docker-compose networks: frontend-net, backend-net, monitoring-net"
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
            VLT[vault<br/>container :8200 → host :33908]
        end
    end

    NX -->|proxy /api/*| API
    NX -->|proxy /*| WEB
    NX -->|proxy /assets/*| MIO
    API -->|DB queries| PGB
    PGB --> PG
    API --> RD
    API --> VLT
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
    style VLT fill:#ffd814,color:#000
```

## DIAGRAM 12 — ENTITY RELATIONSHIP DIAGRAM (CORE TABLES)

> ⚠️ **Source of truth:** The actual models are in `backend/apps/*/models.py`. This diagram is **illustrative** and may not match current model fields, table names, or relationships. Always verify against the current Django models and migrations.

```mermaid
erDiagram
    Tenant {
        uuid id PK
        string name
        string slug
        string status
        datetime trial_end
        bool is_active
        string timezone
        string country
    }

    User {
        uuid id PK
        uuid tenant_id FK
        string email
        string password
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
        datetime join_date
        bool is_active
    }

    PushDevice {
        uuid id PK
        uuid customer_id FK
        string platform
        string push_token
        bool is_active
    }

    CustomerPass {
        uuid id PK
        uuid customer_id FK
        uuid program_id FK
        string serial_number
        jsonb balance_data
        string status
        string apple_pass_url
        string google_pass_url
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
        decimal amount "null=True"
        jsonb metadata
        datetime created_at
    }

    AutomationRule {
        uuid id PK
        uuid tenant_id FK
        string name
        string trigger_type
        jsonb conditions
        jsonb actions
        bool is_active
        int execution_count
    }

    AutomationExecution {
        uuid id PK
        uuid rule_id FK
        uuid customer_id FK
        datetime executed_at
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

    CampaignRun {
        uuid id PK
        uuid campaign_id FK
        string channel
        datetime started_at
        datetime finished_at
    }

    Subscription {
        uuid id PK
        uuid tenant_id FK "OneToOne"
        uuid plan_id FK
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
    Customer ||--o{ PushDevice : "has"
    Customer ||--o{ CustomerPass : "holds"
    LoyaltyProgram ||--o{ CustomerPass : "issues"
    CustomerPass ||--o{ Transaction : "records"
    Customer ||--o{ Transaction : "makes"
    User ||--o{ Transaction : "records"
    Location ||--o{ Transaction : "at"
    AutomationRule ||--o{ AutomationExecution : "logs"
    PushCampaign ||--o{ CampaignRun : "runs"
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
- `common/vault.py` — added `put_secret(key, value)`:
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
