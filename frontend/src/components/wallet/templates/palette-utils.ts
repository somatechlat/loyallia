/**
 * Palette + field factories for system templates.
 *
 * Every colour on a preset comes from `design-system.ts` — presets never
 * invent hex. Field and back-content helpers keep Spanish display copy
 * consistent across the gallery.
 */

import type {
  CardType,
  Industry,
  WalletColors,
  UnifiedField,
  FieldGroup,
  BackContent,
  BackField,
  BackLink,
  BarcodeConfig,
} from '@/components/wallet/types/unified-state';
import type { FieldDataType } from '@/components/wallet/types/unified-field';
import type { WalletTemplate } from '@/components/wallet/types/templates';
import {
  getCardPalette,
  type CardPalette,
  type CardTypeKey,
} from '@/components/wallet/design-system';

/** Solid pass colours derived from a design-system palette. */
export function colorsFromPalette(palette: CardPalette): WalletColors {
  return {
    background: palette.base,
    foreground: palette.text,
    label: palette.accent,
    accent: palette.accent,
    centralBackground: palette.accentSoft,
  };
}

/** Accent hex for stamp/progress fills — always a design-system accent. */
export function accentFromPalette(paletteKey: CardTypeKey): string {
  return getCardPalette(paletteKey).accent;
}

export function baseFromPalette(paletteKey: CardTypeKey): string {
  return getCardPalette(paletteKey).base;
}

/* ── Field factory ─────────────────────────────────────────────────── */

export interface FieldSpec {
  id: string;
  label: string;
  value: string;
  fieldGroup: FieldGroup;
  order: number;
  dataType?: FieldDataType;
}

export function makeField(spec: FieldSpec): UnifiedField {
  return {
    id: spec.id,
    label: spec.label,
    value: spec.value,
    fieldGroup: spec.fieldGroup,
    order: spec.order,
    showOnApple: true,
    showOnGoogle: true,
    isDynamic: false,
    dataType: spec.dataType ?? 'text',
    appleOptions: {
      textAlignment: 'PKTextAlignmentNatural',
    },
    googleOptions: {
      isPredefined: false,
    },
    notifications: {},
    formatting: {
      isLink: false,
    },
  };
}

/* ── Back content ──────────────────────────────────────────────────── */

export function makeBackContent(opts: {
  rules: string;
  terms: string;
  contactEmail: string;
  websiteUrl: string;
  websiteLabel?: string;
  extra?: BackField[];
}): BackContent {
  const fields: BackField[] = [
    {
      id: 'rules',
      label: 'Reglas del programa',
      value: opts.rules,
      isLink: false,
      order: 0,
    },
    {
      id: 'terms',
      label: 'Términos y condiciones',
      value: opts.terms,
      isLink: false,
      order: 1,
    },
    {
      id: 'contact',
      label: 'Contacto',
      value: opts.contactEmail,
      isLink: true,
      linkUrl: `mailto:${opts.contactEmail}`,
      linkType: 'email',
      order: 2,
    },
    ...(opts.extra ?? []),
  ];

  const links: BackLink[] = [
    {
      id: 'website',
      type: 'website',
      url: opts.websiteUrl,
      label: opts.websiteLabel ?? 'Sitio web',
    },
  ];

  return {
    fields,
    links,
    detailImages: [],
    termsAndConditions: opts.terms,
  };
}

/* ── Barcode ───────────────────────────────────────────────────────── */

export function makeBarcode(
  format: BarcodeConfig['format'] = 'QR_CODE',
  altText?: string,
): BarcodeConfig {
  return {
    format,
    message: '',
    messageEncoding: 'iso-8859-1',
    ...(altText ? { altText } : {}),
  };
}

/* ── Template assembly ─────────────────────────────────────────────── */

export interface SystemTemplateSpec {
  id: string;
  name: string;
  description: string;
  cardType: CardType;
  industry: Industry;
  paletteKey: CardTypeKey;
  fields: UnifiedField[];
  cardTypeConfig: WalletTemplate['cardTypeConfig'];
  barcode: BarcodeConfig;
  backContent: BackContent;
  apple: WalletTemplate['apple'];
  /** `hexBackgroundColor` is filled from the palette by `buildSystemTemplate`. */
  google: Omit<WalletTemplate['google'], 'hexBackgroundColor'>;
  tags: string[];
}

const TEMPLATE_EPOCH = '2026-01-01T00:00:00.000Z';

export function buildSystemTemplate(spec: SystemTemplateSpec): WalletTemplate {
  const palette = getCardPalette(spec.paletteKey);
  const colors = colorsFromPalette(palette);
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    type: 'system',
    cardType: spec.cardType,
    industry: spec.industry,
    paletteKey: spec.paletteKey,
    colors,
    fields: spec.fields,
    cardTypeConfig: spec.cardTypeConfig,
    barcode: spec.barcode,
    backContent: spec.backContent,
    apple: spec.apple,
    google: {
      ...spec.google,
      hexBackgroundColor: colors.background,
    },
    tags: spec.tags,
    createdAt: TEMPLATE_EPOCH,
    updatedAt: TEMPLATE_EPOCH,
  };
}
