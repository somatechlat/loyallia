/**
 * Field card with inline editing.
 *
 * - header / primary / back fields are always expanded inline.
 * - secondary / auxiliary fields start as a compact row; clicking expands
 *   to full inline editing.
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { UnifiedField, CardType } from '@/components/wallet/types/unified-state';
import { DynamicTemplatePicker } from './DynamicTemplatePicker';
import { NotificationConfigPanel } from './NotificationConfigPanel';

export interface FieldCardProps {
  field: UnifiedField;
  cardType: CardType;
  isCompact?: boolean;
  onUpdate: (updated: UnifiedField) => void;
  onDelete: () => void;
}

const ALIGNMENT_OPTIONS = [
  { value: 'PKTextAlignmentLeft' as const, label: 'Izquierda' },
  { value: 'PKTextAlignmentCenter' as const, label: 'Centro' },
  { value: 'PKTextAlignmentRight' as const, label: 'Derecha' },
] as const;

/* ── Inline template picker (dropdown only) ───────────────────────── */

function InlineTemplatePicker({
  value,
  onChange,
  cardType,
}: {
  value: string;
  onChange: (value: string) => void;
  cardType: CardType;
}) {
  return (
    <DynamicTemplatePicker
      value={value}
      onChange={onChange}
      cardType={cardType}
      hideInput
      buttonLabel={
        <span className="inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M12 11h4" />
            <path d="M12 16h4" />
            <path d="M8 11h.01" />
            <path d="M8 16h.01" />
          </svg>
          Plantillas ▼
        </span>
      }
    />
  );
}

/* ── Shared icons ─────────────────────────────────────────────────── */

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
      <path d="M10 2c1 .5 2 2 2 5" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="12" x="3" y="6" rx="2" ry="2" />
      <path d="M6 10h.01" />
      <path d="M6 14h.01" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
      <path d="M18 10h.01" />
      <path d="M18 14h.01" />
    </svg>
  );
}

function DragHandleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  );
}

function DeleteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

/* ── Component ────────────────────────────────────────────────────── */

