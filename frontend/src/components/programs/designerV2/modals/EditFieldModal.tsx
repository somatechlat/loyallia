/* designerV2/modals/EditFieldModal.tsx — Edit Apple or Google field */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, Trash2 } from '@/components/ui/LucideIcons';
import type { AppleFieldDef, GoogleFieldItem } from '../types';
import { GOOGLE_PREDEFINED_FIELDS, FIELD_VALUE_PRESETS } from '../../constants';

type TabKey = 'details' | 'platform' | 'advanced';

interface EditFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: 'apple' | 'google';
  /* Apple context */
  appleField?: AppleFieldDef;
  appleGroupKey?: string;
  /* Google context */
  googleItem?: GoogleFieldItem;
  googleRowIndex?: number;
  googleItemIndex?: number;
  /* Callbacks */
  onSaveApple: (groupKey: string, index: number, field: AppleFieldDef) => void;
  onSaveGoogle: (rowIndex: number, itemIndex: number, item: GoogleFieldItem) => void;
  onRemoveApple?: (groupKey: string, index: number) => void;
  onRemoveGoogle?: (rowIndex: number, itemIndex: number) => void;
}

export function EditFieldModal({
  isOpen,
  onClose,
  platform,
  appleField,
  appleGroupKey,
  googleItem,
  googleRowIndex,
  googleItemIndex,
  onSaveApple,
  onSaveGoogle,
  onRemoveApple,
  onRemoveGoogle,
}: EditFieldModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('details');

  /* Apple local state */
  const [aLabel, setALabel] = useState('');
  const [aValue, setAValue] = useState('');
  const [aKey, setAKey] = useState('');
  const [aTextAlign, setATextAlign] = useState<AppleFieldDef['textAlignment']>('PKTextAlignmentNatural');
  const [aChangeMsg, setAChangeMsg] = useState('');
  const [aAttributed, setAAttributed] = useState('');

  /* Google local state */
  const [gLabel, setGLabel] = useState('');
  const [gDisplayName, setGDisplayName] = useState('');
  const [gFieldPath, setGFieldPath] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('details');
    if (platform === 'apple' && appleField) {
      setALabel(appleField.label);
      setAValue(appleField.value);
      setAKey(appleField.key);
      setATextAlign(appleField.textAlignment || 'PKTextAlignmentNatural');
      setAChangeMsg(appleField.changeMessage || '');
      setAAttributed(appleField.attributedValue || '');
    }
    if (platform === 'google' && googleItem) {
      setGLabel(googleItem.label);
      setGDisplayName(googleItem.displayName);
      setGFieldPath(googleItem.fieldPath);
    }
  }, [isOpen, platform, appleField, googleItem]);

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

  const handleSave = () => {
    if (platform === 'apple' && appleField && appleGroupKey != null && googleRowIndex == null) {
      onSaveApple(appleGroupKey, googleRowIndex ?? 0, {
        ...appleField,
        label: aLabel,
        value: aValue,
        key: aKey,
        textAlignment: aTextAlign,
        changeMessage: aChangeMsg || undefined,
        attributedValue: aAttributed || undefined,
      });
    } else if (platform === 'google' && googleItem && googleRowIndex != null && googleItemIndex != null) {
      onSaveGoogle(googleRowIndex, googleItemIndex, {
        ...googleItem,
        label: gLabel,
        displayName: gDisplayName,
        fieldPath: gFieldPath,
      });
    }
    onClose();
  };

  const handleRemove = () => {
    if (platform === 'apple' && appleGroupKey != null && googleRowIndex != null && onRemoveApple) {
      onRemoveApple(appleGroupKey, googleRowIndex);
    } else if (platform === 'google' && googleRowIndex != null && googleItemIndex != null && onRemoveGoogle) {
      onRemoveGoogle(googleRowIndex, googleItemIndex);
    }
    onClose();
  };

  if (!isOpen) return null;

  const tabs: { key: TabKey; label: string }[] =
    platform === 'apple'
      ? [
          { key: 'details', label: 'Detalles' },
          { key: 'platform', label: 'Apple' },
          { key: 'advanced', label: 'Avanzado' },
        ]
      : [
          { key: 'details', label: 'Detalles' },
          { key: 'platform', label: 'Google' },
        ];

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
            Editar campo
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="w-4 h-4 text-surface-500" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-200 dark:border-white/[0.06]">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative
                ${activeTab === t.key
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
            >
              {t.label}
              {activeTab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
              )}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {platform === 'apple' ? (
            <>
              {activeTab === 'details' && (
                <>
                  <div>
                    <label className="label">Etiqueta</label>
                    <input
                      type="text"
                      className="input"
                      value={aLabel}
                      onChange={e => setALabel(e.target.value)}
                      placeholder="Ej: NOMBRE DEL CLIENTE"
                    />
                  </div>
                  <div>
                    <label className="label">Valor</label>
                    <select
                      className="input"
                      value={FIELD_VALUE_PRESETS.find(p => p.value === aValue && p.value !== "") ? aValue : '__custom__'}
                      onChange={e => {
                        const selected = e.target.value;
                        if (selected === '__custom__') {
                          setAValue('');
                        } else {
                          setAValue(selected);
                        }
                      }}
                    >
                      {FIELD_VALUE_PRESETS.map(p => (
                        <option key={p.value || 'custom'} value={p.value === "" ? '__custom__' : p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    {(aValue === '' || !FIELD_VALUE_PRESETS.some(p => p.value === aValue && p.value !== "")) && (
                      <input
                        type="text"
                        className="input mt-2"
                        value={aValue}
                        onChange={e => setAValue(e.target.value)}
                        placeholder="Escribe un valor personalizado..."
                      />
                    )}
                  </div>
                  <div>
                    <label className="label">Clave (key)</label>
                    <input
                      type="text"
                      className="input"
                      value={aKey}
                      onChange={e => setAKey(e.target.value)}
                      placeholder="Ej: customer_name"
                    />
                  </div>
                </>
              )}

              {activeTab === 'platform' && (
                <>
                  <div>
                    <label className="label">Alineación del texto</label>
                    <select
                      className="input"
                      value={aTextAlign}
                      onChange={e => setATextAlign(e.target.value as AppleFieldDef['textAlignment'])}
                    >
                      <option value="PKTextAlignmentLeft">Izquierda</option>
                      <option value="PKTextAlignmentCenter">Centro</option>
                      <option value="PKTextAlignmentRight">Derecha</option>
                      <option value="PKTextAlignmentNatural">Natural</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Mensaje de cambio</label>
                    <input
                      type="text"
                      className="input"
                      value={aChangeMsg}
                      onChange={e => setAChangeMsg(e.target.value)}
                      placeholder="Ej: Tu saldo cambió a %@"
                    />
                    <p className="text-[10px] text-surface-500 mt-1">Usa %@ como marcador de posición para el valor.</p>
                  </div>
                </>
              )}

              {activeTab === 'advanced' && (
                <>
                  <div>
                    <label className="label">Valor atribuido (HTML)</label>
                    <textarea
                      className="input min-h-[80px] resize-none"
                      value={aAttributed}
                      onChange={e => setAAttributed(e.target.value)}
                      placeholder="Ej: &lt;b&gt;Texto en negrita&lt;/b&gt;"
                    />
                    <p className="text-[10px] text-surface-500 mt-1">Soporta un subconjunto de HTML para estilos enriquecidos.</p>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {activeTab === 'details' && (
                <>
                  <div>
                    <label className="label">Etiqueta</label>
                    <input
                      type="text"
                      className="input"
                      value={gLabel}
                      onChange={e => setGLabel(e.target.value)}
                      placeholder="Ej: Nombre del cliente"
                    />
                  </div>
                  <div>
                    <label className="label">Nombre visible</label>
                    <input
                      type="text"
                      className="input"
                      value={gDisplayName}
                      onChange={e => setGDisplayName(e.target.value)}
                      placeholder="Ej: Cliente"
                    />
                  </div>
                </>
              )}

              {activeTab === 'platform' && (
                <>
                  <div>
                    <label className="label">Ruta del campo (fieldPath)</label>
                    <select
                      className="input"
                      value={gFieldPath}
                      onChange={e => setGFieldPath(e.target.value)}
                    >
                      <option value="">Seleccionar campo…</option>
                      {GOOGLE_PREDEFINED_FIELDS.map(f => (
                        <option key={f.path} value={f.path}>
                          {f.label} — {f.path}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">O escribe una ruta personalizada</label>
                    <input
                      type="text"
                      className="input"
                      value={gFieldPath}
                      onChange={e => setGFieldPath(e.target.value)}
                      placeholder="Ej: object.accountName"
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-surface-200 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={handleRemove}
            className="btn-danger px-4"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary"
          >
            <Save className="w-4 h-4" strokeWidth={1.5} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
