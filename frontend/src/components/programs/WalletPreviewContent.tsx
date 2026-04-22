import React from 'react';

/* ── Wallet Card Hover Preview inside Phone Frame (WIZ-001/002) ─────── */
function WalletPreviewContent({ type }: { type: string }) {
  const configs: Record<string, { title: string; detail: string; visual: React.ReactNode }> = {
    stamp: {
      title: 'Tarjeta de Sellos',
      detail: 'Compra X, obtén 1 gratis',
      visual: (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className={`w-5 h-5 rounded-full border-2 ${
              i < 3 ? 'bg-amber-400 border-amber-500' : 'bg-white/20 border-white/30'
            }`} />
          ))}
        </div>
      ),
    },
    cashback: {
      title: 'Cashback / Puntos',
      detail: '5% de devolución',
      visual: <p className="text-3xl font-black mt-2 text-emerald-400">5%</p>,
    },
    coupon: {
      title: 'Cupón de Descuento',
      detail: 'Descuento en tu próxima compra',
      visual: <p className="text-3xl font-black mt-2 text-amber-300">$10</p>,
    },
    affiliate: {
      title: 'Afiliación',
      detail: 'Regístrate para recibir promos',
      visual: <p className="text-2xl font-bold mt-2 text-blue-300">★ VIP</p>,
    },
    discount: {
      title: 'Descuento por Niveles',
      detail: 'Bronce 5% → Plata 10% → Oro 15%',
      visual: <div className="flex gap-1 mt-2">{['5%','10%','15%'].map(v => <span key={v} className="px-2 py-1 bg-white/20 rounded-full text-xs font-bold">{v}</span>)}</div>,
    },
    gift_certificate: {
      title: 'Certificado de Regalo',
      detail: 'Regálale una experiencia',
      visual: <p className="text-3xl font-black mt-2 text-pink-300">🎁 $25</p>,
    },
    vip_membership: {
      title: 'Membresía VIP',
      detail: 'Club exclusivo mensual',
      visual: <p className="text-2xl font-black mt-2 text-yellow-300">👑 VIP</p>,
    },
    corporate_discount: {
      title: 'Descuento Corporativo',
      detail: 'Descuentos para empresas',
      visual: <p className="text-2xl font-bold mt-2 text-blue-200">🏢 Corp</p>,
    },
    referral_pass: {
      title: 'Programa de Referidos',
      detail: 'Invita y gana recompensas',
      visual: <p className="text-2xl font-bold mt-2 text-green-300">📣 Invita</p>,
    },
    multipass: {
      title: 'Multipase Prepagado',
      detail: '10 visitas por $25',
      visual: <p className="text-2xl font-bold mt-2 text-cyan-300">10x 🎫</p>,
    },
  };

  const cfg = configs[type] || configs.stamp;

  return (
    <div className="flex flex-col items-center">
      {/* iPhone Frame */}
      <div className="relative w-[180px] h-[370px] bg-black rounded-[2.2rem] border-[3px] border-gray-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Dynamic Island */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-20 h-5 bg-black rounded-full border border-gray-800" />
        </div>
        {/* Screen area */}
        <div className="flex-1 bg-gradient-to-b from-gray-900 to-gray-950 px-3 pb-3 flex flex-col">
          {/* Status bar */}
          <div className="flex justify-between items-center py-1 px-1">
            <span className="text-[8px] text-white/50">9:41</span>
            <div className="flex gap-1">
              <span className="text-[8px] text-white/50">●●●</span>
            </div>
          </div>
          {/* Wallet Card */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full bg-gradient-to-br from-brand-500/80 to-brand-700/80 rounded-2xl p-3 shadow-lg border border-white/10">
              <p className="text-[10px] font-bold text-white truncate">{cfg.title}</p>
              <p className="text-[8px] text-white/70 mt-0.5">{cfg.detail}</p>
              {cfg.visual}
              {/* QR placeholder */}
              <div className="mt-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-800" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm11-2h2v2h-2v-2zm-4 0h2v2h-2v-2zm4 4h2v2h-2v-2zm2-4h2v2h-2v-2zm0 4h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z"/></svg>
                </div>
                <span className="text-[7px] text-white/40">Powered by Loyallia</span>
              </div>
            </div>
          </div>
        </div>
        {/* Home indicator */}
        <div className="flex justify-center pb-1">
          <div className="w-16 h-1 bg-white/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default WalletPreviewContent;
