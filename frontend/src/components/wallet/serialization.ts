import type { WalletPassStudioState, CardType, Industry } from '@/components/wallet/types/unified-state';
import type { UnifiedField } from '@/components/wallet/types/unified-field';
import type { BackField } from '@/components/wallet/types/back-content';
import { DEFAULT_COLORS, DEFAULT_BARCODE } from '@/components/wallet/constants';
import { getDefaultCardTypeConfig } from '@/components/wallet/types/card-type-config';
import { migrateLegacyTokens } from '@/components/wallet/types/pass-schema';

const CARD_TYPE_MAP: Record<string, CardType> = {
  stamp: 'stamp',
  cashback: 'cashback',
  coupon: 'coupon',
  affiliate: 'affiliate',
  discount: 'discount',
  gift_certificate: 'gift_certificate',
  vip_membership: 'vip_membership',
  corporate_discount: 'corporate_discount',
  referral_pass: 'referral_pass',
  multipass: 'multipass',
};

/* ── V2 serialization ─────────────────────────────────────────────────── */

/**
 * @description Parses wallet design state from program metadata (V2 only).
 * @param {Record<string, unknown>} metadata - Program metadata object
 * @returns {Partial<WalletPassStudioState>} Parsed wallet design state
 * @throws {Error} When legacy V1 `wallet_design` is present without a V2
 *   `wallet_studio` payload, or when `wallet_studio` carries an unknown version.
 */
export function parseWalletDesignFromMetadata(
  metadata: Record<string, unknown>
): Partial<WalletPassStudioState> {
  const v2 = metadata?.wallet_studio as Record<string, unknown> | undefined;
  if (v2) {
    return parseV2(v2);
  }

  if (metadata?.wallet_design) {
    throw new Error(
      'Legacy V1 wallet_design metadata is not supported. ' +
        'Re-save the design in the studio to migrate it to wallet_studio v2.'
    );
  }

  return {};
}

/**
 * Rewrite legacy `{legacy_id}` / bare ids inside a field to the namespaced
 * `{{namespace.leaf}}` vocabulary. Unknown placeholders are left alone.
 */
function migrateFieldTokens(field: UnifiedField): UnifiedField {
  const next: UnifiedField = { ...field, value: migrateLegacyTokens(field.value) };
  if (typeof field.dynamicTemplate === 'string') {
    next.dynamicTemplate = migrateLegacyTokens(field.dynamicTemplate);
  }
  return next;
}

/** Rewrite legacy tokens in back-of-pass fields. */
function migrateBackFieldTokens(field: BackField): BackField {
  return { ...field, value: migrateLegacyTokens(field.value) };
}

function parseV2(v2: Record<string, unknown>): Partial<WalletPassStudioState> {
  const version = v2.version;
  if (version !== undefined && version !== 2) {
    throw new Error(
      `Unsupported wallet_studio version: ${String(version)}. Expected version 2.`
    );
  }

  const cardType = CARD_TYPE_MAP[String(v2.cardType)] || 'stamp';
  const rawFields = (v2.fields as WalletPassStudioState['fields']) || [];
  const rawBack = (v2.backContent as WalletPassStudioState['backContent']) || {
    fields: [],
    links: [],
    detailImages: [],
  };
  return {
    version: 2,
    id: String(v2.id || crypto.randomUUID()),
    name: String(v2.name || ''),
    cardType,
    industry: (v2.industry as Industry) || 'generic',
    colors: (v2.colors as WalletPassStudioState['colors']) || { ...DEFAULT_COLORS },
    images: (v2.images as WalletPassStudioState['images']) || {},
    fields: rawFields.map(migrateFieldTokens),
    cardTypeConfig: (v2.cardTypeConfig as WalletPassStudioState['cardTypeConfig']) || getDefaultCardTypeConfig(cardType),
    barcode: (v2.barcode as WalletPassStudioState['barcode']) || { ...DEFAULT_BARCODE },
    backContent: {
      ...rawBack,
      fields: (rawBack.fields ?? []).map(migrateBackFieldTokens),
    },
    ...(v2.apple ? { apple: v2.apple as WalletPassStudioState['apple'] } : {}),
    ...(v2.google ? { google: v2.google as WalletPassStudioState['google'] } : {}),
  };
}

/**
 * @description Builds wallet design metadata from a V2 design state object.
 * @param {WalletPassStudioState} state - Wallet design state
 * @returns {Record<string, unknown>} Metadata object for storage
 */
export function buildWalletDesignMetadata(
  state: WalletPassStudioState
): Record<string, unknown> {
  return {
    wallet_studio: {
      version: state.version,
      id: state.id,
      name: state.name,
      cardType: state.cardType,
      industry: state.industry,
      colors: state.colors,
      images: state.images,
      fields: state.fields,
      cardTypeConfig: state.cardTypeConfig,
      barcode: state.barcode,
      backContent: state.backContent,
      apple: state.apple,
      google: state.google,
    },
    wallet_provider: 'both',
  };
}
