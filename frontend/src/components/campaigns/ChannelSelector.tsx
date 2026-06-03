'use client';

import { useI18n } from '@/lib/i18n';
import type { CampaignChannel, WalletPlatform } from './CampaignWizard';
import type { ProgramOption } from './CampaignWizard';

interface ChannelSelectorProps {
  value: CampaignChannel;
  onChange: (channel: CampaignChannel) => void;
  planFeatures: string[];
  planLimits: Record<string, number>;
  planUsage: Record<string, number>;
  programs: ProgramOption[];
  onQuickPreset: (programId: string, segmentId: string, walletPlatform: WalletPlatform) => void;
  onCustomSelected: () => void;
}

interface ChannelConfig {
  key: CampaignChannel;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

export default function ChannelSelector({
  value,
  onChange,
  planFeatures,
  planLimits,
  planUsage,
  programs,
  onQuickPreset,
  onCustomSelected,
}: ChannelSelectorProps) {
  const { t } = useI18n();

  const hasEmail = planFeatures.includes('email_campaigns');
  const hasWhatsApp = planFeatures.includes('whatsapp_campaigns');
  const hasWallet = planFeatures.includes('wallet_campaigns');
  const hasSMS = planFeatures.includes('sms_campaigns');

  const channels: ChannelConfig[] = [
    {
      key: 'wallet',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-500',
    },
    {
      key: 'email',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-500',
    },
    {
      key: 'whatsapp',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.29-1.24l-.31-.18-2.87.85.85-2.87-.2-.31A8 8 0 1112 20z"/>
        </svg>
      ),
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-500',
    },
    {
      key: 'sms',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337L5.25 21l1.07-2.846A8.726 8.726 0 013 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      ),
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-500',
    },
  ];

  const channelAccess: Record<CampaignChannel, boolean> = {
    wallet: hasWallet,
    email: hasEmail,
    whatsapp: hasWhatsApp,
    sms: hasSMS,
  };

  const channelLimits: Record<CampaignChannel, { used: number; limit: number; label: string }> = {
    wallet: { used: 0, limit: Infinity, label: t('campaigns.unlimited') },
    email: {
      used: planUsage.emails_this_month || 0,
      limit: planLimits.emails_month || 0,
      label: `${planUsage.emails_this_month || 0} / ${planLimits.emails_month || 0} ${t('campaigns.perMonth')}`,
    },
    whatsapp: {
      used: planUsage.whatsapp_today || 0,
      limit: planLimits.whatsapp_day || 0,
      label: `${planUsage.whatsapp_today || 0} / ${planLimits.whatsapp_day || 0} ${t('campaigns.perDay')}`,
    },
    sms: {
      used: planUsage.sms_today || 0,
      limit: planLimits.sms_day || 0,
      label: `${planUsage.sms_today || 0} / ${planLimits.sms_day || 0} ${t('campaigns.perDay')}`,
    },
  };

  // Get most recently used program or first available
  const lastProgram = programs.length > 0 ? programs[0] : null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Section 1: Channel Selection */}
      <section>
        <h3 className="text-base font-semibold text-surface-900 dark:text-white mb-4">
          1️⃣ {t('campaigns.selectChannel')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {channels.map(ch => {
            const isAvailable = channelAccess[ch.key];
            const isSelected = value === ch.key;
            return (
              <button
                key={ch.key}
                type="button"
                disabled={!isAvailable}
                onClick={() => isAvailable && onChange(ch.key)}
                className={`relative text-left p-5 rounded-xl border-2 transition-all duration-200
                  ${!isAvailable
                    ? 'border-surface-200 dark:border-surface-700 opacity-50 cursor-not-allowed bg-surface-50 dark:bg-surface-900'
                    : isSelected
                      ? `${ch.borderColor} ${ch.bgColor} shadow-md`
                      : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-surface-300 dark:hover:border-surface-600'
                  }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={ch.color}>{ch.icon}</span>
                  <span className="font-semibold text-sm text-surface-900 dark:text-white">
                    {t(`campaigns.channel${ch.key.charAt(0).toUpperCase() + ch.key.slice(1)}`)}
                  </span>
                  {!isAvailable && (
                    <span className="ml-auto text-lg">🔒</span>
                  )}
                  {isSelected && isAvailable && (
                    <span className="ml-auto">
                      <svg className="w-5 h-5 text-brand-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </span>
                  )}
                </div>
                <p className="text-xs text-surface-500">
                  {isAvailable ? channelLimits[ch.key].label : t('campaigns.upgradePlan')}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 2: Quick Presets */}
      {lastProgram && (
        <section>
          <h3 className="text-base font-semibold text-surface-900 dark:text-white mb-4">
            ⚡ {t('campaigns.quickPresets')}
          </h3>
          <p className="text-sm text-surface-500 mb-4">
            {t('campaigns.quickPresetsDesc', { program: lastProgram.name })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Preset: All customers from last program */}
            <button
              type="button"
              onClick={() => onQuickPreset(lastProgram.id, 'all', 'both')}
              className="text-left p-4 rounded-xl border-2 border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-brand-300 dark:hover:border-brand-700 transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">👥</span>
                <span className="font-semibold text-sm text-surface-900 dark:text-white">{t('campaigns.presetAll')}</span>
              </div>
              <p className="text-xs text-surface-500">{lastProgram.name}</p>
              <p className="text-xs font-bold text-brand-600 dark:text-brand-400 mt-1">
                {lastProgram.member_count?.toLocaleString() || '?'} {t('campaigns.clients')}
              </p>
            </button>

            {/* Preset: VIP from last program */}
            <button
              type="button"
              onClick={() => onQuickPreset(lastProgram.id, 'vip', 'both')}
              className="text-left p-4 rounded-xl border-2 border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🏆</span>
                <span className="font-semibold text-sm text-surface-900 dark:text-white">{t('campaigns.presetVip')}</span>
              </div>
              <p className="text-xs text-surface-500">{lastProgram.name}</p>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
                {t('campaigns.vipClients')}
              </p>
            </button>

            {/* Preset: Active from last program */}
            <button
              type="button"
              onClick={() => onQuickPreset(lastProgram.id, 'active', 'both')}
              className="text-left p-4 rounded-xl border-2 border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">⚡</span>
                <span className="font-semibold text-sm text-surface-900 dark:text-white">{t('campaigns.presetActive')}</span>
              </div>
              <p className="text-xs text-surface-500">{lastProgram.name}</p>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {t('campaigns.activeClients')}
              </p>
            </button>

            {/* Custom selection */}
            <button
              type="button"
              onClick={onCustomSelected}
              className="text-left p-4 rounded-xl border-2 border-dashed border-brand-300 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-900/10 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">✏️</span>
                <span className="font-semibold text-sm text-surface-900 dark:text-white">{t('campaigns.presetCustom')}</span>
              </div>
              <p className="text-xs text-surface-500">{t('campaigns.presetCustomDesc')}</p>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
