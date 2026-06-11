# Wallet Pass Studio — Documentation Index

> **ISO/IEC/IEEE 29148:2018 Compliant Software Requirements Specification**

| Field | Value |
|-------|-------|
| **Document ID** | SRS-LOY-WPS-001 |
| **Version** | 1.0.0-Draft |
| **Branch** | PASS-DESIGNER |
| **Date** | 2026-06-03 |
| **Status** | Draft — Pending Approval |
| **Scope** | Complete redesign of Wallet Pass creation UX |

---

## Document Structure

| File | Description | Status |
|------|-------------|--------|
| [SRS-001-Requirements.md](./SRS-001-Requirements.md) | Introduction, research findings, current state analysis, 10 critical issues | ✅ Complete |
| [SRS-002-Architecture.md](./SRS-002-Architecture.md) | Proposed architecture, component hierarchy, unified state model, data flow | ✅ Complete |
| [SRS-003-UI-Specifications.md](./SRS-003-UI-Specifications.md) | Screen mockups, canvas interactions, sidebar tabs, toolbar specifications | ✅ Complete |
| [SRS-004-Appendices.md](./SRS-004-Appendices.md) | **Complete Apple PassKit & Google Wallet technical reference** | ✅ Complete |
| [SRS-005-User-Journeys.md](./SRS-005-User-Journeys.md) | **23 complete user journeys** — every possible path through the system | ✅ Complete |
| [SRS-006-Card-Type-Visual-Customization.md](./SRS-006-Card-Type-Visual-Customization.md) | **All 10 card types** — customizable icons, badges, stamps, decorative elements per type | ✅ Complete |
| [SRS-007-AI-Integration.md](./SRS-007-AI-Integration.md) | **Groq integration** — architecture, prompts, backend/frontend code, security, rate limiting | ✅ Complete |

---

## Quick Navigation

### For Product Owners
→ Start with [SRS-001-Requirements.md](./SRS-001-Requirements.md) for scope and current issues  
→ Review [SRS-005-User-Journeys.md](./SRS-005-User-Journeys.md) for all user flows

### For UX Designers
→ See [SRS-003-UI-Specifications.md](./SRS-003-UI-Specifications.md) for screen mockups  
→ See [SRS-006-Card-Type-Visual-Customization.md](./SRS-006-Card-Type-Visual-Customization.md) for card-type-specific visual elements

### For Engineers
→ Review [SRS-002-Architecture.md](./SRS-002-Architecture.md) for state model and component architecture  
→ Review [SRS-007-AI-Integration.md](./SRS-007-AI-Integration.md) for complete AI integration spec  
→ Reference [SRS-004-Appendices.md](./SRS-004-Appendices.md) for ALL Apple/Google platform specifics

