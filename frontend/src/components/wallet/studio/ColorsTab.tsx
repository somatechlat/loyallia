/**
 * Color configuration sidebar tab for Wallet Pass Studio.
 * Includes real-time contrast checking, preset swatches, and color harmony.
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import type { WalletColors } from '@/components/wallet/types/unified-state';
import { COLOR_PRESETS } from '@/components/wallet/constants';
import { hexToRgb, rgbToHex, hexToHsl, hslToHex, autoForeground, isValidHex, normalizeHex } from '@/components/wallet/utils/colors';
import { contrastRatio, getWCAGLevel } from '@/components/wallet/utils/contrast';

export interface ColorsTabProps {
  colors: WalletColors;
  onUpdateColors: (colors: Partial<WalletColors>) => void;
}

type ColorKey = keyof WalletColors;

interface ColorFieldConfig {
  key: ColorKey;
  label: string;
  description: string;
}

function getColorFields(t: (key: string) => string): ColorFieldConfig[] {
  return [
    { key: 'background', label: t('wallet.studio.colors.background'), description: t('wallet.studio.colors.backgroundDesc') },
    { key: 'foreground', label: t('wallet.studio.colors.foreground'), description: t('wallet.studio.colors.foregroundDesc') },
    { key: 'label', label: t('wallet.studio.colors.labels'), description: t('wallet.studio.colors.labelDesc') },
    { key: 'accent', label: t('wallet.studio.colors.accent'), description: t('wallet.studio.colors.accentDesc') },
  ];
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function WandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" /><path d="M17.8 11.8 19 13" /><path d="M15 9h.01" /><path d="M17.8 6.2 19 5" /><path d="m3 21 9-9" /><path d="M12.2 6.2 11 5" />
    </svg>
  );
}

function hexToRgbaString(hex: string): string {
  const rgb = hexToRgb(hex);
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function getHarmonyColors(hex: string): { analogous: [string, string]; complementary: string } {
  const hsl = hexToHsl(hex);
  const analogous1 = hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l);
  const analogous2 = hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l);
  const complementary = hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l);
  return { analogous: [analogous1, analogous2], complementary };
}

function ContrastBadge({ level }: { level: 'AAA' | 'AA' | 'FAIL' }) {
  const styles = {
    AAA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
    AA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    FAIL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${styles[level]}`}>
      {level}
    </span>
  );
}

function ColorInput({
  config,
  value,
  onChange,
  showAutoForeground,
}: {
  config: ColorFieldConfig;
  value: string;
  onChange: (color: string) => void;
  showAutoForeground?: () => void;
}) {
  const { t } = useI18n();
  const [hexInput, setHexInput] = useState(value.toUpperCase());
  const [copied, setCopied] = useState(false);

  // Sync hexInput when external value changes
  React.useEffect(() => {
    setHexInput(value.toUpperCase());
  }, [value]);

  const rgb = useMemo(() => hexToRgb(value), [value]);
  const isValid = isValidHex(hexInput);

  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setHexInput(raw);
      if (isValidHex(raw)) {
        onChange(normalizeHex(raw));
      }
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    if (!isValidHex(hexInput)) {
      setHexInput(value.toUpperCase());
    }
  }, [hexInput, value]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silently fail
    }
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {config.label}
        </label>
        {showAutoForeground && (
          <button
            type="button"
            onClick={showAutoForeground}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            title={t('wallet.studio.colors.autoForeground')}
          >
            <WandIcon className="w-3 h-3" />
            {t('wallet.studio.colors.auto')}
          </button>
        )}
      </div>
      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{config.description}</p>
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0">
          <input
            type="color"
            value={normalizeHex(value)}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0 overflow-hidden"
            aria-label={t('wallet.studio.colors.colorPicker', { label: config.label })}
          />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              onBlur={handleBlur}
              className={`flex-1 px-2.5 py-1.5 rounded-md border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isValid
                  ? 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100'
                  : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
              }`}
              maxLength={7}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              aria-label={t('wallet.studio.colors.copyColor')}
              title={t('wallet.studio.colors.copyColor')}
            >
              {copied ? <CheckIcon className="w-3.5 h-3.5 text-green-600" /> : <CopyIcon className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono">{hexToRgbaString(value)}</p>
        </div>
      </div>
    </div>
  );
}

export function ColorsTab({ colors, onUpdateColors }: ColorsTabProps) {
  const { t } = useI18n();
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
  const colorFields = useMemo(() => getColorFields(t), [t]);

  const handleColorChange = useCallback(
    (key: ColorKey) => (color: string) => {
      onUpdateColors({ [key]: color });
    },
    [onUpdateColors]
  );

  const handleApplyPreset = useCallback(
    (preset: (typeof COLOR_PRESETS)[number]) => {
      onUpdateColors({
        background: preset.background,
        foreground: preset.foreground,
        label: preset.label,
        accent: preset.accent,
      });
    },
    [onUpdateColors]
  );

  const handleAutoForeground = useCallback(() => {
    onUpdateColors({ foreground: autoForeground(colors.background) });
  }, [colors.background, onUpdateColors]);

  const contrast = useMemo(() => contrastRatio(colors.foreground, colors.background), [colors.foreground, colors.background]);
  const wcagLevel = useMemo(() => getWCAGLevel(colors.foreground, colors.background), [colors.foreground, colors.background]);

  const harmony = useMemo(() => getHarmonyColors(colors.background), [colors.background]);

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('wallet.studio.colors.title')}</h3>

      {/* Contrast Check */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            {t('wallet.studio.colors.contrast')}
          </span>
          <ContrastBadge level={wcagLevel} />
        </div>
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center"
            style={{ backgroundColor: colors.background }}
          >
            <span className="text-sm font-semibold" style={{ color: colors.foreground }}>Aa</span>
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              {contrast.toFixed(2)}:1
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {wcagLevel === 'AAA'
                ? t('wallet.studio.colors.contrastAAA')
                : wcagLevel === 'AA'
                ? t('wallet.studio.colors.contrastAA')
                : t('wallet.studio.colors.contrastFail')}
            </p>
          </div>
        </div>
      </div>

      {/* Color Inputs */}
      <div className="space-y-5">
        {colorFields.map((field) => (
          <ColorInput
            key={field.key}
            config={field}
            value={colors[field.key]}
            onChange={handleColorChange(field.key)}
            showAutoForeground={field.key === 'background' ? handleAutoForeground : undefined}
          />
        ))}
      </div>

      {/* Quick Color Presets */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.colors.presets')}
        </label>
        <div className="grid grid-cols-5 gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              onMouseEnter={() => setHoveredPreset(preset.name)}
              onMouseLeave={() => setHoveredPreset(null)}
              className="relative group flex flex-col items-center gap-1.5 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
              title={preset.name}
            >
              <div className="w-full flex gap-0.5">
                <div className="w-1/2 h-5 rounded-l" style={{ backgroundColor: preset.background }} />
                <div className="w-1/2 h-5 rounded-r" style={{ backgroundColor: preset.accent }} />
              </div>
              {hoveredPreset === preset.name && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-800 dark:bg-neutral-700 text-[10px] text-white whitespace-nowrap z-10">
                  {preset.name}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Color Harmony */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.colors.harmony')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onUpdateColors({ accent: harmony.analogous[0] })}
            className="flex flex-col items-center gap-1 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
          >
            <div className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700" style={{ backgroundColor: harmony.analogous[0] }} />
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{t('wallet.studio.colors.analogousPlus')}</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdateColors({ accent: harmony.analogous[1] })}
            className="flex flex-col items-center gap-1 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
          >
            <div className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700" style={{ backgroundColor: harmony.analogous[1] }} />
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{t('wallet.studio.colors.analogousMinus')}</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdateColors({ accent: harmony.complementary })}
            className="flex flex-col items-center gap-1 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
          >
            <div className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700" style={{ backgroundColor: harmony.complementary }} />
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{t('wallet.studio.colors.complementary')}</span>
          </button>
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.colors.preview')}
        </label>
        <div
          className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 space-y-3 shadow-sm"
          style={{ backgroundColor: colors.background }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: colors.label }}>{t('wallet.preview.program')}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.accent, color: colors.background }}>
              {t('wallet.preview.vip')}
            </span>
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: colors.foreground }}>{t('wallet.preview.loyalliaRewards')}</p>
            <p className="text-sm mt-0.5" style={{ color: colors.label }}>{t('wallet.preview.stampDescription')}</p>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: colors.label + '33' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: colors.accent, color: colors.background }}>
              5
            </div>
            <p className="text-xs" style={{ color: colors.foreground }}>{t('wallet.preview.stampStatus', { current: 5, total: 10 })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
