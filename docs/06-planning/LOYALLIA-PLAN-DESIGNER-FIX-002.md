---
title: "Loyallia — Wallet Designer UI/UX Full Audit + Fix Plan"
document_id: "LOYALLIA-PLAN-DESIGNER-FIX-002"
version: "1.0"
status: "draft"
last_updated: "2026-09-12"
author: "Engineering Team"
owner: "Engineering Team"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Loyallia engineering team only"
review_cycle: "On completion"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "LOYALLIA-SRS-MASTER-001"
---

## DOCUMENT CONTROL

| Field | Value |
|---|---|
| Document ID | LOYALLIA-PLAN-DESIGNER-FIX-002 |
| Title | Wallet Designer UI/UX Full Audit + Fix Plan |
| Version | 1.0 |
| Date | 2026-09-12 |
| Author | Engineering Team |
| Approver | Product Owner |
| Owner | Engineering Team |
| Classification | Internal Use |
| Confidentiality | Loyallia engineering team only |
| Status | draft |
| Standard | ISO 27001:2022, ISO 9001:2015 |
| Parent Document | LOYALLIA-SRS-MASTER-001 |
| Supersedes | N/A |
| Language | English |
| Format | .md |
| Location | docs/06-planning/LOYALLIA-PLAN-DESIGNER-FIX-002.md |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-12 | Engineering Team | Initial draft — full designer audit |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Product Owner | Approver | Review and approve |
| Engineering Team | Implementer | Execute the plan |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-PLAN-HARDENING-001 | System Hardening Plan | Related — icon preview fix |
| LOYALLIA-SRS-BOOMERANG-001 | Feature Parity SRS | Reference — competitive features |
| LOYALLIA-DOC-WALLET-DESIGNER-INVENTORY-001 | Wallet Designer Feature Inventory | Reference — designer feature audit |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections increment the minor version (e.g., 1.0 → 1.1).
5. Major changes increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-23 | Approved |
| Product Owner | — | — | 2026-09-23 | Approved |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-12 | Engineering Team | initial authoring |
| Reviewed | 2026-09-23 | Engineering Lead | ISO document-control completeness applied |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2027-09-23 | Annual ISO document-control review |
| Plan completion | — | Triggered upon plan completion |

---

## 1. AUDIT FINDINGS

### 1.1 Root Cause: Icon Rendering Mismatch

**All 9 preview decoration components** use `<img src={iconId}>` but icon IDs are symbolic strings (e.g., `"coffee"`, `"star"`), NOT URLs. The `getIconById()` function returns an `IconDefinition` with `svgPath` or `lucideName` — never a URL.

**How StampGrid.tsx does it correctly (line 87-96):**
```tsx
const icon = getIconById(iconId);
if (!icon || !icon.svgPath) return null;
return <svg viewBox="0 0 24 24"><path d={icon.svgPath} /></svg>;
```

**How preview-decorations.tsx does it WRONG (line 86-87):**
```tsx
const iconUrl = filled ? stampFilledIcon : stampIcon;
return <img src={iconUrl} ... />;  // iconUrl is "coffee", not a URL!
```

**Fix:** Create shared `IconRenderer` component. Replace all `<img src={iconId}>` with `<IconRenderer iconId={id} />`.

### 1.2 Full Property Audit by Card Type

#### Stamp Card

| Property | Stored in Config | Passed to Preview | Rendered Correctly | Issue |
|---|---|---|---|---|
| stampShape | YES | YES | YES | SVG paths in SHAPE_PATHS |
| stampColor | YES | YES | YES | Applied to fill/border |
| stampGridLayout | YES | YES | YES | getGridLayout() handles all 5 |
| stampIcon | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| stampFilledIcon | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| stampsRequired | YES | YES | YES | Grid length |
| stampsAtIssue | YES | YES | YES | Filled count |

#### Cashback Card

| Property | Stored | Passed | Rendered | Issue |
|---|---|---|---|---|
| cashbackPercentage | YES | YES | YES | Text display |
| tierName | YES | YES | YES | Text display |
| coinIcon | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| tierBadge | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| progressRingColor | YES | YES | YES | Applied to bar |

#### Coupon Card

| Property | Stored | Passed | Rendered | Issue |
|---|---|---|---|---|
| discountValue | YES | YES | YES | Text display |
| discountType | YES | YES | YES | Percentage vs fixed |
| cutLineStyle | YES | YES | YES | SVG zigzag/dashed |
| discountBadgeStyle | YES | YES | YES | CSS classes |
| offerTag | YES | YES | YES | Text display |

#### VIP Membership Card

| Property | Stored | Passed | Rendered | Issue |
|---|---|---|---|---|
| membershipName | YES | YES | YES | Text display |
| crownIcon | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| memberBadgeStyle | YES | YES | YES | Color mapping |
| benefitsListIcons | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| perks | YES | YES | YES | resolvePerkLabel() |

#### Gift Certificate Card

| Property | Stored | Passed | Rendered | Issue |
|---|---|---|---|---|
| denominations | YES | YES | YES | Text display |
| boxGraphic | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| ribbonColor | YES | YES | YES | Applied to accent |
| denominationBadge | YES | YES | YES | Text display |

#### Discount Card

| Property | Stored | Passed | Rendered | Issue |
|---|---|---|---|---|
| tiers | YES | YES | YES | Text display |
| tierBadgeIcons | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| progressBarColor | YES | YES | YES | Applied to bar |
| discountBannerText | YES | YES | YES | Text display |
| percentageDisplayStyle | YES | YES | YES | CSS classes |

#### Affiliate Card

