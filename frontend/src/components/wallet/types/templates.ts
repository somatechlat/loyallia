/**
 * Template types for the Wallet Pass Studio.
 */

import type {
  CardType,
  Industry,
  WalletColors,
  CardTypeConfig,
  BarcodeConfig,
  BackContent,
  AppleSpecificConfig,
  GoogleSpecificConfig,
  UnifiedField,
} from './unified-state';
import type { CardTypeKey } from '../design-system';

type TemplateType = 'system' | 'user' | 'ai';

export interface WalletTemplate {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  cardType: CardType;
  industry: Industry;
  /**
   * Design-system palette key used for the live template preview.
   * Lets the same card type ship distinct art directions without inventing hex.
   */
  paletteKey: CardTypeKey;
  colors: WalletColors;
  /** Curated display fields (labels + values) rendered on the mini preview. */
  fields: UnifiedField[];
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
