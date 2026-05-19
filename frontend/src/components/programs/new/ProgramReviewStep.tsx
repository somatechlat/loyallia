import { useState } from 'react';
import { CardTypeIcon, BARCODE_TYPES } from '@/components/programs/constants';
import WalletCardPreview from '@/components/programs/WalletCardPreview';
import type { AppleWalletFeatureConfig } from '@/components/programs/WalletCardPreview';
import type { WalletDesignState } from '@/components/programs/WalletDesigner';
import { APPLE_FIELD_GROUPS } from '@/components/programs/constants';

/** Spanish labels for all program metadata keys — prevents mixed languages in review step. */
const META_LABELS: Record<string, string> = {
  // Stamp
  stamp_type: 'Tipo de sello',
  consumption_per_stamp: 'Equivalencia consumo-sello',
  stamps_required: 'Sellos requeridos',
  reward_description: 'Descripción de la recompensa',
  stamp_expiry: 'Vigencia de la tarjeta',
  stamp_start_date: 'Fecha de inicio',
  stamp_end_date: 'Fecha de fin',
  stamps_at_issue: 'Sellos al emitir',
  daily_stamp_limit: 'Límite por día',
  birthday_stamps: 'Sellos cumpleaños',
  // Coupon
  discount_type: 'Tipo de descuento',
  discount_value: 'Valor del descuento',
  special_promotion_text: 'Descripción de la promoción',
  coupon_expiry: 'Vigencia del cupón',
  coupon_start_date: 'Fecha de inicio',
  coupon_end_date: 'Fecha de fin',
  usage_limit_per_customer: 'Usos máximos por cliente',
  coupon_description: 'Descripción del cupón',
  coupon_image_url: 'Imagen del cupón',
  push_title: 'Título de la notificación',
  push_message: 'Mensaje de la notificación',
  push_expiry_reminder: 'Recordatorio push antes de expirar',
  // Cashback
  cashback_percentage: 'Porcentaje de cashback',
  minimum_purchase: 'Compra mínima',
  credit_expiry_days: 'Días de expiración del crédito',
  // Discount
  tiers: 'Niveles de descuento',
  // Gift
  denominations: 'Denominaciones disponibles',
  expiry_days: 'Días de expiración',
  // VIP
  membership_name: 'Nombre de la membresía',
  monthly_fee: 'Cuota mensual',
  annual_fee: 'Cuota anual',
  validity_period: 'Periodo de validez',
  // Referral
  referrer_reward: 'Recompensa para el que refiere',
  referee_reward: 'Recompensa para el referido',
  max_referrals_per_customer: 'Máximo de referidos por cliente',
  // Multipass
  bundle_size: 'Cantidad de sellos en el paquete',
  bundle_price: 'Precio del paquete',
};

type ProgramForm = {
  name: string;
  card_type: string;
  description: string;
  background_color: string;
  text_color: string;
  logo_url: string;
  strip_image_url: string;
  icon_url: string;
  barcode_type: string;
  locations: Array<{ lat: number; lng: number; name: string }>;
};

type SelectedType = {
  value: string;
  label: string;
  icon: string;
  desc: string;
} | undefined;

interface ProgramReviewStepProps {
  form: ProgramForm;
  meta: Record<string, unknown>;
  selectedType: SelectedType;
  walletProvider: 'apple' | 'google';
  setWalletProvider: (value: 'apple' | 'google') => void;
  appleWalletConfig: AppleWalletFeatureConfig;
  walletDesign?: WalletDesignState;
}

function Checkmark({ filled }: { filled: boolean }) {
  return filled ? (
    <span className="text-green-500 text-sm">✓</span>
  ) : (
    <span className="text-surface-300 dark:text-surface-600 text-sm">○</span>
  );
}

