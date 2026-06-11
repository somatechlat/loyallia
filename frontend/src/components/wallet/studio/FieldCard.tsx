/**
 * Expanded inline field card — SRS-003 §8.3.
 * All fields are always expanded; no compact mode, no modal.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import type { UnifiedField, CardType } from '@/components/wallet/types/unified-state';
import type { FieldDataType } from '@/components/wallet/types/unified-field';
import { DynamicTemplatePicker } from './DynamicTemplatePicker';
import { NotificationConfigInline } from './NotificationConfigInline';

export interface FieldCardProps {
  field: UnifiedField;
  cardType: CardType;
  onUpdateField: (id: string, partial: Partial<UnifiedField>) => void;
  onDeleteField: (id: string) => void;
  onToggleVisibility: (id: string, visible: boolean) => void;
}

const ALIGNMENT_OPTIONS = [
  { value: 'PKTextAlignmentLeft' as const, labelKey: 'wallet.studio.field.alignLeft' },
  { value: 'PKTextAlignmentCenter' as const, labelKey: 'wallet.studio.field.alignCenter' },
  { value: 'PKTextAlignmentRight' as const, labelKey: 'wallet.studio.field.alignRight' },
] as const;

/* ── Icons ────────────────────────────────────────────────────────── */

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

function BellIcon({ className, active }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

/* ── Component ────────────────────────────────────────────────────── */

export function FieldCard({
  field,
  cardType,
  onUpdateField,
  onDeleteField,
  onToggleVisibility,
}: FieldCardProps) {
  const { t } = useI18n();
  const [expandedNotifications, setExpandedNotifications] = useState<Record<string, boolean>>({});

  const isVisible = field.showOnApple || field.showOnGoogle;
  const isPrimary = field.fieldGroup === 'primary';
  const notificationsActive = Boolean(
    (typeof field.notifications?.appleChangeMessage === 'object' && field.notifications.appleChangeMessage?.enabled) ||
    (typeof field.notifications?.appleChangeMessage === 'string' && field.notifications.appleChangeMessage) ||
    (typeof field.notifications?.googleMessage === 'object' && field.notifications.googleMessage?.enabled) ||
    (typeof field.notifications?.googleMessage === 'string' && field.notifications.googleMessage)
  );

  const handleToggleNotifications = useCallback((fieldId: string) => {
    setExpandedNotifications((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
  }, []);

  const handleValueChange = useCallback(
    (value: string) => {
      onUpdateField(field.id, { value });
    },
    [field.id, onUpdateField]
  );

  return (
    <div
      className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2 space-y-2"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', field.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      {/* Row 1: Drag handle + visibility + label + delete */}
      <div className="flex items-center gap-1.5">
        <div
          className="flex-shrink-0 text-neutral-300 dark:text-neutral-600 cursor-grab active:cursor-grabbing"
          aria-label={t('wallet.studio.field.drag')}
          role="button"
          tabIndex={-1}
        >
          <DragHandleIcon className="w-3.5 h-3.5" />
        </div>

        <input
          type="checkbox"
          checked={isVisible}
          onChange={(e) => onToggleVisibility(field.id, e.target.checked)}
          className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          aria-label={t('wallet.studio.field.visible')}
        />

        <input
          type="text"
          value={field.label}
          onChange={(e) => onUpdateField(field.id, { label: e.target.value })}
          className="flex-1 min-w-0 text-sm font-medium bg-transparent border-b border-neutral-200 dark:border-neutral-700 focus:border-blue-500 outline-none px-1 text-neutral-900 dark:text-neutral-100"
          placeholder={t('wallet.studio.field.placeholder.label')}
        />

        <button
          type="button"
          onClick={() => onDeleteField(field.id)}
          className="flex-shrink-0 p-0.5 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all focus:outline-none focus:ring-1 focus:ring-red-500"
          aria-label={t('common.delete')}
          title={t('common.delete')}
          data-testid="field-delete-btn"
        >
          <DeleteIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 2: Value + template picker */}
      <div className="flex items-center gap-2">
        {field.isDynamic ? (
          <DynamicTemplatePicker
            value={field.value}
            onChange={handleValueChange}
            cardType={cardType}
            hideInput={false}
          />
        ) : (
          <input
            type="text"
            value={field.value}
            onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
            className="flex-1 min-w-0 text-sm bg-transparent border-b border-neutral-200 dark:border-neutral-700 focus:border-blue-500 outline-none px-1 text-neutral-900 dark:text-neutral-100"
            placeholder={t('wallet.studio.field.placeholder.value')}
          />
        )}
        <DynamicTemplatePicker
          value={field.value}
          onChange={handleValueChange}
          cardType={cardType}
          hideInput
          buttonLabel={
            <span className="inline-flex items-center gap-1 text-xs">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <path d="M12 11h4" />
                <path d="M12 16h4" />
                <path d="M8 11h.01" />
                <path d="M8 16h.01" />
              </svg>
              {t('wallet.studio.field.templates')}
            </span>
          }
        />
      </div>

      {/* Row 3: Data type + Dynamic + Platform toggles + Notifications */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        <select
          value={field.dataType}
          onChange={(e) => onUpdateField(field.id, { dataType: e.target.value as FieldDataType })}
          className="text-xs bg-neutral-100 dark:bg-neutral-800 rounded px-2 py-1 border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100"
        >
          <option value="text">{t('wallet.studio.field.type.text')}</option>
          <option value="date">{t('wallet.studio.field.type.date')}</option>
          <option value="number">{t('wallet.studio.field.type.number')}</option>
          <option value="currency">{t('wallet.studio.field.type.currency')}</option>
          <option value="url">{t('wallet.studio.field.type.url')}</option>
          <option value="phone">{t('wallet.studio.field.type.phone')}</option>
          <option value="email">{t('wallet.studio.field.type.email')}</option>
        </select>

        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={field.isDynamic}
            onChange={(e) => onUpdateField(field.id, { isDynamic: e.target.checked })}
            className="w-3 h-3 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-neutral-700 dark:text-neutral-300">{t('wallet.studio.field.dynamic')}</span>
        </label>

        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={field.showOnApple}
            onChange={(e) => onUpdateField(field.id, { showOnApple: e.target.checked })}
            className="w-3 h-3 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <AppleIcon className="w-3.5 h-3.5" />
        </label>

        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={field.showOnGoogle}
            onChange={(e) => onUpdateField(field.id, { showOnGoogle: e.target.checked })}
            className="w-3 h-3 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <GoogleIcon className="w-3.5 h-3.5" />
        </label>

        <button
          type="button"
          onClick={() => handleToggleNotifications(field.id)}
          className={`p-0.5 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            notificationsActive ? 'text-blue-500' : 'text-neutral-400 hover:text-neutral-600'
          }`}
          aria-label={t('wallet.studio.field.notification')}
          title={t('wallet.studio.field.notification')}
        >
          <BellIcon className="w-3.5 h-3.5" active={notificationsActive} />
        </button>
      </div>

      {/* Row 4: Primary field alignment */}
      {isPrimary && (
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-neutral-600 dark:text-neutral-400">{t('wallet.studio.field.alignment')}</span>
          {ALIGNMENT_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name={`align-${field.id}`}
                checked={field.appleOptions?.textAlignment === opt.value}
                onChange={() =>
                  onUpdateField(field.id, {
                    appleOptions: { ...field.appleOptions, textAlignment: opt.value },
                  })
                }
                className="w-3 h-3 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-neutral-700 dark:text-neutral-300">{t(opt.labelKey)}</span>
            </label>
          ))}
        </div>
      )}

      {/* Expanded: Inline notification config */}
      {expandedNotifications[field.id] && (
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2 mt-1">
          <NotificationConfigInline
            notifications={field.notifications}
            onUpdate={(updates) => onUpdateField(field.id, { notifications: updates })}
          />
        </div>
      )}
    </div>
  );
}
