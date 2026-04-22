# LOYALLIA — ARCHITECTURE, SEQUENCE & FLOWCHART DIAGRAMS
**Document ID:** LOYALLIA-ARCH-001  
**Version:** 1.0.0  
**Date:** 2026-04-05  
**Reference:** SRS LOYALLIA-SRS-001  

---

## IMPORTANT CLARIFICATION — SCANNER APP ARCHITECTURE

The system has TWO distinct QR scanning flows. This is critical to understand:

| Actor | Scans | With | Purpose |
|-------|-------|------|---------|
| Customer | Business poster QR | Normal phone camera | Enrollment → browser opens → saves pass to Wallet |
| Staff | Customer's Wallet pass QR | **Loyallia Scanner PWA** | Records stamp/cashback/redemption in database |

**Scanner App Decision: PWA (v1.0)**  
The staff scanner is implemented as a **Progressive Web App** hosted on the same Django/Next.js stack. Staff open `https://app.loyallia.com/scanner` on their phone browser, log in once, and the browser camera API handles QR scanning. No app store required. React Native is deferred to v2.0 if offline demands require it.

---

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
            PG[(PostgreSQL 16<br/>Primary Database<br/>Port 33900)]
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
        CLARO[Claro Pay<br/>Billing/Subscriptions]
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
    CEL -->|"Charge subscription"| CLARO
    CEL -->|"Send email"| SMTP
    API -->|"Read secrets"| VLT

    BEAT -->|"Schedule jobs"| RD
    CEL -->|"Pass updates"| APN
    CEL -->|"Pass updates"| FCM
```

---

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

---

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
    Browser-->>Customer: Pass saved to Apple/Google Wallet ✅

    CEL->>APN: Send welcome push notification
    APN-->>Customer: Push: "Welcome! Your [Program] card is ready."
```

---

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

        PWA-->>Staff: "✅ Stamp added. 5/9"

        CEL->>DB: Fetch updated pass data
        CEL->>CEL: Re-generate updated PKPass / Google JWT
        CEL->>APN: Send pass update + push
        APN-->>Wallet: Pass updates in Wallet (5/9 stamps) ✅

    else Pass is INVALID / EXPIRED / FRAUD
        API-->>PWA: 400/403 + reason
        PWA-->>Staff: RED indicator + "Invalid pass: [reason]"
    end
```

---

## DIAGRAM 5 — SEQUENCE: GEO-FENCING PUSH NOTIFICATION

```mermaid
sequenceDiagram
    participant Wallet as Customer Apple Wallet
    participant APN as Apple APN Server
    participant CEL as Celery + Backend

    Note over Wallet: Pass contains locations[] array<br/>with business lat/long + 100m radius

    Wallet->>Wallet: Device detects customer enters 100m radius
    Wallet->>APN: Trigger location-based notification
    APN-->>Wallet: Show lock-screen notification<br/>"You're near [Business Name]! 🎁"

    Note over CEL,APN: Android path (Firebase Geofencing):
    Note over CEL,APN: Pass installation registers<br/>geofence via Firebase SDK
    Note over CEL,APN: Android OS fires geofence → FCM push
```

---

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
    APN-->>Customers: "We miss you! Here's a bonus stamp 🎁"
```

---

## DIAGRAM 7 — SEQUENCE: TENANT SUBSCRIPTION BILLING

```mermaid
sequenceDiagram
    actor Owner
    participant DASH as Dashboard
    participant API as Django API
    participant DB as PostgreSQL
    participant STRIPE as Stripe
    participant CEL as Celery
    participant SMTP as Email

    Owner->>DASH: Enters credit card after trial
    DASH->>API: POST /api/v1/billing/subscribe/
    API->>STRIPE: Create Customer + Subscription
    STRIPE-->>API: subscription_id + status: active
    API->>DB: Update Tenant (plan=FULL, stripe_subscription_id)
    API-->>DASH: Subscription active ✅

    Note over BEAT,STRIPE: Monthly recurring billing
    STRIPE->>API: Webhook: invoice.payment_succeeded
    API->>DB: Record payment + create Invoice
    API->>CEL: Queue: send_invoice_email(tenant_id)
    CEL->>SMTP: Send invoice PDF

    Note over STRIPE,CEL: Failed payment
    STRIPE->>API: Webhook: invoice.payment_failed
    API->>DB: Mark payment_status = FAILED
    API->>CEL: Queue: notify_payment_failed(tenant_id)
    CEL->>SMTP: "Payment failed — please update billing"
    Note over API: After 3 retries (7 days): suspend tenant
```

---

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
    T --> U[Pass saved to Wallet ✅]
    U --> V[Send welcome push notification]
    V --> W([Enrollment Complete])

    E --> X[Resend pass link to email]
    X --> W
```

---

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
    S -->|Valid| T[GREEN ✅ Show customer name + balance]
    S -->|Invalid| K
    S -->|Expired| U[YELLOW ⚠ Pass Expired]
    S -->|Fraud| V[RED 🚫 Fraud Alert]

    T --> W{Card type action}
    W -->|Stamp| X[Tap to add stamp + confirm]
    W -->|Cashback| Y[Enter purchase amount → calculate credit]
    W -->|Coupon| Z[Confirm redemption]
    W -->|Gift/Multipass| AA[Enter amount used → decrement balance]
    W -->|Membership/Corporate| BB[Confirm visit + show discount]

    X & Y & Z & AA & BB --> CC[POST /api/v1/transactions/]
    CC --> DD[DB updated + Wallet pass updated ≤30s]
    DD --> EE([Transaction Complete ✅])
```

---

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

---

## DIAGRAM 11 — DEPLOYMENT DIAGRAM (DOCKER COMPOSE)

```mermaid
graph TB
    subgraph "Host Machine"
        subgraph "docker-compose network: loyallia-net"
            NX[nginx<br/>:80 :443]
            API[api — Django<br/>:8000]
            WEB[web — Next.js<br/>:3000]
            CEL1[celery-worker<br/>pass_generation queue]
            CEL2[celery-worker<br/>push_delivery queue]
            CEL3[celery-worker<br/>default queue]
            BEAT[celery-beat<br/>scheduler]
            FLW[flower<br/>:5555]
            PG[postgres<br/>:5432]
            PGB[pgbouncer<br/>:6432]
            RD[redis<br/>:6379]
            MIO[minio<br/>:9000 :9001]
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

---

## DIAGRAM 12 — ENTITY RELATIONSHIP DIAGRAM (CORE TABLES)

```mermaid
erDiagram
    Tenant {
        uuid id PK
        string name
        string slug
        string plan
        datetime trial_end
        bool is_active
        string stripe_customer_id
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
        string stripe_subscription_id
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
