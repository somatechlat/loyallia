'use client';
import { useState, useRef } from 'react';
import { programsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:33905';

/** Upload file to /api/v1/upload/ with JWT auth */
async function uploadFileAuth(file: File): Promise<string | null> {
  const token = Cookies.get('access_token');
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch(`${API_URL}/api/v1/upload/`, {
      method: 'POST',
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      return data.url || null;
    }
    return null;
  } catch {
    return null;
  }
}

/* ─── Flat SVG Icon Component ─────────────────────────────────────────── */
const ICON_PATHS: Record<string, string> = {
  stamp: 'M3 3h18v18H3zM9 12h6M12 9v6',
  dollar: 'M12 2a10 10 0 100 20 10 10 0 000-20zM16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8M12 18V6',
  ticket: 'M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2z',
  handshake: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z',
  crown: 'M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zM3 20h18',
  building: 'M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01',
  megaphone: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
};

function CardTypeIcon({ icon, className = 'w-5 h-5' }: { icon: string; className?: string }) {
  const d = ICON_PATHS[icon] || ICON_PATHS['stamp'];
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {d.split(/(?=[A-Z])/).length > 3 ?
        d.split('z').map((seg, i) => seg.trim() ? <path key={i} d={seg.trim() + (i < d.split('z').length - 1 ? 'z' : '')} /> : null)
        : <path d={d} />
      }
    </svg>
  );
}

/* ─── Card Type Registry ──────────────────────────────────────────────── */
const CARD_TYPES = [
  { value: 'stamp',              label: 'Tarjeta de Sellos',           icon: 'stamp', desc: 'Compra X, obtén 1 gratis' },
  { value: 'cashback',           label: 'Cashback / Puntos',           icon: 'dollar', desc: 'Devuelve un porcentaje de cada compra' },
  { value: 'coupon',             label: 'Cupón de Descuento',          icon: 'ticket', desc: 'Cupón al registrarse en el programa' },
  { value: 'affiliate',          label: 'Afiliación',                  icon: 'handshake', desc: 'Regístrate para recibir promociones' },
  { value: 'discount',           label: 'Descuento por Niveles',       icon: 'layers', desc: 'Descuentos progresivos por gasto acumulado' },
  { value: 'gift_certificate',   label: 'Certificado de Regalo',       icon: 'gift', desc: 'Certificados de regalo digitales' },
  { value: 'vip_membership',     label: 'Membresía VIP',               icon: 'crown', desc: 'Club VIP con pagos recurrentes' },
  { value: 'corporate_discount', label: 'Descuento Corporativo',       icon: 'building', desc: 'Descuentos especiales para empresas' },
  { value: 'referral_pass',      label: 'Programa de Referidos',       icon: 'megaphone', desc: 'Recompensa por traer nuevos clientes' },
  { value: 'multipass',          label: 'Multipase Prepagado',         icon: 'refresh', desc: 'Sellos prepagados en paquete' },
];

/* ─── Design Templates ──────────────────────────────────────────────── */
const DESIGN_TEMPLATES = [
  { id: 'midnight',  name: 'Medianoche',     bg: '#1A1A2E', text: '#FFFFFF', accent: '#E2E8F0' },
  { id: 'ocean',     name: 'Océano',         bg: '#0F3460', text: '#FFFFFF', accent: '#16C79A' },
  { id: 'sunset',    name: 'Atardecer',      bg: '#FF6B35', text: '#FFFFFF', accent: '#FFF5EE' },
  { id: 'forest',    name: 'Bosque',         bg: '#0F766E', text: '#FFFFFF', accent: '#CCFBF1' },
  { id: 'royal',     name: 'Realeza',        bg: '#4C1D95', text: '#FFFFFF', accent: '#DDD6FE' },
  { id: 'rose',      name: 'Rosa',           bg: '#9F1239', text: '#FFFFFF', accent: '#FFF1F2' },
  { id: 'gold',      name: 'Dorado',         bg: '#78350F', text: '#F9D923', accent: '#FFFBEB' },
  { id: 'arctic',    name: 'Ártico',         bg: '#1E40AF', text: '#FFFFFF', accent: '#BFDBFE' },
  { id: 'slate',     name: 'Pizarra',        bg: '#334155', text: '#F8FAFC', accent: '#94A3B8' },
  { id: 'emerald',   name: 'Esmeralda',      bg: '#065F46', text: '#FFFFFF', accent: '#A7F3D0' },
  { id: 'cherry',    name: 'Cereza',         bg: '#BE123C', text: '#FFFFFF', accent: '#FFE4E6' },
  { id: 'custom',    name: 'Personalizado',  bg: '', text: '', accent: '' },
];

