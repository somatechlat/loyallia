/**
 * Main state management hook for the Wallet Pass Studio.
 *
 * Provides a unified v2 state model with typed updaters for every
 * sub-section of the pass design.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
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
import type { WalletTemplate } from '@/components/wallet/types/templates';
import { getDefaultCardTypeConfig } from '@/components/wallet/types/card-type-config';
import { DEFAULT_COLORS, DEFAULT_BARCODE } from '@/components/wallet/constants';
import { getDefaultBackContent, isBackContentEmptyOrDefault } from '@/components/wallet/utils/back-content-defaults';

export interface UseWalletStudioReturn {
  state: WalletPassStudioState;
  setState: React.Dispatch<React.SetStateAction<WalletPassStudioState>>;
  updateColors: (colors: Partial<WalletColors>) => void;
  updateImages: (images: Partial<WalletImages>) => void;
  updateFields: (fields: UnifiedField[] | ((prev: UnifiedField[]) => UnifiedField[])) => void;
  updateBarcode: (barcode: Partial<BarcodeConfig>) => void;
  updateBackContent: (backContent: Partial<BackContent>) => void;
  updateCardTypeConfig: (config: Partial<CardTypeConfig>) => void;
  updateAppleConfig: (config: Partial<AppleSpecificConfig>) => void;
  updateGoogleConfig: (config: Partial<GoogleSpecificConfig>) => void;
  updateUI: (ui: Partial<WalletPassStudioState['ui']>) => void;
  setCardType: (cardType: CardType) => void;
  setIndustry: (industry: Industry) => void;
  applyTemplate: (template: WalletTemplate) => void;
  resetState: () => void;
  isModified: boolean;
  selectedFieldId: string | null;
  setSelectedFieldId: (id: string | null) => void;
  duplicateField: (id: string) => void;
  deleteField: (id: string) => void;
  nudgeField: (id: string, direction: 'up' | 'down' | 'left' | 'right', amount: number) => void;
}

export function createDefaultState(): WalletPassStudioState {
  return {
    version: 2,
    id: `pass-${Date.now()}`,
    name: 'Nuevo Pase',
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

function mergeState(
  prev: WalletPassStudioState,
  updater: Partial<WalletPassStudioState> | ((s: WalletPassStudioState) => Partial<WalletPassStudioState>)
): WalletPassStudioState {
  const partial = typeof updater === 'function' ? updater(prev) : updater;
  return {
    ...prev,
    ...partial,
    ui: {
      ...prev.ui,
      ...(partial.ui ?? {}),
      isModified: true,
    },
  };
}

export function useWalletStudio(
  initialState?: Partial<WalletPassStudioState>
): UseWalletStudioReturn {
  const defaultState = createDefaultState();
  const mergedInitial = initialState
    ? { ...defaultState, ...initialState, ui: { ...defaultState.ui, ...(initialState.ui ?? {}) } }
    : defaultState;

  const initialRef = useRef(mergedInitial);
  const [state, setState] = useState<WalletPassStudioState>(mergedInitial);

  const updateColors = useCallback((colors: Partial<WalletColors>) => {
    setState((prev: WalletPassStudioState) =>
      mergeState(prev, {
        colors: { ...prev.colors, ...colors },
      })
    );
  }, []);

  const updateImages = useCallback((images: Partial<WalletImages>) => {
    setState((prev: WalletPassStudioState) =>
      mergeState(prev, {
        images: { ...prev.images, ...images },
      })
    );
  }, []);

  const updateFields = useCallback(
    (fields: UnifiedField[] | ((prev: UnifiedField[]) => UnifiedField[])) => {
      setState((prev: WalletPassStudioState) =>
        mergeState(prev, {
          fields: typeof fields === 'function' ? fields(prev.fields) : fields,
        })
      );
    },
    []
  );

  const updateBarcode = useCallback((barcode: Partial<BarcodeConfig>) => {
    setState((prev: WalletPassStudioState) =>
      mergeState(prev, {
        barcode: { ...prev.barcode, ...barcode },
      })
    );
  }, []);

  const updateBackContent = useCallback((backContent: Partial<BackContent>) => {
    setState((prev: WalletPassStudioState) =>
      mergeState(prev, {
        backContent: { ...prev.backContent, ...backContent },
      })
    );
  }, []);

  const updateCardTypeConfig = useCallback((config: Partial<CardTypeConfig>) => {
    setState((prev: WalletPassStudioState) => {
      const nextConfig = { ...prev.cardTypeConfig, ...config } as CardTypeConfig;
      return mergeState(prev, { cardTypeConfig: nextConfig });
    });
  }, []);

  const updateAppleConfig = useCallback((config: Partial<AppleSpecificConfig>) => {
    setState((prev: WalletPassStudioState) =>
      mergeState(prev, {
        apple: { ...prev.apple, ...config },
      })
    );
  }, []);

  const updateGoogleConfig = useCallback((config: Partial<GoogleSpecificConfig>) => {
    setState((prev: WalletPassStudioState) =>
      mergeState(prev, {
        google: { ...prev.google, ...config },
      })
    );
  }, []);

  const updateUI = useCallback((ui: Partial<WalletPassStudioState['ui']>) => {
    setState((prev: WalletPassStudioState) => ({
      ...prev,
      ui: { ...prev.ui, ...ui },
    }));
  }, []);

  const setCardType = useCallback((cardType: CardType) => {
    setState((prev: WalletPassStudioState) => {
      const config = getDefaultCardTypeConfig(cardType);
      const shouldPopulateBack = isBackContentEmptyOrDefault(prev.backContent);
      const nextBackContent = shouldPopulateBack ? getDefaultBackContent(cardType) : prev.backContent;

      return mergeState(prev, {
        cardType,
        cardTypeConfig: config,
        backContent: nextBackContent,
        apple: {
          ...prev.apple,
          passStyle: config.cardType === 'coupon' ? 'coupon' : config.cardType === 'multipass' ? 'eventTicket' : 'storeCard',
        },
        google: {
          ...prev.google,
          passType:
            config.cardType === 'coupon'
              ? 'OfferClass'
              : config.cardType === 'gift_certificate'
                ? 'GiftCardClass'
                : 'LoyaltyClass',
        },
      });
    });
  }, []);

  const setIndustry = useCallback((industry: Industry) => {
    setState((prev: WalletPassStudioState) => mergeState(prev, { industry }));
  }, []);

  const applyTemplate = useCallback((template: WalletTemplate) => {
    setState((prev: WalletPassStudioState) =>
      mergeState(prev, {
        cardType: template.cardType,
        industry: template.industry,
        colors: { ...template.colors },
        cardTypeConfig: { ...template.cardTypeConfig } as CardTypeConfig,
        barcode: { ...template.barcode },
        backContent: { ...template.backContent },
        apple: {
          ...prev.apple,
          passStyle: template.apple.passStyle,
          description: template.apple.description,
          organizationName: template.apple.organizationName,
        },
        google: {
          ...prev.google,
          passType: template.google.passType,
          programName: template.google.programName,
          hexBackgroundColor: template.google.hexBackgroundColor,
        },
        ui: {
          ...prev.ui,
          appliedTemplateId: template.id,
          isModified: true,
        },
      })
    );
  }, []);

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const duplicateField = useCallback((id: string) => {
    setState((prev: WalletPassStudioState) => {
      const field = prev.fields.find((f) => f.id === id);
      if (!field) return prev;
      const duplicated: UnifiedField = {
        ...field,
        id: `${crypto.randomUUID()}`,
        label: `${field.label} (copia)`,
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
      return mergeState(prev, { fields: reindexed });
    });
  }, []);

  const deleteField = useCallback((id: string) => {
    setState((prev: WalletPassStudioState) =>
      mergeState(prev, {
        fields: prev.fields.filter((f) => f.id !== id),
      })
    );
    setSelectedFieldId((current) => (current === id ? null : current));
  }, []);

  const nudgeField = useCallback(
    (id: string, direction: 'up' | 'down' | 'left' | 'right', amount: number) => {
      // Fields use `order` for positioning, not x/y coordinates.
      // 'up'/'down' reorder within the group; 'left'/'right' are no-ops.
      if (direction !== 'up' && direction !== 'down') return;
      setState((prev: WalletPassStudioState) => {
        const field = prev.fields.find((f) => f.id === id);
        if (!field) return prev;
        const groupFields = prev.fields
          .filter((f) => f.fieldGroup === field.fieldGroup)
          .sort((a, b) => a.order - b.order);
        const index = groupFields.findIndex((f) => f.id === id);
        const newIndex = direction === 'up' ? index - amount : index + amount;
        if (newIndex < 0 || newIndex >= groupFields.length) return prev;
        const reordered = [...groupFields];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(newIndex, 0, moved!);
        const reindexed = reordered.map((f, idx) => ({ ...f, order: idx }));
        return mergeState(prev, {
          fields: prev.fields.map((f) => {
            const updated = reindexed.find((r) => r.id === f.id);
            return updated ?? f;
          }),
        });
      });
    },
    []
  );

  const resetState = useCallback(() => {
    setState({ ...initialRef.current, ui: { ...initialRef.current.ui, isModified: false } });
    setSelectedFieldId(null);
  }, []);

  const isModified = !deepEqual(state, { ...initialRef.current, ui: { ...initialRef.current.ui, isModified: state.ui.isModified } });

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
    applyTemplate,
    resetState,
    isModified,
    selectedFieldId,
    setSelectedFieldId,
    duplicateField,
    deleteField,
    nudgeField,
  };
}
