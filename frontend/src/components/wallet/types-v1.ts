/**
 * Re-export of the legacy v1 wallet design types.
 * The canonical definitions live in `types-v1-definitions.ts`.
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
} from './types-v1-definitions';

export { defaultWalletDesignState } from './types-v1-definitions';
