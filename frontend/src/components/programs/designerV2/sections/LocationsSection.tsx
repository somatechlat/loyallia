/* designerV2/sections/LocationsSection.tsx — GPS + iBeacons */

'use client';

import React from 'react';
import { Info, MapPin, Radio, Plus } from '@/components/ui/LucideIcons';

function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />
      <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">{children}</p>
    </div>
  );
}

export function LocationsSection() {
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
        <div className="text-sm text-muted-foreground italic">
          No hay ubicaciones agregadas
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
          Agregar ubicación GPS
        </button>
      </div>

      {/* iBeacons */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Radio className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          iBeacons (Apple)
        </h3>
        <div className="text-sm text-muted-foreground italic">
          No hay iBeacons agregados
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
          Agregar iBeacon
        </button>
      </div>
    </div>
  );
}
