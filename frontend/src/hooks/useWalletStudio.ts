/**
 * Main state management hook for the Wallet Pass Studio.
 *
 * One store: durable design state lives in a single reducer with in-band
 * undo/redo (structural sharing, no JSON.stringify snapshots). UI chrome
 * (zoom, grid, active tab) is separate React state — it never enters the
 * undo history and never dirties the design.
 */

'use client';

import { useState, useCallback, useRef, useReducer, useMemo } from 'react';
import { deepEqual } from 'fast-equals';
import type {
  WalletPassStudioState,
  CardType,
  Industry,
  WalletColors,
  WalletImages,
  BarcodeConfig,
  BackContent,
  CardTypeConfig,
  AppleSpecificConfig,
  GoogleSpecificConfig,
  UnifiedField,
} from '@/components/wallet/types/unified-state';
import { getDefaultCardTypeConfig } from '@/components/wallet/types/card-type-config';
import { CARD_TYPE_METADATA, DEFAULT_COLORS, DEFAULT_BARCODE } from '@/components/wallet/constants';
import { getDefaultBackContent, isBackContentEmptyOrDefault } from '@/components/wallet/utils/back-content-defaults';

/** Durable design — everything except ephemeral view chrome. */
export type DurableDesign = Omit<WalletPassStudioState, 'ui'>;
type UIState = WalletPassStudioState['ui'];

const MAX_HISTORY = 50;

interface History {
  past: DurableDesign[];
  present: DurableDesign;
  future: DurableDesign[];
}

type Action =
  | { type: 'patch'; patch: Partial<DurableDesign> | ((prev: DurableDesign) => Partial<DurableDesign>) }
  | { type: 'replace'; next: DurableDesign | ((prev: DurableDesign) => DurableDesign) }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; next: DurableDesign };

function pushHistory(history: History, next: DurableDesign): History {
  // Structural dedupe — identical designs produce no undo entry.
  if (deepEqual(next, history.present)) return history;
  const past = [...history.past, history.present];
  if (past.length > MAX_HISTORY) past.shift();
  return { past, present: next, future: [] };
}

function reducer(history: History, action: Action): History {
  switch (action.type) {
    case 'patch': {
      const partial =
        typeof action.patch === 'function' ? action.patch(history.present) : action.patch;
      return pushHistory(history, { ...history.present, ...partial });
    }
    case 'replace': {
      const next =
        typeof action.next === 'function' ? action.next(history.present) : action.next;
      return pushHistory(history, next);
    }
    case 'undo': {
      if (history.past.length === 0) return history;
      const previous = history.past[history.past.length - 1]!;
      return {
        past: history.past.slice(0, -1),
        present: previous,
        future: [history.present, ...history.future],
      };
    }
    case 'redo': {
      if (history.future.length === 0) return history;
      return {
        past: [...history.past, history.present],
        present: history.future[0]!,
        future: history.future.slice(1),
      };
    }
    case 'reset':
      return { past: [], present: action.next, future: [] };
  }
}

