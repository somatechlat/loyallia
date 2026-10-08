'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import api from '@/lib/api';

export interface RecommendationItem {
  customer_id: string;
  customer_name: string;
  score: number;
  reasons: string[];
  suggested_channel: string;
  program_name?: string;
  last_visit?: string | null;
  total_spent?: string;
  has_email: boolean;
  has_phone: boolean;
  has_wallet: boolean;
}

interface RecommendationPanelProps {
  channel: string;
  programId: string | 'all';
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
}

const ALL_RULES = [
  'WELCOME_NEW',
  'NEAR_REWARD',
  'WINBACK',
  'LOST',
  'VIP_TOUCH',
  'EXPIRING_PASS',
  'BIRTHDAY',
  'RECENT_REDEEM',
] as const;

export default function RecommendationPanel({
  channel,
  programId,
  selectedIds,
  onSelect,
}: RecommendationPanelProps) {
  const { t } = useI18n();
  const [enabledRules, setEnabledRules] = useState<string[]>([...ALL_RULES]);
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tRef = useRef(t);
  tRef.current = t;
  const rulesKey = enabledRules.join(',');

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ channel });
      if (programId && programId !== 'all') params.set('program_id', programId);
      if (rulesKey && rulesKey !== ALL_RULES.join(',')) {
        params.set('rules', rulesKey);
      }
      const { data } = await api.get(`/api/v1/notifications/campaigns/recommendations/?${params}`);
      setItems(data.recommendations || []);
    } catch {
      setError(tRef.current('campaigns.reco.loadError'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [channel, programId, rulesKey]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const toggleRule = (rule: string) => {
    setEnabledRules(prev =>
      prev.includes(rule) ? prev.filter(r => r !== rule) : [...prev, rule]
    );
  };

  const accepted = items.filter(i => selectedIds.includes(i.customer_id));

  const acceptAll = () => onSelect(items.map(i => i.customer_id));
  const clearAll = () => onSelect([]);
  const toggleCustomer = (id: string) => {
    onSelect(
      selectedIds.includes(id)
        ? selectedIds.filter(x => x !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <div className="space-y-4" data-testid="recommendation-panel">
      <div className="flex flex-wrap gap-2">
        {ALL_RULES.map(rule => {
          const on = enabledRules.includes(rule);
          return (
            <button
              key={rule}
              type="button"
              onClick={() => toggleRule(rule)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                on
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                  : 'border-surface-200 dark:border-surface-700 text-surface-500 hover:border-surface-300'
              }`}
            >
              {t(`campaigns.reco.rule.${rule}`)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-surface-500">
          {loading
            ? t('campaigns.reco.loading')
            : t('campaigns.reco.count', { count: items.length })}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchRecommendations}
            className="btn-ghost text-xs px-3 py-1.5"
            id="reco-refresh-btn"
          >
            {t('campaigns.reco.refresh')}
          </button>
          <button
            type="button"
            onClick={acceptAll}
            disabled={items.length === 0}
            className="btn-primary text-xs px-3 py-1.5"
            id="reco-accept-all-btn"
          >
            {t('campaigns.reco.acceptAll')}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="btn-ghost text-xs px-3 py-1.5"
            id="reco-clear-btn"
          >
            {t('campaigns.reco.clear')}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" data-testid="reco-error">
          {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="p-4 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 text-center">
          <p className="text-sm text-surface-500">{t('campaigns.reco.empty')}</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-surface-200 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-800">
          {items.map(item => {
            const checked = selectedIds.includes(item.customer_id);
            return (
              <label
                key={item.customer_id}
                className="flex items-start gap-3 p-3 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/60"
                data-testid="reco-row"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCustomer(item.customer_id)}
                  className="mt-1"
                  data-testid={`reco-check-${item.customer_id}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-surface-900 dark:text-white truncate">
                      {item.customer_name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                      {t(`campaigns.reco.channel.${item.suggested_channel}`)}
                    </span>
                    {item.program_name && (
                      <span className="text-[10px] text-surface-400 truncate">
                        {item.program_name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.reasons.map(r => (
                      <span
                        key={r}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-900/25 text-brand-700 dark:text-brand-300"
                      >
                        {t(`campaigns.reco.rule.${r}`)}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-1">
                  {Math.round(item.score * 100)}
                </span>
              </label>
            );
          })}
        </div>
      )}

      <p className="text-xs text-surface-400">
        {t('campaigns.reco.userMustConfirm', { count: accepted.length })}
      </p>
    </div>
  );
}
