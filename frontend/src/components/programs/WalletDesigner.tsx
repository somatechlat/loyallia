/* WalletDesigner.tsx — Full visual designer for Apple & Google Wallet pass customization */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import {
  APPLE_PASS_STYLES,
  GOOGLE_WALLET_TYPES,
  APPLE_IMAGE_SUPPORT,
  APPLE_IMAGE_SPECS,
  GOOGLE_IMAGE_SPECS,
  GOOGLE_ROW_TYPES,
  GOOGLE_PREDEFINED_FIELDS,
  APPLE_FIELD_GROUPS,
  GOOGLE_DEVICE_SHARING_OPTIONS,
} from './constants';

/* ─── Lucide-like inline SVGs ─────────────────────────────────────── */
function PlusIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function TrashIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    </svg>
  );
}
function ChevronUpIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  );
}
function ChevronDownIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function InfoIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  );
}
function ImageIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}
function AppleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.84-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}
function GoogleGIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.068 0 11-4.932 11-11 0-.73-.074-1.44-.213-2.128H12.545z"/>
    </svg>
  );
}

/* ─── Types ───────────────────────────────────────────────────────── */
export interface AppleWalletFeatureConfig {
  nfc_enabled: boolean;
  nfc_requires_authentication: boolean;
}

export interface GoogleFieldRow {
  id: string;
  type: 'oneItem' | 'twoItems' | 'threeItems';
  items: GoogleFieldItem[];
}

export interface GoogleFieldItem {
  id: string;
  fieldPath: string;
  label: string;
  displayName: string;
}

export interface AppleFieldDef {
  key: string;
  label: string;
  value: string;
  changeMessage?: string;
  textAlignment?: 'PKTextAlignmentLeft' | 'PKTextAlignmentCenter' | 'PKTextAlignmentRight' | 'PKTextAlignmentNatural';
  attributedValue?: string;
}

export interface GoogleAdvancedConfig {
  reviewStatus: 'underReview' | 'approved' | 'rejected';
  allowMultipleUsers: string; // ONE_USER_ALL_DEVICES | ONE_USER_ONE_DEVICE | MULTIPLE_USERS
  homepageUri: string;
  helpUri: string;
  linksModuleUris: { label: string; uri: string }[];
  messages: { header: string; body: string }[];
  notifyPreference: boolean;
}

export interface AppleAdvancedConfig {
  suppressStripShine: boolean;
  nfcMessage: string;
  sharingProhibited: boolean;
  voided: boolean;
  expirationDate: string;
}

export interface WalletDesignState {
  provider: 'apple' | 'google';
  /* Apple images */
  appleLogoUrl: string;
  appleLogo2xUrl: string;
  appleStripUrl: string;
  appleStrip2xUrl: string;
  appleThumbnailUrl: string;
  appleThumbnail2xUrl: string;
  appleIconUrl: string;
  appleIcon2xUrl: string;
  /* Google images */
  googleProgramLogoUrl: string;
  googleHeroImageUrl: string;
  googleWideLogoUrl: string;
  googleImageModuleUrl: string;
  /* Apple fields */
  appleFields: Record<string, AppleFieldDef[]>;
  /* Google rows */
  googleRows: GoogleFieldRow[];
  /* Advanced */
  googleAdvanced: GoogleAdvancedConfig;
  appleAdvanced: AppleAdvancedConfig;
  /* Apple NFC */
  appleNfc: AppleWalletFeatureConfig;
}

export function defaultWalletDesignState(): WalletDesignState {
  return {
    provider: 'apple',
    appleLogoUrl: '', appleLogo2xUrl: '', appleStripUrl: '', appleStrip2xUrl: '',
    appleThumbnailUrl: '', appleThumbnail2xUrl: '', appleIconUrl: '', appleIcon2xUrl: '',
    googleProgramLogoUrl: '', googleHeroImageUrl: '', googleWideLogoUrl: '', googleImageModuleUrl: '',
    appleFields: {},
    googleRows: [],
    googleAdvanced: {
      reviewStatus: 'underReview',
      allowMultipleUsers: 'ONE_USER_ALL_DEVICES',
      homepageUri: '',
      helpUri: '',
      linksModuleUris: [],
      messages: [],
      notifyPreference: true,
    },
    appleAdvanced: {
      suppressStripShine: false,
      nfcMessage: '',
      sharingProhibited: false,
      voided: false,
      expirationDate: '',
    },
    appleNfc: { nfc_enabled: false, nfc_requires_authentication: false },
  };
}

