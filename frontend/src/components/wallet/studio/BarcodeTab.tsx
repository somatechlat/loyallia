/**
 * Barcode configuration sidebar tab for Wallet Pass Studio.
 * SRS-003 Section 8.4
 */

'use client';

import React, { useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import type { BarcodeConfig, BarcodeFormat } from '@/components/wallet/types/unified-state';

export interface BarcodeTabProps {
  barcode: BarcodeConfig;
  onUpdateBarcode: (barcode: Partial<BarcodeConfig>) => void;
}

const FORMAT_CARDS: { format: BarcodeFormat; label: string }[] = [
  { format: 'QR_CODE', label: 'QR Code' },
  { format: 'AZTEC', label: 'Aztec' },
  { format: 'PDF417', label: 'PDF417' },
  { format: 'CODE128', label: 'Code 128' },
];

/* ── Simplified SVG representations for the format selector cards ── */

function QrCodeMiniSvg() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="2" fill="white" />
      <rect x="4" y="4" width="10" height="10" fill="none" stroke="#111" strokeWidth="1.5" />
      <rect x="6" y="6" width="6" height="6" fill="#111" />
      <rect x="18" y="4" width="10" height="10" fill="none" stroke="#111" strokeWidth="1.5" />
      <rect x="20" y="6" width="6" height="6" fill="#111" />
      <rect x="4" y="18" width="10" height="10" fill="none" stroke="#111" strokeWidth="1.5" />
      <rect x="6" y="20" width="6" height="6" fill="#111" />
      <rect x="18" y="18" width="3" height="3" fill="#111" />
      <rect x="24" y="18" width="3" height="3" fill="#111" />
      <rect x="18" y="24" width="3" height="3" fill="#111" />
      <rect x="24" y="24" width="3" height="3" fill="#111" />
    </svg>
  );
}

function AztecMiniSvg() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="2" fill="white" />
      <rect x="10" y="10" width="12" height="12" fill="none" stroke="#111" strokeWidth="1.5" />
      <rect x="13" y="13" width="6" height="6" fill="#111" />
      <rect x="7" y="7" width="18" height="18" fill="none" stroke="#111" strokeWidth="1" />
      {[4, 8, 12, 16, 20, 24, 28].map((v) => (
        <React.Fragment key={v}>
          <rect x={v} y="0" width="2" height="2" fill="#111" />
          <rect x="0" y={v} width="2" height="2" fill="#111" />
        </React.Fragment>
      ))}
    </svg>
  );
}

function Pdf417MiniSvg() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="2" fill="white" />
      {[3, 6, 9, 12, 15, 18, 21, 24, 27].map((y, i) => (
        <rect key={i} x="3" y={y} width="26" height="1.5" fill="#111" />
      ))}
    </svg>
  );
}

function Code128MiniSvg() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="2" fill="white" />
      {[2, 4, 7, 9, 12, 14, 17, 19, 22, 24, 27, 29].map((x, i) => {
        const w = i % 3 === 0 ? 1.5 : i % 3 === 1 ? 2.5 : 1;
        return <rect key={i} x={x} y="4" width={w} height="24" fill="#111" />;
      })}
    </svg>
  );
}

function RadioCheckedSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7.5" fill="currentColor" stroke="currentColor" />
      <circle cx="8" cy="8" r="3" fill="white" />
    </svg>
  );
}

function RadioUncheckedSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function getMiniSvg(format: BarcodeFormat) {
  switch (format) {
    case 'QR_CODE':
      return <QrCodeMiniSvg />;
    case 'AZTEC':
      return <AztecMiniSvg />;
    case 'PDF417':
      return <Pdf417MiniSvg />;
    case 'CODE128':
      return <Code128MiniSvg />;
    default:
      return <QrCodeMiniSvg />;
  }
}

/* ── Component ── */

export function BarcodeTab({ barcode, onUpdateBarcode }: BarcodeTabProps) {
  const { t } = useI18n();
  const isRectangular = barcode.format === 'PDF417' || barcode.format === 'CODE128';

  const handleFormatSelect = useCallback(
    (format: BarcodeFormat) => {
      onUpdateBarcode({ format });
    },
    [onUpdateBarcode]
  );

  const handleToggleVar = useCallback(
    (variable: string, checked: boolean) => {
      const vars = ['{customer_id}', '{program_id}', '{timestamp}'];
      const currentVars = barcode.message.split('-').filter((v) => vars.includes(v));
      if (checked) {
        if (!currentVars.includes(variable)) {
          currentVars.push(variable);
        }
      } else {
        const idx = currentVars.indexOf(variable);
        if (idx > -1) currentVars.splice(idx, 1);
      }
      onUpdateBarcode({ message: currentVars.join('-') });
    },
    [barcode.message, onUpdateBarcode]
  );

  const includeCustomerId = barcode.message.includes('{customer_id}');
  const includeProgramId = barcode.message.includes('{program_id}');
  const includeTimestamp = barcode.message.includes('{timestamp}');

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 space-y-2.5">
        <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">{t('wallet.studio.barcode.formatTitle')}</h3>
        <div className="grid grid-cols-4 gap-1.5">
          {FORMAT_CARDS.map((card) => {
            const isSelected = barcode.format === card.format;
            return (
              <button key={card.format} type="button" onClick={() => handleFormatSelect(card.format)} className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 bg-white dark:bg-neutral-800'}`} aria-pressed={isSelected}>
                <div className="w-6 h-6 flex items-center justify-center">{getMiniSvg(card.format)}</div>
                <span className="text-[9px] font-medium text-neutral-700 dark:text-neutral-300">{card.label}</span>
                <span className={isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-400 dark:text-neutral-500'}>{isSelected ? <RadioCheckedSvg /> : <RadioUncheckedSvg />}</span>
              </button>
            );
          })}
        </div>
        {isRectangular && (
          <div className="flex items-start gap-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2">
            <span className="text-sm leading-none mt-0.5">⚠️</span>
            <p className="text-[10px] text-amber-800 dark:text-amber-300">{t('wallet.studio.barcode.pdf17Warning')}</p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 space-y-2.5">
        <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">{t('wallet.studio.barcode.contentTitle')}</h3>
        <div className="space-y-1">
          {[
            { checked: includeCustomerId, onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleToggleVar('{customer_id}', e.target.checked), label: t('wallet.studio.barcode.customerId') },
            { checked: includeProgramId, onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleToggleVar('{program_id}', e.target.checked), label: t('wallet.studio.barcode.programId') },
            { checked: includeTimestamp, onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleToggleVar('{timestamp}', e.target.checked), label: t('wallet.studio.barcode.timestamp') },
          ].map((item, i) => (
            <label key={i} className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
              <input type="checkbox" checked={item.checked} onChange={item.onChange} className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500" />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
        <div className="space-y-0.5">
          <label htmlFor="barcode-alt-text" className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.barcode.readableText')}</label>
          <input id="barcode-alt-text" type="text" value={barcode.altText ?? ''} onChange={(e) => onUpdateBarcode({ altText: e.target.value || undefined })} placeholder="0000 0000 0000" className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </section>
    </div>
  );
}
