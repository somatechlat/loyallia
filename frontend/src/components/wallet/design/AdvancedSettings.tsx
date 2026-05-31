'use client';

import React, { useState } from 'react';
import { GOOGLE_DEVICE_SHARING_OPTIONS } from '@/components/programs/constants';
import type { WalletDesignState } from '@/components/programs/WalletDesigner';

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

function GoogleAdvancedSettings({ config, onChange }: { config: WalletDesignState['googleAdvanced']; onChange: (c: WalletDesignState['googleAdvanced']) => void }) {
  const [urlErrors, setUrlErrors] = useState({ homepage: false, help: false });
  const patch = (p: Partial<WalletDesignState['googleAdvanced']>) => onChange({ ...config, ...p });
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
          <select value={config.reviewStatus} onChange={e => patch({ reviewStatus: e.target.value as WalletDesignState['googleAdvanced']['reviewStatus'] })} className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
            <option value="UNDER_REVIEW">En revisión</option>
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
          <input type="url" value={config.homepageUri} onChange={e => { patch({ homepageUri: e.target.value }); setUrlErrors(err => ({ ...err, homepage: false })); }} onBlur={e => setUrlErrors(err => ({ ...err, homepage: !!e.target.value && !(e.target as HTMLInputElement).checkValidity() }))} className={`w-full text-sm rounded-lg border ${urlErrors.homepage ? 'border-red-500' : 'border-surface-200 dark:border-surface-600'} px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500`} placeholder="https://..." />
          {urlErrors.homepage && <p className="text-xs text-red-500 mt-0.5">URL inválida</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">URL de ayuda</label>
          <input type="url" value={config.helpUri} onChange={e => { patch({ helpUri: e.target.value }); setUrlErrors(err => ({ ...err, help: false })); }} onBlur={e => setUrlErrors(err => ({ ...err, help: !!e.target.value && !(e.target as HTMLInputElement).checkValidity() }))} className={`w-full text-sm rounded-lg border ${urlErrors.help ? 'border-red-500' : 'border-surface-200 dark:border-surface-600'} px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500`} placeholder="https://..." />
          {urlErrors.help && <p className="text-xs text-red-500 mt-0.5">URL inválida</p>}
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
            <input type="text" placeholder="Encabezado" value={m.header} onChange={e => updateMsg(i, { header: e.target.value })} className="flex-1 text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-1.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" maxLength={200} />
            <input type="text" placeholder="Mensaje" value={m.body} onChange={e => updateMsg(i, { body: e.target.value })} className="flex-[2] text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-1.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" maxLength={1000} />
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

function AppleAdvancedSettings({ config, onChange }: { config: WalletDesignState['appleAdvanced']; onChange: (c: WalletDesignState['appleAdvanced']) => void }) {
  const patch = (p: Partial<WalletDesignState['appleAdvanced']>) => onChange({ ...config, ...p });
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
        <input type="text" value={config.nfcMessage} onChange={e => patch({ nfcMessage: e.target.value })} className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="Texto que aparece al escanear con NFC" maxLength={200} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Fecha de expiración</label>
        <input type="date" value={config.expirationDate} onChange={e => patch({ expirationDate: e.target.value })} className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
      </div>
    </div>
  );
}

interface AdvancedSettingsProps {
  provider: 'apple' | 'google';
  state: WalletDesignState;
  onChange: (patch: Partial<WalletDesignState>) => void;
}

export default function AdvancedSettings({ provider, state, onChange }: AdvancedSettingsProps) {
  if (provider === 'apple') {
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
            <input
              type="checkbox"
              checked={state.appleNfc.nfc_enabled}
              onChange={e => onChange({ appleNfc: { ...state.appleNfc, nfc_enabled: e.target.checked } })}
              className="rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-surface-700"
            />
            Activar NFC (Near Field Communication)
          </label>
          {state.appleNfc.nfc_enabled && (
            <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300 pl-6">
              <input
                type="checkbox"
                checked={state.appleNfc.nfc_requires_authentication}
                onChange={e => onChange({ appleNfc: { ...state.appleNfc, nfc_requires_authentication: e.target.checked } })}
                className="rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-surface-700"
              />
              Requerir autenticación para usar NFC
            </label>
          )}
        </div>
        <AppleAdvancedSettings config={state.appleAdvanced} onChange={v => onChange({ appleAdvanced: v })} />
      </div>
    );
  }

  return (
    <GoogleAdvancedSettings config={state.googleAdvanced} onChange={v => onChange({ googleAdvanced: v })} />
  );
}
