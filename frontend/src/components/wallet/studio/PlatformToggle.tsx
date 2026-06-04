/**
 * Visual platform toggle component.
 *
 * Three circular/pill options: Apple, Google, Both.
 * Active state shows filled background; inactive shows outline only.
 */

'use client';

import { useI18n } from '@/lib/i18n';
import type { PlatformView } from '@/components/wallet/types/unified-state';

export interface PlatformToggleProps {
  value: PlatformView;
  onChange: (value: PlatformView) => void;
  size?: 'sm' | 'md' | 'lg';
}

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#EA4335" d="M12 5.04c1.67 0 3.17.58 4.35 1.71l3.25-3.26C17.51 1.18 14.96 0 12 0 7.39 0 3.37 2.6 1.4 6.38l3.77 2.92C6.26 6.3 8.92 5.04 12 5.04z" />
      <path fill="#4285F4" d="M23.5 12.23c0-.86-.08-1.69-.22-2.48H12v4.7h6.45c-.28 1.48-1.1 2.73-2.34 3.57l3.78 2.93c2.2-2.03 3.61-5.02 3.61-8.72z" />
      <path fill="#FBBC05" d="M5.17 9.3L1.4 6.38C.51 8.17 0 10.18 0 12.33c0 2.15.51 4.16 1.4 5.95l3.78-2.92c-.46-1.36-.73-2.8-.73-4.31 0-1.51.27-2.95.73-4.31l-.01.57z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.78-2.93c-1.02.68-2.32 1.08-4.15 1.08-3.08 0-5.74-1.26-7.46-3.29L1.4 18.28C3.37 22.1 7.39 24.67 12 24z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const OPTION_CONFIG: Array<{
  value: PlatformView;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { value: 'apple', label: 'Apple', icon: AppleLogo },
  { value: 'google', label: 'Google', icon: GoogleLogo },
  { value: 'both', label: 'Ambos', icon: EyeIcon },
];

const SIZE_CLASSES = {
  sm: {
    container: 'p-0.5 gap-0.5',
    button: 'w-7 h-7',
    icon: 'w-3.5 h-3.5',
  },
  md: {
    container: 'p-1 gap-1',
    button: 'w-9 h-9',
    icon: 'w-4 h-4',
  },
  lg: {
    container: 'p-1 gap-1.5',
    button: 'w-11 h-11',
    icon: 'w-5 h-5',
  },
} as const;

export function PlatformToggle({ value, onChange, size = 'md' }: PlatformToggleProps) {
  const { t } = useI18n();
  const classes = SIZE_CLASSES[size];

  return (
    <div
      className={`inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 ${classes.container}`}
      role="radiogroup"
      aria-label={t('wallet.studio.platformToggle.select')}
    >
      {OPTION_CONFIG.map((option) => {
        const isActive = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={`
              ${classes.button}
              rounded-full flex items-center justify-center transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-neutral-900
              ${isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-700 dark:hover:text-neutral-200'
              }
            `}
            title={option.label}
          >
            <Icon className={classes.icon} />
          </button>
        );
      })}
    </div>
  );
}
