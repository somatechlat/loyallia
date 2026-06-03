'use client';
import { useState, useEffect } from 'react';
import { programsApi } from '@/lib/api';
import { useAuth, User } from '@/lib/auth';
import { UserRole } from '@/types';
import toast from 'react-hot-toast';
import { useI18n } from '@/lib/i18n';
import ConfirmModal from '@/components/ui/ConfirmModal';

function useCardTypeLabels(t: (key: string) => string): Record<string, string> {
  return {
    stamp: t('programs.cardTypes.stamp'), points: t('programs.cardTypes.points'), visits: t('programs.cardTypes.visits'), cashback: t('programs.cardTypes.cashback'),
    coupon: t('programs.cardTypes.coupon'), affiliate: t('programs.cardTypes.affiliate'), discount: t('programs.cardTypes.discount'),
    gift_certificate: t('programs.cardTypes.gift_certificate'), vip_membership: t('programs.cardTypes.vip_membership'), corporate_discount: t('programs.cardTypes.corporate_discount'),
    referral_pass: t('programs.cardTypes.referral_pass'), multipass: t('programs.cardTypes.multipass'),
  };
}

interface Program {
  id: string; name: string; card_type: string; description: string;
  is_active: boolean; is_published: boolean; enrollments_count: number; created_at: string;
  enrollment_url?: string;
}

