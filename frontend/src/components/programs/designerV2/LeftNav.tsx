/* designerV2/LeftNav.tsx — Icon navigation bar with platform toggle */

'use client';

import React, { useCallback } from 'react';
import {
  Palette,
  TableProperties,
  MapPin,
  Link as LinkIcon,
  Barcode,
  Settings,
  Save,
} from 'lucide-react';
import type { DesignerNavItem } from './types';

/* ─── Icon config ─────────────────────────────────────────────────── */
interface NavConfig {
  id: DesignerNavItem;
  icon: React.ElementType;
  label: string;
}

const NAV_ITEMS: NavConfig[] = [
  { id: 'design', icon: Palette, label: 'Diseño' },
  { id: 'data', icon: TableProperties, label: 'Campos' },
  { id: 'locations', icon: MapPin, label: 'Ubicaciones' },
  { id: 'links', icon: LinkIcon, label: 'Enlaces' },
  { id: 'barcode', icon: Barcode, label: 'Código de barras' },
  { id: 'advanced', icon: Settings, label: 'Avanzado' },
];

/* ─── Platform Toggle (top of nav) ────────────────────────────────── */
function PlatformToggle({
  platform,
  onChange,
}: {
  platform: 'apple' | 'google';
  onChange: (p: 'apple' | 'google') => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-2">
      <div className="inline-flex flex-col bg-muted rounded-xl p-1 gap-1 w-12">
        <button
          type="button"
          onClick={() => onChange('apple')}
          className={`w-full h-10 rounded-lg flex items-center justify-center transition-all duration-150
            ${platform === 'apple'
              ? 'bg-white shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
            }`}
          title="Apple Wallet"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onChange('google')}
          className={`w-full h-10 rounded-lg flex items-center justify-center transition-all duration-150
            ${platform === 'google'
              ? 'bg-white shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
            }`}
          title="Google Wallet"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.068 0 11-4.932 11-11 0-.73-.074-1.44-.213-2.128H12.545z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─── Nav Item ────────────────────────────────────────────────────── */
function NavItem({
  config,
  isActive,
  onClick,
}: {
  config: NavConfig;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = config.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      title={config.label}
      className={`relative w-full h-12 flex items-center justify-center transition-all duration-100 group
        ${isActive
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
        }`}
    >
      {/* Active indicator */}
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-primary rounded-r-full" />
      )}
      {/* Hover bg */}
      <span className={`absolute inset-1 rounded-lg transition-colors duration-100
        ${isActive ? 'bg-primary/10' : 'group-hover:bg-muted'}`}
      />
      {/* Icon */}
      <Icon className="relative w-5 h-5" strokeWidth={1.5} />
    </button>
  );
}

/* ─── Save Button (bottom of nav) ─────────────────────────────────── */
function SaveButton({ onClick, isSaving }: { onClick: () => void; isSaving?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSaving}
      title="Guardar cambios"
      className="relative w-full h-12 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors duration-100 group"
    >
      <span className="absolute inset-1 rounded-lg group-hover:bg-muted transition-colors duration-100" />
      <Save className="relative w-5 h-5" strokeWidth={1.5} />
      {isSaving && (
        <span className="absolute bottom-1.5 right-2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
      )}
    </button>
  );
}

/* ─── Main LeftNav ────────────────────────────────────────────────── */
export interface LeftNavProps {
  platform: 'apple' | 'google';
  activeNav: DesignerNavItem;
  onPlatformChange: (p: 'apple' | 'google') => void;
  onNavChange: (nav: DesignerNavItem) => void;
  onSave: () => void;
  isSaving?: boolean;
}

export function LeftNav({
  platform,
  activeNav,
  onPlatformChange,
  onNavChange,
  onSave,
  isSaving,
}: LeftNavProps) {
  const handleNavClick = useCallback(
    (nav: DesignerNavItem) => {
      onNavChange(nav);
    },
    [onNavChange]
  );

  return (
    <nav className="w-16 h-full flex flex-col bg-card border-r border-border shrink-0 select-none">
      {/* Platform toggle */}
      <div className="pt-3 pb-2">
        <PlatformToggle platform={platform} onChange={onPlatformChange} />
      </div>

      {/* Divider */}
      <div className="mx-3 h-px bg-border" />

      {/* Nav items */}
      <div className="flex-1 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            config={item}
            isActive={activeNav === item.id}
            onClick={() => handleNavClick(item.id)}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="mx-3 h-px bg-border" />

      {/* Save */}
      <div className="py-2">
        <SaveButton onClick={onSave} isSaving={isSaving} />
      </div>
    </nav>
  );
}
