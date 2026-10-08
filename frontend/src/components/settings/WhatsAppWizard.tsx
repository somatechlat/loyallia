'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { whatsappApi, type WhatsAppSession } from '@/lib/api';
import { Smartphone, Mail, AlertTriangle, Link2, Users } from '@/components/ui/LucideIcons';
import { useI18n } from '@/lib/i18n';
import WhatsAppLinkModal from './WhatsAppLinkModal';

/**
 * Props for the WhatsAppWizard component.
 */
interface WhatsAppWizardProps {
  /** Enabled plan features */
  planFeatures: string[];
  /** Current plan name */
  planName: string;
  /** Plan usage limits */
  planLimits: Record<string, number>;
}

/**
 * @description Multi-account WhatsApp Bridge manager.
 * Lists linked sessions with per-account status (warmup, daily pool usage),
 * disconnects individual accounts, and links new ones via consent-first QR flow.
 * LYL-SRS-007: WhatsApp Business Bridge Wizard.
 */
export default function WhatsAppWizard({ planFeatures, planName, planLimits }: WhatsAppWizardProps) {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<WhatsAppSession | null>(null);
  const [disconnectMode, setDisconnectMode] = useState<'disconnect' | 'unlink'>('disconnect');
  const [disconnecting, setDisconnecting] = useState(false);
  const { t } = useI18n();

  const maxAccounts = planLimits.whatsapp_accounts ?? 0;
  const canAddAccount = maxAccounts <= 0 || sessions.length < maxAccounts;

  const loadSessions = useCallback(async () => {
    try {
      const { data } = await whatsappApi.listSessions();
      setSessions((data.sessions || []).filter((s) => s.is_active !== false));
    } catch { /* bridge not available — leave list empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    setDisconnecting(true);
    try {
      if (disconnectMode === 'unlink') {
        await whatsappApi.unlinkSession(disconnectTarget.id);
        toast.success(t('settings.integrations.whatsapp.unlinkedToast'));
      } else {
        await whatsappApi.disconnectSession(disconnectTarget.id);
        toast.success(t('settings.integrations.whatsapp.disconnectedToast'));
      }
      setDisconnectTarget(null);
      loadSessions();
    } catch {
      toast.error(t('settings.integrations.whatsapp.disconnectError'));
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="card p-6 space-y-4" id="wa-integration-section">
      <h2 className="text-base font-semibold text-surface-900 dark:text-white">{t('settings.integrations.title')}</h2>

      {/* Plan info banner */}
      {planName && (
        <div className="flex items-center gap-2 text-xs bg-surface-50 dark:bg-surface-800/50 rounded-lg px-3 py-2 border border-surface-200 dark:border-surface-700">
          <span className="font-semibold text-surface-500">{t('settings.integrations.planLabel')}</span>
          <span className="font-bold text-brand-600">{planName}</span>
          {(planLimits.whatsapp_accounts ?? 0) > 0 && (
            <span className="text-green-600 flex items-center gap-1">
              · <Users className="w-3 h-3" /> {t('settings.integrations.whatsapp.accountsPlanBadge', { count: planLimits.whatsapp_accounts ?? 0 })}
            </span>
          )}
          {(planLimits.whatsapp_day ?? 0) > 0 && (
            <span className="text-green-600 flex items-center gap-1">
              · <Smartphone className="w-3 h-3" /> {t('settings.integrations.whatsapp.poolPlanBadge', { count: planLimits.whatsapp_day ?? 0 })}
            </span>
          )}
          {(planLimits.emails_month ?? 0) > 0 && (
            <span className="text-blue-600 flex items-center gap-1">
              · <Mail className="w-3 h-3" /> {planLimits.emails_month?.toLocaleString()} {t('billing.emailsPerMonth')}
            </span>
          )}
        </div>
      )}

      {/* WhatsApp: Plan-gated (LYL-SRS-008) */}
      {!planFeatures.includes('whatsapp_campaigns') ? (
        <div className="flex items-center justify-between p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/30 opacity-70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-200 flex items-center justify-center">
              <svg className="w-5 h-5 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
            </div>
            <div>
              <p className="font-semibold text-sm text-surface-500">{t('settings.integrations.whatsappBridgeName')}</p>
              <p className="text-xs text-surface-400">{t('settings.integrations.whatsappUpgradeHint')}</p>
            </div>
          </div>
          {process.env.NEXT_PUBLIC_UPGRADE_URL && (
            <a href={process.env.NEXT_PUBLIC_UPGRADE_URL} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-surface-400 bg-surface-200 dark:bg-surface-700 px-3 py-1 rounded-full hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors">{t('settings.integrations.upgradePlanButton')}</a>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div>
                <p className="font-semibold text-sm text-surface-900 dark:text-white">{t('settings.integrations.whatsappBridgeName')}</p>
                <p className="text-xs text-surface-500">{t('settings.integrations.whatsappDescription')}</p>
              </div>
            </div>
            <button
              type="button"
              id="wa-toggle"
              onClick={() => setShowLinkModal(true)}
              disabled={!canAddAccount}
              className="btn-primary text-xs px-3 py-1.5"
              aria-label={t('settings.integrations.whatsapp.linkAccountButton')}
            >
              <Link2 className="w-3.5 h-3.5 inline mr-1" />
              {t('settings.integrations.whatsapp.linkAccountButton')}
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-3 p-8">
              <span className="spinner w-5 h-5" />
              <span className="text-sm text-surface-500">{t('settings.integrations.checkingService')}</span>
            </div>
          )}

          {!loading && sessions.length === 0 && (
            <div className="p-6 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 text-center space-y-2">
              <p className="text-sm font-medium text-surface-600 dark:text-surface-300">
                {t('settings.integrations.whatsapp.noAccountsTitle')}
              </p>
              <p className="text-xs text-surface-500">
                {t('settings.integrations.whatsapp.noAccountsHint')}
              </p>
            </div>
          )}

          {!loading && !canAddAccount && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {t('settings.integrations.whatsapp.accountLimitReached', { count: maxAccounts })}
              </p>
            </div>
          )}

          {/* Connected accounts list */}
          {sessions.length > 0 && (
            <div className="space-y-3" id="wa-connected-dashboard">
              {sessions.map((session) => {
                const usedPct = session.daily_limit > 0
                  ? Math.min(100, (session.messages_sent_today / session.daily_limit) * 100)
                  : 0;
                return (
                  <div key={session.id} className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 space-y-3" data-session-id={session.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${session.is_connected ? 'bg-green-500 animate-pulse' : 'bg-surface-400'}`} />
                        <span className="font-semibold text-sm text-green-700 dark:text-green-400 truncate">
                          {session.is_connected
                            ? t('settings.integrations.whatsappConnectedLabel')
                            : t('settings.integrations.whatsapp.disconnectedLabel')}
                        </span>
                        {session.label && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 truncate">
                            {session.label}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {session.is_connected ? (
                          <>
                            <button
                              type="button"
                              onClick={() => { setDisconnectMode('disconnect'); setDisconnectTarget(session); }}
                              className="text-xs px-3 py-1 rounded-lg border border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                              id={`wa-disconnect-btn-${session.id}`}
                            >
                              {t('settings.integrations.disconnectButton')}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setDisconnectMode('unlink'); setDisconnectTarget(session); }}
                              className="text-xs px-3 py-1 rounded-lg border border-red-300 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              id={`wa-unlink-btn-${session.id}`}
                            >
                              {t('settings.integrations.whatsapp.unlinkButton')}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setDisconnectMode('unlink'); setDisconnectTarget(session); }}
                            className="text-xs px-3 py-1 rounded-lg border border-red-300 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            id={`wa-unlink-btn-${session.id}`}
                          >
                            {t('settings.integrations.whatsapp.unlinkButton')}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-lg font-mono font-semibold text-surface-900 dark:text-white">
                      <Smartphone className="w-4 h-4 inline mr-1" />
                      {session.phone_number || t('settings.integrations.phoneUnavailable')}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="text-surface-500" title={t('settings.integrations.whatsapp.warmupHintFull')}>
                        {t('settings.integrations.whatsapp.warmupDay', { day: session.warmup_day })}
                        <span className="ml-1 opacity-60">ⓘ</span>
                      </span>
                      {session.linked_by && (
                        <span className="text-surface-500">
                          {t('settings.integrations.whatsapp.linkedBy', { name: session.linked_by })}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-surface-500">{t('settings.integrations.messagesToday')}</span>
                          <span className="font-medium text-surface-700 dark:text-surface-300">
                            {session.messages_sent_today} / {session.daily_limit}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500" style={{ width: `${usedPct}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-surface-500">{t('settings.integrations.remainingToday')}</span>
                        <span className="font-semibold text-green-600">{session.messages_remaining_today}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {sessions.length > 0 && (
            <div className="p-3 rounded-lg bg-surface-100 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700">
              <p className="text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">{t('settings.integrations.sendLimitsTitle')}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-surface-500">
                <span>{t('settings.integrations.whatsapp.perMinuteLimit')}</span>
                <span className="text-surface-300 dark:text-surface-600">·</span>
                <span>{t('settings.integrations.whatsapp.poolLimitHint', { count: planLimits.whatsapp_day ?? 0 })}</span>
                <span className="text-surface-300 dark:text-surface-600">·</span>
                <span>{t('settings.integrations.whatsapp.warmupHint')}</span>
              </div>
            </div>
          )}
        </>
      )}

      <WhatsAppLinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onConnected={loadSessions}
      />

      {/* Disconnect Confirmation Dialog */}
      {disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" id="wa-disconnect-dialog">
          <div className="card p-6 max-w-sm w-full mx-4 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-surface-900 dark:text-white">
                {disconnectMode === 'unlink'
                  ? t('settings.integrations.whatsapp.unlinkModalTitle')
                  : t('settings.integrations.disconnectModalTitle')}
              </h3>
            </div>
            <p className="text-sm text-surface-600 dark:text-surface-400">
              {disconnectMode === 'unlink'
                ? t('settings.integrations.whatsapp.unlinkModalBody')
                : t('settings.integrations.disconnectModalBody')}
            </p>
            {disconnectTarget.phone_number && (
              <p className="text-sm font-mono font-semibold text-surface-900 dark:text-white">
                {disconnectTarget.phone_number}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setDisconnectTarget(null)} className="btn-ghost text-sm flex-1" id="wa-disconnect-cancel-btn">
                {t('common.cancel')}
              </button>
              <button type="button" onClick={handleDisconnect} disabled={disconnecting} className="flex-1 text-sm px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50" id="wa-disconnect-confirm-btn">
                {disconnecting
                  ? <span className="spinner w-4 h-4" />
                  : disconnectMode === 'unlink'
                    ? t('settings.integrations.whatsapp.confirmUnlinkButton')
                    : t('settings.integrations.confirmDisconnectButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