/* ─── Step indicator ──────────────────────────────────────────────────── */
function StepBar({ step }: { step: number }) {
  const steps = ['Tipo', 'Configuración', 'Diseño', 'Revisión'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
            transition-all duration-300
            ${i < step ? 'bg-brand-500 text-white' :
              i === step ? 'bg-brand-500 text-white shadow-glow' :
              'bg-surface-100 text-surface-400'}`}>
            {i < step ? '✓' : i + 1}
          </div>
          <span className={`text-xs font-semibold hidden sm:block
            ${i <= step ? 'text-surface-900' : 'text-surface-400'}`}>{label}</span>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 rounded-full transition-all duration-300 mx-1
              ${i < step ? 'bg-brand-500' : 'bg-surface-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Default metadata per card type ──────────────────────────────────── */
function defaultMeta(type: string): Record<string, unknown> {
  switch (type) {
    case 'stamp':             return { stamps_required: 10, reward_description: 'Artículo gratis' };
    case 'cashback':          return { cashback_percentage: 5, minimum_purchase: 0, credit_expiry_days: 365 };
    case 'coupon':            return { discount_type: 'percentage', discount_value: 10, usage_limit_per_customer: 1, coupon_description: '10% de descuento en tu próxima compra' };
    case 'affiliate':         return {};
    case 'discount':          return { tiers: [{ tier_name: 'Bronce', threshold: 0, discount_percentage: 5 }, { tier_name: 'Plata', threshold: 100, discount_percentage: 10 }, { tier_name: 'Oro', threshold: 500, discount_percentage: 15 }] };
    case 'gift_certificate':  return { denominations: [10, 25, 50], expiry_days: 365 };
    case 'vip_membership':    return { membership_name: 'Club VIP', monthly_fee: 9.99, annual_fee: 99, validity_period: 'monthly' };
    case 'corporate_discount':return {};
    case 'referral_pass':     return { referrer_reward: 'Descuento del 10%', referee_reward: '5% de descuento', max_referrals_per_customer: 10 };
    case 'multipass':         return { bundle_size: 10, bundle_price: 25 };
    default:                  return {};
  }
}

/* ─── Type-specific configuration fields ──────────────────────────────── */
function TypeConfig({ type, meta, setMeta }: { type: string; meta: Record<string, unknown>; setMeta: (m: Record<string, unknown>) => void }) {
  const set = (k: string, v: unknown) => setMeta({ ...meta, [k]: v });

  switch (type) {
    case 'stamp':
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Sellos requeridos para la recompensa</label>
            <input type="number" min={1} max={99} className="input" value={meta.stamps_required as number ?? 10}
              onChange={e => set('stamps_required', parseInt(e.target.value) || 10)} />
          </div>
          <div>
            <label className="label">Descripción de la recompensa</label>
            <input type="text" className="input" placeholder="Ej: Café gratis" value={meta.reward_description as string ?? ''}
              onChange={e => set('reward_description', e.target.value)} />
          </div>
        </div>
      );
    case 'cashback':
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Porcentaje de cashback (%)</label>
            <input type="number" min={0.01} max={99.99} step={0.01} className="input" value={meta.cashback_percentage as number ?? 5}
              onChange={e => set('cashback_percentage', parseFloat(e.target.value) || 5)} />
          </div>
          <div>
            <label className="label">Compra mínima ($)</label>
            <input type="number" min={0} step={0.01} className="input" value={meta.minimum_purchase as number ?? 0}
              onChange={e => set('minimum_purchase', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Días de expiración del crédito</label>
            <input type="number" min={1} className="input" value={meta.credit_expiry_days as number ?? 365}
              onChange={e => set('credit_expiry_days', parseInt(e.target.value) || 365)} />
          </div>
        </div>
      );
    case 'coupon':
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Tipo de descuento</label>
            <select className="input" value={meta.discount_type as string ?? 'percentage'}
              onChange={e => set('discount_type', e.target.value)}>
              <option value="percentage">Porcentaje</option>
              <option value="fixed_amount">Monto fijo</option>
            </select>
          </div>
          <div>
            <label className="label">Valor del descuento</label>
            <input type="number" min={0.01} step={0.01} className="input" value={meta.discount_value as number ?? 10}
              onChange={e => set('discount_value', parseFloat(e.target.value) || 10)} />
          </div>
          <div>
            <label className="label">Usos máximos por cliente</label>
            <input type="number" min={1} className="input" value={meta.usage_limit_per_customer as number ?? 1}
              onChange={e => set('usage_limit_per_customer', parseInt(e.target.value) || 1)} />
          </div>
          <div>
            <label className="label">Descripción del cupón</label>
            <input type="text" className="input" value={meta.coupon_description as string ?? ''}
              onChange={e => set('coupon_description', e.target.value)} />
          </div>
        </div>
      );
    case 'discount':
      return (
        <div className="space-y-4">
          <label className="label">Niveles de descuento (hasta 5)</label>
          {(meta.tiers as Array<{tier_name: string; threshold: number; discount_percentage: number}> ?? []).map((tier, i) => (
            <div key={i} className="flex gap-2">
              <input type="text" className="input flex-1" placeholder="Nombre del nivel" value={tier.tier_name}
                onChange={e => {
                  const tiers = [...(meta.tiers as Array<{tier_name: string; threshold: number; discount_percentage: number}>)];
                  tiers[i] = { ...tiers[i], tier_name: e.target.value };
                  set('tiers', tiers);
                }} />
              <input type="number" className="input w-28" placeholder="Mín $" value={tier.threshold}
                onChange={e => {
                  const tiers = [...(meta.tiers as Array<{tier_name: string; threshold: number; discount_percentage: number}>)];
                  tiers[i] = { ...tiers[i], threshold: parseFloat(e.target.value) || 0 };
                  set('tiers', tiers);
                }} />
              <input type="number" className="input w-20" placeholder="%" value={tier.discount_percentage}
                onChange={e => {
                  const tiers = [...(meta.tiers as Array<{tier_name: string; threshold: number; discount_percentage: number}>)];
                  tiers[i] = { ...tiers[i], discount_percentage: parseFloat(e.target.value) || 0 };
                  set('tiers', tiers);
                }} />
              <button type="button" className="btn-ghost text-red-500 px-2" onClick={() => {
                const tiers = [...(meta.tiers as Array<unknown>)];
                tiers.splice(i, 1);
                set('tiers', tiers);
              }}>✕</button>
            </div>
          ))}
          {(meta.tiers as Array<unknown> ?? []).length < 5 && (
            <button type="button" className="btn-secondary text-xs" onClick={() => {
              const tiers = [...(meta.tiers as Array<unknown> ?? []), { tier_name: '', threshold: 0, discount_percentage: 0 }];
              set('tiers', tiers);
            }}>+ Agregar nivel</button>
          )}
        </div>
      );
    case 'gift_certificate':
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Denominaciones disponibles ($)</label>
            <input type="text" className="input" placeholder="10, 25, 50, 100"
              value={(meta.denominations as number[])?.join(', ') ?? ''}
              onChange={e => set('denominations', e.target.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)))} />
            <p className="text-xs text-surface-400 mt-1 ml-1">Separa los montos con comas</p>
          </div>
          <div>
            <label className="label">Días de expiración</label>
            <input type="number" min={1} className="input" value={meta.expiry_days as number ?? 365}
              onChange={e => set('expiry_days', parseInt(e.target.value) || 365)} />
          </div>
        </div>
      );
    case 'vip_membership':
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Nombre de la membresía</label>
            <input type="text" className="input" value={meta.membership_name as string ?? ''} placeholder="Ej: Club VIP Gold"
              onChange={e => set('membership_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cuota mensual ($)</label>
              <input type="number" min={0} step={0.01} className="input" value={meta.monthly_fee as number ?? 0}
                onChange={e => set('monthly_fee', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">Cuota anual ($)</label>
              <input type="number" min={0} step={0.01} className="input" value={meta.annual_fee as number ?? 0}
                onChange={e => set('annual_fee', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label className="label">Periodo de validez</label>
            <select className="input" value={meta.validity_period as string ?? 'monthly'}
              onChange={e => set('validity_period', e.target.value)}>
              <option value="monthly">Mensual</option>
              <option value="quarterly">Trimestral</option>
              <option value="annual">Anual</option>
              <option value="lifetime">Vitalicio</option>
            </select>
          </div>
        </div>
      );
    case 'referral_pass':
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Recompensa para el que refiere</label>
            <input type="text" className="input" value={meta.referrer_reward as string ?? ''}
              onChange={e => set('referrer_reward', e.target.value)} placeholder="Ej: 10% de descuento" />
          </div>
          <div>
            <label className="label">Recompensa para el referido</label>
            <input type="text" className="input" value={meta.referee_reward as string ?? ''}
              onChange={e => set('referee_reward', e.target.value)} placeholder="Ej: 5% en primera compra" />
          </div>
          <div>
            <label className="label">Máximo de referidos por cliente</label>
            <input type="number" min={0} className="input" value={meta.max_referrals_per_customer as number ?? 10}
              onChange={e => set('max_referrals_per_customer', parseInt(e.target.value) || 10)} />
          </div>
        </div>
      );
    case 'multipass':
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Cantidad de sellos en el paquete</label>
            <input type="number" min={1} className="input" value={meta.bundle_size as number ?? 10}
              onChange={e => set('bundle_size', parseInt(e.target.value) || 10)} />
          </div>
          <div>
            <label className="label">Precio del paquete ($)</label>
            <input type="number" min={0.01} step={0.01} className="input" value={meta.bundle_price as number ?? 25}
              onChange={e => set('bundle_price', parseFloat(e.target.value) || 25)} />
          </div>
        </div>
      );
    default:
      return (
        <div className="card p-8 text-center">
          <p className="text-surface-500">Este tipo de tarjeta no requiere configuración adicional.</p>
        </div>
      );
  }
}

/* ─── Wallet Card Preview ─────────────────────────────────────────────── */
function WalletCardPreview({ form, selectedType, logoPreview, stripPreview }: {
  form: { name: string; description: string; background_color: string; text_color: string; card_type: string; strip_image_url?: string };
  selectedType: typeof CARD_TYPES[0] | undefined;
  logoPreview: string | null;
  stripPreview?: string | null;
}) {
  // Get template colors for gradient
  const template = DESIGN_TEMPLATES.find(t => t.id === 'midnight') || DESIGN_TEMPLATES[0];
  const bgColor = form.background_color || template.bg;
  const textColor = form.text_color || template.text;
  const accentColor = template.accent;
  const heroImage = stripPreview || form.strip_image_url;
  
  // Create gradient background based on template
  const gradientStyle = {
    background: bgColor.startsWith('#') && bgColor.length === 7 
      ? `linear-gradient(135deg, ${bgColor} 0%, ${adjustColor(bgColor, -20)} 50%, ${bgColor} 100%)`
      : bgColor,
  };

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Phone frame - iPhone style */}
      <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl border-4 border-gray-800">
        <div className="bg-gray-900 rounded-[2.5rem] overflow-hidden relative">
          {/* Dynamic Island / Status bar */}
          <div className="bg-black/80 px-6 py-3 flex items-center justify-between">
            <div className="w-16 h-2 bg-gray-700 rounded-full mx-auto" />
          </div>
          
          {/* Wallet card - Full beautiful design */}
          <div className="px-4 pb-6 pt-2">
            <div
              className="rounded-3xl p-5 min-h-[240px] flex flex-col justify-between shadow-2xl relative overflow-hidden"
              style={{ 
                background: gradientStyle.background,
                color: textColor,
                boxShadow: `0 20px 40px -10px ${bgColor}80, 0 0 0 1px ${textColor}10`
              }}
            >
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 opacity-20" style={{
                background: `linear-gradient(135deg, transparent 0%, ${accentColor}40 50%, transparent 100%)`,
              }} />
              
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, ${textColor} 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }} />

              {/* ==================== HERO IMAGE (if uploaded) ==================== */}
              {heroImage && (
                <div className="relative z-10 -mx-5 -mt-5 mb-3">
                  <img 
                    src={heroImage} 
                    alt="Hero" 
                    className="w-full h-16 object-cover rounded-t-3xl"
                  />
                </div>
              )}

              {/* ==================== TOP SECTION ==================== */}
              <div className="relative z-10" style={{ marginTop: heroImage ? '0' : '0' }}>
                {/* Logo + Brand Section - PROMINENTLY DISPLAYED */}
                <div className="flex items-center gap-3 mb-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img 
                        src={logoPreview} 
                        alt="Logo" 
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-white/30 shadow-lg"
                        style={{ boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}
                      />
                      {/* Glow effect behind logo */}
                      <div className="absolute inset-0 rounded-2xl bg-white/20 blur-xl" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
                      <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-7 h-7" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-50 mb-0.5">
                      {selectedType?.label || 'Programa de Fidelidad'}
                    </p>
                    <p className="text-lg font-bold leading-tight truncate drop-shadow-md">
                      {form.name || 'Nombre del Programa'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ==================== MIDDLE SECTION ==================== */}
              <div className="relative z-10 my-2">
                <p className="text-xs leading-relaxed opacity-70 line-clamp-2 drop-shadow-sm">
                  {form.description || 'Descripción de tu programa de fidelización'}
                </p>
              </div>

              {/* ==================== BOTTOM SECTION ==================== */}
              <div className="relative z-10 mt-2">
                <div className="flex items-end justify-between">
                  {/* Customer info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-semibold uppercase tracking-wider opacity-40">Cliente</p>
                    <p className="text-sm font-bold opacity-90 truncate drop-shadow-md">Juan Pérez</p>
                    <p className="text-[10px] opacity-50 mt-0.5">Miembro desde 2024</p>
                  </div>
                  
                  {/* QR Code area - Premium design */}
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl p-1.5 shadow-lg">
                    <div 
                      className="w-16 h-16 rounded-lg flex items-center justify-center"
                      style={{ 
                        background: `repeating-linear-gradient(0deg, #000 0px, #000 2px, transparent 2px, transparent 4px), repeating-linear-gradient(90deg, #000 0px, #000 2px, transparent 2px, transparent 4px)`,
                        backgroundSize: '4px 4px'
                      }}
                    >
                      <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-800">
                          <rect x="3" y="3" width="7" height="7" fill="#000"/>
                          <rect x="14" y="3" width="7" height="7" fill="#000"/>
                          <rect x="3" y="14" width="7" height="7" fill="#000"/>
                          <rect x="14" y="14" width="3" height="3" fill="#000"/>
                          <rect x="18" y="14" width="3" height="3" fill="#000"/>
                          <rect x="14" y="18" width="3" height="3" fill="#000"/>
                          <rect x="18" y="18" width="3" height="3" fill="#000"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card footer with subtle accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-1" style={{
                background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`
              }} />
            </div>
          </div>
          
          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-gray-600 rounded-full" />
        </div>
      </div>
      
      {/* Label */}
      <p className="text-center text-xs text-surface-400 mt-4 font-medium">
        Vista previa en Apple Wallet / Google Wallet
      </p>
    </div>
  );
}

// Helper function to adjust color brightness
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/* ─── Main Page ───────────────────────────────────────────────────────── */
export default function NewProgramPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    card_type: '',
    description: '',
    background_color: '#1a1a2e',
    text_color: '#ffffff',
    logo_url: '',
    strip_image_url: '',
    icon_url: '',
    locations: [] as Array<{lat: number, lng: number, name: string}>,
  });
  const [meta, setMeta] = useState<Record<string, unknown>>({});
  const [selectedTemplate, setSelectedTemplate] = useState('midnight');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedType = CARD_TYPES.find(t => t.value === form.card_type);

  const handleTypeSelect = (type: string) => {
    setForm(f => ({ ...f, card_type: type }));
    setMeta(defaultMeta(type));
  };

  const handleTemplateSelect = (template: typeof DESIGN_TEMPLATES[0]) => {
    setSelectedTemplate(template.id);
    if (template.id !== 'custom') {
      setForm(f => ({ ...f, background_color: template.bg, text_color: template.text }));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to backend with JWT auth
    setLogoUploading(true);
    const url = await uploadFileAuth(file);
    if (url) {
      setForm(f => ({ ...f, logo_url: url }));
      toast.success('Logo subido correctamente');
    } else {
      toast('Logo guardado localmente', { icon: 'ℹ️' });
    }
    setLogoUploading(false);
  };

  const [stripPreview, setStripPreview] = useState<string | null>(null);
  const [stripUploading, setStripUploading] = useState(false);
  const stripInputRef = useRef<HTMLInputElement>(null);

  const handleStripUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setStripPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setStripUploading(true);
    const url = await uploadFileAuth(file);
    if (url) {
      setForm(f => ({ ...f, strip_image_url: url }));
      toast.success('Imagen de cabecera subida');
    } else {
      toast('Guardada localmente', { icon: 'ℹ️' });
    }
    setStripUploading(false);
  };

  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconUploading, setIconUploading] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setIconPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setIconUploading(true);
    const url = await uploadFileAuth(file);
    if (url) {
      setForm(f => ({ ...f, icon_url: url }));
      toast.success('Ícono subido');
    } else {
      toast('Guardado localmente', { icon: 'ℹ️' });
    }
    setIconUploading(false);
  };

  const canNext = () => {
    if (step === 0) return !!form.card_type;
    if (step === 1) return true;
    if (step === 2) return !!form.name;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await programsApi.create({ ...form, metadata: meta });
      toast.success('¡Programa creado exitosamente!');
      window.location.href = '/programs';
    } catch {
      toast.error('Error al crear el programa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nuevo Programa de Fidelización</h1>
          <p className="page-subtitle">Configura tu programa paso a paso</p>
        </div>
        <Link href="/programs" className="btn-ghost text-sm" id="back-to-programs">
          ← Volver a programas
        </Link>
      </div>

      <StepBar step={step} />

      {/* ──── STEP 0: Card type selection ──── */}
      {step === 0 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-surface-900">Selecciona el tipo de programa</h2>
          <p className="text-sm text-surface-500">Puedes crear múltiples programas combinando diferentes tipos.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CARD_TYPES.map(ct => (
              <button
                key={ct.value}
                type="button"
                onClick={() => handleTypeSelect(ct.value)}
                className={`text-left p-4 rounded-2xl border-2 transition-all duration-200
                  ${form.card_type === ct.value
                    ? 'border-brand-500 bg-brand-50 shadow-glow'
                    : 'border-surface-200 bg-white hover:border-surface-300 hover:shadow-card'
                  }`}
                id={`card-type-${ct.value}`}
              >
                <div className="flex items-start gap-3">
                  <CardTypeIcon icon={ct.icon} className="w-6 h-6 text-surface-600" />
                  <div>
                    <p className="font-semibold text-surface-900 text-sm">{ct.label}</p>
                    <p className="text-xs text-surface-500 mt-0.5">{ct.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ──── STEP 1: Type-specific config ──── */}
      {step === 1 && (
        <div className="card p-6 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-7 h-7 text-brand-600" />
            <div>
              <h2 className="text-lg font-bold text-surface-900">Configurar: {selectedType?.label}</h2>
              <p className="text-xs text-surface-500">{selectedType?.desc}</p>
            </div>
          </div>
          <TypeConfig type={form.card_type} meta={meta} setMeta={setMeta} />
        </div>
      )}

      {/* ──── STEP 2: Design — Templates + Logo Upload + Preview ──── */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Left: Form */}
          <div className="space-y-6">
            {/* Name + Description */}
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-bold text-surface-900">Nombre y descripción</h2>
              <div>
                <label className="label" htmlFor="program-name">Nombre del programa</label>
                <input id="program-name" type="text" required className="input" placeholder="Ej: Café Frecuente"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label" htmlFor="program-desc">Descripción</label>
                <textarea id="program-desc" className="input min-h-[80px] resize-none"
                  placeholder="Describe las reglas y beneficios..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            {/* Geofences Manager */}
            <div className="card p-6 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-base font-bold text-surface-900">Ubicaciones y Geocercas (Wallet GPS)</h2>
                  <p className="text-xs text-surface-500 mt-1">La tarjeta aparecerá en la pantalla de bloqueo cuando el cliente esté cerca de tu tienda (para NFC y Alertas).</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({...f, locations: [...f.locations, {lat: 0, lng: 0, name: ''}]}))} className="btn-secondary text-xs shrink-0 self-start mt-1">
                  + Agregar
                </button>
              </div>
              
              <div className="space-y-3">
                {form.locations.map((loc, i) => (
                  <div key={i} className="flex gap-2 items-center bg-surface-50 p-2 rounded-lg border border-surface-200">
                    <input type="text" className="input flex-1 text-sm py-1" placeholder="Ej: Sucursal Centro" value={loc.name} onChange={e => {
                      const newLocs = [...form.locations];
                      newLocs[i].name = e.target.value;
                      setForm({...form, locations: newLocs});
                    }} />
                    <input type="number" step="any" className="input w-24 text-sm py-1" placeholder="Lat (-0.18)" value={loc.lat || ''} onChange={e => {
                      const newLocs = [...form.locations];
                      newLocs[i].lat = parseFloat(e.target.value) || 0;
                      setForm({...form, locations: newLocs});
                    }} />
                    <input type="number" step="any" className="input w-24 text-sm py-1" placeholder="Lng (-78.48)" value={loc.lng || ''} onChange={e => {
                      const newLocs = [...form.locations];
                      newLocs[i].lng = parseFloat(e.target.value) || 0;
                      setForm({...form, locations: newLocs});
                    }} />
                    <button type="button" className="text-red-400 hover:text-red-600 px-1" title="Eliminar" onClick={() => {
                      const newLocs = [...form.locations];
                      newLocs.splice(i, 1);
                      setForm({...form, locations: newLocs});
                    }}>✕</button>
                  </div>
                ))}
                {form.locations.length === 0 && (
                  <p className="text-xs text-brand-600 italic mt-2 bg-brand-50 p-3 rounded-lg border border-brand-100 flex items-center gap-2">
                    <span>i</span> Agrega la ubicacion de tu negocio para activar las alertas de Wallet de Apple/Google.
                  </p>
                )}
              </div>
            </div>

            {/* Logo Upload */}
            <div className="card p-6 space-y-4">
              <h2 className="text-base font-bold text-surface-900">Logo del programa</h2>
              <p className="text-sm text-surface-500">Sube el logo de tu negocio. Aparecerá en la tarjeta del cliente.</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-2xl border-2 border-dashed border-surface-300 hover:border-brand-400 flex items-center justify-center transition-all bg-surface-50 hover:bg-brand-50 group"
                  id="logo-upload-btn"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-6 h-6 mx-auto text-surface-400 group-hover:text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      <p className="text-[10px] text-surface-400 group-hover:text-brand-500 mt-1">Subir</p>
                    </div>
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm text-surface-700 font-medium">
                    {logoPreview ? 'Logo cargado ✓' : 'Sin logo'}
                  </p>
                  <p className="text-xs text-surface-400 mt-1">
                    PNG, JPG o SVG. Recomendado: 256×256px
                  </p>
                  {logoUploading && (
                    <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
                      <span className="w-3 h-3 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                      Subiendo...
                    </p>
                  )}
                </div>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => { setLogoPreview(null); setForm(f => ({ ...f, logo_url: '' })); }}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-file-input"
              />
            </div>

            {/* Strip Image Upload - Hero Image for Wallet */}
            <div className="card p-6 space-y-4">
              <h2 className="text-base font-bold text-surface-900">Imagen de cabecera (Hero)</h2>
              <p className="text-sm text-surface-500">Imagen grande que aparece en la parte superior de la tarjeta del wallet.</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => stripInputRef.current?.click()}
                  className="w-32 h-20 rounded-2xl border-2 border-dashed border-surface-300 hover:border-brand-400 flex items-center justify-center transition-all bg-surface-50 hover:bg-brand-50 group overflow-hidden"
                  id="strip-upload-btn"
                >
                  {stripPreview ? (
                    <img src={stripPreview} alt="Strip" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-6 h-6 mx-auto text-surface-400 group-hover:text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18"/></svg>
                      <p className="text-[9px] text-surface-400 group-hover:text-brand-500 mt-1">Hero</p>
                    </div>
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm text-surface-700 font-medium">
                    {stripPreview ? 'Imagen de cabecera cargada ✓' : 'Sin imagen de cabecera'}
                  </p>
                  <p className="text-xs text-surface-400 mt-1">
                    PNG, JPG. Recomendado: 600×200px (aspect ratio 3:1)
                  </p>
                </div>
                {stripPreview && (
                  <button
                    type="button"
                    onClick={() => { setStripPreview(null); setForm(f => ({ ...f, strip_image_url: '' })); }}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
              <input
                ref={stripInputRef}
                type="file"
                accept="image/*"
                onChange={handleStripUpload}
                className="hidden"
                id="strip-file-input"
              />
            </div>

            {/* Icon Upload */}
            <div className="card p-6 space-y-4">
              <h2 className="text-base font-bold text-surface-900">Ícono del programa</h2>
              <p className="text-sm text-surface-500">Ícono pequeño para mostrar en la tarjeta.</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl border-2 border-dashed border-surface-300 hover:border-brand-400 flex items-center justify-center transition-all bg-surface-50 hover:bg-brand-50 group overflow-hidden"
                  id="icon-upload-btn"
                >
                  {iconPreview ? (
                    <img src={iconPreview} alt="Icon" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-5 h-5 mx-auto text-surface-400 group-hover:text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg>
                      <p className="text-[8px] text-surface-400 group-hover:text-brand-500 mt-1">Icono</p>
                    </div>
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm text-surface-700 font-medium">
                    {iconPreview ? 'Ícono cargado ✓' : 'Sin ícono'}
                  </p>
                  <p className="text-xs text-surface-400 mt-1">
                    PNG, JPG. Recomendado: 64×64px
                  </p>
                </div>
                {iconPreview && (
                  <button
                    type="button"
                    onClick={() => { setIconPreview(null); setForm(f => ({ ...f, icon_url: '' })); }}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                onChange={handleIconUpload}
                className="hidden"
                id="icon-file-input"
              />
            </div>

            {/* Design Templates */}
            <div className="card p-6 space-y-4">
              <h2 className="text-base font-bold text-surface-900">Plantilla de diseño</h2>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {DESIGN_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplateSelect(t)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all
                      ${selectedTemplate === t.id
                        ? 'border-brand-500 shadow-glow'
                        : 'border-surface-200 hover:border-surface-300'
                      }`}
                    id={`template-${t.id}`}
                  >
                    {t.id === 'custom' ? (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 via-purple-400 to-blue-400 border border-white/50" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg border border-white/20" style={{ backgroundColor: t.bg }} />
                    )}
                    <span className="text-[9px] text-surface-600 font-medium">{t.name}</span>
                  </button>
                ))}
              </div>

              {/* Custom colors — show if custom template selected */}
              {selectedTemplate === 'custom' && (
                <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-surface-100">
                  <div>
                    <label className="label text-xs">Color de fondo</label>
                    <div className="flex items-center gap-3">
                      <input type="color" className="w-10 h-8 rounded-lg cursor-pointer border border-surface-200"
                        value={form.background_color} onChange={e => setForm(f => ({ ...f, background_color: e.target.value }))} />
                      <span className="text-xs font-mono text-surface-500">{form.background_color}</span>
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Color de texto</label>
                    <div className="flex items-center gap-3">
                      <input type="color" className="w-10 h-8 rounded-lg cursor-pointer border border-surface-200"
                        value={form.text_color} onChange={e => setForm(f => ({ ...f, text_color: e.target.value }))} />
                      <span className="text-xs font-mono text-surface-500">{form.text_color}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Live Wallet Preview */}
          <div className="sticky top-24">
            <WalletCardPreview form={form} selectedType={selectedType} logoPreview={logoPreview} stripPreview={stripPreview} />
          </div>
        </div>
      )}

      {/* ──── STEP 3: Review ──── */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <div className="card p-6 space-y-5">
            <h2 className="text-lg font-bold text-surface-900">Revisa tu programa</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-surface-100">
                <span className="text-sm text-surface-500">Tipo</span>
                <span className="text-sm font-semibold"><CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-4 h-4 inline-block mr-1" /> {selectedType?.label}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-100">
                <span className="text-sm text-surface-500">Nombre</span>
                <span className="text-sm font-semibold">{form.name}</span>
              </div>
              {form.description && (
                <div className="flex justify-between py-2 border-b border-surface-100">
                  <span className="text-sm text-surface-500">Descripción</span>
                  <span className="text-sm font-medium text-right max-w-[60%]">{form.description}</span>
                </div>
              )}
              {Object.entries(meta).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-surface-100">
                  <span className="text-sm text-surface-500">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </div>
              ))}
            </div>

            {/* Wallet features info */}
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm space-y-2">
              <p className="font-semibold text-brand-800">Funcionalidades de Wallet incluidas:</p>
              <ul className="text-brand-700 text-xs space-y-1 ml-4 list-disc">
                <li>Tarjeta digital en Apple Wallet y Google Pay</li>
                <li>Código QR único por cliente</li>
                <li>Notificaciones push por geolocalización</li>
                <li>Actualización en tiempo real</li>
              </ul>
            </div>
          </div>

          {/* Preview */}
          <div>
            <WalletCardPreview form={form} selectedType={selectedType} logoPreview={logoPreview} stripPreview={stripPreview} />
          </div>
        </div>
      )}

      {/* ──── Navigation buttons ──── */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          className={`btn-secondary ${step === 0 ? 'invisible' : ''}`}
          id="wizard-prev"
        >
          ← Anterior
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            className="btn-primary"
            disabled={!canNext()}
            id="wizard-next"
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-primary"
            disabled={loading || !form.name}
            id="submit-program"
          >
            {loading ? <span className="spinner w-4 h-4" /> : 'Crear Programa'}
          </button>
        )}
      </div>
    </div>
  );
}
