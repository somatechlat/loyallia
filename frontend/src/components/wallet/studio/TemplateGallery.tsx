/**
 * Template Gallery
 *
 * Modal overlay for browsing, filtering, and selecting wallet pass templates.
 * Per SRS-003 Section 2 and SRS-009.
 */

'use client';

import React from 'react';
import type { WalletTemplate } from '@/components/wallet/types/templates';
import {
  SYSTEM_TEMPLATES,
  TEMPLATE_CATEGORIES,
  INDUSTRY_FILTER_OPTIONS,
  CARD_TYPE_FILTER_OPTIONS,
  getCardTypeLabel,
} from '@/components/wallet/templates/registry';

export interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: WalletTemplate) => void;
  onCreateBlank: () => void;
  onAIGenerate: () => void;
}

/* ── Inline icons ────────────────────────────────────────────────── */

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

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

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
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

function HelpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function getCategoryEmoji(template: WalletTemplate): string {
  if (template.tags.includes('café') || template.tags.includes('bakery') || template.tags.includes('restaurant') || template.tags.includes('food truck')) return '☕';
  if (template.tags.includes('gym')) return '💪';
  if (template.tags.includes('hotel')) return '🏨';
  if (template.tags.includes('salón') || template.tags.includes('barber') || template.tags.includes('spa') || template.tags.includes('laundry')) return '✂️';
  if (template.tags.includes('cinema')) return '🎬';
  if (template.tags.includes('parking')) return '🅿️';
  if (template.tags.includes('pharmacy') || template.tags.includes('health')) return '💊';
  if (template.tags.includes('supermarket') || template.tags.includes('retail') || template.tags.includes('bookstore') || template.tags.includes('pet shop') || template.tags.includes('tech store') || template.tags.includes('florist')) return '🛍️';
  if (template.industry === 'food') return '☕';
  if (template.industry === 'health') return '💪';
  if (template.industry === 'entertainment') return '🎬';
  if (template.industry === 'transport') return '🅿️';
  if (template.industry === 'technology') return '💻';
  return '🎨';
}

function getCategoryLabel(template: WalletTemplate): string {
  if (template.tags.includes('café')) return 'CAFÉ';
  if (template.tags.includes('gym')) return 'GYM';
  if (template.tags.includes('hotel')) return 'HOTEL';
  if (template.tags.includes('salón')) return 'SALÓN';
  if (template.tags.includes('barber')) return 'BARBER';
  if (template.tags.includes('spa')) return 'SPA';
  if (template.tags.includes('cinema')) return 'CINE';
  if (template.tags.includes('parking')) return 'PARKING';
  if (template.tags.includes('pharmacy')) return 'FARMACIA';
  if (template.tags.includes('supermarket')) return 'SUPER';
  if (template.tags.includes('bookstore')) return 'LIBRERÍA';
  if (template.tags.includes('pet shop')) return 'PET SHOP';
  if (template.tags.includes('tech store')) return 'TECH';
  if (template.tags.includes('florist')) return 'FLORIST';
  if (template.tags.includes('bakery')) return 'PANADERÍA';
  if (template.tags.includes('restaurant')) return 'RESTAURANT';
  if (template.tags.includes('food truck')) return 'FOOD TRUCK';
  if (template.tags.includes('laundry')) return 'LAVANDERÍA';
  if (template.industry === 'retail') return 'RETAIL';
  if (template.industry === 'food') return 'CAFÉ';
  if (template.industry === 'health') return 'SALUD';
  if (template.industry === 'services') return 'SERVICIOS';
  if (template.industry === 'entertainment') return 'ENTRETENIMIENTO';
  if (template.industry === 'transport') return 'TRANSPORTE';
  if (template.industry === 'technology') return 'TECH';
  return 'GENERAL';
}

/* ── Component ───────────────────────────────────────────────────── */

