'use client';

/**
 * LocationCard — Displays a single location in the grid.
 *
 * Extracted from locations/page.tsx as part of LYL-C-FE-002 (mega-component decomposition).
 *
 * @param location - The location data to display
 * @param onClick - Callback when card is clicked
 */
import type { LocationData } from './types';

interface LocationCardProps {
  location: LocationData;
  onClick: (loc: LocationData) => void;
}

/** Individual location card for the grid view. */
export default function LocationCard({ location, onClick }: LocationCardProps) {
  return (
    <div
      onClick={() => onClick(location)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(location);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Sucursal: ${location.name}${location.is_primary ? ' (principal)' : ''}`}
      className="bg-white dark:bg-surface-800 p-5 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm cursor-pointer hover:shadow-lg hover:border-brand-200 dark:hover:border-brand-700 hover:-translate-y-0.5 transition-all duration-200 group focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${location.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
        <h3 className="font-bold text-surface-900 dark:text-surface-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
          {location.name}
        </h3>
        {location.is_primary && (
          <span className="text-[10px] bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full font-semibold ml-auto flex-shrink-0">
            ★ Principal
          </span>
        )}
      </div>
      <p className="text-sm text-surface-600 dark:text-surface-400 truncate">{location.address || '—'}</p>
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-surface-400 dark:text-surface-500">{location.city}, Ecuador</p>
        {location.latitude && location.longitude && (
          <p className="text-[10px] text-surface-300 dark:text-surface-600 font-mono">
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </p>
        )}
      </div>
      {location.phone && (
        <p className="text-xs text-surface-400 dark:text-surface-500 mt-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {location.phone}
        </p>
      )}
      <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-700 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-brand-500 font-semibold">Ver detalles →</span>
      </div>
    </div>
  );
}
