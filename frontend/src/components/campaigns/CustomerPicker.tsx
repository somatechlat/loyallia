'use client';

import { useI18n } from '@/lib/i18n';

export interface CustomerItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface CustomerPickerProps {
  customers: CustomerItem[];
  selectedIds: string[];
  total: number;
  offset: number;
  loading: boolean;
  search: string;
  mode: 'select' | 'exclude';
  onSearchChange: (search: string) => void;
  onOffsetChange: (offset: number) => void;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

export default function CustomerPicker({
  customers,
  selectedIds,
  total,
  offset,
  loading,
  search,
  mode,
  onSearchChange,
  onOffsetChange,
  onToggle,
  onToggleAll,
}: CustomerPickerProps) {
  const { t } = useI18n();
  const limit = 25;
  const allSelected = customers.length > 0 && customers.every(c => selectedIds.includes(c.id));

  return (
    <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
      <div className="p-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
        <div className="relative">
          <input
            type="text"
            placeholder={t('campaigns.searchCustomer')}
            className="input w-full pr-10"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
          />
          <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
        </div>
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {loading && customers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="spinner w-5 h-5 mx-auto mb-2" />
            <p className="text-sm text-surface-500">{t('common.loading')}</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-surface-500">
            <p>{t('campaigns.noCustomers')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 dark:bg-surface-800 sticky top-0">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left px-3 py-2 font-semibold text-surface-700 dark:text-surface-300">{t('campaigns.customer')}</th>
                <th className="text-left px-3 py-2 font-semibold text-surface-700 dark:text-surface-300">{t('campaigns.contact')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {customers.map(customer => (
                <tr key={customer.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(customer.id)}
                      onChange={() => onToggle(customer.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-surface-900 dark:text-white">{customer.first_name} {customer.last_name}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p className="text-surface-500 text-xs">{customer.email}</p>
                    {customer.phone && <p className="text-surface-400 text-[10px]">{customer.phone}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > limit && (
        <div className="flex items-center justify-between p-3 border-t border-surface-200 dark:border-surface-700">
          <p className="text-xs text-surface-500">
            {t('campaigns.showing', { from: offset + 1, to: Math.min(offset + limit, total), total })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onOffsetChange(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="btn-secondary text-xs disabled:opacity-40"
            >
              {t('common.previous')}
            </button>
            <button
              onClick={() => onOffsetChange(offset + limit)}
              disabled={offset + limit >= total}
              className="btn-secondary text-xs disabled:opacity-40"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
