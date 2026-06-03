/**
 * Template types for the Wallet Pass Studio.
 */

import type { CardType, Industry, WalletColors, CardTypeConfig, BarcodeConfig, BackContent, AppleSpecificConfig, GoogleSpecificConfig } from './unified-state';

export type TemplateType = 'system' | 'user' | 'ai';

export interface WalletTemplate {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  cardType: CardType;
  industry: Industry;
  colors: WalletColors;
  cardTypeConfig: CardTypeConfig;
  barcode: BarcodeConfig;
  backContent: BackContent;
  apple: Pick<AppleSpecificConfig, 'passStyle' | 'description' | 'organizationName'>;
  google: Pick<GoogleSpecificConfig, 'passType' | 'programName' | 'hexBackgroundColor'>;
  previewUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  templates: WalletTemplate[];
}
