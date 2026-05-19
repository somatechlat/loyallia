/* designerV2/cards/FlatAppleCard.tsx — Apple pass card without phone frame */

'use client';

import React from 'react';
import {
  APPLE_PASS_STYLES,
  CardTypeIcon,
} from '../constants';
import type { WalletDesignState } from '../types';
import { BarcodeSvg } from '../WalletCardPreview';

/* ─── Helper: resolve template values ─────────────────────────────── */
function resolveTemplate(value: string, ctx: Record<string, string>): string {
  return value.replace(/\{(\w+)\}/g, (_, key) => ctx[key] ?? `{${key}}`);
}

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

/* ─── Types ───────────────────────────────────────────────────────── */
export interface FlatAppleCardProps {
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
  view?: 'front' | 'back';
}

/* ─── Component ───────────────────────────────────────────────────── */
export function FlatAppleCard({
  form,
  selectedType,
  logoPreview,
  stripPreview,
  barcodeType,
  customerName,
  walletDesign,
  view = 'front',
}: FlatAppleCardProps) {
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const passStyle = APPLE_PASS_STYLES[form.card_type] || 'generic';
  const heroImage = walletDesign?.appleStripUrl || walletDesign?.appleStrip2xUrl || stripPreview || form.strip_image_url;
  const hasStrip = heroImage && (passStyle === 'storeCard' || passStyle === 'coupon');
  const isCoupon = passStyle === 'coupon';
  const isGeneric = passStyle === 'generic';
  const ctx = buildContext(form, customerName);

  const appleFields = walletDesign?.appleFields;
  const headerFields = appleFields?.headerFields?.length ? appleFields.headerFields : undefined;
  const primaryFields = appleFields?.primaryFields?.length ? appleFields.primaryFields : undefined;
  const secondaryFields = appleFields?.secondaryFields?.length ? appleFields.secondaryFields : undefined;
  const auxiliaryFields = appleFields?.auxiliaryFields?.length ? appleFields.auxiliaryFields : undefined;
  const backFields = appleFields?.backFields?.length ? appleFields.backFields : undefined;

  const defaultPrimary: { label: string; value: string } = {
    stamp:             { label: 'Sellos acumulados', value: '0 / 10' },
    cashback:          { label: 'Saldo disponible', value: '$0.00' },
    coupon:            { label: form.description || 'Descuento especial', value: '20% OFF' },
    vip_membership:    { label: 'Membresía', value: 'Club VIP' },
    referral_pass:     { label: 'Tu código de referido', value: 'REF-XXXX' },
    discount:          { label: 'Descuento actual', value: '5%' },
    gift_certificate:  { label: 'Saldo del regalo', value: '$0.00' },
    affiliate:         { label: 'Programa', value: form.name || 'Afiliación' },
    corporate_discount:{ label: 'Descuento corporativo', value: '0%' },
    multipass:         { label: 'Usos restantes', value: '10' },
  }[form.card_type] || { label: '', value: '—' };

  const defaultAux: Array<{ label: string; value: string }> = [
    { label: 'CLIENTE', value: customerName || 'Cliente' },
    { label: 'VÁLIDO HASTA', value: '31/12/2026' },
  ];

  const defaultHeaderValue: Record<string, string> = {
    stamp: '0/10', cashback: '$0.00', coupon: 'Cupón', vip_membership: 'VIP',
    referral_pass: '0', discount: 'Bronce', gift_certificate: '$0',
    affiliate: form.name?.slice(0, 6) || '—', corporate_discount: '0%', multipass: '10/10',
  };
  const defaultHeaderLabel: Record<string, string> = {
    stamp: 'SELLOS', cashback: 'SALDO', coupon: 'OFERTA', vip_membership: 'NIVEL',
    referral_pass: 'REFERIDOS', discount: 'NIVEL', gift_certificate: 'SALDO',
    affiliate: 'PROGRAMA', corporate_discount: 'DESC.', multipass: 'USOS',
  };

  const auxItems: Array<{ label: string; value: string }> = auxiliaryFields || defaultAux;

  /* ── BACK VIEW ── */
  if (view === 'back' && backFields && backFields.length > 0) {
    return (
      <div
        className="rounded-2xl overflow-hidden flex flex-col shadow-xl"
        style={{
          background: bgColor,
          color: textColor,
          boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        {/* Back header */}
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-[10px] font-semibold uppercase tracking-widest opacity-30">Detalles traseros</p>
        </div>
        {/* Back fields */}
        <div className="px-4 py-3 space-y-2.5">
          {backFields.map((f, i) => (
            <div key={f.key || i}>
              <p className="text-[8px] font-semibold uppercase tracking-wider opacity-40 mb-0.5">{f.label}</p>
              <p className="text-[11px] opacity-90 leading-relaxed">{resolveTemplate(f.value, ctx)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── FRONT VIEW ── */
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col shadow-xl"
      style={{
        background: bgColor,
        color: textColor,
        boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2)',
      }}
    >
      {/* Perforated edge for coupon */}
      {isCoupon && (
        <div
          className="absolute top-2 left-3 right-3 h-0.5 z-20"
          style={{ background: `repeating-linear-gradient(90deg, ${textColor}30 0px, ${textColor}30 5px, transparent 5px, transparent 9px)` }}
        />
      )}

      {/* Strip image */}
      {hasStrip && (
        <div className="relative w-full shrink-0" style={{ aspectRatio: '375/123' }}>
          <img src={heroImage} alt="Strip" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: `linear-gradient(to bottom, transparent, ${bgColor})` }} />
        </div>
      )}

      {/* ── HEADER ── */}
      <div className={`px-3.5 flex items-center gap-2.5 shrink-0 ${hasStrip ? 'pt-2.5 pb-1.5' : 'pt-3.5 pb-1.5'}`}>
        {/* Logo */}
        {(walletDesign?.appleLogoUrl || walletDesign?.appleLogo2xUrl || logoPreview) ? (
          <div className="shrink-0 w-[60px] h-[22px] rounded overflow-hidden border border-white/10 shadow-sm bg-white/5 flex items-center justify-center">
            <img
              src={walletDesign?.appleLogoUrl || walletDesign?.appleLogo2xUrl || logoPreview!}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="shrink-0 w-[60px] h-[22px] rounded bg-white/10 flex items-center justify-center border border-white/5">
            <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Program name */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[10px] font-bold truncate leading-tight">{form.name || 'Nombre del Programa'}</p>
        </div>

        {/* Header fields */}
        {headerFields ? (
          <div className="flex gap-2.5 shrink-0 pt-0.5">
            {headerFields.slice(0, 3).map((f, i) => (
              <div key={f.key || i} className="text-right shrink-0">
                <p className="text-[7px] font-semibold uppercase tracking-wider opacity-30 leading-none mb-0.5 truncate max-w-[52px]">{f.label}</p>
                <p className="text-[10px] font-black leading-none truncate max-w-[52px]">{resolveTemplate(f.value, ctx)}</p>
              </div>
            ))}
          </div>
        ) : (
          defaultHeaderValue[form.card_type] && (
            <div className="text-right shrink-0 pt-0.5">
              <p className="text-[7px] font-semibold uppercase tracking-wider opacity-30 leading-none mb-0.5">{defaultHeaderLabel[form.card_type]}</p>
              <p className="text-[10px] font-black leading-none">{defaultHeaderValue[form.card_type]}</p>
            </div>
          )
        )}

        {/* Thumbnail — generic only */}
        {isGeneric && (walletDesign?.appleThumbnailUrl || walletDesign?.appleThumbnail2xUrl || heroImage) && (
          <img
            src={walletDesign?.appleThumbnailUrl || walletDesign?.appleThumbnail2xUrl || heroImage}
            alt="Thumbnail"
            className="w-9 h-9 rounded object-cover border border-white/10 shadow-sm shrink-0"
          />
        )}
      </div>

      {/* ── PRIMARY FIELD ── */}
      <div className="px-3.5 pt-1 pb-1 shrink-0 min-h-[48px] overflow-hidden">
        {primaryFields ? (
          primaryFields.map((f, i) => (
            <div key={f.key || i}>
              <p className="text-[8px] font-semibold uppercase tracking-wider opacity-35 leading-none mb-1 truncate">{f.label}</p>
              <p className="text-[22px] font-black leading-none tracking-tight truncate">{resolveTemplate(f.value, ctx)}</p>
            </div>
          ))
        ) : (
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-wider opacity-35 leading-none mb-1 truncate">{defaultPrimary.label}</p>
            <p className="text-[22px] font-black leading-none tracking-tight truncate">{defaultPrimary.value}</p>
          </div>
        )}
      </div>

      {/* ── SECONDARY FIELDS ── */}
      {secondaryFields && secondaryFields.length > 0 && (
        <div className="px-3.5 pt-1.5 pb-1 shrink-0 min-h-[34px] overflow-hidden">
          <div className="grid grid-cols-4 gap-2">
            {secondaryFields.slice(0, 4).map((f, i) => (
              <div key={f.key || i} className="min-w-0 overflow-hidden">
                <p className="text-[7px] font-semibold uppercase tracking-wider opacity-30 leading-none mb-0.5 truncate">{f.label}</p>
                <p className="text-[11px] font-semibold opacity-85 leading-tight truncate">{resolveTemplate(f.value, ctx)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AUXILIARY FIELDS ── */}
      <div className={`px-3.5 shrink-0 min-h-[30px] overflow-hidden ${secondaryFields && secondaryFields.length > 0 ? 'pt-1.5 pb-2' : 'pt-2 pb-2'}`}>
        <div className="grid grid-cols-4 gap-2">
          {auxItems.slice(0, 4).map((f, i) => (
            <div key={(f as any).key || i} className="min-w-0 overflow-hidden">
              <p className="text-[6px] font-semibold uppercase tracking-wider opacity-30 leading-none mb-0.5 truncate">{f.label}</p>
              <p className="text-[10px] font-semibold opacity-85 leading-tight truncate">{resolveTemplate(f.value, ctx)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1 min-h-4" />

      {/* ── BARCODE ── */}
      <div className="px-3.5 pb-3.5 pt-1 shrink-0">
        <div className="bg-white rounded-lg p-2 shadow-sm flex flex-col items-center gap-1">
          <BarcodeSvg type={barcodeType} size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 68 : 38} />
          <span className="text-[6px] text-black text-opacity-40 font-mono tracking-wider">0000 0000 0000</span>
        </div>
      </div>
    </div>
  );
}