/* ─── Status-classified sections (PROG-005/006/007) ──────────────────── */
function ProgramSections({ programs, user, openSuspendModal, openDeleteModal, onPublish, t }: {
  programs: Program[];
  user: User | null;
  openSuspendModal: (p: Program) => void;
  openDeleteModal: (p: Program) => void;
  onPublish: (p: Program) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [expandActive, setExpandActive] = useState(false);
  const [expandDraft, setExpandDraft] = useState(false);
  const [expandInactive, setExpandInactive] = useState(false);
  const CARD_TYPE_LABELS = useCardTypeLabels(t);

  const active = programs.filter(p => p.is_published && p.is_active);
  const drafts = programs.filter(p => !p.is_published);
  const inactive = programs.filter(p => p.is_published && !p.is_active);

  const sections = [
    {
      title: t('programs.status.active'), items: active, expanded: expandActive, setExpanded: setExpandActive,
      accentBorder: 'border-l-emerald-500', accentBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      accentText: 'text-emerald-600 dark:text-emerald-400', badge: 'badge-green',
      icon: '●',
    },
    {
      title: t('programs.status.drafts'), items: drafts, expanded: expandDraft, setExpanded: setExpandDraft,
      accentBorder: 'border-l-amber-500', accentBg: 'bg-amber-50 dark:bg-amber-900/20',
      accentText: 'text-amber-600 dark:text-amber-400', badge: 'badge-amber',
      icon: '◐',
    },
    {
      title: t('programs.status.inactive'), items: inactive, expanded: expandInactive, setExpanded: setExpandInactive,
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
                  {sec.expanded ? t('common.showLess') : t('common.showMore')}
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
                      {!p.is_published ? t('common.draft') : p.is_active ? t('common.active') : t('common.inactive')}
                    </span>
                  </div>
                  <div className="border-t border-surface-100 dark:border-surface-800 pt-3 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-surface-900 dark:text-white">{p.enrollments_count ?? 0}</p>
                      <p className="text-xs text-surface-400">{t('programs.enrolled')}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <a
                        href={`/programs/${p.id}`}
                        className="px-2 py-1 text-[10px] rounded-full bg-brand-100 text-brand-600 hover:bg-brand-200 dark:bg-brand-900/30 dark:text-brand-400 font-medium transition-colors"
                        title={t('programs.viewProgram')}
                      >
                        {t('common.view')}
                      </a>
                      {user?.role === UserRole.OWNER && (
                        <>
                          <a
                            href={`/programs/${p.id}?tab=edit`}
                            className="px-2 py-1 text-[10px] rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 font-medium transition-colors"
                            title={t('common.edit')}
                          >
                            {t('common.edit')}
                          </a>
                          <button
                            onClick={() => openSuspendModal(p)}
                            className={`px-2 py-1 text-[10px] rounded-full font-medium transition-colors ${
                              p.is_active
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                            }`}
                            title={p.is_active ? t('programs.suspend') : t('programs.activate')}
                          >
                            {p.is_active ? t('programs.suspend') : t('programs.activate')}
                          </button>
                          {!p.is_published && (
                          <button
                            onClick={() => onPublish(p)}
                            className="px-2 py-1 text-[10px] rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium transition-colors"
                            title={t('programs.publish')}
                          >
                            {t('programs.publish')}
                          </button>
                        )}
                        <button
                            onClick={() => openDeleteModal(p)}
                            className="px-2 py-1 text-[10px] rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 font-medium transition-colors"
                            title={t('common.delete')}
                          >
                            {t('common.delete')}
                          </button>
                        </>
                      )}
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
  const { t } = useI18n();
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
      .catch(() => toast.error(t('programs.loadError')))
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
      toast.success(targetProgram.is_active ? t('programs.suspended') : t('programs.reactivated'));
      closeModal();
      loadPrograms();
    } catch {
      toast.error(t('programs.suspendError'));
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!targetProgram) return;
    setProcessing(true);
    try {
      await programsApi.delete(targetProgram.id);
      toast.success(t('programs.deleted'));
      closeModal();
      loadPrograms();
    } catch {
      toast.error(t('programs.deleteError'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6" id="programs-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('programs.title')}</h1>
          <p className="text-surface-500 text-sm mt-1 max-w-2xl">
            {t('programs.description')}
          </p>
          <p className="mt-2">
            <span className="text-emerald-500 font-bold text-sm" id="active-count">
              {t('programs.activeCount', { count: programs.filter(p => p.is_active).length })}
            </span>
          </p>
        </div>
        {user?.role === UserRole.OWNER && (
          <a href="/programs/new" className="btn-primary" id="new-program-btn">+ {t('programs.createProgram')}</a>
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
          <p className="text-surface-700 font-semibold text-lg">{t('programs.noPrograms')}</p>
          <p className="text-surface-400 text-sm mt-2">{t('programs.createFirst')}</p>
          {user?.role === UserRole.OWNER && (
            <a href="/programs/new" className="btn-primary mt-6 inline-flex" id="create-first-program-btn">
              {t('programs.createProgram')}
            </a>
          )}
        </div>
      ) : (
        <ProgramSections programs={programs} user={user} openSuspendModal={openSuspendModal} openDeleteModal={openDeleteModal} onPublish={(p) => {
          programsApi.publish(p.id)
            .then(() => { toast.success(t('programs.published')); loadPrograms(); })
            .catch(() => toast.error(t('programs.publishError')));
        }} t={t} />
      )}

      {/* LYL-H-FE-005: Standardized ConfirmModal for suspend/reactivate */}
      {showSuspendModal && targetProgram && (
        <ConfirmModal
          title={targetProgram.is_active ? t('programs.suspendTitle') : t('programs.reactivateTitle')}
          message={
            targetProgram.is_active
              ? t('programs.suspendConfirm', { name: targetProgram.name })
              : t('programs.reactivateConfirm', { name: targetProgram.name })
          }
          confirmLabel={targetProgram.is_active ? t('programs.suspendLabel') : t('programs.reactivateLabel')}
          variant={targetProgram.is_active ? 'warning' : 'default'}
          onConfirm={handleSuspend}
          onCancel={closeModal}
          loading={processing}
        />
      )}

      {/* LYL-H-FE-005: Standardized ConfirmModal for delete */}
      {showDeleteModal && targetProgram && (
        <ConfirmModal
          title={t('programs.deleteTitle')}
          message={t('programs.deleteConfirm', { name: targetProgram.name })}
          confirmLabel={t('common.delete')}
          variant="danger"
          onConfirm={handleDelete}
          onCancel={closeModal}
          loading={processing}
        />
      )}
    </div>
  );
}