| Property | Stored | Passed | Rendered | Issue |
|---|---|---|---|---|
| affiliateCodePattern | YES | YES | YES | Text display |
| referralChainIcon | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| ambassadorBadge | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| badgeColor | YES | YES | YES | Applied to accent |
| referralBannerText | YES | YES | YES | Text display |
| partnerLogoUrl | YES | YES | YES | `<img src={url}>` — URL, correct |

#### Corporate Discount Card

| Property | Stored | Passed | Rendered | Issue |
|---|---|---|---|---|
| companyName | YES | YES | YES | Text display |
| buildingIcon | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| departmentBadge | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| badgeStyle | YES | YES | YES | CSS classes |
| idBadgeColor | YES | YES | YES | Applied to accent |
| securitySeal | YES | YES | YES | SVG shield |
| companyLogoUrl | YES | YES | YES | `<img src={url}>` — URL, correct |

#### Referral Card

| Property | Stored | Passed | Rendered | Issue |
|---|---|---|---|---|
| referralCodePattern | YES | YES | YES | Text display |
| referralIcon | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| shareButtonColor | YES | YES | YES | Applied to bar |
| rewardBadgeIcon | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| friendAvatarPlaceholder | YES | YES | **NO** | `<img src={id}>` — needs SVG |

#### Multipass Card

| Property | Stored | Passed | Rendered | Issue |
|---|---|---|---|---|
| bundleSize | YES | YES | YES | Numeric display |
| ticketGraphic | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| punchIcon | YES | YES | **NO** | `<img src={id}>` — needs SVG |
| bundleBadgeStyle | YES | YES | YES | CSS classes |
| indicatorStyle | YES | YES | YES | visual vs numeric |

### 1.3 Summary: 16 Broken Icon Properties

All 16 icon properties across 9 card types have the same bug: `<img src={iconId}>` where `iconId` is a symbolic string, not a URL.

---

## 2. IMPLEMENTATION PLAN

### Step 1: Create Shared IconRenderer Component

**New file:** `frontend/src/components/wallet/IconRenderer.tsx`

```tsx
import { getIconById } from './icon-library';

interface IconRendererProps {
  iconId?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function IconRenderer({ iconId, className, style }: IconRendererProps) {
  if (!iconId) return null;
  const icon = getIconById(iconId);
  if (!icon) return null;

  if (icon.svgPath) {
    return (
      <svg className={className} style={style} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d={icon.svgPath} />
      </svg>
    );
  }

  if (icon.lucideName) {
    // Lucide icons are rendered as SVG paths — same approach
    return null; // Fallback: Lucide icons need dynamic import
  }

  return null;
}
```

### Step 2: Replace <img> with IconRenderer in preview-decorations.tsx

**File:** `frontend/src/components/wallet/preview-decorations.tsx`

Replace every instance of:
```tsx
{iconUrl ? <img src={iconUrl} alt="" className="..." /> : <default />}
```

With:
```tsx
{iconId ? <IconRenderer iconId={iconId} className="..." /> : <default />}
```

**Affected components (9 total):**
1. `StampGridDecoration` — stampIcon, stampFilledIcon
2. `CashbackDecoration` — coinIcon, tierBadge
3. `VIPMembershipDecoration` — crownIcon, benefitsListIcons
4. `GiftCertificateDecoration` — boxGraphic
5. `ReferralPassDecoration` — referralIcon, rewardBadgeIcon, friendAvatarPlaceholder
6. `DiscountDecoration` — tierBadgeIcons
7. `AffiliateDecoration` — referralChainIcon, ambassadorBadge
8. `CorporateDiscountDecoration` — buildingIcon, departmentBadge
9. `MultipassDecoration` — ticketGraphic, punchIcon

### Step 3: Update Preview Props (Already Done)

The `AppleWalletPreview.tsx` and `GoogleWalletPreview.tsx` already pass icon IDs from `cardTypeConfig` to the decoration components. No changes needed.

### Step 4: Handle URL-based Icons

Some icon properties accept URLs (not IDs):
- `partnerLogoUrl` (Affiliate)
- `companyLogoUrl` (Corporate)

These should remain as `<img src={url}>`. The `IconRenderer` should check: if the value starts with `http` or `/`, render as `<img>`. Otherwise, treat as icon ID.

**Updated IconRenderer:**
```tsx
export function IconRenderer({ iconId, className, style }: IconRendererProps) {
  if (!iconId) return null;

  // URL-based icons (uploaded images)
  if (iconId.startsWith('http') || iconId.startsWith('/') || iconId.startsWith('data:')) {
    return <img src={iconId} alt="" className={className} style={style} />;
  }

  // Icon library lookup
  const icon = getIconById(iconId);
  if (!icon?.svgPath) return null;

  return (
    <svg className={className} style={style} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2">
      <path d={icon.svgPath} />
    </svg>
  );
}
```

---

## 3. FILES TO MODIFY

| File | Change |
|---|---|
| `frontend/src/components/wallet/IconRenderer.tsx` | **NEW** — shared icon rendering component |
| `frontend/src/components/wallet/preview-decorations.tsx` | Replace all `<img src={iconId}>` with `<IconRenderer>` |
| `frontend/src/components/wallet/AppleWalletPreview.tsx` | No change (already passes icon IDs) |
| `frontend/src/components/wallet/GoogleWalletPreview.tsx` | No change (already passes icon IDs) |

---

## 4. VERIFICATION

| Check | Command | Expected |
|---|---|---|
| TypeScript | `npx tsc --noEmit --skipLibCheck` | 0 errors |
| Unit tests | `npm run test:unit` | 503+ pass |
| E2E Suite 42 | Playwright | 29+ pass |
| Manual | Select icon in studio, verify preview shows SVG icon | Icon visible |
| Manual | Upload image URL, verify preview shows image | Image visible |
