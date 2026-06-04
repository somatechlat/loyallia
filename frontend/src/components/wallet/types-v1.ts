/**
 * Re-export of the legacy v1 wallet design types.
 * The canonical definitions live in `types.ts`.
 */
export type {
  WalletDesignState,
  AppleWalletFeatureConfig,
  GoogleFieldRow,
  GoogleFieldItem,
  AppleFieldDef,
  GoogleAdvancedConfig,
  AppleAdvancedConfig,
  WalletLocation,
  WalletBeacon,
  WalletLink,
} from './types';

export { defaultWalletDesignState } from './types';
