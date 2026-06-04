'use client';

import { GOOGLE_ROW_TYPES, GOOGLE_PREDEFINED_FIELDS } from '@/components/programs/constants';
import type { GoogleFieldRow, GoogleFieldItem } from '../types-v1-definitions';
import { PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, InfoIcon } from '../icons';
import { uid, getGoogleFieldOptions } from './helpers';
import { useI18n } from '@/lib/i18n';

/**
 * @description Visual builder for Google Wallet cardTemplateOverride rows.
 * @param {Object} props - Component props
 * @param {GoogleFieldRow[]} props.rows - Current rows configuration
 * @param {(rows: GoogleFieldRow[]) => void} props.onChange - Rows change handler
 * @param {string} props.cardType - Type of loyalty card
 * @returns JSX.Element
 */
export default function GoogleRowBuilder({ rows, onChange, cardType }: { rows: GoogleFieldRow[]; onChange: (rows: GoogleFieldRow[]) => void; cardType: string }) {
  const { t } = useI18n();
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
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-100">{t('wallet.studio.fields.title')}</h4>
        <span className="text-xs text-surface-400 dark:text-surface-500">{rows.length} {t('wallet.studio.fields.fieldGroup')}</span>
      </div>

      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-surface-200 dark:border-surface-600 p-4 text-center">
          <InfoIcon className="w-6 h-6 text-surface-300 dark:text-surface-500 mx-auto mb-1" />
          <p className="text-xs text-surface-400 dark:text-surface-500">{t('wallet.studio.fields.noFields')}</p>
        </div>
      )}

      {rows.map((row, rIdx) => (
        <div key={row.id} className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-50 dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700">
            <span className="text-xs font-semibold text-surface-600 dark:text-surface-300">{t('wallet.studio.fields.fieldGroup')} {rIdx + 1}</span>
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
                <label className="text-xs font-medium text-surface-600 dark:text-surface-300">{t('wallet.studio.fields.label')} {iIdx + 1}</label>
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
                  <option value="">{t('wallet.studio.iconPicker.selectIcon')}</option>
                  {fieldOptions.map(f => (
                    <option key={f.fieldPath} value={f.fieldPath}>{f.label}</option>
                  ))}
                </select>
                {item.fieldPath === 'custom' && (
                  <input
                    type="text"
                    placeholder={t('wallet.studio.barcode.messagePlaceholder')}
                    value={item.label}
                    onChange={e => updateItem(row.id, item.id, { label: e.target.value, fieldPath: e.target.value })}
                    className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                )}
                <input
                  type="text"
                  placeholder={t('wallet.studio.coupon.tag')}
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
