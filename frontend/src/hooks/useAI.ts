/**
 * AI design assistant hook for the Wallet Pass Studio.
 *
 * Provides AI-powered template generation, color suggestions,
 * design critique, and stamp icon recommendations by calling
 * the Loyallia backend API.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { aiApi } from '@/lib/api';
import type {
  WalletPassStudioState,
  CardType,
  Industry,
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

export interface AIColorPalette {
  name: string;
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
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
  ) => Promise<AIColorPalette[]>;
  critiqueDesign: (state: WalletPassStudioState) => Promise<string[]>;
  suggestStampIcons: (businessType: string) => Promise<string[]>;
  reset: () => void;
}

function mapBackendVariations(raw: unknown[]): AIVariation[] {
  return raw.map((item: any, idx: number) => ({
    id: `ai-variation-${idx}-${Date.now()}`,
    name: item.name || 'Variación',
    description: item.description || '',
    confidence: item.confidence ?? 0.8,
    design: item.design || {},
  }));
}

function mapBackendPalettes(raw: unknown[]): AIColorPalette[] {
  return raw.map((item: any) => ({
    name: item.name || 'Paleta',
    primary: item.primary || '#2C3E50',
    secondary: item.secondary || '#95A5A6',
    background: item.background || '#FFFFFF',
    text: item.text || '#2C3E50',
    accent: item.accent || '#3498DB',
  }));
}

export function useAI(options?: UseAIOptions): UseAIReturn {
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
        setError('La funcionalidad de IA no está habilitada.');
        return [];
      }
      if (!description.trim()) {
        setError('Por favor, describe tu negocio para generar diseños.');
        return [];
      }

      setError(null);
      setIsLoading(true);
      abortRef.current = new AbortController();

      try {
        const resp = await aiApi.generateTemplate({
          description,
          card_type: cardType,
          industry,
          language: 'es',
        });

        setQuota((prev) => ({
          used: Math.min(prev.used + 1, prev.limit),
          limit: prev.limit,
        }));

        const data = resp.data?.data || [];
        return mapBackendVariations(data);
      } catch (err: any) {
        const message = err?.response?.data?.message || err?.message || 'Error desconocido';
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
    ): Promise<AIColorPalette[]> => {
      if (!enabled) {
        setError('La funcionalidad de IA no está habilitada.');
        return [];
      }
      if (!description.trim()) {
        setError('Por favor, describe tu negocio para sugerir colores.');
        return [];
      }

      setError(null);
      setIsLoading(true);
      abortRef.current = new AbortController();

      try {
        const resp = await aiApi.suggestColors({
          description,
          industry,
        });

        const data = resp.data?.data || [];
        return mapBackendPalettes(data);
      } catch (err: any) {
        const message = err?.response?.data?.message || err?.message || 'Error desconocido';
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
        setError('La funcionalidad de IA no está habilitada.');
        return [];
      }

      setError(null);
      setIsLoading(true);
      abortRef.current = new AbortController();

      try {
        const resp = await aiApi.critiqueDesign({
          design_data: state as Record<string, unknown>,
        });

        const data = resp.data?.data || [];
        return Array.isArray(data) ? data : [];
      } catch (err: any) {
        const message = err?.response?.data?.message || err?.message || 'Error desconocido';
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
        setError('La funcionalidad de IA no está habilitada.');
        return [];
      }
      if (!businessType.trim()) {
        setError('Por favor, indica el tipo de negocio.');
        return [];
      }

      setError(null);
      setIsLoading(true);
      abortRef.current = new AbortController();

      try {
        const resp = await aiApi.suggestStampIcons({
          business_type: businessType,
        });

        const data = resp.data?.data || [];
        return Array.isArray(data) ? data : [];
      } catch (err: any) {
        const message = err?.response?.data?.message || err?.message || 'Error desconocido';
        setError(message);
        return [];
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
    reset,
  };
}
