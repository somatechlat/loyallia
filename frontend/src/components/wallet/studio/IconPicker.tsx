/**
 * Icon picker — gallery of stamp shapes and motifs.
 *
 * Two tabs (Formas / Iconos), live filled+empty preview, search, category
 * filter, keyboard navigation and full aria labelling. Palette, type and
 * radii come from the wallet design system.
 */

'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { IconDefinition, IconCategory, StampMotifGroup } from '@/components/wallet/icon-library';
import {
  STAMP_MOTIF_ICONS,
  STAMP_SHAPE_ICONS,
  getIconsByCategory,
  searchIcons,
  getIconById,
} from '@/components/wallet/icon-library';
import { getCardPalette, CARD_TYPE_SCALE, CARD_RADIUS, CARD_SHADOW } from '@/components/wallet/design-system';
import { IconRenderer } from '@/components/wallet/IconRenderer';

export interface IconPickerProps {
  value: string;
  onChange: (iconId: string) => void;
  category?: IconCategory | 'all';
  allowUpload?: boolean;
  /** Card type for the live preview accent. */
  cardType?: string;
}

type PickerTab = 'shapes' | 'motifs';

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

const MOTIF_GROUP_LABELS: Record<StampMotifGroup, string> = {
  food: 'wallet.studio.iconPicker.groupFood',
  retail: 'wallet.studio.iconPicker.groupRetail',
  services: 'wallet.studio.iconPicker.groupServices',
  loyalty: 'wallet.studio.iconPicker.groupLoyalty',
};

const MOTIF_GROUP_ORDER: Array<StampMotifGroup | 'all'> = [
  'all',
  'food',
  'retail',
  'services',
  'loyalty',
];

function IconPreview({
  icon,
  className,
  outline,
  style,
}: {
  icon: IconDefinition;
  className?: string;
  outline?: boolean;
  style?: React.CSSProperties;
}) {
  return <IconRenderer iconId={icon.id} className={className} outline={outline} style={style} />;
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
      aria-hidden="true"
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
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CheckBadge({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z" />
    </svg>
  );
}


/** Translated icon label with fallback to the library name. */
function iconLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  id: string,
  fallback: string,
): string {
  const key = `wallet.studio.icons.${id}`;
  const label = t(key);
  return label === key ? fallback : label;
}

/** Live filled + empty stamp pair for the preview well. */
function StampPairPreview({
  iconId,
  accent,
  accentSoft,
  surface,
  label,
}: {
  iconId: string;
  accent: string;
  accentSoft: string;
  surface: string;
  label: string;
}) {
  return (
    <div
      className="flex items-center gap-2"
      data-testid="icon-picker-preview"
      role="img"
      aria-label={label}
    >
      <span
        className="w-8 h-8 flex items-center justify-center"
        style={{ backgroundColor: accent, borderRadius: 10 }}
        data-testid="icon-picker-preview-filled"
      >
        <IconRenderer iconId={iconId} className="w-4 h-4" style={{ color: surface }} />
      </span>
      <span
        className="w-8 h-8 flex items-center justify-center"
        style={{ backgroundColor: accentSoft, borderRadius: 10 }}
        data-testid="icon-picker-preview-empty"
      >
        <IconRenderer iconId={iconId} outline className="w-4 h-4" style={{ color: accent }} />
      </span>
    </div>
  );
}

