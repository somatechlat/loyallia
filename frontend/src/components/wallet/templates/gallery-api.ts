/**
 * API ↔ template mapping for the gallery's user/AI tabs.
 */

import type { WalletTemplate } from '@/components/wallet/types/templates';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';

export interface ApiTemplate {
  id: string;
  name: string;
  description: string;
  card_type: string;
  industry: string;
  design_state: WalletPassStudioState;
  tags: string[];
  is_favorite: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

const FALLBACK_COLORS = {
  background: '#1a1a2e',
  foreground: '#ffffff',
  label: '#888888',
  accent: '#3b82f6',
};

export function apiToWalletTemplate(api: ApiTemplate): WalletTemplate {
  const state = api.design_state;
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    type: api.tags.includes('ai-generated') ? 'ai' : 'user',
    cardType: api.card_type as WalletTemplate['cardType'],
    industry: api.industry as WalletTemplate['industry'],
    paletteKey: (api.card_type as WalletTemplate['paletteKey']) ?? 'stamp',
    colors: state?.colors || FALLBACK_COLORS,
    fields: state?.fields ?? [],
    cardTypeConfig: state?.cardTypeConfig || ({
      cardType: api.card_type as WalletTemplate['cardType'],
    } as WalletTemplate['cardTypeConfig']),
    barcode: state?.barcode || { format: 'QR_CODE', message: '', messageEncoding: 'iso-8859-1' },
    backContent: state?.backContent || { fields: [], links: [], detailImages: [] },
    apple: state?.apple || { passStyle: 'storeCard', description: '', organizationName: '' },
    google: state?.google || {
      passType: 'LoyaltyClass',
      programName: '',
      hexBackgroundColor: FALLBACK_COLORS.background,
    },
    tags: api.tags,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}
