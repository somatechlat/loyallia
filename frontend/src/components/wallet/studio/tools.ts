/**
 * Single source of truth for studio tool navigation.
 *
 * Every nav surface (desktop rail, mobile switcher) renders from STUDIO_TOOLS.
 * AI is deliberately absent — it is an action, not a tool (D-U6).
 */

export type StudioToolId =
  | 'images'
  | 'cardType'
  | 'fields'
  | 'back'
  | 'barcode'
  | 'colors'
  | 'advanced';

export interface StudioTool {
  id: StudioToolId;
  labelKey: string;
}

export const STUDIO_TOOLS: ReadonlyArray<StudioTool> = [
  { id: 'images', labelKey: 'wallet.studio.sidebar.tab.images' },
  { id: 'cardType', labelKey: 'wallet.studio.sidebar.tab.cardType' },
  { id: 'fields', labelKey: 'wallet.studio.sidebar.tab.fields' },
  { id: 'back', labelKey: 'wallet.studio.sidebar.tab.back' },
  { id: 'barcode', labelKey: 'wallet.studio.sidebar.tab.barcode' },
  { id: 'colors', labelKey: 'wallet.studio.sidebar.tab.colors' },
  { id: 'advanced', labelKey: 'wallet.studio.sidebar.tab.advanced' },
];