export function IconPicker({
  value,
  onChange,
  category = 'all',
  allowUpload,
  cardType = 'stamp',
}: IconPickerProps) {
  const { t } = useI18n();
  const palette = getCardPalette(cardType);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<PickerTab>('motifs');
  const [activeCategory, setActiveCategory] = useState<IconCategory | 'all'>(category);
  const [activeGroup, setActiveGroup] = useState<StampMotifGroup | 'all'>('all');
  const dialogRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useFocusTrap({
    isOpen,
    onEscape: () => setIsOpen(false),
    containerRef: dialogRef,
    modalId: 'icon-picker',
  });

  const filteredIcons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (activeTab === 'shapes') {
      const shapes = STAMP_SHAPE_ICONS.filter((icon) => {
        if (!query) return true;
        return (
          icon.name.toLowerCase().includes(query) ||
          icon.id.toLowerCase().includes(query)
        );
      });
      return shapes;
    }

    if (category !== 'all' && activeCategory === category) {
      let icons = getIconsByCategory(category);
      if (query) {
        const searchIds = new Set(searchIcons(searchQuery).map((i) => i.id));
        icons = icons.filter((i) => searchIds.has(i.id));
      }
      return icons;
    }

    let icons: IconDefinition[];
    if (activeCategory === 'stamp') {
      icons = STAMP_MOTIF_ICONS.filter((icon) => !icon.outline);
    } else if (activeCategory === 'all') {
      icons = STAMP_MOTIF_ICONS.filter((icon) => !icon.outline);
    } else {
      icons = getIconsByCategory(activeCategory);
    }

    if (activeGroup !== 'all') {
      icons = icons.filter((icon) => icon.group === activeGroup);
    }

    if (query) {
      // Search spans the whole library so legacy Lucide ids stay reachable.
      icons = searchIcons(searchQuery);
    }
    return icons;
  }, [activeTab, activeCategory, activeGroup, searchQuery, category]);

  const selectedIcon = useMemo(() => (value ? getIconById(value) : undefined), [value]);

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
    setActiveGroup('all');
    setSearchQuery('');
    setActiveTab(value?.startsWith('shape-') ? 'shapes' : 'motifs');
  }, [category, value]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  // Keyboard navigation across the icon grid
  const handleGridKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const grid = gridRef.current;
    if (!grid) return;
    const buttons = Array.from(
      grid.querySelectorAll<HTMLButtonElement>('button[data-icon-option]')
    );
    if (buttons.length === 0) return;
    const currentIndex = buttons.findIndex((b) => b === document.activeElement);
    const cols = 6;
    let next = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        next = Math.min(currentIndex + 1, buttons.length - 1);
        break;
      case 'ArrowLeft':
        next = Math.max(currentIndex - 1, 0);
        break;
      case 'ArrowDown':
        next = Math.min(currentIndex + cols, buttons.length - 1);
        break;
      case 'ArrowUp':
        next = Math.max(currentIndex - cols, 0);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = buttons.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    buttons[next]?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const first = gridRef.current?.querySelector<HTMLButtonElement>('button[data-icon-option]');
    first?.focus();
  }, [isOpen, activeTab, activeCategory, activeGroup, searchQuery]);

  const previewId = selectedIcon?.id ?? filteredIcons[0]?.id ?? 'shape-circle';
  const displayName = selectedIcon
    ? iconLabel(t, selectedIcon.id, selectedIcon.name)
    : t('wallet.studio.iconPicker.selectIcon');

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors w-full"
        data-testid="icon-picker-trigger"
        aria-haspopup="dialog"
        aria-label={
          selectedIcon
            ? t('wallet.studio.iconPicker.changeIcon', { name: displayName })
            : t('wallet.studio.iconPicker.selectIcon')
        }
      >
        {selectedIcon ? (
          <>
            <IconPreview
              icon={selectedIcon}
              className="w-5 h-5"
              style={{ color: palette.accent }}
            />
            <span className={`${CARD_TYPE_SCALE.sm} min-w-0`}>{displayName}</span>
          </>
        ) : (
          <span className={`${CARD_TYPE_SCALE.sm} text-neutral-400 dark:text-neutral-500`}>
            {t('wallet.studio.iconPicker.selectIcon')}
          </span>
        )}
      </button>

      {allowUpload && (
        <p className={`${CARD_TYPE_SCALE.xs} text-neutral-400 dark:text-neutral-500 mt-1`}>
          {t('wallet.studio.iconPicker.uploadHint')}
        </p>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
          data-testid="icon-picker-modal"
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            className={`w-full max-w-lg max-h-[70vh] bg-white dark:bg-neutral-900 ${CARD_RADIUS.plate} ${CARD_SHADOW.lift} border border-neutral-200 dark:border-neutral-700 flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('wallet.studio.iconPicker.title')}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className={`${CARD_TYPE_SCALE.sm} font-semibold text-neutral-800 dark:text-neutral-100`}>
                {t('wallet.studio.iconPicker.title')}
              </h3>
              <div className="flex items-center gap-3">
                <StampPairPreview
                  iconId={previewId}
                  accent={palette.accent}
                  accentSoft={palette.accentSoft}
                  surface={palette.text}
                  label={t('wallet.studio.iconPicker.previewLabel')}
                />
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1 rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  aria-label={t('common.close')}
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs: Formas / Iconos */}
            <div
              className="flex px-4 pt-3 gap-2"
              role="tablist"
              aria-label={t('wallet.studio.iconPicker.tabsLabel')}
            >
              {([
                { id: 'shapes' as PickerTab, labelKey: 'wallet.studio.iconPicker.tabShapes', testId: 'icon-picker-tab-shapes' },
                { id: 'motifs' as PickerTab, labelKey: 'wallet.studio.iconPicker.tabIcons', testId: 'icon-picker-tab-icons' },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={tab.testId}
                  className={`px-3 py-1.5 rounded-full ${CARD_TYPE_SCALE.sm} font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                  style={
                    activeTab === tab.id
                      ? { backgroundColor: palette.accent }
                      : undefined
                  }
                >
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-4 py-3">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('wallet.studio.iconPicker.search')}
                  maxLength={100}
                  aria-label={t('wallet.studio.iconPicker.search')}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  data-testid="icon-picker-search"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex overflow-x-auto px-2 pb-2 gap-1">
              {activeTab === 'shapes' ? (
                <span className={`${CARD_TYPE_SCALE.xs} px-2.5 py-1 text-neutral-500 dark:text-neutral-400`}>
                  {t('wallet.studio.iconPicker.shapesHint')}
                </span>
              ) : (
                MOTIF_GROUP_ORDER.map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => {
                      setActiveGroup(grp === 'all' ? 'all' : grp);
                      setActiveCategory('stamp');
                    }}
                    aria-pressed={activeGroup === grp}
                    data-testid={`icon-picker-group-${grp}`}
                    className={`px-2.5 py-1 rounded-md ${CARD_TYPE_SCALE.xs} font-medium whitespace-nowrap transition-colors ${
                      activeGroup === grp
                        ? 'text-white'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                    style={
                      activeGroup === grp
                        ? { backgroundColor: palette.accent }
                        : undefined
                    }
                  >
                    {grp === 'all'
                      ? t('wallet.studio.iconPicker.categoryAll')
                      : t(MOTIF_GROUP_LABELS[grp])}
                  </button>
                ))
              )}
              {activeTab === 'motifs' && category === 'all' && (
                <>
                  <span className="w-px bg-neutral-200 dark:bg-neutral-700 mx-1" aria-hidden="true" />
                  {CATEGORY_ORDER.filter((c) => c !== 'stamp' && c !== 'all').map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setActiveCategory(cat);
                        setActiveGroup('all');
                      }}
                      aria-pressed={activeCategory === cat && activeGroup === 'all'}
                      data-testid={`category-tab-${cat}`}
                      className={`px-2.5 py-1 rounded-md ${CARD_TYPE_SCALE.xs} font-medium whitespace-nowrap transition-colors ${
                        activeCategory === cat && activeGroup === 'all'
                          ? 'text-white'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                      style={
                        activeCategory === cat && activeGroup === 'all'
                          ? { backgroundColor: palette.accent }
                          : undefined
                      }
                    >
                      {t(CATEGORY_LABELS[cat])}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Icon grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {filteredIcons.length === 0 ? (
                <p className={`${CARD_TYPE_SCALE.sm} text-neutral-500 dark:text-neutral-400 text-center py-8`}>
                  {t('wallet.studio.iconPicker.noIcons')}
                </p>
              ) : (
                <div
                  ref={gridRef}
                  className="grid grid-cols-6 gap-2"
                  role="listbox"
                  aria-label={t('wallet.studio.iconPicker.gridLabel')}
                  onKeyDown={handleGridKeyDown}
                >
                  {filteredIcons.map((icon) => {
                    const isSelected = icon.id === value;
                    return (
                      <button
                        key={icon.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        aria-label={t('wallet.studio.iconPicker.selectIconNamed', {
                          name: iconLabel(t, icon.id, icon.name),
                        })}
                        onClick={() => handleSelect(icon.id)}
                        data-icon-option=""
                        className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                          isSelected
                            ? 'border-transparent'
                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 bg-white dark:bg-neutral-800'
                        }`}
                        style={
                          isSelected
                            ? {
                                borderColor: palette.accent,
                                boxShadow: `0 0 0 2px ${palette.accent}`,
                                backgroundColor: palette.accentSoft,
                              }
                            : undefined
                        }
                        data-testid={`icon-option-${icon.id}`}
                      >
                        {isSelected && (
                          <CheckBadge
                            className="absolute top-1 right-1 w-3.5 h-3.5"
                          />
                        )}
                        <IconPreview
                          icon={icon}
                          className="w-6 h-6"
                          style={{ color: isSelected ? palette.accent : undefined }}
                        />
                        <span
                          className={`${CARD_TYPE_SCALE.xs} text-neutral-500 dark:text-neutral-400 w-full text-center leading-tight`}
                          style={{ overflowWrap: 'anywhere' }}
                        >
                          {iconLabel(t, icon.id, icon.name)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className={`px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 ${CARD_TYPE_SCALE.xs} text-neutral-500 dark:text-neutral-400 text-center`}
            >
              {t('wallet.studio.iconPicker.iconCount', { count: filteredIcons.length })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
