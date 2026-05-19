'use client';
import { useState, useEffect } from 'react';
import { programsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types';
import toast from 'react-hot-toast';
import { APP_CONFIG } from '@/lib/constants';
import { adjustColor } from '@/components/programs/constants';
import PremiumQrSvg from '@/components/programs/PremiumQrSvg';
import ConfirmModal from '@/components/ui/ConfirmModal';
import WalletDesigner, {
  type WalletDesignState,
  type AppleWalletFeatureConfig,
  type AppleAdvancedConfig,
  type GoogleAdvancedConfig,
  type GoogleFieldRow,
  type AppleFieldDef,
  defaultWalletDesignState,
} from '@/components/programs/WalletDesigner';
import WalletCardPreview from '@/components/programs/WalletCardPreview';

/** Premium styled QR code URL */
function styledQrUrl(data: string, size = APP_CONFIG.QR_CODE_SIZE): string {
  return `https://quickchart.io/qr?text=${encodeURIComponent(data)}&size=${size}&margin=2&dark=1a1a2e&light=ffffff&ecLevel=M&format=png`;
}

const CARD_TYPE_LABELS: Record<string, string> = {
  stamp: 'Sellos', points: 'Puntos', visits: 'Visitas', cashback: 'Cashback',
  coupon: 'Cupón', affiliate: 'Afiliación', discount: 'Descuento',
  gift_certificate: 'Certificado', vip_membership: 'VIP', corporate_discount: 'Corporativo',
  referral_pass: 'Referidos', multipass: 'Multipase',
};

interface ProgramData {
  id: string;
  name: string;
  description: string;
  card_type: string;
  background_color: string;
  text_color: string;
  logo_url: string;
  strip_image_url: string;
  icon_url: string;
  barcode_type: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  is_published: boolean;
}

interface ProgramStats {
  active_passes?: number;
  active_members?: number;
  transactions?: number;
  total_rewards_redeemed?: number;
  engagement_rate?: number;
  enrollments?: number;
}

/* ─── Helpers: convert between stored metadata and WalletDesignState ─── */

function parseWalletDesignFromMetadata(metadata: Record<string, unknown>): WalletDesignState {
  const wd = metadata?.wallet_design as Record<string, unknown> | undefined;
  if (!wd) return defaultWalletDesignState();

  const appleImages = (wd.apple_images as Record<string, string>) || {};
  const googleImages = (wd.google_images as Record<string, string>) || {};
  const appleWallet = (metadata.apple_wallet as AppleWalletFeatureConfig | undefined);

  return {
    provider: (wd.provider as 'apple' | 'google') || 'apple',
    appleLogoUrl: appleImages.logo || '',
    appleLogo2xUrl: appleImages.logo_2x || '',
    appleStripUrl: appleImages.strip || '',
    appleStrip2xUrl: appleImages.strip_2x || '',
    appleThumbnailUrl: appleImages.thumbnail || '',
    appleThumbnail2xUrl: appleImages.thumbnail_2x || '',
    appleIconUrl: appleImages.icon || '',
    appleIcon2xUrl: appleImages.icon_2x || '',
    googleProgramLogoUrl: googleImages.program_logo || '',
    googleHeroImageUrl: googleImages.hero_image || '',
    googleWideLogoUrl: googleImages.wide_logo || '',
    googleImageModuleUrl: googleImages.image_module || '',
    appleFields: (wd.apple_fields as Record<string, AppleFieldDef[]>) || {},
    googleRows: (wd.google_rows as GoogleFieldRow[]) || [],
    googleAdvanced: (wd.google_advanced as GoogleAdvancedConfig) || defaultWalletDesignState().googleAdvanced,
    appleAdvanced: (wd.apple_advanced as AppleAdvancedConfig) || defaultWalletDesignState().appleAdvanced,
    appleNfc: appleWallet || defaultWalletDesignState().appleNfc,
  };
}

function buildWalletDesignMetadata(state: WalletDesignState): Record<string, unknown> {
  return {
    wallet_design: {
      provider: state.provider,
      apple_images: {
        logo: state.appleLogoUrl,
        logo_2x: state.appleLogo2xUrl,
        strip: state.appleStripUrl,
        strip_2x: state.appleStrip2xUrl,
        thumbnail: state.appleThumbnailUrl,
        thumbnail_2x: state.appleThumbnail2xUrl,
        icon: state.appleIconUrl,
        icon_2x: state.appleIcon2xUrl,
      },
      google_images: {
        program_logo: state.googleProgramLogoUrl,
        hero_image: state.googleHeroImageUrl,
        wide_logo: state.googleWideLogoUrl,
        image_module: state.googleImageModuleUrl,
      },
      apple_fields: state.appleFields,
      google_rows: state.googleRows,
      google_advanced: state.googleAdvanced,
      apple_advanced: state.appleAdvanced,
    },
    apple_wallet: state.appleNfc,
    wallet_provider: state.provider,
  };
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
  const isOwner = user?.role === UserRole.OWNER;

  const [program, setProgram] = useState<ProgramData | null>(null);
  const [stats, setStats] = useState<ProgramStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProgramData>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Wallet design state for full editing
  const [walletDesign, setWalletDesign] = useState<WalletDesignState>(defaultWalletDesignState());

  // Suspend / Delete modal states
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const startEdit = () => {
    if (!program) return;
    setEditForm({
      name: program.name,
      description: program.description,
      background_color: program.background_color,
      text_color: program.text_color,
      logo_url: program.logo_url,
      strip_image_url: program.strip_image_url,
      icon_url: program.icon_url,
    });
    const parsed = parseWalletDesignFromMetadata(program.metadata);
    setWalletDesign(parsed);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
    setWalletDesign(defaultWalletDesignState());
  };

  const saveEdit = async () => {
    if (!program) return;
    setEditSaving(true);
    try {
      const walletMeta = buildWalletDesignMetadata(walletDesign);
      // Map designer images to legacy fields for backward compat
      const legacyImages = {
        logo_url: walletDesign.provider === 'apple' ? walletDesign.appleLogoUrl : walletDesign.googleProgramLogoUrl,
        strip_image_url: walletDesign.provider === 'apple' ? walletDesign.appleStripUrl : walletDesign.googleHeroImageUrl,
        icon_url: walletDesign.provider === 'apple' ? walletDesign.appleIconUrl : walletDesign.googleProgramLogoUrl,
      };
      await programsApi.update(program.id, {
        ...editForm,
        ...legacyImages,
        metadata: { ...program.metadata, ...walletMeta },
      });
      toast.success('Programa actualizado');
      setIsEditing(false);
      loadProgram();
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setEditSaving(false);
    }
  };

  const loadProgram = () => {
    Promise.all([programsApi.get(id), programsApi.stats(id)])
      .then(([progRes, statsRes]) => { setProgram(progRes.data); setStats(statsRes.data); })
      .catch(() => toast.error('Error al cargar los detalles del programa'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProgram(); }, [id]);

  const handleSuspend = async () => {
    if (!program) return;
    setProcessing(true);
    try {
      await programsApi.suspend(program.id);
      toast.success(program.is_active ? 'Programa suspendido' : 'Programa reactivado');
      setShowSuspendModal(false);
      loadProgram();
    } catch {
      toast.error('Error al cambiar estado del programa');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!program) return;
    setProcessing(true);
    try {
      await programsApi.delete(program.id);
      toast.success('Programa eliminado permanentemente');
      setShowDeleteModal(false);
      window.location.href = '/programs';
    } catch {
      toast.error('Error al eliminar programa');
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-surface-500 animate-pulse">Cargando tarjeta digital...</div>;
  if (!program) return <div className="p-8 text-center text-red-500">Programa no encontrado.</div>;

  const selectedType = { value: program.card_type, label: CARD_TYPE_LABELS[program.card_type] || program.card_type, icon: program.card_type, desc: '' };

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
        {isOwner && !isEditing && (
          <div className="flex items-center gap-2">
            {!program.is_published && (
              <button
                onClick={async () => {
                  try {
                    await programsApi.publish(program.id);
                    toast.success('Programa publicado exitosamente');
                    loadProgram();
                  } catch {
                    toast.error('Error al publicar programa');
                  }
                }}
                className="btn-primary text-sm flex items-center gap-2"
                id="publish-program-btn"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                Publicar
              </button>
            )}
            <button onClick={startEdit} className="btn-secondary text-sm flex items-center gap-2" id="edit-program-btn">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Editar
            </button>
            <button
              onClick={() => setShowSuspendModal(true)}
              className={`btn-secondary text-sm flex items-center gap-2 ${program.is_active ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
              id="suspend-program-btn"
            >
              {program.is_active ? 'Suspender' : 'Activar'}
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn-secondary text-sm flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
              id="delete-program-btn"
            >
              Eliminar
            </button>
          </div>
        )}
        {isOwner && isEditing && (
          <div className="flex items-center gap-2">
            <button onClick={cancelEdit} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={saveEdit} disabled={editSaving} className="btn-primary text-sm">
              {editSaving ? <span className="spinner w-4 h-4" /> : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>

      {/* Draft banner */}
      {!program.is_published && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Este programa está en borrador. Los clientes no pueden inscribirse hasta que lo publiques.</span>
          </div>
          {isOwner && !isEditing && (
            <button
              onClick={async () => {
                try {
                  await programsApi.publish(program.id);
                  toast.success('Programa publicado exitosamente');
                  loadProgram();
                } catch {
                  toast.error('Error al publicar programa');
                }
              }}
              className="btn-primary text-sm"
            >
              Publicar ahora
            </button>
          )}
        </div>
      )}

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
                      <p className="text-xs font-bold opacity-80">Cliente</p>
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
              src={styledQrUrl(`${resolvedAppUrl}/enroll/${id}`)}
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

      {/* Inline Edit Section */}
      {isEditing && program && (
        <div className="space-y-6">
          {/* Basic fields */}
          <div className="card p-6 space-y-4 animate-fade-in">
            <h2 className="text-base font-bold text-surface-900 dark:text-white">Editar configuración básica</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">Nombre del programa</label>
                <input
                  className="input"
                  value={editForm.name || ''}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label text-xs">Descripción</label>
                <input
                  className="input"
                  value={editForm.description || ''}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="label text-xs">Color de fondo</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="w-10 h-8 rounded cursor-pointer"
                    value={editForm.background_color || '#1a1a2e'}
                    onChange={e => setEditForm(f => ({ ...f, background_color: e.target.value }))}
                  />
                  <span className="text-xs font-mono">{editForm.background_color}</span>
                </div>
              </div>
              <div>
                <label className="label text-xs">Color de texto</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="w-10 h-8 rounded cursor-pointer"
                    value={editForm.text_color || '#ffffff'}
                    onChange={e => setEditForm(f => ({ ...f, text_color: e.target.value }))}
                  />
                  <span className="text-xs font-mono">{editForm.text_color}</span>
                </div>
              </div>
            </div>
          </div>

          {/* V2 Designer Link */}
          <div className="flex justify-end">
            <a
              href={`/programs/${program.id}/design`}
              className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors px-4 py-2 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900/30"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              Abrir en diseñador V2 →
            </a>
          </div>

          {/* Full Wallet Designer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="space-y-6">
              <WalletDesigner
                cardType={program.card_type}
                state={walletDesign}
                onChange={setWalletDesign}
                provider={walletDesign.provider}
              />
            </div>
            <div className="sticky top-24 self-start bg-gradient-to-b from-surface-100 to-surface-200 dark:from-surface-800 dark:to-surface-900 rounded-2xl p-6 shadow-inner">
              <WalletCardPreview
                form={{
                  name: editForm.name || program.name,
                  description: editForm.description || program.description,
                  card_type: program.card_type,
                  background_color: editForm.background_color || program.background_color,
                  text_color: editForm.text_color || program.text_color,
                  strip_image_url: editForm.strip_image_url || program.strip_image_url,
                }}
                selectedType={selectedType}
                barcodeType={program.barcode_type}
                walletPlatform={walletDesign.provider}
                onWalletPlatformChange={(v) => setWalletDesign(w => ({ ...w, provider: v }))}
                walletDesign={walletDesign}
              />
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirm Modal */}
      {showSuspendModal && program && (
        <ConfirmModal
          title={program.is_active ? 'Suspender Programa' : 'Reactivar Programa'}
          message={
            program.is_active
              ? `¿Estás seguro de suspender "${program.name}"? Los clientes no podrán usar sus tarjetas temporalmente.`
              : `¿Estás seguro de reactivar "${program.name}"?`
          }
          confirmLabel={program.is_active ? 'Suspender' : 'Reactivar'}
          variant={program.is_active ? 'warning' : 'default'}
          onConfirm={handleSuspend}
          onCancel={() => setShowSuspendModal(false)}
          loading={processing}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && program && (
        <ConfirmModal
          title="Eliminar Programa"
          message={`¿Estás seguro de eliminar "${program.name}"? Se eliminarán todas las tarjetas emitidas y el historial. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          loading={processing}
        />
      )}
    </div>
  );
}
