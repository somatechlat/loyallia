/* designerV2/sections/DataSection.tsx — Fields (Apple + Google) */

'use client';

import React, { useState } from 'react';
import { Info, Plus, GripVertical, X } from '@/components/ui/LucideIcons';
import { APPLE_FIELD_GROUPS, GOOGLE_ROW_TYPES } from '../../constants';
import type { WalletDesignState, AppleFieldDef, GoogleFieldItem, GoogleFieldRow } from '../types';
import { AddFieldModal } from '../modals/AddFieldModal';
import { EditFieldModal } from '../modals/EditFieldModal';

/* ─── DnD imports ─────────────────────────────────────────────────── */
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ─── Info Callout ────────────────────────────────────────────────── */
function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />
      <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">{children}</p>
    </div>
  );
}

/* ─── Apple Field Group Card ──────────────────────────────────────── */
function AppleFieldGroupCard({
  group,
  fields,
  onAdd,
  onRemove,
  onEdit,
  onHover,
}: {
  group: { key: string; label: string; desc: string; max: number };
  fields: AppleFieldDef[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
  onHover?: (hovering: boolean) => void;
}) {
  const count = fields?.length || 0;
  const isMax = count >= group.max;

  return (
    <div
      className="border border-border rounded-xl bg-card overflow-hidden"
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{group.label}</span>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {count}/{(group.max as number) >= 99 ? '∞' : group.max}
          </span>
        </div>
      </div>

      {/* Fields list */}
      <div className="p-3 space-y-1.5">
        {fields && fields.length > 0 ? (
          fields.map((field, idx) => (
            <div
              key={field.key + idx}
              className="group flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors duration-100 cursor-pointer"
              onClick={() => onEdit(idx)}
            >
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{field.label}</p>
                <p className="text-xs text-muted-foreground truncate">{field.value}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity duration-100 p-1"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground italic px-2 py-1">No hay campos agregados</p>
        )}
      </div>

      {/* Add button */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onAdd}
          disabled={isMax}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors w-full justify-center
            ${isMax
              ? 'text-muted-foreground/40 cursor-not-allowed'
              : 'text-primary hover:bg-primary/5'
            }`}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
          Agregar campo
        </button>
      </div>
    </div>
  );
}

/* ─── Sortable Google Row Card ────────────────────────────────────── */
function SortableGoogleRowCard({
  row,
  onEditItem,
  onRemove,
}: {
  row: GoogleFieldRow;
  onEditItem: (itemIndex: number) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground/40 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fila — {row.type === 'oneItem' ? '1 columna' : row.type === 'twoItems' ? '2 columnas' : '3 columnas'}
            </span>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${row.type === 'oneItem' ? 1 : row.type === 'twoItems' ? 2 : 3}, 1fr)` }}>
          {row.items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onEditItem(idx)}
              className="text-left px-2.5 py-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
            >
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide truncate">{item.displayName || item.label}</p>
              <p className="text-xs font-medium text-foreground truncate mt-0.5">{item.fieldPath}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Section ────────────────────────────────────────────────── */
export interface DataSectionProps {
  walletDesign: WalletDesignState;
  onWalletDesignChange: (state: WalletDesignState) => void;
  onHoverZone?: (zone: string | null) => void;
}

export function DataSection({ walletDesign, onWalletDesignChange, onHoverZone }: DataSectionProps) {
  const isApple = walletDesign.provider === 'apple';

  /* DnD sensors */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = walletDesign.googleRows.findIndex(r => r.id === active.id);
    const newIndex = walletDesign.googleRows.findIndex(r => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onWalletDesignChange({
      ...walletDesign,
      googleRows: arrayMove(walletDesign.googleRows, oldIndex, newIndex),
    });
  };

  /* Modal state */
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDefaultGroup, setAddDefaultGroup] = useState<string | undefined>(undefined);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editAppleGroup, setEditAppleGroup] = useState<string | null>(null);
  const [editAppleIndex, setEditAppleIndex] = useState<number | null>(null);
  const [editGoogleRowIndex, setEditGoogleRowIndex] = useState<number | null>(null);
  const [editGoogleItemIndex, setEditGoogleItemIndex] = useState<number | null>(null);

  /* Apple: field groups */
  const handleAddAppleField = (groupKey: string, field: AppleFieldDef) => {
    const current = walletDesign.appleFields[groupKey] || [];
    const group = APPLE_FIELD_GROUPS.find(g => g.key === groupKey);
    if (group && current.length >= group.max) return;

    onWalletDesignChange({
      ...walletDesign,
      appleFields: { ...walletDesign.appleFields, [groupKey]: [...current, field] },
    });
  };

  const handleRemoveAppleField = (groupKey: string, index: number) => {
    const current = walletDesign.appleFields[groupKey] || [];
    onWalletDesignChange({
      ...walletDesign,
      appleFields: { ...walletDesign.appleFields, [groupKey]: current.filter((_, i) => i !== index) },
    });
  };

  const handleSaveAppleField = (groupKey: string, index: number, field: AppleFieldDef) => {
    const current = walletDesign.appleFields[groupKey] || [];
    const updated = current.map((f, i) => (i === index ? field : f));
    onWalletDesignChange({
      ...walletDesign,
      appleFields: { ...walletDesign.appleFields, [groupKey]: updated },
    });
  };

  /* Google: rows */
  const handleAddGoogleRow = (row: import('../types').GoogleFieldRow) => {
    onWalletDesignChange({
      ...walletDesign,
      googleRows: [...walletDesign.googleRows, row],
    });
  };

  const handleRemoveGoogleRow = (index: number) => {
    onWalletDesignChange({
      ...walletDesign,
      googleRows: walletDesign.googleRows.filter((_, i) => i !== index),
    });
  };

  const handleSaveGoogleItem = (rowIndex: number, itemIndex: number, item: GoogleFieldItem) => {
    const updatedRows = walletDesign.googleRows.map((row, ri) => {
      if (ri !== rowIndex) return row;
      return {
        ...row,
        items: row.items.map((it, ii) => (ii === itemIndex ? item : it)),
      };
    });
    onWalletDesignChange({ ...walletDesign, googleRows: updatedRows });
  };

  /* Open edit modal helpers */
  const openEditApple = (groupKey: string, index: number) => {
    setEditAppleGroup(groupKey);
    setEditAppleIndex(index);
    setEditGoogleRowIndex(null);
    setEditGoogleItemIndex(null);
    setShowEditModal(true);
  };

  const openEditGoogle = (rowIndex: number, itemIndex: number) => {
    setEditGoogleRowIndex(rowIndex);
    setEditGoogleItemIndex(itemIndex);
    setEditAppleGroup(null);
    setEditAppleIndex(null);
    setShowEditModal(true);
  };

  /* Current editing field data */
  const editingAppleField = editAppleGroup != null && editAppleIndex != null
    ? walletDesign.appleFields[editAppleGroup]?.[editAppleIndex]
    : undefined;

  const editingGoogleField = editGoogleRowIndex != null && editGoogleItemIndex != null
    ? walletDesign.googleRows[editGoogleRowIndex]?.items[editGoogleItemIndex]
    : undefined;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">
        {isApple ? 'Campos del pase' : 'Filas de información'}
      </h2>

      <InfoCallout>
        {isApple
          ? 'Los campos definen qué información aparece en el pase. Cada zona tiene reglas específicas de Apple Wallet.'
          : 'Google Wallet muestra información en filas de 1, 2 o 3 columnas.'
        }
      </InfoCallout>

      {isApple ? (
        <div className="space-y-4">
          {APPLE_FIELD_GROUPS.map(group => (
            <AppleFieldGroupCard
              key={group.key}
              group={group}
              fields={walletDesign.appleFields[group.key] || []}
              onAdd={() => { setAddDefaultGroup(group.key); setShowAddModal(true); }}
              onRemove={(idx) => handleRemoveAppleField(group.key, idx)}
              onEdit={(idx) => openEditApple(group.key, idx)}
              onHover={(hovering) => onHoverZone?.(hovering ? group.key : null)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={walletDesign.googleRows.map(r => r.id)}
              strategy={verticalListSortingStrategy}
            >
              {walletDesign.googleRows.map((row, idx) => (
                <SortableGoogleRowCard
                  key={row.id}
                  row={row}
                  onEditItem={(itemIdx) => openEditGoogle(idx, itemIdx)}
                  onRemove={() => handleRemoveGoogleRow(idx)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add row buttons */}
          <div className="grid grid-cols-3 gap-2">
            {GOOGLE_ROW_TYPES.map(rt => (
              <button
                key={rt.value}
                type="button"
                onClick={() => {
                  setAddDefaultGroup(undefined);
                  setShowAddModal(true);
                }}
                className="flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                {rt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddFieldModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        platform={walletDesign.provider}
        defaultAppleGroup={addDefaultGroup}
        onAddAppleField={handleAddAppleField}
        onAddGoogleRow={handleAddGoogleRow}
      />

      <EditFieldModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        platform={walletDesign.provider}
        appleField={editingAppleField}
        appleGroupKey={editAppleGroup ?? undefined}
        googleItem={editingGoogleField}
        googleRowIndex={editGoogleRowIndex ?? undefined}
        googleItemIndex={editGoogleItemIndex ?? undefined}
        onSaveApple={handleSaveAppleField}
        onSaveGoogle={handleSaveGoogleItem}
        onRemoveApple={handleRemoveAppleField}
        onRemoveGoogle={(rowIdx, itemIdx) => {
          const row = walletDesign.googleRows[rowIdx];
          if (!row) return;
          if (row.items.length <= 1) {
            handleRemoveGoogleRow(rowIdx);
          } else {
            const updatedRows = walletDesign.googleRows.map((r, ri) => {
              if (ri !== rowIdx) return r;
              return { ...r, items: r.items.filter((_, ii) => ii !== itemIdx) };
            });
            onWalletDesignChange({ ...walletDesign, googleRows: updatedRows });
          }
        }}
      />
    </div>
  );
}
