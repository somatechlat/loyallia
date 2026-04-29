'use client';
import { useState, useEffect } from 'react';
import { programsApi } from '@/lib/api';
import { useAuth, User } from '@/lib/auth';
import toast from 'react-hot-toast';


const CARD_TYPE_LABELS: Record<string, string> = {
  stamp: 'Sellos', cashback: 'Cashback', coupon: 'Cupón',
  affiliate: 'Afiliación', discount: 'Descuento',
  gift_certificate: 'Certificado regalo', vip_membership: 'Membresía VIP',
  corporate_discount: 'Descuento corporativo', referral_pass: 'Referidos', multipass: 'Multipase',
};

interface Program {
  id: string; name: string; card_type: string; description: string;
  is_active: boolean; enrollments_count: number; created_at: string;
  enrollment_url?: string;
}

/* ─── Status-classified sections (PROG-005/006/007) ──────────────────── */
function ProgramSections({ programs, user, openSuspendModal, openDeleteModal }: {
  programs: Program[];
  user: User | null;
  openSuspendModal: (p: Program) => void;
  openDeleteModal: (p: Program) => void;
}) {
  const [expandActive, setExpandActive] = useState(false);
  const [expandDraft, setExpandDraft] = useState(false);
  const [expandInactive, setExpandInactive] = useState(false);

  const active = programs.filter(p => p.is_active && (p.enrollments_count ?? 0) > 0);
  const drafts = programs.filter(p => p.is_active && (p.enrollments_count ?? 0) === 0);
  const inactive = programs.filter(p => !p.is_active);

  const sections = [
    {
      title: 'Activas', items: active, expanded: expandActive, setExpanded: setExpandActive,
      accentBorder: 'border-l-emerald-500', accentBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      accentText: 'text-emerald-600 dark:text-emerald-400', badge: 'badge-green',
      icon: '●',
    },
    {
      title: 'Borradores', items: drafts, expanded: expandDraft, setExpanded: setExpandDraft,
      accentBorder: 'border-l-amber-500', accentBg: 'bg-amber-50 dark:bg-amber-900/20',
      accentText: 'text-amber-600 dark:text-amber-400', badge: 'badge-amber',
      icon: '◐',
    },
    {
      title: 'Inactivas', items: inactive, expanded: expandInactive, setExpanded: setExpandInactive,
      accentBorder: 'border-l-surface-400', accentBg: 'bg-surface-50 dark:bg-surface-800/50',
      accentText: 'text-surface-500', badge: 'badge-gray',
      icon: '○',
    },
  ];

  return (
    <div className="space-y-6">
      {sections.map(sec => (
        sec.items.length > 0 && (
          <div key={sec.title} className={`rounded-2xl border-l-4 ${sec.accentBorder} overflow-hidden`}>
            {/* Section Header */}
            <div className={`flex items-center justify-between px-5 py-3 ${sec.accentBg}`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${sec.accentText}`}>{sec.icon}</span>
                <h2 className={`text-sm font-bold ${sec.accentText}`}>{sec.title}</h2>
                <span className="text-xs text-surface-400">({sec.items.length})</span>
              </div>
              {sec.items.length > 3 && (
                <button
                  onClick={() => sec.setExpanded(!sec.expanded)}
                  className="text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
                  id={`expand-${sec.title.toLowerCase()}`}
                >
                  {sec.expanded ? 'Mostrar menos' : 'Mostrar más'}
                </button>
              )}
            </div>
            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-white dark:bg-surface-900">
              {(sec.expanded ? sec.items : sec.items.slice(0, 3)).map(p => (
                <div key={p.id} className="card-hover p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="badge-purple mb-2 inline-block">
                        {CARD_TYPE_LABELS[p.card_type] ?? p.card_type}
                      </span>
                      <h3 className="font-semibold text-surface-900 dark:text-white">{p.name}</h3>
                      <p className="text-surface-400 text-sm mt-1 line-clamp-2">{p.description}</p>
                    </div>
                    <span className={sec.badge}>
                      {p.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="border-t border-surface-100 dark:border-surface-800 pt-3 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-surface-900 dark:text-white">{p.enrollments_count ?? 0}</p>
                      <p className="text-xs text-surface-400">inscritos</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {user?.role === 'OWNER' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => openSuspendModal(p)}
                            className={`px-2 py-1 text-[10px] rounded-full font-medium transition-colors ${
                              p.is_active
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                            }`}
                            title={p.is_active ? 'Suspender' : 'Activar'}
                          >
                            {p.is_active ? 'Suspender' : 'Activar'}
                          </button>
                          <button
                            onClick={() => openDeleteModal(p)}
                            className="px-2 py-1 text-[10px] rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 font-medium transition-colors"
                            title="Eliminar"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                      <a href={`/programs/${p.id}`} className="p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-full transition-colors" title="Ver detalles">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
}

export default function ProgramsPage() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetProgram, setTargetProgram] = useState<Program | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadPrograms = () => {
    programsApi.list()
      .then(({ data }) => setPrograms(data.programs || []))
      .catch(() => toast.error('Error al cargar programas'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  const openSuspendModal = (p: Program) => {
    setTargetProgram(p);
    setShowSuspendModal(true);
  };

  const openDeleteModal = (p: Program) => {
    setTargetProgram(p);
    setShowDeleteModal(true);
  };

  const closeModal = () => {
    setShowSuspendModal(false);
    setShowDeleteModal(false);
    setTargetProgram(null);
  };

  const handleSuspend = async () => {
    if (!targetProgram) return;
    setProcessing(true);
    try {
      await programsApi.suspend(targetProgram.id);
      toast.success(targetProgram.is_active ? 'Programa suspendido' : 'Programa reactivado');
      closeModal();
      loadPrograms();
    } catch {
      toast.error('Error al cambiar estado del programa');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!targetProgram) return;
    setProcessing(true);
    try {
      await programsApi.delete(targetProgram.id);
      toast.success('Programa eliminado permanentemente');
      closeModal();
      loadPrograms();
    } catch {
      toast.error('Error al eliminar programa');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6" id="programs-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Programas de fidelización</h1>
          <p className="text-surface-500 text-sm mt-1 max-w-2xl">
            Crea, administra y organiza tus programas de fidelización desde un solo lugar. Aquí podrás diseñar nuevas tarjetas, revisar tus programas activos, continuar los que están en borrador y consultar los inactivos.
          </p>
          <p className="mt-2">
            <span className="text-emerald-500 font-bold text-sm" id="active-count">
              {programs.filter(p => p.is_active).length} programa(s) activos
            </span>
          </p>
        </div>
        {user?.role === 'OWNER' && (
          <a href="/programs/new" className="btn-primary" id="new-program-btn">+ Crear nueva tarjeta</a>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-surface-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : programs.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-brand-50 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          </div>
          <p className="text-surface-700 font-semibold text-lg">No tienes programas aun</p>
          <p className="text-surface-400 text-sm mt-2">Crea tu primer programa de fidelizacion</p>
          {user?.role === 'OWNER' && (
            <a href="/programs/new" className="btn-primary mt-6 inline-flex" id="create-first-program-btn">
              Crear programa
            </a>
          )}
        </div>
      ) : (
        <ProgramSections programs={programs} user={user} openSuspendModal={openSuspendModal} openDeleteModal={openDeleteModal} />
      )}

      {/* ── Suspend Confirmation Modal ── */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-surface-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-surface-200 dark:border-surface-700">
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                targetProgram?.is_active ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-2">
                {targetProgram?.is_active ? 'Suspender Programa' : 'Reactivar Programa'}
              </h3>
              <p className="text-surface-500 mb-6">
                {targetProgram?.is_active 
                  ? `¿Estás seguro de suspender "${targetProgram?.name}"? Los clientes no podrán usar sus tarjetas temporalmente.`
                  : `¿Estás seguro de reactivar "${targetProgram?.name}"?`}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 font-semibold hover:bg-surface-200 dark:hover:bg-surface-700 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSuspend}
                  disabled={processing}
                  className={`flex-1 px-4 py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 ${
                    targetProgram?.is_active ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
                  }`}
                >
                  {processing ? 'Procesando...' : (targetProgram?.is_active ? 'Suspender' : 'Reactivar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-surface-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-red-200 dark:border-red-900/30">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-2">Eliminar Programa</h3>
              <div className="p-4 bg-red-50 rounded-2xl mb-6">
                <p className="text-red-800 text-sm font-medium">
                  Atención: Esta acción es permanente. Se eliminarán todas las tarjetas emitidas ({targetProgram?.enrollments_count}) y el historial de este programa.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 font-semibold hover:bg-surface-200 dark:hover:bg-surface-700 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={processing}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all shadow-lg shadow-red-200 disabled:opacity-50"
                >
                  {processing ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
