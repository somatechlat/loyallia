"use client";

import { useAuth } from "@/lib/auth";
import { UserRole } from "@/types";
import { usePlan } from "@/hooks/usePlan";
import { useAutomations } from "@/hooks/useAutomations";
import StatsCards from "@/components/automation/StatsCards";
import PresetTemplates from "@/components/automation/PresetTemplates";
import AutomationList from "@/components/automation/AutomationList";
import DeleteModal from "@/components/automation/DeleteModal";
import AutomationModal from "@/components/automation/AutomationModal";

export default function AutomationPage() {
  const { user } = useAuth();
  const isOwner = user?.role === UserRole.OWNER;
  const { hasFeature, getLimit, getUsage, isAtLimit } = usePlan();

  const hasAutomation = hasFeature("automation");
  const automationLimit = getLimit("automations");
  const automationUsage = getUsage("automations");
  const atAutomationLimit = isAtLimit("automations");

  const {
    automations,
    programs,
    stats,
    loading,
    showModal,
    setShowModal,
    editingId,
    form,
    setForm,
    saving,
    step,
    setStep,
    showDelete,
    setShowDelete,
    stepErrors,
    setStepErrors,
    toggle,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
  } = useAutomations();

  return (
    <div className="space-y-6">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Automatizaciones</h1>
          <p className="text-surface-500 text-sm mt-1">Reglas automáticas de engagement con clientes</p>
          {automationLimit > 0 && (
            <p className="text-xs text-surface-400 mt-1">
              {automationUsage} / {automationLimit} automatizaciones
            </p>
          )}
        </div>
        {isOwner && hasAutomation && (
          <button onClick={() => openCreate()} className="btn-primary flex items-center gap-2" id="create-automation-btn">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Nueva automatización
          </button>
        )}
      </div>

      {!hasAutomation && (
        <div className="card p-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-surface-100 dark:bg-surface-800 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <p className="text-surface-700 font-semibold text-lg">Automatización no disponible</p>
          <p className="text-surface-400 text-sm mt-2 max-w-sm mx-auto">
            Esta función no está incluida en tu plan actual. Actualiza tu plan para acceder a la automatización de campañas.
          </p>
          <button onClick={() => (window.location.href = "/billing/upgrade")} className="btn-primary mt-6" id="upgrade-plan-automation">
            Actualizar Plan
          </button>
        </div>
      )}

      {hasAutomation && atAutomationLimit && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Has alcanzado el límite de {automationLimit} automatizaciones. Actualiza tu plan para crear más.
          </p>
        </div>
      )}

      {hasAutomation && (
        <>
          <StatsCards stats={stats} />

          {isOwner && <PresetTemplates onSelect={(preset) => openCreate(preset)} />}

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-surface-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : automations.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="w-14 h-14 mx-auto mb-4 bg-brand-50 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-surface-700 font-semibold text-lg">No hay automatizaciones configuradas</p>
              <p className="text-surface-400 text-sm mt-2 max-w-sm mx-auto">
                Las automatizaciones envían mensajes y recompensas automáticamente basándose en el comportamiento de tus clientes.
              </p>
              {isOwner && (
                <button onClick={() => openCreate()} className="btn-primary mt-6" id="create-first-automation">
                  Crear primera automatización
                </button>
              )}
            </div>
          ) : (
            <AutomationList
              automations={automations}
              isOwner={isOwner}
              onEdit={openEdit}
              onToggle={toggle}
              onDelete={setShowDelete}
            />
          )}

          {showDelete && <DeleteModal onCancel={() => setShowDelete(null)} onConfirm={() => handleDelete(showDelete)} />}

          <AutomationModal
            show={showModal}
            editingId={editingId}
            form={form}
            setForm={setForm}
            saving={saving}
            step={step}
            setStep={setStep}
            stepErrors={stepErrors}
            setStepErrors={setStepErrors}
            programs={programs}
            onSave={handleSave}
            onClose={() => setShowModal(false)}
          />
        </>
      )}
    </div>
  );
}