export default function ProgramReviewStep({
  form,
  meta,
  selectedType,
  walletProvider,
  setWalletProvider,
  appleWalletConfig,
  walletDesign,
}: ProgramReviewStepProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const appleImages = walletDesign ? [
    { label: 'Logo', url: walletDesign.appleLogoUrl },
    { label: 'Logo @2x', url: walletDesign.appleLogo2xUrl },
    { label: 'Icono', url: walletDesign.appleIconUrl },
    { label: 'Icono @2x', url: walletDesign.appleIcon2xUrl },
    { label: 'Strip', url: walletDesign.appleStripUrl },
    { label: 'Strip @2x', url: walletDesign.appleStrip2xUrl },
    { label: 'Miniatura', url: walletDesign.appleThumbnailUrl },
    { label: 'Miniatura @2x', url: walletDesign.appleThumbnail2xUrl },
  ] : [];

  const googleImages = walletDesign ? [
    { label: 'Logo del programa', url: walletDesign.googleProgramLogoUrl },
    { label: 'Imagen hero', url: walletDesign.googleHeroImageUrl },
    { label: 'Logo ancho', url: walletDesign.googleWideLogoUrl },
    { label: 'Módulo de imagen', url: walletDesign.googleImageModuleUrl },
  ] : [];

  const appleFieldCounts = walletDesign
    ? APPLE_FIELD_GROUPS.map(g => ({
        label: g.label,
        count: (walletDesign.appleFields[g.key] || []).length,
      }))
    : [];

  const totalAppleFields = appleFieldCounts.reduce((sum, f) => sum + f.count, 0);
  const googleRowCount = walletDesign?.googleRows?.length ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      <div className="card p-6 space-y-5">
        <h2 className="text-lg font-bold text-surface-900 dark:text-white">Revisa tu programa</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
            <span className="text-sm text-surface-500">Tipo</span>
            <span className="text-sm font-semibold"><CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-4 h-4 inline-block mr-1" /> {selectedType?.label}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
            <span className="text-sm text-surface-500">Nombre</span>
            <span className="text-sm font-semibold">{form.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
            <span className="text-sm text-surface-500">Código</span>
            <span className="text-sm font-semibold">{BARCODE_TYPES.find(b => b.value === form.barcode_type)?.label || 'QR Code'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
            <span className="text-sm text-surface-500">Billetera</span>
            <span className="text-sm font-semibold">{walletProvider === 'apple' ? 'Apple Wallet' : 'Google Wallet'}</span>
          </div>
          {walletProvider === 'apple' && (
            <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
              <span className="text-sm text-surface-500">NFC Apple</span>
              <span className="text-sm font-semibold">
                {appleWalletConfig.nfc_enabled
                  ? appleWalletConfig.nfc_requires_authentication
                    ? 'Activado con autenticación'
                    : 'Activado'
                  : 'Desactivado'}
              </span>
            </div>
          )}
          {form.description && (
            <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
              <span className="text-sm text-surface-500">Descripción</span>
              <span className="text-sm font-medium text-right max-w-[60%]">{form.description}</span>
            </div>
          )}
          {Object.entries(meta).map(([key, value]) => (
            <div key={key} className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
              <span className="text-sm text-surface-500">{META_LABELS[key] || key.replace(/_/g, ' ')}</span>
              <span className="text-sm font-medium">
                {value === null || value === undefined
                  ? '—'
                  : typeof value === 'object'
                    ? Array.isArray(value)
                      ? `${value.length} item${value.length !== 1 ? 's' : ''}`
                      : Object.entries(value as Record<string, unknown>)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')
                    : String(value)}
              </span>
            </div>
          ))}
        </div>

        {/* Wallet Design Summary */}
        {walletDesign && (
          <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 space-y-3 bg-surface-50 dark:bg-surface-900/40">
            <h3 className="text-sm font-bold text-surface-900 dark:text-white">Diseño de Wallet</h3>

            <div className="flex justify-between py-1 border-b border-surface-100 dark:border-surface-700">
              <span className="text-xs text-surface-500">Plataforma</span>
              <span className="text-xs font-semibold">{walletDesign.provider === 'apple' ? 'Apple Wallet' : 'Google Wallet'}</span>
            </div>

            {/* Images */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-surface-700 dark:text-surface-200">Imágenes cargadas</p>
              {walletDesign.provider === 'apple' ? (
                <div className="grid grid-cols-2 gap-1">
                  {appleImages.map(img => (
                    <div key={img.label} className="flex items-center gap-1.5 text-xs">
                      <Checkmark filled={!!img.url} />
                      <span className={img.url ? 'text-surface-700 dark:text-surface-200' : 'text-surface-400 dark:text-surface-500'}>{img.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {googleImages.map(img => (
                    <div key={img.label} className="flex items-center gap-1.5 text-xs">
                      <Checkmark filled={!!img.url} />
                      <span className={img.url ? 'text-surface-700 dark:text-surface-200' : 'text-surface-400 dark:text-surface-500'}>{img.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fields / Rows */}
            {walletDesign.provider === 'apple' ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-surface-700 dark:text-surface-200">Campos configurados ({totalAppleFields})</p>
                <div className="grid grid-cols-2 gap-1">
                  {appleFieldCounts.map(f => (
                    <div key={f.label} className="flex items-center justify-between text-xs px-2 py-1 bg-white dark:bg-surface-800 rounded border border-surface-100 dark:border-surface-700">
                      <span className="text-surface-500">{f.label}</span>
                      <span className="font-semibold">{f.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex justify-between py-1 border-b border-surface-100 dark:border-surface-700">
                <span className="text-xs text-surface-500">Filas configuradas</span>
                <span className="text-xs font-semibold">{googleRowCount}</span>
              </div>
            )}

            {/* NFC status for Apple */}
            {walletDesign.provider === 'apple' && (
              <div className="flex justify-between py-1 border-b border-surface-100 dark:border-surface-700">
                <span className="text-xs text-surface-500">Estado NFC</span>
                <span className="text-xs font-semibold">
                  {walletDesign.appleNfc.nfc_enabled
                    ? walletDesign.appleNfc.nfc_requires_authentication
                      ? 'Activado con autenticación'
                      : 'Activado'
                    : 'Desactivado'}
                </span>
              </div>
            )}

            {/* Advanced settings toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full text-left text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium flex items-center gap-1"
            >
              {showAdvanced ? '▼' : '▶'} Configuración avanzada
            </button>
            {showAdvanced && walletDesign.provider === 'apple' && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-surface-500">Suprimir brillo strip</span>
                  <span className="font-medium">{walletDesign.appleAdvanced.suppressStripShine ? 'Sí' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Prohibir compartir</span>
                  <span className="font-medium">{walletDesign.appleAdvanced.sharingProhibited ? 'Sí' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Anulada</span>
                  <span className="font-medium">{walletDesign.appleAdvanced.voided ? 'Sí' : 'No'}</span>
                </div>
                {walletDesign.appleAdvanced.nfcMessage && (
                  <div className="flex justify-between">
                    <span className="text-surface-500">Mensaje NFC</span>
                    <span className="font-medium">{walletDesign.appleAdvanced.nfcMessage}</span>
                  </div>
                )}
                {walletDesign.appleAdvanced.expirationDate && (
                  <div className="flex justify-between">
                    <span className="text-surface-500">Expiración</span>
                    <span className="font-medium">{walletDesign.appleAdvanced.expirationDate}</span>
                  </div>
                )}
              </div>
            )}
            {showAdvanced && walletDesign.provider === 'google' && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-surface-500">Estado de revisión</span>
                  <span className="font-medium">{walletDesign.googleAdvanced.reviewStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Compartir dispositivos</span>
                  <span className="font-medium">{walletDesign.googleAdvanced.allowMultipleUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Notificar cambios</span>
                  <span className="font-medium">{walletDesign.googleAdvanced.notifyPreference ? 'Sí' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Enlaces adicionales</span>
                  <span className="font-medium">{walletDesign.googleAdvanced.linksModuleUris.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Mensajes</span>
                  <span className="font-medium">{walletDesign.googleAdvanced.messages.length}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wallet features info */}
        <div className="bg-brand-50 border border-brand-100 dark:bg-brand-900/20 dark:border-brand-800 rounded-xl p-4 text-sm space-y-2">
          <p className="font-semibold text-brand-800 dark:text-brand-200">Funcionalidades de Wallet incluidas:</p>
          <ul className="text-brand-700 dark:text-brand-300 text-xs space-y-1 ml-4 list-disc">
            <li>Tarjeta digital en {walletProvider === 'apple' ? 'Apple Wallet' : 'Google Wallet'}</li>
            <li>Código QR único por cliente</li>
            <li>Notificaciones push por geolocalización</li>
            <li>Actualización en tiempo real</li>
            {walletProvider === 'apple' && appleWalletConfig.nfc_enabled && (
              <li>NFC Apple sujeto a aprobación Apple, Vault y lector VAS compatible</li>
            )}
          </ul>
        </div>
      </div>

      {/* Preview */}
      <div className="sticky top-24 self-start bg-gradient-to-b from-surface-100 to-surface-200 dark:from-surface-800 dark:to-surface-900 rounded-2xl p-6 shadow-inner">
        <WalletCardPreview
          form={form}
          selectedType={selectedType}
          barcodeType={form.barcode_type}
          walletPlatform={walletProvider}
          onWalletPlatformChange={setWalletProvider}
          walletDesign={walletDesign}
        />
      </div>
    </div>
  );
}