export function FieldCard({ field, cardType, isCompact = false, onUpdate, onDelete }: FieldCardProps) {
  const [isExpanded, setIsExpanded] = useState(!isCompact);

  const isVisible = field.showOnApple || field.showOnGoogle;
  const isPrimary = field.fieldGroup === 'primary';

  const handleToggleVisibility = useCallback(() => {
    const next = !isVisible;
    onUpdate({ ...field, showOnApple: next, showOnGoogle: next });
  }, [field, isVisible, onUpdate]);

  const handleToggleApple = useCallback(() => {
    onUpdate({ ...field, showOnApple: !field.showOnApple });
  }, [field, onUpdate]);

  const handleToggleGoogle = useCallback(() => {
    onUpdate({ ...field, showOnGoogle: !field.showOnGoogle });
  }, [field, onUpdate]);

  const handleToggleDynamic = useCallback(() => {
    onUpdate({ ...field, isDynamic: !field.isDynamic });
  }, [field, onUpdate]);

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ ...field, label: e.target.value });
    },
    [field, onUpdate]
  );

  const handleValueChange = useCallback(
    (value: string) => {
      onUpdate({ ...field, value });
    },
    [field, onUpdate]
  );

  const handleAlignmentChange = useCallback(
    (alignment: (typeof ALIGNMENT_OPTIONS)[number]['value']) => {
      onUpdate({ ...field, appleOptions: { ...field.appleOptions, textAlignment: alignment } });
    },
    [field, onUpdate]
  );

  const handleNotificationChange = useCallback(
    (notifications: UnifiedField['notifications']) => {
      onUpdate({ ...field, notifications });
    },
    [field, onUpdate]
  );

  /* ── Compact row (secondary / auxiliary only) ───────────────────── */

  if (isCompact && !isExpanded) {
    return (
      <div
        className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors cursor-pointer"
        onClick={() => setIsExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(true);
          }
        }}
        aria-label={`Field ${field.label}: ${field.value}`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', field.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
      >
        {/* Drag handle */}
        <div
          className="flex-shrink-0 text-neutral-300 dark:text-neutral-600 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
          role="button"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <DragHandleIcon className="w-4 h-4" />
        </div>

        {/* Visibility checkbox */}
        <input
          type="checkbox"
          checked={isVisible}
          onChange={(e) => {
            e.stopPropagation();
            handleToggleVisibility();
          }}
          className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          aria-label="Show field"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Label : Value */}
        <div className="flex-1 min-w-0 flex items-center gap-2 truncate">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
            {field.label || 'Sin etiqueta'}
          </span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
            {field.value || <span className="italic opacity-60">Sin valor</span>}
          </span>
        </div>

        {/* Apple toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleApple();
          }}
          className={`flex-shrink-0 p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            field.showOnApple
              ? 'text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700'
              : 'text-neutral-300 dark:text-neutral-600'
          }`}
          aria-label={field.showOnApple ? 'Visible on Apple Wallet' : 'Hidden on Apple Wallet'}
          aria-pressed={field.showOnApple}
          title={field.showOnApple ? 'Visible on Apple Wallet' : 'Hidden on Apple Wallet'}
        >
          <AppleIcon className="w-4 h-4" />
        </button>

        {/* Google toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleGoogle();
          }}
          className={`flex-shrink-0 p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            field.showOnGoogle
              ? 'text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700'
              : 'text-neutral-300 dark:text-neutral-600'
          }`}
          aria-label={field.showOnGoogle ? 'Visible on Google Wallet' : 'Hidden on Google Wallet'}
          aria-pressed={field.showOnGoogle}
          title={field.showOnGoogle ? 'Visible on Google Wallet' : 'Hidden on Google Wallet'}
        >
          <GoogleIcon className="w-4 h-4" />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex-shrink-0 p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 opacity-0 group-hover:opacity-100"
          aria-label="Delete field"
          title="Delete field"
        >
          <DeleteIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  /* ── Expanded inline editor ─────────────────────────────────────── */

  return (
    <div
      className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3 space-y-3"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', field.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      {/* Top row: drag handle + visibility + label + actions */}
      <div className="flex items-center gap-2">
        <div
          className="flex-shrink-0 text-neutral-300 dark:text-neutral-600 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
          role="button"
          tabIndex={-1}
        >
          <DragHandleIcon className="w-4 h-4" />
        </div>

        <input
          type="checkbox"
          checked={isVisible}
          onChange={handleToggleVisibility}
          className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          aria-label="Show field"
        />

        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
          {field.label || 'Campo sin etiqueta'}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {isCompact && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Collapse field"
              title="Collapse field"
            >
              <ChevronUpIcon className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Delete field"
            title="Delete field"
          >
            <DeleteIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Label */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Etiqueta:
        </label>
        <input
          type="text"
          value={field.label}
          onChange={handleLabelChange}
          className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Etiqueta del campo"
        />
      </div>

      {/* Value */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Valor:
        </label>
        {field.isDynamic ? (
          <DynamicTemplatePicker
            value={field.value}
            onChange={handleValueChange}
            cardType={cardType}
          />
        ) : (
          <input
            type="text"
            value={field.value}
            onChange={(e) => handleValueChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Valor del campo"
          />
        )}
      </div>

      {/* Template picker + Dynamic + Delete row */}
      <div className="flex flex-wrap items-center gap-3">
        <InlineTemplatePicker value={field.value} onChange={handleValueChange} cardType={cardType} />

        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={field.isDynamic}
            onChange={handleToggleDynamic}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-neutral-700 dark:text-neutral-300">Dinámico</span>
        </label>
      </div>

      {/* Platform toggles */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggleApple}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            field.showOnApple
              ? 'text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700'
              : 'text-neutral-300 dark:text-neutral-600 hover:text-neutral-400'
          }`}
          aria-label={field.showOnApple ? 'Visible on Apple Wallet' : 'Hidden on Apple Wallet'}
          aria-pressed={field.showOnApple}
          title={field.showOnApple ? 'Visible on Apple Wallet' : 'Hidden on Apple Wallet'}
        >
          <AppleIcon className="w-3.5 h-3.5" />
          {field.showOnApple ? '✓' : ''}
        </button>

        <button
          type="button"
          onClick={handleToggleGoogle}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            field.showOnGoogle
              ? 'text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700'
              : 'text-neutral-300 dark:text-neutral-600 hover:text-neutral-400'
          }`}
          aria-label={field.showOnGoogle ? 'Visible on Google Wallet' : 'Hidden on Google Wallet'}
          aria-pressed={field.showOnGoogle}
          title={field.showOnGoogle ? 'Visible on Google Wallet' : 'Hidden on Google Wallet'}
        >
          <GoogleIcon className="w-3.5 h-3.5" />
          {field.showOnGoogle ? '✓' : ''}
        </button>
      </div>

      {/* Primary-only extras */}
      {isPrimary && (
        <div className="space-y-3 pt-1 border-t border-neutral-200 dark:border-neutral-700">
          {/* Alignment */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Alineación:
            </span>
            <div className="flex flex-wrap gap-2">
              {ALIGNMENT_OPTIONS.map((opt) => {
                const selected = field.appleOptions.textAlignment === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleAlignmentChange(opt.value)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span className={selected ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-400'}>
                      {selected ? '●' : '○'}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notification toggle */}
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(
                  field.notifications.appleChangeMessage || field.notifications.googleMessage
                )}
                onChange={(e) => {
                  if (e.target.checked) {
                    onUpdate({
                      ...field,
                      notifications: {
                        appleChangeMessage: field.notifications.appleChangeMessage ?? '¡Nuevo sello!',
                        googleMessage: field.notifications.googleMessage ?? 'Tu tarjeta ha sido actualizada',
                      },
                    });
                  } else {
                    onUpdate({ ...field, notifications: {} });
                  }
                }}
                className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Enviar notificación:
              </span>
            </label>

            {Boolean(
              field.notifications.appleChangeMessage || field.notifications.googleMessage
            ) && (
              <NotificationConfigPanel
                notifications={field.notifications}
                onChange={handleNotificationChange}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
