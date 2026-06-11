/**
 * Inline notification configuration for expanded field cards.
 * Structured notifications per SRS-010 §4.1.
 */

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import type { FieldNotifications } from '@/components/wallet/types/unified-state';

export interface NotificationConfigInlineProps {
  notifications: FieldNotifications;
  onUpdate: (notifications: FieldNotifications) => void;
}

export function NotificationConfigInline({ notifications, onUpdate }: NotificationConfigInlineProps) {
  const { t } = useI18n();

  const apple = notifications.appleChangeMessage;
  const google = notifications.googleMessage;

  const handleToggleApple = (enabled: boolean) => {
    onUpdate({
      ...notifications,
      appleChangeMessage: enabled
        ? { message: apple?.message ?? 'Tu saldo es ahora %@ puntos', enabled: true }
        : undefined,
    });
  };

  const handleAppleMessageChange = (message: string) => {
    onUpdate({
      ...notifications,
      appleChangeMessage: { enabled: true, message },
    });
  };

  const handleToggleGoogle = (enabled: boolean) => {
    onUpdate({
      ...notifications,
      googleMessage: enabled
        ? {
            enabled: true,
            header: google?.header ?? 'Actualización',
            body: google?.body ?? 'Tu tarjeta ha sido actualizada',
            trigger: google?.trigger ?? 'onChange',
          }
        : undefined,
    });
  };

  const handleGoogleChange = (partial: Partial<NonNullable<typeof google>>) => {
    onUpdate({
      ...notifications,
      googleMessage: { ...(google || { enabled: true, header: '', body: '', trigger: 'onChange' }), ...partial },
    });
  };

  return (
    <div className="space-y-3">
      {/* Apple Change Message */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(apple?.enabled)}
              onChange={(e) => handleToggleApple(e.target.checked)}
              className="w-3 h-3 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-neutral-700 dark:text-neutral-300">{t('wallet.studio.notifications.appleChangeMessage')}</span>
          </label>
        </div>
        {apple?.enabled && (
          <div className="pl-5 space-y-2">
            <input
              type="text"
              value={apple.message}
              onChange={(e) => handleAppleMessageChange(e.target.value)}
              className="w-full px-2 py-1 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('wallet.studio.notifications.applePlaceholder')}
              maxLength={120}
            />
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                {t('wallet.studio.notifications.appleHint')}
              </p>
              <span className={`text-[10px] font-medium ${(apple.message?.length ?? 0) > 100 ? 'text-amber-500' : 'text-neutral-400 dark:text-neutral-500'}`}>
                {t('wallet.studio.notifications.appleCharCount', { count: apple.message?.length ?? 0 })}
              </span>
            </div>
            {/* Lock-screen preview */}
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-2">
              <p className="text-[9px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                {t('wallet.studio.notifications.lockScreenPreview')}
              </p>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-neutral-800 dark:text-neutral-200">{t('programs.programName') || 'Programa'}</p>
                  <p className="text-[10px] text-neutral-600 dark:text-neutral-300 truncate">
                    {apple.message.replace('%@', '1,250')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Google Message */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(google?.enabled)}
              onChange={(e) => handleToggleGoogle(e.target.checked)}
              className="w-3 h-3 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-neutral-700 dark:text-neutral-300">{t('wallet.studio.notifications.googleMessage')}</span>
          </label>
        </div>
        {google?.enabled && (
          <div className="pl-5 space-y-2">
            <input
              type="text"
              value={google.header}
              onChange={(e) => handleGoogleChange({ header: e.target.value })}
              className="w-full px-2 py-1 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Encabezado"
            />
            <textarea
              value={google.body}
              onChange={(e) => handleGoogleChange({ body: e.target.value })}
              className="w-full px-2 py-1 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              placeholder="Cuerpo del mensaje"
            />
            <select
              value={google.trigger}
              onChange={(e) => handleGoogleChange({ trigger: e.target.value as 'onChange' | 'scheduled' | 'beforeExpiry' })}
              className="w-full px-2 py-1 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="onChange">{t('wallet.studio.notifications.trigger.onChange')}</option>
              <option value="scheduled">{t('wallet.studio.notifications.trigger.scheduled')}</option>
              <option value="beforeExpiry">{t('wallet.studio.notifications.trigger.beforeExpiry')}</option>
            </select>
            {google.trigger === 'beforeExpiry' && (
              <input
                type="number"
                min={1}
                max={30}
                value={google.daysBeforeExpiry ?? 3}
                onChange={(e) => handleGoogleChange({ daysBeforeExpiry: parseInt(e.target.value, 10) })}
                className="w-full px-2 py-1 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Días antes de expirar"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
