/* designerV2/sections/AdvancedSection.tsx — NFC, review status, settings */

'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { GOOGLE_DEVICE_SHARING_OPTIONS } from '../constants';
import type { WalletDesignState } from '../types';

function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />
      <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">{children}</p>
    </div>
  );
}

/* ─── Toggle Switch ───────────────────────────────────────────────── */
function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start justify-between gap-4 py-2 ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description && <span className="block text-xs text-muted-foreground mt-0.5">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-150 shrink-0 mt-0.5
          ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </label>
  );
}

/* ─── Main Section ────────────────────────────────────────────────── */
export interface AdvancedSectionProps {
  walletDesign: WalletDesignState;
  onWalletDesignChange: (state: WalletDesignState) => void;
}

export function AdvancedSection({ walletDesign, onWalletDesignChange }: AdvancedSectionProps) {
  const isApple = walletDesign.provider === 'apple';

  const updateAppleNfc = (nfc: Partial<WalletDesignState['appleNfc']>) => {
    onWalletDesignChange({
      ...walletDesign,
      appleNfc: { ...walletDesign.appleNfc, ...nfc },
    });
  };

  const updateAppleAdvanced = (adv: Partial<WalletDesignState['appleAdvanced']>) => {
    onWalletDesignChange({
      ...walletDesign,
      appleAdvanced: { ...walletDesign.appleAdvanced, ...adv },
    });
  };

  const updateGoogleAdvanced = (adv: Partial<WalletDesignState['googleAdvanced']>) => {
    onWalletDesignChange({
      ...walletDesign,
      googleAdvanced: { ...walletDesign.googleAdvanced, ...adv },
    });
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Configuración avanzada</h2>

      {isApple ? (
        <div className="space-y-4">
          {/* Apple Wallet Settings */}
          <div className="border border-border rounded-xl p-4 space-y-1">
            <h3 className="text-sm font-medium text-foreground mb-3">Apple Wallet</h3>

            <ToggleSwitch
              label="NFC activado"
              description="Solo funciona si Apple aprobó NFC y la clave pública NFC está en Vault."
              checked={walletDesign.appleNfc.nfc_enabled}
              onChange={(v) => updateAppleNfc({ nfc_enabled: v })}
            />
            <div className="h-px bg-border my-1" />
            <ToggleSwitch
              label="Requerir autenticación NFC"
              description="Solicita Face ID, Touch ID o código antes de presentar NFC."
              checked={walletDesign.appleNfc.nfc_requires_authentication}
              onChange={(v) => updateAppleNfc({ nfc_requires_authentication: v })}
              disabled={!walletDesign.appleNfc.nfc_enabled}
            />
            <div className="h-px bg-border my-1" />
            <ToggleSwitch
              label="Prohibir compartir"
              checked={walletDesign.appleAdvanced.sharingProhibited}
              onChange={(v) => updateAppleAdvanced({ sharingProhibited: v })}
            />
            <div className="h-px bg-border my-1" />
            <ToggleSwitch
              label="Suprimir brillo de tira"
              checked={walletDesign.appleAdvanced.suppressStripShine}
              onChange={(v) => updateAppleAdvanced({ suppressStripShine: v })}
            />
            <div className="h-px bg-border my-1" />
            <div className="py-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">Mensaje NFC</label>
              <input
                type="text"
                value={walletDesign.appleAdvanced.nfcMessage}
                onChange={e => updateAppleAdvanced({ nfcMessage: e.target.value })}
                placeholder="Mensaje al escanear NFC..."
                className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="py-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">Fecha de expiración</label>
              <input
                type="date"
                value={walletDesign.appleAdvanced.expirationDate}
                onChange={e => updateAppleAdvanced({ expirationDate: e.target.value })}
                className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Google Wallet Settings */}
          <div className="border border-border rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-medium text-foreground mb-1">Google Wallet</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Estado de revisión</label>
              <select
                value={walletDesign.googleAdvanced.reviewStatus}
                onChange={e => updateGoogleAdvanced({ reviewStatus: e.target.value as WalletDesignState['googleAdvanced']['reviewStatus'] })}
                className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="underReview">En revisión</option>
                <option value="approved">Aprobado</option>
                <option value="rejected">Rechazado</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Compartir dispositivos</label>
              <select
                value={walletDesign.googleAdvanced.allowMultipleUsers}
                onChange={e => updateGoogleAdvanced({ allowMultipleUsers: e.target.value })}
                className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {GOOGLE_DEVICE_SHARING_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <ToggleSwitch
              label="Notificar cambios"
              checked={walletDesign.googleAdvanced.notifyPreference}
              onChange={(v) => updateGoogleAdvanced({ notifyPreference: v })}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Página principal</label>
              <input
                type="url"
                value={walletDesign.googleAdvanced.homepageUri}
                onChange={e => updateGoogleAdvanced({ homepageUri: e.target.value })}
                placeholder="https://..."
                className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Página de ayuda</label>
              <input
                type="url"
                value={walletDesign.googleAdvanced.helpUri}
                onChange={e => updateGoogleAdvanced({ helpUri: e.target.value })}
                placeholder="https://..."
                className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
