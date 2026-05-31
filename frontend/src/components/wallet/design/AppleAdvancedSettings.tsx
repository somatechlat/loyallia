'use client';

import type { AppleAdvancedConfig } from '../types';

export default function AppleAdvancedSettings({ config, onChange }: { config: AppleAdvancedConfig; onChange: (c: AppleAdvancedConfig) => void }) {
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
        <input type="text" value={config.nfcMessage} onChange={e => patch({ nfcMessage: e.target.value })} className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="Texto que aparece al escanear con NFC" maxLength={200} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Fecha de expiración</label>
        <input type="date" value={config.expirationDate} onChange={e => patch({ expirationDate: e.target.value })} className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
      </div>
    </div>
  );
}
