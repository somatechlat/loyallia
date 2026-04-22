# Software Requirements Specification (SRS): Comprehensive System User Journeys

## 1. Introduction
This document outlines **EVERY** core transactional and operational journey handled by the Loyallia Loyalty Platform APIs and User Interfaces. It serves as the authoritative behavior map for the Playwright E2E automated test suites. The platform enforces zero-trust RBAC validation and atomic database execution aligned with ISO/IEC 29148:2018 guidelines.

---

## 2. Super Admin Journeys (`SUPER_ADMIN`)
**Goal**: Administer global multi-tenant infrastructure.
*   **2.1 Global Governance Login**: SuperAdmin authenticates to the root `/admin` Next.js interface. Platform issues wildcard root JWT access.
*   **2.2 Tenant Provisioning**: SuperAdmin creates a new business tenant (`UUID`), generating the standard branch structures and isolated database schema rows.
*   **2.3 Plan Overrides & Subscriptions**: SuperAdmin views existing tenants and manually forces a "Pioneer Plan" active subscription status bypassing the payment gateway constraints.
*   **2.4 Global Monitoring**: SuperAdmin loads the root health dashboard to view global system limits and memory.

---

## 3. Owner Journeys (`OWNER`)
**Goal**: Manage global loyalty parameters, view tenant analytics, and configure underlying billing limits for a specific Tenant.
*   **3.1 Location Infrastructure Configuration**: Owner logs in. Navigates to `/locations`. Creates a new physical store location ("Branch North"). The map syncs the new branch.
*   **3.2 RBAC Staff Provisioning**: Owner navigates to `/team`. Invites a `STAFF` member and a `MANAGER`. The system dispatches secure invite links / generates default credentials.
*   **3.3 Loyalty Architecture Creation**: Owner navigates to `/programs`. Creates a new `STAMPS` program. Configures parameters (e.g. 6 stamps for free reward) and sets custom hex visual metadata (Background: `#F9A826`). Record materializes synchronously.
*   **3.4 Analytics Audit**: Owner loads `/analytics`. Modifies date ranges to verify that aggregated points metrics and transactions refresh dynamically.
*   **3.5 Billing Self-Service**: Owner navigates to `/billing`. Verifies active plan and invoice history rendering based on the simulated subscription hook.
*   **3.6 Automation Rules Engine**: Owner navigates to `/automation`. Sets a trigger: "Inactivity > 30 Days" -> Action: "Issue 1 point". 

---

## 4. Manager Journeys (`MANAGER`)
**Goal**: Execute marketing distributions and view daily operation lists.
*   **4.1 Notification Broadcasts**: Manager navigates to `/campaigns`. Formulates text "Happy Hour Today!" and targets `ALL_ACTIVE_PASSES`. Dispatches payload successfully to trigger the Celery tasks.
*   **4.2 Operations Auditing**: Manager views the transaction ledger to audit manual interventions by staff.

---

## 5. Staff Journeys (`STAFF`)
**Goal**: Add points, stamps, or process redemptions purely on mobile devices via Scanner PWA.
*   **5.1 Seamless Scanner Workflow**: Staff navigates to PWA (`/scanner/scan`). Authenticates. Grants camera access. Scans Customer QR payload `{ "pass_token": "qr_abc_123" }`. Backend decrypts and verifies the asset.
*   **5.2 Reward Fulfillment**: Staff views an eligible "Reward Available". Staff confirms redemption. Points decrement correctly and a `Transaction` log is minted immutably.
*   **5.3 Manual Overrides**: If the camera fails, Staff executes a fuzzy phone/email search in the Manual POS screen to issue points to the correct Customer Pass.

---

## 6. Customer Journeys (Consumers)
**Goal**: Self-enrollment and digital wallet provisioning.
*   **6.1 Zero-Friction Enrollment**: Customer accesses the unauthenticated public endpoint (`/enroll?tenant=xyz`). Completes dynamic form capturing Phone/Email.
*   **6.2 Wallet Provisioning**: The backend registers the user, provisions virtual points, signs an Apple `.pkpass` blob locally via PyOpenSSL, and successfully serves a `application/vnd.apple.pkpass` download trigger.

---

**End of Specification.**
