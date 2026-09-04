/**
 * Advanced settings tab for Wallet Pass Studio.
 *
 * SRS-003 Section 8.6 — Apple- and Google-specific advanced options.
 */

'use client';

import React, { useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import type { AppleSpecificConfig, GoogleSpecificConfig, LocationConfig, BeaconConfig } from '@/components/wallet/types/unified-state';

export interface AdvancedTabProps {
  appleConfig: AppleSpecificConfig;
  googleConfig: GoogleSpecificConfig;
  onUpdateAppleConfig: (config: Partial<AppleSpecificConfig>) => void;
  onUpdateGoogleConfig: (config: Partial<GoogleSpecificConfig>) => void;
}

/* ── Inline SVG Icons ──────────────────────────────────────────────── */

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

function SectionHeader({ emoji, label, badge }: { emoji: string; label: string; badge?: string }) {
  return (
    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
      <span role="img" aria-label="icon">
        {emoji}
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

export function AdvancedTab({ appleConfig, googleConfig, onUpdateAppleConfig, onUpdateGoogleConfig }: AdvancedTabProps) {
  const { t } = useI18n();

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
        <SectionHeader emoji="🍎" label={t('wallet.studio.advanced.appleWallet')} badge={t('wallet.studio.advanced.exclusive')} />

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
          <h4 className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">📍 {t('wallet.studio.advanced.locationsAndBeacons')}</h4>
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

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 space-y-2.5">
        <SectionHeader emoji="🤖" label={t('wallet.studio.advanced.googleWallet')} badge={t('wallet.studio.advanced.exclusive')} />

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
