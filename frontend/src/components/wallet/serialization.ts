import type { WalletPassStudioState, CardType, Industry } from '@/components/wallet/types/unified-state';
import { DEFAULT_COLORS, DEFAULT_BARCODE } from '@/components/wallet/constants';
import { getDefaultCardTypeConfig } from '@/components/wallet/types/card-type-config';

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
 */
export function parseWalletDesignFromMetadata(
  metadata: Record<string, unknown>
): Partial<WalletPassStudioState> {
  const v2 = metadata?.wallet_studio as Record<string, unknown> | undefined;
  if (v2) {
    return parseV2(v2);
  }

  return {};
}

function parseV2(v2: Record<string, unknown>): Partial<WalletPassStudioState> {
  const cardType = CARD_TYPE_MAP[String(v2.cardType)] || 'stamp';
  return {
    version: 2,
    id: String(v2.id || `pass-${Date.now()}`),
    name: String(v2.name || 'Nuevo Pase'),
    cardType,
    industry: (v2.industry as Industry) || 'generic',
    colors: (v2.colors as WalletPassStudioState['colors']) || { ...DEFAULT_COLORS },
    images: (v2.images as WalletPassStudioState['images']) || {},
    fields: (v2.fields as WalletPassStudioState['fields']) || [],
    cardTypeConfig: (v2.cardTypeConfig as WalletPassStudioState['cardTypeConfig']) || getDefaultCardTypeConfig(cardType),
    barcode: (v2.barcode as WalletPassStudioState['barcode']) || { ...DEFAULT_BARCODE },
    backContent: (v2.backContent as WalletPassStudioState['backContent']) || { fields: [], links: [], detailImages: [] },
    apple: (v2.apple as WalletPassStudioState['apple']) || undefined,
    google: (v2.google as WalletPassStudioState['google']) || undefined,
    ui: (v2.ui as WalletPassStudioState['ui']) || undefined,
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
      ui: state.ui,
    },
    wallet_provider: 'both',
  };
}
