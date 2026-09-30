/**
 * Program-level "Notificaciones" studio panel.
 *
 * Three lifecycle events (enroll / redeem / value change) with platform
 * targets and a live WYSIWYG preview on both ecosystems.
 */

'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { ProgramNotificationSettings } from '@/components/wallet/types/wallet-settings';
import {
  AppleNotificationPreview,
  GoogleNotificationPreview,
} from './NotificationPreviews';

export interface ProgramNotificationsPanelProps {
  settings: ProgramNotificationSettings;
  onChange: (settings: ProgramNotificationSettings) => void;
}

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

function PlatformCheck({
  checked,
  onChange,
  label,
  testId,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  testId: string;
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-neutral-700 dark:text-neutral-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
        data-testid={testId}
      />
      {label}
    </label>
  );
}

function ExpandRow({
  title,
  subtitle,
  enabled,
  onToggle,
  expanded,
  onExpand,
  testId,
  children,
}: {
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  expanded: boolean;
  onExpand: () => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 overflow-hidden"
      data-testid={testId}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={onExpand}
          aria-expanded={expanded}
          className="flex-1 flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          data-testid={`${testId}-expand`}
        >
          <svg
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{title}</p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{subtitle}</p>
          </div>
        </button>
        <Toggle
          checked={enabled}
          onCheckedChange={onToggle}
          label={title}
          testId={`${testId}-toggle`}
        />
      </div>
      {expanded && <div className="px-3 pb-3 space-y-3 border-t border-neutral-100 dark:border-neutral-700 pt-3">{children}</div>}
    </div>
  );
}

