/**
 * Back-of-pass content types for the Wallet Pass Studio unified v2 model.
 */

import type { LinkType } from './unified-state';

export interface BackField {
  id: string;
  label: string;
  value: string;
  isLink: boolean;
  linkUrl?: string;
  linkType?: LinkType;
  order: number;
}

export interface BackLink {
  id: string;
  type: LinkType;
  url: string;
  label: string;
  icon?: string;
}

export interface DetailImage {
  url: string;
  width: number;
  height: number;
  description?: string;
}

export interface AppLinkConfig {
  iosAppId?: string;
  iosAppLink?: string;
  androidAppPackage?: string;
  androidAppLink?: string;
}

export interface BackContent {
  fields: BackField[];
  links: BackLink[];
  detailImages: DetailImage[];
  appLink?: AppLinkConfig;
  termsAndConditions?: string;
}

export interface BackContentDefaults {
  stamp: BackContent;
  cashback: BackContent;
  coupon: BackContent;
  affiliate: BackContent;
  discount: BackContent;
  gift_certificate: BackContent;
  vip_membership: BackContent;
  corporate_discount: BackContent;
  referral_pass: BackContent;
  multipass: BackContent;
}

/* Default back content helpers */

function makeBackField(
  id: string,
  label: string,
  value: string,
  overrides?: Partial<BackField>
): BackField {
  return {
    id,
    label,
    value,
    isLink: false,
    order: 0,
    ...overrides,
  };
}

function makeBackLink(
  id: string,
  type: LinkType,
  url: string,
  label: string
): BackLink {
  return { id, type, url, label };
}

/**
 * Single default back-content factory. Every card type currently ships the
 * same default skeleton (rules / terms / contact + website link); per-card-type
 * divergence belongs in content templates, not in duplicated factories.
 */
function createDefaultBackContent(): BackContent {
  return {
    fields: [
      makeBackField('rules', '', ''),
      makeBackField('terms', '', ''),
      makeBackField('contact', '', '', { isLink: true, linkUrl: '', linkType: 'email' }),
    ],
    links: [
      makeBackLink('website', 'website', '', ''),
    ],
    detailImages: [],
  };
}

export const defaultBackContentDefaults: BackContentDefaults = {
  stamp: createDefaultBackContent(),
  cashback: createDefaultBackContent(),
  coupon: createDefaultBackContent(),
  affiliate: createDefaultBackContent(),
  discount: createDefaultBackContent(),
  gift_certificate: createDefaultBackContent(),
  vip_membership: createDefaultBackContent(),
  corporate_discount: createDefaultBackContent(),
  referral_pass: createDefaultBackContent(),
  multipass: createDefaultBackContent(),
};
