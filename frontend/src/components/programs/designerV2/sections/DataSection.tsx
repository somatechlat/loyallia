/* designerV2/sections/DataSection.tsx — Fields (Apple + Google) */

'use client';

import React from 'react';
import { Info, Plus, GripVertical, X } from 'lucide-react';
import { APPLE_FIELD_GROUPS, GOOGLE_ROW_TYPES } from '../constants';
import type { WalletDesignState, AppleFieldDef, GoogleFieldRow } from '../types';

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
  groupKey,
  group,
  fields,
  onAdd,
  onRemove,
  onEdit,
}: {
  groupKey: string;
  group: typeof APPLE_FIELD_GROUPS[0];
  fields: AppleFieldDef[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
}) {
  const count = fields?.length || 0;
  const isMax = count >= group.max;

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{group.label}</span>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {count}/{group.max === 99 ? '∞' : group.max}
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

/* ─── Google Row Card ─────────────────────────────────────────────── */
function GoogleRowCard({
  row,
  onEditItem,
  onRemove,
}: {
  row: GoogleFieldRow;
  onEditItem: (itemIndex: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Fila — {row.type === 'oneItem' ? '1 columna' : row.type === 'twoItems' ? '2 columnas' : '3 columnas'}
        </span>
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
  );
}

/* ─── Main Section ────────────────────────────────────────────────── */
export interface DataSectionProps {
  walletDesign: WalletDesignState;
  onWalletDesignChange: (state: WalletDesignState) => void;
  cardType: string;
}

export function DataSection({ walletDesign, onWalletDesignChange, cardType }: DataSectionProps) {
  const isApple = walletDesign.provider === 'apple';

  /* Apple: field groups */
  const handleAddAppleField = (groupKey: string) => {
    const current = walletDesign.appleFields[groupKey] || [];
    const group = APPLE_FIELD_GROUPS.find(g => g.key === groupKey);
    if (group && current.length >= group.max) return;

    const newField: AppleFieldDef = {
      key: `field_${Date.now()}`,
      label: 'Nuevo campo',
      value: '—',
    };
    onWalletDesignChange({
      ...walletDesign,
      appleFields: { ...walletDesign.appleFields, [groupKey]: [...current, newField] },
    });
  };

  const handleRemoveAppleField = (groupKey: string, index: number) => {
    const current = walletDesign.appleFields[groupKey] || [];
    onWalletDesignChange({
      ...walletDesign,
      appleFields: { ...walletDesign.appleFields, [groupKey]: current.filter((_, i) => i !== index) },
    });
  };

  /* Google: rows */
  const handleAddGoogleRow = (type: GoogleFieldRow['type']) => {
    const newRow: GoogleFieldRow = {
      id: `row_${Date.now()}`,
      type,
      items: Array.from({ length: type === 'oneItem' ? 1 : type === 'twoItems' ? 2 : 3 }, (_, i) => ({
        id: `item_${Date.now()}_${i}`,
        fieldPath: 'object.accountName',
        label: 'Campo',
        displayName: 'Campo',
      })),
    };
    onWalletDesignChange({
      ...walletDesign,
      googleRows: [...walletDesign.googleRows, newRow],
    });
  };

  const handleRemoveGoogleRow = (index: number) => {
    onWalletDesignChange({
      ...walletDesign,
      googleRows: walletDesign.googleRows.filter((_, i) => i !== index),
    });
  };

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
              groupKey={group.key}
              group={group}
              fields={walletDesign.appleFields[group.key] || []}
              onAdd={() => handleAddAppleField(group.key)}
              onRemove={(idx) => handleRemoveAppleField(group.key, idx)}
              onEdit={(idx) => {
                /* TODO: open EditFieldModal */
              }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {walletDesign.googleRows.map((row, idx) => (
            <GoogleRowCard
              key={row.id}
              row={row}
              onEditItem={(itemIdx) => {
                /* TODO: open EditFieldModal */
              }}
              onRemove={() => handleRemoveGoogleRow(idx)}
            />
          ))}

          {/* Add row buttons */}
          <div className="grid grid-cols-3 gap-2">
            {GOOGLE_ROW_TYPES.map(rt => (
              <button
                key={rt.value}
                type="button"
                onClick={() => handleAddGoogleRow(rt.value as GoogleFieldRow['type'])}
                className="flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                {rt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
