/* designerV2/modals/AddFieldModal.tsx — Add new Apple or Google field */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus } from '@/components/ui/LucideIcons';
import { APPLE_FIELD_GROUPS, GOOGLE_ROW_TYPES } from '../../constants';
import type { AppleFieldDef, GoogleFieldRow } from '../types';

interface AddFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: 'apple' | 'google';
  defaultAppleGroup?: string;
  onAddAppleField: (groupKey: string, field: AppleFieldDef) => void;
  onAddGoogleRow: (row: GoogleFieldRow) => void;
}

export function AddFieldModal({
  isOpen,
  onClose,
  platform,
  defaultAppleGroup,
  onAddAppleField,
  onAddGoogleRow,
}: AddFieldModalProps) {
  const [activeTab, setActiveTab] = useState<'apple' | 'google'>(platform);
  const [appleGroup, setAppleGroup] = useState(defaultAppleGroup || 'headerFields');
  const [googleType, setGoogleType] = useState<GoogleFieldRow['type']>('oneItem');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [key, setKey] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(platform);
      setAppleGroup(defaultAppleGroup || 'headerFields');
      setGoogleType('oneItem');
      setLabel('');
      setValue('');
      setKey('');
    }
  }, [isOpen, platform, defaultAppleGroup]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isOpen, handleKeyDown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'apple') {
      const group = APPLE_FIELD_GROUPS.find(g => g.key === appleGroup);
      if (!group) return;
      onAddAppleField(appleGroup, {
        key: key.trim() || `field_${Date.now()}`,
        label: label.trim() || 'Nuevo campo',
        value: value.trim() || '—',
      });
    } else {
      const count = googleType === 'oneItem' ? 1 : googleType === 'twoItems' ? 2 : 3;
      const newRow: GoogleFieldRow = {
        id: `row_${Date.now()}`,
        type: googleType,
        items: Array.from({ length: count }, (_, i) => ({
          id: `item_${Date.now()}_${i}`,
          fieldPath: 'object.accountName',
          label: label.trim() || 'Campo',
          displayName: label.trim() || 'Campo',
        })),
      };
      onAddGoogleRow(newRow);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-white/[0.06]">
          <h3 className="text-lg font-bold text-surface-900 dark:text-white">
            Agregar campo
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="w-4 h-4 text-surface-500" strokeWidth={1.5} />
          </button>
        </div>

        {/* Platform tabs */}
        <div className="flex border-b border-surface-200 dark:border-white/[0.06]">
          {(['apple', 'google'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setActiveTab(p)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative
                ${activeTab === p
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
            >
              {p === 'apple' ? 'Apple Wallet' : 'Google Wallet'}
              {activeTab === p && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {activeTab === 'apple' ? (
            <>
              {/* Apple group selector */}
              <div>
                <label className="label">Zona del pase</label>
                <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto">
                  {APPLE_FIELD_GROUPS.map(g => (
                    <label
                      key={g.key}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm
                        ${appleGroup === g.key
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-surface-200 dark:border-white/[0.06] hover:border-surface-300'
                        }`}
                    >
                      <input
                        type="radio"
                        name="appleGroup"
                        value={g.key}
                        checked={appleGroup === g.key}
                        onChange={() => setAppleGroup(g.key)}
                        className="accent-brand-500"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-surface-900 dark:text-white">{g.label}</span>
                        <p className="text-xs text-surface-500 dark:text-surface-400">{g.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Etiqueta</label>
                <input
                  type="text"
                  className="input"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="Ej: NOMBRE DEL CLIENTE"
                />
              </div>

              <div>
                <label className="label">Valor</label>
                <input
                  type="text"
                  className="input"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="Ej: {customer_name}"
                />
              </div>

              <div>
                <label className="label">Clave (key)</label>
                <input
                  type="text"
                  className="input"
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  placeholder="Ej: customer_name"
                />
              </div>
            </>
          ) : (
            <>
              {/* Google row type selector */}
              <div>
                <label className="label">Tipo de fila</label>
                <div className="grid grid-cols-3 gap-2">
                  {GOOGLE_ROW_TYPES.map(rt => (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => setGoogleType(rt.value as GoogleFieldRow['type'])}
                      className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                        ${googleType === rt.value
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
                          : 'border-surface-200 text-surface-700 hover:border-surface-300 dark:border-white/[0.06] dark:text-surface-300'
                        }`}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Etiqueta base para campos</label>
                <input
                  type="text"
                  className="input"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="Ej: Campo"
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              Agregar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