/* ─── Helpers ─────────────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ─── Image Upload Component ──────────────────────────────────────── */
function ImageUploadField({
  label, desc, dimPx, dimPt, required,
  value, onChange,
}: {
  label: string;
  desc: string;
  dimPx: string;
  dimPt?: string;
  required: boolean;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [onChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {required && <span className="text-xs bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">Obligatorio</span>}
        <span className="text-xs text-slate-400 ml-auto font-mono">{dimPx}{dimPt ? ` (${dimPt}pt)` : ''}</span>
      </div>
      <p className="text-xs text-slate-500">{desc}</p>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed transition-all overflow-hidden
          ${dragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-brand-300'}
          ${value ? 'p-0 aspect-video' : 'p-4 flex flex-col items-center justify-center gap-2 aspect-video'}
        `}
      >
        {value ? (
          <img src={value} alt={label} className="w-full h-full object-contain" />
        ) : (
          <>
            <ImageIcon className="w-8 h-8 text-slate-300" />
            <span className="text-xs text-slate-400 text-center">Haz click o arrastra una imagen<br/>{dimPx}</span>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />
      </div>
      {value && (
        <button
          onClick={() => onChange('')}
          className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1"
        >
          <TrashIcon className="w-3 h-3" /> Eliminar imagen
        </button>
      )}
    </div>
  );
}

/* ─── Platform Toggle ─────────────────────────────────────────────── */
function PlatformToggle({
  value, onChange,
}: {
  value: 'apple' | 'google';
  onChange: (v: 'apple' | 'google') => void;
}) {
  return (
    <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
      <button
        onClick={() => onChange('apple')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all
          ${value === 'apple' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <AppleIcon className="w-4 h-4" /> Apple Wallet
      </button>
      <button
        onClick={() => onChange('google')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all
          ${value === 'google' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <GoogleGIcon className="w-4 h-4" /> Google Wallet
      </button>
    </div>
  );
}

/* ─── Google Card Template Builder ────────────────────────────────── */
function GoogleRowBuilder({ rows, onChange }: { rows: GoogleFieldRow[]; onChange: (rows: GoogleFieldRow[]) => void }) {
  const addRow = (type: 'oneItem' | 'twoItems' | 'threeItems') => {
    const row: GoogleFieldRow = {
      id: uid(),
      type,
      items: Array.from({ length: type === 'oneItem' ? 1 : type === 'twoItems' ? 2 : 3 }, () => ({
        id: uid(),
        fieldPath: '',
        label: '',
        displayName: '',
      })),
    };
    onChange([...rows, row]);
  };

  const updateItem = (rowId: string, itemId: string, patch: Partial<GoogleFieldItem>) => {
    onChange(rows.map(r => r.id === rowId ? { ...r, items: r.items.map(i => i.id === itemId ? { ...i, ...patch } : i) } : r));
  };

  const removeRow = (rowId: string) => onChange(rows.filter(r => r.id !== rowId));
  const moveRow = (idx: number, dir: -1 | 1) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= rows.length) return;
    const cp = [...rows];
    const tmp = cp[idx];
    cp[idx] = cp[ni]!;
    cp[ni] = tmp!;
    onChange(cp);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-slate-800">Configuración de filas</h4>
        <span className="text-xs text-slate-400">{rows.length} fila(s)</span>
      </div>

      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center">
          <InfoIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
          <p className="text-xs text-slate-400">Sin filas configuradas. Añade filas usando los botones de abajo.</p>
        </div>
      )}

      {rows.map((row, rIdx) => (
        <div key={row.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-600">Fila {rIdx + 1}</span>
            <span className="text-xs text-slate-400 px-2 py-0.5 bg-slate-100 rounded">
              {GOOGLE_ROW_TYPES.find(t => t.value === row.type)?.label}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => moveRow(rIdx, -1)} disabled={rIdx === 0} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"><ChevronUpIcon className="w-3 h-3" /></button>
              <button onClick={() => moveRow(rIdx, 1)} disabled={rIdx === rows.length - 1} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"><ChevronDownIcon className="w-3 h-3" /></button>
              <button onClick={() => removeRow(row.id)} className="p-1 hover:bg-rose-100 rounded text-rose-500"><TrashIcon className="w-3 h-3" /></button>
            </div>
          </div>
          <div className="p-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${row.type === 'oneItem' ? 1 : row.type === 'twoItems' ? 2 : 3}, 1fr)` }}>
            {row.items.map((item, iIdx) => (
              <div key={item.id} className="space-y-2">
                <label className="text-xs text-slate-500">Campo {iIdx + 1}</label>
                <select
                  value={item.fieldPath}
                  onChange={e => {
                    const fieldPath = e.target.value;
                    const predefined = GOOGLE_PREDEFINED_FIELDS.find(f => f.path === fieldPath);
                    updateItem(row.id, item.id, {
                      fieldPath,
                      label: predefined?.label || '',
                      displayName: predefined?.label || '',
                    });
                  }}
                  className="w-full text-sm rounded-lg border border-slate-200 px-2.5 py-2 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">Selecciona un campo...</option>
                  <optgroup label="Campos predefinidos">
                    {GOOGLE_PREDEFINED_FIELDS.map(f => (
                      <option key={f.path} value={f.path}>{f.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Campos personalizados">
                    <option value="custom">Personalizado...</option>
                  </optgroup>
                </select>
                {item.fieldPath === 'custom' && (
                  <input
                    type="text"
                    placeholder="ID del campo (ej: object.customField)"
                    value={item.label}
                    onChange={e => updateItem(row.id, item.id, { label: e.target.value })}
                    className="w-full text-sm rounded-lg border border-slate-200 px-2.5 py-2 focus:ring-2 focus:ring-brand-500"
                  />
                )}
                <input
                  type="text"
                  placeholder="Etiqueta visible"
                  value={item.displayName}
                  onChange={e => updateItem(row.id, item.id, { displayName: e.target.value })}
                  className="w-full text-sm rounded-lg border border-slate-200 px-2.5 py-2 focus:ring-2 focus:ring-brand-500"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        {GOOGLE_ROW_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => addRow(t.value)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <PlusIcon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Apple Field Layout Editor ───────────────────────────────────── */
function AppleFieldEditor({
  fields,
  onChange,
}: {
  fields: Record<string, AppleFieldDef[]>;
  onChange: (fields: Record<string, AppleFieldDef[]>) => void;
}) {
  const updateGroup = (groupKey: string, groupFields: AppleFieldDef[]) => {
    onChange({ ...fields, [groupKey]: groupFields });
  };

  const addField = (groupKey: string) => {
    const group = APPLE_FIELD_GROUPS.find(g => g.key === groupKey)!;
    const current = fields[groupKey] || [];
    if (current.length >= group.max) return;
    updateGroup(groupKey, [...current, { key: uid(), label: '', value: '', textAlignment: 'PKTextAlignmentNatural' }]);
  };

  const removeField = (groupKey: string, idx: number) => {
    const current = [...(fields[groupKey] || [])];
    current.splice(idx, 1);
    updateGroup(groupKey, current);
  };

  const moveField = (groupKey: string, idx: number, dir: -1 | 1) => {
    const current = [...(fields[groupKey] || [])];
    const ni = idx + dir;
    if (ni < 0 || ni >= current.length) return;
    const tmp = current[idx];
    current[idx] = current[ni]!;
    current[ni] = tmp!;
    updateGroup(groupKey, current);
  };

  return (
    <div className="space-y-4">
      {APPLE_FIELD_GROUPS.map(group => {
        const groupFields = fields[group.key] || [];
        return (
          <div key={group.key} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">{group.label}</span>
              <span className="text-xs text-slate-400">{group.desc}</span>
              <span className="ml-auto text-xs text-slate-400">{groupFields.length}/{group.max}</span>
            </div>
            <div className="p-3 space-y-2">
              {groupFields.map((f, idx) => (
                <div key={f.key} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Etiqueta (ej: CLIENTE)"
                      value={f.label}
                      onChange={e => {
                        const updated = [...groupFields];
                        updated[idx] = { ...f, label: e.target.value };
                        updateGroup(group.key, updated);
                      }}
                      className="text-sm rounded-lg border border-slate-200 px-2.5 py-1.5 focus:ring-2 focus:ring-brand-500"
                    />
                    <input
                      type="text"
                      placeholder="Valor (usa {variable})"
                      value={f.value}
                      onChange={e => {
                        const updated = [...groupFields];
                        updated[idx] = { ...f, value: e.target.value };
                        updateGroup(group.key, updated);
                      }}
                      className="text-sm rounded-lg border border-slate-200 px-2.5 py-1.5 focus:ring-2 focus:ring-brand-500"
                    />
                    <select
                      value={f.textAlignment}
                      onChange={e => {
                        const updated = [...groupFields];
                        updated[idx] = { ...f, textAlignment: e.target.value as AppleFieldDef['textAlignment'] };
                        updateGroup(group.key, updated);
                      }}
                      className="text-xs rounded-lg border border-slate-200 px-2 py-1"
                    >
                      <option value="PKTextAlignmentNatural">Natural</option>
                      <option value="PKTextAlignmentLeft">Izquierda</option>
                      <option value="PKTextAlignmentCenter">Centro</option>
                      <option value="PKTextAlignmentRight">Derecha</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Mensaje de cambio (opcional)"
                      value={f.changeMessage || ''}
                      onChange={e => {
                        const updated = [...groupFields];
                        updated[idx] = { ...f, changeMessage: e.target.value };
                        updateGroup(group.key, updated);
                      }}
                      className="text-xs rounded-lg border border-slate-200 px-2 py-1"
                    />
                  </div>
                  <div className="flex flex-col gap-1 pt-0.5">
                    <button onClick={() => moveField(group.key, idx, -1)} disabled={idx === 0} className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronUpIcon className="w-3 h-3" /></button>
                    <button onClick={() => moveField(group.key, idx, 1)} disabled={idx === groupFields.length - 1} className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronDownIcon className="w-3 h-3" /></button>
                    <button onClick={() => removeField(group.key, idx)} className="p-0.5 hover:bg-rose-100 rounded text-rose-500"><TrashIcon className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
              {groupFields.length === 0 && (
                <p className="text-xs text-slate-400 italic">Sin campos configurados.</p>
              )}
              <button
                onClick={() => addField(group.key)}
                disabled={groupFields.length >= group.max}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-slate-200 text-xs font-medium text-slate-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all disabled:opacity-40"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Añadir campo
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Google Advanced Settings ────────────────────────────────────── */
function GoogleAdvancedSettings({ config, onChange }: { config: GoogleAdvancedConfig; onChange: (c: GoogleAdvancedConfig) => void }) {
  const patch = (p: Partial<GoogleAdvancedConfig>) => onChange({ ...config, ...p });
  const addLink = () => patch({ linksModuleUris: [...config.linksModuleUris, { label: '', uri: '' }] });
  const updateLink = (i: number, p: Partial<{ label: string; uri: string }>) => {
    patch({ linksModuleUris: config.linksModuleUris.map((l, idx) => idx === i ? { ...l, ...p } : l) });
  };
  const removeLink = (i: number) => {
    patch({ linksModuleUris: config.linksModuleUris.filter((_, idx) => idx !== i) });
  };

  const addMsg = () => patch({ messages: [...config.messages, { header: '', body: '' }] });
  const updateMsg = (i: number, p: Partial<{ header: string; body: string }>) => {
    patch({ messages: config.messages.map((m, idx) => idx === i ? { ...m, ...p } : m) });
  };
  const removeMsg = (i: number) => {
    patch({ messages: config.messages.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Estado de revisión</label>
          <select value={config.reviewStatus} onChange={e => patch({ reviewStatus: e.target.value as GoogleAdvancedConfig['reviewStatus'] })} className="w-full text-sm rounded-lg border border-slate-200 px-2.5 py-2">
            <option value="underReview">En revisión</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Compartir dispositivos</label>
          <select value={config.allowMultipleUsers} onChange={e => patch({ allowMultipleUsers: e.target.value })} className="w-full text-sm rounded-lg border border-slate-200 px-2.5 py-2">
            {GOOGLE_DEVICE_SHARING_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">URL de inicio</label>
          <input type="url" value={config.homepageUri} onChange={e => patch({ homepageUri: e.target.value })} className="w-full text-sm rounded-lg border border-slate-200 px-2.5 py-2" placeholder="https://..." />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">URL de ayuda</label>
          <input type="url" value={config.helpUri} onChange={e => patch({ helpUri: e.target.value })} className="w-full text-sm rounded-lg border border-slate-200 px-2.5 py-2" placeholder="https://..." />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Enlaces adicionales</label>
          <button onClick={addLink} className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1"><PlusIcon className="w-3 h-3" /> Añadir</button>
        </div>
        {config.linksModuleUris.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" placeholder="Etiqueta" value={l.label} onChange={e => updateLink(i, { label: e.target.value })} className="flex-1 text-sm rounded-lg border border-slate-200 px-2.5 py-1.5" />
            <input type="url" placeholder="https://..." value={l.uri} onChange={e => updateLink(i, { uri: e.target.value })} className="flex-[2] text-sm rounded-lg border border-slate-200 px-2.5 py-1.5" />
            <button onClick={() => removeLink(i)} className="text-rose-500 hover:text-rose-700"><TrashIcon className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Mensajes informativos</label>
          <button onClick={addMsg} className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1"><PlusIcon className="w-3 h-3" /> Añadir</button>
        </div>
        {config.messages.map((m, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" placeholder="Encabezado" value={m.header} onChange={e => updateMsg(i, { header: e.target.value })} className="flex-1 text-sm rounded-lg border border-slate-200 px-2.5 py-1.5" />
            <input type="text" placeholder="Mensaje" value={m.body} onChange={e => updateMsg(i, { body: e.target.value })} className="flex-[2] text-sm rounded-lg border border-slate-200 px-2.5 py-1.5" />
            <button onClick={() => removeMsg(i)} className="text-rose-500 hover:text-rose-700"><TrashIcon className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={config.notifyPreference} onChange={e => patch({ notifyPreference: e.target.checked })} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        Notificar a los clientes cuando la tarjeta cambie
      </label>
    </div>
  );
}

/* ─── Apple Advanced Settings ─────────────────────────────────────── */
function AppleAdvancedSettings({ config, onChange }: { config: AppleAdvancedConfig; onChange: (c: AppleAdvancedConfig) => void }) {
  const patch = (p: Partial<AppleAdvancedConfig>) => onChange({ ...config, ...p });
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={config.suppressStripShine} onChange={e => patch({ suppressStripShine: e.target.checked })} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
          Desactivar efecto brillante en strip
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={config.sharingProhibited} onChange={e => patch({ sharingProhibited: e.target.checked })} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
          Prohibir compartir la tarjeta (Sharing Prohibited)
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={config.voided} onChange={e => patch({ voided: e.target.checked })} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
          Marcar como anulada (Voided)
        </label>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Mensaje NFC (requiere NFC activado)</label>
        <input type="text" value={config.nfcMessage} onChange={e => patch({ nfcMessage: e.target.value })} className="w-full text-sm rounded-lg border border-slate-200 px-2.5 py-2" placeholder="Texto que aparece al escanear con NFC" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Fecha de expiración</label>
        <input type="date" value={config.expirationDate} onChange={e => patch({ expirationDate: e.target.value })} className="w-full text-sm rounded-lg border border-slate-200 px-2.5 py-2" />
      </div>
    </div>
  );
}

/* ─── Accordion Section ───────────────────────────────────────────── */
function AccordionSection({
  title, children, defaultOpen = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        {open ? <ChevronUpIcon className="w-4 h-4 text-slate-400" /> : <ChevronDownIcon className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   MAIN WALLET DESIGNER COMPONENT
   ═════════════════════════════════════════════════════════════════════ */

export interface WalletDesignerProps {
  cardType: string;
  state: WalletDesignState;
  onChange: (state: WalletDesignState) => void;
}

export default function WalletDesigner({ cardType, state, onChange }: WalletDesignerProps) {
  const passStyle = APPLE_PASS_STYLES[cardType] || 'storeCard';
  const appleSupportsStrip = APPLE_IMAGE_SUPPORT[passStyle]?.strip ?? false;
  const googleType = GOOGLE_WALLET_TYPES[cardType]?.type || 'LoyaltyClass';

  const patch = useCallback((p: Partial<WalletDesignState>) => {
    onChange({ ...state, ...p });
  }, [state, onChange]);

  return (
    <div className="space-y-6">
      {/* ── Platform Toggle ── */}
      <PlatformToggle value={state.provider} onChange={v => patch({ provider: v })} />

      {/* ── Apple Wallet ── */}
      {state.provider === 'apple' && (
        <div className="space-y-4">
          {/* Pass style info */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 flex items-start gap-2">
            <InfoIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Estilo de pase: <span className="font-mono">{passStyle}</span></p>
              <p className="text-xs text-amber-700 mt-0.5">
                {appleSupportsStrip
                  ? 'Este estilo usa la imagen panorámica (strip.png) en la parte superior.'
                  : 'Este estilo usa una miniatura (thumbnail.png) en la parte superior derecha.'}
              </p>
            </div>
          </div>

          <AccordionSection title="Imágenes" defaultOpen>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField
                label={APPLE_IMAGE_SPECS.logo.label}
                desc={APPLE_IMAGE_SPECS.logo.desc}
                dimPx={APPLE_IMAGE_SPECS.logo.px}
                dimPt={APPLE_IMAGE_SPECS.logo.pt}
                required={APPLE_IMAGE_SPECS.logo.required}
                value={state.appleLogoUrl}
                onChange={v => patch({ appleLogoUrl: v })}
              />
              <ImageUploadField
                label={APPLE_IMAGE_SPECS.logo2x.label}
                desc={APPLE_IMAGE_SPECS.logo2x.desc}
                dimPx={APPLE_IMAGE_SPECS.logo2x.px}
                dimPt={APPLE_IMAGE_SPECS.logo2x.pt}
                required={APPLE_IMAGE_SPECS.logo2x.required}
                value={state.appleLogo2xUrl}
                onChange={v => patch({ appleLogo2xUrl: v })}
              />
              <ImageUploadField
                label={APPLE_IMAGE_SPECS.icon.label}
                desc={APPLE_IMAGE_SPECS.icon.desc}
                dimPx={APPLE_IMAGE_SPECS.icon.px}
                dimPt={APPLE_IMAGE_SPECS.icon.pt}
                required={APPLE_IMAGE_SPECS.icon.required}
                value={state.appleIconUrl}
                onChange={v => patch({ appleIconUrl: v })}
              />
              <ImageUploadField
                label={APPLE_IMAGE_SPECS.icon2x.label}
                desc={APPLE_IMAGE_SPECS.icon2x.desc}
                dimPx={APPLE_IMAGE_SPECS.icon2x.px}
                dimPt={APPLE_IMAGE_SPECS.icon2x.pt}
                required={APPLE_IMAGE_SPECS.icon2x.required}
                value={state.appleIcon2xUrl}
                onChange={v => patch({ appleIcon2xUrl: v })}
              />
              {appleSupportsStrip ? (
                <>
                  <ImageUploadField
                    label={APPLE_IMAGE_SPECS.strip.label}
                    desc={APPLE_IMAGE_SPECS.strip.desc}
                    dimPx={APPLE_IMAGE_SPECS.strip.px}
                    dimPt={APPLE_IMAGE_SPECS.strip.pt}
                    required={APPLE_IMAGE_SPECS.strip.required}
                    value={state.appleStripUrl}
                    onChange={v => patch({ appleStripUrl: v })}
                  />
                  <ImageUploadField
                    label={APPLE_IMAGE_SPECS.strip2x.label}
                    desc={APPLE_IMAGE_SPECS.strip2x.desc}
                    dimPx={APPLE_IMAGE_SPECS.strip2x.px}
                    dimPt={APPLE_IMAGE_SPECS.strip2x.pt}
                    required={APPLE_IMAGE_SPECS.strip2x.required}
                    value={state.appleStrip2xUrl}
                    onChange={v => patch({ appleStrip2xUrl: v })}
                  />
                </>
              ) : (
                <>
                  <ImageUploadField
                    label={APPLE_IMAGE_SPECS.thumbnail.label}
                    desc={APPLE_IMAGE_SPECS.thumbnail.desc}
                    dimPx={APPLE_IMAGE_SPECS.thumbnail.px}
                    dimPt={APPLE_IMAGE_SPECS.thumbnail.pt}
                    required={APPLE_IMAGE_SPECS.thumbnail.required}
                    value={state.appleThumbnailUrl}
                    onChange={v => patch({ appleThumbnailUrl: v })}
                  />
                  <ImageUploadField
                    label={APPLE_IMAGE_SPECS.thumbnail2x.label}
                    desc={APPLE_IMAGE_SPECS.thumbnail2x.desc}
                    dimPx={APPLE_IMAGE_SPECS.thumbnail2x.px}
                    dimPt={APPLE_IMAGE_SPECS.thumbnail2x.pt}
                    required={APPLE_IMAGE_SPECS.thumbnail2x.required}
                    value={state.appleThumbnail2xUrl}
                    onChange={v => patch({ appleThumbnail2xUrl: v })}
                  />
                </>
              )}
            </div>
          </AccordionSection>

          <AccordionSection title="Diseño de campos" defaultOpen>
            <AppleFieldEditor
              fields={state.appleFields}
              onChange={v => patch({ appleFields: v })}
            />
          </AccordionSection>

          <AccordionSection title="NFC y funciones avanzadas">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={state.appleNfc.nfc_enabled}
                  onChange={e => patch({ appleNfc: { ...state.appleNfc, nfc_enabled: e.target.checked } })}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Activar NFC (Near Field Communication)
              </label>
              {state.appleNfc.nfc_enabled && (
                <label className="flex items-center gap-2 text-sm text-slate-600 pl-6">
                  <input
                    type="checkbox"
                    checked={state.appleNfc.nfc_requires_authentication}
                    onChange={e => patch({ appleNfc: { ...state.appleNfc, nfc_requires_authentication: e.target.checked } })}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Requerir autenticación para usar NFC
                </label>
              )}
            </div>
          </AccordionSection>

          <AccordionSection title="Parámetros avanzados">
            <AppleAdvancedSettings config={state.appleAdvanced} onChange={v => patch({ appleAdvanced: v })} />
          </AccordionSection>
        </div>
      )}

      {/* ── Google Wallet ── */}
      {state.provider === 'google' && (
        <div className="space-y-4">
          {/* Google type info */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 flex items-start gap-2">
            <InfoIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-800">Tipo de clase: <span className="font-mono">{googleType}</span></p>
              <p className="text-xs text-blue-700 mt-0.5">
                Google Wallet usa <span className="font-mono">cardTemplateOverride</span> con filas de campos personalizables.
              </p>
            </div>
          </div>

          <AccordionSection title="Imágenes" defaultOpen>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField
                label={GOOGLE_IMAGE_SPECS.programLogo.label}
                desc={GOOGLE_IMAGE_SPECS.programLogo.desc}
                dimPx={GOOGLE_IMAGE_SPECS.programLogo.px}
                required={GOOGLE_IMAGE_SPECS.programLogo.required}
                value={state.googleProgramLogoUrl}
                onChange={v => patch({ googleProgramLogoUrl: v })}
              />
              <ImageUploadField
                label={GOOGLE_IMAGE_SPECS.heroImage.label}
                desc={GOOGLE_IMAGE_SPECS.heroImage.desc}
                dimPx={GOOGLE_IMAGE_SPECS.heroImage.px}
                required={GOOGLE_IMAGE_SPECS.heroImage.required}
                value={state.googleHeroImageUrl}
                onChange={v => patch({ googleHeroImageUrl: v })}
              />
              <ImageUploadField
                label={GOOGLE_IMAGE_SPECS.wideLogo.label}
                desc={GOOGLE_IMAGE_SPECS.wideLogo.desc}
                dimPx={GOOGLE_IMAGE_SPECS.wideLogo.px}
                required={GOOGLE_IMAGE_SPECS.wideLogo.required}
                value={state.googleWideLogoUrl}
                onChange={v => patch({ googleWideLogoUrl: v })}
              />
              <ImageUploadField
                label={GOOGLE_IMAGE_SPECS.imageModule.label}
                desc={GOOGLE_IMAGE_SPECS.imageModule.desc}
                dimPx={GOOGLE_IMAGE_SPECS.imageModule.px}
                required={GOOGLE_IMAGE_SPECS.imageModule.required}
                value={state.googleImageModuleUrl}
                onChange={v => patch({ googleImageModuleUrl: v })}
              />
            </div>
          </AccordionSection>

          <AccordionSection title="Configuración de filas (cardTemplateOverride)" defaultOpen>
            <GoogleRowBuilder rows={state.googleRows} onChange={v => patch({ googleRows: v })} />
          </AccordionSection>

          <AccordionSection title="Parámetros avanzados">
            <GoogleAdvancedSettings config={state.googleAdvanced} onChange={v => patch({ googleAdvanced: v })} />
          </AccordionSection>
        </div>
      )}
    </div>
  );
}
