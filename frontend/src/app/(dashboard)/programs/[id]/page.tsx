'use client';
import { useState, useEffect } from 'react';
import { programsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import { adjustColor } from '@/components/programs/constants';
import EditProgramModal, { type ProgramData } from '@/components/programs/EditProgramModal';
import PremiumQrSvg from '@/components/programs/PremiumQrSvg';

/** Premium styled QR code URL */
function styledQrUrl(data: string, size = 280): string {
  return `https://quickchart.io/qr?text=${encodeURIComponent(data)}&size=${size}&margin=2&dark=1a1a2e&light=ffffff&ecLevel=M&format=png`;
}

const CARD_TYPE_LABELS: Record<string, string> = {
  stamp: 'Sellos', points: 'Puntos', visits: 'Visitas', cashback: 'Cashback',
  coupon: 'Cupón', affiliate: 'Afiliación', discount: 'Descuento',
  gift_certificate: 'Certificado', vip_membership: 'VIP', corporate_discount: 'Corporativo',
  referral_pass: 'Referidos', multipass: 'Multipase',
};




/** Edit modal — extracted to avoid unconditional rendering (PERF-006) */

interface ProgramStats {
  active_passes?: number;
  active_members?: number;
  transactions?: number;
  total_rewards_redeemed?: number;
  engagement_rate?: number;
  enrollments?: number;
}

/* ─── Main Page ────────────────────────────────────────────────────────── */
export default function ProgramDetailsPage({ params }: { params: { id: string } }) {
  const [appUrl, setAppUrl] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') setAppUrl(window.location.origin);
  }, []);
  const resolvedAppUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  const id = params.id;
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [program, setProgram] = useState<ProgramData | null>(null);
  const [stats, setStats] = useState<ProgramStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);

  const loadProgram = () => {
    Promise.all([programsApi.get(id), programsApi.stats(id)])
      .then(([progRes, statsRes]) => { setProgram(progRes.data); setStats(statsRes.data); })
      .catch(() => toast.error('Error al cargar los detalles del programa'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProgram(); }, [id]);

  const openEdit = () => {
    if (!program) return;
    setShowEdit(true);
  };

  if (loading) return <div className="p-8 text-center text-surface-500 animate-pulse">Cargando tarjeta digital...</div>;
  if (!program) return <div className="p-8 text-center text-red-500">Programa no encontrado.</div>;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <a href="/programs" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-brand-600 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        Volver a Programas
      </a>

      <div className="page-header flex justify-between items-center">
        <div>
          <span className="badge-purple mb-2 inline-block uppercase text-xs tracking-wider">{CARD_TYPE_LABELS[program.card_type] || program.card_type}</span>
          <h1 className="page-title">{program.name}</h1>
          <p className="text-surface-500 text-sm mt-1">{program.description}</p>
        </div>
        {isOwner && (
          <button onClick={openEdit} className="btn-secondary text-sm flex items-center gap-2" id="edit-program-btn">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar programa
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 bg-surface-50 border-t-4 border-indigo-500">
          <h3 className="text-sm font-semibold text-surface-500 uppercase">Miembros Activos</h3>
          <p className="text-3xl font-bold mt-2">{stats?.active_passes ?? stats?.active_members ?? 0}</p>
        </div>
        <div className="card p-6 bg-surface-50 border-t-4 border-emerald-500">
          <h3 className="text-sm font-semibold text-surface-500 uppercase">Recompensas Canjeadas</h3>
          <p className="text-3xl font-bold mt-2">{stats?.transactions ?? stats?.total_rewards_redeemed ?? 0}</p>
        </div>
        <div className="card p-6 bg-surface-50 border-t-4 border-rose-500">
          <h3 className="text-sm font-semibold text-surface-500 uppercase">Tasa de Participación</h3>
          <p className="text-3xl font-bold mt-2">{stats?.engagement_rate ?? stats?.enrollments ?? 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Card Preview - Premium Wallet Design */}
        <div className="card p-8 text-center bg-surface-50 border-2 border-dashed border-surface-200 dark:border-surface-700">
          <div className="relative w-full max-w-sm mx-auto">
            <div className="relative bg-black rounded-[40px] p-3 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)] border-[3px] border-transparent bg-gradient-to-b from-gray-700 to-gray-800 bg-clip-padding ring-1 ring-white/20">
              {/* Side buttons */}
              <div className="absolute top-20 -left-[3px] w-[2px] h-7 bg-gray-600 rounded-l-sm" />
              <div className="absolute top-32 -left-[3px] w-[2px] h-12 bg-gray-600 rounded-l-sm" />
              <div className="absolute top-28 -right-[3px] w-[2px] h-14 bg-gray-600 rounded-r-sm" />
              <div className="bg-black rounded-[36px] overflow-hidden relative">
                <div className="bg-black/60 px-20 py-2 flex justify-center">
                  <div className="w-14 h-1.5 bg-gray-800 rounded-full" />
                </div>
                <div
                  className="mx-2 mb-2 rounded-2xl p-4 min-h-[160px] flex flex-col justify-between shadow-xl relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${program.background_color} 0%, ${adjustColor(program.background_color, -20)} 100%)`,
                    color: program.text_color
                  }}
                >
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, ${program.text_color} 1px, transparent 1px)`,
                    backgroundSize: '16px 16px'
                  }} />
                  {/* Hero banner */}
                  {program.strip_image_url && (
                    <div className="relative z-10 -mx-4 -mt-4 mb-2">
                      <img src={program.strip_image_url} alt="Hero" className="w-full h-14 object-cover rounded-t-2xl" />
                    </div>
                  )}
                  {/* Top: logo + name */}
                  <div className="relative z-10 flex items-center gap-3">
                    {program.logo_url ? (
                      <img src={program.logo_url} alt="Logo" className="w-12 h-12 rounded-xl object-cover border-2 border-white/30 shadow-lg" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <span className="font-bold text-lg">{program.name?.[0] || 'P'}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-bold uppercase tracking-wider opacity-50">Programa de Fidelidad</p>
                      <p className="text-lg font-bold truncate">{program.name}</p>
                    </div>
                  </div>
                  {/* Description */}
                  <div className="relative z-10 my-2">
                    <p className="text-xs opacity-70 line-clamp-1">{program.description}</p>
                  </div>
                  {/* Bottom: customer + QR */}
                  <div className="relative z-10 flex items-end justify-between">
                    <div>
                      <p className="text-[8px] font-semibold uppercase tracking-wider opacity-40">Cliente</p>
                      <p className="text-xs font-bold opacity-80">Juan Pérez</p>
                    </div>
                    <div className="bg-[#ffffff] rounded-xl p-1 shadow-lg">
                      <PremiumQrSvg color={program.background_color || '#1a1a2e'} size={44} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-surface-400">Vista previa en Apple Wallet / Google Wallet</p>
        </div>

        {/* Enrollment QR Code — Premium Styled */}
        <div className="card p-8 text-center">
          <h3 className="text-base font-semibold text-surface-900 dark:text-white mb-2">Código QR de inscripción</h3>
          <p className="text-sm text-surface-500 mb-4">
            Imprime este código o compártelo para que tus clientes se inscriban directamente.
          </p>
          <div className="flex justify-center mb-4">
            <img
              src={styledQrUrl(`${resolvedAppUrl}/enroll/${id}`, 280)}
              alt="QR de inscripción"
              className="w-48 h-48 rounded-2xl border-2 border-surface-100 p-2 bg-[#ffffff] shadow-lg"
              id="enrollment-qr-img"
            />
          </div>
          <div className="space-y-2">
            <button
              onClick={() => {
                const url = `${resolvedAppUrl}/enroll/${id}`;
                navigator.clipboard.writeText(url);
                toast.success('¡Enlace copiado!');
              }}
              className="btn-primary w-full justify-center text-sm"
              id="copy-enroll-link"
            >
              <svg className="w-4 h-4 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copiar enlace de inscripción
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`¡Únete a nuestro programa de fidelización! ${resolvedAppUrl}/enroll/${id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn w-full justify-center text-sm bg-emerald-500 hover:bg-emerald-600 text-white"
              id="share-whatsapp"
            >
              Compartir por WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Edit Modal — conditionally mounted (PERF-006) */}
      {showEdit && program && (
        <EditProgramModal
          id={id}
          program={program}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); loadProgram(); }}
        />
      )}
    </div>
  );
}

