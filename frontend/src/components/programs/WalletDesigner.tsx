/* WalletDesigner.tsx — Full visual designer for Apple & Google Wallet pass customization */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import {
  APPLE_PASS_STYLES,
  GOOGLE_WALLET_TYPES,
  APPLE_IMAGE_SUPPORT,
  GOOGLE_ROW_TYPES,
  GOOGLE_PREDEFINED_FIELDS,
  APPLE_FIELD_GROUPS,
  GOOGLE_DEVICE_SHARING_OPTIONS,
} from './constants';

/* ─── Inline SVGs ─────────────────────────────────────────────────── */
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
/* ─── Types (exact exports) ───────────────────────────────────────── */
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
  allowMultipleUsers: string;
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

export interface WalletLocation {
  id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  relevantText: string;
}

export interface WalletBeacon {
  id: string;
  uuid: string;
  major: number;
  minor: number;
  relevantText: string;
}

export interface WalletLink {
  id: string;
  label: string;
  uri: string;
}

export interface WalletDesignState {
  provider: 'apple' | 'google';
  appleLogoUrl: string;
  appleLogo2xUrl: string;
  appleStripUrl: string;
  appleStrip2xUrl: string;
  appleThumbnailUrl: string;
  appleThumbnail2xUrl: string;
  appleIconUrl: string;
  appleIcon2xUrl: string;
  googleProgramLogoUrl: string;
  googleHeroImageUrl: string;
  googleWideLogoUrl: string;
  googleImageModuleUrl: string;
  appleFields: Record<string, AppleFieldDef[]>;
  googleRows: GoogleFieldRow[];
  googleAdvanced: GoogleAdvancedConfig;
  appleAdvanced: AppleAdvancedConfig;
  appleNfc: AppleWalletFeatureConfig;
  locations: WalletLocation[];
  beacons: WalletBeacon[];
  links: WalletLink[];
  homepageUri: string;
  helpUri: string;
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
    locations: [],
    beacons: [],
    links: [],
    homepageUri: '',
    helpUri: '',
  };
}