### For Platform Specialists
→ Study [SRS-004 Appendix A](./SRS-004-Appendices.md#appendix-a-apple-passkit-complete-reference) for Apple PassKit  
→ Study [SRS-004 Appendix B](./SRS-004-Appendices.md#appendix-b-google-wallet-complete-reference) for Google Wallet  
→ Study [SRS-004 Appendix C](./SRS-004-Appendices.md#appendix-c-unified-platform-mapping) for cross-platform mapping

---

## Executive Summary

The **Wallet Pass Studio** is a state-of-the-art visual design environment for creating Apple Wallet (PKPass) and Google Wallet passes within Loyallia. It replaces the current `WalletDesigner` accordion-based component with a **canvas-based, Canva/Illustrator-like experience** designed for non-technical small business owners.

### Key Innovations

1. **Canvas-Based Design** — Drag, drop, resize elements directly on the pass preview
2. **Dual-Platform Simultaneous Preview** — Design once, see both Apple and Google
3. **AI Assistant (✨ Diseñar con IA)** — Generate complete designs from business descriptions via Groq
4. **20+ Industry Templates** — Café, Retail, Gym, Salon, Hotel, and more
5. **Smart Defaults** — Every card type starts with a complete, usable design
6. **Design Quality Score** — Real-time WCAG contrast checks and validation
7. **Auto Image Generation** — Upload once, auto-generate @2x/@3x variants for Apple
8. **Card-Type Visual Elements** — Custom stamps, tier badges, gift graphics, VIP crowns per card type
9. **Custom Stamp Icons** — 50+ flat icons or upload custom images for stamp cards

### Platform Knowledge Base

Our documentation now contains **comprehensive knowledge** scraped and compiled from:

- **Apple Developer Documentation** (`developer.apple.com/documentation/walletpasses`)
  - PassKit Programming Guide (archive)
  - WWDC24 "What's New in Wallet and Apple Pay"
  - iOS 18 Poster Event Tickets specification
  - All 5 pass styles with visual signatures, field limits, image dimensions
  - Semantic tags, NFC requirements, Apple Watch layout
  
- **Google Developer Documentation** (`developers.google.com/wallet`)
  - Google Wallet Web Codelab (complete walkthrough)
  - Pass customization guide (`cardTemplateOverride`, row structures)
  - Generic pass deep dive
  - JWT signing flow for "Add to Google Wallet"
  - Smart Tap / NFC configuration
  - Class/Object architecture and REST API

### AI Integration

- **API:** Groq (OpenAI-compatible) via `https://api.groq.com/openai/v1`
- **API Key:** Stored securely in HashiCorp Vault (`kimi_api_key`)
- **Backend Proxy:** All AI calls go through Django (key never exposed to frontend)
- **Features:** Magic Template, Smart Color, Design Critique, Stamp Icon Suggestions, Auto-Layout
- **Rate Limiting:** Per-user hourly limits, daily budget caps, cost tracking

### Card-Type Customizable Visual Elements

| Card Type | Custom Decorative Elements |
|-----------|---------------------------|
| **stamp** | Stamp shapes, stamp icons (50+), progress grid, stamp colors, grid layout |
| **cashback** | Points coin icon, tier badge, progress ring, tier color coding |
| **coupon** | Scissors cut line, discount badge, offer tag, expiration countdown |
| **affiliate** | Referral chain icon, ambassador badge, friend counter, earnings display |
| **discount** | Tier indicator ring, percentage display, sale burst, spending threshold bar |
| **gift_certificate** | Gift box/ribbon graphic, denomination badge, decorative corners, occasion theme |
| **vip_membership** | Crown/star tier icon, member badge, exclusive seal, benefits list icons |
| **corporate_discount** | Building/company icon, employee badge frame, department badge, security seal |
| **referral_pass** | Referral/friend icons, gift/reward icon, progress to reward, success celebration |
| **multipass** | Ticket icon, bundle count display, used/remaining indicator, expiration countdown |

### Target Users

Small business owners (cafés, retail stores, gyms, salons) with **no design or technical expertise**. The interface must be as simple as Canva but as powerful as a professional design tool.

---

## Approval Status

> ⚠️ **NO CODING WILL BEGIN UNTIL ALL DESIGNS AND BEHAVIORS ARE APPROVED.**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Tech Lead | | | |
| UX Designer | | | |
| QA Lead | | | |

---

## External References

| Resource | URL | Content |
|----------|-----|---------|
| Apple PassKit Docs | https://developer.apple.com/documentation/walletpasses | Official Apple documentation |
| PassKit Guide (Archive) | https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/ | Legacy but complete guide |
| WWDC24 Wallet | https://developer.apple.com/videos/play/wwdc2024/10108/ | iOS 18 new features |
| Google Wallet API | https://developers.google.com/wallet | Official Google documentation |
| Google Wallet Codelab | https://codelabs.developers.google.com/add-to-wallet-web | Web integration tutorial |
| Google Pass Customization | https://developers.google.com/wallet/retail/loyalty-cards/use-cases/pass-customization | Layout customization guide |
| Groq API | https://api.groq.com/openai/v1 | AI design assistant backend |

---

*End of Index*
