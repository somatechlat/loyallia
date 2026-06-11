/**
 * AI design assistant hook for the Wallet Pass Studio.
 *
 * Connects to the real Loyallia backend AI service (Groq API) for:
 * - Template generation from business descriptions
 * - Color palette suggestions
 * - Design critique and scoring
 * - Stamp icon suggestions
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { aiApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type {
  WalletPassStudioState,
  CardType,
  Industry,
  WalletColors,
} from '@/components/wallet/types/unified-state';

export interface UseAIOptions {
  enabled?: boolean;
}

export interface AIVariation {
  id: string;
  name: string;
  description: string;
  confidence: number;
  design: Partial<WalletPassStudioState>;
}

export interface AILayoutSuggestion {
  name: string;
  description: string;
  logo_position: string;
  field_arrangement: string;
  header_style: string;
  footer_style: string;
  reasoning: string;
}

export interface UseAIReturn {
  isLoading: boolean;
  error: string | null;
  quota: { used: number; limit: number };
  generateTemplate: (
    description: string,
    cardType: CardType,
    industry: Industry
  ) => Promise<AIVariation[]>;
  suggestColors: (
    description: string,
    industry: Industry
  ) => Promise<Array<{ background: string; foreground: string; label: string; accent: string }>>;
  critiqueDesign: (state: WalletPassStudioState) => Promise<string[]>;
  suggestStampIcons: (businessType: string) => Promise<string[]>;
  suggestLayout: (
    designData: Record<string, unknown>,
    cardType: CardType
  ) => Promise<AILayoutSuggestion>;
  reset: () => void;
}

/** Transform backend template response into frontend AIVariation shape. */
function mapBackendVariations(
  variations: Array<{
    name: string;
    description: string;
    confidence: number;
    design: {
      background_color: string;
      foreground_color: string;
      accent_color: string;
      header_image?: string;
      logo_position?: string;
      fields_layout?: string;
      font_family?: string;
    };
  }>,
  cardType: CardType,
  industry: Industry
): AIVariation[] {
  return variations.map((v, idx) => ({
    id: `ai-variation-${idx}-${Date.now()}`,
    name: v.name,
    description: v.description,
    confidence: v.confidence,
    design: {
      cardType,
      industry,
      colors: {
        background: v.design.background_color,
        foreground: v.design.foreground_color,
        label: v.design.foreground_color,
        accent: v.design.accent_color,
      } as WalletColors,
      name: v.name,
    },
  }));
}

/** Update local quota state from backend response payload. */
function extractQuota(payload: any): { used: number; limit: number } | null {
  if (payload?.quota && typeof payload.quota.used === 'number' && typeof payload.quota.limit === 'number') {
    return payload.quota;
  }
  return null;
}

