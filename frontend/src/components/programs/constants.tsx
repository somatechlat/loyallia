/* ─── Shared Constants & Icons for Program Wizard ─────────────────── */

/* ─── Flat SVG Icon Component ─────────────────────────────────────── */
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

export function CardTypeIcon({ icon, className = 'w-5 h-5' }: { icon: string; className?: string }) {
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

/* ─── Card Type Registry ──────────────────────────────────────────── */
export const CARD_TYPES = [
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

/* ─── Design Templates ──────────────────────────────────────────── */
export const DESIGN_TEMPLATES = [
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

/* ─── Default metadata per card type ──────────────────────────────── */
export function defaultMeta(type: string): Record<string, unknown> {
  switch (type) {
    case 'stamp':             return { stamps_required: 10, reward_description: '', stamp_type: 'visit', consumption_per_stamp: 10, stamp_expiry: 'unlimited', stamp_start_date: '', stamp_end_date: '', stamps_at_issue: 0, daily_stamp_limit: 5, birthday_stamps: 0 };
    case 'cashback':          return { cashback_percentage: 5, minimum_purchase: 0, credit_expiry_days: 365 };
    case 'coupon':            return { discount_type: 'fixed_amount', discount_value: 10, usage_limit_per_customer: 1, coupon_description: '', special_promotion_text: '', coupon_expiry: 'unlimited', coupon_start_date: '', coupon_end_date: '', push_message: '' };
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

/* ─── Helper: adjust color brightness ─────────────────────────────── */
export function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
