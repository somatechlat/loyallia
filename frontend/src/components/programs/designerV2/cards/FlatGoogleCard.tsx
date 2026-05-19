/* designerV2/cards/FlatGoogleCard.tsx — Google pass card without phone frame */

'use client';

import React from 'react';
import {
  GOOGLE_WALLET_TYPES,
  CardTypeIcon,
} from '../../constants';
import type { WalletDesignState } from '../types';
import { BarcodeSvg } from '../../WalletCardPreview';

/* ─── Helper: resolve template values ─────────────────────────────── */
function buildContext(form: { name: string; description: string; card_type: string }, customerName?: string): Record<string, string> {
  return {
    customer_name: customerName || 'Cliente',
    program_name: form.name || 'Programa',
    description: form.description || '',
    stamp_count: '0',
    stamps_required: '10',
    reward_description: 'Recompensa especial',
    cashback_balance: '0.00',
    cashback_percentage: '5',
    membership_tier: 'Club VIP',
    referral_code: 'REF-XXXX',
    referrals_made: '0',
    discount_percentage: '5',
    discount_tier: 'Bronce',
    gift_balance: '0.00',
    affiliate_code: 'AFIL-001',
    enrolled_date: '01/01/2025',
    benefits: 'Beneficios exclusivos',
    company_name: 'Empresa',
    corporate_discount: '10',
    multipass_remaining: '10',
    bundle_size: '10',
    bundle_price: '25.00',
    stamp_display: '0 / 10',
    perks: 'Acceso prioritario',
    expiry_days: '365',
    tiers_list: 'Bronce 5%, Plata 10%, Oro 15%',
  };
}

function getGoogleSampleValue(fieldPath: string, ctx: Record<string, string>): string {
  const map: Record<string, string> = {
    'object.accountName': ctx.customer_name || 'Cliente',
    'object.loyaltyPoints.balance': '1,250',
    'object.loyaltyPoints.label': 'Puntos',
    'object.secondaryLoyaltyPoints.balance': '500',
    'object.secondaryLoyaltyPoints.label': 'Estrellas',
    'class.rewardsTier': 'Oro',
    'class.rewardsTierLabel': 'Nivel',
    'class.programName': ctx.program_name || 'Programa',
    'class.issuerName': 'Negocio',
    'object.balance.money': '$25.00',
  };
  return map[fieldPath] || ctx[fieldPath.replace(/\./g, '_')] || '—';
}

/* ─── Types ───────────────────────────────────────────────────────── */
export interface FlatGoogleCardProps {
  form: {
    name: string;
    description: string;
    background_color: string;
    text_color: string;
    card_type: string;
    strip_image_url?: string;
  };
  selectedType?: { icon: string; label: string };
  logoPreview?: string | null;
  stripPreview?: string | null;
  barcodeType: string;
  customerName?: string;
  walletDesign?: WalletDesignState;
}

