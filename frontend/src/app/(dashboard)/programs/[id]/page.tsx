'use client';
import { useState, useEffect, useRef } from 'react';
import { programsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

const API_URL = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:33905');

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Upload file to /api/v1/upload/ with JWT auth */
async function uploadFile(file: File): Promise<string | null> {
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
    toast.error('Error al subir archivo');
    return null;
  } catch {
    toast.error('Error de conexión al subir archivo');
    return null;
  }
}

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

const DESIGN_TEMPLATES = [
  { id: 'midnight',  name: 'Medianoche',    bg: '#1A1A2E', text: '#FFFFFF' },
  { id: 'ocean',     name: 'Océano',        bg: '#0F3460', text: '#FFFFFF' },
  { id: 'sunset',    name: 'Atardecer',     bg: '#FF6B35', text: '#FFFFFF' },
  { id: 'forest',    name: 'Bosque',        bg: '#0F766E', text: '#FFFFFF' },
  { id: 'royal',     name: 'Realeza',       bg: '#4C1D95', text: '#FFFFFF' },
  { id: 'rose',      name: 'Rosa',          bg: '#9F1239', text: '#FFFFFF' },
  { id: 'gold',      name: 'Dorado',        bg: '#78350F', text: '#F9D923' },
  { id: 'arctic',    name: 'Ártico',        bg: '#1E40AF', text: '#FFFFFF' },
  { id: 'slate',     name: 'Pizarra',       bg: '#334155', text: '#F8FAFC' },
  { id: 'emerald',   name: 'Esmeralda',     bg: '#065F46', text: '#FFFFFF' },
  { id: 'cherry',    name: 'Cereza',        bg: '#BE123C', text: '#FFFFFF' },
  { id: 'custom',    name: 'Personalizado', bg: '',        text: '' },
];

/* ─── Premium SVG QR Pattern (rounded-dot style) ──────────────────────── */
function PremiumQrSvg({ color = '#1a1a2e', size = 48 }: { color?: string; size?: number }) {
  // Rounded-dot QR-like pattern that looks modern and premium
  const dots = [
    // Top-left finder
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],
    [0,1],[6,1],
    [0,2],[2,2],[3,2],[4,2],[6,2],
    [0,3],[2,3],[3,3],[4,3],[6,3],
    [0,4],[2,4],[3,4],[4,4],[6,4],
    [0,5],[6,5],
    [0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6],
    // Top-right finder
    [14,0],[15,0],[16,0],[17,0],[18,0],[19,0],[20,0],
    [14,1],[20,1],
    [14,2],[16,2],[17,2],[18,2],[20,2],
    [14,3],[16,3],[17,3],[18,3],[20,3],
    [14,4],[16,4],[17,4],[18,4],[20,4],
    [14,5],[20,5],
    [14,6],[15,6],[16,6],[17,6],[18,6],[19,6],[20,6],
    // Bottom-left finder
    [0,14],[1,14],[2,14],[3,14],[4,14],[5,14],[6,14],
    [0,15],[6,15],
    [0,16],[2,16],[3,16],[4,16],[6,16],
    [0,17],[2,17],[3,17],[4,17],[6,17],
    [0,18],[2,18],[3,18],[4,18],[6,18],
    [0,19],[6,19],
    [0,20],[1,20],[2,20],[3,20],[4,20],[5,20],[6,20],
    // Timing
    [8,0],[10,0],[8,2],[10,2],[8,4],[10,4],[8,6],
    [0,8],[0,10],[2,8],[2,10],[4,8],[4,10],[6,8],
    // Data modules (aesthetically placed)
    [8,8],[9,8],[10,8],[11,8],[12,8],
    [8,9],[10,9],[12,9],[14,9],[16,9],[18,9],[20,9],
    [8,10],[9,10],[11,10],[13,10],[15,10],[17,10],[19,10],
    [8,11],[10,11],[12,11],[14,11],[16,11],[18,11],[20,11],
    [8,12],[9,12],[11,12],[13,12],[15,12],[17,12],[19,12],
    [9,14],[11,14],[13,14],[15,14],[17,14],[19,14],
    [8,15],[10,15],[12,15],[14,15],[16,15],[18,15],[20,15],
    [9,16],[11,16],[13,16],[15,16],[17,16],[19,16],
    [8,17],[10,17],[12,17],[14,17],[16,17],[18,17],[20,17],
    [9,18],[11,18],[13,18],[15,18],[17,18],[19,18],
    [8,19],[10,19],[12,19],[14,19],[16,19],[18,19],[20,19],
    [9,20],[11,20],[13,20],[15,20],[17,20],[19,20],
  ];

  const cellSize = size / 21;
  const r = cellSize * 0.38; // rounded dot radius

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" rx={size * 0.06} />
      {dots.map(([x, y], i) => (
        <circle
          key={i}
          cx={x * cellSize + cellSize / 2}
          cy={y * cellSize + cellSize / 2}
          r={r}
          fill={color}
        />
      ))}
    </svg>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────── */