export interface UseWalletStudioReturn {
  state: WalletPassStudioState;
  /**
   * Undoable whole-design update. The function receives the assembled
   * state and returns the next one; `ui` changes inside it are applied
   * to chrome only and do not dirty the design.
   */
  setState: (
    update: WalletPassStudioState | ((prev: WalletPassStudioState) => WalletPassStudioState)
  ) => void;
  updateColors: (colors: Partial<WalletColors>) => void;
  updateImages: (images: Partial<WalletImages>) => void;
  updateFields: (fields: UnifiedField[] | ((prev: UnifiedField[]) => UnifiedField[])) => void;
  updateBarcode: (barcode: Partial<BarcodeConfig>) => void;
  updateBackContent: (backContent: Partial<BackContent>) => void;
  updateCardTypeConfig: (config: Partial<CardTypeConfig>) => void;
  updateAppleConfig: (config: Partial<AppleSpecificConfig>) => void;
  updateGoogleConfig: (config: Partial<GoogleSpecificConfig>) => void;
  updateUI: (ui: Partial<UIState>) => void;
  setCardType: (cardType: CardType) => void;
  setIndustry: (industry: Industry) => void;
  resetState: () => void;
  isModified: boolean;
  selectedFieldId: string | null;
  setSelectedFieldId: (id: string | null) => void;
  duplicateField: (id: string, copySuffix?: string) => void;
  deleteField: (id: string) => void;
  nudgeField: (id: string, direction: 'up' | 'down' | 'left' | 'right', amount: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function createDefaultState(): WalletPassStudioState {
  return {
    version: 2,
    id: crypto.randomUUID(),
    name: '',
    cardType: 'stamp',
    industry: 'food',
    colors: { ...DEFAULT_COLORS },
    images: {},
    fields: [],
    cardTypeConfig: getDefaultCardTypeConfig('stamp'),
    barcode: { ...DEFAULT_BARCODE },
    backContent: getDefaultBackContent('stamp'),
    apple: {
      passStyle: 'storeCard',
      description: '',
      organizationName: 'Loyallia',
      nfc: {
        enabled: false,
        requiresAuthentication: false,
      },
      locations: [],
      beacons: [],
      suppressStripShine: false,
      sharingProhibited: false,
      voided: false,
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Loyallia Rewards',
      hexBackgroundColor: DEFAULT_COLORS.background,
      reviewStatus: 'UNDER_REVIEW',
      allowMultipleUsers: 'ONE_USER_ALL_DEVICES',
      messages: [],
      notifyPreference: false,
    },
    ui: {
      activeTab: 'images',
      platformView: 'both',
      showBack: false,
      zoom: 1,
      showGrid: false,
      isModified: false,
    },
  };
}

function splitState(state: WalletPassStudioState): { durable: DurableDesign; ui: UIState } {
  const { ui, ...durable } = state;
  return { durable, ui };
}

function mergeInitial(initialState?: Partial<WalletPassStudioState>): {
  durable: DurableDesign;
  ui: UIState;
} {
  const def = createDefaultState();
  const merged = initialState
    ? { ...def, ...initialState, ui: { ...def.ui, ...(initialState.ui ?? {}) } }
    : def;
  return splitState(merged);
}

export function useWalletStudio(
  initialState?: Partial<WalletPassStudioState>
): UseWalletStudioReturn {
  const initialRef = useRef<{ durable: DurableDesign; ui: UIState } | null>(null);
  if (initialRef.current === null) {
    initialRef.current = mergeInitial(initialState);
  }

  const [history, dispatch] = useReducer(reducer, initialRef.current.durable, (durable) => ({
    past: [],
    present: durable,
    future: [],
  }));
  const [ui, setUI] = useState<UIState>(initialRef.current.ui);

  const isModified = !deepEqual(history.present, initialRef.current.durable);
  const state = useMemo<WalletPassStudioState>(
    () => ({ ...history.present, ui: { ...ui, isModified } }),
    [history.present, ui, isModified]
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  const setState = useCallback(
    (update: WalletPassStudioState | ((prev: WalletPassStudioState) => WalletPassStudioState)) => {
      const resolved =
        typeof update === 'function' ? update(stateRef.current) : update;
      const { durable, ui: nextUI } = splitState(resolved);
      dispatch({ type: 'replace', next: durable });
      setUI((prevUI) => (deepEqual(nextUI, prevUI) ? prevUI : nextUI));
    },
    []
  );

  const updateColors = useCallback((colors: Partial<WalletColors>) => {
    dispatch({
      type: 'patch',
      patch: (prev) => ({
        colors: { ...prev.colors, ...colors },
        // A background change retints the Google pass body too.
        google: {
          ...prev.google,
          hexBackgroundColor: colors.background ?? prev.google.hexBackgroundColor,
        },
      }),
    });
  }, []);

  const updateImages = useCallback((images: Partial<WalletImages>) => {
    dispatch({
      type: 'patch',
      patch: (prev) => ({ images: { ...prev.images, ...images } }),
    });
  }, []);

  const updateFields = useCallback(
    (fields: UnifiedField[] | ((prev: UnifiedField[]) => UnifiedField[])) => {
      dispatch({
        type: 'patch',
        patch: (prev) => ({
          fields: typeof fields === 'function' ? fields(prev.fields) : fields,
        }),
      });
    },
    []
  );

  const updateBarcode = useCallback((barcode: Partial<BarcodeConfig>) => {
    dispatch({
      type: 'patch',
      patch: (prev) => ({ barcode: { ...prev.barcode, ...barcode } }),
    });
  }, []);

  const updateBackContent = useCallback((backContent: Partial<BackContent>) => {
    dispatch({
      type: 'patch',
      patch: (prev) => ({ backContent: { ...prev.backContent, ...backContent } }),
    });
  }, []);

  const updateCardTypeConfig = useCallback((config: Partial<CardTypeConfig>) => {
    dispatch({
      type: 'patch',
      patch: (prev) => ({
        cardTypeConfig: { ...prev.cardTypeConfig, ...config } as CardTypeConfig,
      }),
    });
  }, []);

  const updateAppleConfig = useCallback((config: Partial<AppleSpecificConfig>) => {
    dispatch({
      type: 'patch',
      patch: (prev) => ({ apple: { ...prev.apple, ...config } }),
    });
  }, []);

  const updateGoogleConfig = useCallback((config: Partial<GoogleSpecificConfig>) => {
    dispatch({
      type: 'patch',
      patch: (prev) => ({ google: { ...prev.google, ...config } }),
    });
  }, []);

  const updateUI = useCallback((nextUI: Partial<UIState>) => {
    // Chrome only — never touches the undo history or isModified.
    setUI((prev) => ({ ...prev, ...nextUI }));
  }, []);

  const setCardType = useCallback((cardType: CardType) => {
    dispatch({
      type: 'patch',
      patch: (prev) => {
        const config = getDefaultCardTypeConfig(cardType);
        const shouldPopulateBack = isBackContentEmptyOrDefault(prev.backContent);
        const nextBackContent = shouldPopulateBack ? getDefaultBackContent(cardType) : prev.backContent;
        const meta = CARD_TYPE_METADATA[cardType];
        return {
          cardType,
          cardTypeConfig: config,
          backContent: nextBackContent,
          apple: {
            ...prev.apple,
            passStyle: meta.applePassStyle,
          },
          google: {
            ...prev.google,
            passType: meta.googlePassType,
            hexBackgroundColor: prev.colors.background,
          },
        };
      },
    });
  }, []);

  const setIndustry = useCallback((industry: Industry) => {
    dispatch({ type: 'patch', patch: { industry } });
  }, []);

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const duplicateField = useCallback((id: string, copySuffix?: string) => {
    dispatch({
      type: 'patch',
      patch: (prev) => {
        const field = prev.fields.find((f) => f.id === id);
        if (!field) return {};
        const duplicated: UnifiedField = {
          ...field,
          id: `${crypto.randomUUID()}`,
          label: `${field.label} (${copySuffix || 'copy'})`,
          order: field.order + 1,
        };
        const idx = prev.fields.findIndex((f) => f.id === id);
        const newFields = [...prev.fields];
        newFields.splice(idx + 1, 0, duplicated);
        // Reindex order for all fields in the same group to avoid order collisions
        const group = field.fieldGroup;
        let orderCounter = 0;
        const reindexed = newFields.map((f) => {
          if (f.fieldGroup === group) {
            return { ...f, order: orderCounter++ };
          }
          return f;
        });
        return { fields: reindexed };
      },
    });
  }, []);

  const deleteField = useCallback((id: string) => {
    dispatch({
      type: 'patch',
      patch: (prev) => ({ fields: prev.fields.filter((f) => f.id !== id) }),
    });
    setSelectedFieldId((current) => (current === id ? null : current));
  }, []);

  const nudgeField = useCallback(
    (id: string, direction: 'up' | 'down' | 'left' | 'right', amount: number) => {
      // Fields use `order` for positioning, not x/y coordinates.
      // 'up'/'down' reorder within the group; 'left'/'right' are no-ops.
      if (direction !== 'up' && direction !== 'down') return;
      dispatch({
        type: 'patch',
        patch: (prev) => {
          const field = prev.fields.find((f) => f.id === id);
          if (!field) return {};
          const groupFields = prev.fields
            .filter((f) => f.fieldGroup === field.fieldGroup)
            .sort((a, b) => a.order - b.order);
          const index = groupFields.findIndex((f) => f.id === id);
          const newIndex = direction === 'up' ? index - amount : index + amount;
          if (newIndex < 0 || newIndex >= groupFields.length) return {};
          const reordered = [...groupFields];
          const [moved] = reordered.splice(index, 1);
          reordered.splice(newIndex, 0, moved!);
          const reindexed = reordered.map((f, idx) => ({ ...f, order: idx }));
          return {
            fields: prev.fields.map((f) => {
              const updated = reindexed.find((r) => r.id === f.id);
              return updated ?? f;
            }),
          };
        },
      });
    },
    []
  );

  const resetState = useCallback(() => {
    dispatch({ type: 'reset', next: initialRef.current!.durable });
    setUI(initialRef.current!.ui);
    setSelectedFieldId(null);
  }, []);

  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);

  return {
    state,
    setState,
    updateColors,
    updateImages,
    updateFields,
    updateBarcode,
    updateBackContent,
    updateCardTypeConfig,
    updateAppleConfig,
    updateGoogleConfig,
    updateUI,
    setCardType,
    setIndustry,
    resetState,
    isModified,
    selectedFieldId,
    setSelectedFieldId,
    duplicateField,
    deleteField,
    nudgeField,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
