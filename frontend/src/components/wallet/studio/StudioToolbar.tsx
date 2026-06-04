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
import { PlatformToggle } from './PlatformToggle';
import type { PlatformView } from '@/components/wallet/types/unified-state';
import { Palette, Save } from '@/components/ui/LucideIcons';

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
  onExport: () => void;
  onAIGenerate: () => void;
  isModified: boolean;
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

/* ── Design-score helpers ────────────────────────────────────────── */

function getScoreColor(score: number): { bar: string; text: string; label: string } {
  if (score >= 9) {
    return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: 'Excelente' };
  }
  if (score >= 7) {
    return { bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', label: 'Bueno' };
  }
  if (score >= 5) {
    return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', label: 'Aceptable' };
  }
  return { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400', label: 'Necesita trabajo' };
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
  onExport,
  onAIGenerate,
  isModified,
}: StudioToolbarProps) {
  const scoreColors = typeof designScore === 'number' ? getScoreColor(designScore) : null;

  return (
    <header className="flex flex-col gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
      {/* ── Row 1 ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Deshacer"
          >
            <UndoIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Rehacer"
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
            title="Alejar"
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
            title="Acercar"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Row 2 ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Plantillas */}
        <button
          type="button"
          onClick={onOpenTemplates}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">Plantillas</span>
        </button>

        {/* Guardar */}
        <button
          type="button"
          onClick={onSave}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Guardar</span>
          {isModified && <span className="w-1.5 h-1.5 rounded-full bg-white/80" />}
        </button>

        {/* Exportar */}
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <DownloadIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar</span>
        </button>

        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700" />

        {/* Frente / Reverso toggle */}
        <div
          className="inline-flex items-center rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-0.5 gap-0.5"
          role="radiogroup"
          aria-label="Vista del pase"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!showBack}
            onClick={() => showBack && onToggleBack()}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              !showBack
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
          >
            Frente
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={showBack}
            onClick={() => !showBack && onToggleBack()}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              showBack
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
          >
            Reverso
          </button>
        </div>

        <div className="flex-1" />

        {/* Design Score */}
        {scoreColors && typeof designScore === 'number' && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <div
                className={`h-full rounded-full ${scoreColors.bar}`}
                style={{ width: `${Math.min(100, (designScore / 10) * 100)}%` }}
              />
            </div>
            <span className={`text-xs font-semibold ${scoreColors.text}`}>
              Score: {designScore.toFixed(1)}/10
            </span>
          </div>
        )}
      </div>

      {/* ── Row 3 (right-aligned) ─────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAIGenerate}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-xl transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] animate-ai-pulse"
          style={{
            background: 'linear-gradient(to right, #7c3aed, #818cf8)',
          }}
        >
          <SparklesIcon className="w-4 h-4" />
          <span>Diseñar con IA</span>
        </button>
      </div>
    </header>
  );
}
