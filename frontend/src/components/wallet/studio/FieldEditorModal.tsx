/**
 * Expanded modal for editing a single field.
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import type { UnifiedField, FieldGroup, CardType } from '@/components/wallet/types/unified-state';
import { FIELD_GROUP_METADATA } from '@/components/wallet/constants';
import { validateField, canAddFieldToGroup } from '@/components/wallet/utils/field-validation';
import { DynamicTemplatePicker } from './DynamicTemplatePicker';
import { NotificationConfigPanel } from './NotificationConfigPanel';

export interface FieldEditorModalProps {
  field: UnifiedField;
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: UnifiedField) => void;
  onDelete: (fieldId: string) => void;
  cardType: CardType;
  allFields: UnifiedField[];
}

const FIELD_GROUPS: FieldGroup[] = ['header', 'primary', 'secondary', 'auxiliary', 'back'];

const TEXT_ALIGNMENTS = [
  { value: 'PKTextAlignmentLeft', label: 'Left' },
  { value: 'PKTextAlignmentCenter', label: 'Center' },
  { value: 'PKTextAlignmentRight', label: 'Right' },
  { value: 'PKTextAlignmentNatural', label: 'Natural' },
] as const;

const DATE_STYLES = [
  { value: 'PKDateStyleNone', label: 'None' },
  { value: 'PKDateStyleShort', label: 'Short' },
  { value: 'PKDateStyleMedium', label: 'Medium' },
  { value: 'PKDateStyleLong', label: 'Long' },
  { value: 'PKDateStyleFull', label: 'Full' },
] as const;

const NUMBER_STYLES = [
  { value: 'PKNumberStyleDecimal', label: 'Decimal' },
  { value: 'PKNumberStylePercent', label: 'Percent' },
  { value: 'PKNumberStyleScientific', label: 'Scientific' },
  { value: 'PKNumberStyleSpellOut', label: 'Spell Out' },
] as const;

export function FieldEditorModal({
  field,
  isOpen,
  onClose,
  onSave,
  onDelete,
  cardType,
  allFields,
}: FieldEditorModalProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<UnifiedField>(field);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(field);
      setErrors({});
      setShowDeleteConfirm(false);
    }
  }, [isOpen, field]);

  const updateDraft = useCallback((partial: Partial<UnifiedField>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!draft.label.trim()) {
      newErrors.label = t('wallet.studio.fields.label') + ' ' + t('common.required');
    }
    if (!draft.value.trim()) {
      newErrors.value = t('wallet.studio.fields.value') + ' ' + t('common.required');
    }

    // Check group limits if group changed
    if (draft.fieldGroup !== field.fieldGroup) {
      const otherFields = allFields.filter((f) => f.id !== field.id);
      if (!canAddFieldToGroup(otherFields, draft.fieldGroup, cardType)) {
        newErrors.fieldGroup = `${FIELD_GROUP_METADATA[draft.fieldGroup].label} ${t('wallet.studio.fields.full')}`;
      }
    }

    // Run full field validation
    const fieldErrors = validateField(draft);
    for (const err of fieldErrors) {
      if (!newErrors[err.fieldId]) {
        newErrors[err.fieldId] = err.message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [draft, field, allFields, cardType]);

  const handleSave = useCallback(() => {
    if (validate()) {
      onSave(draft);
      onClose();
    }
  }, [draft, validate, onSave, onClose]);

  const handleDelete = useCallback(() => {
    if (showDeleteConfirm) {
      onDelete(field.id);
      setShowDeleteConfirm(false);
      onClose();
    } else {
      setShowDeleteConfirm(true);
    }
  }, [showDeleteConfirm, onDelete, field.id, onClose]);

  const groupOptions = useMemo(() => {
    return FIELD_GROUPS.map((group) => {
      const isCurrent = group === field.fieldGroup;
      const otherFields = allFields.filter((f) => f.id !== field.id);
      const canMove = isCurrent || canAddFieldToGroup(otherFields, group, cardType);
      return { group, canMove };
    });
  }, [field.fieldGroup, allFields, cardType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="field-editor-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2
            id="field-editor-title"
            className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {t('wallet.studio.fields.editField')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={t('common.close')}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Label */}
          <div className="space-y-1">
            <label htmlFor="field-label" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('wallet.studio.fields.label')}
            </label>
            <input
              id="field-label"
              type="text"
              value={draft.label}
              onChange={(e) => updateDraft({ label: e.target.value })}
              className={`w-full px-3 py-2 text-sm rounded-md border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.label ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'}`}
              placeholder={t('wallet.studio.fields.placeholderLabel')}
            />
            {errors.label && <p className="text-xs text-red-500">{errors.label}</p>}
          </div>

          {/* Value */}
          <div className="space-y-1">
            <label htmlFor="field-value" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('wallet.studio.fields.value')}
            </label>
            {draft.isDynamic ? (
              <DynamicTemplatePicker
                value={draft.value}
                onChange={(value) => updateDraft({ value })}
                cardType={cardType}
              />
            ) : (
              <input
                id="field-value"
                type="text"
                value={draft.value}
                onChange={(e) => updateDraft({ value: e.target.value })}
                className={`w-full px-3 py-2 text-sm rounded-md border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.value ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'}`}
                placeholder={t('wallet.studio.fields.placeholderValue')}
              />
            )}
            {errors.value && <p className="text-xs text-red-500">{errors.value}</p>}
          </div>

          {/* Field Group */}
          <div className="space-y-1">
            <label htmlFor="field-group" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('wallet.studio.fields.fieldGroup')}
            </label>
            <select
              id="field-group"
              value={draft.fieldGroup}
              onChange={(e) => updateDraft({ fieldGroup: e.target.value as FieldGroup })}
              className={`w-full px-3 py-2 text-sm rounded-md border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.fieldGroup ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'}`}
            >
              {groupOptions.map(({ group, canMove }) => (
                <option key={group} value={group} disabled={!canMove}>
                  {FIELD_GROUP_METADATA[group].label}
                  {!canMove && group !== field.fieldGroup ? ` (${t('wallet.studio.fields.full')})` : ''}
                </option>
              ))}
            </select>
            {errors.fieldGroup && <p className="text-xs text-red-500">{errors.fieldGroup}</p>}
          </div>

          {/* Toggles row */}
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.showOnApple}
                onChange={(e) => updateDraft({ showOnApple: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">{t('wallet.studio.fields.showOnApple')}</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.showOnGoogle}
                onChange={(e) => updateDraft({ showOnGoogle: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">{t('wallet.studio.fields.showOnGoogle')}</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.isDynamic}
                onChange={(e) => updateDraft({ isDynamic: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">{t('wallet.studio.fields.isDynamic')}</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.formatting.isLink}
                onChange={(e) => updateDraft({ formatting: { ...draft.formatting, isLink: e.target.checked } })}
                className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">{t('wallet.studio.fields.linkDetection')}</span>
            </label>
          </div>

          {/* Apple Options */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t('wallet.studio.fields.appleOptions')}</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="apple-alignment" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {t('wallet.studio.fields.textAlignment')}
                </label>
                <select
                  id="apple-alignment"
                  value={draft.appleOptions.textAlignment ?? ''}
                  onChange={(e) => updateDraft({ appleOptions: { ...draft.appleOptions, textAlignment: (e.target.value || undefined) as typeof draft.appleOptions.textAlignment } })}
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('wallet.studio.fields.default')}</option>
                  {TEXT_ALIGNMENTS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="apple-date-style" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {t('wallet.studio.fields.dateStyle')}
                </label>
                <select
                  id="apple-date-style"
                  value={draft.appleOptions.dateStyle ?? ''}
                  onChange={(e) => updateDraft({ appleOptions: { ...draft.appleOptions, dateStyle: (e.target.value || undefined) as typeof draft.appleOptions.dateStyle } })}
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('wallet.studio.fields.default')}</option>
                  {DATE_STYLES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="apple-number-style" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {t('wallet.studio.fields.numberStyle')}
                </label>
                <select
                  id="apple-number-style"
                  value={draft.appleOptions.numberStyle ?? ''}
                  onChange={(e) => updateDraft({ appleOptions: { ...draft.appleOptions, numberStyle: (e.target.value || undefined) as typeof draft.appleOptions.numberStyle } })}
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('wallet.studio.fields.default')}</option>
                  {NUMBER_STYLES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="apple-currency" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {t('wallet.studio.fields.currencyCode')}
                </label>
                <input
                  id="apple-currency"
                  type="text"
                  value={draft.appleOptions.currencyCode ?? ''}
                  onChange={(e) => updateDraft({ appleOptions: { ...draft.appleOptions, currencyCode: e.target.value || undefined } })}
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="USD"
                />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <NotificationConfigPanel
            notifications={draft.notifications}
            onChange={(notifications) => updateDraft({ notifications })}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-800">
          <div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 dark:text-red-400">{t('wallet.studio.fields.deleteConfirm')}</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {t('wallet.studio.fields.yesDelete')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" x2="10" y1="11" y2="17" />
                  <line x1="14" x2="14" y1="11" y2="17" />
                </svg>
                {t('common.delete')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
