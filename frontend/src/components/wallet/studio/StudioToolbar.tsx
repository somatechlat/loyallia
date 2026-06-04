/**
 * Studio toolbar component.
 *
 * Provides undo/redo, platform toggle, zoom controls, template/save
 * actions, front/back toggle, design score badge, and AI generate button.
 */

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import { PlatformToggle } from './PlatformToggle';
import type { PlatformView } from '@/components/wallet/types/unified-state';
import { Save, Palette } from '@/components/ui/LucideIcons';

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
  onSaveAsTemplate: () => void;
  onAIGenerate: () => void;
  isModified: boolean;
}

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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function FlipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h18" />
      <path d="M3 17h18" />
      <path d="M6 3v18" />
      <path d="M18 3v18" />
      <path d="m9 13 3-3 3 3" />
      <path d="m9 11 3 3 3-3" />
    </svg>
  );
}

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
  onAIGenerate,
  isModified,
}: StudioToolbarProps) {
  const { t } = useI18n();
  const [showSaveMenu, setShowSaveMenu] = React.useState(false);
  const saveMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (saveMenuRef.current && !saveMenuRef.current.contains(event.target as Node)) {
        setShowSaveMenu(false);
      }
    }
    if (showSaveMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSaveMenu]);

  return (
    <header className="h-14 flex items-center gap-3 px-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
      {/* Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={t('wallet.studio.toolbar.undo')}
        >
          <UndoIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={t('wallet.studio.toolbar.redo')}
        >
          <RedoIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700" />

      {/* Platform toggle */}
      <PlatformToggle value={platformView} onChange={onPlatformViewChange} size="sm" />

      <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))}
          className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title={t('wallet.studio.toolbar.zoomOut')}
        >
          <MinusIcon className="w-4 h-4" />
        </button>
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 w-12 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
          className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title={t('wallet.studio.toolbar.zoomIn')}
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1" />

      {/* Templates */}
      <button
        type="button"
        onClick={onOpenTemplates}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <Palette className="w-4 h-4" />
        <span className="hidden sm:inline">{t('wallet.studio.toolbar.templates')}</span>
      </button>

      {/* Save dropdown */}
      <div className="relative" ref={saveMenuRef}>
        <button
          type="button"
          onClick={() => setShowSaveMenu((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>{t('common.save')}</span>
          {isModified && <span className="w-1.5 h-1.5 rounded-full bg-white/80" />}
          <ChevronDownIcon className="w-3 h-3 opacity-70" />
        </button>

        {showSaveMenu && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-lg z-50 py-1">
            <button
              type="button"
              onClick={() => {
                onSave();
                setShowSaveMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              {t('wallet.studio.toolbar.saveChanges')}
            </button>
            <button
              type="button"
              onClick={() => {
                onSaveAsTemplate();
                setShowSaveMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              {t('wallet.studio.toolbar.saveAsTemplate')}
            </button>
          </div>
        )}
      </div>

      {/* Front/Back toggle */}
      <button
        type="button"
        onClick={onToggleBack}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          showBack
            ? 'bg-neutral-800 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }`}
        title={showBack ? t('wallet.studio.toolbar.viewFront') : t('wallet.studio.toolbar.viewBack')}
      >
        <FlipIcon className="w-4 h-4" />
        <span className="hidden sm:inline">{showBack ? t('wallet.studio.toolbar.back') : t('wallet.studio.toolbar.front')}</span>
      </button>

      {/* Design score */}
      {typeof designScore === 'number' && (
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
          style={{
            background:
              designScore >= 80
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : designScore >= 50
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: 'white',
          }}
          title={t('wallet.studio.toolbar.designScore', { score: designScore })}
        >
          {designScore}
        </div>
      )}

      {/* AI Generate */}
      <button
        type="button"
        onClick={onAIGenerate}
        className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
        }}
      >
        <SparklesIcon className="w-4 h-4" />
        <span className="hidden sm:inline">{t('wallet.studio.toolbar.aiDesign')}</span>
      </button>
    </header>
  );
}
