'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { CampaignChannel, WalletPlatform, ProgramOption, SegmentOption, AudienceSelection } from './CampaignWizard';

interface AudienceSelectorProps {
  programs: ProgramOption[];
  segments: SegmentOption[];
  channel: CampaignChannel;
  value: AudienceSelection;
  onChange: (audience: AudienceSelection) => void;
}

type SubStep = 0 | 1 | 2; // 0=Programa, 1=Plataforma, 2=Segmento

interface ProgramMemberCounts {
  total: number;
  apple: number;
  google: number;
}

interface SegmentCounts {
  [segmentId: string]: number;
}

export default function AudienceSelector({
  programs,
  segments,
  channel,
  value,
  onChange,
}: AudienceSelectorProps) {
  const { t } = useI18n();
  const [subStep, setSubStep] = useState<SubStep>(0);
  const [searchProgram, setSearchProgram] = useState('');
  const [programCounts, setProgramCounts] = useState<Record<string, ProgramMemberCounts>>({});
  const [segmentCounts, setSegmentCounts] = useState<SegmentCounts>({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [showExcludePicker, setShowExcludePicker] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualCustomers, setManualCustomers] = useState<Array<{id: string; first_name: string; last_name: string; email: string; phone: string}>>([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualOffset, setManualOffset] = useState(0);
  const [manualTotal, setManualTotal] = useState(0);

  const isWallet = channel === 'wallet';

  // Fetch program member counts on mount
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

  // Fetch segment counts when program or platform changes
  const fetchSegmentCounts = useCallback(
    async (programId: string, platform: WalletPlatform) => {
      if (programId === 'all') {
        // Use existing segment counts from props for "all programs"
        const counts: SegmentCounts = {};
        for (const seg of segments) {
          counts[seg.id] = seg.count;
        }
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
        // Fallback: try to fetch members and count manually
        try {
          const { data } = await api.get(`/api/v1/programs/${programId}/members/`, {
            params: { limit: 1, wallet_platform: platform !== 'both' ? platform : undefined },
          });
          const total = data.total || 0;
          setSegmentCounts({ all: total });
        } catch {
          setSegmentCounts({});
        }
      } finally {
        setLoadingCounts(false);
      }
    },
    [segments]
  );

  // When program is selected, auto-advance if not wallet (skip platform step)
  const handleProgramSelect = useCallback(
    (programId: string) => {
      const counts = programId === 'all' ? { total: 0 } : programCounts[programId] || { total: 0 };
      const newAudience: AudienceSelection = {
        ...value,
        programId,
        customerCount: counts.total,
        customerIds: [],
        excludedCustomerIds: [],
      };
      onChange(newAudience);

      if (!isWallet) {
        // Skip platform step for non-wallet channels
        setSubStep(2);
      } else {
        setSubStep(1);
      }

      fetchSegmentCounts(programId, value.walletPlatform);
    },
    [value, isWallet, programCounts, onChange, fetchSegmentCounts]
  );

  const handlePlatformSelect = useCallback(
    (platform: WalletPlatform) => {
      const newAudience = { ...value, walletPlatform: platform };
      onChange(newAudience);
      setSubStep(2);
      fetchSegmentCounts(value.programId, platform);
    },
    [value, onChange, fetchSegmentCounts]
  );

  const handleSegmentSelect = useCallback(
    (segmentId: string) => {
      const count = segmentCounts[segmentId] || 0;
      const segment = segments.find(s => s.id === segmentId);
      onChange({
        ...value,
        mode: 'preset',
        segmentId,
        customerIds: [],
        customerCount: count,
        label: segment?.name || segmentId,
      });
    },
    [value, segmentCounts, segments, onChange]
  );

  // Load manual customer picker data
  const loadManualCustomers = useCallback(
    async (search = '', offset = 0) => {
      if (value.programId === 'all') {
        // For all programs, load from customers API with segment filter
        setManualLoading(true);
        try {
          const { data } = await api.get('/api/v1/customers/', {
            params: {
              search: search || undefined,
              limit: 25,
              offset,
            },
          });
          setManualCustomers(data.items || data.results || []);
          setManualTotal(data.total || data.count || 0);
        } catch {
          toast.error(t('campaigns.loadError'));
        } finally {
          setManualLoading(false);
        }
        return;
      }

      setManualLoading(true);
      try {
        const params: Record<string, unknown> = {
          search: search || undefined,
          limit: 25,
          offset,
        };
        if (value.walletPlatform !== 'both') {
          params.wallet_platform = value.walletPlatform;
        }
        const { data } = await api.get(`/api/v1/programs/${value.programId}/members/`, { params });
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
    if (showManualPicker || showExcludePicker) {
      loadManualCustomers(manualSearch, manualOffset);
    }
  }, [showManualPicker, showExcludePicker, manualSearch, manualOffset, loadManualCustomers]);

  const toggleCustomerSelection = useCallback(
    (customerId: string) => {
      const currentIds = showExcludePicker ? value.excludedCustomerIds : value.customerIds;
      const isSelected = currentIds.includes(customerId);
      const newIds = isSelected ? currentIds.filter(id => id !== customerId) : [...currentIds, customerId];

      if (showExcludePicker) {
        onChange({ ...value, excludedCustomerIds: newIds });
      } else {
        const newCount = newIds.length;
        onChange({
          ...value,
          mode: newCount > 0 ? 'custom' : 'preset',
          customerIds: newIds,
          customerCount: newCount,
          label: newCount > 0 ? t('campaigns.customSelection', { count: newCount }) : t('campaigns.segmentAll'),
        });
      }
    },
    [value, showExcludePicker, onChange, t]
  );

  const filteredPrograms = programs.filter(p =>
    p.name.toLowerCase().includes(searchProgram.toLowerCase())
  );

  const segmentMeta: Record<string, { icon: string; color: string; desc: string }> = {
    all: { icon: '👥', color: 'border-brand-500 bg-brand-50 dark:bg-brand-900/20', desc: t('campaigns.segmentAllDesc') },
    active: { icon: '⚡', color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', desc: t('campaigns.segmentActiveDesc') },
    vip: { icon: '⭐', color: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20', desc: t('campaigns.segmentVipDesc') },
    at_risk: { icon: '⚠️', color: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20', desc: t('campaigns.segmentAtRiskDesc') },
    inactive: { icon: '😴', color: 'border-red-400 bg-red-50 dark:bg-red-900/20', desc: t('campaigns.segmentInactiveDesc') },
    new: { icon: '🆕', color: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20', desc: t('campaigns.segmentNewDesc') },
    most_active: { icon: '🔥', color: 'border-rose-500 bg-rose-50 dark:bg-rose-900/20', desc: t('campaigns.segmentMostActiveDesc') },
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Sub-step indicator */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
            ${subStep >= 0 ? 'bg-brand-500 text-white' : 'bg-surface-200 text-surface-400'}`}>
            {subStep > 0 ? '✓' : '1'}
          </div>
          <span className={`text-xs font-medium ${subStep >= 0 ? 'text-surface-900 dark:text-white' : 'text-surface-400'}`}>
            {t('campaigns.subStepProgram')}
          </span>
        </div>
        <div className={`w-8 h-0.5 rounded-full ${subStep >= 1 ? 'bg-brand-500' : 'bg-surface-200'}`} />
        {isWallet && (
          <>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${subStep >= 1 ? 'bg-brand-500 text-white' : 'bg-surface-200 text-surface-400'}`}>
                {subStep > 1 ? '✓' : '2'}
              </div>
              <span className={`text-xs font-medium ${subStep >= 1 ? 'text-surface-900 dark:text-white' : 'text-surface-400'}`}>
                {t('campaigns.subStepPlatform')}
              </span>
            </div>
            <div className={`w-8 h-0.5 rounded-full ${subStep >= 2 ? 'bg-brand-500' : 'bg-surface-200'}`} />
          </>
        )}
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
            ${subStep >= 2 ? 'bg-brand-500 text-white' : 'bg-surface-200 text-surface-400'}`}>
            {isWallet ? '3' : '2'}
          </div>
          <span className={`text-xs font-medium ${subStep >= 2 ? 'text-surface-900 dark:text-white' : 'text-surface-400'}`}>
            {t('campaigns.subStepSegment')}
          </span>
        </div>
      </div>

      {/* SUB-STEP 0: Program Selection */}
      <div className={`transition-all duration-300 ${subStep === 0 ? 'opacity-100' : subStep > 0 ? 'opacity-60' : 'opacity-40'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-surface-900 dark:text-white">
            📍 {t('campaigns.selectProgram')}
          </h3>
          {subStep > 0 && (
            <button
              onClick={() => setSubStep(0)}
              className="text-xs text-brand-500 hover:text-brand-600 font-medium"
            >
              {t('common.edit')}
            </button>
          )}
        </div>

        {subStep <= 0 && (
          <>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={t('campaigns.searchProgram')}
                  className="input w-full pr-10"
                  value={searchProgram}
                  onChange={e => setSearchProgram(e.target.value)}
                />
                <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPrograms.map(program => {
                const counts = programCounts[program.id] || { total: 0, apple: 0, google: 0 };
                const isSelected = value.programId === program.id;
                return (
                  <button
                    key={program.id}
                    type="button"
                    onClick={() => handleProgramSelect(program.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all duration-200
                      ${isSelected
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md'
                        : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-surface-300 dark:hover:border-surface-600'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-surface-900 dark:text-white truncate">{program.name}</span>
                      {isSelected && (
                        <svg className="w-5 h-5 text-brand-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-brand-600 dark:text-brand-400 font-bold mt-2">
                      👥 {counts.total.toLocaleString()} {t('campaigns.enrolled')}
                    </p>
                    {isWallet && counts.total > 0 && (
                      <p className="text-[10px] text-surface-400 mt-1">
                        🍎 {counts.apple.toLocaleString()} | 🤖 {counts.google.toLocaleString()}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => handleProgramSelect('all')}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                  ${value.programId === 'all'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-dashed border-surface-300 dark:border-surface-600 hover:border-brand-300'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌍</span>
                  <div>
                    <p className="font-semibold text-sm text-surface-900 dark:text-white">{t('campaigns.allPrograms')}</p>
                    <p className="text-xs text-surface-500">{t('campaigns.allProgramsDesc')}</p>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {subStep > 0 && value.programId !== 'all' && (
          <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl flex items-center gap-2">
            <span className="text-sm font-medium text-surface-900 dark:text-white">
              📍 {programs.find(p => p.id === value.programId)?.name}
            </span>
            <span className="text-xs text-surface-500">
              👥 {(programCounts[value.programId]?.total || 0).toLocaleString()} {t('campaigns.enrolled')}
            </span>
          </div>
        )}
      </div>

      {/* SUB-STEP 1: Wallet Platform (only for Wallet channel) */}
      {isWallet && (
        <div className={`transition-all duration-300 ${subStep === 1 ? 'opacity-100' : subStep > 1 ? 'opacity-60' : 'opacity-40'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-surface-900 dark:text-white">
              📱 {t('campaigns.selectPlatform')}
            </h3>
            {subStep > 1 && (
              <button
                onClick={() => setSubStep(1)}
                className="text-xs text-brand-500 hover:text-brand-600 font-medium"
              >
                {t('common.edit')}
              </button>
            )}
          </div>

          {subStep <= 1 && value.programId && (
            <div className="flex gap-3">
              {(['both', 'apple', 'google'] as WalletPlatform[]).map(platform => {
                const isSelected = value.walletPlatform === platform;
                const counts = value.programId === 'all'
                  ? { apple: 0, google: 0 }
                  : programCounts[value.programId] || { apple: 0, google: 0 };
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => handlePlatformSelect(platform)}
                    className={`flex-1 text-left p-4 rounded-xl border-2 transition-all duration-200
                      ${isSelected
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md'
                        : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-surface-300'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {platform === 'apple' && '🍎'}
                        {platform === 'google' && '🤖'}
                        {platform === 'both' && '✓'}
                      </span>
                      <span className="font-semibold text-sm">
                        {platform === 'apple' && t('wallet.appleWallet')}
                        {platform === 'google' && t('wallet.googleWallet')}
                        {platform === 'both' && t('wallet.both')}
                      </span>
                      {isSelected && (
                        <svg className="w-4 h-4 text-brand-500 ml-auto" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      )}
                    </div>
                    {value.programId !== 'all' && (
                      <p className="text-xs text-brand-600 dark:text-brand-400 font-bold mt-2">
                        {platform === 'apple' && `🍎 ${counts.apple.toLocaleString()}`}
                        {platform === 'google' && `🤖 ${counts.google.toLocaleString()}`}
                        {platform === 'both' && `👥 ${(counts.apple + counts.google).toLocaleString()}`}
                        {' '}{t('campaigns.clients')}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {subStep > 1 && (
            <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl flex items-center gap-2">
              <span className="text-sm font-medium">
                {value.walletPlatform === 'apple' && '🍎 Apple Wallet'}
                {value.walletPlatform === 'google' && '🤖 Google Wallet'}
                {value.walletPlatform === 'both' && '✓ Todas las plataformas'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* SUB-STEP 2: Segment Selection */}
      <div className={`transition-all duration-300 ${subStep === 2 ? 'opacity-100' : 'opacity-40'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-surface-900 dark:text-white">
            👥 {t('campaigns.selectSegment')}
          </h3>
        </div>

        {subStep < 2 ? (
          <div className="p-6 text-center text-surface-400 bg-surface-50 dark:bg-surface-800 rounded-xl">
            <p>{t('campaigns.completePreviousSteps')}</p>
          </div>
        ) : (
          <>
            {/* Segment presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {segments.map(seg => {
                const meta = segmentMeta[seg.id] || { icon: '📊', color: 'border-surface-300 bg-surface-50', desc: seg.name };
                const isSelected = value.segmentId === seg.id && value.mode === 'preset';
                const count = segmentCounts[seg.id] ?? seg.count ?? 0;
                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => handleSegmentSelect(seg.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all duration-200
                      ${isSelected
                        ? `${meta.color} shadow-md`
                        : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-surface-300'
                      }`}
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
                    <p className="text-xs text-surface-500 mt-1">{meta.desc}</p>
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
                onClick={() => setShowManualPicker(!showManualPicker)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                  ${showManualPicker
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-dashed border-brand-300 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/10'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">✏️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-surface-900 dark:text-white">
                      {t('campaigns.manualSelection')}
                    </p>
                    <p className="text-xs text-surface-500">
                      {value.customerIds.length > 0
                        ? t('campaigns.manualSelectionCount', { count: value.customerIds.length })
                        : t('campaigns.manualSelectionDesc')
                      }
                    </p>
                  </div>
                  <span className="text-lg">{showManualPicker ? '▲' : '▼'}</span>
                </div>
              </button>

              {showManualPicker && (
                <div className="mt-3 border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
                  <div className="p-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t('campaigns.searchCustomer')}
                        className="input w-full pr-10"
                        value={manualSearch}
                        onChange={e => { setManualSearch(e.target.value); setManualOffset(0); }}
                      />
                      <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                      </svg>
                    </div>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto">
                    {manualLoading && manualCustomers.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="spinner w-5 h-5 mx-auto mb-2" />
                        <p className="text-sm text-surface-500">{t('common.loading')}</p>
                      </div>
                    ) : manualCustomers.length === 0 ? (
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
                                checked={manualCustomers.length > 0 && manualCustomers.every(c => value.customerIds.includes(c.id))}
                                onChange={() => {
                                  const allIds = manualCustomers.map(c => c.id);
                                  const allSelected = allIds.every(id => value.customerIds.includes(id));
                                  const newIds = allSelected
                                    ? value.customerIds.filter(id => !allIds.includes(id))
                                    : [...new Set([...value.customerIds, ...allIds])];
                                  onChange({
                                    ...value,
                                    mode: newIds.length > 0 ? 'custom' : 'preset',
                                    customerIds: newIds,
                                    customerCount: newIds.length,
                                    label: newIds.length > 0
                                      ? t('campaigns.customSelection', { count: newIds.length })
                                      : t('campaigns.segmentAll'),
                                  });
                                }}
                                className="rounded"
                              />
                            </th>
                            <th className="text-left px-3 py-2 font-semibold text-surface-700 dark:text-surface-300">{t('campaigns.customer')}</th>
                            <th className="text-left px-3 py-2 font-semibold text-surface-700 dark:text-surface-300">{t('campaigns.contact')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                          {manualCustomers.map(customer => (
                            <tr key={customer.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={value.customerIds.includes(customer.id)}
                                  onChange={() => toggleCustomerSelection(customer.id)}
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

                  {manualTotal > 25 && (
                    <div className="flex items-center justify-between p-3 border-t border-surface-200 dark:border-surface-700">
                      <p className="text-xs text-surface-500">
                        {t('campaigns.showing', { from: manualOffset + 1, to: Math.min(manualOffset + 25, manualTotal), total: manualTotal })}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setManualOffset(o => Math.max(0, o - 25))}
                          disabled={manualOffset === 0}
                          className="btn-secondary text-xs disabled:opacity-40"
                        >
                          {t('common.previous')}
                        </button>
                        <button
                          onClick={() => setManualOffset(o => o + 25)}
                          disabled={manualOffset + 25 >= manualTotal}
                          className="btn-secondary text-xs disabled:opacity-40"
                        >
                          {t('common.next')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Exclude customers */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowExcludePicker(!showExcludePicker)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                  ${showExcludePicker
                    ? 'border-red-300 bg-red-50 dark:bg-red-900/10'
                    : 'border-dashed border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/10'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚫</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-surface-900 dark:text-white">
                      {t('campaigns.excludeCustomers')}
                    </p>
                    <p className="text-xs text-surface-500">
                      {value.excludedCustomerIds.length > 0
                        ? t('campaigns.excludeCount', { count: value.excludedCustomerIds.length })
                        : t('campaigns.excludeDesc')
                      }
                    </p>
                  </div>
                  <span className="text-lg">{showExcludePicker ? '▲' : '▼'}</span>
                </div>
              </button>

              {showExcludePicker && (
                <div className="mt-3 border border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
                  <div className="p-3 bg-red-50/50 dark:bg-red-900/10 border-b border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {t('campaigns.excludeHelp')}
                    </p>
                  </div>
                  {/* Same table structure as manual picker but for exclusions */}
                  <div className="max-h-[300px] overflow-y-auto">
                    {manualLoading && manualCustomers.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="spinner w-5 h-5 mx-auto mb-2" />
                        <p className="text-sm text-surface-500">{t('common.loading')}</p>
                      </div>
                    ) : manualCustomers.length === 0 ? (
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
                                checked={manualCustomers.length > 0 && manualCustomers.every(c => value.excludedCustomerIds.includes(c.id))}
                                onChange={() => {
                                  const allIds = manualCustomers.map(c => c.id);
                                  const allExcluded = allIds.every(id => value.excludedCustomerIds.includes(id));
                                  const newIds = allExcluded
                                    ? value.excludedCustomerIds.filter(id => !allIds.includes(id))
                                    : [...new Set([...value.excludedCustomerIds, ...allIds])];
                                  onChange({ ...value, excludedCustomerIds: newIds });
                                }}
                                className="rounded"
                              />
                            </th>
                            <th className="text-left px-3 py-2 font-semibold text-surface-700 dark:text-surface-300">{t('campaigns.customer')}</th>
                            <th className="text-left px-3 py-2 font-semibold text-surface-700 dark:text-surface-300">{t('campaigns.contact')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                          {manualCustomers.map(customer => (
                            <tr key={customer.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={value.excludedCustomerIds.includes(customer.id)}
                                  onChange={() => toggleCustomerSelection(customer.id)}
                                  className="rounded"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <p className="font-medium text-surface-900 dark:text-white">{customer.first_name} {customer.last_name}</p>
                              </td>
                              <td className="px-3 py-2">
                                <p className="text-surface-500 text-xs">{customer.email}</p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Funnel summary */}
            <div className="p-5 bg-surface-50 dark:bg-surface-800 rounded-xl">
              <h4 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">
                📊 {t('campaigns.audienceSummary')}
              </h4>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="px-3 py-1.5 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-medium">
                  {value.programId === 'all'
                    ? t('campaigns.allPrograms')
                    : programs.find(p => p.id === value.programId)?.name || value.programId}
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
                  {value.mode === 'custom' && value.customerIds.length > 0
                    ? t('campaigns.customSelection', { count: value.customerIds.length })
                    : value.label}
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
                  👥 {Math.max(0, (value.mode === 'custom' ? value.customerIds.length : value.customerCount) - value.excludedCustomerIds.length).toLocaleString()}{' '}
                  {t('campaigns.clientsWillReceive')}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
