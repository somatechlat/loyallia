"use client";

import { useState, useEffect, useCallback } from "react";
import { automationApi, programsApi } from "@/lib/api";
import toast from "react-hot-toast";
import { useI18n } from "@/lib/i18n";
import { APP_CONFIG } from "@/lib/constants";

export interface Automation {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  is_active: boolean;
  total_executions: number;
  last_executed: string | null;
  trigger_config: Record<string, unknown>;
  action_config: Record<string, unknown>;
  cooldown_hours: number;
  max_executions_per_day: number | null;
}

export interface ProgramOption {
  id: string;
  name: string;
  card_type: string;
}

export interface AutomationForm {
  name: string;
  description: string;
  trigger: string;
  action: string;
  trigger_config: Record<string, unknown>;
  action_config: Record<string, unknown>;
  cooldown_hours: number;
  max_executions_per_day: number | null;
}

export const EMPTY_FORM: AutomationForm = {
  name: "",
  description: "",
  trigger: "customer_enrolled",
  action: "send_notification",
  trigger_config: {},
  action_config: { title: "", message: "" },
  cooldown_hours: APP_CONFIG.DEFAULT_COOLDOWN_HOURS,
  max_executions_per_day: null,
};

export function useAutomations() {
  const { t } = useI18n();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [stats, setStats] = useState<{ total_executions: number; success_rate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AutomationForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState({ name: false });

  const load = useCallback(() => {
    Promise.all([automationApi.list(), automationApi.stats()])
      .then(([list, s]) => {
        setAutomations(Array.isArray(list.data) ? list.data : list.data.items || []);
        setStats(s.data);
      })
      .catch(() => toast.error(t("automation.toast.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
    programsApi
      .list()
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : res.data.items || [];
        setPrograms(
          items.map((p: { id: string; name: string; card_type: string }) => ({
            id: p.id,
            name: p.name,
            card_type: p.card_type,
          })),
        );
      })
      .catch((err) => console.warn('[useAutomations] Failed to load programs:', err));
  }, [load]);

  const toggle = useCallback(
    async (id: string, name: string) => {
      try {
        await automationApi.toggle(id);
        toast.success(t("automation.toast.updated", { name }));
        load();
      } catch {
        toast.error(t("automation.toast.updateError"));
      }
    },
    [load, t],
  );

  const openCreate = useCallback(
    (preset?: { name: string; description: string; trigger: string; action: string; action_config: Record<string, unknown> }) => {
      setEditingId(null);
      if (preset) {
        setForm({
          name: preset.name,
          description: preset.description,
          trigger: preset.trigger,
          action: preset.action,
          trigger_config: {},
          action_config: preset.action_config,
          cooldown_hours: APP_CONFIG.DEFAULT_COOLDOWN_HOURS,
          max_executions_per_day: null,
        });
      } else {
        setForm({ ...EMPTY_FORM });
      }
      setStep(1);
      setShowModal(true);
    },
    [],
  );

  const openEdit = useCallback((a: Automation) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      description: a.description,
      trigger: a.trigger,
      action: a.action,
      trigger_config: typeof a.trigger_config === "object" && a.trigger_config !== null ? (a.trigger_config as Record<string, unknown>) : {},
      action_config: typeof a.action_config === "object" && a.action_config !== null ? (a.action_config as Record<string, unknown>) : { title: "", message: "" },
      cooldown_hours: a.cooldown_hours || 24,
      max_executions_per_day: a.max_executions_per_day,
    });
    setStep(1);
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error(t("automation.modal.validation.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await automationApi.update(editingId, form as unknown as Record<string, unknown>);
        toast.success(t("automation.toast.saved"));
      } else {
        await automationApi.create(form as unknown as Record<string, unknown>);
        toast.success(t("automation.toast.saved"));
      }
      setShowModal(false);
      load();
    } catch {
      toast.error(t("automation.toast.saveError"));
    } finally {
      setSaving(false);
    }
  }, [editingId, form, load, t]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await automationApi.delete(id);
        toast.success(t("automation.toast.deleted"));
        load();
      } catch {
        toast.error(t("automation.toast.deleteError"));
      } finally {
        setShowDelete(null);
      }
    },
    [load, t],
  );

  const totalSteps = 3;

  return {
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
    totalSteps,
    load,
    toggle,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
  };
}
