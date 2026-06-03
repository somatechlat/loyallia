# ISMS Scope Statement

## Information Security Management System (ISMS) — Loyallia

---

## Document Control

| Field | Details |
|-------|---------|
| **Document ID** | LOY-ISMS-001 |
| **Title** | ISMS Scope Statement |
| **Version** | 1.0 |
| **Date** | 2026-06-03 |
| **Author** | Information Security Officer |
| **Approver** | Chief Executive Officer |
| **Classification** | Internal Use |
| **Review Cycle** | Annually or upon significant organizational change |
| **Status** | Approved |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-06-03 | Information Security Officer | Initial release |

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Organization and Its Context](#2-organization-and-its-context)
3. [Internal and External Issues Relevant to ISMS](#3-internal-and-external-issues-relevant-to-isms)
4. [Needs and Expectations of Interested Parties](#4-needs-and-expectations-of-interested-parties)
5. [Scope Boundaries](#5-scope-boundaries)
   - 5.1 [Inclusions](#51-inclusions)
   - 5.2 [Exclusions](#52-exclusions)
6. [Technologies, Processes, and Locations in Scope](#6-technologies-processes-and-locations-in-scope)
   - 6.1 [Technologies](#61-technologies)
   - 6.2 [Processes](#62-processes)
   - 6.3 [Locations](#63-locations)
7. [Interfaces and Dependencies with Other Organizations](#7-interfaces-and-dependencies-with-other-organizations)
8. [Applicable Controls Reference](#8-applicable-controls-reference)
9. [Approval](#9-approval)

---

## 1. Purpose

This document defines the scope and boundaries of the Information Security Management System (ISMS) for **Loyallia**, in accordance with ISO/IEC 27001:2022, Clause 4.3. The ISMS scope statement establishes the foundation for identifying risks, implementing controls, and ensuring the confidentiality, integrity, and availability of information assets across all business operations, technology platforms, and stakeholder interactions.

Loyallia operates as a Software-as-a-Service (SaaS) loyalty and rewards platform serving small and medium-sized businesses (SMBs) in Ecuador, providing digital customer engagement, transaction processing, and mobile wallet integration services.

---

## 2. Organization and Its Context

### 2.1 Organizational Overview

Loyallia is a technology company headquartered in Ecuador that delivers a cloud-native loyalty platform enabling SMBs to design, deploy, and manage customer loyalty programs. The platform supports multi-tenant architecture, allowing multiple business clients (tenants) to operate isolated loyalty environments under a shared infrastructure.

**Primary Business Activities:**
- Development, deployment, and maintenance of the Loyallia SaaS platform
- Customer enrollment and identity management for end consumers
- Transaction processing and reward allocation
- Digital wallet pass issuance and management (Apple Wallet, Google Wallet)
- Multi-channel customer notification services (email, SMS, push, WhatsApp)
- Payment processing integration and reconciliation
- Business intelligence and analytics for tenant organizations

### 2.2 Strategic Context

The organization operates in a regulated environment where protection of personal data, payment card information, and customer transactional data is critical. Loyallia's competitive position depends on maintaining trust with both business tenants and their end customers, requiring robust information security governance and operational practices.

**Regulatory and Legal Context:**
- Ecuadorian data protection regulations (Ley Orgánica de Protección de Datos Personales)
- Payment Card Industry Data Security Standard (PCI DSS) requirements for payment data handling
- International data transfer considerations for cloud-hosted services
- Industry-specific requirements for financial and consumer data processing

---

## 3. Internal and External Issues Relevant to ISMS

### 3.1 Internal Issues

| Issue | Description | ISMS Relevance |
|-------|-------------|----------------|
| **Multi-tenancy architecture** | Shared infrastructure serving multiple independent business clients | Requires strict tenant isolation, access controls, and data segregation (A.5.15, A.8.5) |
| **Rapid feature development** | Agile development cycles with frequent deployments | Necessitates secure SDLC practices, automated testing, and change management (A.8.8, A.8.25, A.8.28) |
| **Remote development team** | Distributed workforce accessing source code and infrastructure | Requires secure remote access, endpoint protection, and identity verification (A.5.18, A.6.7, A.8.1) |
| **Key personnel dependency** | Concentration of security and infrastructure knowledge in limited roles | Demands knowledge documentation, cross-training, and succession planning (A.6.4, A.6.5) |
| **Technology stack complexity** | Heterogeneous environment with multiple databases, caches, and services | Requires comprehensive asset management and vulnerability management (A.5.9, A.8.8) |
| **Customer data volume** | Large and growing repositories of personal and transactional data | Demands data classification, encryption, and lifecycle management (A.5.12, A.8.1, A.8.24) |

### 3.2 External Issues

| Issue | Description | ISMS Relevance |
|-------|-------------|----------------|
| **Evolving threat landscape** | Increasing sophistication of cyber attacks targeting SaaS platforms | Requires continuous threat monitoring, incident response capability, and security awareness (A.5.24, A.5.25, A.5.29, A.8.15) |
| **Third-party dependencies** | Reliance on external service providers for critical functions (payments, communications, cloud infrastructure) | Demands vendor risk management, contractual security requirements, and monitoring (A.5.19, A.5.20, A.5.21) |
| **Regulatory evolution** | Changing data protection and financial regulations in Ecuador and target markets | Requires regulatory monitoring, compliance assessments, and policy updates (A.5.31, A.5.36) |
| **Customer security expectations** | Business tenants and consumers expect enterprise-grade security | Necessitates transparency, security certifications, and contractual commitments (A.5.32, A.5.33) |
| **Payment industry requirements** | Compliance with PCI DSS and payment processor security mandates | Demands specialized controls for cardholder data environment (A.8.5, A.8.24) |
| **Cloud provider security model** | Shared responsibility model for cloud-hosted infrastructure | Requires clear delineation of security responsibilities and monitoring (A.5.19, A.8.5) |

---

## 4. Needs and Expectations of Interested Parties

### 4.1 Interested Parties Analysis

| Interested Party | Needs and Expectations | Relevant ISMS Considerations |
|------------------|------------------------|------------------------------|
| **Business Owners** | Secure platform for customer data; business continuity; competitive advantage through trusted brand; compliance with regulations | Availability, integrity, confidentiality of tenant data; service level agreements (A.5.29, A.5.30, A.8.13) |
| **Business Managers** | Reliable access to analytics; secure user management; protection of customer lists and transaction histories | Access control, data segregation, audit logging (A.5.15, A.5.18, A.8.15) |
| **Business Staff** | Easy-to-use, secure tools; clear data handling procedures; protection against fraud | User training, secure configurations, fraud detection (A.6.3, A.8.1) |
| **End Customers** | Protection of personal data; secure transactions; privacy rights; transparent data usage | Privacy by design, consent management, data subject rights, encryption (A.5.33, A.5.34, A.8.1, A.8.24) |
| **Super Administrators** | Comprehensive security oversight; incident visibility; governance tools | Monitoring, reporting, privileged access management (A.5.18, A.5.24, A.8.15) |
| **Development Team** | Secure development environment; clear security requirements; vulnerability management tools | Secure SDLC, code review, dependency scanning (A.5.8, A.8.25, A.8.28) |
| **Operations Team** | Infrastructure monitoring; automated alerting; disaster recovery capabilities | System monitoring, backup, recovery procedures (A.8.9, A.8.13, A.8.14) |
| **Payment Processors** | PCI DSS compliance; secure API integrations; fraud prevention | Network segmentation, encryption, access logs (A.8.5, A.8.20, A.8.24) |
| **Regulatory Bodies** | Compliance with data protection laws; incident reporting; audit cooperation | Legal compliance, documentation, audit trails (A.5.31, A.5.36) |
| **Shareholders/Investors** | Risk management; business resilience; reputation protection | Governance, business continuity, risk treatment (A.5.1, A.5.29, A.5.30) |

---

## 5. Scope Boundaries

### 5.1 Inclusions

The ISMS covers all activities, processes, technologies, and personnel involved in the development, operation, and support of the Loyallia SaaS platform, including:

1. **Platform Development and Maintenance**
   - Source code development, testing, and deployment
   - Version control and configuration management
   - Security patching and vulnerability remediation

2. **Infrastructure and Operations**
   - Production, staging, and development environments
   - Container orchestration and runtime security
   - Database administration and data storage
   - Network security and traffic management
   - Backup, recovery, and disaster recovery operations

3. **Data Protection and Privacy**
   - Collection, processing, storage, and deletion of personal data
   - Customer enrollment data and profile management
   - Transaction and payment data handling
   - Digital wallet pass data and credentials
   - Analytics and reporting data

4. **Identity and Access Management**
   - Tenant administration and user provisioning
   - Authentication and authorization mechanisms
   - Privileged access management for infrastructure
   - Customer identity verification processes

5. **Third-Party Integration Management**
   - Integration with payment processors
   - Communication service providers (email, SMS, push, WhatsApp)
   - Digital wallet platforms (Apple, Google)
   - Cloud infrastructure and hosting providers

6. **Security Governance and Management**
   - Information security policies, procedures, and standards
   - Risk assessment and treatment activities
   - Security awareness and training programs
   - Incident detection, response, and recovery
   - Internal audits and management reviews

### 5.2 Exclusions

The following are explicitly excluded from the ISMS scope:

1. **End-User Devices**
   - Personal computers, mobile devices, and tablets belonging to business staff or end customers used to access the platform. Security of these devices remains the responsibility of the respective owners.

2. **Tenant Business Processes**
   - Business processes and physical security measures implemented by Loyallia's tenants at their physical locations (e.g., in-store procedures, staff training, physical access controls).

3. **Third-Party Provider Infrastructure**
   - The underlying physical infrastructure of cloud and SaaS providers (e.g., data center physical security, hypervisor-level controls) managed entirely by the respective providers under their own certifications and security programs. Loyallia's responsibility is limited to secure configuration and use of provided services.

4. **Non-Platform Corporate Functions**
   - Administrative functions not directly related to the platform, such as general accounting, HR systems (unless processing platform-related personnel data), and facilities management, unless they impact information security of the in-scope assets.

5. **Development of Unrelated Products**
   - Any software development or technology services not part of the Loyallia loyalty platform offering.

---

## 6. Technologies, Processes, and Locations in Scope

### 6.1 Technologies

| Category | Technologies in Scope |
|----------|----------------------|
| **Backend Application** | Django (Python), REST API layer, background task processors |
| **Frontend Application** | Next.js (React), web dashboard interfaces |
| **Database Systems** | PostgreSQL (primary relational database), Redis (caching and session store) |
| **Object Storage** | MinIO (S3-compatible object storage for files, images, wallet assets) |
| **Secrets Management** | HashiCorp Vault (credential storage, encryption key management) |
| **Containerization** | Docker, Docker Compose |
| **Infrastructure** | Cloud-hosted virtual machines, load balancers, network security groups |
| **Reverse Proxy / Gateway** | Nginx or equivalent (traffic routing, TLS termination) |
| **Monitoring & Logging** | Application logs, infrastructure monitoring, security event logging |
| **Development Tools** | Git version control, CI/CD pipelines, dependency management tools |
| **Communication APIs** | Mailjet API, Twilio API, WhatsApp Bridge service, Apple Push Notification Service (APNS), Firebase Cloud Messaging (FCM) |
| **Payment APIs** | Stripe API and related payment processing integrations |
| **Wallet Platforms** | Apple Wallet (PKPass generation, NFC), Google Wallet API |

### 6.2 Processes

| Process Category | Processes in Scope |
|------------------|-------------------|
| **Customer Enrollment** | Registration, identity verification, profile creation, consent management |
| **Transaction Processing** | Point accumulation, redemption, balance updates, transaction logging |
| **Reward Management** | Campaign creation, reward allocation, tier management, expiration handling |
| **Wallet Pass Lifecycle** | Pass generation, distribution, updates, revocation, NFC enablement |
| **Notification Delivery** | Email campaigns, SMS alerts, push notifications, WhatsApp messaging |
| **Payment Processing** | Payment collection, reconciliation, refund handling, PCI DSS scope management |
| **Tenant Onboarding** | Account provisioning, configuration, data segregation setup |
| **User Access Management** | Authentication, authorization, password management, multi-factor authentication |
| **Data Management** | Backup, archival, retention, secure deletion, data subject request handling |
| **Security Operations** | Vulnerability management, patch management, security monitoring, incident response |
| **Change Management** | Software releases, infrastructure changes, configuration updates |
| **Business Continuity** | Disaster recovery execution, failover procedures, data restoration |

### 6.3 Locations

| Location Type | Description | Scope Relevance |
|---------------|-------------|-----------------|
| **Cloud Hosting Environment** | Primary production environment hosted on cloud infrastructure (Ecuador-based or regional cloud provider) | All production data processing and storage |
| **Disaster Recovery Site** | Secondary environment for backup restoration and failover operations | Business continuity and recovery operations |
| **Development and Staging Environments** | Non-production environments for testing and development | Secure development lifecycle, pre-production validation |
| **Remote Workforce Locations** | Home offices and co-working spaces of development and operations personnel | Secure remote access, endpoint security |
| **Administrative Offices** | Physical office locations used for business administration (if applicable) | Physical security of equipment and access controls |

---

## 7. Interfaces and Dependencies with Other Organizations

### 7.1 Critical External Dependencies

| Organization / Service | Interface Description | Dependency Type | Security Responsibility |
|------------------------|----------------------|-----------------|------------------------|
| **Cloud Infrastructure Provider** | Hosting of virtual machines, networking, and storage resources | Critical operational dependency | Provider: physical and hypervisor security. Loyallia: guest OS, application, and data security |
| **Stripe** | Payment processing, card tokenization, transaction handling | Critical business dependency | Stripe: PCI DSS compliance for cardholder data environment. Loyallia: secure API integration, token handling, no storage of raw card data |
| **Mailjet** | Transactional and marketing email delivery | Operational dependency | Mailjet: email infrastructure security. Loyallia: secure API usage, recipient data protection, unsubscribe management |
| **Twilio** | SMS messaging and voice communications | Operational dependency | Twilio: messaging infrastructure security. Loyallia: secure API integration, phone number data protection |
| **Apple Inc.** | Apple Wallet pass generation, distribution, and NFC services | Product feature dependency | Apple: wallet platform security, device security. Loyallia: secure certificate management, pass data accuracy |
| **Google LLC** | Google Wallet API integration, push notification services | Product feature dependency | Google: wallet platform security, FCM infrastructure. Loyallia: secure API integration, credential management |
| **WhatsApp Bridge Service** | WhatsApp Business API messaging integration | Communication channel dependency | Provider: messaging infrastructure. Loyallia: secure webhook configuration, message content protection |
| **Certificate Authorities** | TLS/SSL certificate issuance for domains and wallet passes | Security dependency | CA: certificate integrity and validation. Loyallia: secure key generation, certificate lifecycle management |
| **DNS Provider** | Domain name resolution and management | Infrastructure dependency | Provider: DNS infrastructure security. Loyallia: secure account management, DNS record integrity |

### 7.2 Interface Management

All interfaces with external organizations are governed by:
- **Formal contracts** including information security requirements and service level agreements
- **Regular vendor risk assessments** to evaluate security posture and compliance
- **Monitoring of third-party security incidents** and notification procedures
- **Defined escalation paths** for security-related incidents or breaches
- **Annual review** of security requirements against evolving threats and standards

---

## 8. Applicable Controls Reference

The following ISO/IEC 27001:2022 Annex A control categories are applicable within the defined scope:

| Control Category | Applicability to ISMS Scope |
|------------------|----------------------------|
| **A.5 Organizational Controls** | Fully applicable — governance, risk management, policies, and organizational security structures |
| **A.6 People Controls** | Fully applicable — screening, terms of employment, awareness training, and termination procedures for all personnel with access to in-scope assets |
| **A.7 Physical Controls** | Partially applicable — physical security of cloud infrastructure is provider-managed; physical security of any company offices and endpoint devices used by personnel |
| **A.8 Technological Controls** | Fully applicable — all technical controls for information systems, networks, applications, and data protection within the scope |

### Key Applicable Controls (Selected)

| Control | Title | Relevance |
|---------|-------|-----------|
| A.5.1 | Policies for information security | Governance framework for the ISMS |
| A.5.7 | Threat intelligence | Monitoring external threats to SaaS platforms |
| A.5.9 | Inventory of information and other associated assets | Asset management for all platform components |
| A.5.15 | Access control | Multi-tenant access segregation |
| A.5.18 | Access rights | Provisioning and review of user permissions |
| A.5.19 | Information security in supplier relationships | Third-party vendor management |
| A.5.24 | Planning and preparation for information security continuity | Business continuity and disaster recovery |
| A.5.31 | Legal, statutory, regulatory and contractual requirements | Compliance with Ecuadorian and international regulations |
| A.5.33 | Protection of records | Audit logs and evidence preservation |
| A.5.36 | Compliance with policies, rules and standards for information security | Internal compliance monitoring |
| A.5.37 | Documented operating procedures | Standardized operational processes |
| A.6.3 | Information security awareness, education and training | Security training for all personnel |
| A.6.4 | Disciplinary process | Enforcement of security policies |
| A.6.5 | Responsibilities after termination or change of employment | Access revocation procedures |
| A.8.1 | User endpoint devices | Security of devices accessing platform |
| A.8.5 | Secure authentication | Multi-factor authentication and password policies |
| A.8.8 | Management of technical vulnerabilities | Vulnerability scanning and remediation |
| A.8.9 | Configuration management | Secure baseline configurations |
| A.8.13 | Information backup | Backup and recovery procedures |
| A.8.14 | Redundancy of information processing facilities | High availability and failover |
| A.8.15 | Logging | Security event and audit logging |
| A.8.16 | Monitoring activities | Security monitoring and alerting |
| A.8.20 | Networks security | Network segmentation and traffic protection |
| A.8.24 | Use of cryptography | Encryption of data at rest and in transit |
| A.8.25 | Secure development life cycle | Secure software development practices |
| A.8.28 | Secure coding | Code review and secure programming standards |
| A.8.29 | Security testing in development and acceptance | Penetration testing and security validation |
| A.8.30 | Outsourced development | Management of any external development |

---

## 9. Approval

This ISMS Scope Statement has been reviewed and approved by the following authorized personnel:

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Author** | Information Security Officer | _________________________ | 2026-06-03 |
| **Approver** | Chief Executive Officer | _________________________ | 2026-06-03 |

---

## Related Documents

| Document ID | Document Title | Relationship |
|-------------|---------------|--------------|
| LOY-ISMS-002 | Information Security Policy | Governing policy for the ISMS |
| LOY-ISMS-003 | Risk Assessment Procedure | Risk identification and treatment within scope |
| LOY-ISMS-004 | Statement of Applicability | Detailed control applicability and justification |
| LOY-ISMS-005 | Asset Inventory | Inventory of information assets within scope |

---

*End of Document*
