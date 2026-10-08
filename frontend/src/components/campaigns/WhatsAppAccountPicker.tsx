'use client';

import { useCallback, useEffect, useState } from 'react';
import { whatsappApi, type WhatsAppSession } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Smartphone, Link2, Users, AlertTriangle } from '@/components/ui/LucideIcons';
import WhatsAppLinkModal from '@/components/settings/WhatsAppLinkModal';

/**
 * Props for the WhatsAppAccountPicker component.
 */
interface WhatsAppAccountPickerProps {
  /** Selected session id (null when fanout is used). */
  value: string | null;
  /** Whether to fan out across all connected accounts. */
  fanout: boolean;
  /** Change handler. */
  onChange: (sessionId: string | null, fanout: boolean) => void;
  /** Field-level validation error key. */
  error?: string | undefined;
}

/**
 * @description Lets the user choose which connected WhatsApp account sends a
 * campaign, or fan out across all connected accounts. When no account is
 * connected, a CTA opens the consent + QR linking flow.
 */
export default function WhatsAppAccountPicker({ value, fanout, onChange, error }: WhatsAppAccountPickerProps) {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const { data } = await whatsappApi.listSessions();
      setSessions((data.sessions || []).filter((s) => s.is_active !== false && s.is_connected));
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const connectedCount = sessions.length;
  const noneConnected = !loading && connectedCount === 0;

  return (
    <div className="space-y-3" id="wa-account-picker">
      <div className="flex items-center gap-2">
        <Smartphone className="w-4 h-4 text-green-600" />
        <p className="text-xs font-semibold text-surface-700 dark:text-surface-300">
          {t('campaigns.whatsappAccount.pickerTitle')}
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 p-3">
          <span className="spinner w-4 h-4" />
          <span className="text-xs text-surface-500">{t('campaigns.whatsappAccount.loading')}</span>
        </div>
      )}

      {noneConnected && (
        <div className="p-4 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-surface-600 dark:text-surface-400">
              {t('campaigns.whatsappAccount.noneConnected')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLinkModal(true)}
            className="btn-primary text-xs px-3 py-1.5 w-full sm:w-auto"
            id="wa-picker-link-cta"
          >
            <Link2 className="w-3.5 h-3.5 inline mr-1" />
            {t('campaigns.whatsappAccount.linkCta')}
          </button>
        </div>
      )}

      {!loading && connectedCount > 0 && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 cursor-pointer">
            <input
              type="checkbox"
              checked={fanout}
              onChange={(e) => onChange(e.target.checked ? null : (value ?? sessions[0]?.id ?? null), e.target.checked)}
              className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-400"
              id="wa-fanout-checkbox"
            />
            <Users className="w-4 h-4 text-brand-600" />
            <span className="text-sm text-surface-700 dark:text-surface-200 font-medium">
              {t('campaigns.whatsappAccount.useAllAccounts')}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300">
              {t('campaigns.whatsappAccount.accountCount', { count: connectedCount })}
            </span>
          </label>

          {!fanout && (
            <div className="space-y-2 pl-1">
              {sessions.map((session) => {
                const selected = value === session.id;
                return (
                  <label
                    key={session.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      selected
                        ? 'border-brand-500 bg-brand-500/5'
                        : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="wa-session"
                      checked={selected}
                      onChange={() => onChange(session.id, false)}
                      className="w-4 h-4 border-surface-300 text-brand-600 focus:ring-brand-400"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-semibold text-surface-900 dark:text-white truncate">
                        {session.phone_number || t('settings.integrations.phoneUnavailable')}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-surface-500">
                        {session.label && <span className="truncate">{session.label}</span>}
                        <span>
                          {t('campaigns.whatsappAccount.remainingToday', { count: session.messages_remaining_today })}
                        </span>
                        <span>
                          {t('settings.integrations.whatsapp.warmupDay', { day: session.warmup_day })}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-surface-500">
            {fanout
              ? t('campaigns.whatsappAccount.fanoutHint')
              : t('campaigns.whatsappAccount.singleHint')}
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      <WhatsAppLinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onConnected={loadSessions}
      />
    </div>
  );
}
