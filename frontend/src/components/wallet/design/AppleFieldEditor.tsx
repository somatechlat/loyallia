'use client';

import { APPLE_FIELD_GROUPS } from '@/components/programs/constants';
import type { AppleFieldDef } from '../types-v1-definitions';
import { PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from '../icons';
import { uid, getAppleFieldOptions, APPLE_GROUP_META } from './helpers';
import { useI18n } from '@/lib/i18n';

/**
 * @description Editor for Apple Wallet PassKit field groups (header, primary, secondary, auxiliary, back).
 * @param {Object} props - Component props
 * @param {Record<string, AppleFieldDef[]>} props.fields - Current field groups
 * @param {(fields: Record<string, AppleFieldDef[]>) => void} props.onChange - Fields change handler
 * @param {string} props.cardType - Type of loyalty card
 * @returns JSX.Element
 */
export default function AppleFieldEditor({
  fields, onChange, cardType,
}: {
  fields: Record<string, AppleFieldDef[]>;
  onChange: (fields: Record<string, AppleFieldDef[]>) => void;
  cardType: string;
}) {
  const { t } = useI18n();
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
                          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">{t('wallet.preview.info')}</label>
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
                            <option value="">{t('wallet.studio.iconPicker.selectIcon')}</option>
                            {options.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>

                        {showCustomInput && (
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-surface-600 dark:text-surface-300">{t('wallet.studio.dynamicTemplates.placeholder')}</label>
                            <input
                              type="text"
                              placeholder={t('wallet.studio.dynamicTemplates.placeholder')}
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
                          <label className="text-xs font-medium text-surface-600 dark:text-surface-300">{t('wallet.studio.fields.label')}</label>
                          <input
                            type="text"
                            placeholder={t('wallet.studio.fields.placeholderLabel')}
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
                            <label className="text-xs font-medium text-surface-600 dark:text-surface-300">{t('wallet.studio.fields.textAlignment')}</label>
                            <select
                              value={f.textAlignment}
                              onChange={e => {
                                const updated = [...groupFields];
                                updated[idx] = { ...f, textAlignment: e.target.value as AppleFieldDef['textAlignment'] };
                                updateGroup(group.key, updated);
                              }}
                              className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            >
                              <option value="PKTextAlignmentNatural">{t('wallet.studio.fields.alignNatural')}</option>
                              <option value="PKTextAlignmentLeft">{t('wallet.studio.fields.alignLeft')}</option>
                              <option value="PKTextAlignmentCenter">{t('wallet.studio.fields.alignCenter')}</option>
                              <option value="PKTextAlignmentRight">{t('wallet.studio.fields.alignRight')}</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-surface-600 dark:text-surface-300">{t('wallet.studio.notifications.appleChangeMessage')}</label>
                            <input
                              type="text"
                              placeholder={t('wallet.studio.dynamicTemplates.placeholder')}
                              value={f.changeMessage || ''}
                              onChange={e => {
                                const updated = [...groupFields];
                                updated[idx] = { ...f, changeMessage: e.target.value };
                                updateGroup(group.key, updated);
                              }}
                              className="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-600 px-2.5 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                              maxLength={200}
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
                <p className="text-xs text-surface-400 dark:text-surface-500 italic">{t('wallet.studio.fields.noFields')}</p>
              )}
              <button
                onClick={() => addField(group.key)}
                disabled={groupFields.length >= group.max}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-surface-300 dark:border-surface-600 text-xs font-medium text-surface-500 dark:text-surface-400 hover:border-brand-300 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all disabled:opacity-40"
              >
                <PlusIcon className="w-3.5 h-3.5" /> {t('wallet.studio.fields.addField')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
