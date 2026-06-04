/**
 * AI Design Assistant Modal for the Wallet Pass Studio.
 *
 * Per SRS-003 Section 3 mockup:
 * - Textarea for business description
 * - Quick suggestion chips
 * - Card type & industry dropdowns
 * - Generate button with loading state
 * - Results grid with 3 variation cards
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useAI } from '@/hooks/useAI';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { LockedFeature } from '@/components/shared/LockedFeature';
import { LimitReached } from '@/components/shared/LimitReached';
import type {
  CardType,
  Industry,
  WalletPassStudioState,
} from '@/components/wallet/types/unified-state';
import { CARD_TYPE_METADATA, INDUSTRY_METADATA } from '@/components/wallet/constants';
import type { AIVariation } from '@/hooks/useAI';

export interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (variation: AIVariation) => void;
  initialCardType?: CardType;
  initialIndustry?: Industry;
}

const QUICK_SUGGESTIONS = [
  'Café acogedor con tonos tierra',
  'Salón elegante, dorado y blanco',
  'Tienda tech moderna',
];

/* ── Inline icons ────────────────────────────────────────────────── */

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function SmartphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function ColorStrip({ colors }: { colors: { background: string; foreground: string; label: string; accent: string } }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">Paleta:</span>
      <div className="flex rounded overflow-hidden border border-neutral-200 dark:border-neutral-700">
        <div className="w-4 h-4" style={{ backgroundColor: colors.background }} />
        <div className="w-4 h-4" style={{ backgroundColor: colors.foreground }} />
        <div className="w-4 h-4" style={{ backgroundColor: colors.label }} />
        <div className="w-4 h-4" style={{ backgroundColor: colors.accent }} />
      </div>
    </div>
  );
}

function VariationCard({
  variation,
  onSelect,
}: {
  variation: AIVariation;
  onSelect: (v: AIVariation) => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      {/* iPhone preview placeholder */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-1">
          <SmartphoneIcon className="w-8 h-8 text-neutral-400" />
          <span className="text-[10px] text-neutral-400">iPhone</span>
        </div>
      </div>

      {/* Name */}
      <h4 className="text-sm font-semibold text-center text-neutral-900 dark:text-neutral-100">
        {variation.name}
      </h4>

      {/* Pixel preview placeholder */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-1">
          <SmartphoneIcon className="w-6 h-6 text-neutral-400 rotate-90" />
          <span className="text-[10px] text-neutral-400">Pixel preview</span>
        </div>
      </div>

      {/* Color palette */}
      {variation.design.colors && (
        <ColorStrip colors={variation.design.colors as { background: string; foreground: string; label: string; accent: string }} />
      )}

      {/* Score */}
      <div className="text-xs text-center font-medium text-neutral-600 dark:text-neutral-300">
        Score: {variation.confidence.toFixed(1)}/10
      </div>

      {/* Select button */}
      <button
        type="button"
        onClick={() => onSelect(variation)}
        className="w-full px-3 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        Seleccionar
      </button>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */

export function AIChatModal({
  isOpen,
  onClose,
  onApplyTemplate,
  initialCardType = 'stamp',
  initialIndustry = 'food',
}: AIChatModalProps) {
  const plan = usePlanFeatures();
  const { isLoading, error, quota, generateTemplate, reset } = useAI({ enabled: true });
  const [description, setDescription] = useState('');
  const [cardType, setCardType] = useState<CardType>(initialCardType);
  const [industry, setIndustry] = useState<Industry>(initialIndustry);
  const [results, setResults] = useState<AIVariation[]>([]);

  const handleClose = useCallback(() => {
    reset();
    setResults([]);
    onClose();
  }, [reset, onClose]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setDescription(suggestion);
  }, []);

  const handleGenerate = useCallback(async () => {
    setResults([]);
    const variations = await generateTemplate(description, cardType, industry);
    if (variations.length > 0) {
      setResults(variations);
    }
  }, [description, cardType, industry, generateTemplate]);

  const handleSelectVariation = useCallback(
    (variation: AIVariation) => {
      onApplyTemplate(variation);
      handleClose();
    },
    [onApplyTemplate, handleClose]
  );

  if (!isOpen) return null;

  // Plan gating
  if (!plan.wallet_pass_studio) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
        <div className="relative z-10 w-full max-w-md">
          <LockedFeature
            featureName="Diseñar con inteligencia artificial"
            requiredPlan="Profesional o superior"
            onUpgrade={() => {
              /* TODO: open upgrade modal */
            }}
          />
        </div>
      </div>
    );
  }

  if (plan.usage.wallet_ai_designs_month >= plan.limits.wallet_ai_designs_month) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
        <div className="relative z-10 w-full max-w-md">
          <LimitReached
            limitName="diseños con IA"
            current={plan.usage.wallet_ai_designs_month}
            limit={plan.limits.wallet_ai_designs_month}
            onUpgrade={() => {
              /* TODO: open upgrade modal */
            }}
          />
        </div>
      </div>
    );
  }

  const cardTypeOptions = Object.entries(CARD_TYPE_METADATA).map(([key, meta]) => ({
    value: key as CardType,
    label: meta.label,
  }));

  const industryOptions = Object.entries(INDUSTRY_METADATA).map(([key, meta]) => ({
    value: key as Industry,
    label: meta.label,
  }));

  const canGenerate = description.trim().length > 0 && !isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-chat-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2
            id="ai-chat-title"
            className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2"
          >
            <SparklesIcon className="w-5 h-5 text-purple-500" />
            Diseña tu tarjeta con inteligencia artificial
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Cerrar"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Description textarea */}
          <div className="space-y-2">
            <label htmlFor="ai-description" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Describe tu negocio:
            </label>
            <textarea
              id="ai-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Gimnasio de CrossFit con ambiente industrial... colores negro mate, rojo y gris metálico"
              className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 border-neutral-300 dark:border-neutral-700 resize-none"
            />
          </div>

          {/* Quick suggestions */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Sugerencias rápidas (haz click):
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 text-xs font-medium rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-800 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                >
                  &ldquo;{suggestion}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="ai-card-type" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Tipo de tarjeta:
              </label>
              <select
                id="ai-card-type"
                value={cardType}
                onChange={(e) => setCardType(e.target.value as CardType)}
                className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-purple-500 border-neutral-300 dark:border-neutral-700"
              >
                {cardTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="ai-industry" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Industria:
              </label>
              <select
                id="ai-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value as Industry)}
                className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-purple-500 border-neutral-300 dark:border-neutral-700"
              >
                {industryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate button */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white rounded-xl transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{
                background: 'linear-gradient(to right, #7c3aed, #818cf8)',
              }}
            >
              {isLoading ? (
                <LoaderIcon className="w-4 h-4 animate-spin" />
              ) : (
                <SparklesIcon className="w-4 h-4" />
              )}
              <span>Generar diseños</span>
            </button>

            {/* Quota indicator */}
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Usos: {quota.used} / {quota.limit}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wide">
                Resultados
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {results.map((variation) => (
                  <VariationCard
                    key={variation.id}
                    variation={variation}
                    onSelect={handleSelectVariation}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
