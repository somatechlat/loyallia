/**
 * Advanced settings tab for Wallet Pass Studio.
 *
 * SRS-003 Section 8.6 — Apple- and Google-specific advanced options.
 */

'use client';

import React, { useCallback, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { AppleSpecificConfig, GoogleSpecificConfig, LocationConfig, BeaconConfig, FieldNotifications } from '@/components/wallet/types/unified-state';
import { NotificationConfigPanel } from './NotificationConfigPanel';

export interface AdvancedTabProps {
  appleConfig: AppleSpecificConfig;
  googleConfig: GoogleSpecificConfig;
  onUpdateAppleConfig: (config: Partial<AppleSpecificConfig>) => void;
  onUpdateGoogleConfig: (config: Partial<GoogleSpecificConfig>) => void;
  defaultNotifications?: FieldNotifications;
  onUpdateDefaultNotifications?: (notifications: FieldNotifications) => void;
}

/* ── Inline SVG Icons ──────────────────────────────────────────────── */

function AppleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function BellIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function GoogleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#EA4335" d="M12 5.04c1.67 0 3.17.58 4.35 1.71l3.25-3.26C17.51 1.18 14.96 0 12 0 7.39 0 3.37 2.6 1.4 6.38l3.77 2.92C6.26 6.3 8.92 5.04 12 5.04z" />
      <path fill="#4285F4" d="M23.5 12.23c0-.86-.08-1.69-.22-2.48H12v4.7h6.45c-.28 1.48-1.1 2.73-2.34 3.57l3.78 2.93c2.2-2.03 3.61-5.02 3.61-8.72z" />
      <path fill="#FBBC05" d="M5.17 9.3L1.4 6.38C.51 8.17 0 10.18 0 12.33c0 2.15.51 4.16 1.4 5.95l3.78-2.92c-.46-1.36-.73-2.8-.73-4.31 0-1.51.27-2.95.73-4.31l-.01.57z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.78-2.93c-1.02.68-2.32 1.08-4.15 1.08-3.08 0-5.74-1.26-7.46-3.29L1.4 18.28C3.37 22.1 7.39 24.67 12 24z" />
    </svg>
  );
}

function LocationIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PlusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function TrashIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function createEmptyLocation(): LocationConfig {
  return {
    id: `loc-${crypto.randomUUID()}`,
    latitude: 0,
    longitude: 0,
  };
}

function createEmptyBeacon(): BeaconConfig {
  return {
    id: `beacon-${crypto.randomUUID()}`,
    uuid: '',
    major: 0,
    minor: 0,
  };
}

/* ── Sub-components ───────────────────────────────────────────────── */

function SectionHeader({ icon, label, badge }: { icon: React.ReactNode; label: string; badge?: string }) {
  return (
    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
      <span className="text-neutral-500 dark:text-neutral-400">
        {icon}
      </span>
      {label}
      {badge && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
          {badge}
        </span>
      )}
    </h3>
  );
}

/* ── Main Component ───────────────────────────────────────────────── */

