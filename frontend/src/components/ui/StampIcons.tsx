/**
 * Loyallia — Stamp Icon Library
 * Complete SVG icon set for loyalty card stamp icons.
 * Used in program wizard for stamp card customization.
 *
 * Usage:
 *   import { StampIcon, STAMP_ICONS } from '@/components/ui/StampIcons';
 *   <StampIcon name="coffee" className="w-6 h-6" />
 */

import React from 'react';

/** All available stamp icon SVG paths (24x24 viewBox, stroke-based) */
export const STAMP_ICON_PATHS: Record<string, string> = {
  // -- Food & Drink --
  coffee: 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3',
  pizza: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 2v20M2 12h20M7 4.5l10 15M17 4.5l-10 15',
  cake: 'M2 21h20M4 16h16v5H4zM4 16V12a2 2 0 012-2h12a2 2 0 012 2v4M8 10V8a4 4 0 018 0v2M12 4v2',
  burger: 'M3 11h18M3 15h18M5 7c0-2.2 3.1-4 7-4s7 1.8 7 4M19 15c0 2.2-3.1 4-7 4s-7-1.8-7-4M5 11l14 0',
  icecream: 'M12 22l-5-10h10L12 22zM12 2a5 5 0 015 5c0 2.8-2 5-5 5S7 9.8 7 7a5 5 0 015-5z',

  // -- Shopping --
  bag: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
  cart: 'M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6',
  tag: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
  percent: 'M19 5L5 19M6.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM17.5 20a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',

  // -- Wellness & Beauty --
  heart: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  sun: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  flower: 'M12 22c0-4.42-3.58-8-8-8 4.42 0 8-3.58 8-8 0 4.42 3.58 8 8 8-4.42 0-8 3.58-8 8zM12 8V2M8 12H2M16 12h6M12 16v6',

  // -- Services --
  scissors: 'M6 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12',
  car: 'M16 8l2 4h2a2 2 0 012 2v3a1 1 0 01-1 1h-1M1 17h1a1 1 0 001-1v-3a2 2 0 012-2h2l2-4h8M7 18a2 2 0 100-4 2 2 0 000 4zM17 18a2 2 0 100-4 2 2 0 000 4z',
  dumbbell: 'M6.5 6.5h11M2 10v4M22 10v4M4 8v8M20 8v8M6.5 17.5h11',
  paw: 'M12 17.5c3.5 3 7-1 7-4.5s-3-4-3.5-7C15 3 13 2 12 2s-3 1-3.5 4C8 9 5 9.5 5 13s3.5 7.5 7 4.5z',

  // -- Generic / Loyalty --
  stamp: 'M3 3h18v18H3zM9 12h6M12 9v6',
  trophy: 'M6 9H4a2 2 0 01-2-2V4h6M18 9h2a2 2 0 002-2V4h-6M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 1012 0V2z',
  medal: 'M12 2a3 3 0 100 6 3 3 0 000-6zM12 8v4M8 21l4-7 4 7M12 12a5 5 0 110 10 5 5 0 010-10z',
  crown: 'M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zM3 20h18',
  gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  thumbsup: 'M14 9V5a3 3 0 00-6 0v4M3 15a2 2 0 012-2h2v7H5a2 2 0 01-2-2v-3zM7 20h4.5a2.5 2.5 0 002.45-2l1.55-7H10l1-4',
  sparkle: 'M12 3v18M3 12h18M5.64 5.64l12.73 12.73M18.36 5.64L5.64 18.36',
};

/** Metadata for stamp icon categories */
export const STAMP_ICON_CATEGORIES = [
  {
    id: 'food',
    label: 'Comida y Bebida',
    icons: ['coffee', 'pizza', 'cake', 'burger', 'icecream'],
  },
  {
    id: 'shopping',
    label: 'Compras',
    icons: ['bag', 'cart', 'tag', 'percent'],
  },
  {
    id: 'wellness',
    label: 'Bienestar',
    icons: ['heart', 'star', 'sun', 'flower'],
  },
  {
    id: 'services',
    label: 'Servicios',
    icons: ['scissors', 'car', 'dumbbell', 'paw'],
  },
  {
    id: 'loyalty',
    label: 'Fidelización',
    icons: ['stamp', 'trophy', 'medal', 'crown', 'gift', 'zap', 'thumbsup', 'sparkle'],
  },
];

/** All icon names as a flat array */
export const STAMP_ICON_NAMES = Object.keys(STAMP_ICON_PATHS);

interface StampIconProps {
  name: string;
  className?: string;
  filled?: boolean;
}

/** Renders a stamp icon by name */
export function StampIcon({ name, className = 'w-6 h-6', filled = false }: StampIconProps) {
  const d = STAMP_ICON_PATHS[name] || STAMP_ICON_PATHS['stamp'];
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {d.split('z').map((seg, i, arr) =>
        seg.trim() ? (
          <path
            key={i}
            d={seg.trim() + (i < arr.length - 1 && arr[i + 1]?.trim() ? 'z' : '')}
          />
        ) : null
      )}
    </svg>
  );
}

interface StampIconPickerProps {
  selected: string;
  onSelect: (icon: string) => void;
}

/** Icon picker grid with categories */
export function StampIconPicker({ selected, onSelect }: StampIconPickerProps) {
  return (
    <div className="space-y-3">
      {STAMP_ICON_CATEGORIES.map((cat) => (
        <div key={cat.id}>
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">{cat.label}</p>
          <div className="flex flex-wrap gap-2">
            {cat.icons.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => onSelect(icon)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-150 ${
                  selected === icon
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-surface-50 dark:hover:bg-surface-800'
                }`}
                title={icon}
                id={`stamp-icon-${icon}`}
              >
                <StampIcon name={icon} className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default StampIcon;
