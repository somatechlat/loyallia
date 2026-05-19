import { CardTypeIcon, BARCODE_TYPES } from '@/components/programs/constants';
import WalletCardPreview from '@/components/programs/WalletCardPreview';
import type { AppleWalletFeatureConfig } from '@/components/programs/WalletCardPreview';

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
  logoPreview: string | null;
  stripPreview: string | null;
  walletProvider: 'apple' | 'google';
  setWalletProvider: (value: 'apple' | 'google') => void;
  appleWalletConfig: AppleWalletFeatureConfig;
}

export default function ProgramReviewStep({
  form,
  meta,
  selectedType,
  logoPreview,
  stripPreview,
  walletProvider,
  setWalletProvider,
  appleWalletConfig,
}: ProgramReviewStepProps) {
  return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <div className="card p-6 space-y-5">
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">Revisa tu programa</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-surface-100">
                <span className="text-sm text-surface-500">Tipo</span>
                <span className="text-sm font-semibold"><CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-4 h-4 inline-block mr-1" /> {selectedType?.label}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-100">
                <span className="text-sm text-surface-500">Nombre</span>
                <span className="text-sm font-semibold">{form.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-100">
                <span className="text-sm text-surface-500">Código</span>
                <span className="text-sm font-semibold">{BARCODE_TYPES.find(b => b.value === form.barcode_type)?.label || 'QR Code'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-100">
                <span className="text-sm text-surface-500">Billetera</span>
                <span className="text-sm font-semibold">{walletProvider === 'apple' ? 'Apple Wallet' : 'Google Wallet'}</span>
              </div>
              {walletProvider === 'apple' && (
                <div className="flex justify-between py-2 border-b border-surface-100">
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
                <div className="flex justify-between py-2 border-b border-surface-100">
                  <span className="text-sm text-surface-500">Descripción</span>
                  <span className="text-sm font-medium text-right max-w-[60%]">{form.description}</span>
                </div>
              )}
              {Object.entries(meta).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-surface-100">
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

            {/* Wallet features info */}
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm space-y-2">
              <p className="font-semibold text-brand-800">Funcionalidades de Wallet incluidas:</p>
              <ul className="text-brand-700 text-xs space-y-1 ml-4 list-disc">
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
              logoPreview={logoPreview}
              stripPreview={stripPreview}
              barcodeType={form.barcode_type}
              walletPlatform={walletProvider}
              onWalletPlatformChange={setWalletProvider}
            />
          </div>
        </div>

  );
}