/* eslint-disable @typescript-eslint/no-explicit-any */
export default function ProgramDetailsPage({ params }: { params: { id: string } }) {
  const [appUrl, setAppUrl] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') setAppUrl(window.location.origin);
  }, []);
  const resolvedAppUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  const id = params.id;
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [program, setProgram] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* Edit modal state */
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', description: '', background_color: '', text_color: '',
    logo_url: '', strip_image_url: '', icon_url: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const fileRef = useRef<HTMLInputElement>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);

  const loadProgram = () => {
    Promise.all([programsApi.get(id), programsApi.stats(id)])
      .then(([progRes, statsRes]) => { setProgram(progRes.data); setStats(statsRes.data); })
      .catch(() => toast.error('Error al cargar los detalles del programa'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProgram(); }, [id]);

  const openEdit = () => {
    if (!program) return;
    setEditForm({
      name: program.name || '',
      description: program.description || '',
      background_color: program.background_color || '#1a1a2e',
      text_color: program.text_color || '#ffffff',
      logo_url: program.logo_url || '',
      strip_image_url: program.strip_image_url || '',
      icon_url: program.icon_url || '',
    });
    setLogoPreview(program.logo_url || null);
    setSelectedTemplate('custom');
    setShowEdit(true);
  };

  /* ─── Upload handlers (with JWT auth) ─────────────────────────────── */
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setLogoUploading(true);
    const url = await uploadFile(file);
    if (url) {
      setEditForm(f => ({ ...f, logo_url: url }));
      setLogoPreview(url);
      toast.success('Logo subido');
    }
    setLogoUploading(false);
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'strip_image_url' | 'icon_url'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) {
      setEditForm(f => ({ ...f, [field]: url }));
      toast.success('Imagen subida');
    }
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    try {
      await programsApi.update(id, editForm);
      toast.success('Programa actualizado y sincronizado con Google Wallet');
      setShowEdit(false);
      loadProgram();
    } catch { toast.error('Error al actualizar el programa'); }
    finally { setEditSaving(false); }
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
        <div className="card p-8 text-center bg-surface-50 border-2 border-dashed border-surface-200">
          <div className="relative w-full max-w-sm mx-auto">
            <div className="bg-gray-900 rounded-[2rem] p-2 shadow-2xl border-2 border-gray-800">
              <div className="bg-gray-900 rounded-[1.5rem] overflow-hidden">
                <div className="bg-black/60 px-20 py-2 flex justify-center">
                  <div className="w-12 h-2 bg-gray-700 rounded-full" />
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
                    <div className="bg-white rounded-xl p-1 shadow-lg">
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
          <h3 className="text-base font-semibold text-surface-900 mb-2">Código QR de inscripción</h3>
          <p className="text-sm text-surface-500 mb-4">
            Imprime este código o compártelo para que tus clientes se inscriban directamente.
          </p>
          <div className="flex justify-center mb-4">
            <img
              src={styledQrUrl(`${resolvedAppUrl}/enroll/${id}`, 280)}
              alt="QR de inscripción"
              className="w-48 h-48 rounded-2xl border-2 border-surface-100 p-2 bg-white shadow-lg"
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

      {/* ═══════════════════════════════════════════════════════════════════
          FULL-SCREEN SUBTLE GLASS EDIT MODAL
         ═══════════════════════════════════════════════════════════════════ */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowEdit(false)}>
          {/* Soft frosted backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />

          {/* Clean glass container */}
          <div
            className="relative w-[96vw] h-[92vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200/60 bg-white/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Editar Programa</h2>
                <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md">{id.slice(0, 8)}</span>
              </div>
              <button
                onClick={() => setShowEdit(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all"
              >✕</button>
            </div>

            {/* ── Main 3-column layout ── */}
            <div className="flex-1 grid grid-cols-12 gap-0 min-h-0">

              {/* ─── Col 1: Identity & Images ─── */}
              <div className="col-span-4 p-6 border-r border-slate-100 flex flex-col gap-4 bg-white/40">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Nombre del programa</label>
                  <input
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all shadow-sm"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ej: Café Frecuente"
                    id="edit-name"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Descripción</label>
                  <textarea
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all shadow-sm"
                    rows={2}
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe los beneficios de tu programa..."
                    id="edit-desc"
                  />
                </div>

                {/* Logo */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 flex items-center justify-center transition-all bg-white hover:bg-indigo-50 group overflow-hidden shrink-0 shadow-sm"
                    id="edit-logo-btn"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                      <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 font-medium">{logoPreview ? 'Logo cargado ✓' : 'Logo del programa'}</p>
                    <p className="text-[10px] text-slate-400">PNG, JPG, SVG • 256×256px</p>
                    {logoUploading && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                        <span className="text-[10px] text-indigo-500">Subiendo...</span>
                      </div>
                    )}
                  </div>
                  {logoPreview && (
                    <button type="button" onClick={() => { setLogoPreview(null); setEditForm(f => ({ ...f, logo_url: '' })); }}
                      className="text-red-400 hover:text-red-600 text-xs transition-colors">✕</button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />

                {/* Hero image */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Imagen Hero / Banner</label>
                  {editForm.strip_image_url && (
                    <div className="relative mb-2 rounded-xl overflow-hidden h-16 bg-slate-50 border border-slate-100">
                      <img src={editForm.strip_image_url} alt="Hero" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                      <button type="button" onClick={() => setEditForm(f => ({ ...f, strip_image_url: '' }))}
                        className="absolute top-1 right-1 bg-black/40 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-600 transition-colors">✕</button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-sm"
                      placeholder="https://... URL de imagen"
                      value={editForm.strip_image_url}
                      onChange={e => setEditForm(f => ({ ...f, strip_image_url: e.target.value }))}
                      id="edit-hero-url"
                    />
                    <button type="button" onClick={() => heroFileRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs border border-slate-200 transition-all font-medium" id="upload-hero-btn">Subir</button>
                  </div>
                  <input ref={heroFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'strip_image_url')} />
                </div>

                {/* Icon */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Ícono de recompensa</label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-sm"
                      placeholder="https://... URL del ícono"
                      value={editForm.icon_url}
                      onChange={e => setEditForm(f => ({ ...f, icon_url: e.target.value }))}
                      id="edit-icon-url"
                    />
                    <button type="button" onClick={() => iconFileRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs border border-slate-200 transition-all font-medium" id="upload-icon-btn">Subir</button>
                  </div>
                  <input ref={iconFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'icon_url')} />
                </div>

                {editForm.icon_url && (
                  <div className="flex items-center gap-2">
                    <img src={editForm.icon_url} alt="Icon" className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm" onError={e => (e.currentTarget.style.display = 'none')} />
                    <span className="text-[10px] text-slate-400">Ícono actual</span>
                  </div>
                )}
              </div>

              {/* ─── Col 2: Design Templates & Colors ─── */}
              <div className="col-span-3 p-6 border-r border-slate-100 flex flex-col gap-4 bg-white/30">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Plantillas de diseño</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {DESIGN_TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplate(t.id);
                          if (t.id !== 'custom') setEditForm(f => ({ ...f, background_color: t.bg, text_color: t.text }));
                        }}
                        className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl border transition-all
                          ${selectedTemplate === t.id
                            ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-1 ring-indigo-200'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'}`}
                      >
                        {t.id === 'custom' ? (
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-400 via-purple-400 to-blue-400" />
                        ) : (
                          <div className="w-6 h-6 rounded-lg border border-slate-200" style={{ backgroundColor: t.bg }} />
                        )}
                        <span className="text-[8px] text-slate-500 font-medium leading-tight">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color pickers */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {selectedTemplate === 'custom' ? 'Colores personalizados' : 'Colores del tema'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block font-medium">Fondo</label>
                      <div className="flex items-center gap-2">
                        <input type="color" className="w-8 h-7 rounded-lg cursor-pointer border border-slate-200"
                          value={editForm.background_color} onChange={e => setEditForm(f => ({ ...f, background_color: e.target.value }))} />
                        <span className="text-[10px] font-mono text-slate-400">{editForm.background_color}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block font-medium">Texto</label>
                      <div className="flex items-center gap-2">
                        <input type="color" className="w-8 h-7 rounded-lg cursor-pointer border border-slate-200"
                          value={editForm.text_color} onChange={e => setEditForm(f => ({ ...f, text_color: e.target.value }))} />
                        <span className="text-[10px] font-mono text-slate-400">{editForm.text_color}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info tip */}
                <div className="mt-auto p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                  <p className="text-[10px] text-indigo-600 font-medium mb-1">💡 Consejo</p>
                  <p className="text-[10px] text-indigo-500/70 leading-relaxed">
                    Los cambios se sincronizan automáticamente con Google Wallet. Todos los clientes verán el nuevo diseño.
                  </p>
                </div>
              </div>

              {/* ─── Col 3: Live Wallet Preview ─── */}
              <div className="col-span-5 p-6 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/50">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em] mb-4">Vista previa en vivo</p>

                {/* Phone frame */}
                <div className="relative w-full max-w-[280px] mx-auto">
                  <div className="bg-gray-900 rounded-[2.5rem] p-2.5 shadow-2xl border-4 border-gray-800">
                    <div className="bg-gray-900 rounded-[2rem] overflow-hidden relative">
                      <div className="bg-black/80 px-4 py-2.5 flex justify-center">
                        <div className="w-14 h-1.5 bg-gray-700 rounded-full" />
                      </div>
                      <div className="px-3 pb-4 pt-1">
                        <div
                          className="rounded-2xl p-4 min-h-[230px] flex flex-col justify-between shadow-xl relative overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${editForm.background_color || '#1a1a2e'} 0%, ${adjustColor(editForm.background_color || '#1a1a2e', -25)} 50%, ${editForm.background_color || '#1a1a2e'} 100%)`,
                            color: editForm.text_color || '#ffffff',
                          }}
                        >
                          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, ${editForm.text_color || '#fff'} 1px, transparent 1px)`, backgroundSize: '16px 16px' }} />

                          {editForm.strip_image_url && (
                            <div className="relative z-10 -mx-4 -mt-4 mb-2">
                              <img src={editForm.strip_image_url} alt="Hero" className="w-full h-16 object-cover rounded-t-2xl" onError={e => (e.currentTarget.style.display = 'none')} />
                            </div>
                          )}

                          <div className="relative z-10 flex items-center gap-2.5 mb-3">
                            {logoPreview ? (
                              <img src={logoPreview} alt="Logo" className="w-12 h-12 rounded-xl object-cover border-2 border-white/30 shadow-lg" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow">
                                <span className="font-bold text-base">{editForm.name?.[0] || 'P'}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[7px] font-bold uppercase tracking-widest opacity-50">Programa de Fidelidad</p>
                              <p className="text-sm font-bold leading-tight truncate drop-shadow">{editForm.name || 'Nombre del Programa'}</p>
                            </div>
                          </div>

                          <div className="relative z-10 mb-2">
                            <p className="text-[9px] opacity-60 line-clamp-2">{editForm.description || 'Descripción del programa'}</p>
                          </div>

                          <div className="relative z-10 flex items-end justify-between mt-auto">
                            <div>
                              <p className="text-[7px] uppercase tracking-wider opacity-40 font-semibold">Cliente</p>
                              <p className="text-xs font-bold opacity-90">Juan Pérez</p>
                            </div>
                            <div className="bg-white/95 rounded-xl p-1 shadow-lg">
                              <PremiumQrSvg color={editForm.background_color || '#1a1a2e'} size={50} />
                            </div>
                          </div>

                          {/* Powered by branding */}
                          <div className="relative z-10 mt-2 pt-1.5 border-t" style={{ borderColor: `${editForm.text_color || '#fff'}20` }}>
                            <p className="text-[7px] text-center opacity-30 tracking-wide">Powered by Loyallia — Claro Partner</p>
                          </div>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-gray-600 rounded-full" />
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-[10px] text-slate-400 text-center">Apple Wallet / Google Wallet</p>

                {editForm.icon_url && (
                  <div className="mt-3 flex flex-col items-center gap-1">
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider">Ícono del pase</p>
                    <img src={editForm.icon_url} alt="Icon" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow" onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between px-8 py-4 border-t border-slate-200/60 bg-white/60 shrink-0">
              <p className="text-[10px] text-slate-300 font-medium">Powered by Loyallia — Claro Partner</p>
              <div className="flex gap-3">
                <button onClick={() => setShowEdit(false)}
                  className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium border border-slate-200 transition-all">
                  Cancelar
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={editSaving || !editForm.name}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20"
                  id="save-edit-program"
                >
                  {editSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : '✓ Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

