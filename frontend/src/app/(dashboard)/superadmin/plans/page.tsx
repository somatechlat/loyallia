'use client';

import { useEffect, useState, useCallback } from 'react';
import { superAdminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import PlanModal, { type PlanData } from '@/components/superadmin/plans/PlanModal';

export default function SuperAdminPlans() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PlanData | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const { data } = await superAdminApi.plans();
      setPlans(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cargar planes';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const openDetail = (p: PlanData) => {
    setSelected(p);
    setShowCreate(false);
  };

  const openCreate = () => {
    setSelected(null);
    setShowCreate(true);
  };

  const closeModal = () => {
    setSelected(null);
    setShowCreate(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-surface-200 rounded-xl w-48" />
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-surface-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const published = plans.filter((p) => p.status === 'published' && p.is_active);
  const drafts = plans.filter((p) => p.status === 'draft' && p.is_active);
  const archived = plans.filter((p) => p.status === 'archived' || !p.is_active);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-surface-900 dark:text-white tracking-tight">
            Planes de Suscripción
          </h1>
          <p className="text-surface-500 mt-1">
            {published.length} publicados · {drafts.length} borradores · {archived.length} archivados
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Plan
        </button>
      </div>

      {/* Published Plans */}
      {published.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Publicados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {published.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onClick={() => openDetail(plan)} />
            ))}
          </div>
        </section>
      )}

      {/* Draft Plans */}
      {drafts.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Borradores
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {drafts.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onClick={() => openDetail(plan)} />
            ))}
          </div>
        </section>
      )}

      {/* Archived Plans */}
      {archived.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-surface-400" />
            Archivados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {archived.map((plan) => (
              <div
                key={plan.id}
                onClick={() => openDetail(plan)}
                className="bg-surface-50 p-4 rounded-2xl border border-surface-200 dark:border-surface-700 cursor-pointer hover:bg-surface-100 transition-all opacity-60"
              >
                <p className="font-bold text-surface-600">{plan.name}</p>
                <p className="text-sm text-surface-400">
                  ${plan.price_monthly}/mes — Archivado
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <PlanModal
        selected={selected}
        showCreate={showCreate}
        onClose={closeModal}
        onSaved={fetchPlans}
      />
    </div>
  );
}

function PlanCard({ plan, onClick }: { plan: PlanData; onClick: () => void }) {
  const statusConfig = {
    published: { label: 'Publicado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', dot: 'bg-green-500' },
    draft: { label: 'Borrador', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
    archived: { label: 'Archivado', color: 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400', dot: 'bg-surface-400' },
  };
  const status = statusConfig[plan.status] || statusConfig.published;

  return (
    <div
      onClick={onClick}
      className={`bg-white/80 backdrop-blur-xl rounded-2xl border-2 shadow-sm p-6 flex flex-col cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group ${
        plan.is_featured ? 'border-brand-400 ring-2 ring-brand-100' : 'border-white/30'
      }`}
      style={{ boxShadow: '0 4px 30px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start justify-between mb-2">
        {plan.is_featured && (
          <span className="self-start bg-gradient-to-r from-brand-500 to-purple-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
            RECOMENDADO
          </span>
        )}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${status.color}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${status.dot}`} />
          {status.label}
        </span>
      </div>
      <h3 className="text-xl font-black text-surface-900 dark:text-white group-hover:text-brand-600 transition-colors">
        {plan.name}
      </h3>
      <p className="text-sm text-surface-500 mt-1 mb-4 line-clamp-2">
        {plan.description || 'Sin descripción'}
      </p>
      <div className="mb-4">
        <span className="text-4xl font-black text-surface-900 dark:text-white">
          ${plan.price_monthly}
        </span>
        <span className="text-surface-500 text-sm">/mes</span>
        <p className="text-xs text-surface-400 mt-0.5">o ${plan.price_annual}/año</p>
      </div>
      <div className="border-t border-surface-100 pt-4 space-y-2 flex-1">
        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">
          Incluye:
        </p>
        {(plan.features || []).slice(0, 5).map((f, i) => {
          const preset = [
            { id: 'whatsapp_campaigns', label: 'Campañas de WhatsApp' },
            { id: 'sms_campaigns', label: 'Campañas de SMS' },
            { id: 'email_campaigns', label: 'Campañas de Email' },
            { id: 'wallet_campaigns', label: 'Apple/Google Wallet' },
            { id: 'geo_fencing', label: 'Geo-Fencing' },
            { id: 'automation', label: 'Automatización' },
            { id: 'advanced_analytics', label: 'Analítica Avanzada' },
            { id: 'ai_assistant', label: 'Asistente IA' },
            { id: 'agent_api', label: 'Acceso API Agente' },
            { id: 'priority_support', label: 'Soporte Prioritario' },
            { id: 'custom_branding', label: 'Marca Personalizada' },
            { id: 'data_export', label: 'Exportación de Datos' },
          ].find((p) => p.id === f);
          const label = preset ? preset.label : f;
          return (
            <div key={i} className="flex items-center gap-2 text-sm text-surface-700">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {label}
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-surface-100 grid grid-cols-2 gap-2 text-xs text-surface-400">
        <p>{plan.max_locations} sucursales</p>
        <p>{plan.max_users} usuarios</p>
        <p>{plan.max_customers.toLocaleString()} clientes</p>
        <p>{plan.trial_days}d prueba</p>
        {plan.max_whatsapp_day > 0 && (
          <p className="text-green-500">📱 {plan.max_whatsapp_day} WA/día</p>
        )}
        {plan.max_emails_month > 0 && (
          <p className="text-blue-500">📧 {plan.max_emails_month.toLocaleString()} emails/mes</p>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-surface-100 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-brand-500 font-semibold">Editar plan →</span>
      </div>
    </div>
  );
}
