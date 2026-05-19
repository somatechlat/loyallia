'use client';

import React from 'react';

type SectionKey = 'colors' | 'images' | 'fields' | 'locations' | 'links' | 'barcode' | 'advanced';

interface NavItem {
  key: SectionKey | 'platform';
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'platform',
    label: 'Plataforma',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    key: 'colors',
    label: 'Colores',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
      </svg>
    ),
  },
  {
    key: 'images',
    label: 'Imágenes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
  },
  {
    key: 'fields',
    label: 'Campos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
  },
  {
    key: 'locations',
    label: 'Ubicación',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    key: 'links',
    label: 'Enlaces',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
      </svg>
    ),
  },
  {
    key: 'barcode',
    label: 'Código',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="4" height="18"/>
        <rect x="8" y="3" width="2" height="18"/>
        <rect x="14" y="3" width="2" height="18"/>
        <rect x="20" y="3" width="2" height="18"/>
      </svg>
    ),
  },
  {
    key: 'advanced',
    label: 'Avanzado',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
];

interface DesignerNavBarProps {
  activeSection: SectionKey;
  onSectionChange: (section: SectionKey) => void;
  platform: 'apple' | 'google';
  onPlatformChange: (platform: 'apple' | 'google') => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export default function DesignerNavBar({
  activeSection,
  onSectionChange,
  platform,
  onPlatformChange,
  onSave,
  isSaving,
}: DesignerNavBarProps) {
  return (
    <div className="w-16 flex flex-col items-center py-4 gap-1 border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 h-full shrink-0">
      {/* Platform toggle */}
      <button
        onClick={() => onPlatformChange(platform === 'apple' ? 'google' : 'apple')}
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all
          bg-white dark:bg-surface-700 shadow-sm border border-surface-200 dark:border-surface-600"
        title={`Cambiar a ${platform === 'apple' ? 'Google' : 'Apple'} Wallet`}
      >
        {platform === 'apple' ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.068 0 11-4.932 11-11 0-.73-.074-1.44-.213-2.128H12.545z"/>
          </svg>
        )}
      </button>

      <div className="w-8 h-px bg-surface-200 dark:bg-surface-700 mb-2" />

      {/* Section nav */}
      {NAV_ITEMS.filter(item => item.key !== 'platform').map(item => {
        const isActive = activeSection === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onSectionChange(item.key as SectionKey)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 transition-all relative
              ${isActive
                ? 'bg-white dark:bg-surface-700 text-brand-600 dark:text-brand-400 shadow-sm border border-surface-200 dark:border-surface-600'
                : 'text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`}
            title={item.label}
          >
            <span className="w-5 h-5">{item.icon}</span>
            {isActive && (
              <span className="absolute right-0.5 top-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full" />
            )}
          </button>
        );
      })}

      <div className="flex-1" />

      {/* Save button */}
      {onSave && (
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all
            ${isSaving
              ? 'text-surface-300 cursor-wait'
              : 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm'
            }`}
          title="Guardar cambios"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
        </button>
      )}
    </div>
  );
}
