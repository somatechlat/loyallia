/**
 * Barcode configuration sidebar tab for Wallet Pass Studio.
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { BarcodeConfig, BarcodeFormat } from '@/components/wallet/types/unified-state';
import { BARCODE_FORMAT_METADATA } from '@/components/wallet/constants';
import { BarcodeSvg } from '@/components/wallet/BarcodeRenderer';

export interface BarcodeTabProps {
  barcode: BarcodeConfig;
  onUpdateBarcode: (barcode: Partial<BarcodeConfig>) => void;
}

const MESSAGE_ENCODINGS = [
  { value: 'iso-8859-1', label: 'ISO-8859-1' },
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'us-ascii', label: 'US-ASCII' },
  { value: 'shift_jis', label: 'Shift JIS' },
];

const PLACEHOLDERS = [
  { key: '{customer_id}', label: 'Customer ID' },
  { key: '{program_id}', label: 'Program ID' },
  { key: '{timestamp}', label: 'Timestamp' },
];

function formatToBarcodeSvgType(format: BarcodeFormat): string {
  switch (format) {
    case 'CODE128':
      return 'code_128';
    case 'PDF417':
      return 'pdf417';
    case 'AZTEC':
      return 'aztec';
    case 'DATA_MATRIX':
      return 'data_matrix';
    case 'QR_CODE':
    default:
      return 'qr_code';
  }
}

function generateExample(message: string): string {
  return message
    .replace(/{customer_id}/g, 'CUST-12345')
    .replace(/{program_id}/g, 'PROG-67890')
    .replace(/{timestamp}/g, new Date().toISOString());
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export function BarcodeTab({ barcode, onUpdateBarcode }: BarcodeTabProps) {
  const [isFormatOpen, setIsFormatOpen] = useState(false);

  const svgType = useMemo(() => formatToBarcodeSvgType(barcode.format), [barcode.format]);
  const meta = BARCODE_FORMAT_METADATA[barcode.format];
  const example = useMemo(() => generateExample(barcode.message || '{customer_id}-{program_id}-{timestamp}'), [barcode.message]);

  const handleFormatSelect = useCallback(
    (format: BarcodeFormat) => {
      onUpdateBarcode({ format });
      setIsFormatOpen(false);
    },
    [onUpdateBarcode]
  );

  const handleInsertPlaceholder = useCallback(
    (placeholder: string) => {
      const input = document.getElementById('barcode-message') as HTMLInputElement | null;
      if (input) {
        const start = input.selectionStart ?? barcode.message.length;
        const end = input.selectionEnd ?? barcode.message.length;
        const newMessage = barcode.message.slice(0, start) + placeholder + barcode.message.slice(end);
        onUpdateBarcode({ message: newMessage });
        requestAnimationFrame(() => {
          const nextCursor = start + placeholder.length;
          input.focus();
          input.setSelectionRange(nextCursor, nextCursor);
        });
      } else {
        onUpdateBarcode({ message: barcode.message + placeholder });
      }
    },
    [barcode.message, onUpdateBarcode]
  );

  const copyExample = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(example);
    } catch {
      // silently fail
    }
  }, [example]);

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Configuración de Código</h3>

      {/* Format Selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Formato
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsFormatOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-left text-sm text-neutral-800 dark:text-neutral-100 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
            aria-haspopup="listbox"
            aria-expanded={isFormatOpen}
          >
            <span className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6">
                <BarcodeSvg type={svgType} size={20} />
              </span>
              <span>{meta.label}</span>
            </span>
            <ChevronDownIcon className="w-4 h-4 text-neutral-400" />
          </button>

          {isFormatOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsFormatOpen(false)} />
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg overflow-hidden">
                {(Object.keys(BARCODE_FORMAT_METADATA) as BarcodeFormat[]).map((format) => {
                  const m = BARCODE_FORMAT_METADATA[format];
                  const isSelected = format === barcode.format;
                  return (
                    <button
                      key={format}
                      type="button"
                      onClick={() => handleFormatSelect(format)}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className="inline-flex items-center justify-center w-6 h-6 mt-0.5 flex-shrink-0">
                        <BarcodeSvg type={formatToBarcodeSvgType(format)} size={20} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-neutral-800 dark:text-neutral-100'}`}>
                            {m.label}
                          </span>
                          <span className="flex items-center gap-1">
                            <AppleIcon className={`w-3.5 h-3.5 ${m.appleSupported ? 'text-neutral-400' : 'text-red-400'}`} />
                            <GoogleIcon className={`w-3.5 h-3.5 ${m.googleSupported ? 'text-neutral-400' : 'text-red-400'}`} />
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                          {m.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Platform Warnings */}
      <div className="space-y-2">
        {!meta.appleSupported && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <span className="text-base leading-none mt-0.5" role="img" aria-label="Apple warning">🍎</span>
            <p className="text-xs text-red-700 dark:text-red-300">
              Este formato no es compatible con Apple Wallet. Los usuarios de iPhone no verán el código.
            </p>
          </div>
        )}
        {!meta.googleSupported && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <span className="text-base leading-none mt-0.5" role="img" aria-label="Google warning">🤖</span>
            <p className="text-xs text-red-700 dark:text-red-300">
              Este formato no es compatible con Google Wallet. Los usuarios de Android no verán el código.
            </p>
          </div>
        )}
        {meta.appleSupported && meta.googleSupported && (
          <div className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
            <AppleIcon className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
            <GoogleIcon className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
            <p className="text-xs text-green-700 dark:text-green-300">
              Compatible con Apple Wallet y Google Wallet.
            </p>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="space-y-2">
        <label htmlFor="barcode-message" className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Mensaje
        </label>
        <input
          id="barcode-message"
          type="text"
          value={barcode.message}
          onChange={(e) => onUpdateBarcode({ message: e.target.value })}
          placeholder="{customer_id}-{program_id}-{timestamp}"
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Patrón recomendado: <code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px]">{'{customer_id}'}-{'{program_id}'}-{'{timestamp}'}</code>
        </p>
      </div>

      {/* Data Builder Helper */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Insertar Variables
        </label>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDERS.map((ph) => (
            <button
              key={ph.key}
              type="button"
              onClick={() => handleInsertPlaceholder(ph.key)}
              className="px-2.5 py-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              {ph.label}
            </button>
          ))}
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 p-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Ejemplo generado</p>
            <code className="block text-xs text-neutral-700 dark:text-neutral-300 font-mono truncate">{example}</code>
          </div>
          <button
            type="button"
            onClick={copyExample}
            className="p-1.5 rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            aria-label="Copiar ejemplo"
            title="Copiar ejemplo"
          >
            <CopyIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message Encoding */}
      <div className="space-y-2">
        <label htmlFor="barcode-encoding" className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Codificación
        </label>
        <select
          id="barcode-encoding"
          value={barcode.messageEncoding}
          onChange={(e) => onUpdateBarcode({ messageEncoding: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {MESSAGE_ENCODINGS.map((enc) => (
            <option key={enc.value} value={enc.value}>
              {enc.label}
            </option>
          ))}
        </select>
      </div>

      {/* Alt Text */}
      <div className="space-y-2">
        <label htmlFor="barcode-alt-text" className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Texto alternativo (opcional)
        </label>
        <input
          id="barcode-alt-text"
          type="text"
          value={barcode.altText ?? ''}
          onChange={(e) => onUpdateBarcode({ altText: e.target.value || undefined })}
          placeholder="Texto mostrado debajo del código"
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Barcode Preview */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Vista previa
        </label>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50 p-6">
          <div className="flex items-center justify-center w-40 h-40 bg-white rounded-lg border border-neutral-100 dark:border-neutral-700">
            <BarcodeSvg type={svgType} size={140} />
          </div>
          {barcode.altText && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400">{barcode.altText}</p>
          )}
          <div className="text-center">
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono truncate max-w-[280px]">
              {barcode.message || '{customer_id}-{program_id}-{timestamp}'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
