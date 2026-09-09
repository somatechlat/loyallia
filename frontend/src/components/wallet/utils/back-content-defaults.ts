/**
 * Default back-of-pass content per card type.
 *
 * SRS-008 Section 7 — Every pass should include terms, contact, and rules
 * by default. Users can edit or remove them.
 */

import type { BackField, BackLink, BackContent, LinkType } from '@/components/wallet/types/unified-state';
import type { CardType } from '@/components/wallet/types/unified-state';

function makeBackField(label: string, value: string, id?: string): BackField {
  return {
    id: id || `back-${crypto.randomUUID()}`,
    label,
    value,
    isLink: false,
    order: 0,
  };
}

function makeBackLink(type: LinkType, url: string, label: string): BackLink {
  return { id: `link-${crypto.randomUUID()}`, type, url, label };
}

const TERMS_LABEL = '';
const CONTACT_LABEL = '';
const RULES_LABEL = '';

const DEFAULT_TERMS = '';
const DEFAULT_CONTACT = '';
const DEFAULT_WEBSITE = '';

const CARD_TYPE_RULES: Record<CardType, string> = {
  stamp: '',
  cashback: '',
  coupon: '',
  affiliate: '',
  discount: '',
  gift_certificate: '',
  vip_membership: '',
  corporate_discount: '',
  referral_pass: '',
  multipass: '',
};

/**
 * Generate default back content for a given card type.
 * Returns terms, contact, rules, website link, and privacy link.
 */
export function getDefaultBackContent(cardType: CardType): BackContent {
  const rules = CARD_TYPE_RULES[cardType] || CARD_TYPE_RULES.stamp;

  return {
    fields: [
      makeBackField(RULES_LABEL, rules, `back-rules-${cardType}`),
      makeBackField(TERMS_LABEL, DEFAULT_TERMS, `back-terms-${cardType}`),
      makeBackField(CONTACT_LABEL, DEFAULT_CONTACT, `back-contact-${cardType}`),
    ],
    links: [
      makeBackLink('website', DEFAULT_WEBSITE, ''),
      makeBackLink('email', `mailto:${DEFAULT_CONTACT}`, ''),
    ],
    detailImages: [],
  };
}

/**
 * Check if back content appears to be empty or default-only.
 * Used to decide whether to auto-populate when card type changes.
 *
 * With empty-string defaults, any field/link with content is considered custom.
 */
export function isBackContentEmptyOrDefault(backContent: BackContent): boolean {
  const hasCustomFields = backContent.fields.some(
    (f) => f.label.trim() !== '' || f.value.trim() !== ''
  );
  const hasCustomLinks = backContent.links.some(
    (l) => l.url.trim() !== '' || l.label.trim() !== ''
  );
  return !hasCustomFields && !hasCustomLinks;
}
