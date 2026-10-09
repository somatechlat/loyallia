import { useI18n } from "@/lib/i18n";

interface StatsCardsProps {
  stats: {
    total_executions: number;
    success_rate: number;
    total_automations?: number;
    active_automations?: number;
  } | null;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const { t } = useI18n();

  if (!stats) return null;
  const failed = Math.max(
    0,
    Math.round(stats.total_executions * (1 - stats.success_rate / 100))
  );
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="stat-card">
        <p className="stat-label">{t("automation.stats.totalExecutions")}</p>
        <p className="stat-value text-brand-600">{stats.total_executions.toLocaleString()}</p>
      </div>
      <div className="stat-card">
        <p className="stat-label">{t("automation.stats.successRate")}</p>
        <p className="stat-value text-emerald-600">{stats.success_rate.toFixed(1)}%</p>
      </div>
      <div className="stat-card">
        <p className="stat-label">{t("automation.stats.active")}</p>
        <p className="stat-value text-surface-800 dark:text-surface-100">
          {stats.active_automations ?? stats.total_automations ?? 0}
        </p>
      </div>
      <div className="stat-card">
        <p className="stat-label">{t("automation.stats.failed")}</p>
        <p className="stat-value text-rose-600">{failed.toLocaleString()}</p>
      </div>
    </div>
  );
}
