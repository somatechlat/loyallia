'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { programsApi } from '@/lib/api';
import toast from 'react-hot-toast';

/**
 * Represents a loyalty program transaction.
 */
interface Transaction {
  id: string;
  transaction_type: string;
  transaction_type_label: string;
  customer_name: string;
  amount: string | null;
  quantity: number | null;
  staff_name: string;
  location_name: string;
  notes: string;
  created_at: string;
  transaction_data: Record<string, unknown>;
}

/**
 * Props for the ProgramTransactionsModal component.
 */
interface Props {
  /** Program ID to load transactions for */
  programId: string;
  /** Callback to close the modal */
  onClose: () => void;
}

const LIMIT = 25;

const TYPE_COLORS: Record<string, string> = {
  stamp_earned: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  stamp_redeemed: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  cashback_earned: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cashback_redeemed: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  coupon_redeemed: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  gift_redeemed: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  membership_validated: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  corporate_validated: 'bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300',
  referral_reward: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  multipass_used: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  remote_reward: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

/**
 * @description Modal displaying paginated program transactions with type badges.
 * @param {Props} props - Component props
 * @returns JSX.Element
 */
export default function ProgramTransactionsModal({ programId, onClose }: Props) {
  const { t } = useI18n();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await programsApi.transactions(programId, {
        limit: LIMIT,
        offset,
      });
      setTransactions(data.items);
      setTotal(data.total);
    } catch {
      toast.error(t('programs.transactions.loadError'));
    } finally {
      setLoading(false);
    }
  }, [programId, offset, t]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const extraInfo = (tx: Transaction) => {
    const parts: string[] = [];
    if (tx.amount) { const amt = parseFloat(tx.amount); parts.push(`$${!isNaN(amt) ? amt.toFixed(2) : '0.00'}`); }
    if (tx.quantity) parts.push(`${t('programs.transactions.quantity')}: ${tx.quantity}`);
    const td = tx.transaction_data;
    if (td.new_balance) parts.push(`${t('programs.transactions.newBalance')}: ${td.new_balance}`);
    if (td.reward_earned) parts.push(t('programs.transactions.rewardEarned'));
    return parts.join(' · ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700">
          <div>
            <h3 className="text-lg font-bold text-surface-900 dark:text-white">{t('programs.rewardsRedeemed')}</h3>
            <p className="text-sm text-surface-500">{total} {t('programs.transactions.transactionCount', { count: total })}</p>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 p-1" aria-label={t('common.close')}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-0">
          {loading && transactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="spinner w-6 h-6 mx-auto mb-2" />
              <p className="text-sm text-surface-500">{t('common.loading')}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-surface-500">
              <p>{t('programs.transactions.noTransactions')}</p>
              <p className="text-sm mt-1">{t('programs.transactions.scanHint')}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-50 dark:bg-surface-800 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">{t('common.date')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">{t('customers.customer')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">{t('common.type')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">{t('common.details')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">{t('team.table.name')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">{t('locations.title')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <td className="px-4 py-3 text-surface-600 dark:text-surface-400 whitespace-nowrap">
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-surface-900 dark:text-white">
                      {tx.customer_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[tx.transaction_type] || 'bg-surface-100 text-surface-600'}`}>
                        {tx.transaction_type_label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-surface-700 dark:text-surface-300">{extraInfo(tx) || '—'}</div>
                      {tx.notes && <div className="text-surface-500 text-xs mt-0.5">{tx.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-surface-600 dark:text-surface-400">
                      {tx.staff_name}
                    </td>
                    <td className="px-4 py-3 text-surface-600 dark:text-surface-400">
                      {tx.location_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between p-4 border-t border-surface-200 dark:border-surface-700">
            <p className="text-sm text-surface-500">
              {t('customers.showing', { start: offset + 1, end: Math.min(offset + LIMIT, total), total })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
                disabled={offset === 0}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                {t('common.previous')}
              </button>
              <button
                onClick={() => setOffset(o => o + LIMIT)}
                disabled={offset + LIMIT >= total}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
