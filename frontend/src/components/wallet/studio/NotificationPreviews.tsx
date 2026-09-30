/**
 * WYSIWYG notification preview surfaces.
 *
 * Shared by the per-field NotificationConfigPanel and the program-level
 * ProgramNotificationsPanel so both render the same platform chrome.
 * Previews are decorative duplicates of the inputs (aria-hidden).
 */

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';

/**
 * Substitute Apple PassKit `changeMessage` tokens: `%@` becomes the new value.
 */
export function substituteAppleChangeMessage(
  message: string,
  sampleValue: string
): string {
  return (message ?? '').split('%@').join(sampleValue);
}

/**
 * Substitute Google message `{value}` placeholders with a sample value.
 */
export function substituteGoogleBody(
  body: string,
  sampleValue: string
): string {
  return (body ?? '').split('{value}').join(sampleValue);
}

function BellGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export interface AppleNotificationPreviewProps {
  message: string;
  sampleValue: string;
}

/**
 * iOS lock-screen style PassKit `changeMessage` bubble.
 */
export function AppleNotificationPreview({
  message,
  sampleValue,
}: AppleNotificationPreviewProps) {
  const { t } = useI18n();
  const rendered = substituteAppleChangeMessage(message, sampleValue);

  return (
    <div
      aria-hidden="true"
      data-testid="apple-notification-preview"
      className="rounded-2xl bg-white/85 dark:bg-neutral-700/80 backdrop-blur-xl border border-white/60 dark:border-neutral-600/50 shadow-lg p-2.5"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
          <BellGlyph className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5 gap-2">
            <p className="text-[10px] font-bold text-neutral-800 dark:text-neutral-100 truncate">
              {t('wallet.studio.notifications.previewAppName')}
            </p>
            <span className="text-[8px] text-neutral-400 dark:text-neutral-500 shrink-0">
              {t('wallet.studio.notifications.now')}
            </span>
          </div>
          <p className="text-[11px] text-neutral-700 dark:text-neutral-200 leading-snug break-words">
            {rendered || t('wallet.studio.notifications.defaultAppleMessage')}
          </p>
        </div>
      </div>
    </div>
  );
}

export interface GoogleNotificationPreviewProps {
  header: string;
  body: string;
  sampleValue: string;
}

/**
 * Android notification-shade style Google Wallet message card.
 */
export function GoogleNotificationPreview({
  header,
  body,
  sampleValue,
}: GoogleNotificationPreviewProps) {
  const { t } = useI18n();
  const renderedHeader = substituteGoogleBody(header, sampleValue);
  const renderedBody = substituteGoogleBody(body, sampleValue);

  return (
    <div
      aria-hidden="true"
      data-testid="google-notification-preview"
      className="rounded-2xl bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 shadow-md p-2.5"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center shrink-0">
          <BellGlyph className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] text-neutral-400 dark:text-neutral-400 mb-0.5 truncate">
            {t('wallet.studio.notifications.previewCaption', {
              time: t('wallet.studio.notifications.now'),
            })}
          </p>
          <p className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-100 leading-tight break-words">
            {renderedHeader || t('wallet.studio.notifications.defaultGoogleHeader')}
          </p>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-300 leading-snug break-words">
            {renderedBody || t('wallet.studio.notifications.defaultGoogleBody')}
          </p>
        </div>
      </div>
    </div>
  );
}
