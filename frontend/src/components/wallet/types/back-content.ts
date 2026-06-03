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

function emptyBackContent(): BackContent {
  return { fields: [], links: [], detailImages: [] };
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

export const defaultBackContentDefaults: BackContentDefaults = {
  stamp: emptyBackContent(),
  cashback: emptyBackContent(),
  coupon: emptyBackContent(),
  affiliate: emptyBackContent(),
  discount: emptyBackContent(),
  gift_certificate: emptyBackContent(),
  vip_membership: emptyBackContent(),
  corporate_discount: emptyBackContent(),
  referral_pass: emptyBackContent(),
  multipass: emptyBackContent(),
};
