import React from 'react';
import { APPLE_PASS_STYLES, CardTypeIcon, adjustColor } from './constants';

/* ── Type-specific visual content for hover preview ─────────────────── */
const TYPE_VISUALS: Record<string, { title: string; headerLabel: string; headerValue: string; detail: string; visual: React.ReactNode }> = {
  stamp: {
    title: 'Tarjeta de Sellos',
    headerLabel: 'SELLOS',
    headerValue: '3/10',
    detail: 'Compra 10, obtén 1 gratis',
    visual: (
      <div className="flex flex-wrap gap-1 mt-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full border-[1.5px] ${i < 3 ? 'bg-amber-400 border-amber-500' : 'bg-white/10 border-white/20'}`} />
        ))}
      </div>
    ),
  },
  cashback: {
    title: 'Cashback / Puntos',
    headerLabel: 'CRÉDITO',
    headerValue: '$12.50',
    detail: '5% de devolución por compra',
    visual: <p className="text-2xl font-black mt-1 text-emerald-400">5%</p>,
  },
  coupon: {
    title: 'Cupón de Descuento',
    headerLabel: 'OFERTA',
    headerValue: '$10',
    detail: 'Descuento en tu próxima compra',
    visual: <p className="text-2xl font-black mt-1 text-amber-300">-$10</p>,
  },
  affiliate: {
    title: 'Afiliación',
    headerLabel: 'ESTADO',
    headerValue: 'ACTIVO',
    detail: 'Recibe promociones exclusivas',
    visual: <p className="text-xl font-bold mt-1 text-blue-300">★ Miembro</p>,
  },
  discount: {
    title: 'Descuento por Niveles',
    headerLabel: 'NIVEL',
    headerValue: 'ORO',
    detail: 'Bronce 5% → Plata 10% → Oro 15%',
    visual: (
      <div className="flex gap-1 mt-1">
        {['5%', '10%', '15%'].map(v => (
          <span key={v} className="px-1.5 py-0.5 bg-white/15 rounded-full text-[8px] font-bold">{v}</span>
        ))}
      </div>
    ),
  },
  gift_certificate: {
    title: 'Certificado de Regalo',
    headerLabel: 'SALDO',
    headerValue: '$25',
    detail: 'Regala una experiencia',
    visual: <p className="text-2xl font-black mt-1 text-pink-300">$25</p>,
  },
  vip_membership: {
    title: 'Membresía VIP',
    headerLabel: 'MEMBRESÍA',
    headerValue: 'VIP',
    detail: 'Club exclusivo con beneficios',
    visual: <p className="text-xl font-black mt-1 text-yellow-300">VIP</p>,
  },
  corporate_discount: {
    title: 'Descuento Corporativo',
    headerLabel: 'EMPRESA',
    headerValue: 'CORP',
    detail: 'Descuento especial empresarial',
    visual: <p className="text-xl font-bold mt-1 text-blue-200">15% Corp</p>,
  },
  referral_pass: {
    title: 'Programa de Referidos',
    headerLabel: 'REFERIDOS',
    headerValue: '3',
    detail: 'Invita amigos y gana',
    visual: <p className="text-xl font-bold mt-1 text-green-300">3 invitados</p>,
  },
  multipass: {
    title: 'Multipase Prepagado',
    headerLabel: 'RESTANTES',
    headerValue: '7/10',
    detail: '10 visitas por $25',
    visual: (
      <div className="flex gap-0.5 mt-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`w-3 h-6 rounded-sm ${i < 7 ? 'bg-cyan-400' : 'bg-white/10'}`} />
        ))}
      </div>
    ),
  },
};

