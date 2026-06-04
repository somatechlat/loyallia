'use client';

import { useState } from 'react';
import { GOOGLE_DEVICE_SHARING_OPTIONS } from '@/components/programs/constants';
import type { GoogleAdvancedConfig } from '../types-v1-definitions';
import { PlusIcon, TrashIcon } from '../icons';
import { useI18n } from '@/lib/i18n';

/**
 * @description Advanced settings editor for Google Wallet passes.
 * @param {Object} props - Component props
 * @param {GoogleAdvancedConfig} props.config - Current Google advanced configuration
 * @param {(c: GoogleAdvancedConfig) => void} props.onChange - Configuration change handler
 * @returns JSX.Element
 */
export default function GoogleAdvancedSettings({ config, onChange }: { config: GoogleAdvancedConfig; onChange: (c: GoogleAdvancedConfig) => void }) {
  const { t } = useI18n();
  const [urlErrors, setUrlErrors] = useState({ homepage: false, help: false });
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
          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">{t('common.status')}</label>
          <select value={config.reviewStatus} onChange={e => patch({ reviewStatus: e.target.value as GoogleAdvancedConfig['reviewStatus'] })} className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
            <option value="UNDER_REVIEW">{t('common.draft')}</option>
            <option value="approved">{t('common.active')}</option>
            <option value="rejected">{t('common.inactive')}</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">{t('wallet.studio.notifications.title')}</label>
          <select value={config.allowMultipleUsers} onChange={e => patch({ allowMultipleUsers: e.target.value })} className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
            {GOOGLE_DEVICE_SHARING_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">{t('settings.website')}</label>
          <input type="url" value={config.homepageUri} onChange={e => { patch({ homepageUri: e.target.value }); setUrlErrors(err => ({ ...err, homepage: false })); }} onBlur={e => setUrlErrors(err => ({ ...err, homepage: !!e.target.value && !(e.target as HTMLInputElement).checkValidity() }))} className={`w-full text-sm rounded-lg border ${urlErrors.homepage ? 'border-red-500' : 'border-surface-200 dark:border-surface-600'} px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500`} placeholder={t('settings.placeholders.website')} />
          {urlErrors.homepage && <p className="text-xs text-red-500 mt-0.5">{t('settings.urlInvalid')}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">{t('common.help')}</label>
          <input type="url" value={config.helpUri} onChange={e => { patch({ helpUri: e.target.value }); setUrlErrors(err => ({ ...err, help: false })); }} onBlur={e => setUrlErrors(err => ({ ...err, help: !!e.target.value && !(e.target as HTMLInputElement).checkValidity() }))} className={`w-full text-sm rounded-lg border ${urlErrors.help ? 'border-red-500' : 'border-surface-200 dark:border-surface-600'} px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500`} placeholder={t('settings.placeholders.website')} />
          {urlErrors.help && <p className="text-xs text-red-500 mt-0.5">{t('settings.urlInvalid')}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">{t('wallet.studio.fields.linkDetection')}</label>
          <button onClick={addLink} className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 flex items-center gap-1"><PlusIcon className="w-3 h-3" /> {t('wallet.studio.fields.add')}</button>
        </div>
        {config.linksModuleUris.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" placeholder={t('wallet.studio.coupon.tag')} value={l.label} onChange={e => updateLink(i, { label: e.target.value })} className="flex-1 text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-1.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
            <input type="url" placeholder={t('settings.placeholders.website')} value={l.uri} onChange={e => updateLink(i, { uri: e.target.value })} className="flex-[2] text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-1.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
            <button onClick={() => removeLink(i)} className="text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"><TrashIcon className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">{t('wallet.studio.barcode.message')}</label>
          <button onClick={addMsg} className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 flex items-center gap-1"><PlusIcon className="w-3 h-3" /> {t('wallet.studio.fields.add')}</button>
        </div>
        {config.messages.map((m, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" placeholder={t('wallet.studio.barcode.altText')} value={m.header} onChange={e => updateMsg(i, { header: e.target.value })} className="flex-1 text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-1.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" maxLength={200} />
            <input type="text" placeholder={t('wallet.studio.barcode.message')} value={m.body} onChange={e => updateMsg(i, { body: e.target.value })} className="flex-[2] text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-1.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" maxLength={1000} />
            <button onClick={() => removeMsg(i)} className="text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"><TrashIcon className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
        <input type="checkbox" checked={config.notifyPreference} onChange={e => patch({ notifyPreference: e.target.checked })} className="rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-surface-700" />
        {t('wallet.studio.notifications.googleHint')}
      </label>
    </div>
  );
}
