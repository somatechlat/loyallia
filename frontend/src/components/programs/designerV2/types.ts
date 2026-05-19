/* designerV2/types.ts — Re-export existing WalletDesign types for V2 */

export type {
  AppleWalletFeatureConfig,
  GoogleFieldRow,
  GoogleFieldItem,
  AppleFieldDef,
  GoogleAdvancedConfig,
  AppleAdvancedConfig,
  WalletDesignState,
  WalletLocation,
  WalletBeacon,
  WalletLink,
} from '../WalletDesigner';

export { defaultWalletDesignState } from '../WalletDesigner';

/* V2-only UI state (not persisted) */
export type DesignerNavItem =
  | 'design'
  | 'data'
  | 'locations'
  | 'links'
  | 'barcode'
  | 'advanced';

export interface DesignerUIState {
  activeNav: DesignerNavItem;
  previewMode: 'flat' | 'phone';
  phoneFrame: 'iphone' | 'pixel';
  appleView: 'front' | 'back';
  selectedFieldId: string | null;
  showAddFieldModal: boolean;
  showEditFieldModal: boolean;
  editingFieldId: string | null;
  showPickImageModal: string | null;
  hoveredZone: string | null;
  showZoneMap: boolean;
}

export function defaultDesignerUIState(): DesignerUIState {
  return {
    activeNav: 'design',
    previewMode: 'flat',
    phoneFrame: 'iphone',
    appleView: 'front',
    selectedFieldId: null,
    showAddFieldModal: false,
    showEditFieldModal: false,
    editingFieldId: null,
    showPickImageModal: null,
    hoveredZone: null,
    showZoneMap: false,
  };
}
