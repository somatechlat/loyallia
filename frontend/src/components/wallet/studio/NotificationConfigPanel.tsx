/**
 * WYSIWYG per-field notification designer.
 *
 * Two platform columns make the Apple / Google capability gap explicit:
 * - Apple Wallet has no free-text push API. PassKit only surfaces a
 *   `changeMessage` when this field's value changes; `%@` is replaced by
 *   the new value.
 * - Google Wallet has a real notification API (`addMessage`) with arbitrary
 *   header + body and real triggers.
 */

'use client';

import React, { useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { FieldNotifications, GoogleMessageConfig } from '@/components/wallet/types/unified-field';
import {
  AppleNotificationPreview,
  GoogleNotificationPreview,
} from './NotificationPreviews';

export interface NotificationConfigPanelProps {
  notifications: FieldNotifications;
  onChange: (notifications: FieldNotifications) => void;
}

const GOOGLE_TRIGGERS: Array<GoogleMessageConfig['trigger']> = ['onChange', 'scheduled', 'beforeExpiry'];

function Toggle({
  checked,
  onCheckedChange,
  label,
  testId,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  testId?: string;
}) {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="sr-only peer"
        aria-label={label}
        data-testid={testId}
      />
      <div className="relative w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
    </label>
  );
}

export function NotificationConfigPanel({ notifications, onChange }: NotificationConfigPanelProps) {
  const { t } = useI18n();
  const appleRef = useRef<HTMLTextAreaElement>(null);
  const [appleSample, setAppleSample] = useState<string | null>(null);
  const sampleValue = appleSample ?? t('wallet.studio.notifications.sampleValue');

  const apple = notifications.appleChangeMessage;
  const google = notifications.googleMessage;

  const handleToggleApple = (enabled: boolean) => {
    onChange({
      ...notifications,
      appleChangeMessage: enabled
        ? {
            enabled: true,
            message: apple?.message ?? t('wallet.studio.notifications.defaultAppleMessage'),
          }
        : undefined,
    });
  };

  const handleAppleMessageChange = (message: string) => {
    onChange({
      ...notifications,
      appleChangeMessage: { enabled: true, message },
    });
  };

  const insertAppleToken = () => {
    const el = appleRef.current;
    const current = apple?.message ?? '';
    const token = t('wallet.studio.notifications.tokenChip');
    if (!el) {
      handleAppleMessageChange(current + token);
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? start;
    const next = current.slice(0, start) + token + current.slice(end);
    handleAppleMessageChange(next);
    // Restore caret after React re-renders the controlled textarea.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const handleToggleGoogle = (enabled: boolean) => {
    onChange({
      ...notifications,
      googleMessage: enabled
        ? {
            enabled: true,
            header: google?.header ?? t('wallet.studio.notifications.defaultGoogleHeader'),
            body: google?.body ?? t('wallet.studio.notifications.defaultGoogleBody'),
            trigger: google?.trigger ?? 'onChange',
            ...(google?.scheduledAt ? { scheduledAt: google.scheduledAt } : {}),
            ...(google?.daysBeforeExpiry !== undefined
              ? { daysBeforeExpiry: google.daysBeforeExpiry }
              : {}),
          }
        : undefined,
    });
  };

  const handleGoogleChange = (partial: Partial<GoogleMessageConfig>) => {
    onChange({
      ...notifications,
      googleMessage: {
        ...(google ?? {
          enabled: true,
          header: '',
          body: '',
          trigger: 'onChange' as const,
        }),
        ...partial,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Apple Wallet ─────────────────────────────────────────── */}
        <section
          className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 p-3 space-y-3"
          data-testid="notification-apple-column"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-neutral-700 dark:text-neutral-200" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {t('wallet.studio.notifications.platformApple')}
              </span>
            </div>
            <Toggle
              checked={Boolean(apple?.enabled)}
              onCheckedChange={handleToggleApple}
              label={t('wallet.studio.notifications.enableApple')}
              testId="toggle-apple-change-message"
            />
          </div>

          <div className="rounded-md bg-neutral-100 dark:bg-neutral-800 p-2">
            <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
              {t('wallet.studio.notifications.lockScreenPreview')}
            </p>
            <AppleNotificationPreview
              message={
                apple?.enabled
                  ? apple.message
                  : t('wallet.studio.notifications.defaultAppleMessage')
              }
              sampleValue={sampleValue}
            />
          </div>

          {apple?.enabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="apple-change-message"
                  className="text-xs font-medium text-neutral-700 dark:text-neutral-300"
                >
                  {t('wallet.studio.notifications.appleChangeMessage')}
                </label>
                <button
                  type="button"
                  onClick={insertAppleToken}
                  className="px-2 py-0.5 rounded-full border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[11px] font-mono font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={t('wallet.studio.notifications.insertToken')}
                  title={t('wallet.studio.notifications.insertToken')}
                  data-testid="insert-apple-token"
                >
                  {t('wallet.studio.notifications.tokenChip')}
                </button>
              </div>
              <textarea
                id="apple-change-message"
                ref={appleRef}
                value={apple.message}
                onChange={(e) => handleAppleMessageChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                placeholder={t('wallet.studio.notifications.applePlaceholder')}
                maxLength={120}
                data-testid="apple-change-message-input"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('wallet.studio.notifications.appleHint')}
                </p>
                <span
                  className={`text-xs font-medium ${
                    (apple.message?.length ?? 0) > 100
                      ? 'text-amber-500'
                      : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  {t('wallet.studio.notifications.appleCharCount', {
                    count: apple.message?.length ?? 0,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-neutral-600 dark:text-neutral-400" htmlFor="apple-sample-value">
                  {t('wallet.studio.notifications.sampleValueLabel')}
                </label>
                <input
                  id="apple-sample-value"
                  type="text"
                  value={sampleValue}
                  onChange={(e) => setAppleSample(e.target.value)}
                  className="w-20 px-2 py-1 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={16}
                  data-testid="apple-sample-value"
                />
              </div>
              <p
                className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-2 py-1.5"
                data-testid="apple-free-text-warning"
              >
                {t('wallet.studio.notifications.appleNoFreeText')}
              </p>
            </div>
          )}
        </section>

        {/* ── Google Wallet ────────────────────────────────────────── */}
        <section
          className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 p-3 space-y-3"
          data-testid="notification-google-column"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 5.04c1.67 0 3.17.58 4.35 1.71l3.25-3.26C17.51 1.18 14.96 0 12 0 7.39 0 3.37 2.6 1.4 6.38l3.77 2.92C6.26 6.3 8.92 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.5 12.23c0-.86-.08-1.69-.22-2.48H12v4.7h6.45c-.28 1.48-1.1 2.73-2.34 3.57l3.78 2.93c2.2-2.03 3.61-5.02 3.61-8.72z" />
                <path fill="#FBBC05" d="M5.17 9.3L1.4 6.38C.51 8.17 0 10.18 0 12.33c0 2.15.51 4.16 1.4 5.95l3.78-2.92c-.46-1.36-.73-2.8-.73-4.31 0-1.51.27-2.95.73-4.31l-.01.57z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.78-2.93c-1.02.68-2.32 1.08-4.15 1.08-3.08 0-5.74-1.26-7.46-3.29L1.4 18.28C3.37 22.1 7.39 24.67 12 24z" />
              </svg>
              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {t('wallet.studio.notifications.platformGoogle')}
              </span>
            </div>
            <Toggle
              checked={Boolean(google?.enabled)}
              onCheckedChange={handleToggleGoogle}
              label={t('wallet.studio.notifications.enableGoogle')}
              testId="toggle-google-message"
            />
          </div>

          <div className="rounded-md bg-neutral-800 dark:bg-neutral-950 p-2">
            <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
              {t('wallet.studio.notifications.googlePreview')}
            </p>
            <GoogleNotificationPreview
              header={
                google?.enabled
                  ? google.header
                  : t('wallet.studio.notifications.defaultGoogleHeader')
              }
              body={
                google?.enabled
                  ? google.body
                  : t('wallet.studio.notifications.defaultGoogleBody')
              }
              sampleValue={sampleValue}
            />
          </div>

          {google?.enabled && (
            <div className="space-y-2">
              <div>
                <label
                  htmlFor="google-notification-header"
                  className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  {t('wallet.studio.notifications.googleHeaderLabel')}
                </label>
                <input
                  id="google-notification-header"
                  type="text"
                  value={google.header}
                  onChange={(e) => handleGoogleChange({ header: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('wallet.studio.notifications.googleHeaderPlaceholder')}
                  maxLength={50}
                  data-testid="google-notification-header"
                />
              </div>
              <div>
                <label
                  htmlFor="google-notification-body"
                  className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  {t('wallet.studio.notifications.googleBodyLabel')}
                </label>
                <textarea
                  id="google-notification-body"
                  value={google.body}
                  onChange={(e) => handleGoogleChange({ body: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder={t('wallet.studio.notifications.googleBodyPlaceholder')}
                  maxLength={200}
                  data-testid="google-notification-body"
                />
              </div>

              <fieldset className="space-y-1.5">
                <legend className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {t('wallet.studio.notifications.googleTriggerLabel')}
                </legend>
                <div className="space-y-1">
                  {GOOGLE_TRIGGERS.map((trigger) => (
                    <label
                      key={trigger}
                      className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700 dark:text-neutral-300"
                    >
                      <input
                        type="radio"
                        name="google-notification-trigger"
                        value={trigger}
                        checked={google.trigger === trigger}
                        onChange={() => handleGoogleChange({ trigger })}
                        className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                        data-testid={`google-trigger-${trigger}`}
                      />
                      {t(`wallet.studio.notifications.trigger.${trigger}`)}
                    </label>
                  ))}
                </div>
              </fieldset>

              {google.trigger === 'scheduled' && (
                <div>
                  <label
                    htmlFor="google-scheduled-at"
                    className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1"
                  >
                    {t('wallet.studio.notifications.scheduledAt')}
                  </label>
                  <input
                    id="google-scheduled-at"
                    type="datetime-local"
                    value={
                      google.scheduledAt
                        ? google.scheduledAt.slice(0, 16)
                        : ''
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      handleGoogleChange({
                        scheduledAt: raw ? new Date(raw).toISOString() : undefined,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="google-scheduled-at"
                  />
                </div>
              )}

              {google.trigger === 'beforeExpiry' && (
                <div>
                  <label
                    htmlFor="google-days-before-expiry"
                    className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1"
                  >
                    {t('wallet.studio.notifications.daysBeforeExpiry')}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleGoogleChange({
                          daysBeforeExpiry: Math.max(1, (google.daysBeforeExpiry ?? 3) - 1),
                        })
                      }
                      className="w-8 h-8 rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={t('wallet.studio.notifications.decreaseDays')}
                      data-testid="google-days-minus"
                    >
                      {t('wallet.studio.notifications.minus')}
                    </button>
                    <input
                      id="google-days-before-expiry"
                      type="number"
                      min={1}
                      max={30}
                      value={google.daysBeforeExpiry ?? 3}
                      onChange={(e) =>
                        handleGoogleChange({
                          daysBeforeExpiry: Math.min(
                            30,
                            Math.max(1, parseInt(e.target.value, 10) || 1)
                          ),
                        })
                      }
                      className="w-20 px-2 py-2 text-sm text-center rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      data-testid="google-days-before-expiry"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleGoogleChange({
                          daysBeforeExpiry: Math.min(30, (google.daysBeforeExpiry ?? 3) + 1),
                        })
                      }
                      className="w-8 h-8 rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={t('wallet.studio.notifications.increaseDays')}
                      data-testid="google-days-plus"
                    >
                      {t('wallet.studio.notifications.plus')}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t('wallet.studio.notifications.googleHint')}
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {t('wallet.studio.notifications.configHint')}
      </p>
    </div>
  );
}