export function TemplateGallery({ isOpen, onClose, onSelectTemplate, onCreateBlank, onAIGenerate }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [industryFilter, setIndustryFilter] = React.useState('all');
  const [cardTypeFilter, setCardTypeFilter] = React.useState('all');
  const [activeCategory, setActiveCategory] = React.useState('all');
  const [previewTemplate, setPreviewTemplate] = React.useState<WalletTemplate | null>(null);

  if (!isOpen) return null;

  const filteredTemplates = SYSTEM_TEMPLATES.filter((template) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        template.name.toLowerCase().includes(q) ||
        template.description.toLowerCase().includes(q) ||
        template.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    // Industry dropdown
    if (industryFilter !== 'all' && template.industry !== industryFilter) return false;

    // Card type dropdown
    if (cardTypeFilter !== 'all' && template.cardType !== cardTypeFilter) return false;

    // Category pill
    const categoryDef = TEMPLATE_CATEGORIES.find((c) => c.id === activeCategory);
    if (categoryDef && activeCategory !== 'all' && !categoryDef.filter(template)) return false;

    return true;
  });

  const handleSelect = (template: WalletTemplate) => {
    onSelectTemplate(template);
    setPreviewTemplate(null);
  };

  const handleCardClick = (template: WalletTemplate) => {
    setPreviewTemplate(template);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-50 dark:bg-neutral-950 overflow-y-auto">
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
          data-testid="gallery-back-btn"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Volver</span>
        </button>

        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm sm:text-base font-semibold text-neutral-900 dark:text-white">
          Wallet Pass Studio
        </h1>

        <button
          type="button"
          className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Ayuda"
        >
          <HelpIcon className="w-5 h-5" />
        </button>
      </header>

      {/* ── Content ───────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Hero banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mb-1">
            🎨 Elige un diseño para comenzar
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Los templates incluyen colores, imágenes y campos preconfigurados. Puedes personalizar todo después.
          </p>
        </div>

        {/* Search & filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar templates..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              data-testid="gallery-search-input"
            />
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="appearance-none pl-3 pr-9 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                data-testid="gallery-industry-select"
              >
                {INDUSTRY_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={cardTypeFilter}
                onChange={(e) => setCardTypeFilter(e.target.value)}
                className="appearance-none pl-3 pr-9 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                data-testid="gallery-cardtype-select"
              >
                {CARD_TYPE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* AI button */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">✨ También puedes:</span>
          <button
            type="button"
            onClick={onAIGenerate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-400 hover:opacity-90 transition-opacity shadow-md"
            data-testid="gallery-ai-btn"
          >
            Diseñar con IA
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2" data-testid="gallery-categories">
          {TEMPLATE_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
                data-testid={`gallery-category-${cat.id}`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Template grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="gallery-grid">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleCardClick(template)}
                className="group text-left bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 transition-all duration-200 hover:scale-[1.03] hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-950"
                data-testid={`template-card-${template.id}`}
              >
                {/* Category badge */}
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-base">{getCategoryEmoji(template)}</span>
                  <span className="text-xs font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 uppercase">
                    {getCategoryLabel(template)}
                  </span>
                </div>

                {/* Preview thumbnail */}
                <div
                  className="w-full aspect-[4/3] rounded-xl mb-3 flex items-center justify-center border border-neutral-100 dark:border-neutral-800"
                  style={{ backgroundColor: template.colors.background }}
                  data-testid={`template-preview-${template.id}`}
                >
                  <div className="text-center px-4">
                    <div
                      className="text-xs font-medium uppercase tracking-wider mb-1 opacity-70"
                      style={{ color: template.colors.label }}
                    >
                      {getCardTypeLabel(template.cardType)}
                    </div>
                    <div
                      className="text-lg font-bold"
                      style={{ color: template.colors.foreground }}
                    >
                      {template.name}
                    </div>
                    <div
                      className="mt-2 w-16 h-1 rounded-full mx-auto"
                      style={{ backgroundColor: template.colors.accent }}
                    />
                  </div>
                </div>

                {/* Info */}
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-0.5">
                  {template.name}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                  {template.description}
                </p>

                {/* Usar button */}
                <span className="inline-flex items-center justify-center w-full py-2 rounded-lg text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  Usar
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16" data-testid="gallery-empty">
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">No se encontraron templates</p>
          </div>
        )}

        {/* Blank start button */}
        <div className="flex justify-center pt-4 pb-8">
          <button
            type="button"
            onClick={onCreateBlank}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all shadow-sm"
            data-testid="gallery-blank-btn"
          >
            <PencilIcon className="w-4 h-4" />
            Empezar desde cero
          </button>
        </div>
      </main>

      {/* ── Preview Modal ─────────────────────────────────────────── */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPreviewTemplate(null)}
            data-testid="preview-backdrop"
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            {/* Preview header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Vista previa
              </h3>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Cerrar vista previa"
                data-testid="preview-close-btn"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Large preview */}
            <div className="p-6">
              <div
                className="w-full aspect-[3/4] rounded-2xl flex flex-col items-center justify-center border border-neutral-100 dark:border-neutral-800 mb-4"
                style={{ backgroundColor: previewTemplate.colors.background }}
                data-testid="preview-large"
              >
                <span className="text-3xl mb-3">{getCategoryEmoji(previewTemplate)}</span>
                <div
                  className="text-xs font-medium uppercase tracking-wider mb-1 opacity-70"
                  style={{ color: previewTemplate.colors.label }}
                >
                  {getCardTypeLabel(previewTemplate.cardType)}
                </div>
                <div
                  className="text-xl font-bold mb-1"
                  style={{ color: previewTemplate.colors.foreground }}
                >
                  {previewTemplate.name}
                </div>
                <div
                  className="text-sm opacity-80 mb-4"
                  style={{ color: previewTemplate.colors.foreground }}
                >
                  {previewTemplate.description}
                </div>
                <div
                  className="w-20 h-1.5 rounded-full"
                  style={{ backgroundColor: previewTemplate.colors.accent }}
                />
              </div>

              <button
                type="button"
                onClick={() => handleSelect(previewTemplate)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
                data-testid="preview-use-btn"
              >
                Usar este diseño
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
