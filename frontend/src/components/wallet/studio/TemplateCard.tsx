/**
 * TemplateCard — Individual wallet pass template card for the gallery.
 *
 * Renders a live mini pass preview built from the design system (palette,
 * type scale, radii, chrome) plus metadata and a context menu for user
 * templates.
 */

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import type { WalletTemplate } from '@/components/wallet/types/templates';
import { getCardTypeLabelKey } from '@/components/wallet/templates/registry';
import {
  getCardPalette,
  CARD_TYPE_SCALE,
  CARD_RADIUS,
  CARD_SHADOW,
  CARD_CHROME,
  progressSlots,
} from '@/components/wallet/design-system';

interface TemplateCardProps {
  template: WalletTemplate;
  isUserTemplate: boolean;
  isFavorite?: boolean;
  usageCount?: number;
  isSelected?: boolean;
  onClick: () => void;
  onRename?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

/** Hero label + value derived from the curated field set. */
function pickHero(fields: WalletTemplate['fields']): { label: string; value: string } {
  const primary = fields.find((f) => f.fieldGroup === 'primary');
  if (primary) return { label: primary.label, value: primary.value };
  const secondary = fields.find((f) => f.fieldGroup === 'secondary');
  if (secondary) return { label: secondary.label, value: secondary.value };
  return { label: '', value: '' };
}

function pickMeta(fields: WalletTemplate['fields']): { label: string; value: string } | null {
  const header = fields.find((f) => f.fieldGroup === 'header');
  return header ? { label: header.label, value: header.value } : null;
}

function stampProgress(template: WalletTemplate): { filled: number; total: number } | null {
  const cfg = template.cardTypeConfig;
  if (cfg.cardType === 'stamp') {
    return { filled: 3, total: Math.min(cfg.stampsRequired, 10) };
  }
  if (cfg.cardType === 'multipass') {
    return { filled: Math.floor(cfg.bundleSize * 0.4), total: Math.min(cfg.bundleSize, 10) };
  }
  return null;
}

/**
 * Live mini pass preview — product-shot quality, design-system only.
 */
export function TemplateMiniPreview({ template }: { template: WalletTemplate }) {
  const palette = getCardPalette(template.paletteKey ?? template.cardType);
  const hero = pickHero(template.fields);
  const meta = pickMeta(template.fields);
  const progress = stampProgress(template);
  const slots = progress ? progressSlots(progress.filled, progress.total) : [];

  return (
    <div
      data-testid={`template-preview-${template.id}`}
      className={`relative w-full overflow-hidden ${CARD_RADIUS.apple} ${CARD_SHADOW.card}`}
      style={{ backgroundImage: palette.gradient, backgroundColor: palette.base }}
    >
      {/* Gloss sweep */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-1/2 ${CARD_CHROME.gloss}`} />

      {/* Glass header */}
      <div className={`relative flex items-center justify-between px-3 py-2 ${CARD_CHROME.headerGlass}`}>
        <span
          className={`${CARD_TYPE_SCALE.xs} font-semibold tracking-wide uppercase`}
          style={{ color: palette.text }}
        >
          {template.apple.organizationName || template.name}
        </span>
        <span
          className={`${CARD_TYPE_SCALE.xs} font-medium`}
          style={{ color: palette.textMuted }}
        >
          {meta?.value ?? ''}
        </span>
      </div>

      {/* Body */}
      <div className="relative px-3 pb-3 pt-2.5">
        {hero.label ? (
          <div
            className={`${CARD_TYPE_SCALE.xs} font-medium tracking-wider uppercase mb-0.5`}
            style={{ color: palette.textMuted }}
          >
            {hero.label}
          </div>
        ) : null}
        <div
          className={`${CARD_TYPE_SCALE.xl} font-bold leading-tight`}
          style={{ color: palette.text }}
        >
          {hero.value || template.name}
        </div>

        {/* Stamp / progress slots */}
        {slots.length > 0 ? (
          <div className="mt-2.5 flex items-center gap-1.5" data-testid={`template-stamps-${template.id}`}>
            {slots.map((slot, i) => (
              <span
                key={`${template.id}-slot-${i}`}
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: slot === 'filled' ? palette.accent : palette.accentSoft,
                  boxShadow: slot === 'filled' ? `0 0 0 1px ${palette.accent}` : 'none',
                }}
              />
            ))}
            {progress ? (
              <span
                className={`${CARD_TYPE_SCALE.xs} ml-1.5 font-semibold tabular-nums`}
                style={{ color: palette.textMuted }}
              >
                {progress.filled}/{progress.total}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="mt-2.5">
            <div
              className="h-1.5 w-16 rounded-full"
              style={{ backgroundColor: palette.accent }}
            />
          </div>
        )}

        {/* Accent plate */}
        <div
          className="mt-2.5 flex items-center justify-between rounded-lg px-2 py-1.5"
          style={{ backgroundColor: palette.accentSoft }}
        >
          <span
            className={`${CARD_TYPE_SCALE.xs} font-medium`}
            style={{ color: palette.text }}
          >
            {template.description}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TemplateCard({
  template,
  isUserTemplate,
  isFavorite,
  usageCount,
  isSelected,
  onClick,
  onRename,
  onDuplicate,
  onDelete,
  onToggleFavorite,
}: TemplateCardProps) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const palette = getCardPalette(template.paletteKey ?? template.cardType);
  const cardTypeLabel = t(getCardTypeLabelKey(template.cardType));

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <div
      data-testid={`template-card-${template.id}`}
      data-selected={isSelected ? 'true' : 'false'}
      className={`group relative text-left bg-white dark:bg-neutral-900 rounded-2xl border p-3 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-offset-2 dark:focus-within:ring-offset-neutral-950 ${
        isSelected
          ? 'border-transparent shadow-xl'
          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
      }`}
      style={
        isSelected
          ? {
              boxShadow: `0 0 0 2px ${palette.accent}, 0 18px 44px -16px rgba(0,0,0,0.35)`,
            }
          : undefined
      }
    >
      {/* Context menu trigger */}
      {isUserTemplate && (
        <div className="absolute top-3 right-3 z-10" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label={t('wallet.studio.templateCard.options')}
          >
            <MoreIcon className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl z-20 overflow-hidden">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onRename?.();
                }}
                className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                {t('wallet.studio.templateCard.rename')}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDuplicate?.();
                }}
                className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                {t('wallet.studio.templateCard.duplicate')}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onToggleFavorite?.();
                }}
                className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
              >
                <StarIcon className={`w-3.5 h-3.5 ${isFavorite ? 'text-amber-400' : ''}`} filled={isFavorite} />
                {isFavorite
                  ? t('wallet.studio.templateCard.removeFavorite')
                  : t('wallet.studio.templateCard.addFavorite')}
              </button>
              <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete?.();
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click area */}
      <button
        type="button"
        data-template-card-btn
        onClick={onClick}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
      >
        {/* Card type badge + favorite */}
        <div className="flex items-center justify-between mb-2">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase"
            style={{
              backgroundColor: palette.accentSoft,
              color: palette.accent,
            }}
          >
            {cardTypeLabel}
          </span>
          {isFavorite ? <StarIcon className="w-4 h-4 text-amber-400" filled /> : null}
        </div>

        {/* Live mini pass preview */}
        <TemplateMiniPreview template={template} />

        {/* Info */}
        <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white mb-0.5">
          {template.name}
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 line-clamp-2">
          {template.description}
        </p>

        {/* Meta row */}
        <div className="flex items-center justify-between">
          {isUserTemplate && usageCount !== undefined ? (
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
              {t('wallet.studio.templateCard.usedCount', {
                count: usageCount,
                times: usageCount === 1
                  ? t('wallet.studio.templateCard.once')
                  : t('wallet.studio.templateCard.times'),
              })}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
            {t('wallet.studio.templateCard.view')}
          </span>
        </div>
      </button>
    </div>
  );
}