/* ─── Helpers ─────────────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ─── Image Upload ────────────────────────────────────────────────── */
function ImageUploadField({
  label, specs, required, value, onChange,
}: {
  label: string;
  specs: string;
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
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-surface-700 dark:text-surface-200">{label}</span>
        {required && <span className="text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded">Obligatorio</span>}
        <span className="text-xs text-surface-500 dark:text-surface-400 ml-auto font-mono">{specs}</span>
      </div>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed transition-all overflow-hidden
          ${dragOver ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 hover:border-brand-400 dark:hover:border-brand-500'}
          ${value ? 'p-0 aspect-video' : 'p-4 flex flex-col items-center justify-center gap-2 aspect-video'}
        `}
      >
        {value ? (
          <img src={value} alt={label} className="w-full h-full object-contain" />
        ) : (
          <>
            <ImageIcon className="w-8 h-8 text-surface-400 dark:text-surface-500" />
            <span className="text-xs text-surface-500 dark:text-surface-400 text-center">Haz click o arrastra una imagen<br/><span className="font-mono">{specs}</span></span>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />
      </div>
      {value && (
        <div className="flex items-center gap-3">
          <img src={value} alt={`${label} miniatura`} className="w-12 h-12 rounded-lg object-cover border border-surface-200 dark:border-surface-600" />
          <button
            onClick={() => onChange('')}
            className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1"
          >
            <TrashIcon className="w-3 h-3" /> Eliminar imagen
          </button>
        </div>
      )}
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
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
      >
        <span className="text-sm font-semibold text-surface-700 dark:text-surface-200">{title}</span>
        {open ? <ChevronUpIcon className="w-4 h-4 text-surface-400 dark:text-surface-500" /> : <ChevronDownIcon className="w-4 h-4 text-surface-400 dark:text-surface-500" />}
      </button>
      {open && <div className="p-4">{children}</div>}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Estado de revisión</label>
          <select value={config.reviewStatus} onChange={e => patch({ reviewStatus: e.target.value as GoogleAdvancedConfig['reviewStatus'] })} className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
            <option value="underReview">En revisión</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Compartir dispositivos</label>
          <select value={config.allowMultipleUsers} onChange={e => patch({ allowMultipleUsers: e.target.value })} className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
            {GOOGLE_DEVICE_SHARING_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">URL de inicio</label>
          <input type="url" value={config.homepageUri} onChange={e => patch({ homepageUri: e.target.value })} className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="https://..." />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">URL de ayuda</label>
          <input type="url" value={config.helpUri} onChange={e => patch({ helpUri: e.target.value })} className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="https://..." />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Enlaces adicionales</label>
          <button onClick={addLink} className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 flex items-center gap-1"><PlusIcon className="w-3 h-3" /> Añadir</button>
        </div>
        {config.linksModuleUris.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" placeholder="Etiqueta" value={l.label} onChange={e => updateLink(i, { label: e.target.value })} className="flex-1 text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-1.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
            <input type="url" placeholder="https://..." value={l.uri} onChange={e => updateLink(i, { uri: e.target.value })} className="flex-[2] text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-1.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
            <button onClick={() => removeLink(i)} className="text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"><TrashIcon className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Mensajes informativos</label>
          <button onClick={addMsg} className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 flex items-center gap-1"><PlusIcon className="w-3 h-3" /> Añadir</button>
        </div>
        {config.messages.map((m, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" placeholder="Encabezado" value={m.header} onChange={e => updateMsg(i, { header: e.target.value })} className="flex-1 text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-1.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
            <input type="text" placeholder="Mensaje" value={m.body} onChange={e => updateMsg(i, { body: e.target.value })} className="flex-[2] text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-1.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
            <button onClick={() => removeMsg(i)} className="text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"><TrashIcon className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
        <input type="checkbox" checked={config.notifyPreference} onChange={e => patch({ notifyPreference: e.target.checked })} className="rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-surface-700" />
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
        <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
          <input type="checkbox" checked={config.suppressStripShine} onChange={e => patch({ suppressStripShine: e.target.checked })} className="rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-surface-700" />
          Desactivar efecto brillante en strip
        </label>
        <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
          <input type="checkbox" checked={config.sharingProhibited} onChange={e => patch({ sharingProhibited: e.target.checked })} className="rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-surface-700" />
          Prohibir compartir la tarjeta (Sharing Prohibited)
        </label>
        <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
          <input type="checkbox" checked={config.voided} onChange={e => patch({ voided: e.target.checked })} className="rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-surface-700" />
          Marcar como anulada (Voided)
        </label>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Mensaje NFC (requiere NFC activado)</label>
        <input type="text" value={config.nfcMessage} onChange={e => patch({ nfcMessage: e.target.value })} className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="Texto que aparece al escanear con NFC" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Fecha de expiración</label>
        <input type="date" value={config.expirationDate} onChange={e => patch({ expirationDate: e.target.value })} className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
      </div>
    </div>
  );
}

/* ─── Field Registries (card-type filtered) ───────────────────────── */
const APPLE_FIELD_REGISTRY = [
  { label: 'Nombre del cliente', value: '{customer_name}', types: 'all' as const },
  { label: 'Sellos actuales', value: '{stamp_count}/{stamps_required}', types: ['stamp'] as const },
  { label: 'Recompensa', value: '{reward_description}', types: ['stamp'] as const },
  { label: 'Saldo de cashback', value: '${cashback_balance}', types: ['cashback'] as const },
  { label: 'Nombre del programa', value: '{program_name}', types: 'all' as const },
  { label: 'Descripción', value: '{description}', types: 'all' as const },
  { label: 'Nivel de descuento', value: '{discount_tier}', types: ['discount'] as const },
  { label: 'Porcentaje de descuento', value: '{discount_percentage}%', types: ['discount', 'coupon', 'corporate_discount'] as const },
  { label: 'Membresía VIP', value: '{membership_tier}', types: ['vip_membership'] as const },
  { label: 'Referidos', value: '{referrals_made}', types: ['referral_pass'] as const },
  { label: 'Código de referido', value: '{referral_code}', types: ['referral_pass'] as const },
  { label: 'Usos restantes', value: '{multipass_remaining}/{bundle_size}', types: ['multipass'] as const },
  { label: 'Saldo de regalo', value: '${gift_balance}', types: ['gift_certificate'] as const },
  { label: 'Descuento corporativo', value: '{corporate_discount}%', types: ['corporate_discount'] as const },
  { label: 'Empresa', value: '{company_name}', types: ['corporate_discount'] as const },
  { label: 'Código de afiliado', value: '{affiliate_code}', types: ['affiliate'] as const },
  { label: 'Fecha de inscripción', value: '{enrolled_date}', types: ['affiliate'] as const },
  { label: 'Texto personalizado...', value: 'custom', types: 'all' as const },
] as const;

function getAppleFieldOptions(cardType: string) {
  return APPLE_FIELD_REGISTRY.filter(f => f.types === 'all' || (Array.isArray(f.types) && f.types.includes(cardType)));
}

const GOOGLE_FIELD_REGISTRY = [
  { label: 'Nombre del cliente', fieldPath: 'object.accountName', defaultDisplayName: 'Cliente', types: 'all' as const },
  { label: 'Nombre del programa', fieldPath: 'class.programName', defaultDisplayName: 'Programa', types: 'all' as const },
  { label: 'Nombre del negocio', fieldPath: 'class.issuerName', defaultDisplayName: 'Negocio', types: 'all' as const },
  { label: 'Puntos de lealtad', fieldPath: 'object.loyaltyPoints.balance', defaultDisplayName: 'Puntos', types: ['stamp', 'affiliate', 'vip_membership'] as const },
  { label: 'Etiqueta de puntos', fieldPath: 'object.loyaltyPoints.label', defaultDisplayName: 'Etiqueta', types: ['stamp', 'affiliate', 'vip_membership'] as const },
  { label: 'Balance secundario', fieldPath: 'object.secondaryLoyaltyPoints.balance', defaultDisplayName: 'Balance 2', types: ['stamp', 'cashback', 'gift_certificate', 'multipass'] as const },
  { label: 'Nivel de recompensa', fieldPath: 'class.rewardsTier', defaultDisplayName: 'Nivel', types: ['discount', 'vip_membership'] as const },
  { label: 'Etiqueta de nivel', fieldPath: 'class.rewardsTierLabel', defaultDisplayName: 'Nivel', types: ['discount', 'vip_membership'] as const },
  { label: 'Saldo de regalo', fieldPath: 'object.balance.money', defaultDisplayName: 'Saldo', types: ['cashback', 'gift_certificate', 'multipass'] as const },
  { label: 'Personalizado...', fieldPath: 'custom', defaultDisplayName: '', types: 'all' as const },
] as const;

function getGoogleFieldOptions(cardType: string) {
  return GOOGLE_FIELD_REGISTRY.filter(f => f.types === 'all' || (Array.isArray(f.types) && f.types.includes(cardType)));
}

/* ─── Zone visual indicator helpers ───────────────────────────────── */
const APPLE_GROUP_META: Record<string, { borderColor: string; badge: string; hint: string }> = {
  backFields: { borderColor: 'border-l-surface-400', badge: 'bg-surface-100 dark:bg-surface-700/50 text-surface-700 dark:text-surface-300', hint: '🔄 Detrás de la tarjeta' },
  headerFields:   { borderColor: 'border-l-amber-500',   badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', hint: '↗️ Esquina superior derecha' },
  primaryFields:  { borderColor: 'border-l-emerald-500', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', hint: '🔠 Texto grande central' },
  secondaryFields:{ borderColor: 'border-l-indigo-500',  badge: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', hint: '📊 Debajo del principal' },
  auxiliaryFields:{ borderColor: 'border-l-slate-400',   badge: 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300', hint: '📋 Parte inferior' },
};

/* ─── Google Card Template Builder ────────────────────────────────── */
function GoogleRowBuilder({ rows, onChange, cardType }: { rows: GoogleFieldRow[]; onChange: (rows: GoogleFieldRow[]) => void; cardType: string }) {
  const fieldOptions = getGoogleFieldOptions(cardType);

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

  const updateItem = (rowId: string, itemId: string, patchItem: Partial<GoogleFieldItem>) => {
    onChange(rows.map(r => r.id === rowId ? { ...r, items: r.items.map(i => i.id === itemId ? { ...i, ...patchItem } : i) } : r));
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
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-100">Configuración de filas</h4>
        <span className="text-xs text-surface-400 dark:text-surface-500">{rows.length} fila(s)</span>
      </div>

      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-surface-200 dark:border-surface-600 p-4 text-center">
          <InfoIcon className="w-6 h-6 text-surface-300 dark:text-surface-500 mx-auto mb-1" />
          <p className="text-xs text-surface-400 dark:text-surface-500">Sin filas configuradas. Añade filas usando los botones de abajo.</p>
        </div>
      )}

      {rows.map((row, rIdx) => (
        <div key={row.id} className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-50 dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700">
            <span className="text-xs font-semibold text-surface-600 dark:text-surface-300">Fila {rIdx + 1}</span>
            <span className="text-xs text-surface-500 dark:text-surface-400 px-2 py-0.5 bg-surface-100 dark:bg-surface-700 rounded">
              {GOOGLE_ROW_TYPES.find(t => t.value === row.type)?.label}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => moveRow(rIdx, -1)} disabled={rIdx === 0} className="p-1 hover:bg-surface-200 dark:hover:bg-surface-600 rounded disabled:opacity-30"><ChevronUpIcon className="w-3 h-3 text-surface-600 dark:text-surface-300" /></button>
              <button onClick={() => moveRow(rIdx, 1)} disabled={rIdx === rows.length - 1} className="p-1 hover:bg-surface-200 dark:hover:bg-surface-600 rounded disabled:opacity-30"><ChevronDownIcon className="w-3 h-3 text-surface-600 dark:text-surface-300" /></button>
              <button onClick={() => removeRow(row.id)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded text-rose-500 dark:text-rose-400"><TrashIcon className="w-3 h-3" /></button>
            </div>
          </div>
          <div className="p-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${row.type === 'oneItem' ? 1 : row.type === 'twoItems' ? 2 : 3}, 1fr)` }}>
            {row.items.map((item, iIdx) => (
              <div key={item.id} className="space-y-2">
                <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Campo {iIdx + 1}</label>
                <select
                  value={item.fieldPath}
                  onChange={e => {
                    const fieldPath = e.target.value;
                    const option = fieldOptions.find(f => f.fieldPath === fieldPath);
                    const predefined = GOOGLE_PREDEFINED_FIELDS.find(f => f.path === fieldPath);
                    updateItem(row.id, item.id, {
                      fieldPath,
                      label: predefined?.label || option?.defaultDisplayName || '',
                      displayName: option?.defaultDisplayName || predefined?.label || '',
                    });
                  }}
                  className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">Selecciona un campo...</option>
                  {fieldOptions.map(f => (
                    <option key={f.fieldPath} value={f.fieldPath}>{f.label}</option>
                  ))}
                </select>
                {item.fieldPath === 'custom' && (
                  <input
                    type="text"
                    placeholder="Ruta del campo (ej: object.customField)"
                    value={item.label}
                    onChange={e => updateItem(row.id, item.id, { label: e.target.value, fieldPath: e.target.value })}
                    className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                )}
                <input
                  type="text"
                  placeholder="Etiqueta"
                  value={item.displayName}
                  onChange={e => updateItem(row.id, item.id, { displayName: e.target.value })}
                  className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-dashed border-surface-300 dark:border-surface-600 text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 hover:border-surface-400 dark:hover:border-surface-500 transition-all"
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
  fields, onChange, cardType,
}: {
  fields: Record<string, AppleFieldDef[]>;
  onChange: (fields: Record<string, AppleFieldDef[]>) => void;
  cardType: string;
}) {
  const options = getAppleFieldOptions(cardType);

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
    <div className="space-y-3">
      {APPLE_FIELD_GROUPS.map(group => {
        const groupFields = fields[group.key] || [];
        const meta = APPLE_GROUP_META[group.key]!;
        return (
          <div key={group.key} className={`rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 overflow-hidden border-l-4 ${meta.borderColor}`}>
            <div className="px-3 py-2.5 bg-surface-50 dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-surface-700 dark:text-surface-200">{group.label}</span>
              <span className="text-xs text-surface-400 dark:text-surface-500">{group.desc}</span>
              <span className="ml-auto text-xs font-mono text-surface-500 dark:text-surface-400">{groupFields.length}/{group.max}</span>
            </div>
            <div className="p-3 space-y-3">
              {/* Mini visual indicator */}
              <div className={`inline-flex items-center gap-1.5 text-xs rounded-md px-2 py-1 ${meta.badge}`}>
                <span>{meta.hint}</span>
              </div>

              {groupFields.map((f, idx) => {
                const selectedOption = options.find(o => o.value === f.value);
                const showCustomInput = !selectedOption || selectedOption.value === 'custom';

                return (
                  <div key={f.key} className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-3 space-y-3">
                    <div className="flex gap-3 items-start">
                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Información a mostrar</label>
                          <select
                            value={showCustomInput ? 'custom' : f.value}
                            onChange={e => {
                              const val = e.target.value;
                              const option = options.find(o => o.value === val);
                              const updated = [...groupFields];
                              const newValue = val === 'custom' ? '' : val;
                              const newLabel = f.label || (option && option.value !== 'custom' ? option.label : '');
                              updated[idx] = { ...f, value: newValue, label: newLabel };
                              updateGroup(group.key, updated);
                            }}
                            className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          >
                            <option value="">Selecciona una opción...</option>
                            {options.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>

                        {showCustomInput && (
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Texto personalizado</label>
                            <input
                              type="text"
                              placeholder="Escribe el texto que quieres mostrar"
                              value={f.value}
                              onChange={e => {
                                const updated = [...groupFields];
                                updated[idx] = { ...f, value: e.target.value };
                                updateGroup(group.key, updated);
                              }}
                              className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Etiqueta visible</label>
                          <input
                            type="text"
                            placeholder="Ej: CLIENTE, RECOMPENSA, SELLOS"
                            value={f.label}
                            onChange={e => {
                              const updated = [...groupFields];
                              updated[idx] = { ...f, label: e.target.value };
                              updateGroup(group.key, updated);
                            }}
                            className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Alineación</label>
                            <select
                              value={f.textAlignment}
                              onChange={e => {
                                const updated = [...groupFields];
                                updated[idx] = { ...f, textAlignment: e.target.value as AppleFieldDef['textAlignment'] };
                                updateGroup(group.key, updated);
                              }}
                              className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            >
                              <option value="PKTextAlignmentNatural">Natural</option>
                              <option value="PKTextAlignmentLeft">Izquierda</option>
                              <option value="PKTextAlignmentCenter">Centro</option>
                              <option value="PKTextAlignmentRight">Derecha</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Mensaje de cambio</label>
                            <input
                              type="text"
                              placeholder="Opcional"
                              value={f.changeMessage || ''}
                              onChange={e => {
                                const updated = [...groupFields];
                                updated[idx] = { ...f, changeMessage: e.target.value };
                                updateGroup(group.key, updated);
                              }}
                              className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 pt-0.5 shrink-0">
                        <button onClick={() => moveField(group.key, idx, -1)} disabled={idx === 0} className="p-1 hover:bg-surface-200 dark:hover:bg-surface-600 rounded disabled:opacity-30"><ChevronUpIcon className="w-3 h-3 text-surface-600 dark:text-surface-300" /></button>
                        <button onClick={() => moveField(group.key, idx, 1)} disabled={idx === groupFields.length - 1} className="p-1 hover:bg-surface-200 dark:hover:bg-surface-600 rounded disabled:opacity-30"><ChevronDownIcon className="w-3 h-3 text-surface-600 dark:text-surface-300" /></button>
                        <button onClick={() => removeField(group.key, idx)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded text-rose-500 dark:text-rose-400"><TrashIcon className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {groupFields.length === 0 && (
                <p className="text-xs text-surface-400 dark:text-surface-500 italic">Sin campos configurados.</p>
              )}
              <button
                onClick={() => addField(group.key)}
                disabled={groupFields.length >= group.max}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-surface-300 dark:border-surface-600 text-xs font-medium text-surface-500 dark:text-surface-400 hover:border-brand-300 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all disabled:opacity-40"
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

/* ═════════════════════════════════════════════════════════════════════
   MAIN WALLET DESIGNER COMPONENT
   ═════════════════════════════════════════════════════════════════════ */

export interface WalletDesignerProps {
  cardType: string;
  state: WalletDesignState;
  onChange: (state: WalletDesignState) => void;
  provider: 'apple' | 'google';
}

export default function WalletDesigner({ cardType, state, onChange, provider }: WalletDesignerProps) {
  const passStyle = APPLE_PASS_STYLES[cardType] || 'storeCard';
  const appleSupportsStrip = APPLE_IMAGE_SUPPORT[passStyle]?.strip ?? false;
  const googleType = GOOGLE_WALLET_TYPES[cardType]?.type || 'LoyaltyClass';

  const patch = useCallback((p: Partial<WalletDesignState>) => {
    onChange({ ...state, ...p });
  }, [state, onChange]);

  return (
    <div className="space-y-6">
      {provider === 'apple' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5 flex items-start gap-2">
            <InfoIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Estilo de pase: <span className="font-mono">{passStyle}</span></p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {appleSupportsStrip
                  ? 'Este estilo usa la imagen panorámica (strip.png) en la parte superior.'
                  : 'Este estilo usa una miniatura (thumbnail.png) en la parte superior derecha.'}
              </p>
            </div>
          </div>

          <AccordionSection title="Imágenes" defaultOpen>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField
                label="Logo"
                specs="160×50pt (320×100px @2x)"
                required={true}
                value={state.appleLogoUrl}
                onChange={v => patch({ appleLogoUrl: v })}
              />
              <ImageUploadField
                label="Logo @2x"
                specs="160×50pt (320×100px @2x)"
                required={true}
                value={state.appleLogo2xUrl}
                onChange={v => patch({ appleLogo2xUrl: v })}
              />
              <ImageUploadField
                label="Ícono"
                specs="29×29pt (58×58px @2x)"
                required={true}
                value={state.appleIconUrl}
                onChange={v => patch({ appleIconUrl: v })}
              />
              <ImageUploadField
                label="Ícono @2x"
                specs="29×29pt (58×58px @2x)"
                required={true}
                value={state.appleIcon2xUrl}
                onChange={v => patch({ appleIcon2xUrl: v })}
              />
              {appleSupportsStrip ? (
                <>
                  <ImageUploadField
                    label="Strip"
                    specs="375×123pt (750×246px @2x) — solo storeCard/coupon"
                    required={false}
                    value={state.appleStripUrl}
                    onChange={v => patch({ appleStripUrl: v })}
                  />
                  <ImageUploadField
                    label="Strip @2x"
                    specs="375×123pt (750×246px @2x) — solo storeCard/coupon"
                    required={false}
                    value={state.appleStrip2xUrl}
                    onChange={v => patch({ appleStrip2xUrl: v })}
                  />
                </>
              ) : (
                <>
                  <ImageUploadField
                    label="Thumbnail"
                    specs="90×90pt (180×180px @2x) — solo generic"
                    required={false}
                    value={state.appleThumbnailUrl}
                    onChange={v => patch({ appleThumbnailUrl: v })}
                  />
                  <ImageUploadField
                    label="Thumbnail @2x"
                    specs="90×90pt (180×180px @2x) — solo generic"
                    required={false}
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
              cardType={cardType}
            />
          </AccordionSection>

          <AccordionSection title="NFC y funciones avanzadas">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                <input
                  type="checkbox"
                  checked={state.appleNfc.nfc_enabled}
                  onChange={e => patch({ appleNfc: { ...state.appleNfc, nfc_enabled: e.target.checked } })}
                  className="rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-surface-700"
                />
                Activar NFC (Near Field Communication)
              </label>
              {state.appleNfc.nfc_enabled && (
                <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300 pl-6">
                  <input
                    type="checkbox"
                    checked={state.appleNfc.nfc_requires_authentication}
                    onChange={e => patch({ appleNfc: { ...state.appleNfc, nfc_requires_authentication: e.target.checked } })}
                    className="rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-surface-700"
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

      {provider === 'google' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2.5 flex items-start gap-2">
            <InfoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">Tipo de clase: <span className="font-mono">{googleType}</span></p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Google Wallet usa <span className="font-mono">cardTemplateOverride</span> con filas de campos personalizables.
              </p>
            </div>
          </div>

          <AccordionSection title="Imágenes" defaultOpen>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField
                label="Logo del programa"
                specs="660×660px"
                required={true}
                value={state.googleProgramLogoUrl}
                onChange={v => patch({ googleProgramLogoUrl: v })}
              />
              <ImageUploadField
                label="Imagen Hero"
                specs="1032×336px"
                required={false}
                value={state.googleHeroImageUrl}
                onChange={v => patch({ googleHeroImageUrl: v })}
              />
              <ImageUploadField
                label="Logo ancho"
                specs="1032×150px"
                required={false}
                value={state.googleWideLogoUrl}
                onChange={v => patch({ googleWideLogoUrl: v })}
              />
              <ImageUploadField
                label="Imagen adicional"
                specs="660×660px"
                required={false}
                value={state.googleImageModuleUrl}
                onChange={v => patch({ googleImageModuleUrl: v })}
              />
            </div>
          </AccordionSection>

          <AccordionSection title="Configuración de filas (cardTemplateOverride)" defaultOpen>
            <GoogleRowBuilder rows={state.googleRows} onChange={v => patch({ googleRows: v })} cardType={cardType} />
          </AccordionSection>

          <AccordionSection title="Parámetros avanzados">
            <GoogleAdvancedSettings config={state.googleAdvanced} onChange={v => patch({ googleAdvanced: v })} />
          </AccordionSection>
        </div>
      )}
    </div>
  );
}
