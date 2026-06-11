/**
 * Studio toolbar component.
 *
 * 3-row layout per SRS-003 Section 6:
 *   Row 1: Undo/Redo | Platform Toggle | Zoom
 *   Row 2: Plantillas | Guardar | Exportar | Frente/Reverso | Design Score
 *   Row 3: AI Button (right-aligned)
 */

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import type { PlatformView } from '@/components/wallet/types/unified-state';

export interface StudioToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  platformView: PlatformView;
  onPlatformViewChange: (view: PlatformView) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showBack: boolean;
  onToggleBack: () => void;
  designScore?: number;
  onOpenTemplates: () => void;
  onSave: () => void;
  onSaveAsTemplate?: () => void;
  onExport?: () => void;
  isExporting?: boolean;
  onAIGenerate: () => void;
  isModified: boolean;
  onShowSuggestions?: () => void;
  hasSuggestions?: boolean;
}

/* ── Inline icons ────────────────────────────────────────────────── */

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}

function RedoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
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

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <circle cx="10.5" cy="16.5" r=".5" fill="currentColor" />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#EA4335" d="M12 5.04c1.67 0 3.17.58 4.35 1.71l3.25-3.26C17.51 1.18 14.96 0 12 0 7.39 0 3.37 2.6 1.4 6.38l3.77 2.92C6.26 6.3 8.92 5.04 12 5.04z" />
      <path fill="#4285F4" d="M23.5 12.23c0-.86-.08-1.69-.22-2.48H12v4.7h6.45c-.28 1.48-1.1 2.73-2.34 3.57l3.78 2.93c2.2-2.03 3.61-5.02 3.61-8.72z" />
      <path fill="#FBBC05" d="M5.17 9.3L1.4 6.38C.51 8.17 0 10.18 0 12.33c0 2.15.51 4.16 1.4 5.95l3.78-2.92c-.46-1.36-.73-2.8-.73-4.31 0-1.51.27-2.95.73-4.31l-.01.57z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.78-2.93c-1.02.68-2.32 1.08-4.15 1.08-3.08 0-5.74-1.26-7.46-3.29L1.4 18.28C3.37 22.1 7.39 24.67 12 24z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* ── Design-score helpers ────────────────────────────────────────── */

function getScoreColorClass(score: number): string {
  if (score >= 9) return 'text-green-600 bg-green-100';
  if (score >= 7) return 'text-blue-600 bg-blue-100';
  if (score >= 5) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

/* ── Component ───────────────────────────────────────────────────── */

export function StudioToolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  platformView,
  onPlatformViewChange,
  zoom,
  onZoomChange,
  showBack,
  onToggleBack,
  designScore,
  onOpenTemplates,
  onSave,
  onSaveAsTemplate,
  onExport,
  isExporting,
  onAIGenerate,
  isModified,
  onShowSuggestions,
  hasSuggestions,
}: StudioToolbarProps) {
  const { t } = useI18n();
  const planFeatures = usePlanFeatures();
  const scoreColorClass = typeof designScore === 'number' ? getScoreColorClass(designScore) : null;

  const PLATFORM_OPTIONS: Array<{ value: PlatformView; label: string; icon: React.FC<{ className?: string }> }> = [
    { value: 'apple', label: 'Apple', icon: AppleLogo },
    { value: 'google', label: 'Google', icon: GoogleLogo },
    { value: 'both', label: 'Ambos', icon: EyeIcon },
  ];

  return (
    <>
      <style>{`
        @keyframes ai-pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
      `}</style>
      <header className="flex flex-col gap-1.5 px-3 py-2 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        {/* ── Row 1: Primary actions + Platform + Zoom + Score + AI ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={t('wallet.studio.toolbar.undo')}
            >
              <UndoIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={t('wallet.studio.toolbar.redo')}
            >
              <RedoIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700" />

          {/* Platform toggle */}
          <div
            className="inline-flex items-center rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-0.5 gap-0.5"
            role="radiogroup"
            aria-label={t('wallet.studio.toolbar.selectPlatform')}
          >
            {PLATFORM_OPTIONS.map((option) => {
              const isActive = platformView === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => onPlatformViewChange(option.value)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-neutral-900 ${
                    isActive
                      ? 'bg-white dark:bg-surface-600 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                  }`}
                  title={option.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              );
            })}
          </div>

          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700" />

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onZoomChange(Math.max(0.5, zoom - 0.25))}
              className="p-1 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title={t('wallet.studio.toolbar.zoomOut')}
            >
              <MinusIcon className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 w-10 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => onZoomChange(Math.min(2, zoom + 0.25))}
              className="p-1 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title={t('wallet.studio.toolbar.zoomIn')}
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 hidden sm:block" />

          {/* Frente / Reverso toggle */}
          <div
            className="inline-flex items-center rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-0.5 gap-0.5"
            role="radiogroup"
            aria-label={t('wallet.studio.toolbar.passView')}
          >
            <button
              type="button"
              role="radio"
              aria-checked={!showBack}
              onClick={() => showBack && onToggleBack()}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                !showBack
                  ? 'bg-white dark:bg-surface-600 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              {t('wallet.studio.toolbar.front')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={showBack}
              onClick={() => !showBack && onToggleBack()}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                showBack
                  ? 'bg-white dark:bg-surface-600 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              {t('wallet.studio.toolbar.back')}
            </button>
          </div>

          <div className="flex-1" />

          {/* Design Score */}
          {scoreColorClass && typeof designScore === 'number' && (
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${scoreColorClass}`}>
                {designScore.toFixed(1)}/10
              </span>
              {hasSuggestions && onShowSuggestions && (
                <button
                  type="button"
                  onClick={onShowSuggestions}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                >
                  🔧 {t('wallet.studio.score.viewSuggestions')}
                </button>
              )}
            </div>
          )}

          {/* AI Button */}
          <button
            type="button"
            onClick={onAIGenerate}
            disabled={!planFeatures.hasAIAssistant}
            className="bg-gradient-to-r from-violet-600 to-indigo-400 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity animate-[ai-pulse-scale_2s_ease-in-out_infinite] disabled:opacity-40 disabled:cursor-not-allowed disabled:animate-none shrink-0"
            title={planFeatures.hasAIAssistant ? t('wallet.studio.toolbar.aiDesign') : 'PRO'}
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('wallet.studio.toolbar.aiDesign')}</span>
            {!planFeatures.hasAIAssistant && (
              <span className="text-[10px] bg-white/20 px-1 py-0.5 rounded">PRO</span>
            )}
          </button>
        </div>

        {/* ── Row 2: Templates | Save | Save As | Export ────────────── */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTemplates}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <PaletteIcon className="w-3.5 h-3.5" />
            <span>{t('wallet.studio.toolbar.templates')}</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
          >
            <SaveIcon className="w-3.5 h-3.5" />
            <span>{t('wallet.studio.toolbar.save')}</span>
            {isModified && <span className="w-1.5 h-1.5 rounded-full bg-white/80" />}
          </button>

          {onSaveAsTemplate && (
            <button
              type="button"
              onClick={onSaveAsTemplate}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title={t('wallet.studio.toolbar.saveAsTemplate')}
              data-testid="toolbar-save-template-btn"
            >
              <span>💾</span>
              <span className="hidden md:inline">{t('wallet.studio.toolbar.saveAsTemplate')}</span>
            </button>
          )}

          {onExport && (
            <button
              type="button"
              onClick={onExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <DownloadIcon className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{t('wallet.studio.toolbar.export')}</span>
            </button>
          )}
        </div>
      </header>
    </>
  );
}
