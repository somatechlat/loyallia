import EmojiPickerButton from "@/components/ui/EmojiPickerButton";
import WalletPlatformSelector from "@/components/notifications/WalletPlatformSelector";
import WalletNotificationPreview from "@/components/notifications/WalletNotificationPreview";
import ActionIcon from "./ActionIcon";
import { TRIGGER_LABELS, TRIGGER_DESCRIPTIONS, ACTION_LABELS } from "@/lib/automationConstants";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
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
              {editingId ? t("automation.modal.title.edit") : t("automation.modal.title.new")}
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">
              {t("automation.modal.step", { step, totalSteps })}
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
                  {t("automation.modal.label.name")}
                </label>
                <input
                  id="auto-name"
                  className={`input ${stepErrors.name ? "border-red-500" : ""}`}
                  placeholder={t("automation.modal.placeholder.name")}
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    setStepErrors({ name: false });
                  }}
                />
                {stepErrors.name && <p className="text-xs text-red-500 mt-1">{t("automation.modal.validation.nameRequired")}</p>}
              </div>
              <div>
                <label className="label" htmlFor="auto-desc">
                  {t("automation.modal.label.description")}
                </label>
                <textarea
                  id="auto-desc"
                  className="input min-h-[80px] resize-none"
                  placeholder={t("automation.modal.placeholder.description")}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="label">{t("automation.modal.label.trigger")}</label>
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
                <label className="label">{t("automation.modal.label.action")}</label>
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
                        {t("automation.modal.label.messageTitle")}
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
                      placeholder={t("automation.modal.placeholder.messageTitle")}
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
                        {t("automation.modal.label.messageContent")}
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
                      placeholder={t("automation.modal.placeholder.messageContent")}
                      value={(form.action_config.message as string) || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, action_config: { ...f.action_config, message: e.target.value } }))
                      }
                    />
                  </div>

                  {form.action === "send_wallet" && (
                    <div>
                      <label className="label">{t("automation.modal.label.walletPlatform")}</label>
                      <WalletPlatformSelector
                        value={(form.action_config.wallet_platform as "apple" | "google" | "both") || "both"}
                        onChange={(value) => setForm((f) => ({ ...f, action_config: { ...f.action_config, wallet_platform: value } }))}
                      />
                      <p className="text-[10px] text-surface-400 mt-1.5">{t("automation.modal.help.walletPlatform")}</p>
                    </div>
                  )}

                  {form.action === "send_wallet" && (
                    <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-surface-50 dark:bg-surface-900/50">
                      <p className="text-xs font-semibold text-surface-700 dark:text-surface-300 mb-3">
                        <svg className="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        {t("automation.modal.label.notificationPreview")}
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
                    {t("automation.modal.label.targetProgram")}
                  </label>
                  <select
                    id="reward-program"
                    className="input"
                    value={(form.action_config.program_id as string) || ""}
                    onChange={(e) => setForm((f) => ({ ...f, action_config: { ...f.action_config, program_id: e.target.value } }))}
                  >
                    <option value="">{t("automation.modal.placeholder.selectProgram")}</option>
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
                    {t("automation.modal.label.cooldown")}
                  </label>
                  <input
                    id="cooldown"
                    type="number"
                    className="input"
                    min={1}
                    value={form.cooldown_hours}
                    onChange={(e) => setForm((f) => ({ ...f, cooldown_hours: parseInt(e.target.value) || 24 }))}
                  />
                  <p className="text-[10px] text-surface-400 mt-1">{t("automation.modal.help.cooldown")}</p>
                </div>
                <div>
                  <label className="label" htmlFor="max-exec">
                    {t("automation.modal.label.maxExecutions")}
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
                  <p className="text-[10px] text-surface-400 mt-1">{t("automation.modal.help.maxExecutions")}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 mt-4">
                <p className="text-sm font-semibold text-brand-900 mb-1">{t("automation.modal.label.summary")}</p>
                <p className="text-xs text-brand-700">
                  {t("automation.modal.summary.when")} <strong>{TRIGGER_LABELS[form.trigger]}</strong> → <strong>{ACTION_LABELS[form.action]}</strong>
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
            {step > 1 ? t("automation.modal.button.previous") : t("common.cancel")}
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
              {t("automation.modal.button.next")}
            </button>
          ) : (
            <button onClick={onSave} disabled={saving} className="btn-primary text-sm" id="save-automation-btn">
              {saving ? <span className="spinner w-4 h-4" /> : editingId ? t("common.save") : t("automation.modal.button.create")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
