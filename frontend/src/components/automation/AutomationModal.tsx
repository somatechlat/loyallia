import EmojiPickerButton from "@/components/ui/EmojiPickerButton";
import WalletPlatformSelector from "@/components/notifications/WalletPlatformSelector";
import WalletNotificationPreview from "@/components/notifications/WalletNotificationPreview";
import ActionIcon from "./ActionIcon";
import { TRIGGER_LABELS, TRIGGER_DESCRIPTIONS, ACTION_LABELS } from "@/lib/automationConstants";
import type { AutomationForm, ProgramOption } from "@/hooks/useAutomations";

interface AutomationModalProps {
  show: boolean;
  editingId: string | null;
  form: AutomationForm;
  setForm: React.Dispatch<React.SetStateAction<AutomationForm>>;
  saving: boolean;
  step: number;
  setStep: (step: number) => void;
  stepErrors: { name: boolean };
  setStepErrors: React.Dispatch<React.SetStateAction<{ name: boolean }>>;
  programs: ProgramOption[];
  onSave: () => void;
  onClose: () => void;
}

export default function AutomationModal({
  show,
  editingId,
  form,
  setForm,
  saving,
  step,
  setStep,
  stepErrors,
  setStepErrors,
  programs,
  onSave,
  onClose,
}: AutomationModalProps) {
  if (!show) return null;
  const totalSteps = 3;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-surface-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">
              {editingId ? "Editar automatización" : "Nueva automatización"}
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">
              Paso {step} de {totalSteps}
            </p>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600 text-xl">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < step ? "bg-brand-500" : "bg-surface-200"}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="auto-name">
                  Nombre de la automatización
                </label>
                <input
                  id="auto-name"
                  className={`input ${stepErrors.name ? "border-red-500" : ""}`}
                  placeholder="Ej: Bienvenida a nuevos clientes"
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    setStepErrors({ name: false });
                  }}
                />
                {stepErrors.name && <p className="text-xs text-red-500 mt-1">Ingresa un nombre</p>}
              </div>
              <div>
                <label className="label" htmlFor="auto-desc">
                  Descripción (opcional)
                </label>
                <textarea
                  id="auto-desc"
                  className="input min-h-[80px] resize-none"
                  placeholder="¿Qué hace esta automatización?"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="label">Disparador — ¿Cuándo se activa?</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, trigger: key }))}
                      className={`text-left p-3 rounded-xl border-2 transition-all text-sm
                        ${form.trigger === key ? "border-brand-500 bg-brand-50 shadow-glow" : "border-surface-200 dark:border-surface-700 hover:border-surface-300"}`}
                    >
                      <p className="font-medium text-surface-900 dark:text-white">{label}</p>
                      <p className="text-[10px] text-surface-400 mt-0.5">{TRIGGER_DESCRIPTIONS[key]?.slice(0, 60)}...</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Acción — ¿Qué se ejecuta?</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {Object.entries(ACTION_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, action: key }))}
                      className={`text-left p-3 rounded-xl border-2 transition-all text-sm
                        ${form.action === key ? "border-brand-500 bg-brand-50 shadow-glow" : "border-surface-200 dark:border-surface-700 hover:border-surface-300"}`}
                    >
                      <ActionIcon action={key} className="w-4 h-4 text-surface-600 inline-block mr-1" />
                      <span className="font-medium text-surface-900 dark:text-white">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {(form.action === "send_notification" || form.action === "send_email" || form.action === "send_wallet") && (
                <>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="label" htmlFor="action-title">
                        Título del mensaje
                      </label>
                      <EmojiPickerButton
                        onEmojiSelect={(emoji) =>
                          setForm((f) => ({ ...f, action_config: { ...f.action_config, title: (f.action_config.title || "") + emoji } }))
                        }
                      />
                    </div>
                    <input
                      id="action-title"
                      className="input"
                      placeholder="Ej: ¡Bienvenido a nuestro programa!"
                      maxLength={200}
                      value={(form.action_config.title as string) || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, action_config: { ...f.action_config, title: e.target.value } }))
                      }
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="label" htmlFor="action-message">
                        Contenido del mensaje
                      </label>
                      <EmojiPickerButton
                        onEmojiSelect={(emoji) =>
                          setForm((f) => ({ ...f, action_config: { ...f.action_config, message: (f.action_config.message || "") + emoji } }))
                        }
                      />
                    </div>
                    <textarea
                      id="action-message"
                      className="input min-h-[80px] resize-none"
                      maxLength={1000}
                      placeholder="Ej: Gracias por unirte. Tu primera recompensa te espera."
                      value={(form.action_config.message as string) || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, action_config: { ...f.action_config, message: e.target.value } }))
                      }
                    />
                  </div>

                  {form.action === "send_wallet" && (
                    <div>
                      <label className="label">Plataforma de Wallet</label>
                      <WalletPlatformSelector
                        value={(form.action_config.wallet_platform as "apple" | "google" | "both") || "both"}
                        onChange={(value) => setForm((f) => ({ ...f, action_config: { ...f.action_config, wallet_platform: value } }))}
                      />
                      <p className="text-[10px] text-surface-400 mt-1.5">Selecciona a qué plataforma enviar la notificación de wallet.</p>
                    </div>
                  )}

                  {form.action === "send_wallet" && (
                    <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-surface-50 dark:bg-surface-900/50">
                      <p className="text-xs font-semibold text-surface-700 dark:text-surface-300 mb-3">
                        <svg className="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Vista previa de la notificación
                      </p>
                      <WalletNotificationPreview
                        title={(form.action_config.title as string) || ""}
                        message={(form.action_config.message as string) || ""}
                        platform={(form.action_config.wallet_platform as "apple" | "google" | "both") || "both"}
                      />
                    </div>
                  )}
                </>
              )}

              {form.action === "issue_reward" && programs.length > 0 && (
                <div>
                  <label className="label" htmlFor="reward-program">
                    Programa objetivo
                  </label>
                  <select
                    id="reward-program"
                    className="input"
                    value={(form.action_config.program_id as string) || ""}
                    onChange={(e) => setForm((f) => ({ ...f, action_config: { ...f.action_config, program_id: e.target.value } }))}
                  >
                    <option value="">Seleccionar programa</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="cooldown">
                    Enfriamiento (horas)
                  </label>
                  <input
                    id="cooldown"
                    type="number"
                    className="input"
                    min={1}
                    value={form.cooldown_hours}
                    onChange={(e) => setForm((f) => ({ ...f, cooldown_hours: parseInt(e.target.value) || 24 }))}
                  />
                  <p className="text-[10px] text-surface-400 mt-1">Horas mínimas entre ejecuciones por cliente</p>
                </div>
                <div>
                  <label className="label" htmlFor="max-exec">
                    Máx ejecuciones/día
                  </label>
                  <input
                    id="max-exec"
                    type="number"
                    className="input"
                    min={0}
                    value={form.max_executions_per_day ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, max_executions_per_day: e.target.value ? parseInt(e.target.value) : null }))
                    }
                  />
                  <p className="text-[10px] text-surface-400 mt-1">Dejar vacío = sin límite</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 mt-4">
                <p className="text-sm font-semibold text-brand-900 mb-1">Resumen</p>
                <p className="text-xs text-brand-700">
                  Cuando <strong>{TRIGGER_LABELS[form.trigger]}</strong> → <strong>{ACTION_LABELS[form.action]}</strong>
                  {form.action_config.title ? ` → "${form.action_config.title as string}"` : ""}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-surface-100 flex gap-3 justify-between">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="btn-ghost text-sm"
          >
            {step > 1 ? "← Anterior" : "Cancelar"}
          </button>
          {step < totalSteps ? (
            <button
              onClick={() => {
                if (step === 1 && !form.name.trim()) {
                  setStepErrors({ name: true });
                  return;
                }
                setStepErrors({ name: false });
                setStep(step + 1);
              }}
              className="btn-primary text-sm"
            >
              Siguiente →
            </button>
          ) : (
            <button onClick={onSave} disabled={saving} className="btn-primary text-sm" id="save-automation-btn">
              {saving ? <span className="spinner w-4 h-4" /> : editingId ? "Guardar cambios" : "Crear automatización"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
