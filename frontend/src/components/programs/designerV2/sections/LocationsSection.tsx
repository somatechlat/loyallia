/* designerV2/sections/LocationsSection.tsx — GPS + iBeacons */

'use client';

import React, { useState } from 'react';
import { Info, MapPin, Radio, Plus, X } from '@/components/ui/LucideIcons';
import type { WalletDesignState, WalletLocation, WalletBeacon } from '../types';

function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />
      <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">{children}</p>
    </div>
  );
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export interface LocationsSectionProps {
  walletDesign: WalletDesignState;
  onWalletDesignChange: (state: WalletDesignState) => void;
}

export function LocationsSection({ walletDesign, onWalletDesignChange }: LocationsSectionProps) {
  const [addingGps, setAddingGps] = useState(false);
  const [addingBeacon, setAddingBeacon] = useState(false);
  const [gpsForm, setGpsForm] = useState({ latitude: '', longitude: '', altitude: '0', relevantText: '' });
  const [beaconForm, setBeaconForm] = useState({ uuid: '', major: '', minor: '', relevantText: '' });

  const addLocation = () => {
    const lat = parseFloat(gpsForm.latitude);
    const lng = parseFloat(gpsForm.longitude);
    if (isNaN(lat) || isNaN(lng)) return;
    const newLoc: WalletLocation = {
      id: uid(),
      latitude: lat,
      longitude: lng,
      altitude: parseFloat(gpsForm.altitude) || 0,
      relevantText: gpsForm.relevantText,
    };
    onWalletDesignChange({ ...walletDesign, locations: [...walletDesign.locations, newLoc] });
    setGpsForm({ latitude: '', longitude: '', altitude: '0', relevantText: '' });
    setAddingGps(false);
  };

  const removeLocation = (id: string) => {
    onWalletDesignChange({ ...walletDesign, locations: walletDesign.locations.filter(l => l.id !== id) });
  };

  const addBeacon = () => {
    const major = parseInt(beaconForm.major, 10);
    const minor = parseInt(beaconForm.minor, 10);
    if (!beaconForm.uuid.trim() || isNaN(major) || isNaN(minor)) return;
    const newBeacon: WalletBeacon = {
      id: uid(),
      uuid: beaconForm.uuid.trim(),
      major,
      minor,
      relevantText: beaconForm.relevantText,
    };
    onWalletDesignChange({ ...walletDesign, beacons: [...walletDesign.beacons, newBeacon] });
    setBeaconForm({ uuid: '', major: '', minor: '', relevantText: '' });
    setAddingBeacon(false);
  };

  const removeBeacon = (id: string) => {
    onWalletDesignChange({ ...walletDesign, beacons: walletDesign.beacons.filter(b => b.id !== id) });
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Ubicaciones</h2>

      <InfoCallout>
        Agrega ubicaciones para mostrar el pase en la pantalla de bloqueo cuando el cliente esté cerca.
      </InfoCallout>

      {/* GPS Locations */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          Ubicaciones GPS
        </h3>

        {walletDesign.locations.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">No hay ubicaciones agregadas</div>
        ) : (
          <div className="space-y-2">
            {walletDesign.locations.map(loc => (
              <div key={loc.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate">{loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}</p>
                  {loc.relevantText && <p className="text-xs text-muted-foreground truncate">{loc.relevantText}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeLocation(loc.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        {addingGps ? (
          <div className="space-y-2 p-3 rounded-lg border border-border bg-card">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Latitud"
                className="input h-8 text-sm"
                value={gpsForm.latitude}
                onChange={e => setGpsForm({ ...gpsForm, latitude: e.target.value })}
              />
              <input
                type="text"
                placeholder="Longitud"
                className="input h-8 text-sm"
                value={gpsForm.longitude}
                onChange={e => setGpsForm({ ...gpsForm, longitude: e.target.value })}
              />
            </div>
            <input
              type="text"
              placeholder="Texto relevante (opcional)"
              className="input h-8 text-sm"
              value={gpsForm.relevantText}
              onChange={e => setGpsForm({ ...gpsForm, relevantText: e.target.value })}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAddingGps(false)} className="btn-ghost flex-1 text-xs">Cancelar</button>
              <button type="button" onClick={addLocation} className="btn-primary flex-1 text-xs">Agregar</button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingGps(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            Agregar ubicación GPS
          </button>
        )}
      </div>

      {/* iBeacons */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Radio className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          iBeacons (Apple)
        </h3>

        {walletDesign.beacons.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">No hay iBeacons agregados</div>
        ) : (
          <div className="space-y-2">
            {walletDesign.beacons.map(beacon => (
              <div key={beacon.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate font-mono text-xs">{beacon.uuid}</p>
                  <p className="text-xs text-muted-foreground">Major: {beacon.major} · Minor: {beacon.minor}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeBeacon(beacon.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        {addingBeacon ? (
          <div className="space-y-2 p-3 rounded-lg border border-border bg-card">
            <input
              type="text"
              placeholder="UUID"
              className="input h-8 text-sm font-mono"
              value={beaconForm.uuid}
              onChange={e => setBeaconForm({ ...beaconForm, uuid: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Major"
                className="input h-8 text-sm"
                value={beaconForm.major}
                onChange={e => setBeaconForm({ ...beaconForm, major: e.target.value })}
              />
              <input
                type="text"
                placeholder="Minor"
                className="input h-8 text-sm"
                value={beaconForm.minor}
                onChange={e => setBeaconForm({ ...beaconForm, minor: e.target.value })}
              />
            </div>
            <input
              type="text"
              placeholder="Texto relevante (opcional)"
              className="input h-8 text-sm"
              value={beaconForm.relevantText}
              onChange={e => setBeaconForm({ ...beaconForm, relevantText: e.target.value })}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAddingBeacon(false)} className="btn-ghost flex-1 text-xs">Cancelar</button>
              <button type="button" onClick={addBeacon} className="btn-primary flex-1 text-xs">Agregar</button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingBeacon(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            Agregar iBeacon
          </button>
        )}
      </div>
    </div>
  );
}
