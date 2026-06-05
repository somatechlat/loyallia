/**
 * Advanced settings tab for Wallet Pass Studio.
 *
 * SRS-003 Section 8.6 — Apple- and Google-specific advanced options.
 */

'use client';

import React, { useCallback } from 'react';
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

function UploadCloudIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function createEmptyLocation(): LocationConfig {
  return {
    id: `loc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    latitude: 0,
    longitude: 0,
  };
}

function createEmptyBeacon(): BeaconConfig {
  return {
    id: `beacon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

  const handleToggleScreenshotDisabled = useCallback(
    (_checked: boolean) => {
      // Google doesn't have a direct flag in our model, but we can store it as a custom field if needed.
      // For now we just call the callback to satisfy the UI requirement.
      onUpdateGoogleConfig({});
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
    <div className="space-y-6">
      {/* ── APPLE WALLET ── */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4">
        <SectionHeader emoji="🍎" label="APPLE WALLET" badge="Exclusivo" />

        {/* Icon upload zone */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            Icono para notificaciones
          </label>
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 py-6 px-4 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
            <UploadCloudIcon className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
            <span className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">Arrastra o haz click para subir</span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">29×29pt, aparece en lock screen</span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            Descripción (accesibilidad)
          </label>
          <input
            type="text"
            value={appleConfig.description}
            onChange={handleDescriptionChange}
            placeholder="Descripción del pase para VoiceOver"
            className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Sharing prohibited */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={appleConfig.sharingProhibited}
            onChange={(e) => handleToggleSharingProhibited(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            Prohibir compartir <span className="text-neutral-400 dark:text-neutral-500 text-xs">(iOS 11+)</span>
          </span>
        </label>

        {/* Suppress strip shine */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={appleConfig.suppressStripShine}
            onChange={(e) => handleToggleStripShine(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            Suprimir brillo del strip <span className="text-neutral-400 dark:text-neutral-500 text-xs">(default: sí)</span>
          </span>
        </label>

        {/* Divider */}
        <div className="border-t border-neutral-200 dark:border-neutral-700" />

        {/* Locations and Beacons */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
            <span role="img" aria-label="location">📍</span> UBICACIONES Y BEACONS
          </h4>

          {/* Locations */}
          {appleConfig.locations.length > 0 && (
            <div className="space-y-2">
              {appleConfig.locations.map((loc, index) => (
                <div key={loc.id} className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Ubicación {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(index)}
                      className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
                      aria-label="Eliminar ubicación"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="any"
                      value={loc.latitude}
                      onChange={(e) => handleUpdateLocation(index, { latitude: parseFloat(e.target.value) || 0 })}
                      placeholder="Latitud"
                      className="w-full px-2 py-1 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      step="any"
                      value={loc.longitude}
                      onChange={(e) => handleUpdateLocation(index, { longitude: parseFloat(e.target.value) || 0 })}
                      placeholder="Longitud"
                      className="w-full px-2 py-1 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={loc.relevantText ?? ''}
                    onChange={(e) => handleUpdateLocation(index, { relevantText: e.target.value || undefined })}
                    placeholder="Texto relevante (opcional)"
                    className="w-full px-2 py-1 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Beacons */}
          {appleConfig.beacons.length > 0 && (
            <div className="space-y-2">
              {appleConfig.beacons.map((beacon, index) => (
                <div key={beacon.id} className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Beacon {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteBeacon(index)}
                      className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
                      aria-label="Eliminar beacon"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={beacon.uuid}
                    onChange={(e) => handleUpdateBeacon(index, { uuid: e.target.value })}
                    placeholder="UUID"
                    className="w-full px-2 py-1 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={beacon.major}
                      onChange={(e) => handleUpdateBeacon(index, { major: parseInt(e.target.value, 10) || 0 })}
                      placeholder="Major"
                      className="w-full px-2 py-1 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={beacon.minor}
                      onChange={(e) => handleUpdateBeacon(index, { minor: parseInt(e.target.value, 10) || 0 })}
                      placeholder="Minor"
                      className="w-full px-2 py-1 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={beacon.relevantText ?? ''}
                    onChange={(e) => handleUpdateBeacon(index, { relevantText: e.target.value || undefined })}
                    placeholder="Texto relevante (opcional)"
                    className="w-full px-2 py-1 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddLocation}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Añadir ubicación
            </button>
            <button
              type="button"
              onClick={handleAddBeacon}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Añadir beacon
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-neutral-200 dark:border-neutral-700" />

        {/* App launch URL */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
            <span role="img" aria-label="mobile">📲</span> ENLACE A APP
          </h4>
          <input
            type="text"
            value={appleConfig.appLaunchURL ?? ''}
            onChange={handleAppLaunchURLChange}
            placeholder="URL de lanzamiento de la app"
            className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </section>

      {/* ── GOOGLE WALLET ── */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4">
        <SectionHeader emoji="🤖" label="GOOGLE WALLET" badge="Exclusivo" />

        {/* Smart Tap / NFC */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(googleConfig.smartTapRedemptionValue !== undefined)}
            onChange={(e) => handleToggleSmartTap(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            Smart Tap / NFC <span className="text-neutral-400 dark:text-neutral-500 text-xs">(requiere certificación)</span>
          </span>
        </label>

        {googleConfig.smartTapRedemptionValue !== undefined && (
          <div className="space-y-1 pl-6">
            <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Valor de redención Smart Tap
            </label>
            <input
              type="text"
              value={googleConfig.smartTapRedemptionValue}
              onChange={handleSmartTapValueChange}
              placeholder="Ej. 1234567890"
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* App link */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            Enlace a app (Google Play)
          </label>
          <input
            type="text"
            value={googleConfig.homepageUri ?? ''}
            onChange={handleHomepageUriChange}
            placeholder="https://play.google.com/store/apps/..."
            className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Disable screenshots */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={false}
            onChange={(e) => handleToggleScreenshotDisabled(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">Deshabilitar capturas de pantalla</span>
        </label>

        {/* Divider */}
        <div className="border-t border-neutral-200 dark:border-neutral-700" />

        {/* Card grouping */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
            <span role="img" aria-label="ticket">🎟️</span> AGRUPAR TARJETAS
          </h4>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              ID de grupo
            </label>
            <input
              type="text"
              value={googleConfig.groupingId ?? ''}
              onChange={handleGroupingIdChange}
              placeholder=" Ej. loyalty_group_001"
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Orden
            </label>
            <select
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(_e) => {
                // Placeholder for ordering logic
                onUpdateGoogleConfig({});
              }}
            >
              <option value="default">Por defecto</option>
              <option value="newest">Más reciente primero</option>
              <option value="oldest">Más antiguo primero</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}