export function AdvancedTab({ appleConfig, googleConfig, onUpdateAppleConfig, onUpdateGoogleConfig, defaultNotifications, onUpdateDefaultNotifications }: AdvancedTabProps) {
  const { t } = useI18n();
  const [localNotifications, setLocalNotifications] = useState<FieldNotifications>(defaultNotifications ?? {});
  const handleNotificationsChange = useCallback((notifications: FieldNotifications) => {
    setLocalNotifications(notifications);
    onUpdateDefaultNotifications?.(notifications);
  }, [onUpdateDefaultNotifications]);

  /* ── Apple Handlers ─────────────────────────────────────────────── */

  const handleToggleSharingProhibited = useCallback(
    (checked: boolean) => {
      onUpdateAppleConfig({ sharingProhibited: checked });
    },
    [onUpdateAppleConfig]
  );

  const handleToggleStripShine = useCallback(
    (checked: boolean) => {
      onUpdateAppleConfig({ suppressStripShine: checked });
    },
    [onUpdateAppleConfig]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateAppleConfig({ description: e.target.value });
    },
    [onUpdateAppleConfig]
  );

  const handleAppLaunchURLChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateAppleConfig({ appLaunchURL: e.target.value || undefined });
    },
    [onUpdateAppleConfig]
  );

  const handleAddLocation = useCallback(() => {
    onUpdateAppleConfig({ locations: [...appleConfig.locations, createEmptyLocation()] });
  }, [appleConfig.locations, onUpdateAppleConfig]);

  const handleUpdateLocation = useCallback(
    (index: number, patch: Partial<LocationConfig>) => {
      const locations = [...appleConfig.locations];
      locations[index] = { ...locations[index]!, ...patch };
      onUpdateAppleConfig({ locations });
    },
    [appleConfig.locations, onUpdateAppleConfig]
  );

  const handleDeleteLocation = useCallback(
    (index: number) => {
      const locations = [...appleConfig.locations];
      locations.splice(index, 1);
      onUpdateAppleConfig({ locations });
    },
    [appleConfig.locations, onUpdateAppleConfig]
  );

  const handleAddBeacon = useCallback(() => {
    onUpdateAppleConfig({ beacons: [...appleConfig.beacons, createEmptyBeacon()] });
  }, [appleConfig.beacons, onUpdateAppleConfig]);

  const handleUpdateBeacon = useCallback(
    (index: number, patch: Partial<BeaconConfig>) => {
      const beacons = [...appleConfig.beacons];
      beacons[index] = { ...beacons[index]!, ...patch };
      onUpdateAppleConfig({ beacons });
    },
    [appleConfig.beacons, onUpdateAppleConfig]
  );

  const handleDeleteBeacon = useCallback(
    (index: number) => {
      const beacons = [...appleConfig.beacons];
      beacons.splice(index, 1);
      onUpdateAppleConfig({ beacons });
    },
    [appleConfig.beacons, onUpdateAppleConfig]
  );

  /* ── Google Handlers ────────────────────────────────────────────── */

  const handleToggleSmartTap = useCallback(
    (checked: boolean) => {
      onUpdateGoogleConfig({ smartTapRedemptionValue: checked ? '' : undefined });
    },
    [onUpdateGoogleConfig]
  );

  const handleSmartTapValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateGoogleConfig({ smartTapRedemptionValue: e.target.value });
    },
    [onUpdateGoogleConfig]
  );

  const handleHomepageUriChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateGoogleConfig({ homepageUri: e.target.value || undefined });
    },
    [onUpdateGoogleConfig]
  );

  const handleGroupingIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateGoogleConfig({ groupingId: e.target.value || undefined });
    },
    [onUpdateGoogleConfig]
  );

  return (
    <div className="space-y-2">
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 space-y-2.5">
        <SectionHeader icon={<AppleIcon className="w-4 h-4" />} label={t('wallet.studio.advanced.appleWallet')} badge={t('wallet.studio.advanced.exclusive')} />

        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.advanced.descriptionVoiceOver')}</label>
          <input type="text" value={appleConfig.description} onChange={handleDescriptionChange} placeholder={t('wallet.studio.advanced.passDescription')} maxLength={200} className="w-full px-2 py-1 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="apple-description-input" />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={appleConfig.sharingProhibited} onChange={(e) => handleToggleSharingProhibited(e.target.checked)} className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-xs text-neutral-700 dark:text-neutral-300">{t('wallet.studio.advanced.prohibitSharing')}</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={appleConfig.suppressStripShine} onChange={(e) => handleToggleStripShine(e.target.checked)} className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-xs text-neutral-700 dark:text-neutral-300">{t('wallet.studio.advanced.suppressStripShine')}</span>
          </label>
        </div>

        <div className="space-y-1.5 pt-1 border-t border-neutral-200 dark:border-neutral-700">
          <h4 className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5"><LocationIcon className="w-3 h-3" /> {t('wallet.studio.advanced.locationsAndBeacons')}</h4>
          {appleConfig.locations.length > 0 && (
            <div className="space-y-1">
              {appleConfig.locations.map((loc, index) => (
                <div key={loc.id} className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-1.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-neutral-500">{t('wallet.studio.advanced.location')} {index + 1}</span>
                    <button type="button" onClick={() => handleDeleteLocation(index)} className="p-0.5 rounded text-neutral-400 hover:text-red-500"><TrashIcon className="w-3 h-3" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <input type="number" step="any" value={loc.latitude} onChange={(e) => handleUpdateLocation(index, { latitude: parseFloat(e.target.value) || 0 })} placeholder={t('wallet.studio.advanced.latitude')} className="w-full px-1.5 py-0.5 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800" data-testid={`location-lat-${index}`} />
                    <input type="number" step="any" value={loc.longitude} onChange={(e) => handleUpdateLocation(index, { longitude: parseFloat(e.target.value) || 0 })} placeholder={t('wallet.studio.advanced.longitude')} className="w-full px-1.5 py-0.5 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800" data-testid={`location-lng-${index}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {appleConfig.beacons.length > 0 && (
            <div className="space-y-1">
              {appleConfig.beacons.map((beacon, index) => (
                <div key={beacon.id} className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-1.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-neutral-500">{t('wallet.studio.advanced.beacon')} {index + 1}</span>
                    <button type="button" onClick={() => handleDeleteBeacon(index)} className="p-0.5 rounded text-neutral-400 hover:text-red-500"><TrashIcon className="w-3 h-3" /></button>
                  </div>
                  <input type="text" value={beacon.uuid} onChange={(e) => handleUpdateBeacon(index, { uuid: e.target.value })} placeholder={t('wallet.studio.advanced.uuid')} maxLength={50} className="w-full px-1.5 py-0.5 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800" data-testid={`beacon-uuid-${index}`} />
                  <div className="grid grid-cols-2 gap-1">
                    <input type="number" value={beacon.major} onChange={(e) => handleUpdateBeacon(index, { major: parseInt(e.target.value, 10) || 0 })} placeholder={t('wallet.studio.advanced.major')} className="w-full px-1.5 py-0.5 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800" data-testid={`beacon-major-${index}`} />
                    <input type="number" value={beacon.minor} onChange={(e) => handleUpdateBeacon(index, { minor: parseInt(e.target.value, 10) || 0 })} placeholder={t('wallet.studio.advanced.minor')} className="w-full px-1.5 py-0.5 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800" data-testid={`beacon-minor-${index}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleAddLocation} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><PlusIcon className="w-3 h-3" /> {t('wallet.studio.advanced.location')}</button>
            <button type="button" onClick={handleAddBeacon} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><PlusIcon className="w-3 h-3" /> {t('wallet.studio.advanced.beacon')}</button>
          </div>
        </div>

        <div className="space-y-0.5 pt-1 border-t border-neutral-200 dark:border-neutral-700">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">{t('wallet.studio.advanced.appLaunchUrl')}</label>
          <input type="text" value={appleConfig.appLaunchURL ?? ''} onChange={handleAppLaunchURLChange} placeholder="https://..." maxLength={500} className="w-full px-2 py-1 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="app-launch-url-input" />
        </div>
      </section>

      {/* ── Notifications Section ──────────────────────────────────── */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 space-y-2.5">
        <SectionHeader icon={<BellIcon className="w-4 h-4" />} label={t('wallet.studio.notifications.title')} />
        <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
          {t('wallet.studio.notifications.configHint', { defaultValue: 'Configure how push notifications appear when your wallet pass updates.' })}
        </p>
        <NotificationConfigPanel notifications={localNotifications} onChange={handleNotificationsChange} />
      </section>

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 space-y-2.5">
        <SectionHeader icon={<GoogleIcon className="w-4 h-4" />} label={t('wallet.studio.advanced.googleWallet')} badge={t('wallet.studio.advanced.exclusive')} />

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={Boolean(googleConfig.smartTapRedemptionValue !== undefined)} onChange={(e) => handleToggleSmartTap(e.target.checked)} className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-xs text-neutral-700 dark:text-neutral-300">{t('wallet.studio.advanced.smartTapNfc')}</span>
        </label>
        {googleConfig.smartTapRedemptionValue !== undefined && (
          <input type="text" value={googleConfig.smartTapRedemptionValue} onChange={handleSmartTapValueChange} placeholder={t('wallet.studio.advanced.smartTapValue')} maxLength={100} className="w-full px-2 py-1 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="smart-tap-value-input" />
        )}

        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">{t('wallet.studio.advanced.appLink')}</label>
          <input type="text" value={googleConfig.homepageUri ?? ''} onChange={handleHomepageUriChange} placeholder="https://play.google.com/..." maxLength={500} className="w-full px-2 py-1 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="homepage-uri-input" />
        </div>

        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">{t('wallet.studio.advanced.groupId')}</label>
          <input type="text" value={googleConfig.groupingId ?? ''} onChange={handleGroupingIdChange} placeholder="loyalty_group_001" maxLength={100} className="w-full px-2 py-1 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="grouping-id-input" />
        </div>
      </section>
    </div>
  );
}
