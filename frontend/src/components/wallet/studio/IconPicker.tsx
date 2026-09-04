/**
 * Icon picker modal for selecting icons from the icon library.
 *
 * Supports category filtering, search by name, and visual selection.
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import type { IconDefinition, IconCategory } from '@/components/wallet/icon-library';
import { ICON_LIBRARY, getIconsByCategory, searchIcons } from '@/components/wallet/icon-library';
import { getLucideIcon } from '@/components/wallet/lucide-icon-map';

export interface IconPickerProps {
  value: string;
  onChange: (iconId: string) => void;
  category?: IconCategory | 'all';
  allowUpload?: boolean;
}

const CATEGORY_LABELS: Record<IconCategory | 'all', string> = {
  all: 'wallet.studio.iconPicker.categoryAll',
  food: 'wallet.studio.iconPicker.categoryFood',
  retail: 'wallet.studio.iconPicker.categoryRetail',
  transport: 'wallet.studio.iconPicker.categoryTransport',
  health: 'wallet.studio.iconPicker.categoryHealth',
  finance: 'wallet.studio.iconPicker.categoryFinance',
  social: 'wallet.studio.iconPicker.categorySocial',
  nature: 'wallet.studio.iconPicker.categoryNature',
  technology: 'wallet.studio.iconPicker.categoryTechnology',
  stamp: 'wallet.studio.iconPicker.categoryStamp',
  badge: 'wallet.studio.iconPicker.categoryBadge',
  decorative: 'wallet.studio.iconPicker.categoryDecorative',
};

const CATEGORY_ORDER: Array<IconCategory | 'all'> = [
  'all',
  'stamp',
  'badge',
  'food',
  'retail',
  'social',
  'nature',
  'technology',
  'health',
  'finance',
  'transport',
  'decorative',
];

function IconPreview({ icon, className }: { icon: IconDefinition; className?: string }) {
  // 1. Use inline SVG path if available
  if (icon.svgPath) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={icon.svgPath} />
      </svg>
    );
  }

  // 2. Use lucide-react icon if mapped
  if (icon.lucideName) {
    const LucideIcon = getLucideIcon(icon.lucideName);
    if (LucideIcon) {
      return <LucideIcon className={className} strokeWidth={2} />;
    }
  }

  // 3. Fallback to first letter
  return (
    <div
      className={`${className} flex items-center justify-center text-xs font-bold text-neutral-500 dark:text-neutral-400`}
    >
      {icon.name.charAt(0).toUpperCase()}
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function IconPicker({ value, onChange, category = 'all', allowUpload }: IconPickerProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<IconCategory | 'all'>(category);

  const filteredIcons = useMemo(() => {
    let icons = activeCategory === 'all' ? ICON_LIBRARY : getIconsByCategory(activeCategory);
    if (searchQuery.trim()) {
      const searchResults = searchIcons(searchQuery);
      const searchIds = new Set(searchResults.map((i) => i.id));
      icons = icons.filter((i) => searchIds.has(i.id));
    }
    return icons;
  }, [activeCategory, searchQuery]);

  const selectedIcon = useMemo(() => {
    return ICON_LIBRARY.find((i) => i.id === value);
  }, [value]);

  const handleSelect = useCallback(
    (iconId: string) => {
      onChange(iconId);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onChange]
  );

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setActiveCategory(category);
    setSearchQuery('');
  }, [category]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors w-full"
        data-testid="icon-picker-trigger"
      >
        {selectedIcon ? (
          <>
            <IconPreview icon={selectedIcon} className="w-5 h-5" />
            <span className="text-sm truncate">{selectedIcon.name}</span>
          </>
        ) : (
          <span className="text-sm text-neutral-400 dark:text-neutral-500">{t('wallet.studio.iconPicker.selectIcon')}</span>
        )}
      </button>

      {allowUpload && (
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
          {t('wallet.studio.iconPicker.uploadHint')}
        </p>
      )}

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
          data-testid="icon-picker-modal"
        >
          <div
            className="w-full max-w-lg max-h-[70vh] bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                {t('wallet.studio.iconPicker.title')}
              </h3>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label={t('common.close')}
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('wallet.studio.iconPicker.search')}
                  maxLength={100}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  data-testid="icon-picker-search"
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex overflow-x-auto px-2 py-2 border-b border-neutral-200 dark:border-neutral-800 gap-1">
              {CATEGORY_ORDER.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                  data-testid={`category-tab-${cat}`}
                >
                  {t(CATEGORY_LABELS[cat])}
                </button>
              ))}
            </div>

            {/* Icon grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredIcons.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8">
                  {t('wallet.studio.iconPicker.noIcons')}
                </p>
              ) : (
                <div className="grid grid-cols-6 gap-2">
                  {filteredIcons.map((icon) => {
                    const isSelected = icon.id === value;
                    return (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => handleSelect(icon.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 bg-white dark:bg-neutral-800'
                        }`}
                        title={icon.name}
                        data-testid={`icon-option-${icon.id}`}
                      >
                        <IconPreview
                          icon={icon}
                          className={`w-6 h-6 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-600 dark:text-neutral-300'}`}
                        />
                        <span className="text-[9px] text-neutral-500 dark:text-neutral-400 truncate w-full text-center">
                          {icon.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 text-center">
              {t('wallet.studio.iconPicker.iconCount', { count: filteredIcons.length })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
