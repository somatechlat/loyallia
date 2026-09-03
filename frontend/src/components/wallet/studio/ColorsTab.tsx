/**
 * Color configuration sidebar tab for Wallet Pass Studio.
 * Includes real-time contrast checking, preset swatches, and color harmony.
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import type { WalletColors } from '@/components/wallet/types/unified-state';
import { COLOR_PRESETS } from '@/components/wallet/constants';
import { hexToRgb, hexToHsl, hslToHex, autoForeground, isValidHex, normalizeHex } from '@/components/wallet/utils/colors';
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

const COLOR_FIELDS: Array<{ key: ColorKey; labelKey: string; descKey: string }> = [
  { key: 'background', labelKey: 'wallet.studio.colors.background', descKey: 'wallet.studio.colors.backgroundDesc' },
  { key: 'foreground', labelKey: 'wallet.studio.colors.foreground', descKey: 'wallet.studio.colors.foregroundDesc' },
  { key: 'label', labelKey: 'wallet.studio.colors.label', descKey: 'wallet.studio.colors.labelDesc' },
  { key: 'accent', labelKey: 'wallet.studio.colors.accent', descKey: 'wallet.studio.colors.accentDesc' },
];

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

const PRESET_SWATCHES = [
  '#1A1A2E', '#16213E', '#0F3460', '#533483', '#E94560',
  '#1B1B2F', '#4A4E69', '#9A8C98', '#C9ADA7', '#F2E9E4',
  '#2D3047', '#419D78', '#E0A458', '#D9594C', '#8D99AE',
  '#000000', '#FFFFFF', '#F8F9FA', '#212529', '#6C757D',
  '#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#3BFFE2',
  '#118AB2', '#073B4C', '#EF476F', '#FFC43D', '#1B9AAA',
];

function ColorPickerPopover({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (color: string) => void;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleSelect = useCallback(
    (color: string) => {
      onChange(color.toUpperCase());
      setIsOpen(false);
    },
    [onChange]
  );

  const handleNativeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value.toUpperCase());
      setIsOpen(false);
    },
    [onChange]
  );

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ backgroundColor: value }}
        aria-label={`${t('wallet.studio.colors.colorSelector')} ${label}`}
        title={value}
      />
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl w-[260px]">
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {PRESET_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => handleSelect(swatch)}
                className="w-8 h-8 rounded-md border border-neutral-200 dark:border-neutral-700 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: swatch }}
                title={swatch}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <input
              ref={nativeInputRef}
              type="color"
              value={normalizeHex(value)}
              onChange={handleNativeChange}
              className="w-8 h-8 rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0 overflow-hidden shrink-0"
            />
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{t('wallet.studio.colors.custom')}</span>
          </div>
        </div>
      )}
    </div>
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
  const [hexInput, setHexInput] = useState(value.toUpperCase());
  const [copied, setCopied] = useState(false);

  // Sync hexInput when external value changes
  React.useEffect(() => {
    setHexInput(value.toUpperCase());
  }, [value]);

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
            title={t('wallet.studio.colors.autoSuggest')}
          >
            <WandIcon className="w-3 h-3" />
            {t('wallet.studio.colors.auto')}
          </button>
        )}
      </div>
      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{config.description}</p>
      <div className="flex items-center gap-2">
        <ColorPickerPopover value={value} onChange={onChange} label={config.label} />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              onBlur={handleBlur}
              data-testid="hex-input"
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

const SAVED_PRESETS_KEY = 'loyallia_color_presets';

interface SavedColorPreset {
  name: string;
  background: string;
  foreground: string;
  label: string;
  accent: string;
}

function loadSavedPresets(): SavedColorPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_PRESETS_KEY);
    return raw ? (JSON.parse(raw) as SavedColorPreset[]) : [];
  } catch {
    return [];
  }
}

function savePresetsToStorage(presets: SavedColorPreset[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SAVED_PRESETS_KEY, JSON.stringify(presets));
}

export function ColorsTab({ colors, onUpdateColors }: ColorsTabProps) {
  const { t } = useI18n();
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
  const [savedPresets, setSavedPresets] = useState<SavedColorPreset[]>(loadSavedPresets);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleColorChange = useCallback(
    (key: ColorKey) => (color: string) => {
      onUpdateColors({ [key]: color });
    },
    [onUpdateColors]
  );

  const handleApplyPreset = useCallback(
    (preset: (typeof COLOR_PRESETS)[number] | SavedColorPreset) => {
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

  const handleSavePreset = useCallback(() => {
    const name = presetName.trim();
    if (!name) return;
    const newPreset: SavedColorPreset = {
      name,
      background: colors.background,
      foreground: colors.foreground,
      label: colors.label,
      accent: colors.accent,
    };
    const updated = [...savedPresets.filter((p) => p.name !== name), newPreset];
    setSavedPresets(updated);
    savePresetsToStorage(updated);
    setIsSavingPreset(false);
    setPresetName('');
  }, [presetName, colors, savedPresets]);

  const handleDeletePreset = useCallback(
    (name: string) => {
      const updated = savedPresets.filter((p) => p.name !== name);
      setSavedPresets(updated);
      savePresetsToStorage(updated);
    },
    [savedPresets]
  );

  const contrast = useMemo(() => contrastRatio(colors.foreground, colors.background), [colors.foreground, colors.background]);
  const wcagLevel = useMemo(() => getWCAGLevel(colors.foreground, colors.background), [colors.foreground, colors.background]);

  const harmony = useMemo(() => getHarmonyColors(colors.background), [colors.background]);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">{t('wallet.studio.colors.title')}</h3>

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.colors.contrast')}</span>
          <ContrastBadge level={wcagLevel} />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center" style={{ backgroundColor: colors.background }}>
            <span className="text-xs font-semibold" style={{ color: colors.foreground }}>Aa</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{contrast.toFixed(2)}:1</p>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
              {wcagLevel === 'AAA' ? t('wallet.studio.colors.contrastAAA') : wcagLevel === 'AA' ? t('wallet.studio.colors.contrastAA') : t('wallet.studio.colors.contrastFail')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {COLOR_FIELDS.map((field) => (
          <ColorInput key={field.key} config={{ key: field.key, label: t(field.labelKey), description: t(field.descKey) }} value={colors[field.key]} onChange={handleColorChange(field.key)} showAutoForeground={field.key === 'background' ? handleAutoForeground : undefined} />
        ))}
      </div>

      {/* Save preset */}
      <div className="space-y-2">
        {!isSavingPreset ? (
          <button
            type="button"
            onClick={() => setIsSavingPreset(true)}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded-md border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
            {t('wallet.studio.colors.savePreset')}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); if (e.key === 'Escape') { setIsSavingPreset(false); setPresetName(''); } }}
              placeholder={t('wallet.studio.colors.presetName')}
              className="flex-1 px-2 py-1 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSavePreset}
              className="px-2 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              {t('common.save')}
            </button>
            <button
              type="button"
              onClick={() => { setIsSavingPreset(false); setPresetName(''); }}
              className="px-2 py-1 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>

      {/* Saved presets */}
      {savedPresets.length > 0 && (
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.colors.savedPresets')}</label>
          <div className="grid grid-cols-5 gap-1.5">
            {savedPresets.map((preset) => (
              <div key={preset.name} className="relative group">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  onMouseEnter={() => setHoveredPreset(preset.name)}
                  onMouseLeave={() => setHoveredPreset(null)}
                  className="w-full flex flex-col items-center gap-1 p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 transition-colors"
                  title={preset.name}
                >
                  <div className="w-full flex gap-0.5">
                    <div className="w-1/2 h-4 rounded-l" style={{ backgroundColor: preset.background }} />
                    <div className="w-1/2 h-4 rounded-r" style={{ backgroundColor: preset.accent }} />
                  </div>
                </button>
                {hoveredPreset === preset.name && (
                  <>
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-neutral-800 dark:bg-neutral-700 text-[9px] text-white whitespace-nowrap z-10">{preset.name}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.name); }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t('common.delete')}
                    >
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.colors.presets')}</label>
        <div className="grid grid-cols-5 gap-1.5">
          {COLOR_PRESETS.map((preset) => (
            <button key={preset.name} type="button" onClick={() => handleApplyPreset(preset)} onMouseEnter={() => setHoveredPreset(preset.name)} onMouseLeave={() => setHoveredPreset(null)} data-testid="color-preset" className="relative group flex flex-col items-center gap-1 p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 transition-colors" title={preset.name}>
              <div className="w-full flex gap-0.5">
                <div className="w-1/2 h-4 rounded-l" style={{ backgroundColor: preset.background }} />
                <div className="w-1/2 h-4 rounded-r" style={{ backgroundColor: preset.accent }} />
              </div>
              {hoveredPreset === preset.name && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-neutral-800 dark:bg-neutral-700 text-[9px] text-white whitespace-nowrap z-10">{preset.name}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.colors.harmony')}</label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: t('wallet.studio.colors.analogousPlus'), color: harmony.analogous[0] },
            { label: t('wallet.studio.colors.analogousMinus'), color: harmony.analogous[1] },
            { label: t('wallet.studio.colors.complementary'), color: harmony.complementary },
          ].map((item) => (
            <button key={item.label} type="button" onClick={() => onUpdateColors({ accent: item.color })} className="flex flex-col items-center gap-1 p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 transition-colors">
              <div className="w-6 h-6 rounded-full border border-neutral-200 dark:border-neutral-700" style={{ backgroundColor: item.color }} />
              <span className="text-[9px] text-neutral-500 dark:text-neutral-400">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
