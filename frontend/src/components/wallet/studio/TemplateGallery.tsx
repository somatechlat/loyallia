/**
 * Template Gallery
 *
 * Modal overlay for browsing, filtering, and selecting wallet pass templates.
 * Three tabs: Sistema, Mis Plantillas, Generadas por IA.
 */

'use client';

import React from 'react';
import toast from 'react-hot-toast';
import type { WalletTemplate } from '@/components/wallet/types/templates';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';
import {
  SYSTEM_TEMPLATES,
  TEMPLATE_CATEGORIES,
  INDUSTRY_FILTER_OPTIONS,
  CARD_TYPE_FILTER_OPTIONS,
} from '@/components/wallet/templates/registry';
import { walletTemplatesApi } from '@/lib/api';
import { TemplateCard } from './TemplateCard';
import { TemplatePreviewModal } from './TemplatePreviewModal';

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

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
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

/* ── Types ───────────────────────────────────────────────────────── */

type TabId = 'system' | 'user' | 'ai';

interface ApiTemplate {
  id: string;
  name: string;
  description: string;
  card_type: string;
  industry: string;
  design_state: WalletPassStudioState;
  tags: string[];
  is_favorite: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface EnrichedTemplate {
  template: WalletTemplate;
  designState?: WalletPassStudioState;
  isFavorite: boolean;
  usageCount: number;
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function apiToWalletTemplate(api: ApiTemplate): WalletTemplate {
  const state = api.design_state;
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    type: api.tags.includes('ai-generated') ? 'ai' : 'user',
    cardType: api.card_type as WalletTemplate['cardType'],
    industry: api.industry as WalletTemplate['industry'],
    colors: state?.colors || { background: '#1a1a2e', foreground: '#ffffff', label: '#888888', accent: '#3b82f6' },
    cardTypeConfig: state?.cardTypeConfig || { cardType: api.card_type as WalletTemplate['cardType'] } as WalletTemplate['cardTypeConfig'],
    barcode: state?.barcode || { format: 'QR_CODE', message: '', messageEncoding: 'iso-8859-1' },
    backContent: state?.backContent || { fields: [], links: [] },
    apple: state?.apple || { passStyle: 'storeCard', description: '', organizationName: '' },
    google: state?.google || { passType: 'LoyaltyClass', programName: '', hexBackgroundColor: '#1a1a2e' },
    tags: api.tags,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

/* ── Component ───────────────────────────────────────────────────── */

export function TemplateGallery({ isOpen, onClose, onSelectTemplate, onCreateBlank, onAIGenerate }: TemplateGalleryProps) {
  const [activeTab, setActiveTab] = React.useState<TabId>('system');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [industryFilter, setIndustryFilter] = React.useState('all');
  const [cardTypeFilter, setCardTypeFilter] = React.useState('all');
  const [activeCategory, setActiveCategory] = React.useState('all');
  const [previewItem, setPreviewItem] = React.useState<EnrichedTemplate | null>(null);

  // User templates state
  const [userTemplates, setUserTemplates] = React.useState<EnrichedTemplate[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // Fetch user templates when tab changes to user or ai
  React.useEffect(() => {
    if (!isOpen) return;
    if (activeTab !== 'system') {
      setIsLoading(true);
      walletTemplatesApi
        .list()
        .then((res) => {
          const items = ((res.data as unknown) as ApiTemplate[]).map((api) => ({
            template: apiToWalletTemplate(api),
            designState: api.design_state,
            isFavorite: api.is_favorite,
            usageCount: api.usage_count,
          }));
          setUserTemplates(items);
        })
        .catch(() => {
          toast.error('Error al cargar plantillas');
          setUserTemplates([]);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Filter system templates
  const filteredSystem = SYSTEM_TEMPLATES.filter((template) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!(
        template.name.toLowerCase().includes(q) ||
        template.description.toLowerCase().includes(q) ||
        template.tags.some((t) => t.toLowerCase().includes(q))
      )) return false;
    }
    if (industryFilter !== 'all' && template.industry !== industryFilter) return false;
    if (cardTypeFilter !== 'all' && template.cardType !== cardTypeFilter) return false;
    const categoryDef = TEMPLATE_CATEGORIES.find((c) => c.id === activeCategory);
    if (categoryDef && activeCategory !== 'all' && !categoryDef.filter(template)) return false;
    return true;
  });

  // Filter user templates
  const filteredUser = userTemplates.filter((item) => {
    const template = item.template;
    if (activeTab === 'ai' && !template.tags.includes('ai-generated')) return false;
    if (activeTab === 'user' && template.tags.includes('ai-generated')) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!(
        template.name.toLowerCase().includes(q) ||
        template.description.toLowerCase().includes(q) ||
        template.tags.some((t) => t.toLowerCase().includes(q))
      )) return false;
    }
    if (industryFilter !== 'all' && template.industry !== industryFilter) return false;
    if (cardTypeFilter !== 'all' && template.cardType !== cardTypeFilter) return false;
    return true;
  });

  const displayTemplates: EnrichedTemplate[] = activeTab === 'system'
    ? filteredSystem.map((t) => ({ template: t, isFavorite: false, usageCount: 0 }))
    : filteredUser;

  const handleSelect = (item: EnrichedTemplate) => {
    onSelectTemplate(item.template);
    setPreviewItem(null);
  };

  const handleRename = async (item: EnrichedTemplate) => {
    const newName = window.prompt('Nuevo nombre:', item.template.name);
    if (!newName || newName.trim() === '' || newName.trim() === item.template.name) return;
    try {
      await walletTemplatesApi.update(item.template.id, { name: newName.trim() });
      toast.success('Plantilla renombrada');
      setUserTemplates((prev) =>
        prev.map((p) => (p.template.id === item.template.id ? { ...p, template: { ...p.template, name: newName.trim() } } : p))
      );
    } catch {
      toast.error('Error al renombrar');
    }
  };

  const handleDuplicate = async (item: EnrichedTemplate) => {
    try {
      await walletTemplatesApi.create({
        name: `${item.template.name} (copia)`,
        description: item.template.description,
        card_type: item.template.cardType,
        industry: item.template.industry,
        design_state: (item.designState || {
          colors: item.template.colors,
          cardTypeConfig: item.template.cardTypeConfig,
          barcode: item.template.barcode,
          backContent: item.template.backContent,
          apple: item.template.apple,
          google: item.template.google,
        }) as Record<string, unknown>,
        tags: item.template.tags,
      });
      toast.success('Plantilla duplicada');
      // Refresh list
      const res = await walletTemplatesApi.list();
      setUserTemplates(
        ((res.data as unknown) as ApiTemplate[]).map((api) => ({
          template: apiToWalletTemplate(api),
          designState: api.design_state,
          isFavorite: api.is_favorite,
          usageCount: api.usage_count,
        }))
      );
    } catch {
      toast.error('Error al duplicar');
    }
  };

  const handleDelete = async (item: EnrichedTemplate) => {
    if (!window.confirm(`¿Eliminar "${item.template.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await walletTemplatesApi.delete(item.template.id);
      toast.success('Plantilla eliminada');
      setUserTemplates((prev) => prev.filter((p) => p.template.id !== item.template.id));
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleToggleFavorite = async (item: EnrichedTemplate) => {
    try {
      await walletTemplatesApi.update(item.template.id, { is_favorite: !item.isFavorite });
      setUserTemplates((prev) =>
        prev.map((p) => (p.template.id === item.template.id ? { ...p, isFavorite: !p.isFavorite } : p))
      );
    } catch {
      toast.error('Error al actualizar favorito');
    }
  };

  const tabConfig: { id: TabId; label: string }[] = [
    { id: 'system', label: 'Sistema' },
    { id: 'user', label: 'Mis Plantillas' },
    { id: 'ai', label: 'Generadas por IA' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-50 dark:bg-neutral-950 overflow-y-auto">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={onClose}
          data-testid="gallery-back-btn"
          className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Volver</span>
        </button>

        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm sm:text-base font-semibold text-neutral-900 dark:text-white">
          Wallet Pass Studio
        </h1>

        <div className="w-16" />
      </header>

      {/* ── Content ───────────────────────────────────────────── */}
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

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 w-fit">
          {tabConfig.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setActiveCategory('all');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
              data-testid="gallery-search-input"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                data-testid="gallery-industry-select"
                className="appearance-none pl-3 pr-9 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
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
                data-testid="gallery-cardtype-select"
                className="appearance-none pl-3 pr-9 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
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

        {/* AI button (only on system tab) */}
        {activeTab === 'system' && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">✨ También puedes:</span>
            <button
              type="button"
              onClick={onAIGenerate}
              data-testid="gallery-ai-btn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-400 hover:opacity-90 transition-opacity shadow-md"
            >
              Diseñar con IA
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Category pills (only on system tab) */}
        {activeTab === 'system' && (
          <div data-testid="gallery-categories" className="flex flex-wrap gap-2">
            {TEMPLATE_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  data-testid={`gallery-category-${cat.id}`}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Template grid */}
        {isLoading ? (
          <div className="text-center py-16">
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">Cargando plantillas...</p>
          </div>
        ) : displayTemplates.length > 0 ? (
          <div data-testid="gallery-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayTemplates.map((item) => (
              <TemplateCard
                key={item.template.id}
                template={item.template}
                isUserTemplate={activeTab !== 'system'}
                isFavorite={item.isFavorite}
                usageCount={item.usageCount}
                onClick={() => setPreviewItem(item)}
                onRename={activeTab !== 'system' ? () => handleRename(item) : undefined}
                onDuplicate={activeTab !== 'system' ? () => handleDuplicate(item) : undefined}
                onDelete={activeTab !== 'system' ? () => handleDelete(item) : undefined}
                onToggleFavorite={activeTab !== 'system' ? () => handleToggleFavorite(item) : undefined}
              />
            ))}
          </div>
        ) : (
          <div data-testid="gallery-empty" className="text-center py-16">
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
              {activeTab === 'system' ? 'No se encontraron templates' : 'No tienes plantillas guardadas'}
            </p>
          </div>
        )}

        {/* Blank start button */}
        <div className="flex justify-center pt-4 pb-8">
          <button
            type="button"
            onClick={onCreateBlank}
            data-testid="gallery-blank-btn"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all shadow-sm"
          >
            <PencilIcon className="w-4 h-4" />
            Empezar desde cero
          </button>
        </div>
      </main>

      {/* ── Preview Modal ─────────────────────────────────────── */}
      {previewItem && (
        <TemplatePreviewModal
          template={previewItem.template}
          designState={previewItem.designState}
          onClose={() => setPreviewItem(null)}
          onUse={() => handleSelect(previewItem)}
        />
      )}
    </div>
  );
}
