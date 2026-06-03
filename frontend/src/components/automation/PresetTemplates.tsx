import { PRESET_TEMPLATES } from "@/lib/automationConstants";
import { useI18n } from "@/lib/i18n";

interface PresetTemplatesProps {
  onSelect: (preset: (typeof PRESET_TEMPLATES)[0]) => void;
}

export default function PresetTemplates({ onSelect }: PresetTemplatesProps) {
  const { t } = useI18n();

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-4">{t("automation.templates.title")}</h2>
      <p className="text-sm text-surface-500 mb-4">{t("automation.templates.description")}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {PRESET_TEMPLATES.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset)}
            className="text-left p-4 rounded-xl border-2 border-surface-200 dark:border-surface-700 hover:border-brand-400 hover:bg-brand-50 transition-all group"
          >
            <p className="font-semibold text-surface-900 dark:text-white group-hover:text-brand-700">{preset.name}</p>
            <p className="text-xs text-surface-500 mt-1">{preset.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