/* ── Full Phone-Frame Hover Preview per Card Type ───────────────────── */
function WalletPreviewContent({ type }: { type: string }) {
  const cfg = TYPE_VISUALS[type] || TYPE_VISUALS.stamp;
  const passStyle = APPLE_PASS_STYLES[type] || 'generic';
  const bgColor = '#1a1a2e';
  const textColor = '#ffffff';
  const gradBg = `linear-gradient(135deg, ${bgColor} 0%, ${adjustColor(bgColor, -20)} 50%, ${bgColor} 100%)`;

  return (
    <div className="flex flex-col items-center">
      {/* iPhone Frame */}
      <div className="relative w-[180px] bg-black rounded-[2.2rem] border-[3px] border-gray-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Dynamic Island */}
        <div className="flex justify-center pt-2 pb-0.5">
          <div className="w-16 h-4 bg-black rounded-full border border-gray-800" />
        </div>
        {/* Screen */}
        <div className="flex-1 bg-gradient-to-b from-gray-900 to-gray-950 px-2.5 pb-2 flex flex-col">
          {/* Status bar */}
          <div className="flex justify-between items-center py-0.5 px-1">
            <span className="text-[7px] text-white/40">9:41</span>
            <span className="text-[7px] text-white/40">●●●</span>
          </div>
          {/* Wallet label */}
          <p className="text-[7px] text-white/30 font-semibold tracking-wider px-1 mb-1">WALLET</p>
          {/* Pass Card */}
          <div
            className="rounded-xl overflow-hidden shadow-lg relative"
            style={{ background: gradBg, color: textColor }}
          >
            {/* Coupon edge */}
            {passStyle === 'coupon' && (
              <div className="w-full h-1" style={{ background: `repeating-linear-gradient(90deg, transparent 0px, transparent 3px, ${textColor}15 3px, ${textColor}15 6px)` }} />
            )}
            {/* Header */}
            <div className="px-2.5 pt-2 flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center border border-white/10">
                <CardTypeIcon icon={type === 'stamp' ? 'stamp' : type === 'cashback' ? 'dollar' : type === 'coupon' ? 'ticket' : type === 'vip_membership' ? 'crown' : type === 'referral_pass' ? 'megaphone' : type === 'gift_certificate' ? 'gift' : type === 'discount' ? 'layers' : type === 'corporate_discount' ? 'building' : type === 'multipass' ? 'refresh' : 'handshake'} className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[7px] font-bold uppercase tracking-[0.12em] opacity-40">
                  {passStyle === 'coupon' ? 'CUPÓN' : passStyle === 'storeCard' ? 'TARJETA' : 'PASE'}
                </p>
                <p className="text-[10px] font-bold truncate leading-tight">{cfg.title}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[5px] font-semibold uppercase tracking-wider opacity-30">{cfg.headerLabel}</p>
                <p className="text-[9px] font-black">{cfg.headerValue}</p>
              </div>
            </div>
            {/* Type-specific visual */}
            <div className="px-2.5 py-1.5">
              <p className="text-[7px] opacity-50">{cfg.detail}</p>
              {cfg.visual}
            </div>
            {/* Fields */}
            <div className="px-2.5 pb-1.5 flex justify-between">
              <div>
                <p className="text-[5px] font-semibold uppercase opacity-30">CLIENTE</p>
                <p className="text-[8px] font-bold opacity-80">Juan Pérez</p>
              </div>
              <div className="text-right">
                <p className="text-[5px] font-semibold uppercase opacity-30">DESDE</p>
                <p className="text-[8px] font-bold opacity-80">2024</p>
              </div>
            </div>
            {/* QR */}
            <div className="flex justify-center pb-2">
              <div className="bg-white/90 rounded-lg p-1">
                <svg width="24" height="24" viewBox="0 0 21 21">
                  <rect width="21" height="21" fill="white" rx={1} />
                  <rect x="1" y="1" width="7" height="7" fill="none" stroke="#111" strokeWidth="1.2" />
                  <rect x="3" y="3" width="3" height="3" fill="#111" />
                  <rect x="13" y="1" width="7" height="7" fill="none" stroke="#111" strokeWidth="1.2" />
                  <rect x="15" y="3" width="3" height="3" fill="#111" />
                  <rect x="1" y="13" width="7" height="7" fill="none" stroke="#111" strokeWidth="1.2" />
                  <rect x="3" y="15" width="3" height="3" fill="#111" />
                </svg>
              </div>
            </div>
          </div>
          {/* Powered by */}
          <p className="text-[6px] text-white/20 text-center mt-1">Powered by Loyallia</p>
        </div>
        {/* Home indicator */}
        <div className="flex justify-center pb-1">
          <div className="w-14 h-0.5 bg-white/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default WalletPreviewContent;
