'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { CampaignChannel, WalletPlatform, ProgramOption, SegmentOption, AudienceSelection } from './CampaignWizard';
import type { CustomerItem } from './CustomerPicker';
import ProgramSelector from './ProgramSelector';
import PlatformSelector from './PlatformSelector';
import CustomerPicker from './CustomerPicker';

interface AudienceSelectorProps {
  programs: ProgramOption[];
  segments: SegmentOption[];
  channel: CampaignChannel;
  value: AudienceSelection;
  onChange: (audience: AudienceSelection) => void;
}

type SubStep = 0 | 1 | 2;

interface ProgramMemberCounts {
  total: number;
  apple: number;
  google: number;
}

interface SegmentCounts {
  [segmentId: string]: number;
}

const SEGMENT_META: Record<string, { icon: string; color: string }> = {
  all:       { icon: '👥', color: 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' },
  active:    { icon: '⚡', color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
  vip:       { icon: '⭐', color: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  at_risk:   { icon: '⚠️', color: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' },
  inactive:  { icon: '😴', color: 'border-red-400 bg-red-50 dark:bg-red-900/20' },
  new:       { icon: '🆕', color: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  most_active: { icon: '🔥', color: 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' },
};

export default function AudienceSelector({ programs, segments, channel, value, onChange }: AudienceSelectorProps) {
  const { t } = useI18n();
  const isWallet = channel === 'wallet';

  const [subStep, setSubStep] = useState<SubStep>(0);
  const [programCounts, setProgramCounts] = useState<Record<string, ProgramMemberCounts>>({});
  const [segmentCounts, setSegmentCounts] = useState<SegmentCounts>({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  const [showManual, setShowManual] = useState(false);
  const [showExclude, setShowExclude] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualOffset, setManualOffset] = useState(0);
  const [manualCustomers, setManualCustomers] = useState<CustomerItem[]>([]);
  const [manualTotal, setManualTotal] = useState(0);
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, ProgramMemberCounts> = {};
      for (const program of programs) {
        try {
          const { data } = await api.get(`/api/v1/programs/${program.id}/member-count/`);
          counts[program.id] = {
            total: data.total || 0,
            apple: data.apple_wallet || 0,
            google: data.google_wallet || 0,
          };
        } catch {
          counts[program.id] = { total: 0, apple: 0, google: 0 };
        }
      }
      setProgramCounts(counts);
    };
    fetchCounts();
  }, [programs]);

  const fetchSegmentCounts = useCallback(
    async (programId: string, platform: WalletPlatform) => {
      if (programId === 'all') {
        const counts: SegmentCounts = {};
        for (const seg of segments) counts[seg.id] = seg.count;
        setSegmentCounts(counts);
        return;
      }
      setLoadingCounts(true);
      try {
        const params = new URLSearchParams();
        if (platform !== 'both') params.append('wallet_platform', platform);
        const { data } = await api.get(`/api/v1/programs/${programId}/segment-counts/?${params.toString()}`);
        setSegmentCounts(data.counts || {});
      } catch {
        setSegmentCounts({});
      } finally {
        setLoadingCounts(false);
      }
    },
    [segments]
  );

  const handleProgramSelect = useCallback(
    (programId: string) => {
      const counts = programId === 'all' ? { total: 0 } : programCounts[programId] || { total: 0 };
      onChange({ ...value, programId, customerCount: counts.total, customerIds: [], excludedCustomerIds: [] });
      setSubStep(isWallet ? 1 : 2);
      fetchSegmentCounts(programId, value.walletPlatform);
    },
    [value, isWallet, programCounts, onChange, fetchSegmentCounts]
  );

  const handlePlatformSelect = useCallback(
    (platform: WalletPlatform) => {
      onChange({ ...value, walletPlatform: platform });
      setSubStep(2);
      fetchSegmentCounts(value.programId, platform);
    },
    [value, onChange, fetchSegmentCounts]
  );

  const handleSegmentSelect = useCallback(
    (segmentId: string) => {
      const count = segmentCounts[segmentId] || 0;
      const segment = segments.find(s => s.id === segmentId);
      onChange({ ...value, mode: 'preset', segmentId, customerIds: [], customerCount: count, label: segment?.name || segmentId });
    },
    [value, segmentCounts, segments, onChange]
  );

  const loadCustomers = useCallback(
    async (search = '', offset = 0) => {
      setManualLoading(true);
      try {
        let data;
        if (value.programId === 'all') {
          const resp = await api.get('/api/v1/customers/', {
            params: { search: search || undefined, limit: 25, offset },
          });
          data = resp.data;
        } else {
          const params: Record<string, unknown> = { search: search || undefined, limit: 25, offset };
          if (value.walletPlatform !== 'both') params.wallet_platform = value.walletPlatform;
          const resp = await api.get(`/api/v1/programs/${value.programId}/members/`, { params });
          data = resp.data;
        }
        setManualCustomers(data.items || data.results || []);
        setManualTotal(data.total || data.count || 0);
      } catch {
        toast.error(t('campaigns.loadError'));
      } finally {
        setManualLoading(false);
      }
    },
    [value.programId, value.walletPlatform, t]
  );

  useEffect(() => {
    if (showManual || showExclude) {
      loadCustomers(manualSearch, manualOffset);
    }
  }, [showManual, showExclude, manualSearch, manualOffset, loadCustomers]);

  const toggleCustomer = useCallback(
    (id: string) => {
      const isExclude = showExclude;
      const currentIds = isExclude ? value.excludedCustomerIds : value.customerIds;
      const newIds = currentIds.includes(id)
        ? currentIds.filter(x => x !== id)
        : [...currentIds, id];

      if (isExclude) {
        onChange({ ...value, excludedCustomerIds: newIds });
      } else {
        onChange({
          ...value,
          mode: newIds.length > 0 ? 'custom' : 'preset',
          customerIds: newIds,
          customerCount: newIds.length,
          label: newIds.length > 0 ? t('campaigns.customSelection', { count: newIds.length }) : t('campaigns.segmentAll'),
        });
      }
    },
    [value, showExclude, onChange, t]
  );

  const toggleAllCustomers = useCallback(() => {
    const ids = manualCustomers.map(c => c.id);
    const isExclude = showExclude;
    const currentIds = isExclude ? value.excludedCustomerIds : value.customerIds;
    const allSelected = ids.every(id => currentIds.includes(id));
    const newIds = allSelected
      ? currentIds.filter(id => !ids.includes(id))
      : [...new Set([...currentIds, ...ids])];

    if (isExclude) {
      onChange({ ...value, excludedCustomerIds: newIds });
    } else {
      onChange({
        ...value,
        mode: newIds.length > 0 ? 'custom' : 'preset',
        customerIds: newIds,
        customerCount: newIds.length,
        label: newIds.length > 0 ? t('campaigns.customSelection', { count: newIds.length }) : t('campaigns.segmentAll'),
      });
    }
  }, [manualCustomers, value, showExclude, onChange, t]);

  const effectiveCount = Math.max(
    0,
    (value.mode === 'custom' ? value.customerIds.length : value.customerCount) - value.excludedCustomerIds.length
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Sub-step indicator */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {[
          { step: 0 as SubStep, label: t('campaigns.subStepProgram') },
          ...(isWallet ? [{ step: 1 as SubStep, label: t('campaigns.subStepPlatform') }] : []),
          { step: 2 as SubStep, label: t('campaigns.subStepSegment') },
        ].map((item, i, arr) => (
          <div key={item.step} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${subStep >= item.step ? 'bg-brand-500 text-white' : 'bg-surface-200 text-surface-400'}`}>
              {subStep > item.step ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium ${subStep >= item.step ? 'text-surface-900 dark:text-white' : 'text-surface-400'}`}>
              {item.label}
            </span>
            {i < arr.length - 1 && (
              <div className={`w-8 h-0.5 rounded-full ${subStep > item.step ? 'bg-brand-500' : 'bg-surface-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Program */}
      <section className={`transition-opacity duration-300 ${subStep === 0 ? 'opacity-100' : 'opacity-60'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-surface-900 dark:text-white">📍 {t('campaigns.selectProgram')}</h3>
          {subStep > 0 && value.programId !== 'all' && (
            <button onClick={() => setSubStep(0)} className="text-xs text-brand-500 hover:text-brand-600 font-medium">{t('common.edit')}</button>
          )}
        </div>
        {subStep <= 0 ? (
          <ProgramSelector programs={programs} programCounts={programCounts} selectedId={value.programId} isWallet={isWallet} onSelect={handleProgramSelect} />
        ) : value.programId !== 'all' && (
          <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl flex items-center gap-2">
            <span className="text-sm font-medium">📍 {programs.find(p => p.id === value.programId)?.name}</span>
            <span className="text-xs text-surface-500">👥 {(programCounts[value.programId]?.total || 0).toLocaleString()} {t('campaigns.enrolled')}</span>
          </div>
        )}
      </section>

      {/* Platform */}
      {isWallet && (
        <section className={`transition-opacity duration-300 ${subStep === 1 ? 'opacity-100' : 'opacity-60'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-surface-900 dark:text-white">📱 {t('campaigns.selectPlatform')}</h3>
            {subStep > 1 && <button onClick={() => setSubStep(1)} className="text-xs text-brand-500 hover:text-brand-600 font-medium">{t('common.edit')}</button>}
          </div>
          {subStep <= 1 ? (
            <PlatformSelector programs={programs} programCounts={programCounts} selectedPlatform={value.walletPlatform} selectedProgramId={value.programId} onSelect={handlePlatformSelect} />
          ) : (
            <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl flex items-center gap-2">
              <span className="text-sm font-medium">
                {value.walletPlatform === 'apple' && '🍎 Apple Wallet'}
                {value.walletPlatform === 'google' && '🤖 Google Wallet'}
                {value.walletPlatform === 'both' && '✓ Todas las plataformas'}
              </span>
            </div>
          )}
        </section>
      )}

      {/* Segments */}
      <section className={`transition-opacity duration-300 ${subStep === 2 ? 'opacity-100' : 'opacity-40'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-surface-900 dark:text-white">👥 {t('campaigns.selectSegment')}</h3>
        </div>

        {subStep < 2 ? (
          <div className="p-6 text-center text-surface-400 bg-surface-50 dark:bg-surface-800 rounded-xl">
            <p>{t('campaigns.completePreviousSteps')}</p>
          </div>
        ) : (
          <>
            {/* Preset segments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {segments.map(seg => {
                const meta = SEGMENT_META[seg.id] || { icon: '📊', color: 'border-surface-300 bg-surface-50' };
                const isSelected = value.segmentId === seg.id && value.mode === 'preset';
                const count = segmentCounts[seg.id] ?? seg.count ?? 0;
                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => handleSegmentSelect(seg.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all duration-200
                      ${isSelected ? `${meta.color} shadow-md` : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-surface-300'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{meta.icon}</span>
                      <span className="font-semibold text-sm text-surface-900 dark:text-white">{seg.name}</span>
                      {isSelected && (
                        <svg className="w-4 h-4 text-brand-500 ml-auto" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      )}
                    </div>
                    <p className="text-xs font-bold text-brand-600 dark:text-brand-400 mt-2">
                      {loadingCounts ? '...' : count.toLocaleString()} {t('campaigns.clients')}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Manual selection */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowManual(!showManual)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                  ${showManual ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-dashed border-brand-300 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/10'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">✏️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-surface-900 dark:text-white">{t('campaigns.manualSelection')}</p>
                    <p className="text-xs text-surface-500">
                      {value.customerIds.length > 0
                        ? t('campaigns.manualSelectionCount', { count: value.customerIds.length })
                        : t('campaigns.manualSelectionDesc')}
                    </p>
                  </div>
                  <span className="text-lg">{showManual ? '▲' : '▼'}</span>
                </div>
              </button>
              {showManual && (
                <div className="mt-3">
                  <CustomerPicker
                    customers={manualCustomers}
                    selectedIds={value.customerIds}
                    total={manualTotal}
                    offset={manualOffset}
                    loading={manualLoading}
                    search={manualSearch}
                    mode="select"
                    onSearchChange={(s) => { setManualSearch(s); setManualOffset(0); }}
                    onOffsetChange={setManualOffset}
                    onToggle={toggleCustomer}
                    onToggleAll={toggleAllCustomers}
                  />
                </div>
              )}
            </div>

            {/* Exclude */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowExclude(!showExclude)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                  ${showExclude ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-dashed border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/10'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚫</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-surface-900 dark:text-white">{t('campaigns.excludeCustomers')}</p>
                    <p className="text-xs text-surface-500">
                      {value.excludedCustomerIds.length > 0
                        ? t('campaigns.excludeCount', { count: value.excludedCustomerIds.length })
                        : t('campaigns.excludeDesc')}
                    </p>
                  </div>
                  <span className="text-lg">{showExclude ? '▲' : '▼'}</span>
                </div>
              </button>
              {showExclude && (
                <div className="mt-3">
                  <div className="p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl mb-2">
                    <p className="text-xs text-red-600 dark:text-red-400">{t('campaigns.excludeHelp')}</p>
                  </div>
                  <CustomerPicker
                    customers={manualCustomers}
                    selectedIds={value.excludedCustomerIds}
                    total={manualTotal}
                    offset={manualOffset}
                    loading={manualLoading}
                    search={manualSearch}
                    mode="exclude"
                    onSearchChange={(s) => { setManualSearch(s); setManualOffset(0); }}
                    onOffsetChange={setManualOffset}
                    onToggle={toggleCustomer}
                    onToggleAll={toggleAllCustomers}
                  />
                </div>
              )}
            </div>

            {/* Funnel summary */}
            <div className="p-5 bg-surface-50 dark:bg-surface-800 rounded-xl">
              <h4 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">📊 {t('campaigns.audienceSummary')}</h4>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="px-3 py-1.5 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-medium">
                  {value.programId === 'all' ? t('campaigns.allPrograms') : programs.find(p => p.id === value.programId)?.name || value.programId}
                </span>
                <span className="text-surface-300">→</span>
                {isWallet && (
                  <>
                    <span className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                      {value.walletPlatform === 'apple' && '🍎 Apple'}
                      {value.walletPlatform === 'google' && '🤖 Google'}
                      {value.walletPlatform === 'both' && '✓ Todas'}
                    </span>
                    <span className="text-surface-300">→</span>
                  </>
                )}
                <span className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                  {value.mode === 'custom' && value.customerIds.length > 0 ? t('campaigns.customSelection', { count: value.customerIds.length }) : value.label}
                </span>
                {value.excludedCustomerIds.length > 0 && (
                  <>
                    <span className="text-surface-300">-</span>
                    <span className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium">
                      🚫 {value.excludedCustomerIds.length} {t('campaigns.excluded')}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
                <p className="text-lg font-bold text-surface-900 dark:text-white">
                  👥 {effectiveCount.toLocaleString()} {t('campaigns.clientsWillReceive')}
                </p>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