export function useAI(options?: UseAIOptions): UseAIReturn {
  const { t } = useI18n();
  const enabled = options?.enabled ?? true;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState({ used: 0, limit: 10 });
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const generateTemplate = useCallback(
    async (
      description: string,
      cardType: CardType,
      industry: Industry
    ): Promise<AIVariation[]> => {
      if (!enabled) {
        setError(t('wallet.studio.ai.disabled'));
        return [];
      }
      if (!description.trim()) {
        setError(t('wallet.studio.ai.describeBusiness'));
        return [];
      }

      setError(null);
      setIsLoading(true);
      abortRef.current = new AbortController();

      try {
        const response = await aiApi.generateTemplate({
          description,
          card_type: cardType,
          industry,
          language: 'es',
        });

        if (abortRef.current.signal.aborted) {
          return [];
        }

        const payload = response.data;
        if (!payload.success) {
          setError(payload.message || t('wallet.studio.ai.generateError'));
          return [];
        }

        const variations = payload.data?.variations ?? [];
        const quotaUpdate = extractQuota(payload);
        if (quotaUpdate) setQuota(quotaUpdate);

        return mapBackendVariations(variations, cardType, industry);
      } catch (err: any) {
        if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
          return [];
        }
        const message =
          err?.response?.data?.message ||
          err?.message ||
          t('wallet.studio.ai.generateError');
        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [enabled]
  );

  const suggestColors = useCallback(
    async (
      description: string,
      industry: Industry
    ): Promise<Array<{ background: string; foreground: string; label: string; accent: string }>> => {
      if (!enabled) {
        setError(t('wallet.studio.ai.disabled'));
        return [];
      }
      if (!description.trim()) {
        setError(t('wallet.studio.ai.describeBusiness'));
        return [];
      }

      setError(null);
      setIsLoading(true);
      abortRef.current = new AbortController();

      try {
        const response = await aiApi.suggestColors({
          description,
          industry,
        });

        if (abortRef.current.signal.aborted) {
          return [];
        }

        const payload = response.data;
        if (!payload.success) {
          setError(payload.message || t('wallet.studio.ai.suggestColorsError'));
          return [];
        }

        const palettes = payload.data?.palettes ?? [];
        const quotaUpdate = extractQuota(payload);
        if (quotaUpdate) setQuota(quotaUpdate);

        return palettes.map((p: any) => ({
          background: p.background_color,
          foreground: p.foreground_color,
          label: p.label_color || p.foreground_color,
          accent: p.accent_color || p.foreground_color,
        }));
      } catch (err: any) {
        if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
          return [];
        }
        const message =
          err?.response?.data?.message ||
          err?.message ||
          t('wallet.studio.ai.suggestColorsError');
        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [enabled]
  );

  const critiqueDesign = useCallback(
    async (state: WalletPassStudioState): Promise<string[]> => {
      if (!enabled) {
        setError(t('wallet.studio.ai.disabled'));
        return [];
      }

      setError(null);
      setIsLoading(true);
      abortRef.current = new AbortController();

      try {
        const response = await aiApi.critiqueDesign({
          design_data: {
            colors: state.colors,
            cardType: state.cardType,
            industry: state.industry,
            fields: state.fields.map((f) => ({
              label: f.label,
              value: f.value,
              group: f.fieldGroup,
            })),
            hasLogo: Boolean(state.images.logo?.url),
            hasHero: Boolean(state.images.strip?.url || state.images.heroImage?.url),
            barcodeFormat: state.barcode.format,
          },
        });

        if (abortRef.current.signal.aborted) {
          return [];
        }

        const payload = response.data;
        if (!payload.success) {
          setError(payload.message || t('wallet.studio.ai.critiqueError'));
          return [];
        }

        const suggestions = payload.data?.suggestions ?? [];
        const quotaUpdate = extractQuota(payload);
        if (quotaUpdate) setQuota(quotaUpdate);

        return suggestions;
      } catch (err: any) {
        if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
          return [];
        }
        const message =
          err?.response?.data?.message ||
          err?.message ||
          t('wallet.studio.ai.critiqueError');
        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [enabled]
  );

  const suggestStampIcons = useCallback(
    async (businessType: string): Promise<string[]> => {
      if (!enabled) {
        setError(t('wallet.studio.ai.disabled'));
        return [];
      }
      if (!businessType.trim()) {
        return [];
      }

      setError(null);
      setIsLoading(true);
      abortRef.current = new AbortController();

      try {
        const response = await aiApi.suggestStampIcons({
          business_type: businessType,
        });

        if (abortRef.current.signal.aborted) {
          return [];
        }

        const payload = response.data;
        if (!payload.success) {
          setError(payload.message || t('wallet.studio.ai.suggestIconsError'));
          return [];
        }

        const icons = payload.data?.icons ?? [];
        const quotaUpdate = extractQuota(payload);
        if (quotaUpdate) setQuota(quotaUpdate);

        return icons;
      } catch (err: any) {
        if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
          return [];
        }
        const message =
          err?.response?.data?.message ||
          err?.message ||
          t('wallet.studio.ai.suggestIconsError');
        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [enabled]
  );

  const suggestLayout = useCallback(
    async (
      designData: Record<string, unknown>,
      cardType: CardType
    ): Promise<AILayoutSuggestion> => {
      if (!enabled) {
        setError(t('wallet.studio.ai.disabled'));
        return {
          name: 'Predeterminado',
          description: 'Disposición estándar',
          logo_position: 'top_center',
          field_arrangement: 'vertical_stack',
          header_style: 'full_width_banner',
          footer_style: 'minimal',
          reasoning: 'Modo IA desactivado.',
        };
      }

      setError(null);
      setIsLoading(true);
      abortRef.current = new AbortController();

      try {
        const response = await aiApi.suggestLayout({
          design_data: designData,
          card_type: cardType,
        });

        if (abortRef.current.signal.aborted) {
          return {
            name: 'Predeterminado',
            description: 'Disposición estándar',
            logo_position: 'top_center',
            field_arrangement: 'vertical_stack',
            header_style: 'full_width_banner',
            footer_style: 'minimal',
            reasoning: 'Solicitud cancelada.',
          };
        }

        const payload = response.data;
        if (!payload.success) {
          setError(payload.message || t('wallet.studio.ai.layoutError'));
          return {
            name: 'Predeterminado',
            description: 'Disposición estándar',
            logo_position: 'top_center',
            field_arrangement: 'vertical_stack',
            header_style: 'full_width_banner',
            footer_style: 'minimal',
            reasoning: payload.message || 'Error del servicio de IA.',
          };
        }

        const layout = payload.data ?? {};
        const quotaUpdate = extractQuota(payload);
        if (quotaUpdate) setQuota(quotaUpdate);

        return {
          name: layout.name || 'Sugerencia',
          description: layout.description || '',
          logo_position: layout.logo_position || 'top_center',
          field_arrangement: layout.field_arrangement || 'vertical_stack',
          header_style: layout.header_style || 'full_width_banner',
          footer_style: layout.footer_style || 'minimal',
          reasoning: layout.reasoning || '',
        };
      } catch (err: any) {
        if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
          return {
            name: 'Predeterminado',
            description: 'Disposición estándar',
            logo_position: 'top_center',
            field_arrangement: 'vertical_stack',
            header_style: 'full_width_banner',
            footer_style: 'minimal',
            reasoning: 'Solicitud cancelada.',
          };
        }
        const message =
          err?.response?.data?.message ||
          err?.message ||
          t('wallet.studio.ai.layoutError');
        setError(message);
        return {
          name: 'Predeterminado',
          description: 'Disposición estándar',
          logo_position: 'top_center',
          field_arrangement: 'vertical_stack',
          header_style: 'full_width_banner',
          footer_style: 'minimal',
          reasoning: message,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [enabled]
  );

  return {
    isLoading,
    error,
    quota,
    generateTemplate,
    suggestColors,
    critiqueDesign,
    suggestStampIcons,
    suggestLayout,
    reset,
  };
}
