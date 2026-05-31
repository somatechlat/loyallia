'use client';
import { useState, useEffect } from 'react';
import { programsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types';
import toast from 'react-hot-toast';
import { getQrUrl, getWhatsAppShareUrl } from '@/lib/constants';
import { stripLocalMinioUrl } from '@/lib/url-utils';
import ConfirmModal from '@/components/ui/ConfirmModal';
import WalletDesigner from '@/components/programs/WalletDesigner';
import {
  type WalletDesignState,
  defaultWalletDesignState,
} from '@/components/wallet/types';
import {
  parseWalletDesignFromMetadata,
  buildWalletDesignMetadata,
} from '@/components/wallet/serialization';
import WalletCardPreview from '@/components/programs/WalletCardPreview';
import ProgramMembersModal from '@/components/programs/ProgramMembersModal';
import ProgramTransactionsModal from '@/components/programs/ProgramTransactionsModal';

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
  const [showQrModal, setShowQrModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Wallet design for non-edit preview (parsed from program metadata)
  const [previewWalletDesign, setPreviewWalletDesign] = useState<WalletDesignState>(defaultWalletDesignState());
  const [previewPlatform, setPreviewPlatform] = useState<'apple' | 'google'>('apple');

  const startEdit = () => {
    if (!program) return;
    setEditForm({
      name: program.name,
      description: program.description,
      background_color: program.background_color,
      text_color: program.text_color,
      logo_url: stripLocalMinioUrl(program.logo_url),
      strip_image_url: stripLocalMinioUrl(program.strip_image_url),
      icon_url: stripLocalMinioUrl(program.icon_url),
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
      // Show QR modal for phone enrollment testing
      setShowQrModal(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: unknown; message?: string; error?: string } } };
      const detail = axiosErr?.response?.data?.detail;
      let msg: string;
      if (Array.isArray(detail)) {
        // Pydantic validation error array
        msg = detail.map((d: Record<string, unknown>) => `${(d.loc as string[])?.join('.')}: ${d.msg}`).join('; ');
      } else if (typeof detail === 'string') {
        msg = detail;
      } else {
        msg = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error || 'Error al actualizar';
      }
      toast.error(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const loadProgram = () => {
    Promise.all([programsApi.get(id), programsApi.stats(id)])
      .then(([progRes, statsRes]) => {
        const prog = progRes.data;
        // Clean old hardcoded MinIO URLs from legacy fields
        prog.logo_url = stripLocalMinioUrl(prog.logo_url);
        prog.strip_image_url = stripLocalMinioUrl(prog.strip_image_url);
        prog.icon_url = stripLocalMinioUrl(prog.icon_url);
        setProgram(prog);
        setStats(statsRes.data);
        // Parse wallet design for preview
        const parsed = parseWalletDesignFromMetadata(prog.metadata);
        setPreviewWalletDesign(parsed);
        setPreviewPlatform(parsed.provider || 'apple');
      })
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
                    setShowQrModal(true);
                  } catch (err: unknown) {
                    const axiosErr = err as { response?: { data?: { detail?: unknown; message?: string; error?: string } } };
                    const detail = axiosErr?.response?.data?.detail;
                    let msg: string;
                    if (Array.isArray(detail)) {
                      msg = detail.map((d: Record<string, unknown>) => `${(d.loc as string[])?.join('.')}: ${d.msg}`).join('; ');
                    } else if (typeof detail === 'string') {
                      msg = detail;
                    } else {
                      msg = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error || 'Error al publicar programa';
                    }
                    toast.error(msg);
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
                  setShowQrModal(true);
                } catch (err: unknown) {
                  const axiosErr = err as { response?: { data?: { detail?: unknown; message?: string; error?: string } } };
                  const detail = axiosErr?.response?.data?.detail;
                  let msg: string;
                  if (Array.isArray(detail)) {
                    msg = detail.map((d: Record<string, unknown>) => `${(d.loc as string[])?.join('.')}: ${d.msg}`).join('; ');
                  } else if (typeof detail === 'string') {
                    msg = detail;
                  } else {
                    msg = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error || 'Error al publicar programa';
                  }
                  toast.error(msg);
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
        <button
          onClick={() => setShowMembersModal(true)}
          className="card p-6 bg-surface-50 border-t-4 border-indigo-500 text-left hover:shadow-lg hover:border-indigo-600 transition-all cursor-pointer group"
        >
          <h3 className="text-sm font-semibold text-surface-500 uppercase group-hover:text-indigo-600 transition-colors">Miembros Activos</h3>
          <p className="text-3xl font-bold mt-2">{stats?.active_passes ?? stats?.active_members ?? 0}</p>
          <p className="text-xs text-surface-400 mt-1">Click para ver detalles →</p>
        </button>
        <button
          onClick={() => setShowTransactionsModal(true)}
          className="card p-6 bg-surface-50 border-t-4 border-emerald-500 text-left hover:shadow-lg hover:border-emerald-600 transition-all cursor-pointer group"
        >
          <h3 className="text-sm font-semibold text-surface-500 uppercase group-hover:text-emerald-600 transition-colors">Recompensas Canjeadas</h3>
          <p className="text-3xl font-bold mt-2">{stats?.transactions ?? stats?.total_rewards_redeemed ?? 0}</p>
          <p className="text-xs text-surface-400 mt-1">Click para ver historial →</p>
        </button>
        <div className="card p-6 bg-surface-50 border-t-4 border-rose-500">
          <h3 className="text-sm font-semibold text-surface-500 uppercase">Tasa de Participación</h3>
          <p className="text-3xl font-bold mt-2">{stats?.engagement_rate ?? stats?.enrollments ?? 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Card Preview - Pixel Perfect Wallet Design with Apple/Google Toggle */}
        <div className="card p-8 text-center bg-surface-50 border-2 border-dashed border-surface-200 dark:border-surface-700">
          <WalletCardPreview
            form={{
              name: program.name,
              description: program.description,
              card_type: program.card_type,
              background_color: program.background_color,
              text_color: program.text_color,
              strip_image_url: program.strip_image_url,
            }}
            selectedType={selectedType}
            logoPreview={program.logo_url}
            stripPreview={program.strip_image_url}
            barcodeType={program.barcode_type}
            walletPlatform={previewPlatform}
            onWalletPlatformChange={setPreviewPlatform}
            walletDesign={previewWalletDesign}
          />
        </div>

        {/* Enrollment QR Code — Premium Styled */}
        <div className="card p-8 text-center">
          <h3 className="text-base font-semibold text-surface-900 dark:text-white mb-2">Código QR de inscripción</h3>
          <p className="text-sm text-surface-500 mb-4">
            Imprime este código o compártelo para que tus clientes se inscriban directamente.
          </p>
          <div className="flex justify-center mb-4">
            <img
              src={getQrUrl(`${resolvedAppUrl}/enroll/${id}`)}
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
              href={getWhatsAppShareUrl(`¡Únete a nuestro programa de fidelización! ${resolvedAppUrl}/enroll/${id}`)}
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

      {/* Members Modal */}
      {showMembersModal && program && (
        <ProgramMembersModal
          programId={program.id}
          cardType={program.card_type}
          onClose={() => setShowMembersModal(false)}
        />
      )}

      {/* Transactions Modal */}
      {showTransactionsModal && program && (
        <ProgramTransactionsModal
          programId={program.id}
          onClose={() => setShowTransactionsModal(false)}
        />
      )}

      {/* Enrollment QR Modal — shown after save/publish for phone testing */}
      {showQrModal && program && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowQrModal(false)}>
          <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-surface-900 dark:text-white">¡Listo para probar!</h3>
              <button onClick={() => setShowQrModal(false)} className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Escanea este código con tu teléfono para agregar la tarjeta a tu wallet.
            </p>
            <div className="flex justify-center">
              <img
                src={getQrUrl(`${resolvedAppUrl}/enroll/${id}`)}
                alt="QR de inscripción"
                className="w-56 h-56 rounded-2xl border-2 border-surface-100 p-2 bg-white shadow-lg"
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
              >
                <svg className="w-4 h-4 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copiar enlace de inscripción
              </button>
              <a
                href={getWhatsAppShareUrl(`¡Únete a nuestro programa de fidelización! ${resolvedAppUrl}/enroll/${id}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn w-full justify-center text-sm bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Compartir por WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
