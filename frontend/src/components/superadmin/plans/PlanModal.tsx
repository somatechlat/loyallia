'use client';
import { Bot, Smartphone, Mail, MessageSquare, Rocket, Star, Zap, FileText, Wallet } from '@/components/ui/LucideIcons';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { superAdminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FeatureTagInput,
  FormField,
  InfoRow,
  PREDEFINED_FEATURES,
  emptyPlan,
  type PlanData,
} from './PlanModal.shared';

/**
 * Re-exported plan data type for consumers of PlanModal.
 */
export type { PlanData };

function StatusBadge({ status }: { status: PlanData['status'] }) {
  const { t } = useI18n();
  const config = {
    draft: { label: t('superadmin.plans.status.draft'), color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
    published: { label: t('superadmin.plans.status.published'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', dot: 'bg-green-500' },
    archived: { label: t('superadmin.plans.status.archived'), color: 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400', dot: 'bg-surface-400' },
  };
  const c = config[status] || config.published;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

/**
 * Props for the PlanModal component.
 */
interface PlanModalProps {
  /** Selected plan for editing, or null */
  selected: PlanData | null;
  /** Whether the modal is in create mode */
  showCreate: boolean;
  /** Close handler */
  onClose: () => void;
  /** Saved handler */
  onSaved: () => void;
}

/**
 * @description SuperAdmin modal for creating, viewing, and editing subscription plans.
 * @param {PlanModalProps} props - Component props
 * @returns JSX.Element | null
 */
export default function PlanModal({ selected, showCreate, onClose, onSaved }: PlanModalProps) {
  const { t } = useI18n();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(emptyPlan);
  const [saving, setSaving] = useState(false);

  const isOpen = selected !== null || showCreate;

  // When selected changes, populate form
  useEffect(() => {
    if (showCreate) {
      setForm({ ...emptyPlan });
      setEditMode(false);
    } else if (selected) {
      setForm({
        id: selected.id,
        name: selected.name,
        slug: selected.slug,
        description: selected.description,
        price_monthly: selected.price_monthly,
        price_annual: selected.price_annual,
        max_locations: selected.max_locations,
        max_users: selected.max_users,
        max_customers: selected.max_customers,
        max_programs: selected.max_programs,
        max_notifications_month: selected.max_notifications_month || 1000,
        max_transactions_month: selected.max_transactions_month || 5000,
        max_whatsapp_day: selected.max_whatsapp_day || 0,
        max_emails_month: selected.max_emails_month || 0,
        max_sms_day: selected.max_sms_day || 0,
        max_wallet_pushes_month: selected.max_wallet_pushes_month || 0,
        max_automations: selected.max_automations || 3,
        max_automation_executions_day: selected.max_automation_executions_day || 100,
        max_ai_queries_month: selected.max_ai_queries_month || 0,
        max_api_calls_day: selected.max_api_calls_day || 0,
        max_exports_month: selected.max_exports_month || 5,
        features: selected.features || [],
        status: selected.status || 'published',
        is_active: selected.is_active,
        is_featured: selected.is_featured,
        trial_days: selected.trial_days,
        sort_order: selected.sort_order,
      });
      setEditMode(false);
    }
  }, [selected, showCreate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { ...form, features: form.features };

      if (showCreate) {
        await superAdminApi.createPlan(body);
        toast.success(t('superadmin.plans.toast.created'));
      } else if (selected) {
        await superAdminApi.updatePlan(selected.id, body);
        toast.success(t('superadmin.plans.toast.updated'));
      }
      onClose();
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('superadmin.plans.toast.saveError');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!selected) return;
    const action = selected.is_active ? 'desactivar' : 'reactivar';
    if (!confirm(`${selected.is_active ? t('superadmin.plans.modal.archive') : t('superadmin.plans.modal.restore')} "${selected.name}"?`)) return;

    setSaving(true);
    try {
      if (selected.is_active) {
        await superAdminApi.deactivatePlan(selected.id);
        toast.success(t('superadmin.plans.toast.deactivated'));
      } else {
        await superAdminApi.updatePlan(selected.id, { is_active: true });
        toast.success(t('superadmin.plans.toast.reactivated'));
      }
      onClose();
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('superadmin.plans.toast.toggleError');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const getFeatureLabel = (id: string) => t(`superadmin.planFeatures.${id}`);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full h-full bg-white/90 dark:bg-surface-950/95 backdrop-blur-xl border border-white/30 dark:border-white/[0.06] shadow-2xl overflow-hidden flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 bg-gradient-to-r from-brand-400 via-purple-400 to-indigo-500" />

        <div className="px-6 pt-5 pb-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-surface-900 dark:text-white">
              {showCreate ? t('superadmin.plans.modal.newPlanTitle') : editMode ? t('superadmin.plans.modal.editTitle', { name: selected?.name }) : selected?.name}
            </h2>
            {selected && !editMode && !showCreate && (
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={selected.status} />
                {selected.is_featured && (
                  <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-semibold">{t('superadmin.plans.modal.featured')}</span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* READ MODE */}
        {selected && !editMode && !showCreate && (
          <div className="px-6 pb-6 space-y-4 overflow-y-auto flex-1">
            <p className="text-sm text-surface-600 dark:text-surface-400">{selected.description || t('superadmin.plans.modal.noDescription')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-50/80 dark:bg-surface-900/80 rounded-xl p-3 border border-transparent dark:border-white/[0.04]">
                <p className="text-[10px] font-semibold text-surface-400 uppercase">{t('superadmin.plans.modal.monthlyPrice')}</p>
                <p className="text-2xl font-black text-surface-900 dark:text-white">${selected.price_monthly}</p>
              </div>
              <div className="bg-surface-50/80 dark:bg-surface-900/80 rounded-xl p-3 border border-transparent dark:border-white/[0.04]">
                <p className="text-[10px] font-semibold text-surface-400 uppercase">{t('superadmin.plans.modal.annualPrice')}</p>
                <p className="text-2xl font-black text-surface-900 dark:text-white">${selected.price_annual}</p>
              </div>
            </div>

            {/* Resource Limits */}
            <div className="bg-surface-50/80 dark:bg-surface-900/80 rounded-xl p-3 border border-transparent dark:border-white/[0.04]">
              <p className="text-[10px] font-semibold text-surface-400 uppercase mb-2">📦 {t('superadmin.plans.modal.resourceLimits')}</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <InfoRow label={t('superadmin.plans.modal.branches')} value={String(selected.max_locations)} />
                <InfoRow label={t('superadmin.plans.modal.users')} value={String(selected.max_users)} />
                <InfoRow label={t('superadmin.plans.modal.customers')} value={selected.max_customers.toLocaleString()} />
                <InfoRow label={t('superadmin.plans.modal.programs')} value={String(selected.max_programs)} />
                <InfoRow label={t('superadmin.plans.modal.automations')} value={String(selected.max_automations)} />
                <InfoRow label={t('superadmin.plans.modal.automationExecutionsPerDay')} value={String(selected.max_automation_executions_day)} />
                <InfoRow label={t('superadmin.plans.modal.notificationsPerMonth')} value={selected.max_notifications_month.toLocaleString()} />
                <InfoRow label={t('superadmin.plans.modal.transactionsPerMonth')} value={selected.max_transactions_month.toLocaleString()} />
                <InfoRow label={t('superadmin.plans.modal.exportsPerMonth')} value={String(selected.max_exports_month)} />
              </div>
            </div>

            {/* Messaging */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-3 border border-green-200/50">
              <p className="text-[10px] font-semibold text-surface-400 uppercase mb-2">📡 {t('superadmin.plans.modal.messagingChannels')}</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-green-600 uppercase">{t('superadmin.plans.modal.whatsappPerDay')}</p>
                  <p className="text-lg font-black text-surface-900 dark:text-surface-100">
                    {selected.max_whatsapp_day > 0 ? selected.max_whatsapp_day : <span className="text-surface-300 dark:text-surface-500">{t('superadmin.plans.modal.off')}</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-blue-600 uppercase">{t('superadmin.plans.modal.emailsPerMonth')}</p>
                  <p className="text-lg font-black text-surface-900 dark:text-surface-100">
                    {selected.max_emails_month > 0 ? selected.max_emails_month.toLocaleString() : <span className="text-surface-300 dark:text-surface-500">{t('superadmin.plans.modal.off')}</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-purple-600 uppercase">{t('superadmin.plans.modal.smsPerDay')}</p>
                  <p className="text-lg font-black text-surface-900 dark:text-surface-100">
                    {selected.max_sms_day > 0 ? selected.max_sms_day : <span className="text-surface-300 dark:text-surface-500">{t('superadmin.plans.modal.off')}</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-indigo-600 uppercase">{t('superadmin.plans.modal.walletPerMonth')}</p>
                  <p className="text-lg font-black text-surface-900 dark:text-surface-100">
                    {selected.max_wallet_pushes_month > 0 ? selected.max_wallet_pushes_month.toLocaleString() : <span className="text-surface-300 dark:text-surface-500">{t('superadmin.plans.modal.off')}</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* AI & API */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200/50">
              <p className="text-[10px] font-semibold text-surface-400 uppercase mb-2"><Bot className="w-3.5 h-3.5 inline mr-1" /> {t('superadmin.plans.modal.aiAndApi')}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-purple-600 uppercase">{t('superadmin.plans.modal.aiQueriesPerMonth')}</p>
                  <p className="text-lg font-black text-surface-900 dark:text-surface-100">
                    {selected.max_ai_queries_month > 0 ? selected.max_ai_queries_month : <span className="text-surface-300 dark:text-surface-500">{t('superadmin.plans.modal.off')}</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-indigo-600 uppercase">{t('superadmin.plans.modal.apiCallsPerDay')}</p>
                  <p className="text-lg font-black text-surface-900 dark:text-surface-100">
                    {selected.max_api_calls_day > 0 ? selected.max_api_calls_day.toLocaleString() : <span className="text-surface-300 dark:text-surface-500">{t('superadmin.plans.modal.off')}</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            {(selected.features || []).length > 0 && (
              <div className="bg-surface-50/80 dark:bg-surface-900/80 rounded-xl p-3 border border-transparent dark:border-white/[0.04]">
                <p className="text-[10px] font-semibold text-surface-400 uppercase mb-2">{t('superadmin.plans.modal.features')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.features.map((f, i) => {
                    const preset = PREDEFINED_FEATURES.find((p) => p.id === f);
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-medium px-2.5 py-1 rounded-lg border border-brand-200 dark:border-brand-700/50"
                      >
                        {preset?.icon} {getFeatureLabel(f)}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm">
              <InfoRow label={t('superadmin.plans.modal.trialDays')} value={String(selected.trial_days)} />
              <InfoRow label={t('superadmin.plans.modal.order')} value={String(selected.sort_order)} />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditMode(true)}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-200 dark:shadow-none"
              >
                {t('superadmin.plans.modal.editPlan')}
              </button>
              <button
                onClick={handleToggleActive}
                disabled={saving}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all ${
                  selected.status !== 'archived'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
                    : 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200'
                }`}
              >
                {selected.status !== 'archived' ? t('superadmin.plans.modal.archive') : t('superadmin.plans.modal.restore')}
              </button>
            </div>
          </div>
        )}

        {/* EDIT / CREATE MODE */}
        {(editMode || showCreate) && (
          <div className="px-6 pb-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-3 gap-4">
              {/* COLUMN 1: Info & Pricing */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wide"><FileText className="w-3.5 h-3.5 inline mr-1" /> {t('superadmin.plans.modal.infoSection')}</p>
                <FormField label={t('superadmin.plans.modal.name')} value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder={t('superadmin.plans.modal.placeholder.name')} />
                <FormField
                  label={t('superadmin.plans.modal.slug')}
                  value={form.slug}
                  onChange={(v) => setForm((f) => ({ ...f, slug: v }))}
                  placeholder={t('superadmin.plans.modal.placeholder.slug')}
                  disabled={!!selected && !showCreate}
                />
                <FormField
                  label={t('superadmin.plans.modal.description')}
                  value={form.description}
                  onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                  placeholder={t('superadmin.plans.modal.placeholder.description')}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    label={t('superadmin.plans.modal.monthlyPrice') + ' (USD)'}
                    value={String(form.price_monthly)}
                    onChange={(v) => setForm((f) => ({ ...f, price_monthly: +v || 0 }))}
                    placeholder={t('superadmin.plans.modal.placeholder.monthlyPrice')}
                    type="number"
                  />
                  <FormField
                    label={t('superadmin.plans.modal.annualPrice') + ' (USD)'}
                    value={String(form.price_annual)}
                    onChange={(v) => setForm((f) => ({ ...f, price_annual: +v || 0 }))}
                    placeholder={t('superadmin.plans.modal.placeholder.annualPrice')}
                    type="number"
                  />
                </div>

                {/* Resource Limits */}
                <p className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wide pt-2">📦 {t('superadmin.plans.modal.resourceLimits')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label={t('superadmin.plans.modal.branches')} value={String(form.max_locations)} onChange={(v) => setForm((f) => ({ ...f, max_locations: +v || 1 }))} type="number" />
                  <FormField label={t('superadmin.plans.modal.users')} value={String(form.max_users)} onChange={(v) => setForm((f) => ({ ...f, max_users: +v || 1 }))} type="number" />
                  <FormField label={t('superadmin.plans.modal.customers')} value={String(form.max_customers)} onChange={(v) => setForm((f) => ({ ...f, max_customers: +v || 100 }))} type="number" />
                  <FormField label={t('superadmin.plans.modal.programs')} value={String(form.max_programs)} onChange={(v) => setForm((f) => ({ ...f, max_programs: +v || 1 }))} type="number" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    label={t('superadmin.plans.modal.notificationsPerMonth')}
                    value={String(form.max_notifications_month)}
                    onChange={(v) => setForm((f) => ({ ...f, max_notifications_month: +v || 0 }))}
                    type="number"
                  />
                  <FormField
                    label={t('superadmin.plans.modal.transactionsPerMonth')}
                    value={String(form.max_transactions_month)}
                    onChange={(v) => setForm((f) => ({ ...f, max_transactions_month: +v || 0 }))}
                    type="number"
                  />
                </div>
              </div>

              {/* COLUMN 2: Messaging & Rate Limits */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wide">📡 {t('superadmin.plans.modal.messagingChannels')}</p>
                {/* WhatsApp */}
                <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 rounded-xl p-3 border border-green-200/40 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.features.includes('whatsapp_campaigns')}
                      onChange={() => {
                        const has = form.features.includes('whatsapp_campaigns');
                        setForm((f) => ({
                          ...f,
                          features: has ? f.features.filter((x) => x !== 'whatsapp_campaigns') : [...f.features, 'whatsapp_campaigns'],
                          max_whatsapp_day: has ? 0 : f.max_whatsapp_day || 100,
                        }));
                      }}
                      className="w-4 h-4 rounded border-green-400 text-green-600 focus:ring-green-400"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-200 font-semibold"><Smartphone className="w-4 h-4 inline mr-1" /> {t('superadmin.plans.modal.messaging.whatsapp')}</span>
                  </label>
                  {form.features.includes('whatsapp_campaigns') && (
                    <div className="ml-6">
                      <FormField
                        label={t('superadmin.plans.modal.messaging.maxWhatsappPerDay')}
                        value={String(form.max_whatsapp_day)}
                        onChange={(v) => setForm((f) => ({ ...f, max_whatsapp_day: Math.min(+v || 0, 200) }))}
                        type="number"
                      />
                    </div>
                  )}
                </div>
                {/* Email */}
                <div className="bg-gradient-to-r from-blue-50/80 to-sky-50/80 rounded-xl p-3 border border-blue-200/40 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.features.includes('email_campaigns')}
                      onChange={() => {
                        const has = form.features.includes('email_campaigns');
                        setForm((f) => ({
                          ...f,
                          features: has ? f.features.filter((x) => x !== 'email_campaigns') : [...f.features, 'email_campaigns'],
                          max_emails_month: has ? 0 : f.max_emails_month || 5000,
                        }));
                      }}
                      className="w-4 h-4 rounded border-blue-400 text-blue-600 focus:ring-blue-400"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-200 font-semibold"><Mail className="w-4 h-4 inline mr-1" /> {t('superadmin.plans.modal.messaging.email')}</span>
                  </label>
                  {form.features.includes('email_campaigns') && (
                    <div className="ml-6">
                      <FormField
                        label={t('superadmin.plans.modal.messaging.maxEmailsPerMonth')}
                        value={String(form.max_emails_month)}
                        onChange={(v) => setForm((f) => ({ ...f, max_emails_month: +v || 0 }))}
                        type="number"
                      />
                    </div>
                  )}
                </div>
                {/* SMS */}
                <div className="bg-gradient-to-r from-purple-50/80 to-violet-50/80 rounded-xl p-3 border border-purple-200/40 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.features.includes('sms_campaigns')}
                      onChange={() => {
                        const has = form.features.includes('sms_campaigns');
                        setForm((f) => ({
                          ...f,
                          features: has ? f.features.filter((x) => x !== 'sms_campaigns') : [...f.features, 'sms_campaigns'],
                          max_sms_day: has ? 0 : f.max_sms_day || 50,
                        }));
                      }}
                      className="w-4 h-4 rounded border-purple-400 text-purple-600 focus:ring-purple-400"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-200 font-semibold"><MessageSquare className="w-4 h-4 inline mr-1" /> {t('superadmin.plans.modal.messaging.sms')}</span>
                  </label>
                  {form.features.includes('sms_campaigns') && (
                    <div className="ml-6">
                      <FormField
                        label={t('superadmin.plans.modal.messaging.maxSmsPerDay')}
                        value={String(form.max_sms_day)}
                        onChange={(v) => setForm((f) => ({ ...f, max_sms_day: +v || 0 }))}
                        type="number"
                      />
                    </div>
                  )}
                </div>
                {/* Wallet */}
                <div className="bg-gradient-to-r from-indigo-50/80 to-slate-50/80 rounded-xl p-3 border border-indigo-200/40 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.features.includes('wallet_campaigns')}
                      onChange={() => {
                        const has = form.features.includes('wallet_campaigns');
                        setForm((f) => ({
                          ...f,
                          features: has ? f.features.filter((x) => x !== 'wallet_campaigns') : [...f.features, 'wallet_campaigns'],
                          max_wallet_pushes_month: has ? 0 : f.max_wallet_pushes_month || 5000,
                        }));
                      }}
                      className="w-4 h-4 rounded border-indigo-400 text-indigo-600 focus:ring-indigo-400"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-200 font-semibold"><Wallet className="w-4 h-4 inline mr-1" /> {t('superadmin.plans.modal.messaging.wallet')}</span>
                  </label>
                  {form.features.includes('wallet_campaigns') && (
                    <div className="ml-6">
                      <FormField
                        label={t('superadmin.plans.modal.messaging.maxWalletPushesPerMonth')}
                        value={String(form.max_wallet_pushes_month)}
                        onChange={(v) => setForm((f) => ({ ...f, max_wallet_pushes_month: +v || 0 }))}
                        type="number"
                      />
                    </div>
                  )}
                </div>

                {/* AI & API Rate Limits */}
                <p className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wide pt-2"><Bot className="w-3.5 h-3.5 inline mr-1" /> {t('superadmin.plans.modal.aiAndApi')}</p>
                <div className="bg-gradient-to-r from-purple-50/80 to-indigo-50/80 rounded-xl p-3 border border-purple-200/40 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      label={t('superadmin.plans.modal.aiQueriesPerMonth')}
                      value={String(form.max_ai_queries_month)}
                      onChange={(v) => setForm((f) => ({ ...f, max_ai_queries_month: +v || 0 }))}
                      type="number"
                    />
                    <FormField
                      label={t('superadmin.plans.modal.apiCallsPerDay')}
                      value={String(form.max_api_calls_day)}
                      onChange={(v) => setForm((f) => ({ ...f, max_api_calls_day: +v || 0 }))}
                      type="number"
                    />
                  </div>
                  <p className="text-[10px] text-surface-400">{t('superadmin.plans.modal.aiApiNote')}</p>
                </div>
              </div>

              {/* COLUMN 3: Features & Automation */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wide"><Zap className="w-3.5 h-3.5 inline mr-1" /> {t('superadmin.plans.modal.automationSection')}</p>
                <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-xl p-3 border border-amber-200/40 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      label={t('superadmin.plans.modal.maxAutomations')}
                      value={String(form.max_automations)}
                      onChange={(v) => setForm((f) => ({ ...f, max_automations: +v || 0 }))}
                      type="number"
                    />
                    <FormField
                      label={t('superadmin.plans.modal.executionsPerDay')}
                      value={String(form.max_automation_executions_day)}
                      onChange={(v) => setForm((f) => ({ ...f, max_automation_executions_day: +v || 0 }))}
                      type="number"
                    />
                  </div>
                  <FormField
                    label={t('superadmin.plans.modal.exportationsPerMonth')}
                    value={String(form.max_exports_month)}
                    onChange={(v) => setForm((f) => ({ ...f, max_exports_month: +v || 0 }))}
                    type="number"
                  />
                </div>

                <p className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wide pt-2">🏷️ {t('superadmin.plans.modal.planFeatures')}</p>
                <FeatureTagInput features={form.features} onChange={(features) => setForm((f) => ({ ...f, features }))} />

                <div className="space-y-2 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-surface-500 mb-1 block">{t('superadmin.plans.modal.planStatus')}</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PlanData['status'], is_active: e.target.value !== 'archived' }))}
                      className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 backdrop-blur-sm text-sm text-surface-800 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all"
                    >
                      <option value="draft">{t('superadmin.plans.modal.statusOptions.draft')}</option>
                      <option value="published">{t('superadmin.plans.modal.statusOptions.published')}</option>
                      <option value="archived">{t('superadmin.plans.modal.statusOptions.archived')}</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                      className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-400"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-200 font-medium"><Star className="w-4 h-4 inline mr-1" /> {t('superadmin.plans.modal.featuredPlan')}</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      label={t('superadmin.plans.modal.trialDays')}
                      value={String(form.trial_days)}
                      onChange={(v) => setForm((f) => ({ ...f, trial_days: +v || 0 }))}
                      type="number"
                    />
                    <FormField
                      label={t('superadmin.plans.modal.order')}
                      value={String(form.sort_order)}
                      onChange={(v) => setForm((f) => ({ ...f, sort_order: +v || 0 }))}
                      type="number"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 mt-4 border-t border-surface-200 dark:border-white/[0.06]">
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || (!showCreate && !form.slug.trim())}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-surface-300 dark:disabled:bg-surface-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-200 dark:shadow-none"
              >
                {saving ? t('superadmin.plans.modal.saving') : showCreate ? t('superadmin.plans.modal.create') : t('superadmin.plans.modal.save')}
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
