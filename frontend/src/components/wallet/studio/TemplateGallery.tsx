/**
 * Template Gallery
 *
 * Full-screen overlay for browsing, filtering and selecting wallet pass
 * templates. Three tabs: Sistema, Mis Plantillas, Generadas por IA.
 * Category chips filter by card type; grid is keyboard navigable.
 */

'use client';

import React from 'react';
import toast from 'react-hot-toast';
import { useI18n } from '@/lib/i18n';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { WalletTemplate } from '@/components/wallet/types/templates';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';
import {
  SYSTEM_TEMPLATES,
  TEMPLATE_CATEGORIES,
  INDUSTRY_FILTER_OPTIONS,
  CARD_TYPE_FILTER_OPTIONS,
} from '@/components/wallet/templates/registry';
import { apiToWalletTemplate, type ApiTemplate } from '@/components/wallet/templates/gallery-api';
import { walletTemplatesApi } from '@/lib/api';
import { TemplateCard } from './TemplateCard';
import { TemplatePreviewModal } from './TemplatePreviewModal';

export interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: WalletTemplate) => void;
  onCreateBlank: () => void;
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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 13.5 8.5 19 10 13.5 11.5 12 17 10.5 11.5 5 10 10.5 8.5 12 3Z" />
      <path d="M5 16 5.75 18.25 8 19 5.75 19.75 5 22 4.25 19.75 2 19 4.25 18.25 5 16Z" />
    </svg>
  );
}

/* ── Types ───────────────────────────────────────────────────────── */

type GalleryFilterId = 'system' | 'user' | 'ai';

interface EnrichedTemplate {
  template: WalletTemplate;
  designState?: WalletPassStudioState;
  isFavorite: boolean;
  usageCount: number;
}

/* ── Component ───────────────────────────────────────────────────── */

