/**
 * AI design assistant hook for the Wallet Pass Studio.
 *
 * Provides mock AI-powered template generation, color suggestions,
 * and design critique with loading/error states and quota tracking.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
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
    description: string
  ) => Promise<Array<{ background: string; foreground: string; label: string; accent: string }>>;
  critiqueDesign: (state: WalletPassStudioState) => Promise<string[]>;
  reset: () => void;
}

const MOCK_COLOR_PALETTES: Array<{ background: string; foreground: string; label: string; accent: string }> = [
  {
    background: '#6B4226',
    foreground: '#FFFFFF',
    label: '#F5DEB3',
    accent: '#D2691E',
  },
  {
    background: '#1A1A2E',
    foreground: '#FFFFFF',
    label: '#E94560',
    accent: '#E94560',
  },
  {
    background: '#0D1117',
    foreground: '#C9D1D9',
    label: '#8B949E',
    accent: '#58A6FF',
  },
];

const MOCK_CRITIQUE_SUGGESTIONS = [
  'Aumenta el contraste entre el fondo y el texto principal para mejorar la legibilidad.',
  'Considera usar un color de acento más vibrante para destacar las llamadas a la acción.',
  'El espaciado entre campos podría ser más uniforme para una apariencia más profesional.',
  'Añade un logo para reforzar la identidad de marca en el pase.',
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateMockVariations(
  description: string,
  cardType: CardType,
  industry: Industry
): AIVariation[] {
  const baseColors: WalletColors[] = [
    {
      background: '#6B4226',
      foreground: '#FFFFFF',
      label: '#F5DEB3',
      accent: '#D2691E',
    },
    {
      background: '#1A1A1A',
      foreground: '#FFFFFF',
      label: '#B0B0B0',
      accent: '#C0A062',
    },
    {
      background: '#0D1117',
      foreground: '#C9D1D9',
      label: '#8B949E',
      accent: '#58A6FF',
    },
  ];

  const names = ['Café Cálido', 'Industrial Oscuro', 'Minimal'];
  const descriptions = [
    `Diseño cálido inspirado en "${description.slice(0, 30)}..."`,
    'Estilo industrial con tonos oscuros y metálicos',
    'Diseño minimalista con énfasis en la claridad',
  ];

  return names.map((name, idx) => ({
    id: `ai-variation-${idx}-${Date.now()}`,
    name,
    description: descriptions[idx],
    confidence: 9.1 - idx * 0.2,
    design: {
      cardType,
      industry,
      colors: baseColors[idx],
      name: `${name} - ${description.slice(0, 20)}`,
    },
  }));
}

export function useAI(options?: UseAIOptions): UseAIReturn {
  const enabled = options?.enabled ?? true;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState({ used: 3, limit: 10 });
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
        await delay(1200);

        if (abortRef.current.signal.aborted) {
          return [];
        }

        setQuota((prev) => ({
          used: Math.min(prev.used + 1, prev.limit),
          limit: prev.limit,
        }));

        return generateMockVariations(description, cardType, industry);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
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
      description: string
    ): Promise<Array<{ background: string; foreground: string; label: string; accent: string }>> => {
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
        await delay(800);

        if (abortRef.current.signal.aborted) {
          return [];
        }

        return MOCK_COLOR_PALETTES;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
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
        await delay(1000);

        if (abortRef.current.signal.aborted) {
          return [];
        }

        const suggestions = [...MOCK_CRITIQUE_SUGGESTIONS];

        // Add contextual suggestion based on contrast
        if (state.colors.background === state.colors.foreground) {
          suggestions.push('El color de fondo y el texto no pueden ser idénticos.');
        }

        return suggestions;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
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
    reset,
  };
}
