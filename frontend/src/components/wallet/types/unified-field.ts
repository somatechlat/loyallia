/**
 * Field-related types for the Wallet Pass Studio unified v2 model.
 */

import type { CardType } from './unified-state';

export type FieldGroup = 'header' | 'primary' | 'secondary' | 'auxiliary' | 'back';

export type TextAlignment =
  | 'PKTextAlignmentLeft'
  | 'PKTextAlignmentCenter'
  | 'PKTextAlignmentRight'
  | 'PKTextAlignmentNatural';

export type DateStyle =
  | 'PKDateStyleNone'
  | 'PKDateStyleShort'
  | 'PKDateStyleMedium'
  | 'PKDateStyleLong'
  | 'PKDateStyleFull';

export type TimeStyle =
  | 'PKTimeStyleNone'
  | 'PKTimeStyleShort'
  | 'PKTimeStyleMedium'
  | 'PKTimeStyleLong'
  | 'PKTimeStyleFull';

export type NumberStyle =
  | 'PKNumberStyleDecimal'
  | 'PKNumberStylePercent'
  | 'PKNumberStyleScientific'
  | 'PKNumberStyleSpellOut';

export type LinkType = 'website' | 'email' | 'phone' | 'map' | 'social';

export interface AppleFieldOptions {
  changeMessage?: string;
  textAlignment?: TextAlignment;
  dateStyle?: DateStyle;
  timeStyle?: TimeStyle;
  numberStyle?: NumberStyle;
  currencyCode?: string;
  attributedValue?: string;
}

export interface GoogleFieldOptions {
  isPredefined: boolean;
  predefinedPath?: string;
  textModulesId?: string;
}

export interface FieldNotifications {
  appleChangeMessage?: string;
  googleMessage?: string;
}

export interface FieldFormatting {
  isLink: boolean;
  linkUrl?: string;
  linkType?: LinkType;
}

export interface UnifiedField {
  id: string;
  label: string;
  value: string;
  fieldGroup: FieldGroup;
  order: number;
  showOnApple: boolean;
  showOnGoogle: boolean;
  isDynamic: boolean;
  dynamicTemplate?: string;
  appleOptions: AppleFieldOptions;
  googleOptions: GoogleFieldOptions;
  notifications: FieldNotifications;
  formatting: FieldFormatting;
}

export interface DynamicValueTemplate {
  id: string;
  label: string;
  template: string;
  description: string;
  defaultValue: string;
  applicableCardTypes: CardType[];
}

export type DynamicTemplateRegistry = Record<string, DynamicValueTemplate>;
