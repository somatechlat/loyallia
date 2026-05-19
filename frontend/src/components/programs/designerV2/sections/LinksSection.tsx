/* designerV2/sections/LinksSection.tsx — Homepage, help, additional links */

'use client';

import React from 'react';
import { Info, Link as LinkIcon, Plus } from 'lucide-react';

function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />
      <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">{children}</p>
    </div>
  );
}

export function LinksSection() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Enlaces</h2>

      <InfoCallout>
        Los enlaces aparecen en la vista de detalles del pase.
      </InfoCallout>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Página principal</label>
          <input
            type="url"
            placeholder="https://..."
            className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Página de ayuda</label>
          <input
            type="url"
            placeholder="https://..."
            className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Enlaces adicionales</h3>
        <div className="text-sm text-muted-foreground italic">
          No hay enlaces adicionales
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
          Agregar enlace
        </button>
      </div>
    </div>
  );
}
