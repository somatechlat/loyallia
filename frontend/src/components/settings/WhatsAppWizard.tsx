'use client';
import { useState, useEffect, useCallback } from 'react';
import { whatsappApi } from '@/lib/api';
import { Smartphone, Mail } from '@/components/ui/LucideIcons';
import toast from 'react-hot-toast';
import { useI18n } from '@/lib/i18n';

/**
 * WhatsApp connection status.
 */
interface WaStatus {
  connected: boolean;
  qr: string | null;
  phone: string;
  messages_sent_today: number;
  daily_limit: number;
  messages_remaining: number;
}

/**
 * Props for the WhatsAppWizard component.
 */
interface WhatsAppWizardProps {
  /** Current tenant ID */
  tenantId: string | undefined;
  /** Enabled plan features */
  planFeatures: string[];
  /** Current plan name */
  planName: string;
  /** Plan usage limits */
  planLimits: Record<string, number>;
}

/**
 * @description WhatsApp Business Bridge Wizard for connecting a device via QR.
 * LYL-SRS-007: WhatsApp Business Bridge Wizard
 * Extracted from settings/page.tsx per LYL-NFR-ARCH-040 (Rule 245).
 */
export default function WhatsAppWizard({ tenantId, planFeatures, planName, planLimits }: WhatsAppWizardProps) {
  const [waEnabled, setWaEnabled] = useState(false);
  const [waStep, setWaStep] = useState<'disabled' | 'checking' | 'qr' | 'connected'>('disabled');
  const [waStatus, setWaStatus] = useState<WaStatus | null>(null);
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [waDisconnecting, setWaDisconnecting] = useState(false);
  const [waShowDisconnectConfirm, setWaShowDisconnectConfirm] = useState(false);
  const { t } = useI18n();

  // Check initial status on mount
  const checkInitialStatus = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data } = await whatsappApi.status(tenantId);
      if (data.connected) {
        setWaEnabled(true);
        setWaStep('connected');
        setWaStatus(data);
      }
    } catch { /* bridge not available — leave disabled */ }
  }, [tenantId]);

  useEffect(() => { checkInitialStatus(); }, [checkInitialStatus]);

  // Poll for connection while showing QR
  useEffect(() => {
    if (waStep !== 'qr' || !tenantId) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await whatsappApi.status(tenantId);
        setWaStatus(data);
        if (data.connected) {
          setWaStep('connected');
          toast.success(t('settings.integrations.whatsapp.connectedToast'));
        }
      } catch { /* ignore polling errors */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [waStep, tenantId]);

  const handleToggle = async () => {
    if (!tenantId) return;
    if (waEnabled) {
      setWaShowDisconnectConfirm(true);
      return;
    }
    setWaEnabled(true);
    setWaStep('checking');
    setWaError(null);
    setWaLoading(true);
    try {
      const { data } = await whatsappApi.status(tenantId);
      if (data.connected) {
        setWaStatus(data);
        setWaStep('connected');
      } else {
        const { data: qrData } = await whatsappApi.qr(tenantId);
        setWaQr(qrData.qr || null);
        setWaStep('qr');
      }
    } catch {
      setWaError(t('settings.integrations.whatsapp.serviceUnavailableError'));
      setWaStep('disabled');
      setWaEnabled(false);
    } finally { setWaLoading(false); }
  };

  const handleRefreshQr = async () => {
    if (!tenantId) return;
    setWaLoading(true);
    try {
      const { data } = await whatsappApi.qr(tenantId);
      setWaQr(data.qr || null);
      if (data.connected) {
        setWaStep('connected');
        const { data: st } = await whatsappApi.status(tenantId);
        setWaStatus(st);
        toast.success(t('settings.integrations.whatsapp.connectedToast'));
      }
    } catch {
      toast.error(t('settings.integrations.whatsapp.qrRegenerateError'));
    } finally { setWaLoading(false); }
  };

  const handleDisconnect = async () => {
    if (!tenantId) return;
    setWaDisconnecting(true);
    try {
      await whatsappApi.disconnect(tenantId);
      setWaEnabled(false);
      setWaStep('disabled');
      setWaStatus(null);
      setWaQr(null);
      setWaShowDisconnectConfirm(false);
      toast.success(t('settings.integrations.whatsapp.disconnectedToast'));
    } catch {
      toast.error(t('settings.integrations.whatsapp.disconnectError'));
    } finally { setWaDisconnecting(false); }
  };

  return (
    <div className="card p-6 space-y-4" id="wa-integration-section">
      <h2 className="text-base font-semibold text-surface-900 dark:text-white">{t('settings.integrations.title')}</h2>

      {/* Plan info banner */}
      {planName && (
        <div className="flex items-center gap-2 text-xs bg-surface-50 dark:bg-surface-800/50 rounded-lg px-3 py-2 border border-surface-200 dark:border-surface-700">
          <span className="font-semibold text-surface-500">{t('settings.integrations.planLabel')}</span>
          <span className="font-bold text-brand-600">{planName}</span>
          {(planLimits.whatsapp_day ?? 0) > 0 && <span className="text-green-600 flex items-center gap-1">· <Smartphone className="w-3 h-3" /> {planLimits.whatsapp_day} WA/día</span>}
          {(planLimits.emails_month ?? 0) > 0 && <span className="text-blue-600 flex items-center gap-1">· <Mail className="w-3 h-3" /> {planLimits.emails_month?.toLocaleString()} emails/mes</span>}
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
        <div className="flex items-center gap-3">
          {waStep === 'connected' && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {t('settings.integrations.statusConnected')}
            </span>
          )}
          {waStep === 'qr' && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {t('settings.integrations.statusWaiting')}
            </span>
          )}
          <button
            type="button"
            id="wa-toggle"
            onClick={handleToggle}
            disabled={waLoading}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${waEnabled ? 'bg-green-500' : 'bg-surface-300 dark:bg-surface-600'}`}
            role="switch"
            aria-checked={waEnabled}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${waEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {waError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          <p className="text-xs text-red-600 dark:text-red-400">{waError}</p>
        </div>
      )}

      {/* Checking state */}
      {waStep === 'checking' && (
        <div className="flex items-center justify-center gap-3 p-8">
          <span className="spinner w-5 h-5" />
          <span className="text-sm text-surface-500">{t('settings.integrations.checkingService')}</span>
        </div>
      )}

      {/* QR Scan Wizard */}
      {waStep === 'qr' && (
        <div className="space-y-4" id="wa-wizard-content">
          <div className="p-5 rounded-xl border border-brand-500/20 bg-brand-500/5">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                {waQr ? (
                  <div className="p-3 bg-white rounded-2xl shadow-lg">
                    <img
                      src={waQr.startsWith('data:') ? waQr : `data:image/png;base64,${waQr}`}
                      alt={t('settings.integrations.qrAltText')}
                      className="w-48 h-48 object-contain"
                      id="wa-qr-image"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-surface-300 flex items-center justify-center">
                    <span className="spinner w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <h3 className="font-semibold text-surface-900 dark:text-white text-sm">{t('settings.integrations.qrWizardTitle')}</h3>
                <ol className="space-y-2 text-xs text-surface-600 dark:text-surface-400">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center text-[10px] font-bold">1</span>
                    {t('settings.integrations.qrStep1')}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center text-[10px] font-bold">2</span>
                    {t('settings.integrations.qrStep2')}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center text-[10px] font-bold">3</span>
                    {t('settings.integrations.qrStep3')}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center text-[10px] font-bold">4</span>
                    {t('settings.integrations.qrStep4')}
                  </li>
                </ol>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-surface-500">{t('settings.integrations.waitingForScan')}</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleRefreshQr} disabled={waLoading} className="btn-secondary text-xs px-3 py-1.5" id="wa-refresh-qr-btn">
                  {waLoading ? <span className="spinner w-3 h-3" /> : <>🔄 {t('settings.integrations.regenerateQrButton')}</>}
                </button>
                <button type="button" onClick={() => { setWaStep('disabled'); setWaEnabled(false); setWaQr(null); setWaError(null); }} className="btn-ghost text-xs px-3 py-1.5" id="wa-cancel-btn">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
            <p className="text-xs text-amber-700 dark:text-amber-400">{t('settings.integrations.qrSessionWarning')}</p>
          </div>
        </div>
      )}

      {/* Connected Dashboard */}
      {waStep === 'connected' && waStatus && (
        <div className="space-y-3" id="wa-connected-dashboard">
          <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="font-semibold text-sm text-green-700 dark:text-green-400">{t('settings.integrations.whatsappConnectedLabel')}</span>
              </div>
              <button type="button" onClick={() => setWaShowDisconnectConfirm(true)} className="text-xs px-3 py-1 rounded-lg border border-red-300 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" id="wa-disconnect-btn">
                {t('settings.integrations.disconnectButton')}
              </button>
            </div>
            <p className="text-lg font-mono font-semibold text-surface-900 dark:text-white mb-3">
              <Smartphone className="w-4 h-4 inline mr-1" />{waStatus.phone || t('settings.integrations.phoneUnavailable')}
            </p>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-surface-500">{t('settings.integrations.messagesToday')}</span>
                  <span className="font-medium text-surface-700 dark:text-surface-300">{waStatus.messages_sent_today} / {waStatus.daily_limit}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500" style={{ width: `${Math.min(100, (waStatus.messages_sent_today / waStatus.daily_limit) * 100)}%` }} />
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-surface-500">{t('settings.integrations.remainingToday')}</span>
                <span className="font-semibold text-green-600">{waStatus.messages_remaining}</span>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-surface-100 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700">
            <p className="text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">{t('settings.integrations.sendLimitsTitle')}</p>
            <div className="flex gap-4 text-xs text-surface-500">
              <span>~8 mensajes/minuto</span>
              <span>•</span>
              <span>{waStatus.daily_limit} mensajes/día máx</span>
            </div>
          </div>
        </div>
      )}
      {/* end plan-gate ternary */}
      </>
      )}

      {/* Disconnect Confirmation Dialog */}
      {waShowDisconnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" id="wa-disconnect-dialog">
          <div className="card p-6 max-w-sm w-full mx-4 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              </div>
              <h3 className="font-semibold text-surface-900 dark:text-white">{t('settings.integrations.disconnectModalTitle')}</h3>
            </div>
            <p className="text-sm text-surface-600 dark:text-surface-400">
              {t('settings.integrations.disconnectModalBody')}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setWaShowDisconnectConfirm(false)} className="btn-ghost text-sm flex-1" id="wa-disconnect-cancel-btn">
                {t('common.cancel')}
              </button>
              <button type="button" onClick={handleDisconnect} disabled={waDisconnecting} className="flex-1 text-sm px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50" id="wa-disconnect-confirm-btn">
                {waDisconnecting ? <span className="spinner w-4 h-4" /> : t('settings.integrations.confirmDisconnectButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
