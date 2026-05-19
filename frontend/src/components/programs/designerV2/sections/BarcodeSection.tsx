/* designerV2/sections/BarcodeSection.tsx — Barcode type selector */

'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { BARCODE_TYPES } from '../constants';
import { BarcodeSvg } from '../WalletCardPreview';

function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />
      <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">{children}</p>
    </div>
  );
}

export interface BarcodeSectionProps {
  barcodeType: string;
  onBarcodeTypeChange: (type: string) => void;
}

export function BarcodeSection({ barcodeType, onBarcodeTypeChange }: BarcodeSectionProps) {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Código de barras</h2>

      <InfoCallout>
        El código de barras permite escanear el pase en el punto de venta.
      </InfoCallout>

      {/* Type grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Tipo de código</h3>
        <div className="grid grid-cols-3 gap-2">
          {BARCODE_TYPES.map(bt => (
            <button
              key={bt.value}
              type="button"
              onClick={() => onBarcodeTypeChange(bt.value)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-150
                ${barcodeType === bt.value
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-muted-foreground/30'
                }`}
            >
              <div className="w-10 h-10 flex items-center justify-center">
                <BarcodeSvg type={bt.value} size={38} />
              </div>
              <span className="text-[10px] font-semibold text-foreground text-center leading-tight">{bt.label}</span>
            </button>
          ))}
        </div>
        {barcodeType && (
          <p className="text-xs text-muted-foreground italic">
            {BARCODE_TYPES.find(b => b.value === barcodeType)?.desc}
          </p>
        )}
      </div>

      {/* Sample code */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Código de ejemplo</label>
        <input
          type="text"
          value="LOYALTY-123456"
          readOnly
          className="w-full h-9 px-3 text-sm rounded-md border border-input bg-muted font-mono"
        />
        <InfoCallout>
          El código real será generado automáticamente para cada miembro.
        </InfoCallout>
      </div>
    </div>
  );
}
