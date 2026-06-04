/**
 * Configure push notifications per field.
 */

'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { FieldNotifications } from '@/components/wallet/types/unified-state';

export interface NotificationConfigPanelProps {
  notifications: FieldNotifications;
  onChange: (notifications: FieldNotifications) => void;
}

export function NotificationConfigPanel({ notifications, onChange }: NotificationConfigPanelProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasApple = Boolean(notifications.appleChangeMessage);
  const hasGoogle = Boolean(notifications.googleMessage);
  const isActive = hasApple || hasGoogle;

  const handleToggleApple = (enabled: boolean) => {
    onChange({
      ...notifications,
      appleChangeMessage: enabled ? notifications.appleChangeMessage ?? t('wallet.studio.notifications.applePlaceholder') : undefined,
    });
  };

  const handleToggleGoogle = (enabled: boolean) => {
    onChange({
      ...notifications,
      googleMessage: enabled ? notifications.googleMessage ?? t('wallet.studio.notifications.googlePlaceholder') : undefined,
    });
  };

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
        aria-expanded={isExpanded}
        aria-controls="notification-panel-content"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-neutral-400 dark:text-neutral-500'}`}
            viewBox="0 0 24 24"
            fill={isActive ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {t('wallet.studio.notifications.title')}
          </span>
          {isActive && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              {t('wallet.studio.notifications.active')}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-neutral-400 dark:text-neutral-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isExpanded && (
        <div id="notification-panel-content" className="p-4 space-y-5">
          {/* Apple Change Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('wallet.studio.notifications.appleChangeMessage')}</span>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasApple}
                  onChange={(e) => handleToggleApple(e.target.checked)}
                  className="sr-only peer"
                  aria-label={t('wallet.studio.notifications.enableAppleMessage')}
                />
                <div className="relative w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
              </label>
            </div>
            {hasApple && (
              <div className="space-y-1">
                <input
                  type="text"
                  value={notifications.appleChangeMessage ?? ''}
                  onChange={(e) => onChange({ ...notifications, appleChangeMessage: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('wallet.studio.notifications.applePlaceholder')}
                  aria-label="Apple change message"
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('wallet.studio.notifications.appleHint')}
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  {t('wallet.studio.notifications.appleExample')}
                </p>
              </div>
            )}
          </div>

          {/* Google Messages */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('wallet.studio.notifications.googleMessage')}</span>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasGoogle}
                  onChange={(e) => handleToggleGoogle(e.target.checked)}
                  className="sr-only peer"
                  aria-label={t('wallet.studio.notifications.enableGoogleMessage')}
                />
                <div className="relative w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
              </label>
            </div>
            {hasGoogle && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={notifications.googleMessage ?? ''}
                  onChange={(e) => onChange({ ...notifications, googleMessage: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('wallet.studio.notifications.googlePlaceholder')}
                  aria-label="Google message"
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('wallet.studio.notifications.googleHint')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
