/**
 * Main field editor container.
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import type { UnifiedField, FieldGroup, CardType } from '@/components/wallet/types/unified-state';
import { FIELD_GROUP_METADATA } from '@/components/wallet/constants';
import { validateFieldGroupLimits, canAddFieldToGroup } from '@/components/wallet/utils/field-validation';
import { FieldLimitIndicator } from './FieldLimitIndicator';
import { FieldCard } from './FieldCard';
import { FieldEditorModal } from './FieldEditorModal';

export interface FieldStudioProps {
  fields: UnifiedField[];
  cardType: CardType;
  onUpdateFields: (fields: UnifiedField[] | ((prev: UnifiedField[]) => UnifiedField[])) => void;
}

const FIELD_GROUPS: FieldGroup[] = ['header', 'primary', 'secondary', 'auxiliary', 'back'];

function createEmptyField(group: FieldGroup, order: number): UnifiedField {
  return {
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    value: '',
    fieldGroup: group,
    order,
    showOnApple: true,
    showOnGoogle: true,
    isDynamic: false,
    appleOptions: {},
    googleOptions: { isPredefined: false },
    notifications: {},
    formatting: { isLink: false },
  };
}

export function FieldStudio({ fields, cardType, onUpdateFields }: FieldStudioProps) {
  const { t } = useI18n();
  const [editingField, setEditingField] = useState<UnifiedField | null>(null);
  const [addingToGroup, setAddingToGroup] = useState<FieldGroup | null>(null);
  const [quickAddLabel, setQuickAddLabel] = useState('');
  const [quickAddValue, setQuickAddValue] = useState('');
  const [dragOverGroup, setDragOverGroup] = useState<FieldGroup | null>(null);

  const groupValidations = useMemo(
    () => validateFieldGroupLimits(fields, cardType),
    [fields, cardType]
  );

  const fieldsByGroup = useMemo(() => {
    const map = new Map<FieldGroup, UnifiedField[]>();
    for (const group of FIELD_GROUPS) {
      const groupFields = fields
        .filter((f) => f.fieldGroup === group)
        .sort((a, b) => a.order - b.order);
      map.set(group, groupFields);
    }
    return map;
  }, [fields]);

  const handleUpdateField = useCallback(
    (updated: UnifiedField) => {
      onUpdateFields((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f))
      );
    },
    [onUpdateFields]
  );

  const handleDeleteField = useCallback(
    (fieldId: string) => {
      onUpdateFields((prev) => prev.filter((f) => f.id !== fieldId));
      setEditingField(null);
    },
    [onUpdateFields]
  );

  const handleToggleApple = useCallback(
    (fieldId: string) => {
      onUpdateFields((prev) =>
        prev.map((f) =>
          f.id === fieldId ? { ...f, showOnApple: !f.showOnApple } : f
        )
      );
    },
    [onUpdateFields]
  );

  const handleToggleGoogle = useCallback(
    (fieldId: string) => {
      onUpdateFields((prev) =>
        prev.map((f) =>
          f.id === fieldId ? { ...f, showOnGoogle: !f.showOnGoogle } : f
        )
      );
    },
    [onUpdateFields]
  );

  const handleDuplicateField = useCallback(
    (field: UnifiedField) => {
      onUpdateFields((prev) => {
        const groupFields = prev.filter((f) => f.fieldGroup === field.fieldGroup);
        if (!canAddFieldToGroup(prev, field.fieldGroup, cardType)) {
          return prev;
        }
        const newField: UnifiedField = {
          ...field,
          id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          label: `${field.label} (${t('wallet.studio.fields.duplicateField')})`,
          order: groupFields.length,
        };
        return [...prev, newField];
      });
    },
    [onUpdateFields, cardType, t]
  );

  const handleAddField = useCallback(
    (group: FieldGroup) => {
      const groupFields = fields.filter((f) => f.fieldGroup === group);
      if (!canAddFieldToGroup(fields, group, cardType)) return;

      const newField = createEmptyField(group, groupFields.length);

      if (quickAddLabel.trim() || quickAddValue.trim()) {
        newField.label = quickAddLabel.trim() || t('wallet.studio.fields.addField');
        newField.value = quickAddValue.trim();
        onUpdateFields((prev) => [...prev, newField]);
        setQuickAddLabel('');
        setQuickAddValue('');
        setAddingToGroup(null);
      } else {
        setEditingField(newField);
        onUpdateFields((prev) => [...prev, newField]);
        setAddingToGroup(null);
      }
    },
    [fields, cardType, quickAddLabel, quickAddValue, onUpdateFields, t]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, group: FieldGroup) => {
      e.preventDefault();
      setDragOverGroup(group);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverGroup(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetGroup: FieldGroup) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData('text/plain');
      setDragOverGroup(null);

      if (!sourceId) return;

      onUpdateFields((prev) => {
        const sourceField = prev.find((f) => f.id === sourceId);
        if (!sourceField) return prev;

        // If moving to a different group, check limits
        if (sourceField.fieldGroup !== targetGroup) {
          const otherFields = prev.filter((f) => f.id !== sourceId);
          if (!canAddFieldToGroup(otherFields, targetGroup, cardType)) {
            return prev;
          }
        }

        const targetGroupFields = prev
          .filter((f) => f.fieldGroup === targetGroup && f.id !== sourceId)
          .sort((a, b) => a.order - b.order);

        // Determine drop position based on mouse Y relative to items
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const itemHeight = 48; // Approximate height of each card
        const dropIndex = Math.min(
          Math.max(0, Math.floor(relativeY / itemHeight)),
          targetGroupFields.length
        );

        const updated = prev.map((f) => {
          if (f.id === sourceId) {
            return { ...f, fieldGroup: targetGroup, order: dropIndex };
          }
          return f;
        });

        // Reorder target group
        const groupFields = updated
          .filter((f) => f.fieldGroup === targetGroup)
          .sort((a, b) => a.order - b.order);

        const reordered = groupFields.map((f, idx) => ({ ...f, order: idx }));

        return updated.map((f) => {
          const reorderedField = reordered.find((r) => r.id === f.id);
          return reorderedField ?? f;
        });
      });
    },
    [onUpdateFields, cardType]
  );

  const handleReorder = useCallback(
    (fieldId: string, direction: 'up' | 'down') => {
      onUpdateFields((prev) => {
        const field = prev.find((f) => f.id === fieldId);
        if (!field) return prev;

        const groupFields = prev
          .filter((f) => f.fieldGroup === field.fieldGroup)
          .sort((a, b) => a.order - b.order);

        const index = groupFields.findIndex((f) => f.id === fieldId);
        if (index === -1) return prev;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= groupFields.length) return prev;

        const newGroupFields = [...groupFields];
        [newGroupFields[index], newGroupFields[newIndex]] = [
          newGroupFields[newIndex]!,
          newGroupFields[index]!,
        ];

        const reordered = newGroupFields.map((f, idx) => ({ ...f, order: idx }));

        return prev.map((f) => {
          const updated = reordered.find((r) => r.id === f.id);
          return updated ?? f;
        });
      });
    },
    [onUpdateFields]
  );

  return (
    <div className="space-y-5">
      {/* Limit indicators */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {t('wallet.studio.fields.title')}
        </h3>
        <div className="grid gap-2">
          {groupValidations.map((validation) => (
            <FieldLimitIndicator
              key={validation.group}
              group={validation.group}
              current={validation.current}
              max={validation.max}
            />
          ))}
        </div>
      </div>

      {/* Field groups */}
      <div className="space-y-4">
        {FIELD_GROUPS.map((group) => {
          const groupFields = fieldsByGroup.get(group) ?? [];
          const validation = groupValidations.find((v) => v.group === group);
          const canAdd = validation ? validation.current < validation.max : false;
          const isDragOver = dragOverGroup === group;

          return (
            <div
              key={group}
              className={`rounded-lg border transition-colors ${
                isDragOver
                  ? 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}
              onDragOver={(e) => handleDragOver(e, group)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, group)}
            >
              {/* Group header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-t-lg border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {FIELD_GROUP_METADATA[group].label}
                  </h4>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                    {groupFields.length} / {FIELD_GROUP_METADATA[group].maxFields}
                  </span>
                </div>
                {canAdd && (
                  <button
                    type="button"
                    onClick={() => setAddingToGroup(group)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-0.5"
                    aria-label={`${t('wallet.studio.fields.addField')} ${FIELD_GROUP_METADATA[group].label}`}
                  >
                    + {t('wallet.studio.fields.add')}
                  </button>
                )}
              </div>

              {/* Quick add form */}
              {addingToGroup === group && (
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={quickAddLabel}
                      onChange={(e) => setQuickAddLabel(e.target.value)}
                      placeholder={t('wallet.studio.fields.label')}
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={quickAddValue}
                      onChange={(e) => setQuickAddValue(e.target.value)}
                      placeholder={t('wallet.studio.fields.value')}
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddField(group)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {t('wallet.studio.fields.addField')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingToGroup(null);
                        setQuickAddLabel('');
                        setQuickAddValue('');
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const groupFields = fields.filter((f) => f.fieldGroup === group);
                        if (!canAddFieldToGroup(fields, group, cardType)) return;
                        const newField = createEmptyField(group, groupFields.length);
                        onUpdateFields((prev) => [...prev, newField]);
                        setEditingField(newField);
                        setAddingToGroup(null);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {t('wallet.studio.fields.openEditor')}
                    </button>
                  </div>
                </div>
              )}

              {/* Field cards */}
              <div className="p-2 space-y-1.5 min-h-[48px]">
                {groupFields.length === 0 ? (
                  <div className="text-center py-6 text-sm text-neutral-400 dark:text-neutral-500">
                    {t('wallet.studio.fields.noFields')}
                  </div>
                ) : (
                  groupFields.map((field, index) => (
                    <div key={field.id} className="relative">
                      <FieldCard
                        field={field}
                        onClick={() => setEditingField(field)}
                        onToggleApple={() => handleToggleApple(field.id)}
                        onToggleGoogle={() => handleToggleGoogle(field.id)}
                        onDelete={() => handleDeleteField(field.id)}
                        hasNotification={Boolean(
                          field.notifications.appleChangeMessage ||
                            field.notifications.googleMessage
                        )}
                      />
                      {/* Reorder buttons (visible on hover/focus) */}
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorder(field.id, 'up');
                            }}
                            className="p-0.5 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            aria-label={t('wallet.studio.fields.moveUp')}
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m18 15-6-6-6 6" />
                            </svg>
                          </button>
                        )}
                        {index < groupFields.length - 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorder(field.id, 'down');
                            }}
                            className="p-0.5 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            aria-label={t('wallet.studio.fields.moveDown')}
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {/* Duplicate button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateField(field);
                        }}
                        className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded text-neutral-300 hover:text-neutral-500 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 opacity-0 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-opacity"
                        aria-label={t('wallet.studio.fields.duplicateField')}
                        title={t('wallet.studio.fields.duplicateField')}
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Global add */}
      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
        <button
          type="button"
          onClick={() => setAddingToGroup('secondary')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          {t('wallet.studio.fields.addField')}
        </button>
      </div>

      {/* Field editor modal */}
      {editingField && (
        <FieldEditorModal
          field={editingField}
          isOpen={true}
          onClose={() => setEditingField(null)}
          onSave={handleUpdateField}
          onDelete={handleDeleteField}
          cardType={cardType}
          allFields={fields}
        />
      )}
    </div>
  );
}