export function ProgramNotificationsPanel({
  settings,
  onChange,
}: ProgramNotificationsPanelProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<'onEnroll' | 'onRedeem' | 'onValueChange' | null>('onEnroll');
  const sampleValue = t('wallet.studio.notifications.sampleValue');

  const toggleExpand = (id: 'onEnroll' | 'onRedeem' | 'onValueChange') => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  // Stored copy may hold catalog keys (defaults) or user text; t() resolves both.
  const enrollMessage = t(settings.onEnroll.message);
  const redeemHeader = t(settings.onRedeem.header);
  const redeemBody = t(settings.onRedeem.body);
  const appleLabel = t('wallet.studio.notifications.platformApple');
  const googleLabel = t('wallet.studio.notifications.platformGoogle');

  return (
    <div className="space-y-4" data-testid="program-notifications-panel">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {t('wallet.studio.programNotifications.title')}
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {t('wallet.studio.programNotifications.intro')}
        </p>
      </div>

      <div className="space-y-2">
        {/* ── On enroll ─────────────────────────────────────────────── */}
        <ExpandRow
          title={t('wallet.studio.programNotifications.onEnroll')}
          subtitle={t('wallet.studio.programNotifications.onEnrollHint')}
          enabled={settings.onEnroll.enabled}
          onToggle={(enabled) =>
            onChange({ ...settings, onEnroll: { ...settings.onEnroll, enabled } })
          }
          expanded={expanded === 'onEnroll'}
          onExpand={() => toggleExpand('onEnroll')}
          testId="program-notif-on-enroll"
        >
          <div>
            <label
              htmlFor="program-enroll-message"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              {t('wallet.studio.programNotifications.message')}
            </label>
            <textarea
              id="program-enroll-message"
              value={enrollMessage}
              onChange={(e) =>
                onChange({
                  ...settings,
                  onEnroll: { ...settings.onEnroll, message: e.target.value },
                })
              }
              rows={2}
              maxLength={200}
              placeholder={t('wallet.studio.programNotifications.defaultEnrollMessage')}
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              data-testid="program-enroll-message"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <PlatformCheck
              checked={settings.onEnroll.apple}
              onChange={(apple) =>
                onChange({ ...settings, onEnroll: { ...settings.onEnroll, apple } })
              }
              label={appleLabel}
              testId="program-enroll-apple"
            />
            <PlatformCheck
              checked={settings.onEnroll.google}
              onChange={(google) =>
                onChange({ ...settings, onEnroll: { ...settings.onEnroll, google } })
              }
              label={googleLabel}
              testId="program-enroll-google"
            />
          </div>

          <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {t('wallet.studio.programNotifications.requireConsent')}
              </span>
              <Toggle
                checked={settings.onEnroll.requireConsent}
                onCheckedChange={(requireConsent) =>
                  onChange({
                    ...settings,
                    onEnroll: { ...settings.onEnroll, requireConsent },
                  })
                }
                label={t('wallet.studio.programNotifications.requireConsent')}
                testId="program-enroll-require-consent"
              />
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {t('wallet.studio.programNotifications.consentHint')}
            </p>
          </div>
        </ExpandRow>

        {/* ── On redeem ─────────────────────────────────────────────── */}
        <ExpandRow
          title={t('wallet.studio.programNotifications.onRedeem')}
          subtitle={t('wallet.studio.programNotifications.onRedeemHint')}
          enabled={settings.onRedeem.enabled}
          onToggle={(enabled) =>
            onChange({ ...settings, onRedeem: { ...settings.onRedeem, enabled } })
          }
          expanded={expanded === 'onRedeem'}
          onExpand={() => toggleExpand('onRedeem')}
          testId="program-notif-on-redeem"
        >
          <div>
            <label
              htmlFor="program-redeem-header"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              {t('wallet.studio.programNotifications.header')}
            </label>
            <input
              id="program-redeem-header"
              type="text"
              value={redeemHeader}
              onChange={(e) =>
                onChange({
                  ...settings,
                  onRedeem: { ...settings.onRedeem, header: e.target.value },
                })
              }
              maxLength={50}
              placeholder={t('wallet.studio.programNotifications.defaultRedeemHeader')}
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="program-redeem-header"
            />
          </div>
          <div>
            <label
              htmlFor="program-redeem-body"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              {t('wallet.studio.programNotifications.body')}
            </label>
            <textarea
              id="program-redeem-body"
              value={redeemBody}
              onChange={(e) =>
                onChange({
                  ...settings,
                  onRedeem: { ...settings.onRedeem, body: e.target.value },
                })
              }
              rows={2}
              maxLength={200}
              placeholder={t('wallet.studio.programNotifications.defaultRedeemBody')}
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              data-testid="program-redeem-body"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <PlatformCheck
              checked={settings.onRedeem.apple}
              onChange={(apple) =>
                onChange({ ...settings, onRedeem: { ...settings.onRedeem, apple } })
              }
              label={appleLabel}
              testId="program-redeem-apple"
            />
            <PlatformCheck
              checked={settings.onRedeem.google}
              onChange={(google) =>
                onChange({ ...settings, onRedeem: { ...settings.onRedeem, google } })
              }
              label={googleLabel}
              testId="program-redeem-google"
            />
          </div>
        </ExpandRow>

        {/* ── On value change ───────────────────────────────────────── */}
        <ExpandRow
          title={t('wallet.studio.programNotifications.onValueChange')}
          subtitle={t('wallet.studio.programNotifications.onValueChangeHint')}
          enabled={settings.onValueChange.enabled}
          onToggle={(enabled) =>
            onChange({ ...settings, onValueChange: { enabled } })
          }
          expanded={expanded === 'onValueChange'}
          onExpand={() => toggleExpand('onValueChange')}
          testId="program-notif-on-value-change"
        >
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('wallet.studio.programNotifications.onValueChangeBody')}
          </p>
        </ExpandRow>
      </div>

      {/* ── Live WYSIWYG previews ──────────────────────────────────── */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 p-3 space-y-3">
        <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.programNotifications.previewTitle')}
        </p>

        <div>
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            {t('wallet.studio.programNotifications.onEnroll')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {settings.onEnroll.apple && (
              <AppleNotificationPreview message={enrollMessage} sampleValue={sampleValue} />
            )}
            {settings.onEnroll.google && (
              <GoogleNotificationPreview
                header={t('wallet.studio.programNotifications.onEnroll')}
                body={enrollMessage}
                sampleValue={sampleValue}
              />
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            {t('wallet.studio.programNotifications.onRedeem')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {settings.onRedeem.apple && (
              <AppleNotificationPreview
                message={redeemBody || redeemHeader}
                sampleValue={sampleValue}
              />
            )}
            {settings.onRedeem.google && (
              <GoogleNotificationPreview
                header={redeemHeader}
                body={redeemBody}
                sampleValue={sampleValue}
              />
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            {t('wallet.studio.programNotifications.onValueChange')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <AppleNotificationPreview
              message={t('wallet.studio.notifications.defaultAppleMessage')}
              sampleValue={sampleValue}
            />
            <GoogleNotificationPreview
              header={t('wallet.studio.programNotifications.onValueChange')}
              body={t('wallet.studio.notifications.defaultGoogleBody')}
              sampleValue={sampleValue}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