export function TemplateGallery({ isOpen, onClose, onSelectTemplate, onCreateBlank }: TemplateGalleryProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = React.useState<GalleryFilterId>('system');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [industryFilter, setIndustryFilter] = React.useState('all');
  const [cardTypeFilter, setCardTypeFilter] = React.useState('all');
  const [activeCategory, setActiveCategory] = React.useState('all');
  const [previewItem, setPreviewItem] = React.useState<EnrichedTemplate | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [renameItem, setRenameItem] = React.useState<EnrichedTemplate | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [deleteItem, setDeleteItem] = React.useState<EnrichedTemplate | null>(null);

  const [userTemplates, setUserTemplates] = React.useState<EnrichedTemplate[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const tRef = React.useRef(t);
  tRef.current = t;

  const rootRef = React.useRef<HTMLDivElement>(null);
  const renameInputRef = React.useRef<HTMLInputElement>(null);
  const renameDialogRef = React.useRef<HTMLDivElement>(null);
  const deleteDialogRef = React.useRef<HTMLDivElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);

  useFocusTrap({
    isOpen,
    onEscape: onClose,
    containerRef: rootRef,
    modalId: 'gallery',
  });
  useFocusTrap({
    isOpen: renameItem !== null,
    onEscape: () => setRenameItem(null),
    containerRef: renameDialogRef,
    modalId: 'gallery-preview',
  });
  useFocusTrap({
    isOpen: deleteItem !== null,
    onEscape: () => setDeleteItem(null),
    containerRef: deleteDialogRef,
    modalId: 'gallery-preview',
  });

  React.useEffect(() => {
    if (renameItem) renameInputRef.current?.focus();
  }, [renameItem]);

  const handleRootKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') e.stopPropagation();
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    if (activeTab !== 'system') {
      setIsLoading(true);
      walletTemplatesApi
        .list()
        .then((res) => {
          // List is intentionally lite (no design_state). Detail loads on apply.
          const items = ((res.data as unknown) as ApiTemplate[]).map((api) => ({
            template: apiToWalletTemplate(api),
            designState: undefined,
            isFavorite: api.is_favorite,
            usageCount: api.usage_count,
          }));
          setUserTemplates(items);
        })
        .catch(() => {
          toast.error(tRef.current('templateGallery.loadError'));
          setUserTemplates([]);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, activeTab]);

  /** Arrow-key grid navigation across template card buttons. */
  const handleGridKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      return;
    }
    const grid = gridRef.current;
    if (!grid) return;
    const buttons = Array.from(
      grid.querySelectorAll<HTMLButtonElement>('button[data-template-card-btn]')
    );
    if (buttons.length === 0) return;
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    e.preventDefault();
    let next = current;
    if (e.key === 'ArrowRight') next = Math.min(buttons.length - 1, current + 1);
    if (e.key === 'ArrowLeft') next = Math.max(0, current - 1);
    if (e.key === 'ArrowDown') next = Math.min(buttons.length - 1, current + 1);
    if (e.key === 'ArrowUp') next = Math.max(0, current - 1);
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = buttons.length - 1;
    if (next < 0) next = 0;
    buttons[next]?.focus();
  }, []);

  if (!isOpen) return null;

  const categoryDef = TEMPLATE_CATEGORIES.find((c) => c.id === activeCategory);

  const matchesSearch = (template: WalletTemplate, q: string) =>
    !q ||
    template.name.toLowerCase().includes(q) ||
    template.description.toLowerCase().includes(q) ||
    template.tags.some((tag) => tag.toLowerCase().includes(q));

  const filteredSystem = SYSTEM_TEMPLATES.filter((template) => {
    const q = searchQuery.trim().toLowerCase();
    if (!matchesSearch(template, q)) return false;
    if (industryFilter !== 'all' && template.industry !== industryFilter) return false;
    if (cardTypeFilter !== 'all' && template.cardType !== cardTypeFilter) return false;
    if (categoryDef && activeCategory !== 'all' && !categoryDef.filter(template)) return false;
    return true;
  });

  const filteredUser = userTemplates.filter((item) => {
    const template = item.template;
    if (activeTab === 'ai' && !template.tags.includes('ai-generated')) return false;
    if (activeTab === 'user' && template.tags.includes('ai-generated')) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!matchesSearch(template, q)) return false;
    if (industryFilter !== 'all' && template.industry !== industryFilter) return false;
    if (cardTypeFilter !== 'all' && template.cardType !== cardTypeFilter) return false;
    return true;
  });

  const displayTemplates: EnrichedTemplate[] =
    activeTab === 'system'
      ? filteredSystem.map((tpl) => ({ template: tpl, isFavorite: false, usageCount: 0 }))
      : filteredUser;

  const handleSelect = (item: EnrichedTemplate) => {
    setSelectedId(item.template.id);
    onSelectTemplate(item.template);
    setPreviewItem(null);
  };

  const handleRename = async (item: EnrichedTemplate) => {
    setRenameItem(item);
    setRenameValue(item.template.name);
  };

  const confirmRename = async () => {
    const item = renameItem;
    const newName = renameValue.trim();
    if (!item || !newName || newName === item.template.name) {
      setRenameItem(null);
      return;
    }
    try {
      await walletTemplatesApi.update(item.template.id, { name: newName });
      toast.success(t('templateGallery.renameSuccess'));
      setUserTemplates((prev) =>
        prev.map((p) =>
          p.template.id === item.template.id
            ? { ...p, template: { ...p.template, name: newName } }
            : p
        )
      );
    } catch {
      toast.error(t('templateGallery.renameError'));
    }
    setRenameItem(null);
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
          fields: item.template.fields,
          cardTypeConfig: item.template.cardTypeConfig,
          barcode: item.template.barcode,
          backContent: item.template.backContent,
          apple: item.template.apple,
          google: item.template.google,
        }) as Record<string, unknown>,
        tags: item.template.tags,
      });
      toast.success(t('templateGallery.duplicateSuccess'));
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
      toast.error(t('templateGallery.duplicateError'));
    }
  };

  const handleDelete = async (item: EnrichedTemplate) => {
    setDeleteItem(item);
  };

  const confirmDelete = async () => {
    const item = deleteItem;
    if (!item) return;
    try {
      await walletTemplatesApi.delete(item.template.id);
      toast.success(t('templateGallery.deleteSuccess'));
      setUserTemplates((prev) => prev.filter((p) => p.template.id !== item.template.id));
    } catch {
      toast.error(t('templateGallery.deleteError'));
    }
    setDeleteItem(null);
  };

  const handleToggleFavorite = async (item: EnrichedTemplate) => {
    try {
      await walletTemplatesApi.update(item.template.id, { is_favorite: !item.isFavorite });
      setUserTemplates((prev) =>
        prev.map((p) =>
          p.template.id === item.template.id ? { ...p, isFavorite: !p.isFavorite } : p
        )
      );
    } catch {
      toast.error(t('templateGallery.favoriteError'));
    }
  };

  const tabConfig: { id: GalleryFilterId; label: string }[] = [
    { id: 'system', label: t('templateGallery.tabSystem') },
    { id: 'user', label: t('templateGallery.tabUser') },
    { id: 'ai', label: t('templateGallery.tabAI') },
  ];

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={handleRootKeyDown}
      data-testid="template-gallery"
      className="fixed inset-0 z-50 flex flex-col bg-neutral-50 dark:bg-neutral-950 overflow-y-auto"
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={onClose}
          data-testid="gallery-back-btn"
          className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{t('common.back')}</span>
        </button>

        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm sm:text-base font-semibold text-neutral-900 dark:text-white">
          {t('templateGallery.title')}
        </h1>

        <div className="w-16" />
      </header>

      {/* ── Content ───────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-violet-950/40" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-700 mb-3">
              <SparklesIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[11px] font-semibold tracking-wide uppercase text-blue-700 dark:text-blue-300">
                {t('templateGallery.heroEyebrow')}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-1.5">
              {t('templateGallery.heroTitle')}
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl">
              {t('templateGallery.heroDescription')}
            </p>
          </div>
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
              placeholder={t('templateGallery.searchPlaceholder')}
              aria-label={t('templateGallery.searchPlaceholder')}
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
                aria-label={t('templateGallery.industryFilterLabel')}
                className="appearance-none pl-3 pr-9 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                {INDUSTRY_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
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
                aria-label={t('templateGallery.cardTypeFilterLabel')}
                className="appearance-none pl-3 pr-9 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                {CARD_TYPE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Category chips — Todos + one per card type */}
        <div data-testid="gallery-categories" className="flex flex-wrap gap-2" role="tablist" aria-label={t('templateGallery.categoriesLabel')}>
          {TEMPLATE_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(cat.id)}
                data-testid={`gallery-category-${cat.id}`}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                {t(cat.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Template grid */}
        {isLoading ? (
          <div className="text-center py-16">
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t('common.loading')}</p>
          </div>
        ) : displayTemplates.length > 0 ? (
          <div
            ref={gridRef}
            data-testid="gallery-grid"
            onKeyDown={handleGridKeyDown}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5"
          >
            {displayTemplates.map((item) => (
              <div key={item.template.id} data-template-card-btn>
                <TemplateCard
                  template={item.template}
                  isUserTemplate={activeTab !== 'system'}
                  isFavorite={item.isFavorite}
                  usageCount={item.usageCount}
                  isSelected={selectedId === item.template.id}
                  onClick={() => {
                    setSelectedId(item.template.id);
                    setPreviewItem(item);
                  }}
                  onRename={activeTab !== 'system' ? () => void handleRename(item) : undefined}
                  onDuplicate={activeTab !== 'system' ? () => void handleDuplicate(item) : undefined}
                  onDelete={activeTab !== 'system' ? () => void handleDelete(item) : undefined}
                  onToggleFavorite={
                    activeTab !== 'system' ? () => void handleToggleFavorite(item) : undefined
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <div data-testid="gallery-empty" className="text-center py-16">
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
              {activeTab === 'system'
                ? t('templateGallery.noSystemTemplates')
                : t('templateGallery.noUserTemplates')}
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
            {t('templateGallery.startFromScratch')}
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

      {/* ── Rename dialog ─────────────────────────────────────── */}
      {renameItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('templateGallery.renamePrompt')}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setRenameItem(null)} />
          <div
            ref={renameDialogRef}
            tabIndex={-1}
            className="relative w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              {t('templateGallery.renamePrompt')}
            </h3>
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void confirmRename();
                }
              }}
              maxLength={100}
              data-testid="gallery-rename-input"
              aria-label={t('templateGallery.renamePrompt')}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameItem(null)}
                className="px-3 py-1.5 text-sm rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                data-testid="gallery-rename-cancel"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void confirmRename()}
                className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                data-testid="gallery-rename-confirm"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ────────────────────────────────────── */}
      {deleteItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('templateGallery.deleteTitle')}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteItem(null)} />
          <div
            ref={deleteDialogRef}
            tabIndex={-1}
            className="relative w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              {t('templateGallery.deleteTitle')}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {t('templateGallery.deleteConfirm', { name: deleteItem.template.name })}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                className="px-3 py-1.5 text-sm rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                data-testid="gallery-delete-cancel"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
                data-testid="gallery-delete-confirm"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