/* ─── Component ───────────────────────────────────────────────────── */
export function FlatGoogleCard({
  form,
  selectedType,
  logoPreview,
  stripPreview,
  barcodeType,
  customerName,
  walletDesign,
}: FlatGoogleCardProps) {
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const heroImage = walletDesign?.googleHeroImageUrl || stripPreview || form.strip_image_url;
  const logoImage = walletDesign?.googleProgramLogoUrl || logoPreview;
  const ctx = buildContext(form, customerName);

  const googleRows = walletDesign?.googleRows;
  const hasCustomRows = googleRows && googleRows.length > 0;

  const defaultRows: Array<{ label: string; value: string }> = [
    { label: 'Miembro', value: customerName || 'Cliente' },
  ];
  switch (form.card_type) {
    case 'stamp':             defaultRows.push({ label: 'Sellos', value: '0 / 10' }); break;
    case 'cashback':          defaultRows.push({ label: 'Saldo', value: '$0.00' }); break;
    case 'coupon':            defaultRows.push({ label: 'Descuento', value: form.description || 'Especial' }); break;
    case 'vip_membership':    defaultRows.push({ label: 'Nivel', value: 'Club VIP' }); break;
    case 'referral_pass':     defaultRows.push({ label: 'Código', value: 'REF-XXXX' }); break;
    case 'discount':          defaultRows.push({ label: 'Descuento actual', value: '5%' }); break;
    case 'gift_certificate':  defaultRows.push({ label: 'Saldo', value: '$0.00' }); break;
    case 'affiliate':         defaultRows.push({ label: 'Programa', value: form.name || 'Afiliación' }); break;
    case 'corporate_discount':defaultRows.push({ label: 'Descuento', value: '0%' }); break;
    case 'multipass':         defaultRows.push({ label: 'Usos restantes', value: '10' }); break;
  }
  defaultRows.push({ label: 'Tipo', value: GOOGLE_WALLET_TYPES[form.card_type]?.label || 'Programa' });

  return (
    <div
      className="rounded-[28px] overflow-hidden flex flex-col shadow-xl"
      style={{
        background: bgColor,
        color: textColor,
        boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2)',
      }}
    >
      {/* Hero image */}
      {heroImage && (
        <div className="relative w-full shrink-0" style={{ aspectRatio: '16/7' }}>
          <img src={heroImage} alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: `linear-gradient(to bottom, transparent, ${bgColor})` }} />
        </div>
      )}

      {/* Logo circle */}
      <div className="flex flex-col items-center px-4 relative z-10 shrink-0" style={{ marginTop: heroImage ? -28 : 12 }}>
        <div className="w-14 h-14 rounded-[18px] overflow-hidden border-2 border-white/10 shadow-lg bg-neutral-900">
          {logoImage ? (
            <img src={logoImage} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/10">
              <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-7 h-7" />
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pt-2 pb-1 text-center shrink-0">
        <p className="text-[15px] font-bold leading-tight truncate">{form.name || 'Nombre del Programa'}</p>
        <p className="text-[10px] opacity-40 mt-0.5 font-medium truncate">{selectedType?.label || 'Programa de Fidelidad'}</p>
      </div>

      {/* Info rows with dividers */}
      <div className="px-3 pt-1.5 pb-1 shrink-0">
        {hasCustomRows ? (
          googleRows!.map((row, rIdx) => (
            <div key={row.id}>
              <div
                className="grid gap-2 py-2"
                style={{ gridTemplateColumns: `repeat(${row.type === 'oneItem' ? 1 : row.type === 'twoItems' ? 2 : 3}, 1fr)` }}
              >
                {row.items.map((item, iIdx) => (
                  <div key={item.id} className={`min-w-0 overflow-hidden ${row.type !== 'oneItem' && iIdx > 0 ? 'text-right' : ''}`}>
                    <p className="text-[8px] opacity-35 font-medium leading-none mb-0.5 truncate">{item.displayName || item.label || 'Campo'}</p>
                    <p className="text-[10px] font-semibold leading-tight truncate">
                      {getGoogleSampleValue(item.fieldPath, ctx)}
                    </p>
                  </div>
                ))}
              </div>
              {rIdx < googleRows!.length - 1 && <div className="h-px bg-white/10" />}
            </div>
          ))
        ) : (
          defaultRows.map((row, i) => (
            <div key={i}>
              <div className="flex justify-between items-baseline py-2">
                <span className="text-[8px] opacity-35 font-medium truncate max-w-[50%]">{row.label}</span>
                <span className="text-[10px] font-semibold text-right truncate max-w-[50%]">{row.value}</span>
              </div>
              {i < defaultRows.length - 1 && <div className="h-px bg-white/10" />}
            </div>
          ))
        )}
        {form.description && !hasCustomRows && (
          <>
            <div className="h-px bg-white/10" />
            <p className="text-[8px] opacity-30 line-clamp-2 pt-2 pb-1">{form.description}</p>
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1 min-h-4" />

      {/* Barcode */}
      <div className="px-3 pb-3.5 pt-1 shrink-0">
        <div className="bg-white rounded-2xl p-2 shadow-sm flex flex-col items-center gap-1">
          <BarcodeSvg type={barcodeType} size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 68 : 38} />
          <span className="text-[6px] text-black text-opacity-40 font-mono tracking-wider">0000 0000 0000</span>
        </div>
      </div>
    </div>
  );
}
