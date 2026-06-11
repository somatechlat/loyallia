/**
 * TemplateCard — Individual wallet pass template card for the gallery.
 *
 * Shows preview thumbnail, metadata, and a context menu for user templates.
 */

'use client';

import React from 'react';
import type { WalletTemplate } from '@/components/wallet/types/templates';
import { getCardTypeLabel } from '@/components/wallet/templates/registry';

interface TemplateCardProps {
  template: WalletTemplate;
  isUserTemplate: boolean;
  isFavorite?: boolean;
  usageCount?: number;
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

export function TemplateCard({
  template,
  isUserTemplate,
  isFavorite,
  usageCount,
  onClick,
  onRename,
  onDuplicate,
  onDelete,
  onToggleFavorite,
}: TemplateCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

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

  const cardTypeLabel = getCardTypeLabel(template.cardType);

  return (
    <div data-testid={`template-card-${template.id}`} className="group relative text-left bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 transition-all duration-200 hover:scale-[1.03] hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700">
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
            aria-label="Opciones"
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
                Renombrar
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
                Duplicar
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
                {isFavorite ? 'Quitar favorito' : 'Añadir favorito'}
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
                Eliminar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click area */}
      <button type="button" onClick={onClick} className="w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-950 rounded-xl">
        {/* Card type badge */}
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            {cardTypeLabel}
          </span>
          {isFavorite && <StarIcon className="w-4 h-4 text-amber-400" filled />}
        </div>

        {/* Preview thumbnail */}
        <div
          data-testid={`template-preview-${template.id}`}
          className="w-full aspect-[4/3] rounded-xl mb-3 flex items-center justify-center border border-neutral-100 dark:border-neutral-800"
          style={{ backgroundColor: template.colors.background }}
        >
          <div className="text-center px-4">
            <div
              className="text-xs font-medium uppercase tracking-wider mb-1 opacity-70"
              style={{ color: template.colors.label }}
            >
              {cardTypeLabel}
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
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 line-clamp-2">
          {template.description}
        </p>

        {/* Meta row */}
        <div className="flex items-center justify-between">
          {isUserTemplate && usageCount !== undefined && (
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              Usado {usageCount} {usageCount === 1 ? 'vez' : 'veces'}
            </span>
          )}
          {!isUserTemplate && <span />}
          <span className="inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
            Ver
          </span>
        </div>
      </button>
    </div>
  );
}
