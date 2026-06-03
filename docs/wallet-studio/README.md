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

| File | Description |
|------|-------------|
| [SRS-001-Requirements.md](./SRS-001-Requirements.md) | Introduction, research findings, current state analysis, critical issues |
| [SRS-002-Architecture.md](./SRS-002-Architecture.md) | Proposed architecture, component hierarchy, unified state model, data flow |
| [SRS-003-UI-Specifications.md](./SRS-003-UI-Specifications.md) | Screen mockups, canvas interactions, sidebar tabs, toolbar specifications |
| [SRS-004-Templates.md](./SRS-004-Templates.md) | Template library design, 20+ built-in templates, application flow |
| [SRS-005-AI-Features.md](./SRS-005-AI-Features.md) | AI-assisted design features, Magic Template, Smart Color, Auto-Layout |
| [SRS-006-Implementation.md](./SRS-006-Implementation.md) | Implementation phases (8 weeks), risk analysis, deliverables |
| [Appendix-A-Apple-PassKit.md](./Appendix-A-Apple-PassKit.md) | Apple PassKit field reference, pass styles, field limits |
| [Appendix-B-Google-Wallet.md](./Appendix-B-Google-Wallet.md) | Google Wallet API reference, field paths, row types |
| [Appendix-C-Image-Reference.md](./Appendix-C-Image-Reference.md) | Image dimensions quick reference for both platforms |
| [Appendix-D-Competitor-Analysis.md](./Appendix-D-Competitor-Analysis.md) | PassKit, PassSource, Passcreator analysis & differentiators |

---

## Quick Navigation

### For Product Owners
→ Start with [SRS-001-Requirements.md](./SRS-001-Requirements.md) for scope and current issues

### For UX Designers
→ See [SRS-003-UI-Specifications.md](./SRS-003-UI-Specifications.md) for complete screen mockups

### For Engineers
→ Review [SRS-002-Architecture.md](./SRS-002-Architecture.md) for state model and component architecture

### For QA
→ Check [SRS-006-Implementation.md](./SRS-006-Implementation.md) for acceptance criteria and risk analysis

---

## Executive Summary

The **Wallet Pass Studio** is a state-of-the-art visual design environment for creating Apple Wallet (PKPass) and Google Wallet passes within Loyallia. It replaces the current `WalletDesigner` accordion-based component with a **canvas-based, Canva/Illustrator-like experience** designed for non-technical small business owners.

### Key Innovations

1. **Canvas-Based Design** — Drag, drop, resize elements directly on the pass preview
2. **Dual-Platform Simultaneous Preview** — Design once, see both Apple and Google
3. **AI Assistant (✨ Diseñar con IA)** — Generate complete designs from business descriptions
4. **20+ Industry Templates** — Café, Retail, Gym, Salon, Hotel, and more
5. **Smart Defaults** — Every card type starts with a complete, usable design
6. **Design Quality Score** — Real-time WCAG contrast checks and validation
7. **Auto Image Generation** — Upload once, auto-generate @2x/@3x variants

### Target Users

Small business owners (cafés, retail stores, gyms, salons) with **no design or technical expertise**. The interface must be as simple as Canva but as powerful as a professional design tool.

---

## Approval Status

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Tech Lead | | | |
| UX Designer | | | |
| QA Lead | | | |

---

*End of Index*
