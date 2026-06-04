/**
 * Main field editor container — SRS-003 Section 8.3.
 *
 * Panel-based groups with inline expanded editing.
 * No modal — all editing happens inline.
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { LockedFeature } from './LockedFeature';
import type { UnifiedField, FieldGroup, CardType } from '@/components/wallet/types/unified-state';
import { validateFieldGroupLimits, canAddFieldToGroup } from '@/components/wallet/utils/field-validation';
import { FieldCard } from './FieldCard';

export interface FieldStudioProps {
  fields: UnifiedField[];
  cardType: CardType;
  onUpdateFields: (fields: UnifiedField[] | ((prev: UnifiedField[]) => UnifiedField[])) => void;
}

const FIELD_GROUPS: FieldGroup[] = ['header', 'primary', 'secondary', 'auxiliary', 'back'];

const GROUP_TITLES: Record<FieldGroup, { title: string; subtitle?: string }> = {
  header: {
    title: '🏷️ CAMPOS DE CABECERA — Máximo 3',
    subtitle: '(Visibles incluso cuando el pase está en pila)',
  },
  primary: {
    title: '⭐ CAMPO PRINCIPAL — 1 campo grande y prominente',
  },
  secondary: {
    title: '📋 CAMPOS SECUNDARIOS — Hasta 4 (2 en Apple si barcode rect.)',
  },
  auxiliary: {
    title: '🔍 CAMPOS AUXILIARES — Hasta 4 (2 en Apple si barcode rect.)',
  },
  back: {
    title: '📄 DETALLES / TRASERO — Sin límite',
  },
};

const GROUP_ADD_LABELS: Record<FieldGroup, string> = {
  header: 'Añadir campo de cabecera',
  primary: 'Añadir campo principal',
  secondary: 'Añadir campo secundario',
  auxiliary: 'Añadir campo auxiliar',
  back: 'Añadir campo de detalles',
};

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

/* ── Icons ────────────────────────────────────────────────────────── */

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* ── Component ────────────────────────────────────────────────────── */

export function FieldStudio({ fields, cardType, onUpdateFields }: FieldStudioProps) {
  const planFeatures = usePlanFeatures();
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
      onUpdateFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    },
    [onUpdateFields]
  );

  const handleDeleteField = useCallback(
    (fieldId: string) => {
      onUpdateFields((prev) => prev.filter((f) => f.id !== fieldId));
    },
    [onUpdateFields]
  );

  const handleAddField = useCallback(
    (group: FieldGroup) => {
      const groupFields = fields.filter((f) => f.fieldGroup === group);
      if (!canAddFieldToGroup(fields, group, cardType)) return;

      const newField = createEmptyField(group, groupFields.length);
      onUpdateFields((prev) => [...prev, newField]);
    },
    [fields, cardType, onUpdateFields]
  );

  /* ── Drag & drop ────────────────────────────────────────────────── */

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
        const itemHeight = 56; // Approximate height of each card / compact row
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

  /* ── Reorder buttons ────────────────────────────────────────────── */

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
      {!planFeatures.hasAdvancedFields && (
        <LockedFeature
          featureName="Campos avanzados"
          requiredPlan="Profesional"
          isLocked={!planFeatures.hasAdvancedFields}
        >
          <div className="h-12" />
        </LockedFeature>
      )}
      {FIELD_GROUPS.map((group) => {
        const groupFields = fieldsByGroup.get(group) ?? [];
        const validation = groupValidations.find((v) => v.group === group);
        const canAdd = validation ? validation.current < validation.max : false;
        const isDragOver = dragOverGroup === group;
        const isCompactGroup = group === 'secondary' || group === 'auxiliary';

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
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-t-lg border-b border-neutral-200 dark:border-neutral-700">
              <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                {GROUP_TITLES[group].title}
              </h4>
              {GROUP_TITLES[group].subtitle && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {GROUP_TITLES[group].subtitle}
                </p>
              )}
            </div>

            {/* Fields */}
            <div className="p-3 space-y-2 min-h-[48px]">
              {groupFields.length === 0 ? (
                <div className="text-center py-6 text-sm text-neutral-400 dark:text-neutral-500">
                  No hay campos en este grupo
                </div>
              ) : (
                groupFields.map((field, index) => (
                  <div key={field.id} className="relative group/field">
                    <FieldCard
                      field={field}
                      cardType={cardType}
                      isCompact={isCompactGroup}
                      showAdvanced={planFeatures.hasAdvancedFields}
                      onUpdate={handleUpdateField}
                      onDelete={() => handleDeleteField(field.id)}
                    />

                    {/* Reorder buttons */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col opacity-0 group-hover/field:opacity-100 focus-within:opacity-100 transition-opacity z-10">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReorder(field.id, 'up');
                          }}
                          className="p-0.5 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          aria-label="Move up"
                          title="Move up"
                        >
                          <ArrowUpIcon className="w-3 h-3" />
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
                          aria-label="Move down"
                          title="Move down"
                        >
                          <ArrowDownIcon className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add button */}
            {canAdd && (
              <div className="px-3 pb-3">
                <button
                  type="button"
                  onClick={() => handleAddField(group)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Añadir campo a ${GROUP_TITLES[group].title}`}
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  {GROUP_ADD_LABELS[group]}
                  {validation && validation.max < Infinity && (
                    <span className="text-neutral-400 dark:text-neutral-500">
                      ({validation.max - validation.current} restantes)
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
